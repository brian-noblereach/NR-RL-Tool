// state.js
// Central app state, now with venture metadata for PDF + timestamp

export const AppState = {
  currentCategory: null,
  currentView: "expanded",
  scores: {},

  // Health mode toggle
  isHealthRelated: false,

  // NEW: venture metadata
  ventureName: "",        // bound to #venture-name
  assessedAt: null,       // Date object; set when a level is first chosen (and updated on changes)
};
