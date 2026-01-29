// vdr-main.js - Main orchestrator for VDR Companion Tool
// Manages the overall workflow and view transitions

import { VDRState } from './vdr-state.js';
import { renderBaselineSelector } from './baseline-loader.js';
import { renderGoalSetting } from './goal-setting.js';
import { renderVDROutput } from './vdr-generator.js';

/**
 * Initialize the VDR companion tool
 * Called when ?vdr=true is detected in URL
 */
export function initializeVDR() {
  console.log('[VDR] Initializing VDR Companion Tool');
  
  // Hide the main assessment view
  const appView = document.getElementById('app-view');
  if (appView) appView.style.display = 'none';

  // Create VDR container if not exists
  let vdrContainer = document.getElementById('vdr-container');
  if (!vdrContainer) {
    vdrContainer = document.createElement('div');
    vdrContainer.id = 'vdr-container';
    vdrContainer.className = 'vdr-container';
    
    // Insert after the toolbar
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      toolbar.after(vdrContainer);
    } else {
      document.querySelector('.container')?.appendChild(vdrContainer);
    }
  }

  // Update topbar to show VDR mode
  updateTopbarForVDR();

  // Setup navigation event listeners
  setupVDRNavigation(vdrContainer);

  // Render initial view (baseline selector)
  renderCurrentStep(vdrContainer);
}

/**
 * Update the topbar to indicate VDR mode
 */
function updateTopbarForVDR() {
  const brandTitle = document.querySelector('.brand-title');
  if (brandTitle) {
    brandTitle.innerHTML = `NobleReach<span class="tm">™</span> RL Goals & VDR`;
  }

  const versionBadge = document.querySelector('.version-badge');
  if (versionBadge) {
    versionBadge.textContent = 'Associate Mode';
    versionBadge.classList.add('vdr-mode-badge');
  }

  // Hide some toolbar actions that aren't relevant in VDR mode
  const actionsToHide = ['btn-export-json', 'btn-import-json', 'btn-export-pdf', 'btn-save-db'];
  actionsToHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Hide the venture bar (not needed in VDR mode)
  const ventureBar = document.querySelector('.venture-bar');
  if (ventureBar) ventureBar.style.display = 'none';

  // Hide the settings bar
  const settingsBar = document.getElementById('settings-bar');
  if (settingsBar) settingsBar.style.display = 'none';

  // Hide the toolbar (health toggle, view toggle)
  const toolbar = document.querySelector('.toolbar');
  if (toolbar) toolbar.style.display = 'none';

  // Hide pilot banner in VDR mode
  const pilotBanner = document.getElementById('pilot-banner');
  if (pilotBanner) pilotBanner.style.display = 'none';
}

/**
 * Setup navigation event listeners
 */
function setupVDRNavigation(container) {
  // Listen for baseline selection
  window.addEventListener('vdr-baseline-selected', (e) => {
    console.log('[VDR] Baseline selected:', e.detail);
    renderCurrentStep(container);
  });

  // Listen for general navigation
  window.addEventListener('vdr-navigate', (e) => {
    const target = e.detail;
    console.log('[VDR] Navigate to:', target);
    
    if (target === 'baseline') {
      VDRState.currentStep = 'baseline';
    } else if (target === 'goals') {
      VDRState.currentStep = 'goals';
    } else if (target === 'output') {
      VDRState.currentStep = 'output';
    }
    
    renderCurrentStep(container);
  });
}

/**
 * Render the current step in the workflow
 */
function renderCurrentStep(container) {
  switch (VDRState.currentStep) {
    case 'baseline':
      renderBaselineSelector(container);
      break;
    case 'goals':
      renderGoalSetting(container);
      break;
    case 'output':
      renderVDROutput(container);
      break;
    default:
      renderBaselineSelector(container);
  }
}

/**
 * Check if VDR mode should be enabled
 */
export function shouldEnableVDR() {
  return VDRState.isVDRModeEnabled();
}
