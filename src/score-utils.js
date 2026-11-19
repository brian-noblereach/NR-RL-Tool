// score-utils.js - the score of record and how to read it.
// Added August 2026 alongside the BARDA-aligned TRL tracks.
//
// A score is exactly one of:
//   null            unassessed
//   0..9 (integer)  that level is complete (every activity at that level done)
//   "3B" (string)   level 3 is IN PROGRESS, currently at sub-level B.
//                   Numeric rank is 3. TRL/Technology category only, and in
//                   practice only the therapeutics track, which is the one
//                   BARDA gives lettered activities to.
//
// Dependency-free on purpose: state.js imports this, and state.js is imported
// by nearly everything, so an import here could create a module cycle.

const SCORE_SHAPE = /^([0-9])([A-Za-z])?$/;

/** Categories whose score of record may carry a sub-level letter. */
export function allowsSubLevel(category) {
  return category === "Technology";
}

/**
 * @param {*} value
 * @returns {{level: number, subLevel: string|null}|null} null when not a valid score
 */
export function parseScore(value) {
  if (value == null) return null;

  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 && value <= 9
      ? { level: value, subLevel: null }
      : null;
  }

  if (typeof value !== "string") return null;

  const match = SCORE_SHAPE.exec(value.trim());
  if (!match) return null;

  return {
    level: Number(match[1]),
    subLevel: match[2] ? match[2].toUpperCase() : null,
  };
}

/**
 * Numeric rank for every >= / <= comparison. "3B" ranks 3 — the level in
 * progress — which is also what parseInt yields on the Smartsheet round-trip,
 * so the client and the database never disagree.
 * @returns {number|null} null when unassessed or invalid
 */
export function scoreRank(value) {
  const parsed = parseScore(value);
  return parsed ? parsed.level : null;
}

export function hasSubLevel(value) {
  const parsed = parseScore(value);
  return !!(parsed && parsed.subLevel);
}

export function isValidScore(value) {
  return parseScore(value) !== null;
}

/** Canonical display/storage string. "" for unassessed or invalid. */
export function formatScore(value) {
  const parsed = parseScore(value);
  if (!parsed) return "";
  return parsed.subLevel ? `${parsed.level}${parsed.subLevel}` : String(parsed.level);
}

/**
 * Normalize anything into a storable score. Drops the sub-level letter unless
 * the category allows one, so a stray "3B" can never land in Market.
 */
export function coerceScore(value, { allowSubLevel = false } = {}) {
  const parsed = parseScore(value);
  if (parsed) {
    return parsed.subLevel && allowSubLevel ? `${parsed.level}${parsed.subLevel}` : parsed.level;
  }

  // Lenient repair for out-of-shape NUMBERS only (legacy floats, out of range).
  // Strings that don't match the shape stay unassessed — never coerce "" to 0.
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(9, Math.trunc(value)));
  }

  return null;
}

/**
 * Lowest level a category can be scored at. TRL follows the DoD and BARDA
 * scales, which begin at 1 (November 2026 framework); every other category
 * has a Level 0.
 */
export function minLevel(category) {
  return category === "Technology" ? 1 : 0;
}

/**
 * coerceScore plus the category's rules: the sub-level letter only where the
 * category allows one, and anything below the category's floor is unassessed —
 * so a TRL 0 saved under the April 2026 framework (or a blank Smartsheet TRL
 * cell, which reads back as 0) loads as null rather than as a level.
 */
export function coerceCategoryScore(category, value) {
  const score = coerceScore(value, { allowSubLevel: allowsSubLevel(category) });
  return score !== null && scoreRank(score) < minLevel(category) ? null : score;
}

/** A whole scores map through coerceCategoryScore. Unknown keys pass through the same rules. */
export function normalizeScores(scores) {
  return Object.fromEntries(
    Object.entries(scores || {}).map(([category, value]) => [category, coerceCategoryScore(category, value)])
  );
}

/**
 * Smartsheet cell -> score. Preserves the legacy "blank or non-numeric means 0"
 * behavior for every value that existed before sub-levels, so the round-trip is
 * unchanged except for genuine sub-level strings.
 */
export function readScoreCell(raw, { allowSubLevel = false } = {}) {
  if (allowSubLevel && hasSubLevel(raw)) return formatScore(raw);
  return parseInt(raw, 10) || 0;
}
