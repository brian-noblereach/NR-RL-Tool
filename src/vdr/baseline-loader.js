// baseline-loader.js - Fetches and displays RL assessments from Smartsheet for baseline selection
// VDR Companion Tool - Associate Mode

import { VDRState } from './vdr-state.js';

// Google Apps Script Web App URL (same as main tool)
const PROXY_URL = "https://script.google.com/macros/s/AKfycbzt7wElvzQv0CNs-icg7QWpxjf4E5FGqWa6KpCY4zSa_thccGNWhw-THLTpnn8GJa2W/exec";

// Cache for assessments
let assessmentsCache = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetch all RL assessments from Smartsheet
 * @returns {Promise<Array>} Array of assessment objects
 */
export async function fetchRLAssessments() {
  const now = Date.now();
  if (assessmentsCache && (now - cacheTime < CACHE_TTL)) {
    console.log('[VDR] Returning cached assessments');
    return assessmentsCache;
  }

  console.log('[VDR] Fetching assessments from Smartsheet...');

  return new Promise((resolve) => {
    const timeoutMs = 10000;
    let completed = false;
    const callbackName = 'vdrRLCallback_' + Date.now();

    const requestData = {
      action: 'smartsheet_rl_list',
      limit: 500 // Get all assessments
    };

    const encodedData = encodeURIComponent(JSON.stringify(requestData));
    const url = `${PROXY_URL}?data=${encodedData}&callback=${callbackName}`;

    window[callbackName] = (response) => {
      if (completed) return;
      completed = true;
      cleanup();

      if (response && response.success && response.assessments) {
        // Process and cache assessments
        const assessments = processAssessments(response.assessments);
        assessmentsCache = assessments;
        cacheTime = Date.now();
        console.log(`[VDR] Loaded ${assessments.length} assessments`);
        resolve(assessments);
      } else {
        console.warn('[VDR] Failed to fetch assessments:', response);
        resolve([]);
      }
    };

    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      console.error('[VDR] Script error fetching assessments');
      resolve([]);
    };

    setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        console.warn('[VDR] Timeout fetching assessments');
        resolve([]);
      }
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

/**
 * Process raw assessments into a cleaner format
 * Groups by venture and sorts by date
 */
function processAssessments(raw) {
  return raw
    .filter(a => a.ventureName && a.ventureName.trim())
    .map(a => ({
      rowId: a.rowId,
      ventureId: a.ventureId || '',
      ventureName: a.ventureName.trim(),
      advisorName: a.advisorName || '',
      portfolio: a.portfolio || '',
      assessmentNumber: parseInt(a.assessmentNumber, 10) || 1,
      assessmentDate: a.assessmentDate || a.submissionTimestamp || '',
      isHealthRelated: a.isHealthRelated === true || a.isHealthRelated === 'true',
      scores: {
        IP: parseInt(a.RL_IP, 10) || 0,
        Technology: parseInt(a.RL_Technology, 10) || 0,
        Market: parseInt(a.RL_Market, 10) || 0,
        Product: parseInt(a.RL_Product, 10) || 0,
        Team: parseInt(a.RL_Team, 10) || 0,
        'Go-to-Market': parseInt(a.RL_GTM, 10) || 0,
        Business: parseInt(a.RL_Business, 10) || 0,
        Funding: parseInt(a.RL_Funding, 10) || 0,
        Regulatory: parseInt(a.RL_Regulatory, 10) || 0
      }
    }))
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = a.assessmentDate || '';
      const dateB = b.assessmentDate || '';
      return dateB.localeCompare(dateA);
    });
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr.split('T')[0];
  }
}

/**
 * Format scores for compact display
 */
function formatScoresCompact(scores, isHealthRelated) {
  const cats = ['IP', 'Technology', 'Market', 'Product', 'Team', 'Go-to-Market', 'Business', 'Funding'];
  if (isHealthRelated) cats.push('Regulatory');
  
  return cats.map(c => {
    const abbrev = c === 'Go-to-Market' ? 'GTM' : c === 'Technology' ? 'Tech' : c.substring(0, 3);
    return `${abbrev}:${scores[c] || 0}`;
  }).join(' ');
}

/**
 * Render the baseline selector UI
 */
export function renderBaselineSelector(container) {
  container.innerHTML = `
    <div class="vdr-baseline-selector">
      <div class="vdr-header">
        <h2>Load Baseline Assessment</h2>
        <p>Select a venture's baseline readiness levels to set engagement goals.</p>
      </div>
      
      <div class="vdr-search-bar">
        <input type="text" id="vdr-search" placeholder="Search ventures..." autocomplete="off" />
        <select id="vdr-portfolio-filter">
          <option value="">All Portfolios</option>
        </select>
      </div>
      
      <div class="vdr-assessments-list" id="vdr-assessments-list">
        <div class="vdr-loading">
          <div class="spinner"></div>
          <p>Loading assessments from database...</p>
        </div>
      </div>
    </div>
  `;

  // Load and render assessments
  loadAndRenderAssessments();
  
  // Setup search and filter handlers
  setupSearchAndFilter();
}

/**
 * Load assessments and render the list
 */
async function loadAndRenderAssessments() {
  const listContainer = document.getElementById('vdr-assessments-list');
  const portfolioFilter = document.getElementById('vdr-portfolio-filter');
  
  try {
    const assessments = await fetchRLAssessments();
    
    if (assessments.length === 0) {
      listContainer.innerHTML = `
        <div class="vdr-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>No Assessments Found</h3>
          <p>No readiness level assessments have been saved to the database yet.</p>
          <p>Ask the advisor to complete a baseline assessment first.</p>
        </div>
      `;
      return;
    }

    // Populate portfolio filter
    const portfolios = [...new Set(assessments.map(a => a.portfolio).filter(Boolean))];
    portfolios.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      portfolioFilter.appendChild(opt);
    });

    // Store assessments for filtering
    window._vdrAssessments = assessments;
    
    // Render initial list
    renderAssessmentsList(assessments);
    
  } catch (error) {
    console.error('[VDR] Error loading assessments:', error);
    listContainer.innerHTML = `
      <div class="vdr-error-state">
        <p>Failed to load assessments. Please check your connection and try again.</p>
        <button class="btn" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

/**
 * Render the filtered/searched assessments list
 */
function renderAssessmentsList(assessments) {
  const listContainer = document.getElementById('vdr-assessments-list');
  
  if (assessments.length === 0) {
    listContainer.innerHTML = `
      <div class="vdr-no-results">
        <p>No ventures match your search.</p>
      </div>
    `;
    return;
  }

  const html = assessments.map(a => `
    <div class="vdr-assessment-card" data-row-id="${a.rowId}">
      <div class="vdr-card-header">
        <h3 class="vdr-venture-name">${escapeHtml(a.ventureName)}</h3>
        ${a.portfolio ? `<span class="vdr-portfolio-badge">${escapeHtml(a.portfolio)}</span>` : ''}
        ${a.isHealthRelated ? `<span class="vdr-health-badge">Health</span>` : ''}
      </div>
      <div class="vdr-card-meta">
        <span class="vdr-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${formatDate(a.assessmentDate)}
        </span>
        <span class="vdr-advisor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          ${escapeHtml(a.advisorName || 'Unknown')}
        </span>
        ${a.assessmentNumber > 1 ? `<span class="vdr-assessment-num">#${a.assessmentNumber}</span>` : ''}
      </div>
      <div class="vdr-card-scores">
        ${formatScoresCompact(a.scores, a.isHealthRelated)}
      </div>
      <button class="btn vdr-select-btn" data-row-id="${a.rowId}">
        Select as Baseline
      </button>
    </div>
  `).join('');

  listContainer.innerHTML = html;

  // Add click handlers
  listContainer.querySelectorAll('.vdr-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rowId = e.target.dataset.rowId;
      selectBaseline(rowId);
    });
  });
}

/**
 * Setup search and filter event handlers
 */
function setupSearchAndFilter() {
  const searchInput = document.getElementById('vdr-search');
  const portfolioFilter = document.getElementById('vdr-portfolio-filter');

  let debounceTimer;

  const filterAssessments = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const portfolioValue = portfolioFilter.value;
    const assessments = window._vdrAssessments || [];

    const filtered = assessments.filter(a => {
      const matchesSearch = !searchTerm || 
        a.ventureName.toLowerCase().includes(searchTerm) ||
        (a.advisorName && a.advisorName.toLowerCase().includes(searchTerm));
      const matchesPortfolio = !portfolioValue || a.portfolio === portfolioValue;
      return matchesSearch && matchesPortfolio;
    });

    renderAssessmentsList(filtered);
  };

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterAssessments, 200);
  });

  portfolioFilter.addEventListener('change', filterAssessments);
}

/**
 * Select an assessment as the baseline
 */
function selectBaseline(rowId) {
  const assessments = window._vdrAssessments || [];
  const selected = assessments.find(a => String(a.rowId) === String(rowId));
  
  if (!selected) {
    console.error('[VDR] Assessment not found:', rowId);
    return;
  }

  console.log('[VDR] Selected baseline:', selected);

  // Store in VDR state
  VDRState.setBaseline(selected);

  // Dispatch event to transition to goal setting
  window.dispatchEvent(new CustomEvent('vdr-baseline-selected', { detail: selected }));
}

/**
 * Clear the assessments cache
 */
export function clearAssessmentsCache() {
  assessmentsCache = null;
  cacheTime = 0;
}

/**
 * HTML escape helper
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
