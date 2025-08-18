// ui.js - generic UI helpers (no rendering of levels here)
import { AppState } from "./state.js";

export function updateIndustrySelectorUI({ forceDefaultOnEnable = false } = {}) {
  const selectorWrap = document.getElementById("industry-selector");
  const selectEl = document.getElementById("industry-select");
  const healthOptgroup = document.getElementById("health-track-optgroup");

  const isTech = AppState.currentCategory === "Technology";
  selectorWrap.classList.toggle("hidden", !isTech);

  if (healthOptgroup) healthOptgroup.style.display = AppState.isHealthRelated ? "" : "none";

  if (!selectEl) return;

  const val = selectEl.value;
  const isHealthTrack = val === "health_device" || val === "health_pharma";

  if (AppState.isHealthRelated) {
    if (forceDefaultOnEnable || !isHealthTrack) selectEl.value = "health_device";
  } else {
    if (isHealthTrack) selectEl.value = "general";
  }
}

export function toggleLevel(card) {
  card.classList.toggle("expanded");
}

// Summary panel helpers
export function toggleMinimizeSummaryPanel() {
  const panel = document.getElementById("summary-panel");
  const minimizeBtn = document.getElementById("minimize-btn");
  const maximizeBtn = document.getElementById("maximize-btn");

  if (panel.classList.contains("minimized")) {
    panel.classList.remove("minimized");
    minimizeBtn.textContent = "-";
    maximizeBtn.style.display = "";
  } else {
    panel.classList.remove("maximized");
    panel.classList.add("minimized");
    minimizeBtn.textContent = "+";
    maximizeBtn.style.display = "none";
    closeOverlay();
  }
}

export function toggleMaximizeSummaryPanel() {
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  const minimizeBtn = document.getElementById("minimize-btn");

  if (panel.classList.contains("maximized")) {
    closeMaximizedPanel();
  } else {
    panel.classList.remove("minimized");
    panel.classList.add("maximized");
    overlay.classList.add("active");
    minimizeBtn.textContent = "x";
  }
}

export function closeMaximizedPanel() {
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  const minimizeBtn = document.getElementById("minimize-btn");

  if (panel.classList.contains("maximized")) {
    panel.classList.remove("maximized");
    overlay.classList.remove("active");
    minimizeBtn.textContent = "-";
  }
}

export function closeOverlay() {
  const overlay = document.getElementById("panel-overlay");
  overlay.classList.remove("active");
}

export function toggleSummaryPanel() {
  toggleMinimizeSummaryPanel();
}

/* =========================================================
   NEW: Assessed timestamp helpers for meta bar
   - stampAssessedNow(): set to current time and render
   - renderAssessedAt(): update the <time id="assessed-at"> text
   ========================================================= */

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function formatLocalDateTime(d) {
  // YYYY-MM-DD HH:mm (local)
  const yr = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yr}-${mo}-${da} ${hh}:${mm}`;
}

export function renderAssessedAt() {
  const el = document.getElementById("assessed-at");
  if (!el) return;
  el.textContent = AppState.assessedAt ? formatLocalDateTime(AppState.assessedAt) : "—";
}

export function stampAssessedNow() {
  AppState.assessedAt = new Date();
  renderAssessedAt();
}
