// transform.js
import { HEALTH_TERM_MAP, HX } from "./constants.js";
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

export function getHealthExtras(category, lvl, track) {
  const L = Number(lvl) || 0;
  if (category === "Technology") {
    const key = track === "health_pharma" ? "Technology_pharma" : "Technology_device";
    return (HX[key] && HX[key][L]) || { indicators: [], deliverables: [] };
    }
  return (HX[category] && HX[category][L]) || { indicators: [], deliverables: [] };
}

export function buildHealthContent(category, levelObj, baseIndicators, healthTrack) {
  const extras = getHealthExtras(category, levelObj.level, healthTrack);

  const definition = applyHealthTerms(levelObj.definition || "");
  const baseDeliverables = Array.isArray(levelObj.deliverables)
    ? levelObj.deliverables.map(applyHealthTerms)
    : [];
  const baseIndicatorsSafe = (Array.isArray(baseIndicators) ? baseIndicators : [baseIndicators]).map(applyHealthTerms);

  const deliverables = dedupe([...baseDeliverables, ...(extras.deliverables || [])]);
  const indicators = dedupe([...baseIndicatorsSafe, ...(extras.indicators || [])]);

  return { definition, deliverables, indicators };
}
