// submission-requirements.js - Shared submission completion rules

import { isValidScore, scoreRank, minLevel } from "./score-utils.js";
import { activeCategoryKeys } from "./category-labels.js";
import {
  isDualUseCategory,
  missingApplicationScores,
  requiredApplicationScoreCount,
} from "./applications.js";

export const SUBMISSION_CATEGORY_ORDER = [
  "IP",
  "Technology",
  "Market",
  "Product",
  "Team",
  "Go-to-Market",
  "Business",
  "Funding",
  "Regulatory",
];

export function isFirstAssessmentRound(state) {
  return (parseInt(state.currentAssessmentNumber, 10) || 1) === 1;
}

export function getActiveSubmissionCategories(state, readinessData) {
  return activeCategoryKeys(SUBMISSION_CATEGORY_ORDER, state.isHealthRelated).filter(
    (category) => !!readinessData[category]
  );
}

// Category keys, plus "Market (Government)"-style labels for a dual-use
// venture's application scores, each right after its category.
export function getMissingScoreCategories(state, readinessData) {
  const missing = [];
  getActiveSubmissionCategories(state, readinessData).forEach((category) => {
    if (!isCompleteScore(category, state.scores?.[category])) missing.push(category);
    if (isDualUseCategory(category)) missing.push(...missingApplicationScores(state, [category]));
  });
  return missing;
}

export function normalizeCommentary(commentary = {}) {
  const safeCommentary = commentary || {};

  return {
    coachability: String(safeCommentary.coachability || "").trim(),
    startupInterest: String(safeCommentary.startupInterest || "").trim(),
    callNotes: String(safeCommentary.callNotes || "").trim(),
  };
}

// Accepts null/""/garbage as incomplete, integers 0-9 as complete (1-9 for TRL,
// whose scale begins at 1), and TRL sub-level strings like "3B" as complete.
function isCompleteScore(category, score) {
  return isValidScore(score) && scoreRank(score) >= minLevel(category);
}

export function getMissingCommentaryFields(state) {
  if (!isFirstAssessmentRound(state)) return [];

  const commentary = normalizeCommentary(state.commentary);
  const missing = [];
  if (!commentary.coachability) missing.push("Founder coachability");
  if (!commentary.startupInterest) missing.push("Startup interest");
  if (!commentary.callNotes) missing.push("Call notes, milestone ideas, and task ideas");
  return missing;
}

export function getSubmissionReadiness(state, readinessData) {
  const missingScores = getMissingScoreCategories(state, readinessData);
  const missingCommentary = getMissingCommentaryFields(state);

  const activeCategories = getActiveSubmissionCategories(state, readinessData);

  return {
    isFirstAssessment: isFirstAssessmentRound(state),
    activeCategories,
    // Scores to enter: one per category, plus a dual-use venture's application scores.
    requiredScoreCount: activeCategories.length + requiredApplicationScoreCount(state, activeCategories),
    missingScores,
    missingCommentary,
    scoresComplete: missingScores.length === 0,
    commentaryComplete: missingCommentary.length === 0,
    canSubmit: missingScores.length === 0 && missingCommentary.length === 0,
  };
}
