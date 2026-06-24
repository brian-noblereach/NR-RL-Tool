const MIN_STRONG_MATCH_NAME_SIMILARITY = 0.45;
const MIN_CONTAINED_NAME_LENGTH = 4;
const SINGLE_CANDIDATE_CONFIDENT_NAME_SIMILARITY = 0.8;

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeTrackAssignment(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/^([123])$/) || raw.match(/^(?:track|phase)\s+([123])$/i);
  return match ? `Track ${match[1]}` : "";
}

function uniqueLowercase(values = []) {
  return Array.from(new Set(
    values
      .map(value => normalizeText(value))
      .filter(Boolean)
  ));
}

export function normalizeQualificationRecord(record = {}) {
  const ventureName = String(record.ventureName || record.name || "").trim();
  const advisorName = String(record.advisorName || "").trim();
  const advisorNames = Array.isArray(record.advisorNames)
    ? [...record.advisorNames, advisorName]
    : [advisorName];

  return {
    name: ventureName,
    ventureName,
    advisorName,
    advisorNames: uniqueLowercase(advisorNames),
    portfolio: String(record.portfolio || "").trim(),
    institution: String(record.institution || "").trim(),
    trackAssignment: normalizeTrackAssignment(record.trackAssignment),
    timestamp: String(record.timestamp || record.assessmentDate || record.submissionTimestamp || "").trim(),
    source: record.source || "qual",
  };
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasContainedNameAtTokenBoundary(contained, container) {
  const containedText = normalizeText(contained);
  if (containedText.length < MIN_CONTAINED_NAME_LENGTH) return false;

  const containedTokens = tokenize(containedText);
  const containerTokens = tokenize(container);
  if (containedTokens.length === 0 || containerTokens.length === 0) return false;

  return ` ${containerTokens.join(" ")} `.includes(` ${containedTokens.join(" ")} `);
}

export function getNameSimilarity(left, right) {
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);

  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;
  if (
    hasContainedNameAtTokenBoundary(leftText, rightText) ||
    hasContainedNameAtTokenBoundary(rightText, leftText)
  ) {
    return 0.85;
  }

  const leftTokens = new Set(tokenize(leftText));
  const rightTokens = new Set(tokenize(rightText));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let overlap = 0;
  leftTokens.forEach(token => {
    if (rightTokens.has(token)) overlap += 1;
  });

  return (2 * overlap) / (leftTokens.size + rightTokens.size);
}

function getTimestampValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function getCandidateScore(context, candidate) {
  let score = 0;
  if (candidate.sameAdvisor && candidate.samePortfolio) score += 100;
  else if (candidate.samePortfolio) score += 70;
  else if (candidate.sameAdvisor) score += 55;

  score += candidate.nameSimilarity * 30;
  if (candidate.institution || candidate.trackAssignment) score += 5;

  return score;
}

export function rankQualificationMatches(context = {}, records = []) {
  const advisor = normalizeText(context.advisorName);
  const portfolio = normalizeText(context.portfolio);
  const ventureName = String(context.ventureName || "").trim();

  return records
    .map(normalizeQualificationRecord)
    .filter(record => record.ventureName)
    .map(record => {
      const sameAdvisor = advisor
        ? record.advisorNames.includes(advisor) || normalizeText(record.advisorName) === advisor
        : false;
      const samePortfolio = portfolio
        ? normalizeText(record.portfolio) === portfolio
        : false;
      const nameSimilarity = getNameSimilarity(ventureName, record.ventureName);

      const candidate = {
        ...record,
        sameAdvisor,
        samePortfolio,
        nameSimilarity,
        timestampValue: getTimestampValue(record.timestamp),
      };

      return {
        ...candidate,
        score: getCandidateScore(context, candidate),
      };
    })
    .filter(candidate =>
      candidate.sameAdvisor ||
      candidate.samePortfolio ||
      candidate.nameSimilarity >= 0.45
    )
    .sort((a, b) =>
      b.score - a.score ||
      b.timestampValue - a.timestampValue ||
      a.ventureName.localeCompare(b.ventureName, undefined, { sensitivity: "base" })
    );
}

export function getQualificationMatchResolution(context = {}, records = []) {
  const candidates = rankQualificationMatches(context, records).slice(0, 8);

  if (candidates.length === 0) {
    return { status: "no-match", match: null, candidates: [] };
  }

  const strongMatches = candidates.filter(candidate =>
    candidate.sameAdvisor &&
    candidate.samePortfolio &&
    candidate.nameSimilarity >= MIN_STRONG_MATCH_NAME_SIMILARITY
  );
  if (strongMatches.length === 1) {
    const strongMatch = strongMatches[0];
    const competingMatches = candidates.filter(candidate =>
      candidate !== strongMatch &&
      (candidate.sameAdvisor || candidate.samePortfolio || candidate.nameSimilarity >= SINGLE_CANDIDATE_CONFIDENT_NAME_SIMILARITY)
    );
    if (competingMatches.length === 0) {
      return { status: "confident", match: strongMatch, candidates };
    }
  }

  if (candidates.length === 1 && candidates[0].nameSimilarity >= SINGLE_CANDIDATE_CONFIDENT_NAME_SIMILARITY) {
    return { status: "confident", match: candidates[0], candidates };
  }

  return { status: "ambiguous", match: null, candidates };
}
