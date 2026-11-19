// venture-directory.js - Filtering and sorting for the advisor venture picker.
// PURE: no DOM, no storage, no network.
//
// A venture comes from the proxy's rl_directory action:
//   { key, ventureId, ventureName, institution, portfolio, status, fromIntake,
//     intakeSubmittedAt, assessments: [RL rows, newest first] }
// There is deliberately no cadence rule (programs differ): the picker only
// shows when a venture was last scored and offers a "not scored since" filter.

import { getNameSimilarity } from "./qualification-matching.js";

const HIDDEN_STATUSES = ["Graduated", "Inactive"];
const SIMILAR_NAME_THRESHOLD = 0.6;

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
const compact = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const dateOf = (a) => String(a.assessmentDate || a.submissionTimestamp || "");

/** Newest assessment date ("" if never scored). */
export function lastScored(venture) {
  return (venture.assessments || []).map(dateOf).filter(Boolean).sort().pop() || "";
}

export function isMine(venture, advisor) {
  const me = norm(advisor);
  return !!me && (venture.assessments || []).some((a) => norm(a.advisorName) === me);
}

/** Graduated, inactive, or in a portfolio whose program has ended. */
export function isGraduated(venture, archivedPortfolios = []) {
  return HIDDEN_STATUSES.includes(venture.status) || archivedPortfolios.includes(venture.portfolio);
}

/** Advisors edit only their own assessments. */
export function canEdit(assessment, advisor) {
  return !!norm(advisor) && norm(assessment.advisorName) === norm(advisor);
}

export function nextAssessmentNumber(venture) {
  const rounds = venture.assessments || [];
  const max = Math.max(0, ...rounds.map((a) => Number(a.assessmentNumber) || 0));
  return Math.max(max, rounds.length) + 1;
}

/** "this month", "1 month ago", "6 months ago", or "never". */
export function monthsAgoText(date, now = new Date()) {
  const d = new Date(date);
  if (!date || isNaN(d)) return "never";
  const months = (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth());
  if (months <= 0) return "this month";
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/**
 * opts: { advisor, scope: "mine" | "all", portfolio, showGraduated,
 *         notScoredMonths, query, archivedPortfolios, now }
 */
export function filterVentures(ventures, opts = {}) {
  const q = norm(opts.query);
  const now = opts.now || new Date();
  let cutoff = "";
  if (opts.notScoredMonths) {
    const c = new Date(now);
    c.setUTCMonth(c.getUTCMonth() - Number(opts.notScoredMonths));
    cutoff = c.toISOString().slice(0, 10);
  }
  return ventures.filter((v) => {
    if (opts.scope === "mine" && !isMine(v, opts.advisor)) return false;
    if (!opts.showGraduated && isGraduated(v, opts.archivedPortfolios || [])) return false;
    if (opts.portfolio && v.portfolio !== opts.portfolio) return false;
    if (cutoff) {
      const last = lastScored(v);
      if (last && last.slice(0, 10) >= cutoff) return false;
    }
    if (q && !searchFields(v).some((f) => norm(f).includes(q))) return false;
    return true;
  });
}

/** What the search box matches: name, Venture ID, institution, portfolio, any advisor. */
function searchFields(v) {
  return [v.ventureName, v.ventureId, v.institution, v.portfolio,
    ...(v.assessments || []).map((a) => a.advisorName)];
}

/**
 * Every advisor who has saved an assessment, A to Z, for the name pick list.
 * Names differing only in case or spacing merge, keeping the spelling from the
 * newest assessment (assessments arrive newest first).
 */
export function advisorNames(ventures) {
  const newest = new Map();   // norm(name) -> [date, spelling]
  for (const v of ventures) {
    for (const a of v.assessments || []) {
      const name = String(a.advisorName || "").trim().replace(/\s+/g, " ");
      if (!name) continue;
      const key = norm(name);
      const d = String(a.submissionTimestamp || a.assessmentDate || "");
      if (!newest.has(key) || d > newest.get(key)[0]) newest.set(key, [d, name]);
    }
  }
  return [...newest.values()].map(([, n]) => n).sort((a, b) => a.localeCompare(b));
}

/** "due": never scored first, then least recently scored. "name": A to Z. */
export function sortVentures(list, sort = "due") {
  const byName = (a, b) => String(a.ventureName).localeCompare(String(b.ventureName));
  if (sort === "name") return [...list].sort(byName);
  return [...list].sort((a, b) => lastScored(a).localeCompare(lastScored(b)) || byName(a, b));
}

/**
 * Filter and sort. A search under "My ventures" that finds nothing widens to
 * all ventures, so an advisor never has to know which filter to switch to.
 * Returns { list, widened }.
 */
export function findVentures(ventures, opts = {}) {
  let list = filterVentures(ventures, opts);
  let widened = false;
  if (!list.length && opts.scope === "mine" && norm(opts.query)) {
    list = filterVentures(ventures, { ...opts, scope: "all" });
    widened = true;
  }
  return { list: sortVentures(list, opts.sort), widened };
}

/** Existing ventures whose names are close to `name` (for "Add a venture"), best first. */
export function similarVentures(ventures, name, limit = 3) {
  if (!norm(name)) return [];
  return ventures
    .map((v) => ({ v, s: compact(v.ventureName) === compact(name) ? 1 : getNameSimilarity(v.ventureName, name) }))
    .filter((x) => x.s >= SIMILAR_NAME_THRESHOLD)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.v);
}
