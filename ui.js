// ui.js
import { AppState } from "./state.js";

/* -----------------------------
   Assessed timestamp (MM-DD-YYYY)
------------------------------ */
export function renderAssessedAt() {
  const el = document.getElementById("assessed-at");
  if (!el) return;
  const d = AppState.assessedAt || new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  el.textContent = `${mm}-${dd}-${yy}`;
}

export function stampAssessedNow() {
  AppState.assessedAt = new Date();
  renderAssessedAt();
}

/* -------------------------------------------------
   Summary panel: title + icon state management with SVGs
-------------------------------------------------- */
function syncSummaryUI() {
  const panel = document.getElementById("summary-panel");
  if (!panel) return;

  const isMin = panel.classList.contains("minimized");
  const isMax = panel.classList.contains("maximized");

  // Update title based on state
  const h = panel.querySelector(".summary-header h3");
  if (h) {
    const done = Object.values(AppState.scores || {}).filter(Boolean).length;
    const total = document.getElementById("health-related")?.checked ? 9 : 8;
    h.textContent = isMin
      ? `Summary ${done}/${total}`
      : `Assessment Summary (${done}/${total})`;
  }

  // Update minimize button icons
  const minBtn = document.getElementById("minimize-btn");
  if (minBtn) {
    const iconMinimize = minBtn.querySelector(".icon-minimize");
    const iconRestore = minBtn.querySelector(".icon-restore");
    
    if (iconMinimize && iconRestore) {
      if (isMin) {
        // Show restore icon when minimized
        iconMinimize.classList.add("hidden");
        iconRestore.classList.remove("hidden");
        minBtn.title = "Restore";
        minBtn.setAttribute("aria-label", "Restore");
      } else {
        // Show minimize icon when normal/maximized
        iconMinimize.classList.remove("hidden");
        iconRestore.classList.add("hidden");
        minBtn.title = "Minimize";
        minBtn.setAttribute("aria-label", "Minimize");
      }
    }
  }

  // Update maximize button icons
  const maxBtn = document.getElementById("maximize-btn");
  if (maxBtn) {
    const iconMaximize = maxBtn.querySelector(".icon-maximize");
    const iconRestoreMax = maxBtn.querySelector(".icon-restore-max");
    
    if (iconMaximize && iconRestoreMax) {
      if (isMax) {
        // Show restore icon when maximized
        iconMaximize.classList.add("hidden");
        iconRestoreMax.classList.remove("hidden");
        maxBtn.title = "Restore";
        maxBtn.setAttribute("aria-label", "Restore");
      } else {
        // Show maximize icon when normal/minimized
        iconMaximize.classList.remove("hidden");
        iconRestoreMax.classList.add("hidden");
        maxBtn.title = "Maximize";
        maxBtn.setAttribute("aria-label", "Maximize");
      }
    }
  }
}

export function toggleMinimizeSummaryPanel() {
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  if (!panel) return;

  if (panel.classList.contains("minimized")) {
    // Restore from minimized to normal
    panel.classList.remove("minimized", "maximized");
    overlay?.classList.remove("active");
  } else {
    // Minimize from normal or maximized state
    panel.classList.remove("maximized");
    panel.classList.add("minimized");
    overlay?.classList.remove("active");
  }
  syncSummaryUI();
}

export function toggleMaximizeSummaryPanel() {
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  if (!panel) return;

  if (panel.classList.contains("maximized")) {
    // Restore from maximized to normal
    panel.classList.remove("maximized", "minimized");
    overlay?.classList.remove("active");
  } else {
    // Maximize from normal or minimized state
    panel.classList.remove("minimized");
    panel.classList.add("maximized");
    overlay?.classList.add("active");
  }
  syncSummaryUI();
}

export function closeMaximizedPanel() {
  const panel = document.getElementById("summary-panel");
  if (!panel) return;
  if (panel.classList.contains("maximized")) {
    panel.classList.remove("maximized");
    document.getElementById("panel-overlay")?.classList.remove("active");
    syncSummaryUI();
  }
}

/* Call after updateSummary() and once on init */
export function syncSummaryHeaderAndIcons() {
  syncSummaryUI();
}

/* -----------------------------
   Health-mode industry selector
------------------------------ */
export function updateIndustrySelectorUI({ forceDefaultOnEnable = false } = {}) {
  const health = document.getElementById("health-related")?.checked;
  const isTechCategory = AppState.currentCategory === "Technology";
  const wrap   = document.getElementById("industry-selector");
  const group  = document.getElementById("health-track-optgroup");

  // Only show selector if we're on Technology category
  if (wrap) {
    wrap.classList.toggle("hidden", !isTechCategory);
  }
  
  // Health tracks only available when health mode is on
  if (group) {
    group.disabled = !health;
  }

  if (forceDefaultOnEnable && health && isTechCategory) {
    const s = document.getElementById("industry-select");
    if (s) s.value = "health_device";
  }
}

/* -------------------------------------------------
   Compatibility helpers used by categories.js
-------------------------------------------------- */
export function toggleLevel(cardEl) {
  if (!cardEl) return;
  cardEl.classList.toggle("expanded");
}

export function closeOverlay() {
  document.getElementById("panel-overlay")?.classList.remove("active");
}