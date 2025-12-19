// ui.js - UI controls and panel management
import { AppState, saveCurrentVenture } from "./state.js";

/* -----------------------------
   Assessed timestamp (MM-DD-YYYY HH:MM)
------------------------------ */
export function renderAssessedAt() {
  const el = document.getElementById("assessed-at");
  if (!el) return;
  
  const d = AppState.assessedAt;
  if (!d) {
    el.textContent = "—";
    return;
  }
  
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  el.textContent = `${mm}-${dd}-${yy} ${hh}:${min}`;
}

export function stampAssessedNow() {
  AppState.assessedAt = new Date();
  renderAssessedAt();
  saveCurrentVenture();
}

/* -------------------------------------------------
   Summary panel state management
-------------------------------------------------- */
const PanelState = {
  MINIMIZED: "minimized",
  NORMAL: "normal",
  MAXIMIZED: "maximized"
};

let currentPanelState = PanelState.MINIMIZED;

function getPanelState() {
  const panel = document.getElementById("summary-panel");
  if (!panel) return PanelState.NORMAL;
  
  if (panel.classList.contains("maximized")) return PanelState.MAXIMIZED;
  if (panel.classList.contains("minimized")) return PanelState.MINIMIZED;
  return PanelState.NORMAL;
}

function setPanelState(state) {
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  if (!panel) return;

  // Remove all state classes
  panel.classList.remove("minimized", "maximized");
  overlay?.classList.remove("active");

  // Apply new state
  switch (state) {
    case PanelState.MINIMIZED:
      panel.classList.add("minimized");
      break;
    case PanelState.MAXIMIZED:
      panel.classList.add("maximized");
      overlay?.classList.add("active");
      break;
    case PanelState.NORMAL:
      // No additional classes needed
      break;
  }

  currentPanelState = state;
  syncPanelUI();
}

function syncPanelUI() {
  const panel = document.getElementById("summary-panel");
  if (!panel) return;

  const state = getPanelState();
  
  // Update title based on state
  const h = panel.querySelector(".summary-header h3");
  if (h) {
    const done = Object.values(AppState.scores || {}).filter(Boolean).length;
    const healthEnabled = document.getElementById("health-related")?.checked;
    const total = healthEnabled ? 9 : 8;
    
    if (state === PanelState.MINIMIZED) {
      h.textContent = `Summary ${done}/${total}`;
    } else {
      h.textContent = `Assessment Summary (${done}/${total})`;
    }
  }

  // Update minimize button icons
  const minBtn = document.getElementById("minimize-btn");
  if (minBtn) {
    const iconMinimize = minBtn.querySelector(".icon-minimize");
    const iconRestore = minBtn.querySelector(".icon-restore");
    
    if (iconMinimize && iconRestore) {
      if (state === PanelState.MINIMIZED) {
        // Show restore icon when minimized
        iconMinimize.classList.add("hidden");
        iconRestore.classList.remove("hidden");
        minBtn.title = "Expand";
        minBtn.setAttribute("aria-label", "Expand panel");
      } else {
        // Show minimize icon when normal/maximized
        iconMinimize.classList.remove("hidden");
        iconRestore.classList.add("hidden");
        minBtn.title = "Minimize";
        minBtn.setAttribute("aria-label", "Minimize panel");
      }
    }
  }

  // Update maximize button icons
  const maxBtn = document.getElementById("maximize-btn");
  if (maxBtn) {
    const iconMaximize = maxBtn.querySelector(".icon-maximize");
    const iconRestoreMax = maxBtn.querySelector(".icon-restore-max");
    
    if (iconMaximize && iconRestoreMax) {
      if (state === PanelState.MAXIMIZED) {
        // Show restore icon when maximized
        iconMaximize.classList.add("hidden");
        iconRestoreMax.classList.remove("hidden");
        maxBtn.title = "Restore";
        maxBtn.setAttribute("aria-label", "Restore panel size");
      } else {
        // Show maximize icon when normal/minimized
        iconMaximize.classList.remove("hidden");
        iconRestoreMax.classList.add("hidden");
        maxBtn.title = "Full screen";
        maxBtn.setAttribute("aria-label", "Full screen panel");
      }
    }
  }
}

export function toggleMinimizeSummaryPanel() {
  const state = getPanelState();
  
  if (state === PanelState.MINIMIZED) {
    // Restore to normal
    setPanelState(PanelState.NORMAL);
  } else {
    // Minimize from normal or maximized
    setPanelState(PanelState.MINIMIZED);
  }
}

export function toggleMaximizeSummaryPanel() {
  const state = getPanelState();
  
  if (state === PanelState.MAXIMIZED) {
    // Restore to normal
    setPanelState(PanelState.NORMAL);
  } else {
    // Maximize from normal or minimized
    setPanelState(PanelState.MAXIMIZED);
  }
}

export function closeMaximizedPanel() {
  const state = getPanelState();
  if (state === PanelState.MAXIMIZED) {
    setPanelState(PanelState.NORMAL);
  }
}

// Allow clicking on minimized panel to expand
export function setupPanelClickToExpand() {
  const panel = document.getElementById("summary-panel");
  if (!panel) return;
  
  panel.addEventListener("click", (e) => {
    // Only handle clicks directly on the minimized panel (not on buttons)
    if (panel.classList.contains("minimized") && !e.target.closest("button")) {
      toggleMinimizeSummaryPanel();
    }
  });
}

/* Call after updateSummary() and once on init */
export function syncSummaryHeaderAndIcons() {
  syncPanelUI();
}

/* -----------------------------
   Health-mode industry selector
------------------------------ */
export function updateIndustrySelectorUI({ forceDefaultOnEnable = false } = {}) {
  const health = document.getElementById("health-related")?.checked;
  const isTechCategory = AppState.currentCategory === "Technology";
  const wrap = document.getElementById("industry-selector");
  const group = document.getElementById("health-track-optgroup");

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

/* -------------------------------------------------
   Welcome Modal
-------------------------------------------------- */
const WELCOME_DISMISSED_KEY = "nr-rl-welcome-dismissed";

export function checkShowWelcomeModal() {
  try {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      showWelcomeModal();
    }
  } catch (e) {
    // localStorage not available, show modal
    showWelcomeModal();
  }
}

export function showWelcomeModal() {
  const modal = document.getElementById("welcome-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

export function hideWelcomeModal() {
  const modal = document.getElementById("welcome-modal");
  const dontShow = document.getElementById("dont-show-welcome");
  
  if (dontShow?.checked) {
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  if (modal) {
    modal.classList.add("hidden");
  }
}

/* -------------------------------------------------
   Feedback Modal
-------------------------------------------------- */
export function showFeedbackModal() {
  const modal = document.getElementById("feedback-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

export function hideFeedbackModal() {
  const modal = document.getElementById("feedback-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

/* -------------------------------------------------
   Generic Modal Helpers
-------------------------------------------------- */
export function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("hidden");
  }
}

export function hideModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
  }
}

/* -------------------------------------------------
   Advisor Tip
-------------------------------------------------- */
const ADVISOR_TIP_DISMISSED_KEY = "nr-rl-advisor-tip-dismissed";

export function checkShowAdvisorTip() {
  const tip = document.getElementById("advisor-tip");
  if (!tip) return;
  
  try {
    const dismissed = localStorage.getItem(ADVISOR_TIP_DISMISSED_KEY);
    if (dismissed) {
      tip.classList.add("hidden");
    } else {
      tip.classList.remove("hidden");
    }
  } catch (e) {
    // localStorage not available, show tip
    tip.classList.remove("hidden");
  }
}

export function dismissAdvisorTip() {
  const tip = document.getElementById("advisor-tip");
  if (tip) {
    tip.classList.add("hidden");
    try {
      localStorage.setItem(ADVISOR_TIP_DISMISSED_KEY, "true");
    } catch (e) {
      // Ignore localStorage errors
    }
  }
}

/* -------------------------------------------------
   Pilot Banner
-------------------------------------------------- */
const BANNER_DISMISSED_KEY = "nr-rl-pilot-banner-dismissed";

export function checkHidePilotBanner() {
  try {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed) {
      const banner = document.getElementById("pilot-banner");
      if (banner) banner.style.display = "none";
    }
  } catch (e) {
    // Ignore
  }
}

export function dismissPilotBanner() {
  const banner = document.getElementById("pilot-banner");
  if (banner) {
    banner.style.display = "none";
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    } catch (e) {
      // Ignore
    }
  }
}
