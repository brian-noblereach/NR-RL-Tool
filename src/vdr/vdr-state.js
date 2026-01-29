// vdr-state.js - State management for VDR Companion Tool
// Tracks baseline assessment, goal levels, and generated VDR content

/**
 * VDR State - Central state for the VDR companion workflow
 */
export const VDRState = {
  // Current step in the workflow
  currentStep: 'baseline', // 'baseline' | 'goals' | 'output'

  // Baseline assessment loaded from Smartsheet
  baseline: null,

  // Goal levels set by associate (keyed by category)
  goals: {},

  // Categories to include (excludes Technology for VDR)
  // Technology is excluded because TRL goals are not in scope
  categories: ['IP', 'Market', 'Product', 'Team', 'Go-to-Market', 'Business', 'Funding'],
  
  // Regulatory is added when health-related
  get activeCategories() {
    if (this.baseline?.isHealthRelated) {
      return [...this.categories, 'Regulatory'];
    }
    return this.categories;
  },

  /**
   * Set the baseline assessment
   */
  setBaseline(assessment) {
    this.baseline = assessment;
    
    // Initialize goals to match baseline (no gap by default)
    this.goals = {};
    this.activeCategories.forEach(cat => {
      this.goals[cat] = assessment.scores[cat] || 0;
    });
    
    this.currentStep = 'goals';
  },

  /**
   * Update a goal level for a category
   */
  setGoal(category, level) {
    if (!this.activeCategories.includes(category)) return;
    this.goals[category] = Math.max(0, Math.min(9, parseInt(level, 10) || 0));
  },

  /**
   * Get the gap between baseline and goal for a category
   */
  getGap(category) {
    const baseline = this.baseline?.scores[category] || 0;
    const goal = this.goals[category] || 0;
    return Math.max(0, goal - baseline);
  },

  /**
   * Check if any goals have a gap (needed deliverables)
   */
  hasAnyGap() {
    return this.activeCategories.some(cat => this.getGap(cat) > 0);
  },

  /**
   * Get summary of all gaps
   */
  getGapSummary() {
    return this.activeCategories.map(cat => ({
      category: cat,
      baseline: this.baseline?.scores[cat] || 0,
      goal: this.goals[cat] || 0,
      gap: this.getGap(cat)
    })).filter(item => item.gap > 0);
  },

  /**
   * Reset state to initial
   */
  reset() {
    this.currentStep = 'baseline';
    this.baseline = null;
    this.goals = {};
  },

  /**
   * Check if VDR mode is enabled (via URL parameter)
   */
  isVDRModeEnabled() {
    const params = new URLSearchParams(window.location.search);
    return params.get('vdr') === 'true';
  }
};

// Export for debugging
if (typeof window !== 'undefined') {
  window._VDRState = VDRState;
}
