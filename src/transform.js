// transform.js - Life Science level content.
// Rewritten November 2026. The BRL workbook carries full Life Science text for
// every level that differs, generated into each level's `lifeScience` field, so
// a Life Science venture reads that text verbatim. The old word-substitution
// term map and appended healthExtras are gone.
import { AppState } from "./state.js";

/**
 * The level content to show: for a Life Science (health-related) venture, the
 * level's Life Science fields over its standard ones; otherwise the level as is.
 * TRL track content (resolveLevel) has no lifeScience field and passes through.
 */
export function getEffectiveContent(levelObj) {
  const life = AppState.isHealthRelated && levelObj && levelObj.lifeScience;
  return life ? { ...levelObj, ...life } : levelObj;
}
