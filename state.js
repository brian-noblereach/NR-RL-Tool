// state.js - Central app state with localStorage persistence and multi-venture support

const STORAGE_KEY = "nr-rl-assessments";
const ACTIVE_KEY = "nr-rl-active";

// Load saved assessments from localStorage
function loadAssessments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
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

// Generate unique ID for ventures
function generateId() {
  return "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
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
  isHealthRelated: false,
  assessedAt: null,
  createdAt: null,

  // All saved ventures
  _savedVentures: loadAssessments(),
};

// Initialize active venture from localStorage
const savedActiveId = loadActiveId();
if (savedActiveId && AppState._savedVentures[savedActiveId]) {
  loadVenture(savedActiveId);
}

// Export venture management functions
export function loadVenture(id) {
  const venture = AppState._savedVentures[id];
  if (!venture) return false;

  AppState.activeVentureId = id;
  AppState.ventureName = venture.ventureName || "";
  AppState.scores = { ...venture.scores } || {};
  AppState.goalLevels = { ...venture.goalLevels } || {};
  AppState.isHealthRelated = venture.isHealthRelated || false;
  AppState.assessedAt = venture.assessedAt ? new Date(venture.assessedAt) : null;
  AppState.createdAt = venture.createdAt ? new Date(venture.createdAt) : null;

  saveActiveId(id);
  return true;
}

export function saveCurrentVenture() {
  if (!AppState.activeVentureId) {
    // Create new venture
    AppState.activeVentureId = generateId();
    AppState.createdAt = new Date();
  }

  AppState._savedVentures[AppState.activeVentureId] = {
    id: AppState.activeVentureId,
    ventureName: AppState.ventureName,
    scores: { ...AppState.scores },
    goalLevels: { ...AppState.goalLevels },
    isHealthRelated: AppState.isHealthRelated,
    assessedAt: AppState.assessedAt ? AppState.assessedAt.toISOString() : null,
    createdAt: AppState.createdAt ? AppState.createdAt.toISOString() : null,
    updatedAt: new Date().toISOString(),
  };

  saveAssessments(AppState._savedVentures);
  saveActiveId(AppState.activeVentureId);
}

export function createNewVenture(name = "") {
  // Save current venture if it has any data
  if (AppState.activeVentureId && Object.keys(AppState.scores).length > 0) {
    saveCurrentVenture();
  }

  // Reset state for new venture
  AppState.activeVentureId = generateId();
  AppState.ventureName = name;
  AppState.scores = {};
  AppState.goalLevels = {};
  AppState.isHealthRelated = false;
  AppState.assessedAt = null;
  AppState.createdAt = new Date();
  AppState.currentCategory = null;

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
      AppState.isHealthRelated = false;
      AppState.assessedAt = null;
      AppState.createdAt = null;
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

export function exportVenture(id) {
  const venture = id ? AppState._savedVentures[id] : {
    ventureName: AppState.ventureName,
    scores: AppState.scores,
    goalLevels: AppState.goalLevels,
    isHealthRelated: AppState.isHealthRelated,
    assessedAt: AppState.assessedAt?.toISOString(),
    createdAt: AppState.createdAt?.toISOString(),
  };

  return JSON.stringify(venture, null, 2);
}

export function importVenture(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const id = generateId();

    AppState._savedVentures[id] = {
      id,
      ventureName: data.ventureName || "Imported Assessment",
      scores: data.scores || {},
      goalLevels: data.goalLevels || {},
      isHealthRelated: data.isHealthRelated || false,
      assessedAt: data.assessedAt || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveAssessments(AppState._savedVentures);
    return id;
  } catch (e) {
    console.error("Failed to import venture:", e);
    return null;
  }
}

// Auto-save on any score change
export function setScore(category, level) {
  AppState.scores[category] = level;
  if (!AppState.assessedAt) {
    AppState.assessedAt = new Date();
  }
  saveCurrentVenture();
}

export function setGoalLevel(category, level) {
  AppState.goalLevels[category] = level;
  saveCurrentVenture();
}
