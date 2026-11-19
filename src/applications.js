// applications.js - dual-use scoring. Added November 2026.
//
// A dual-use venture takes the same core technology to commercial customers and
// to government buyers. Market, Product and Go-to-Market are then scored once
// per application, against the same level definitions; every other category is
// scored once. The scores are never combined.
//
// AppState.scores stays the primary (Commercial) score of every category, so
// nothing that reads it changes. A dual-use venture adds
//   isDualUse          true while the switch is on
//   applicationScores  { Government: { Market, Product, "Go-to-Market" } }
// Only Government is offered. Another application later (a second industry
// segment, say) is a new APPLICATIONS entry plus its Smartsheet columns, with no
// migration of saved data.
//
// A missing Government Product score means "same as Commercial" (most
// government products are the commercial one); a missing Market or
// Go-to-Market score means unscored. Turning the switch off hides the
// application scores but keeps them, so turning it back on restores them.
//
// Pure: imports only score-utils, so it loads in state.js and in tests.

import { coerceCategoryScore, formatScore } from "./score-utils.js";

// Release switch (Brian, Nov 16, 2026): dual-use is built but not yet adopted,
// so it ships hidden. While false, no dual-use control is shown (Assessment
// details, the picker's Add form, the external Setup step, the Help line) and
// every place that loads a venture forces isDualUse to false, so the toggle,
// pills, PDF rows and Government save requirements never appear. Saved data is
// kept untouched. Set to true to turn the feature on; nothing else changes.
export const DUAL_USE_ENABLED = false;

export const PRIMARY_APPLICATION = "Commercial";
export const APPLICATIONS = ["Government"];
export const DUAL_USE_CATEGORIES = ["Market", "Product", "Go-to-Market"];

// Approved wording (Brian, Nov 2, 2026). "Government" means any government buyer.
export const DUAL_USE_DEFINITION =
  "Dual-use: the same core technology is being taken to both commercial customers and government " +
  "buyers or users (such as defense, homeland security or other agencies). A venture that serves " +
  "only government isn't dual-use; score it once, as usual.";

// Categories whose application score follows the primary score until set.
const FOLLOWS_PRIMARY = { Government: ["Product"] };

// RL sheet column stems; the column title is `${stem}_${application}`.
const COLUMN_STEMS = { Market: "RL_Market", Product: "RL_Product", "Go-to-Market": "RL_GTM" };

export function isDualUseCategory(category) {
  return DUAL_USE_CATEGORIES.includes(category);
}

export function followsPrimary(application, category) {
  return (FOLLOWS_PRIMARY[application] || []).includes(category);
}

/** The application's own score, ignoring any follow. null when not set. */
export function ownApplicationScore(state, application, category) {
  const v = state?.applicationScores?.[application]?.[category];
  return v == null ? null : v;
}

/** True when the score shown for this application is the primary one. */
export function isFollowingPrimary(state, application, category) {
  return followsPrimary(application, category) && ownApplicationScore(state, application, category) == null;
}

/** The score that counts for this application (own score, or the followed primary score). */
export function applicationScore(state, application, category) {
  if (application === PRIMARY_APPLICATION) return state?.scores?.[category] ?? null;
  const own = ownApplicationScore(state, application, category);
  if (own != null) return own;
  return followsPrimary(application, category) ? (state?.scores?.[category] ?? null) : null;
}

/** Keep only known applications and categories, with scores normalized and nulls dropped. */
export function normalizeApplicationScores(source) {
  const out = {};
  APPLICATIONS.forEach((app) => {
    const scores = {};
    DUAL_USE_CATEGORIES.forEach((cat) => {
      const v = coerceCategoryScore(cat, source?.[app]?.[cat]);
      if (v != null) scores[cat] = v;
    });
    if (Object.keys(scores).length) out[app] = scores;
  });
  return out;
}

/** The effective score of every application category, for change detection. */
export function effectiveApplicationScores(state) {
  return Object.fromEntries(APPLICATIONS.map((app) => [
    app,
    Object.fromEntries(DUAL_USE_CATEGORIES.map((cat) => [cat, applicationScore(state, app, cat)])),
  ]));
}

/** "Market (Government)": how a missing application score is named. */
export function applicationScoreLabel(categoryLabel, application) {
  return `${categoryLabel} (${application})`;
}

/**
 * Application scores still needed before saving, as "Market (Government)"
 * labels, for the active categories given. A following score is satisfied by
 * the primary score, so it is never listed on its own.
 */
export function missingApplicationScores(state, activeCategories, applications = APPLICATIONS) {
  if (!state?.isDualUse) return [];
  const missing = [];
  (activeCategories || []).filter(isDualUseCategory).forEach((cat) => {
    applications.forEach((app) => {
      if (isFollowingPrimary(state, app, cat)) return;
      if (applicationScore(state, app, cat) == null) missing.push(applicationScoreLabel(cat, app));
    });
  });
  return missing;
}

/** How many application scores must be entered (following ones excluded). */
export function requiredApplicationScoreCount(state, activeCategories) {
  if (!state?.isDualUse) return 0;
  return (activeCategories || []).filter(isDualUseCategory).reduce(
    (n, cat) => n + APPLICATIONS.filter((app) => !followsPrimary(app, cat)).length, 0
  );
}

/**
 * Display rows for one category: [{ application, score }] — just the primary
 * score unless the venture is dual-use and the category is scored per
 * application.
 */
export function scoreRowsFor(state, category) {
  if (!state?.isDualUse || !isDualUseCategory(category)) {
    return [{ application: null, score: state?.scores?.[category] ?? null }];
  }
  return [PRIMARY_APPLICATION, ...APPLICATIONS].map((application) => ({
    application,
    score: applicationScore(state, application, category),
  }));
}

/** Smartsheet field (and RL column title) for an application score: RL_GTM_Government. */
export function applicationFieldName(application, category) {
  return `${COLUMN_STEMS[category]}_${application}`;
}

export function applicationFieldNames() {
  return APPLICATIONS.flatMap((app) => DUAL_USE_CATEGORIES.map((cat) => applicationFieldName(app, cat)));
}

/**
 * Payload fields for a save. Always sent: with the switch off (or a score
 * unset) the cell is sent blank, because the proxy skips null and an edited
 * row would otherwise keep stale application scores. A following score is
 * written as the primary number, so readers of the sheet need no rule.
 */
export function applicationPayload(state) {
  const payload = { isDualUse: !!state?.isDualUse };
  APPLICATIONS.forEach((app) => {
    DUAL_USE_CATEGORIES.forEach((cat) => {
      const score = state?.isDualUse ? applicationScore(state, app, cat) : null;
      const n = score == null ? NaN : parseInt(score, 10);
      payload[applicationFieldName(app, cat)] = Number.isNaN(n) ? "" : Math.max(0, Math.min(9, n));
    });
  });
  return payload;
}

/**
 * Read a saved RL row. Blank cells are unscored (never Level 0). A saved
 * Government Product equal to the Commercial one is treated as following it,
 * since the sheet can't tell the two apart.
 * @param {object} row  raw row fields from the proxy
 * @param {object} primaryScores  the row's Commercial scores, already parsed
 */
export function readApplicationScores(row, primaryScores = {}) {
  const raw = {};
  APPLICATIONS.forEach((app) => {
    raw[app] = {};
    DUAL_USE_CATEGORIES.forEach((cat) => {
      const cell = row?.[applicationFieldName(app, cat)];
      const v = cell === "" || cell == null ? null : coerceCategoryScore(cat, cell);
      raw[app][cat] = followsPrimary(app, cat) && v != null && v === primaryScores?.[cat] ? null : v;
    });
  });
  return {
    isDualUse: row?.isDualUse === true || row?.isDualUse === "true",
    applicationScores: normalizeApplicationScores(raw),
  };
}

/** "C5 G2"-style compact form for one dual-use category (picker line, sidebar title). */
export function compactScorePair(state, category) {
  return scoreRowsFor(state, category)
    .map(({ application, score }) => `${(application || "").charAt(0)}${score == null ? "-" : formatScore(score)}`)
    .join("/");
}
