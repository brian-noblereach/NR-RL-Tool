// category-labels.js - display labels for category keys.
// Added August 2026.
//
// The keys in readinessData ARE the internal identifiers: they key
// AppState.scores, the localStorage venture records, the RL_* Smartsheet
// payload fields, and every CATEGORY_ORDER array. They must never change.
// Anything user-visible goes through these helpers instead.
//
// Dependency-free so it imports cleanly from src/, src/vdr/, and tests/.

const CATEGORY_LABELS = {
  Technology: "TRL",
};

// Per-category heading override. Without this, "TRL" + " Readiness Levels"
// would render the redundant "TRL Readiness Levels".
const CATEGORY_HEADINGS = {
  Technology: "Technology Readiness Levels (TRL)",
};

// Short forms for the compact score strings in the load-assessment modal and
// the VDR baseline cards.
const CATEGORY_ABBREVIATIONS = {
  Technology: "TRL",
  "Go-to-Market": "GTM",
  "Mission Impact": "MI",
};

export function getCategoryLabel(key) {
  return CATEGORY_LABELS[key] || key;
}

export function getCategoryHeading(key) {
  return CATEGORY_HEADINGS[key] || `${getCategoryLabel(key)} Readiness Levels`;
}

export function getCategoryAbbrev(key) {
  return CATEGORY_ABBREVIATIONS[key] || String(key || "").slice(0, 3);
}
