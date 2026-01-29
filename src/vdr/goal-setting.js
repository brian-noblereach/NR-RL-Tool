// goal-setting.js - Goal selection UI for VDR Companion Tool
// Allows associates to set target readiness levels for each category

import { VDRState } from './vdr-state.js';
import { readinessData } from '../data/readiness-levels.js';
import { applyHealthTerms, getHealthExtras, dedupe } from '../transform.js';

// Category display order (excluding Technology)
const CATEGORY_ORDER = ['IP', 'Market', 'Product', 'Team', 'Go-to-Market', 'Business', 'Funding', 'Regulatory'];

/**
 * Render the goal setting interface
 */
export function renderGoalSetting(container) {
  const baseline = VDRState.baseline;
  if (!baseline) {
    container.innerHTML = '<p>No baseline loaded. Please select a baseline first.</p>';
    return;
  }

  const categories = VDRState.activeCategories;
  const orderedCats = CATEGORY_ORDER.filter(c => categories.includes(c));

  container.innerHTML = `
    <div class="vdr-goal-setting">
      <div class="vdr-header">
        <button class="btn outline vdr-back-btn" id="vdr-back-to-baseline">
          ← Back
        </button>
        <div class="vdr-header-content">
          <h2>Set Engagement Goals</h2>
          <p class="vdr-venture-info">
            <strong>${escapeHtml(baseline.ventureName)}</strong>
            ${baseline.portfolio ? `<span class="vdr-portfolio-badge">${escapeHtml(baseline.portfolio)}</span>` : ''}
            ${baseline.isHealthRelated ? `<span class="vdr-health-badge">Health</span>` : ''}
          </p>
          <p class="vdr-baseline-date">Baseline from ${formatDate(baseline.assessmentDate)}</p>
        </div>
      </div>

      <div class="vdr-goals-grid" id="vdr-goals-grid">
        ${orderedCats.map(cat => renderCategoryCard(cat, baseline)).join('')}
      </div>

      <div class="vdr-actions">
        <div class="vdr-gap-summary" id="vdr-gap-summary">
          ${renderGapSummary()}
        </div>
        <button class="btn accent vdr-generate-btn" id="vdr-generate-btn">
          Generate VDR
        </button>
      </div>
    </div>

    <!-- Level Reference Modal -->
    <div id="vdr-level-modal" class="modal hidden" role="dialog" aria-modal="true">
      <div class="modal-backdrop"></div>
      <div class="modal-content vdr-level-modal-content">
        <div class="modal-header">
          <h3 id="vdr-level-modal-title">Level Reference</h3>
          <button id="vdr-level-modal-close" class="icon-btn" aria-label="Close">×</button>
        </div>
        <div class="modal-body" id="vdr-level-modal-body">
          <!-- Populated dynamically -->
        </div>
        <div class="modal-footer">
          <button class="btn" id="vdr-level-modal-done">Done</button>
        </div>
      </div>
    </div>
  `;

  setupGoalEventHandlers();
}

/**
 * Render a single category card
 */
function renderCategoryCard(category, baseline) {
  const baselineLevel = baseline.scores[category] || 0;
  const goalLevel = VDRState.goals[category] || baselineLevel;
  const gap = goalLevel - baselineLevel;
  const levelData = readinessData[category]?.levels || [];
  
  const baselineTitle = levelData.find(l => l.level === baselineLevel)?.title || 'Not assessed';
  const goalTitle = levelData.find(l => l.level === goalLevel)?.title || 'Select goal';

  // Generate goal options (from baseline level to 9)
  const options = [];
  for (let i = Math.max(1, baselineLevel); i <= 9; i++) {
    const lvl = levelData.find(l => l.level === i);
    options.push(`<option value="${i}" ${i === goalLevel ? 'selected' : ''}>Level ${i}${lvl ? ` - ${lvl.title}` : ''}</option>`);
  }

  return `
    <div class="vdr-goal-card" data-category="${category}">
      <div class="vdr-card-header">
        <h3>${category}</h3>
        <button class="vdr-info-btn" data-category="${category}" title="View all levels">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>
      
      <div class="vdr-baseline-row">
        <span class="vdr-label">Baseline:</span>
        <span class="vdr-level-badge baseline">Level ${baselineLevel}</span>
        <span class="vdr-level-title">${escapeHtml(baselineTitle)}</span>
      </div>
      
      <div class="vdr-goal-row">
        <label class="vdr-label" for="goal-${category}">Goal:</label>
        <select class="vdr-goal-select" id="goal-${category}" data-category="${category}">
          ${options.join('')}
        </select>
      </div>
      
      <div class="vdr-gap-indicator ${gap > 0 ? 'has-gap' : ''}">
        ${gap > 0 
          ? `<span class="vdr-gap-badge">+${gap} level${gap > 1 ? 's' : ''}</span>` 
          : `<span class="vdr-no-gap">No change</span>`
        }
      </div>
    </div>
  `;
}

/**
 * Render gap summary
 */
function renderGapSummary() {
  const gaps = VDRState.getGapSummary();
  if (gaps.length === 0) {
    return `<p class="vdr-no-gaps-msg">Set goals above baseline levels to generate deliverables.</p>`;
  }
  
  const totalGap = gaps.reduce((sum, g) => sum + g.gap, 0);
  return `
    <p><strong>${gaps.length}</strong> categories with goals • <strong>${totalGap}</strong> total levels to advance</p>
  `;
}

/**
 * Setup event handlers for goal setting
 */
function setupGoalEventHandlers() {
  // Back button
  document.getElementById('vdr-back-to-baseline')?.addEventListener('click', () => {
    VDRState.reset();
    window.dispatchEvent(new CustomEvent('vdr-navigate', { detail: 'baseline' }));
  });

  // Goal dropdowns
  document.querySelectorAll('.vdr-goal-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const category = e.target.dataset.category;
      const level = parseInt(e.target.value, 10);
      VDRState.setGoal(category, level);
      
      // Update gap indicator
      updateGapIndicator(category);
      
      // Update summary
      document.getElementById('vdr-gap-summary').innerHTML = renderGapSummary();
    });
  });

  // Info buttons (open level modal)
  document.querySelectorAll('.vdr-info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.currentTarget.dataset.category;
      openLevelModal(category);
    });
  });

  // Generate button
  document.getElementById('vdr-generate-btn')?.addEventListener('click', () => {
    if (!VDRState.hasAnyGap()) {
      alert('Please set at least one goal above the baseline level to generate a VDR.');
      return;
    }
    VDRState.currentStep = 'output';
    window.dispatchEvent(new CustomEvent('vdr-navigate', { detail: 'output' }));
  });

  // Modal close handlers
  document.getElementById('vdr-level-modal-close')?.addEventListener('click', closeLevelModal);
  document.getElementById('vdr-level-modal-done')?.addEventListener('click', closeLevelModal);
  document.querySelector('#vdr-level-modal .modal-backdrop')?.addEventListener('click', closeLevelModal);
  
  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLevelModal();
  });
}

/**
 * Update gap indicator for a category after goal change
 */
function updateGapIndicator(category) {
  const card = document.querySelector(`.vdr-goal-card[data-category="${category}"]`);
  if (!card) return;
  
  const gap = VDRState.getGap(category);
  const indicator = card.querySelector('.vdr-gap-indicator');
  
  indicator.className = `vdr-gap-indicator ${gap > 0 ? 'has-gap' : ''}`;
  indicator.innerHTML = gap > 0 
    ? `<span class="vdr-gap-badge">+${gap} level${gap > 1 ? 's' : ''}</span>`
    : `<span class="vdr-no-gap">No change</span>`;
}

/**
 * Open the level reference modal for a category
 */
function openLevelModal(category) {
  const modal = document.getElementById('vdr-level-modal');
  const title = document.getElementById('vdr-level-modal-title');
  const body = document.getElementById('vdr-level-modal-body');
  
  if (!modal || !body) return;
  
  title.textContent = `${category} - Level Reference`;
  
  const baseline = VDRState.baseline;
  const baselineLevel = baseline?.scores[category] || 0;
  const isHealth = baseline?.isHealthRelated;
  const levels = readinessData[category]?.levels || [];
  
  // Show levels from current baseline to 9
  const relevantLevels = levels.filter(l => l.level >= baselineLevel);
  
  body.innerHTML = `
    <div class="vdr-level-reference">
      <div class="vdr-level-legend">
        <span class="vdr-legend-item current">
          <span class="vdr-legend-dot current"></span> Current Level
        </span>
        <span class="vdr-legend-item goal">
          <span class="vdr-legend-dot goal"></span> Goal Level
        </span>
      </div>
      
      <div class="vdr-levels-list">
        ${relevantLevels.map(lvl => renderLevelDetail(category, lvl, baselineLevel, isHealth)).join('')}
      </div>
    </div>
  `;
  
  // Add click handlers to level cards for quick goal setting
  body.querySelectorAll('.vdr-level-detail').forEach(card => {
    card.addEventListener('click', () => {
      const level = parseInt(card.dataset.level, 10);
      if (level >= baselineLevel) {
        VDRState.setGoal(category, level);
        
        // Update the select dropdown
        const select = document.getElementById(`goal-${category}`);
        if (select) select.value = level;
        
        // Update UI
        updateGapIndicator(category);
        document.getElementById('vdr-gap-summary').innerHTML = renderGapSummary();
        
        // Update modal highlighting
        body.querySelectorAll('.vdr-level-detail').forEach(c => {
          c.classList.toggle('is-goal', parseInt(c.dataset.level, 10) === level);
        });
      }
    });
  });
  
  modal.classList.remove('hidden');
}

/**
 * Render a single level detail in the modal
 */
function renderLevelDetail(category, levelObj, baselineLevel, isHealth) {
  const level = levelObj.level;
  const isCurrent = level === baselineLevel;
  const isGoal = level === VDRState.goals[category];
  
  let definition = levelObj.definition || '';
  let deliverables = Array.isArray(levelObj.deliverables) ? [...levelObj.deliverables] : [];
  
  // Apply health transformations if needed
  if (isHealth) {
    definition = applyHealthTerms(definition);
    deliverables = deliverables.map(d => applyHealthTerms(d));
    
    // Add health-specific extras
    const extras = getHealthExtras(category, level, null);
    if (extras?.deliverables) {
      deliverables = dedupe([...deliverables, ...extras.deliverables.map(d => applyHealthTerms(d))]);
    }
  }
  
  const classes = ['vdr-level-detail'];
  if (isCurrent) classes.push('is-current');
  if (isGoal) classes.push('is-goal');
  
  return `
    <div class="${classes.join(' ')}" data-level="${level}">
      <div class="vdr-level-header">
        <span class="vdr-level-num">Level ${level}</span>
        <span class="vdr-level-title">${escapeHtml(levelObj.title)}</span>
        ${isCurrent ? '<span class="vdr-current-badge">Current</span>' : ''}
        ${isGoal ? '<span class="vdr-goal-badge-small">Goal</span>' : ''}
      </div>
      <p class="vdr-level-def">${escapeHtml(definition)}</p>
      ${deliverables.length > 0 ? `
        <div class="vdr-level-deliverables">
          <strong>Deliverables:</strong>
          <ul>
            ${deliverables.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Close the level reference modal
 */
function closeLevelModal() {
  const modal = document.getElementById('vdr-level-modal');
  if (modal) modal.classList.add('hidden');
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
