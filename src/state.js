// state.js - Central app state with localStorage persistence and multi-venture support

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
  return Object.keys(AppState.scores || {}).length > 0 ||
    Object.keys(AppState.goalLevels || {}).length > 0 ||
    Object.values(commentary).some(value => value !== "") ||
    String(AppState.ventureName || "").trim() !== "" ||
    String(AppState.portfolio || "").trim() !== "" ||
    AppState.isHealthRelated === true ||
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

// Get next assessment number for a venture (for temporal tracking)
// DEPRECATED: Use getCurrentAssessmentNumber() instead
export function getNextAssessmentNumber(ventureId) {
  try {
    const history = JSON.parse(localStorage.getItem(ASSESSMENT_HISTORY_KEY) || "{}");
    const ventureHistory = history[ventureId] || [];
    return ventureHistory.length + 1;
  } catch (e) {
    return 1;
  }
}

// Get current assessment number (for re-submission workflow)
export function getCurrentAssessmentNumber() {
  return AppState.currentAssessmentNumber || 1;
}

// Increment assessment number (when starting new assessment)
// IMPORTANT: Also resets edit mode so next submission creates a NEW row
export function incrementAssessmentNumber() {
  AppState.currentAssessmentNumber = (AppState.currentAssessmentNumber || 1) + 1;
  AppState.lastSubmissionTimestamp = null;
  AppState.lastSubmittedStateHash = null;
  AppState.commentary = createEmptyCommentary();
  // Reset edit mode flags so next submission is INSERT, not UPDATE
  AppState.smartsheetRowId = null;
  AppState.isEditingExisting = false;
}

// Generate hash of current state for change detection
export function generateStateHash() {
  const stateStr = JSON.stringify({
    scores: AppState.scores,
    commentary: normalizeCommentary(AppState.commentary),
    ventureName: AppState.ventureName,
    advisorName: AppState.advisorName,
    portfolio: AppState.portfolio,
    isHealthRelated: AppState.isHealthRelated,
    currentAssessmentNumber: AppState.currentAssessmentNumber,
  });
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

  // Current venture data (persisted)
  activeVentureId: null,
  ventureName: "",
  scores: {},
  goalLevels: {},
  commentary: createEmptyCommentary(),
  isHealthRelated: false,
  assessedAt: null,
  createdAt: null,

  // Smartsheet integration fields
  advisorName: "",
  portfolio: "",
  ventureId: null,  // UUID for Smartsheet tracking (distinct from activeVentureId)
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
// The tool should open in a "start a new venture" state on every page load —
// the prior active venture remains in _savedVentures and can be reloaded via
// the venture-select dropdown or the Load Assessment modal. See
// resetActiveVenture() below, which main.js calls during boot.

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
  AppState.scores = { ...venture.scores } || {};
  AppState.goalLevels = { ...venture.goalLevels } || {};
  AppState.commentary = normalizeCommentary(venture.commentary);
  AppState.isHealthRelated = venture.isHealthRelated || false;
  AppState.assessedAt = venture.assessedAt ? new Date(venture.assessedAt) : null;
  AppState.createdAt = venture.createdAt ? new Date(venture.createdAt) : null;

  // Smartsheet integration fields
  AppState.ventureId = venture.ventureId || generateVentureId();
  AppState.portfolio = venture.portfolio || "";
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

  AppState._savedVentures[AppState.activeVentureId] = {
    _schemaVersion: 2,
    id: AppState.activeVentureId,
    ventureId: AppState.ventureId,  // Smartsheet tracking ID
    ventureName: AppState.ventureName,
    scores: { ...AppState.scores },
    goalLevels: { ...AppState.goalLevels },
    commentary: normalizeCommentary(AppState.commentary),
    isHealthRelated: AppState.isHealthRelated,
    assessedAt: AppState.assessedAt ? AppState.assessedAt.toISOString() : null,
    createdAt: AppState.createdAt ? AppState.createdAt.toISOString() : null,
    updatedAt: new Date().toISOString(),
    portfolio: AppState.portfolio,  // Smartsheet field
    lastSavedToSmartsheet: AppState.lastSavedToSmartsheet,  // Smartsheet tracking
    currentAssessmentNumber: AppState.currentAssessmentNumber,  // Assessment tracking
    lastSubmissionTimestamp: AppState.lastSubmissionTimestamp,  // Submission tracking
    lastSubmittedStateHash: AppState.lastSubmittedStateHash,  // Change detection
    smartsheetRowId: AppState.smartsheetRowId,  // Row ID for UPDATE operations
    isEditingExisting: AppState.isEditingExisting,  // Edit mode flag
    originalAssessment: AppState.originalAssessment,  // Original assessment snapshot
  };

  saveAssessments(AppState._savedVentures);
  saveActiveId(AppState.activeVentureId);
}

export function createNewVenture(name = "") {
  // Save current venture if it has any data
  if (AppState.activeVentureId && hasCurrentVentureData()) {
    saveCurrentVenture();
  }

  // Reset state for new venture
  AppState.activeVentureId = generateId();
  AppState.ventureName = name;
  AppState.scores = {};
  AppState.goalLevels = {};
  AppState.commentary = createEmptyCommentary();
  AppState.isHealthRelated = false;
  AppState.assessedAt = null;
  AppState.createdAt = new Date();
  AppState.currentCategory = null;

  // Initialize assessment tracking
  AppState.currentAssessmentNumber = 1;
  AppState.lastSubmissionTimestamp = null;
  AppState.lastSubmittedStateHash = null;

  // Initialize edit mode tracking
  AppState.smartsheetRowId = null;
  AppState.isEditingExisting = false;
  AppState.originalAssessment = null;

  saveCurrentVenture();
  return AppState.activeVentureId;
}

export function deleteVenture(id) {
  if (AppState._savedVentures[id]) {
    delete AppState._savedVentures[id];
    saveAssessments(AppState._savedVentures);

    // If we deleted the active venture, clear it
    if (AppState.activeVentureId === id) {
      AppState.activeVentureId = null;
      AppState.ventureName = "";
      AppState.scores = {};
      AppState.goalLevels = {};
      AppState.commentary = createEmptyCommentary();
      AppState.isHealthRelated = false;
      AppState.assessedAt = null;
      AppState.createdAt = null;
      AppState.portfolio = "";
      AppState.ventureId = null;
      AppState.lastSavedToSmartsheet = null;
      AppState.currentAssessmentNumber = 1;
      AppState.lastSubmissionTimestamp = null;
      AppState.lastSubmittedStateHash = null;
      AppState.smartsheetRowId = null;
      AppState.isEditingExisting = false;
      AppState.originalAssessment = null;
      saveActiveId(null);
    }
  }
}

export function getAllVentures() {
  return Object.values(AppState._savedVentures).sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0);
    const dateB = new Date(b.updatedAt || b.createdAt || 0);
    return dateB - dateA; // Most recent first
  });
}

// Auto-save on any score change
export function setScore(category, level) {
  AppState.scores[category] = level;
  if (!AppState.assessedAt) {
    AppState.assessedAt = new Date();
  }
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

export function setCommentary(commentary = {}) {
  AppState.commentary = normalizeCommentary(commentary);
  saveCurrentVenture();
}

export function clearCommentary() {
  AppState.commentary = createEmptyCommentary();
  saveCurrentVenture();
}

export function setGoalLevel(category, level) {
  AppState.goalLevels[category] = level;
  saveCurrentVenture();
}

// Reset the *in-memory* active venture to a blank assessment WITHOUT
// persisting an empty venture entry. Used at app boot so the tool opens in
// a "start a new venture" state on every refresh. Saved ventures remain in
// _savedVentures untouched and can be recalled via the venture-select
// dropdown or Load Assessment modal. A venture entry is only created in
// localStorage once the user enters a name or score (via saveCurrentVenture).
export function resetActiveVenture() {
  AppState.activeVentureId = null;
  AppState.ventureName = "";
  AppState.scores = {};
  AppState.goalLevels = {};
  AppState.commentary = createEmptyCommentary();
  AppState.isHealthRelated = false;
  AppState.assessedAt = null;
  AppState.createdAt = null;
  AppState.currentCategory = null;

  AppState.ventureId = null;
  AppState.portfolio = "";
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
