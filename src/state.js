// state.js - Central app state with localStorage persistence and multi-venture support

import { coerceCategoryScore, normalizeScores } from "./score-utils.js";
import { BRL_FRAMEWORK_VERSION } from "./data/readiness-levels.js";
import { DUAL_USE_ENABLED, PRIMARY_APPLICATION, normalizeApplicationScores, effectiveApplicationScores } from "./applications.js";

// Framework assumed for scores saved before ventures were stamped (Nov 2026).
export const LEGACY_FRAMEWORK_VERSION = "April 2026";

const STORAGE_KEY = "nr-rl-assessments";
const ACTIVE_KEY = "nr-rl-active";
const ADVISOR_KEY = "nr-rl-advisor-name";
const ASSESSMENT_HISTORY_KEY = "nr-rl-assessment-history";

const DEFAULT_COMMENTARY = Object.freeze({
  coachability: "",
  startupInterest: "",
  callNotes: "",
});

function normalizeCommentary(commentary = {}) {
  const source = commentary || {};
  return {
    coachability: String(source.coachability || source.Coachability || "").trim(),
    startupInterest: String(source.startupInterest || source.StartupInterest || "").trim(),
    callNotes: String(source.callNotes || source.CallNotes || "").trim(),
  };
}

function createEmptyCommentary() {
  return { ...DEFAULT_COMMENTARY };
}

function normalizeTrackAssignment(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^([123])$/) || raw.match(/^(?:track|phase)\s+([123])$/i);
  return match ? `Track ${match[1]}` : "";
}

function normalizeReportingMetadata(source = {}) {
  const safeSource = source || {};
  return {
    institution: String(safeSource.institution || safeSource.Institution || "").trim(),
    trackAssignment: normalizeTrackAssignment(safeSource.trackAssignment || safeSource.TrackAssignment || safeSource["Track Assignment"]),
  };
}

// Load saved assessments from localStorage
function loadAssessments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (e) {
    console.warn("Failed to load assessments from localStorage:", e);
    return {};
  }
}

// Save all assessments to localStorage
function saveAssessments(assessments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
  } catch (e) {
    console.warn("Failed to save assessments to localStorage:", e);
  }
}

// Load active venture ID
function loadActiveId() {
  try {
    return localStorage.getItem(ACTIVE_KEY) || null;
  } catch (e) {
    return null;
  }
}

// Save active venture ID
function saveActiveId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch (e) {
    console.warn("Failed to save active venture ID:", e);
  }
}

export function hasCurrentVentureData() {
  const commentary = normalizeCommentary(AppState.commentary);
  return Object.values(AppState.scores || {}).some(score => score != null) ||
    Object.values(AppState.goalLevels || {}).some(level => level != null) ||
    Object.values(commentary).some(value => value !== "") ||
    String(AppState.ventureName || "").trim() !== "" ||
    String(AppState.portfolio || "").trim() !== "" ||
    AppState.isHealthRelated === true ||
    AppState.isDualUse === true ||
    !!AppState.assessedAt ||
    !!AppState.lastSavedToSmartsheet ||
    (AppState.currentAssessmentNumber || 1) > 1 ||
    !!AppState.lastSubmissionTimestamp ||
    !!AppState.lastSubmittedStateHash ||
    !!AppState.smartsheetRowId ||
    AppState.isEditingExisting === true ||
    !!AppState.originalAssessment;
}

// Generate unique ID for ventures (internal localStorage ID)
function generateId() {
  return "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// Generate UUID for Smartsheet venture tracking
export function generateVentureId() {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "rlv_" + crypto.randomUUID();
  }
  // Fallback for older browsers
  return "rlv_" + "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get current assessment number (for re-submission workflow)
export function getCurrentAssessmentNumber() {
  return AppState.currentAssessmentNumber || 1;
}

// Generate hash of current state for change detection
export function generateStateHash() {
  const reportingMetadata = normalizeReportingMetadata(AppState);
  const stateForHash = {
    scores: AppState.scores,
    commentary: normalizeCommentary(AppState.commentary),
    ventureName: AppState.ventureName,
    advisorName: AppState.advisorName,
    portfolio: AppState.portfolio,
    isHealthRelated: AppState.isHealthRelated,
    currentAssessmentNumber: AppState.currentAssessmentNumber,
  };

  if (reportingMetadata.institution || reportingMetadata.trackAssignment) {
    stateForHash.institution = reportingMetadata.institution;
    stateForHash.trackAssignment = reportingMetadata.trackAssignment;
  }

  // Only when present, so ventures saved before notes existed keep their hash.
  const notes = Object.entries(AppState.categoryNotes || {})
    .map(([cat, text]) => [cat, String(text || "").trim()])
    .filter(([, text]) => text);
  if (notes.length) stateForHash.categoryNotes = Object.fromEntries(notes);

  // Only while dual-use is on, so assessments that never used it keep their hash.
  if (AppState.isDualUse) stateForHash.applicationScores = effectiveApplicationScores(AppState);

  // Only once current, so a venture submitted before versioning keeps its hash
  // until its scores are reviewed — which then shows as a change to re-save.
  if (AppState.frameworkVersion === BRL_FRAMEWORK_VERSION) {
    stateForHash.frameworkVersion = AppState.frameworkVersion;
  }

  const stateStr = JSON.stringify(stateForHash);
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < stateStr.length; i++) {
    const char = stateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Get submission status
export function getSubmissionStatus() {
  const submitted = !!AppState.lastSubmissionTimestamp;
  const currentHash = generateStateHash();
  const hasChanges = submitted && (currentHash !== AppState.lastSubmittedStateHash);

  return {
    submitted,
    lastSubmitted: AppState.lastSubmissionTimestamp,
    hasChanges
  };
}

// Record successful submission
export function recordSubmission() {
  const timestamp = new Date().toISOString();
  AppState.lastSubmissionTimestamp = timestamp;
  AppState.lastSubmittedStateHash = generateStateHash();

  // Keep existing history tracking
  recordAssessmentSubmission(AppState.ventureId, timestamp);
}

// Record assessment submission to history
// Limits history to last 100 entries per venture to prevent localStorage bloat
const MAX_HISTORY_PER_VENTURE = 100;

export function recordAssessmentSubmission(ventureId, timestamp) {
  try {
    const history = JSON.parse(localStorage.getItem(ASSESSMENT_HISTORY_KEY) || "{}");
    if (!history[ventureId]) history[ventureId] = [];
    history[ventureId].push(timestamp);

    // Keep only the last MAX_HISTORY_PER_VENTURE submissions per venture
    if (history[ventureId].length > MAX_HISTORY_PER_VENTURE) {
      history[ventureId] = history[ventureId].slice(-MAX_HISTORY_PER_VENTURE);
    }

    localStorage.setItem(ASSESSMENT_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn("Failed to record assessment submission:", e);
  }
}

// Advisor name persistence (auto-fills across sessions)
export function saveAdvisorPreference(name) {
  try {
    localStorage.setItem(ADVISOR_KEY, name);
    AppState.advisorName = name;
  } catch (e) {
    console.warn("Failed to save advisor preference:", e);
  }
}

export function loadAdvisorPreference() {
  try {
    return localStorage.getItem(ADVISOR_KEY) || "";
  } catch (e) {
    return "";
  }
}

// The main AppState object
export const AppState = {
  // Current UI state (not persisted)
  currentCategory: null,
  currentView: "expanded",
  // Which application the level cards score for a dual-use venture
  // ("Commercial" is AppState.scores). Back to Commercial on each category.
  currentApplication: PRIMARY_APPLICATION,

  // Current venture data (persisted)
  activeVentureId: null,
  ventureName: "",
  scores: {},
  // BRL framework the scores were given under. New work is always current;
  // a venture saved before Nov 2026 loads as LEGACY_FRAMEWORK_VERSION until the
  // advisor marks its scores reviewed.
  frameworkVersion: BRL_FRAMEWORK_VERSION,
  goalLevels: {},
  commentary: createEmptyCommentary(),
  categoryNotes: {},  // Optional per-category justification { [category]: text }
  isHealthRelated: false,
  // Dual-use (Nov 2026, src/applications.js): Market, Product and GTM also
  // scored for the Government application. Turning it off keeps the scores.
  isDualUse: false,
  applicationScores: {},
  // Which TRL track the Technology category is scored against (DOM option value
  // from #industry-select). Persisted because the life-sciences tracks render
  // materially different level definitions — reopening a venture on the wrong
  // track would misrepresent its TRL score.
  technologyTrack: "general",
  assessedAt: null,
  createdAt: null,

  // Smartsheet integration fields
  advisorName: "",
  portfolio: "",
  institution: "",
  trackAssignment: "",
  ventureId: null,  // Shared Venture ID (UCF-SENSORMESH-7K), or an older random rlv_ ID
  // The venture-list entry this assessment belongs to (proxy rl_directory key),
  // and whether its name came from that list (then it can't be edited here, so
  // names stay consistent across tools).
  ventureKey: null,
  ventureLocked: false,
  lastSavedToSmartsheet: null,

  // Assessment number tracking (for re-submission workflow)
  currentAssessmentNumber: 1,           // Active assessment number
  lastSubmissionTimestamp: null,        // When current assessment was last submitted
  lastSubmittedStateHash: null,         // Hash of submitted state for change detection

  // Edit mode tracking (for loading and updating existing assessments)
  smartsheetRowId: null,                // Row ID from Smartsheet for UPDATE operations
  isEditingExisting: false,             // True when editing a fetched assessment
  originalAssessment: null,             // Snapshot of loaded data for reference

  // All saved ventures
  _savedVentures: loadAssessments(),
};

// Intentionally NOT auto-loading the previously active venture on module init.
// The tool opens on the venture picker on every page load; unsaved drafts stay
// in _savedVentures and the picker offers them under "Resume" (see
// getResumableDrafts). resetActiveVenture() below runs during boot.

// Export venture management functions
export function loadVenture(id) {
  const venture = AppState._savedVentures[id];
  if (!venture) return false;

  // Migrate old schema: score 0 meant "unassessed", now null means "unassessed" and 0 = Level 0
  if (!venture._schemaVersion || venture._schemaVersion < 2) {
    Object.keys(venture.scores || {}).forEach(cat => {
      if (venture.scores[cat] === 0) {
        venture.scores[cat] = null;
      }
    });
    venture._schemaVersion = 2;
  }

  AppState.activeVentureId = id;
  AppState.ventureName = venture.ventureName || "";
  AppState.scores = normalizeScores(venture.scores);
  AppState.frameworkVersion = venture.frameworkVersion || LEGACY_FRAMEWORK_VERSION;
  AppState.goalLevels = { ...venture.goalLevels } || {};
  AppState.commentary = normalizeCommentary(venture.commentary);
  AppState.categoryNotes = { ...(venture.categoryNotes || {}) };
  AppState.isHealthRelated = venture.isHealthRelated || false;
  AppState.isDualUse = DUAL_USE_ENABLED && venture.isDualUse === true;
  AppState.applicationScores = normalizeApplicationScores(venture.applicationScores);
  AppState.technologyTrack = venture.technologyTrack || "general";
  AppState.assessedAt = venture.assessedAt ? new Date(venture.assessedAt) : null;
  AppState.createdAt = venture.createdAt ? new Date(venture.createdAt) : null;

  // Smartsheet integration fields
  AppState.ventureId = venture.ventureId || generateVentureId();
  AppState.ventureKey = venture.ventureKey || null;
  AppState.ventureLocked = venture.ventureLocked || false;
  AppState.portfolio = venture.portfolio || "";
  const reportingMetadata = normalizeReportingMetadata(venture);
  AppState.institution = reportingMetadata.institution;
  AppState.trackAssignment = reportingMetadata.trackAssignment;
  AppState.lastSavedToSmartsheet = venture.lastSavedToSmartsheet || null;
  // Note: advisorName is loaded from localStorage preference, not per-venture

  // Assessment number tracking
  AppState.currentAssessmentNumber = venture.currentAssessmentNumber || 1;
  AppState.lastSubmissionTimestamp = venture.lastSubmissionTimestamp || null;
  AppState.lastSubmittedStateHash = venture.lastSubmittedStateHash || null;

  // Edit mode tracking
  AppState.smartsheetRowId = venture.smartsheetRowId || null;
  AppState.isEditingExisting = venture.isEditingExisting || false;
  AppState.originalAssessment = venture.originalAssessment || null;

  saveActiveId(id);
  return true;
}

export function saveCurrentVenture() {
  if (!AppState.activeVentureId) {
    // Create new venture
    AppState.activeVentureId = generateId();
    AppState.createdAt = new Date();
  }

  // Ensure ventureId exists for Smartsheet tracking
  if (!AppState.ventureId) {
    AppState.ventureId = generateVentureId();
  }

  const reportingMetadata = normalizeReportingMetadata(AppState);
  AppState.institution = reportingMetadata.institution;
  AppState.trackAssignment = reportingMetadata.trackAssignment;

  AppState._savedVentures[AppState.activeVentureId] = {
    _schemaVersion: 2,
    id: AppState.activeVentureId,
    ventureId: AppState.ventureId,  // Smartsheet tracking ID
    ventureKey: AppState.ventureKey,
    ventureLocked: AppState.ventureLocked,
    ventureName: AppState.ventureName,
    scores: { ...AppState.scores },
    frameworkVersion: AppState.frameworkVersion || BRL_FRAMEWORK_VERSION,
    goalLevels: { ...AppState.goalLevels },
    commentary: normalizeCommentary(AppState.commentary),
    categoryNotes: { ...AppState.categoryNotes },
    isHealthRelated: AppState.isHealthRelated,
    isDualUse: AppState.isDualUse === true,
    applicationScores: normalizeApplicationScores(AppState.applicationScores),
    technologyTrack: AppState.technologyTrack || "general",
    assessedAt: AppState.assessedAt ? AppState.assessedAt.toISOString() : null,
    createdAt: AppState.createdAt ? AppState.createdAt.toISOString() : null,
    updatedAt: new Date().toISOString(),
    portfolio: AppState.portfolio,  // Smartsheet field
    institution: reportingMetadata.institution,
    trackAssignment: reportingMetadata.trackAssignment,
    lastSavedToSmartsheet: AppState.lastSavedToSmartsheet,  // Smartsheet tracking
    currentAssessmentNumber: AppState.currentAssessmentNumber,  // Assessment tracking
    lastSubmissionTimestamp: AppState.lastSubmissionTimestamp,  // Submission tracking
    lastSubmittedStateHash: AppState.lastSubmittedStateHash,  // Change detection
    smartsheetRowId: AppState.smartsheetRowId,  // Row ID for UPDATE operations
    isEditingExisting: AppState.isEditingExisting,  // Edit mode flag
    originalAssessment: AppState.originalAssessment,  // Original assessment snapshot
    // Has work not yet in the database; the picker offers these under "Resume".
    needsDatabaseSave: needsDatabaseSave(),
  };

  saveAssessments(AppState._savedVentures);
  saveActiveId(AppState.activeVentureId);
}

function needsDatabaseSave() {
  const hasScores = Object.values(AppState.scores || {}).some(s => s != null);
  if (!hasScores) return false;
  const status = getSubmissionStatus();
  return !status.submitted || status.hasChanges;
}

/**
 * Start a fresh assessment for a venture chosen in the picker (or added there).
 * The advisor name is kept; everything else is reset.
 * venture: { ventureKey, ventureId, ventureName, portfolio, institution,
 *            trackAssignment, isHealthRelated, isDualUse, assessmentNumber, locked }
 */
export function startAssessment(venture = {}) {
  resetActiveVenture();
  AppState.activeVentureId = generateId();
  AppState.createdAt = new Date();
  AppState.ventureKey = venture.ventureKey || null;
  AppState.ventureId = venture.ventureId || generateVentureId();
  AppState.ventureName = venture.ventureName || "";
  AppState.ventureLocked = !!venture.locked;
  AppState.portfolio = venture.portfolio || "";
  const reportingMetadata = normalizeReportingMetadata(venture);
  AppState.institution = reportingMetadata.institution;
  AppState.trackAssignment = reportingMetadata.trackAssignment;
  AppState.isHealthRelated = !!venture.isHealthRelated;
  AppState.isDualUse = DUAL_USE_ENABLED && !!venture.isDualUse;
  AppState.currentAssessmentNumber = venture.assessmentNumber || 1;
  saveCurrentVenture();
}

/**
 * Drafts in this browser with work not yet saved to the database, newest first.
 * @returns {Array<{ id, ventureName, currentAssessmentNumber, updatedAt }>}
 */
export function getResumableDrafts(limit = 3) {
  return Object.values(AppState._savedVentures)
    .filter(v => v.needsDatabaseSave && v.id !== AppState.activeVentureId)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, limit);
}

// Auto-save on any score change.
// The single write choke point for AppState.scores: coerceCategoryScore
// guarantees the stored value is null, an integer 0-9 (1-9 for TRL), or — for
// TRL only — a sub-level string like "3B".
export function setScore(category, level) {
  AppState.scores[category] = coerceCategoryScore(category, level);
  if (!AppState.assessedAt) {
    AppState.assessedAt = new Date();
  }
  saveCurrentVenture();
}

// The write choke point for application scores (dual-use). null unsets the
// score, which for Government Product means "same as Commercial" again.
export function setApplicationScore(application, category, level) {
  const others = { ...(AppState.applicationScores || {}) };
  const scores = { ...(others[application] || {}), [category]: level };
  delete others[application];
  AppState.applicationScores = { ...others, ...normalizeApplicationScores({ [application]: scores }) };
  if (!AppState.assessedAt) {
    AppState.assessedAt = new Date();
  }
  saveCurrentVenture();
}

// Off hides the application scores without deleting them (like Life Science
// and Regulatory); a save while off blanks them on the row.
export function setDualUse(on) {
  AppState.isDualUse = DUAL_USE_ENABLED && !!on;
  if (!AppState.isDualUse) AppState.currentApplication = PRIMARY_APPLICATION;
  saveCurrentVenture();
}

export function setCommentaryField(field, value) {
  if (!AppState.commentary) {
    AppState.commentary = createEmptyCommentary();
  }
  if (!(field in DEFAULT_COMMENTARY)) return;
  AppState.commentary[field] = String(value || "");
  saveCurrentVenture();
}

// Optional per-category justification note (both modes; saved to the RL sheet's
// Notes_* columns). Not trimmed here so trailing spaces while typing aren't
// eaten; trim at PDF/save time instead.
export const CATEGORY_NOTE_MAX = 500;

export function setCategoryNote(category, text) {
  if (!category) return;
  if (!AppState.categoryNotes) AppState.categoryNotes = {};
  AppState.categoryNotes[category] = String(text || "").slice(0, CATEGORY_NOTE_MAX);
  saveCurrentVenture();
}

export function setCommentary(commentary = {}) {
  AppState.commentary = normalizeCommentary(commentary);
  saveCurrentVenture();
}

export function setReportingMetadata(metadata = {}) {
  const normalized = normalizeReportingMetadata(metadata);
  AppState.institution = normalized.institution;
  AppState.trackAssignment = normalized.trackAssignment;
  saveCurrentVenture();
}

export function clearCommentary() {
  AppState.commentary = createEmptyCommentary();
  saveCurrentVenture();
}

// The advisor has reviewed a legacy venture's scores against the current
// framework definitions; from here on they are recorded as current.
export function markScoresReviewed() {
  AppState.frameworkVersion = BRL_FRAMEWORK_VERSION;
  saveCurrentVenture();
}

export function isLegacyFramework() {
  return (AppState.frameworkVersion || BRL_FRAMEWORK_VERSION) !== BRL_FRAMEWORK_VERSION;
}

// Reset the *in-memory* active venture to a blank assessment WITHOUT
// persisting an empty venture entry. Used at app boot (the tool opens on the
// venture picker) and by startAssessment(). Saved drafts remain in
// _savedVentures untouched; unsaved ones are offered under "Resume".
export function resetActiveVenture() {
  AppState.activeVentureId = null;
  AppState.ventureName = "";
  AppState.scores = {};
  AppState.frameworkVersion = BRL_FRAMEWORK_VERSION;
  AppState.goalLevels = {};
  AppState.commentary = createEmptyCommentary();
  AppState.categoryNotes = {};
  AppState.isHealthRelated = false;
  AppState.isDualUse = false;
  AppState.applicationScores = {};
  AppState.currentApplication = PRIMARY_APPLICATION;
  AppState.technologyTrack = "general";
  AppState.assessedAt = null;
  AppState.createdAt = null;
  AppState.currentCategory = null;

  AppState.ventureId = null;
  AppState.ventureKey = null;
  AppState.ventureLocked = false;
  AppState.portfolio = "";
  AppState.institution = "";
  AppState.trackAssignment = "";
  AppState.lastSavedToSmartsheet = null;

  AppState.currentAssessmentNumber = 1;
  AppState.lastSubmissionTimestamp = null;
  AppState.lastSubmittedStateHash = null;

  AppState.smartsheetRowId = null;
  AppState.isEditingExisting = false;
  AppState.originalAssessment = null;

  // Forget which venture used to be active so a later refresh doesn't
  // resurrect it via any path.
  saveActiveId(null);
}
