// smartsheet.js - Smartsheet Integration for RL Assessment Tool
// Submits readiness level assessments to Smartsheet via Google Apps Script proxy
// Pattern adapted from Qualification Tool v02

import {
  AppState,
  saveCurrentVenture,
  getCurrentAssessmentNumber,
  recordSubmission,
  CATEGORY_NOTE_MAX
} from "./state.js";

// Category key -> RL sheet notes column (matched by title in Code.gs).
const NOTE_FIELDS = {
  IP: "Notes_IP",
  Technology: "Notes_Technology",
  Market: "Notes_Market",
  Product: "Notes_Product",
  Team: "Notes_Team",
  "Go-to-Market": "Notes_GTM",
  Business: "Notes_Business",
  Funding: "Notes_Funding",
  "Mission Impact": "Notes_MissionImpact",
  Regulatory: "Notes_Regulatory"
};
import { readinessData, BRL_FRAMEWORK_VERSION } from "./data/index.js";
import { RETIRED_CATEGORIES } from "./category-labels.js";
import {
  getSubmissionReadiness,
  isFirstAssessmentRound,
  normalizeCommentary
} from "./submission-requirements.js";
import { normalizeTrackAssignment } from "./qualification-matching.js";
import { hasSubLevel, formatScore, readScoreCell, coerceCategoryScore } from "./score-utils.js";
import { PROXY_URL } from "./proxy-client.js";
import { applicationPayload, readApplicationScores } from "./applications.js";
import { Auth } from "./auth.js";

/**
 * Attach the session token. The proxy rejects every data action without one.
 */
function withToken(data) {
  return { ...data, token: Auth.getToken() };
}

/**
 * True when the proxy refused the token; prompts the user to log in again.
 */
function checkUnauthorized(response) {
  if (response && response.error === "unauthorized") {
    Auth.handleUnauthorized();
    return true;
  }
  return false;
}

// Configuration
const MAX_STRING_LENGTH = 255;  // Max length for text fields
const MAX_RETRIES = 2;          // Number of retry attempts

// Submission state
let isSubmitting = false;

// A shared Venture ID (UCF-SENSORMESH-7K), as opposed to the random rlv_ IDs
// older assessments carry.
export function isSharedVentureId(id) {
  return !!id && !/^rlv_/i.test(String(id));
}

/**
 * Sanitize string input - trim and limit length
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitizeString(str, maxLength = MAX_STRING_LENGTH) {
  if (!str || typeof str !== "string") return "";
  return str.trim().substring(0, maxLength);
}

/**
 * Submit RL assessment to Smartsheet.
 * Inserts a new row, or updates the loaded row when editing a saved assessment.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function submitToSmartsheet() {
  if (isSubmitting) {
    return { success: false, message: "Submission already in progress" };
  }

  // Validation
  const validation = validateSubmission();
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  isSubmitting = true;

  try {
    const payload = buildPayload();

    // Determine action based on edit mode
    const isUpdate = AppState.isEditingExisting && AppState.smartsheetRowId;
    const action = isUpdate ? "smartsheet_rl_update" : "smartsheet_rl";

    const requestData = withToken({
      action: action,
      ...(isUpdate && { rowId: AppState.smartsheetRowId }),
      ...payload,
      // An edit keeps the original Assessment Date and stamps Last Edited.
      ...(isUpdate && { editStamp: true }),
      // A first save without a shared Venture ID gets one from the proxy
      // (the ID already used for that name, or a new one).
      ...(!isUpdate && !isSharedVentureId(AppState.ventureId) && { assignVentureId: true })
    });

    console.log(`[Smartsheet] ${isUpdate ? "Updating" : "Creating"} assessment:`, { ...requestData, token: "[redacted]" });

    // Try submission with retry logic
    const result = await submitWithRetry(requestData);

    if (result.success) {
      // Store rowId for future updates (if this was a new insert)
      if (result.rowId && !AppState.smartsheetRowId) {
        AppState.smartsheetRowId = result.rowId;
        AppState.isEditingExisting = true;
        console.log("[Smartsheet] Stored rowId for future updates:", result.rowId);
      }
      if (isSharedVentureId(result.ventureId)) {
        AppState.ventureId = result.ventureId;
        AppState.ventureKey = "id:" + String(result.ventureId).toUpperCase();
      }

      // Record submission
      const timestamp = new Date().toISOString();
      AppState.lastSavedToSmartsheet = timestamp;
      recordSubmission();  // Records timestamp and state hash for re-submission tracking
      saveCurrentVenture();

      // The venture list must show this save next time it opens.
      clearVentureDirectoryCache();

      const actionMsg = isUpdate ? "updated" : "saved";
      console.log(`[Smartsheet] Assessment ${actionMsg} successfully`);
      return { success: true, message: `Assessment ${actionMsg} to database` };
    }

    if (checkUnauthorized(result)) {
      return { success: false, message: "Your session expired. Log in again, then save to the database." };
    }

    return {
      success: false,
      message: result.error || "Submission failed",
      unconfirmed: !!result.unconfirmed
    };

  } catch (error) {
    console.error("[Smartsheet] Submission error:", error);
    return { success: false, message: error.message };
  } finally {
    isSubmitting = false;
  }
}

/**
 * Validate before submission
 * @returns {{valid: boolean, message?: string}}
 */
function validateSubmission() {
  if (!AppState.ventureName || !AppState.ventureName.trim()) {
    return { valid: false, message: "Please enter a venture name" };
  }

  if (!AppState.advisorName || !AppState.advisorName.trim()) {
    return { valid: false, message: "Please enter your name (Advisor Name)" };
  }

  if (!AppState.portfolio || !AppState.portfolio.trim()) {
    return { valid: false, message: "Please select a portfolio" };
  }

  // Every active category must be scored before any submission (Assessment #1 or later).
  const readiness = getSubmissionReadiness(AppState, readinessData);
  if (readiness.missingScores.length > 0) {
    return {
      valid: false,
      message: `Please score all active categories before saving (${readiness.missingScores.join(", ")} remaining)`
    };
  }

  // Assessment #1 also requires the first-call commentary captured in the review modal.
  if (readiness.missingCommentary.length > 0) {
    return {
      valid: false,
      message: `Please complete required call commentary (${readiness.missingCommentary.join(", ")} missing)`
    };
  }

  return { valid: true };
}

/**
 * Build payload for Smartsheet submission
 * Applies input sanitization to all string fields
 * @returns {Object} Payload object matching Smartsheet column structure
 */
function buildPayload() {
  const assessmentNumber = getCurrentAssessmentNumber();
  const assessmentDate = AppState.assessedAt
    ? AppState.assessedAt.toISOString()
    : new Date().toISOString();

  const commentary = normalizeCommentary(AppState.commentary);
  const institution = sanitizeString(AppState.institution, 120);
  const trackAssignment = normalizeTrackAssignment(AppState.trackAssignment);

  return {
    // Identity fields (sanitized)
    ventureId: AppState.ventureId,
    ventureName: sanitizeString(AppState.ventureName),
    advisorName: sanitizeString(AppState.advisorName),
    portfolio: sanitizeString(AppState.portfolio, 100),
    ...(institution && { institution }),
    ...(trackAssignment && { trackAssignment }),

    // Assessment metadata
    assessmentNumber: assessmentNumber,
    assessmentDate: assessmentDate,
    isHealthRelated: AppState.isHealthRelated,
    // BRL framework the scores were given under ("Framework Version" column).
    frameworkVersion: AppState.frameworkVersion || BRL_FRAMEWORK_VERSION,

    // Readiness Level scores (0 if not assessed, clamped to valid range)
    RL_IP: clampScore(AppState.scores["IP"]),
    RL_Technology: clampTechnologyScore(AppState.scores["Technology"]),
    RL_Market: clampScore(AppState.scores["Market"]),
    RL_Product: clampScore(AppState.scores["Product"]),
    RL_Team: clampScore(AppState.scores["Team"]),
    RL_GTM: clampScore(AppState.scores["Go-to-Market"]),
    RL_Business: clampScore(AppState.scores["Business"]),
    RL_Funding: clampScore(AppState.scores["Funding"]),
    // RL_MissionImpact is not sent while Mission Impact is retired: the proxy
    // skips absent fields, so an updated row keeps its existing MI cell.
    RL_Regulatory: AppState.isHealthRelated ? clampScore(AppState.scores["Regulatory"]) : null,

    // Dual-use: "Dual Use" plus the Government application scores. Always
    // sent; blank when off, so an edited row doesn't keep stale scores.
    ...applicationPayload(AppState),

    // Assessment #1 intake commentary — first-call only.
    // For Assessment #2+ the helper omits these fields entirely so the proxy
    // does not overwrite the Smartsheet cells written during Assessment #1.
    ...(isFirstAssessmentRound(AppState) && {
      Coachability: commentary.coachability,
      StartupInterest: commentary.startupInterest,
      CallNotes: commentary.callNotes
    }),

    // Per-category notes, every assessment. Always sent (blank clears the cell),
    // except for retired categories, whose cells are left as they are.
    ...Object.fromEntries(Object.entries(NOTE_FIELDS)
      .filter(([cat]) => !RETIRED_CATEGORIES.has(cat))
      .map(([cat, field]) => [field, sanitizeString(AppState.categoryNotes?.[cat], CATEGORY_NOTE_MAX)])),

    // Submission tracking
    submissionTimestamp: new Date().toISOString()
  };
}

/**
 * Clamp score to valid range (0-9)
 * @param {number} score - Input score
 * @returns {number} Score clamped to 0-9 range
 */
function clampScore(score) {
  if (score == null) return null;
  const num = parseInt(score, 10);
  if (isNaN(num)) return null;
  return Math.max(0, Math.min(9, num));
}

/**
 * TRL is the only category whose score may carry a sub-level letter (BARDA's
 * lettered activities on the therapeutics track). A sub-level is written to
 * Smartsheet verbatim as "3B"; everything else clamps to an integer exactly as
 * the other nine score columns do.
 * @param {number|string|null} score
 * @returns {number|string|null}
 */
function clampTechnologyScore(score) {
  if (hasSubLevel(score)) return formatScore(score);
  return clampScore(score);
}

/**
 * Submit with retry logic and exponential backoff
 * @param {Object} data - Request data
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function submitWithRetry(data, maxRetries = MAX_RETRIES) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s...
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`[Smartsheet] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }

    const result = await submitViaScript(data);

    if (result.success) {
      return result;
    }

    if (result.unconfirmed || result.error === "unauthorized") {
      return result;
    }
    lastError = result.error || "Unknown error";
    console.warn(`[Smartsheet] Attempt ${attempt + 1} failed:`, lastError);
  }

  return {
    success: false,
    error: `Failed after ${maxRetries + 1} attempts: ${lastError}`
  };
}

/**
 * Submit via script tag (JSONP pattern)
 * Falls back to image beacon on failure
 * @param {Object} data - Request data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function submitViaScript(data) {
  return new Promise((resolve) => {
    const timeoutMs = 5000;
    let completed = false;

    // Unique callback name
    const callbackName = "rlSmartsheetCallback_" + Date.now();

    // Encode data
    const encodedData = encodeURIComponent(JSON.stringify(data));
    const url = `${PROXY_URL}?data=${encodedData}&callback=${callbackName}`;

    // Global callback
    window[callbackName] = (response) => {
      if (completed) return;
      completed = true;
      cleanup();
      resolve(response || { success: true });
    };

    // Create script element
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous"; // no Google cookies, avoids the multi-account /u/1/ 404 (v06 fix, Nov 2026)

    const cleanup = () => {
      window[callbackName] = () => {};  // no-op for late JSONP responses
      setTimeout(() => delete window[callbackName], 30000);
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      console.log("[Smartsheet] Script failed, trying image beacon");
      // Attempt fallback, but do not mark the save confirmed without JSONP response.
      submitViaImage(data).then(() => {
        resolve({
          success: false,
          unconfirmed: true,
          error: "Database save could not be confirmed. Please retry from Save to Database."
        });
      });
    };

    // Timeout - try image beacon
    setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        console.log("[Smartsheet] Script timeout, trying image beacon");
        submitViaImage(data).then(() => {
          resolve({
            success: false,
            unconfirmed: true,
            error: "Database save could not be confirmed. Please retry from Save to Database."
          });
        });
      }
    }, timeoutMs);

    console.log("[Smartsheet] Submitting via script tag");
    document.body.appendChild(script);
  });
}

/**
 * Fire-and-forget image beacon fallback
 * @param {Object} data - Request data
 * @returns {Promise<{attempted: boolean, confirmed: boolean}>}
 */
function submitViaImage(data) {
  return new Promise((resolve) => {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    const url = `${PROXY_URL}?data=${encodedData}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      console.warn("[Smartsheet] Image beacon completed but response is unverified");
      resolve({ attempted: true, confirmed: false });
    };
    img.onerror = () => {
      console.warn("[Smartsheet] Image beacon attempted but response is unverified");
      resolve({ attempted: true, confirmed: false });
    };

    console.warn("[Smartsheet] Attempting unverified image beacon fallback");
    img.src = url;

    setTimeout(() => resolve({ attempted: true, confirmed: false }), 2000);
  });
}

/**
 * Check if currently submitting
 * @returns {boolean}
 */
export function isCurrentlySubmitting() {
  return isSubmitting;
}

// ============================================
// VENTURE DIRECTORY (advisor venture picker, v07)
// ============================================

/**
 * One JSONP GET to the proxy. Resolves with the response, or with
 * { success: false, error } on a script error or timeout (never rejects).
 */
function jsonpRequest(data, { timeoutMs = 15000, prefix = "rlProxyCallback_" } = {}) {
  return new Promise((resolve) => {
    let completed = false;
    const callbackName = prefix + Date.now() + "_" + Math.floor(Math.random() * 1e6);
    const url = `${PROXY_URL}?data=${encodeURIComponent(JSON.stringify(withToken(data)))}&callback=${callbackName}`;
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous"; // no Google cookies, avoids the multi-account /u/1/ 404 (v06 fix, Nov 2026)

    const cleanup = () => {
      window[callbackName] = () => {};  // no-op for late JSONP responses
      setTimeout(() => delete window[callbackName], 30000);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (response) => {
      if (completed) return;
      completed = true;
      cleanup();
      resolve(response);
    };

    window[callbackName] = (response) => finish(response || { success: false, error: "Empty response" });
    script.onerror = () => finish({ success: false, error: "Could not reach the NobleReach database." });
    setTimeout(() => finish({ success: false, error: "The NobleReach database took too long to answer." }), timeoutMs);
    document.body.appendChild(script);
  });
}

let directoryCache = null;
let directoryCacheTime = 0;
const DIRECTORY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Every venture from the RL and intake sheets, grouped by the proxy.
 * Each venture's assessments are processed like processRLAssessments (newest first).
 * @returns {Promise<{ ok: boolean, ventures: Array, error?: string, intakeError?: string }>}
 */
export async function fetchVentureDirectory({ force = false } = {}) {
  if (!force && directoryCache && Date.now() - directoryCacheTime < DIRECTORY_CACHE_TTL) {
    return { ok: true, ventures: directoryCache };
  }
  const response = await jsonpRequest({ action: "rl_directory" }, { prefix: "rlDirectoryCallback_" });
  if (!response || !response.success) {
    if (checkUnauthorized(response)) return { ok: false, ventures: [], error: "Your session expired. Log in again." };
    return { ok: false, ventures: [], error: (response && response.error) || "Could not load ventures." };
  }
  const ventures = (response.ventures || []).map(v => ({
    ...v,
    assessments: processRLAssessments(v.assessments || []).map(a => ({ ...a, ventureKey: v.key }))
  }));
  directoryCache = ventures;
  directoryCacheTime = Date.now();
  return { ok: true, ventures, intakeError: response.intakeError || null };
}

export function clearVentureDirectoryCache() {
  directoryCache = null;
  directoryCacheTime = 0;
}

/**
 * Mark a venture Active, Graduated, or Inactive (written to all its RL rows).
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function setVentureStatus(ventureKey, status) {
  const response = await jsonpRequest({ action: "rl_venture_status", ventureKey, status }, { prefix: "rlStatusCallback_" });
  if (response && response.success) {
    clearVentureDirectoryCache();
    return { success: true };
  }
  if (checkUnauthorized(response)) return { success: false, error: "Your session expired. Log in again." };
  return { success: false, error: (response && response.error) || "Could not update the status." };
}

// ============================================
// QUALIFICATION SHEET (Institution / Track Assignment fallback)
// ============================================

/**
 * Raw Qualification Tool records for Assessment #1 reporting metadata matching.
 * Keeps separate rows so the review modal can show ambiguous candidates.
 * @returns {Promise<Array<{name, ventureName, portfolio, advisorName, advisorNames, institution, trackAssignment, source, timestamp}>>}
 */
export async function fetchQualificationRecords() {
  const response = await jsonpRequest({ action: "smartsheet_list", limit: 500 }, { timeoutMs: 8000, prefix: "rlQualCallback_" });
  if (!response || !response.success || !response.assessments) {
    console.warn("[Smartsheet] Failed to fetch from Qual sheet:", response);
    checkUnauthorized(response);
    return [];
  }
  return response.assessments
    .filter(a => a.ventureName && typeof a.ventureName === "string" && a.ventureName.trim())
    .map(a => ({
      name: a.ventureName.trim(),
      ventureName: a.ventureName.trim(),
      portfolio: a.portfolio || "",
      advisorName: a.advisorName || "",
      advisorNames: a.advisorName ? [a.advisorName.trim().toLowerCase()] : [],
      institution: a.institution || "",
      trackAssignment: normalizeTrackAssignment(a.trackAssignment),
      source: "qual",
      timestamp: a.timestamp || ""
    }));
}

/**
 * Process raw assessments into a cleaner format
 * @param {Array} raw - Raw assessment data from Smartsheet
 * @returns {Array} Processed assessment objects
 */
function processRLAssessments(raw) {
  return raw
    .filter(a => a.ventureName && a.ventureName.trim())
    .map(a => processRLAssessment(a))
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = a.assessmentDate || "";
      const dateB = b.assessmentDate || "";
      return dateB.localeCompare(dateA);
    });
}

function processRLAssessment(a) {
  const assessment = {
    rowId: a.rowId,
    ventureId: a.ventureId || "",
    ventureName: a.ventureName.trim(),
    advisorName: a.advisorName || "",
    portfolio: a.portfolio || "",
    institution: a.institution || "",
    trackAssignment: normalizeTrackAssignment(a.trackAssignment),
    assessmentNumber: parseInt(a.assessmentNumber, 10) || 1,
    assessmentDate: a.assessmentDate || a.submissionTimestamp || "",
    submissionTimestamp: a.submissionTimestamp || "",
    lastEdited: a.lastEdited || "",
    isHealthRelated: a.isHealthRelated === true || a.isHealthRelated === "true",
    // Blank on rows saved before versioning; loadAssessmentIntoState treats
    // that as the April 2026 framework.
    frameworkVersion: a.frameworkVersion || "",
    scores: {
      IP: parseInt(a.RL_IP, 10) || 0,
      // TRL may carry a sub-level like "3B" on the therapeutics track; keep it.
      // TRL begins at 1, so a blank cell (which reads as 0) is unassessed.
      Technology: coerceCategoryScore("Technology", readScoreCell(a.RL_Technology, { allowSubLevel: true })),
      Market: parseInt(a.RL_Market, 10) || 0,
      Product: parseInt(a.RL_Product, 10) || 0,
      Team: parseInt(a.RL_Team, 10) || 0,
      "Go-to-Market": parseInt(a.RL_GTM, 10) || 0,
      Business: parseInt(a.RL_Business, 10) || 0,
      Funding: parseInt(a.RL_Funding, 10) || 0,
      "Mission Impact": parseInt(a.RL_MissionImpact, 10) || 0,
      Regulatory: parseInt(a.RL_Regulatory, 10) || 0
    },
    // Assessment #1 intake commentary (empty strings on rows that never had it set).
    Coachability: a.Coachability || "",
    StartupInterest: a.StartupInterest || "",
    CallNotes: a.CallNotes || "",
    commentary: {
      coachability: a.Coachability || "",
      startupInterest: a.StartupInterest || "",
      callNotes: a.CallNotes || ""
    },
    categoryNotes: Object.fromEntries(Object.entries(NOTE_FIELDS).map(([cat, field]) => [cat, a[field] || ""]))
  };
  // Dual-use: rows saved before it (or without the columns) load as non-dual-use.
  return { ...assessment, ...readApplicationScores(a, assessment.scores) };
}
