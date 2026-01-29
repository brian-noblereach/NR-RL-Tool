// vdr-generator.js - Generates VDR content from baseline and goals
// Collects all deliverables needed to reach goal levels

import { VDRState } from './vdr-state.js';
import { readinessData } from '../data/readiness-levels.js';
import { applyHealthTerms, getHealthExtras, dedupe } from '../transform.js';

// Category display order
const CATEGORY_ORDER = ['IP', 'Market', 'Product', 'Team', 'Go-to-Market', 'Business', 'Funding', 'Regulatory'];

/**
 * Generate VDR content structure
 * Returns an object with all the data needed for display and export
 */
export function generateVDRContent() {
  const baseline = VDRState.baseline;
  if (!baseline) return null;

  const isHealth = baseline.isHealthRelated;
  const categories = VDRState.activeCategories;
  const orderedCats = CATEGORY_ORDER.filter(c => categories.includes(c));

  // Build sections for each category with a gap
  const sections = [];
  
  for (const category of orderedCats) {
    const baselineLevel = baseline.scores[category] || 0;
    const goalLevel = VDRState.goals[category] || 0;
    const gap = goalLevel - baselineLevel;
    
    if (gap <= 0) continue; // Skip categories with no gap
    
    const deliverables = collectDeliverables(category, baselineLevel, goalLevel, isHealth);
    const levels = readinessData[category]?.levels || [];
    
    const baselineTitle = levels.find(l => l.level === baselineLevel)?.title || '';
    const goalTitle = levels.find(l => l.level === goalLevel)?.title || '';
    
    sections.push({
      category,
      baselineLevel,
      baselineTitle,
      goalLevel,
      goalTitle,
      gap,
      deliverables
    });
  }

  return {
    ventureName: baseline.ventureName,
    portfolio: baseline.portfolio || '',
    isHealthRelated: isHealth,
    baselineDate: baseline.assessmentDate,
    advisorName: baseline.advisorName || '',
    generatedDate: new Date().toISOString(),
    sections,
    totalGap: sections.reduce((sum, s) => sum + s.gap, 0),
    categoriesWithGaps: sections.length
  };
}

/**
 * Collect all deliverables for a category from baselineLevel+1 to goalLevel
 * Returns a flat, deduplicated array of deliverables
 */
function collectDeliverables(category, baselineLevel, goalLevel, isHealth) {
  const levels = readinessData[category]?.levels || [];
  const allDeliverables = [];
  
  for (let L = baselineLevel + 1; L <= goalLevel; L++) {
    const levelObj = levels.find(l => l.level === L);
    if (!levelObj) continue;
    
    // Get base deliverables
    let delivs = Array.isArray(levelObj.deliverables) 
      ? [...levelObj.deliverables] 
      : levelObj.deliverables 
        ? [levelObj.deliverables] 
        : [];
    
    // Apply health transformations and add extras if applicable
    if (isHealth) {
      delivs = delivs.map(d => applyHealthTerms(d));
      
      // Add health-specific extras
      const extras = getHealthExtras(category, L, null);
      if (extras?.deliverables && extras.deliverables.length > 0) {
        const healthDelivs = extras.deliverables.map(d => applyHealthTerms(d));
        delivs = [...delivs, ...healthDelivs];
      }
    }
    
    allDeliverables.push(...delivs);
  }
  
  // Deduplicate
  return dedupe(allDeliverables);
}

/**
 * Render the VDR output view
 */
export function renderVDROutput(container) {
  const vdr = generateVDRContent();
  
  if (!vdr || vdr.sections.length === 0) {
    container.innerHTML = `
      <div class="vdr-empty-output">
        <p>No goals set above baseline. Go back to set goals.</p>
        <button class="btn" id="vdr-back-to-goals">← Back to Goals</button>
      </div>
    `;
    document.getElementById('vdr-back-to-goals')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('vdr-navigate', { detail: 'goals' }));
    });
    return;
  }

  const formattedBaselineDate = formatDate(vdr.baselineDate);
  const formattedGeneratedDate = formatDate(vdr.generatedDate);

  container.innerHTML = `
    <div class="vdr-output">
      <div class="vdr-header">
        <button class="btn outline vdr-back-btn" id="vdr-back-to-goals">
          ← Back to Goals
        </button>
        <div class="vdr-header-content">
          <h2>Venture Development Roadmap</h2>
        </div>
        <div class="vdr-export-actions">
          <button class="btn accent" id="vdr-export-docx">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            Export DOCX
          </button>
        </div>
      </div>

      <div class="vdr-document" id="vdr-document">
        <div class="vdr-doc-header">
          <h1>VDR - ${escapeHtml(vdr.ventureName)} - ${formattedGeneratedDate}</h1>
          <div class="vdr-doc-meta">
            ${vdr.portfolio ? `<span><strong>Portfolio:</strong> ${escapeHtml(vdr.portfolio)}</span>` : ''}
            <span><strong>Baseline Date:</strong> ${formattedBaselineDate}</span>
            ${vdr.advisorName ? `<span><strong>Advisor:</strong> ${escapeHtml(vdr.advisorName)}</span>` : ''}
            ${vdr.isHealthRelated ? `<span class="vdr-health-indicator">Health-Related Venture</span>` : ''}
          </div>
          <p class="vdr-doc-summary">
            <strong>${vdr.categoriesWithGaps}</strong> categories with advancement goals • 
            <strong>${vdr.totalGap}</strong> total levels to advance
          </p>
        </div>

        <div class="vdr-doc-sections">
          ${vdr.sections.map(section => renderVDRSection(section)).join('')}
        </div>
      </div>
    </div>
  `;

  setupOutputEventHandlers(vdr);
}

/**
 * Render a single VDR section
 */
function renderVDRSection(section) {
  return `
    <div class="vdr-section">
      <h2>${section.category} (Current: ${section.baselineLevel} → Goal: ${section.goalLevel})</h2>
      
      <ul class="vdr-deliverables-list">
        ${section.deliverables.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Setup event handlers for VDR output
 */
function setupOutputEventHandlers(vdr) {
  // Back to goals
  document.getElementById('vdr-back-to-goals')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('vdr-navigate', { detail: 'goals' }));
  });

  // Export DOCX
  document.getElementById('vdr-export-docx')?.addEventListener('click', () => {
    exportToDocx(vdr);
  });
}

/**
 * Export VDR to DOCX format
 */
async function exportToDocx(vdr) {
  const btn = document.getElementById('vdr-export-docx');
  if (!btn) return;

  // Show loading state
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
    </svg>
    Generating...
  `;

  try {
    // Import the export module dynamically
    const { generateDocx } = await import('./vdr-export.js');
    await generateDocx(vdr);
    
    // Success state
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Downloaded!
    `;
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('[VDR] Export error:', error);
    alert('Failed to generate document: ' + error.message);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
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
