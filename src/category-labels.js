// category-labels.js - display labels for category keys.
// Added August 2026.
//
// The keys in readinessData ARE the internal identifiers: they key
// AppState.scores, the localStorage venture records, the RL_* Smartsheet
// payload fields, and every CATEGORY_ORDER array. They must never change.
// Anything user-visible goes through these helpers instead.
//
// Dependency-free so it imports cleanly from src/ and tests/.

const CATEGORY_LABELS = {
  Technology: "TRL",
};

// Per-category heading override. Without this, "TRL" + " Readiness Levels"
// would render the redundant "TRL Readiness Levels".
const CATEGORY_HEADINGS = {
  Technology: "Technology Readiness Levels (TRL)",
};

// Short forms for the compact score strings in the load-assessment modal.
const CATEGORY_ABBREVIATIONS = {
  Technology: "TRL",
  "Go-to-Market": "GTM",
  "Mission Impact": "MI",
};

// Categories kept in the data, and in every stored score, but not offered
// anywhere in the tool. Mission Impact is retired pending its own rework
// (Brian, Oct 2026). Removing it from this set brings it back with its stored
// scores intact; new saves simply stop writing it in the meantime.
export const RETIRED_CATEGORIES = new Set(["Mission Impact"]);

/**
 * The category keys the tool shows, in the order given: retired categories
 * dropped, and Regulatory only for Life Science (health-related) ventures.
 */
export function activeCategoryKeys(keys, isHealthRelated) {
  return (keys || []).filter(
    (key) => !RETIRED_CATEGORIES.has(key) && (isHealthRelated || key !== "Regulatory")
  );
}

export function getCategoryLabel(key) {
  return CATEGORY_LABELS[key] || key;
}

export function getCategoryHeading(key) {
  return CATEGORY_HEADINGS[key] || `${getCategoryLabel(key)} Readiness Levels`;
}

export function getCategoryAbbrev(key) {
  return CATEGORY_ABBREVIATIONS[key] || String(key || "").slice(0, 3);
}
