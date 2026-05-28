// submission-requirements.js - Shared submission completion rules

export const SUBMISSION_CATEGORY_ORDER = [
  "IP",
  "Technology",
  "Market",
  "Product",
  "Team",
  "Go-to-Market",
  "Business",
  "Funding",
  "Mission Impact",
  "Regulatory",
];

export function isFirstAssessmentRound(state) {
  return (parseInt(state.currentAssessmentNumber, 10) || 1) === 1;
}

export function getActiveSubmissionCategories(state, readinessData) {
  return SUBMISSION_CATEGORY_ORDER.filter((category) => {
    if (!readinessData[category]) return false;
    return state.isHealthRelated || category !== "Regulatory";
  });
}

export function getMissingScoreCategories(state, readinessData) {
  return getActiveSubmissionCategories(state, readinessData).filter(
    (category) => !isCompleteScore(state.scores?.[category])
  );
}

export function normalizeCommentary(commentary = {}) {
  const safeCommentary = commentary || {};

  return {
    coachability: String(safeCommentary.coachability || "").trim(),
    startupInterest: String(safeCommentary.startupInterest || "").trim(),
    callNotes: String(safeCommentary.callNotes || "").trim(),
  };
}

function isCompleteScore(score) {
  if (typeof score === "string") {
    if (!score.trim()) return false;
    score = Number(score);
  }

  return Number.isInteger(score) && score >= 0 && score <= 9;
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

  return {
    isFirstAssessment: isFirstAssessmentRound(state),
    activeCategories: getActiveSubmissionCategories(state, readinessData),
    missingScores,
    missingCommentary,
    scoresComplete: missingScores.length === 0,
    commentaryComplete: missingCommentary.length === 0,
    canSubmit: missingScores.length === 0 && missingCommentary.length === 0,
  };
}
