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
 * Technology uses { device: {...}, therapeutics: {...} } sub-tracks, keyed by
 * the normalized track key from track-content.js.
 * All other categories use { indicators: [...], deliverables: [...] }.
 */
export function getHealthExtras(category, levelObj, trackKey) {
  const extras = levelObj.healthExtras;
  if (!extras) return { indicators: [], deliverables: [] };

  // Technology extras are per-track. A track with no extras gets none — the
  // general/software/hardware tracks used to fall through to the device extras,
  // which was wrong.
  if (category === "Technology") {
    return extras[trackKey] || { indicators: [], deliverables: [] };
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
  // Track-override content (the BARDA life-sciences TRLs) is authored clinical
  // canon. Never run the health term map over it — the map would turn "GMP pilot
  // lot" into "GMP clinical studies lot" — and don't merge healthExtras on top,
  // so the override stays the single source of truth for that level and track.
  if (levelObj.isTrackOverride) {
    return {
      definition: levelObj.definition,
      deliverables: Array.isArray(levelObj.deliverables) ? levelObj.deliverables : [],
      indicators: Array.isArray(baseIndicators) ? baseIndicators : [baseIndicators],
    };
  }

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
