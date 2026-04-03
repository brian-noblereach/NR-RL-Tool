// transform.js
// Consolidated health mode logic
// Updated April 2026 - healthExtras now live on each level in readiness-levels.js
import { HEALTH_TERM_MAP } from "./data/constants.js";
import { AppState } from "./state.js";

export function applyHealthTerms(text) {
  if (!text) return text;
  let out = String(text);
  HEALTH_TERM_MAP.forEach(({ from, to }) => (out = out.replace(from, to)));
  return out;
}

export function maybeHealth(text) {
  return AppState.isHealthRelated ? applyHealthTerms(text) : text;
}

export function dedupe(arr) {
  const seen = new Set();
  const out = [];
  (arr || []).forEach((v) => {
    const k = String(v).trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  });
  return out;
}

/**
 * Get health extras from the level object itself.
 * Technology uses { device: {...}, pharma: {...} } sub-tracks.
 * All other categories use { indicators: [...], deliverables: [...] }.
 */
export function getHealthExtras(category, levelObj, track) {
  const extras = levelObj.healthExtras;
  if (!extras) return { indicators: [], deliverables: [] };

  // Technology has device/pharma sub-tracks
  if (category === "Technology") {
    const key = track === "health_pharma" ? "pharma" : "device";
    return extras[key] || { indicators: [], deliverables: [] };
  }
  return extras;
}

/**
 * Returns { definition, deliverables, indicators } for a given category/level,
 * applying health transformations + extras when health mode is active.
 * Centralizes the health/non-health branching that was previously scattered
 * across categories.js, vdr-generator.js, etc.
 */
export function getEffectiveContent(category, levelObj, baseIndicators, healthTrack) {
  if (!AppState.isHealthRelated) {
    return {
      definition: levelObj.definition,
      deliverables: Array.isArray(levelObj.deliverables) ? levelObj.deliverables : [],
      indicators: baseIndicators,
    };
  }

  // Health mode: get extras from the level object itself
  const extras = getHealthExtras(category, levelObj, healthTrack);

  const definition = levelObj.health_definition || applyHealthTerms(levelObj.definition || "");
  const baseDeliverables = Array.isArray(levelObj.deliverables)
    ? levelObj.deliverables.map(applyHealthTerms)
    : [];
  const baseIndicatorsSafe = (Array.isArray(baseIndicators) ? baseIndicators : [baseIndicators]).map(applyHealthTerms);

  const deliverables = dedupe([...baseDeliverables, ...(extras.deliverables || [])]);
  const indicators = dedupe([...baseIndicatorsSafe, ...(extras.indicators || [])]);

  return { definition, deliverables, indicators };
}
