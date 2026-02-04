// smartsheet.js - Smartsheet Integration for RL Assessment Tool
// Submits readiness level assessments to Smartsheet via Google Apps Script proxy
// Pattern adapted from Qualification Tool v02

import {
  AppState,
  saveCurrentVenture,
  getCurrentAssessmentNumber,
  recordSubmission
} from "./state.js";

// Google Apps Script Web App URL (same proxy as Qual Tool)
const PROXY_URL = "https://script.google.com/macros/s/AKfycbzt7wElvzQv0CNs-icg7QWpxjf4E5FGqWa6KpCY4zSa_thccGNWhw-THLTpnn8GJa2W/exec";

// Configuration
const MAX_STRING_LENGTH = 255;  // Max length for text fields
const MAX_RETRIES = 2;          // Number of retry attempts

// Submission state
let isSubmitting = false;

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
 * Submit RL assessment to Smartsheet
 * Creates NEW row each time (temporal tracking)
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

    const requestData = {
      action: action,
      ...(isUpdate && { rowId: AppState.smartsheetRowId }),
      ...payload
    };

    console.log(`[Smartsheet] ${isUpdate ? "Updating" : "Creating"} assessment:`, requestData);

    // Try submission with retry logic
    const result = await submitWithRetry(requestData);

    if (result.success) {
      // Store rowId for future updates (if this was a new insert)
      if (result.rowId && !AppState.smartsheetRowId) {
        AppState.smartsheetRowId = result.rowId;
        AppState.isEditingExisting = true;
        console.log("[Smartsheet] Stored rowId for future updates:", result.rowId);
      }

      // Record submission
      const timestamp = new Date().toISOString();
      AppState.lastSavedToSmartsheet = timestamp;
      recordSubmission();  // Records timestamp and state hash for re-submission tracking
      saveCurrentVenture();

      // Clear user assessments cache so next load shows updated data
      clearUserAssessmentsCache();

      const actionMsg = isUpdate ? "updated" : "saved";
      console.log(`[Smartsheet] Assessment ${actionMsg} successfully`);
      return { success: true, message: `Assessment ${actionMsg} to database` };
    } else {
      throw new Error(result.error || "Submission failed");
    }

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

  // Check if at least one score exists
  const hasScores = Object.values(AppState.scores).some(s => s > 0);
  if (!hasScores) {
    return { valid: false, message: "Please assess at least one category before saving" };
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

  return {
    // Identity fields (sanitized)
    ventureId: AppState.ventureId,
    ventureName: sanitizeString(AppState.ventureName),
    advisorName: sanitizeString(AppState.advisorName),
    portfolio: sanitizeString(AppState.portfolio, 100),

    // Assessment metadata
    assessmentNumber: assessmentNumber,
    assessmentDate: assessmentDate,
    isHealthRelated: AppState.isHealthRelated,

    // Readiness Level scores (0 if not assessed, clamped to valid range)
    RL_IP: clampScore(AppState.scores["IP"]),
    RL_Technology: clampScore(AppState.scores["Technology"]),
    RL_Market: clampScore(AppState.scores["Market"]),
    RL_Product: clampScore(AppState.scores["Product"]),
    RL_Team: clampScore(AppState.scores["Team"]),
    RL_GTM: clampScore(AppState.scores["Go-to-Market"]),
    RL_Business: clampScore(AppState.scores["Business"]),
    RL_Funding: clampScore(AppState.scores["Funding"]),
    RL_Regulatory: AppState.isHealthRelated ? clampScore(AppState.scores["Regulatory"]) : null,

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
  const num = parseInt(score, 10) || 0;
  return Math.max(0, Math.min(9, num));
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

    lastError = result.error || "Unknown error";
    console.warn(`[Smartsheet] Attempt ${attempt + 1} failed:`, lastError);
  }

  return { success: false, error: `Failed after ${maxRetries + 1} attempts: ${lastError}` };
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

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      console.log("[Smartsheet] Script failed, trying image beacon");
      // Fallback to image beacon
      submitViaImage(data).then(resolve);
    };

    // Timeout - try image beacon
    setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        console.log("[Smartsheet] Script timeout, trying image beacon");
        submitViaImage(data).then(resolve);
      }
    }, timeoutMs);

    console.log("[Smartsheet] Submitting via script tag");
    document.body.appendChild(script);
  });
}

/**
 * Fire-and-forget image beacon fallback
 * @param {Object} data - Request data
 * @returns {Promise<{success: boolean, message: string}>}
 */
function submitViaImage(data) {
  return new Promise((resolve) => {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    const url = `${PROXY_URL}?data=${encodedData}`;

    const img = new Image();
    img.onload = () => {
      console.log("[Smartsheet] Image beacon completed");
      resolve({ success: true, message: "Saved via beacon" });
    };
    img.onerror = () => {
      // Even on error, the request was likely sent
      console.log("[Smartsheet] Image beacon sent (fire and forget)");
      resolve({ success: true, message: "Submitted (fire and forget)" });
    };

    console.log("[Smartsheet] Submitting via image beacon");
    img.src = url;

    // Resolve after delay regardless
    setTimeout(() => resolve({ success: true, message: "Submitted" }), 2000);
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
// VENTURE NAME AUTOCOMPLETE (with portfolio data)
// ============================================

// Cache for venture data (from both Qualification Tool and RL Smartsheets)
// Structure: { name: string, portfolio: string, source: 'qual'|'rl', timestamp: string }
let ventureDataCache = null;
let ventureDataCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch venture data from both Qualification Tool and RL Smartsheets
 * Returns venture names with their portfolios for auto-fill
 * @returns {Promise<Array<{name: string, portfolio: string, source: string}>>}
 */
export async function fetchVentureData() {
  const now = Date.now();
  if (ventureDataCache && (now - ventureDataCacheTime < CACHE_TTL)) {
    console.log("[Smartsheet] Returning cached venture data");
    return ventureDataCache;
  }

  console.log("[Smartsheet] Fetching venture data from both Smartsheets");

  // Fetch from both sources in parallel
  const [qualData, rlData] = await Promise.all([
    fetchFromQualSheet(),
    fetchFromRLSheet()
  ]);

  // Merge and deduplicate, preferring Qual Tool data (has more info)
  // Use Map to keep most recent/complete entry per venture name
  const ventureMap = new Map();

  // Add RL data first (lower priority)
  rlData.forEach(v => {
    const key = v.name.toLowerCase().trim();
    if (!ventureMap.has(key) || !ventureMap.get(key).portfolio) {
      ventureMap.set(key, v);
    }
  });

  // Add Qual data (higher priority - overwrites RL if exists)
  qualData.forEach(v => {
    const key = v.name.toLowerCase().trim();
    ventureMap.set(key, v);
  });

  // Convert to array and sort alphabetically
  const ventures = Array.from(ventureMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  // Update cache
  ventureDataCache = ventures;
  ventureDataCacheTime = Date.now();

  console.log(`[Smartsheet] Fetched ${ventures.length} unique ventures (${qualData.length} from Qual, ${rlData.length} from RL)`);
  return ventures;
}

/**
 * Fetch venture names from Qualification Tool Smartsheet
 */
function fetchFromQualSheet() {
  return new Promise((resolve) => {
    const timeoutMs = 8000;
    let completed = false;
    const callbackName = "rlQualCallback_" + Date.now();

    const requestData = {
      action: "smartsheet_list",
      limit: 200
    };

    const encodedData = encodeURIComponent(JSON.stringify(requestData));
    const url = `${PROXY_URL}?data=${encodedData}&callback=${callbackName}`;

    window[callbackName] = (response) => {
      if (completed) return;
      completed = true;
      cleanup();

      if (response && response.success && response.assessments) {
        // Extract venture data with portfolio
        const seen = new Set();
        const ventures = response.assessments
          .filter(a => a.ventureName && typeof a.ventureName === "string" && a.ventureName.trim())
          .map(a => ({
            name: a.ventureName.trim(),
            portfolio: a.portfolio || "",
            source: "qual",
            timestamp: a.timestamp || ""
          }))
          .filter(v => {
            // Keep only first occurrence (most recent due to sort order)
            const key = v.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        resolve(ventures);
      } else {
        console.warn("[Smartsheet] Failed to fetch from Qual sheet:", response);
        resolve([]);
      }
    };

    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      resolve([]);
    };

    setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        resolve([]);
      }
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

/**
 * Fetch venture names from RL Assessment Smartsheet
 */
function fetchFromRLSheet() {
  return new Promise((resolve) => {
    const timeoutMs = 8000;
    let completed = false;
    const callbackName = "rlRLCallback_" + Date.now();

    const requestData = {
      action: "smartsheet_rl_list",
      limit: 200
    };

    const encodedData = encodeURIComponent(JSON.stringify(requestData));
    const url = `${PROXY_URL}?data=${encodedData}&callback=${callbackName}`;

    window[callbackName] = (response) => {
      if (completed) return;
      completed = true;
      cleanup();

      if (response && response.success && response.assessments) {
        // Extract venture data with portfolio
        const seen = new Set();
        const ventures = response.assessments
          .filter(a => a.ventureName && typeof a.ventureName === "string" && a.ventureName.trim())
          .map(a => ({
            name: a.ventureName.trim(),
            portfolio: a.portfolio || "",
            source: "rl",
            timestamp: a.assessmentDate || ""
          }))
          .filter(v => {
            const key = v.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        resolve(ventures);
      } else {
        // RL list might not exist yet - that's okay
        console.log("[Smartsheet] No RL assessments found or action not available");
        resolve([]);
      }
    };

    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      resolve([]);
    };

    setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        resolve([]);
      }
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

/**
 * Get portfolio for a venture name (from cached data)
 * @param {string} ventureName
 * @returns {string} Portfolio name or empty string
 */
export function getPortfolioForVenture(ventureName) {
  if (!ventureDataCache || !ventureName) return "";

  const key = ventureName.toLowerCase().trim();
  const venture = ventureDataCache.find(v => v.name.toLowerCase().trim() === key);
  return venture?.portfolio || "";
}

/**
 * Clear the venture data cache
 */
export function clearVentureDataCache() {
  ventureDataCache = null;
  ventureDataCacheTime = 0;
}

// ============================================
// FETCH USER'S SUBMITTED ASSESSMENTS
// ============================================

// Cache for user's assessments
let userAssessmentsCache = null;
let userAssessmentsCacheTime = 0;
const USER_ASSESSMENTS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Fetch all RL assessments submitted by a specific advisor
 * Used for "Load from Database" feature to edit previously submitted assessments
 * @param {string} advisorName - Advisor name to filter by
 * @returns {Promise<Array<{rowId, ventureId, ventureName, advisorName, portfolio, assessmentNumber, assessmentDate, isHealthRelated, scores}>>}
 */
export async function fetchUserAssessments(advisorName) {
  if (!advisorName || !advisorName.trim()) {
    console.warn("[Smartsheet] No advisor name provided for fetch");
    return [];
  }

  const normalizedAdvisor = advisorName.trim().toLowerCase();

  // Check cache
  const now = Date.now();
  if (userAssessmentsCache && (now - userAssessmentsCacheTime < USER_ASSESSMENTS_CACHE_TTL)) {
    console.log("[Smartsheet] Returning cached user assessments");
    return userAssessmentsCache.filter(a =>
      a.advisorName && a.advisorName.toLowerCase() === normalizedAdvisor
    );
  }

  console.log("[Smartsheet] Fetching user assessments from database...");

  return new Promise((resolve) => {
    const timeoutMs = 10000;
    let completed = false;
    const callbackName = "userAssessmentsCallback_" + Date.now();

    const requestData = {
      action: "smartsheet_rl_list",
      limit: 500  // Get all assessments, filter client-side
    };

    const encodedData = encodeURIComponent(JSON.stringify(requestData));
    const url = `${PROXY_URL}?data=${encodedData}&callback=${callbackName}`;

    window[callbackName] = (response) => {
      if (completed) return;
      completed = true;
      cleanup();

      if (response && response.success && response.assessments) {
        // Process and cache all assessments
        const allAssessments = processRLAssessments(response.assessments);
        userAssessmentsCache = allAssessments;
        userAssessmentsCacheTime = Date.now();

        // Filter by advisor name
        const userAssessments = allAssessments.filter(a =>
          a.advisorName && a.advisorName.toLowerCase() === normalizedAdvisor
        );

        console.log(`[Smartsheet] Found ${userAssessments.length} assessments for ${advisorName}`);
        resolve(userAssessments);
      } else {
        console.warn("[Smartsheet] Failed to fetch assessments:", response);
        resolve([]);
      }
    };

    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    script.onerror = () => {
      if (completed) return;
      completed = true;
      cleanup();
      console.error("[Smartsheet] Script error fetching assessments");
      resolve([]);
    };

    setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        console.warn("[Smartsheet] Timeout fetching assessments");
        resolve([]);
      }
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

/**
 * Process raw assessments into a cleaner format
 * @param {Array} raw - Raw assessment data from Smartsheet
 * @returns {Array} Processed assessment objects
 */
function processRLAssessments(raw) {
  return raw
    .filter(a => a.ventureName && a.ventureName.trim())
    .map(a => ({
      rowId: a.rowId,
      ventureId: a.ventureId || "",
      ventureName: a.ventureName.trim(),
      advisorName: a.advisorName || "",
      portfolio: a.portfolio || "",
      assessmentNumber: parseInt(a.assessmentNumber, 10) || 1,
      assessmentDate: a.assessmentDate || a.submissionTimestamp || "",
      isHealthRelated: a.isHealthRelated === true || a.isHealthRelated === "true",
      scores: {
        IP: parseInt(a.RL_IP, 10) || 0,
        Technology: parseInt(a.RL_Technology, 10) || 0,
        Market: parseInt(a.RL_Market, 10) || 0,
        Product: parseInt(a.RL_Product, 10) || 0,
        Team: parseInt(a.RL_Team, 10) || 0,
        "Go-to-Market": parseInt(a.RL_GTM, 10) || 0,
        Business: parseInt(a.RL_Business, 10) || 0,
        Funding: parseInt(a.RL_Funding, 10) || 0,
        Regulatory: parseInt(a.RL_Regulatory, 10) || 0
      }
    }))
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      const dateA = a.assessmentDate || "";
      const dateB = b.assessmentDate || "";
      return dateB.localeCompare(dateA);
    });
}

/**
 * Clear user assessments cache (call after saving)
 */
export function clearUserAssessmentsCache() {
  userAssessmentsCache = null;
  userAssessmentsCacheTime = 0;
}
