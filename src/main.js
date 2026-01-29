// main.js – app entry + wiring
import {
  AppState,
  loadVenture,
  saveCurrentVenture,
  createNewVenture,
  deleteVenture,
  getAllVentures,
  exportVenture,
  importVenture,
  saveAdvisorPreference,
  loadAdvisorPreference
} from "./state.js";
import { readinessData } from "./data/index.js";
import { PORTFOLIOS } from "./data/constants.js";
import { submitToSmartsheet, isCurrentlySubmitting, fetchVentureData, getPortfolioForVenture } from "./smartsheet.js";
import { initializeCategories, updateCategoryDisplay } from "./categories.js";
import { updateSummary } from "./summary.js";
import {
  updateIndustrySelectorUI,
  toggleMinimizeSummaryPanel,
  toggleMaximizeSummaryPanel,
  closeMaximizedPanel,
  renderAssessedAt,
  stampAssessedNow,
  syncSummaryHeaderAndIcons,
  setupPanelClickToExpand,
  checkShowWelcomeModal,
  hideWelcomeModal,
  showFeedbackModal,
  hideFeedbackModal,
  showModal,
  hideModal,
  checkHidePilotBanner,
  dismissPilotBanner,
  checkShowAdvisorTip,
  dismissAdvisorTip,
} from "./ui.js";

/* -------------------------
   Helpers
--------------------------*/
const CATEGORY_ORDER = [
  "IP", "Technology", "Market", "Product", "Team", "Go-to-Market", "Business", "Funding", "Regulatory",
];

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

function formatLocalDateTime(d) {
  const yr = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yr}-${mo}-${da} ${hh}:${mm}`;
}

function categoriesToInclude() {
  const all = Object.keys(readinessData);
  return AppState.isHealthRelated ? all : all.filter(c => c !== "Regulatory");
}

function nextCategoryName(cur) {
  const allowed = categoriesToInclude();
  const seq = CATEGORY_ORDER.filter(c => allowed.includes(c));
  const idx = seq.indexOf(cur);
  return idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;
}

function navigateToCategory(cat) {
  if (!cat || AppState.currentCategory === cat) return;
  
  AppState.currentCategory = cat;
  initializeCategories();
  updateCategoryDisplay();
  updateSummary();
  syncSummaryHeaderAndIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Scroll helpers ---------- */
function getScrollParent(el) {
  const overflow = /auto|scroll/i;
  let p = el && el.parentElement;
  while (p && p !== document.body && p !== document.documentElement) {
    const s = getComputedStyle(p);
    if ((overflow.test(s.overflowY) || overflow.test(s.overflow)) && p.scrollHeight > p.clientHeight) {
      return p;
    }
    p = p.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function centerCardSmart(cardEl, retries = 3) {
  if (!cardEl) return;

  const container = getScrollParent(cardEl);
  const isDoc = container === document.scrollingElement || 
                container === document.documentElement || 
                container === document.body;

  const apply = () => {
    const rect = cardEl.getBoundingClientRect();
    if (isDoc) {
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const target = (window.pageYOffset || document.documentElement.scrollTop || 0) +
                     rect.top - (viewportH / 2 - rect.height / 2);
      window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    } else {
      const cRect = container.getBoundingClientRect();
      const delta = rect.top - cRect.top;
      const target = container.scrollTop + delta - (container.clientHeight / 2 - rect.height / 2);
      container.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    }
  };

  apply();
  if (retries > 0) {
    setTimeout(() => {
      apply();
      if (retries > 1) setTimeout(apply, 230);
    }, 120);
  }
}

/* ---------- Next Category Toast ---------- */
function ensureNextToastDom() {
  if (document.getElementById("next-cat-toast")) return;
  const toast = document.createElement("div");
  toast.id = "next-cat-toast";
  toast.className = "next-toast hidden";
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `
    <button id="next-cat-btn" class="btn next-btn">
      Next: <span id="next-cat-name">—</span> →
    </button>`;
  document.body.appendChild(toast);
}

function hideNextToast(immediate = false) {
  const toast = document.getElementById("next-cat-toast");
  if (!toast) return;

  if (immediate) {
    toast.classList.remove("show");
    toast.classList.add("hidden");
    return;
  }

  if (toast.classList.contains("hidden")) return;
  toast.classList.remove("show");
  const onEnd = (e) => {
    if (e.target !== toast) return;
    toast.classList.add("hidden");
    toast.removeEventListener("transitionend", onEnd);
  };
  toast.addEventListener("transitionend", onEnd);
}

function showNextToast(nextCat) {
  ensureNextToastDom();
  const toast = document.getElementById("next-cat-toast");
  const btn = document.getElementById("next-cat-btn");
  const name = document.getElementById("next-cat-name");
  name.textContent = nextCat;

  if (!toast.classList.contains("show")) {
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
  }

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("next-cat-btn").addEventListener("click", () => {
    hideNextToast();
    navigateToCategory(nextCat);
  }, { once: true });
}

/* -------------------------
   Venture Selector UI
--------------------------*/
function refreshVentureSelector() {
  const select = document.getElementById("venture-select");
  if (!select) return;

  const ventures = getAllVentures();
  select.innerHTML = `<option value="">Select or create new...</option>`;
  
  ventures.forEach(v => {
    const name = v.ventureName || "Unnamed Assessment";
    const date = v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : "";
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = `${name}${date ? ` (${date})` : ""}`;
    if (v.id === AppState.activeVentureId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function loadVentureFromSelector(id) {
  if (!id) return;
  
  if (loadVenture(id)) {
    syncUIFromState();
    initializeCategories();
    updateSummary();
    syncSummaryHeaderAndIcons();
  }
}

function syncUIFromState() {
  // Sync venture name input
  const nameInput = document.getElementById("venture-name");
  if (nameInput) {
    nameInput.value = AppState.ventureName || "";
  }

  // Sync health toggle
  const healthCheckbox = document.getElementById("health-related");
  if (healthCheckbox) {
    healthCheckbox.checked = AppState.isHealthRelated;
    const note = document.getElementById("health-mode-note");
    if (note) note.classList.toggle("hidden", !AppState.isHealthRelated);
  }

  // Sync advisor name from localStorage preference
  const advisorInput = document.getElementById("advisor-name");
  if (advisorInput) {
    const savedAdvisor = loadAdvisorPreference();
    advisorInput.value = AppState.advisorName || savedAdvisor;
    AppState.advisorName = advisorInput.value;
  }

  // Sync portfolio dropdown
  const portfolioSelect = document.getElementById("portfolio-select");
  if (portfolioSelect) {
    portfolioSelect.value = AppState.portfolio || "";
  }

  renderAssessedAt();
  refreshVentureSelector();
}

/* -------------------------
   PDF Export
--------------------------*/
function buildSnapshotRows() {
  const allowed = new Set(categoriesToInclude());
  const rows = [];
  CATEGORY_ORDER.forEach(cat => {
    if (!readinessData[cat] || !allowed.has(cat)) return;
    rows.push({ category: cat, level: AppState.scores[cat] || "-" });
  });
  return rows;
}

function savePdfSnapshot() {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    alert("PDF library failed to load. Please check your network and reload the page.");
    return;
  }
  if (!AppState.assessedAt) stampAssessedNow();

  const ventureName = (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const assessed = AppState.assessedAt ? formatLocalDateTime(AppState.assessedAt) : "—";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 16;
  let y = 20;
  const lh = 8;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NobleReach Readiness Level Assessment", left, y);
  y += lh + 2;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Venture: ${ventureName}`, left, y);
  y += lh;
  doc.text(`Assessed: ${assessed}`, left, y);
  y += lh + 2;

  // Table header
  doc.setFont("helvetica", "bold");
  doc.text("Category", left, y);
  doc.text("Level", left + 120, y);
  y += lh;
  doc.setLineWidth(0.2);
  doc.line(left, y - 6, left + 160, y - 6);
  doc.setFont("helvetica", "normal");

  buildSnapshotRows().forEach(r => {
    if (y > 280) {
      doc.addPage();
      y = 20;
      doc.setFont("helvetica", "bold");
      doc.text("Category", left, y);
      doc.text("Level", left + 120, y);
      y += lh;
      doc.line(left, y - 6, left + 160, y - 6);
      doc.setFont("helvetica", "normal");
    }
    doc.text(r.category, left, y);
    doc.text(String(r.level), left + 120, y);
    y += lh;
  });

  // Footer
  y += lh;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Generated by NobleReach Readiness Level Assessment Tool (Pilot v0.5)", left, y);

  const now = new Date();
  const fnameTs = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileSafeName = ventureName.replace(/[^\w\-]+/g, "_");
  doc.save(`${fileSafeName}_${fnameTs}.pdf`);
}

/* -------------------------
   JSON Export/Import
--------------------------*/
function exportCurrentVentureJson() {
  const json = exportVenture();
  const ventureName = AppState.ventureName || "assessment";
  const filename = `${ventureName.replace(/[^\w\-]+/g, "_")}_export.json`;
  
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImportVenture() {
  const input = document.getElementById("import-json-input");
  const json = input?.value?.trim();
  
  if (!json) {
    alert("Please paste a valid JSON export.");
    return;
  }

  const id = importVenture(json);
  if (id) {
    loadVenture(id);
    syncUIFromState();
    initializeCategories();
    updateSummary();
    syncSummaryHeaderAndIcons();
    hideModal("import-modal");
    input.value = "";
  } else {
    alert("Invalid JSON format. Please check your export file.");
  }
}

/* -------------------------
   App Initialization
--------------------------*/
function initializeApp() {
  // Check if we have an active venture
  if (!AppState.activeVentureId) {
    // Create a default venture if none exists
    const ventures = getAllVentures();
    if (ventures.length === 0) {
      createNewVenture("");
    } else {
      // Load the most recent one
      loadVenture(ventures[0].id);
    }
  }

  syncUIFromState();
  initializeCategories();
  updateSummary();
  syncSummaryHeaderAndIcons();
  setupPanelClickToExpand();
  
  // Check for welcome modal, pilot banner, and advisor tip state
  checkShowWelcomeModal();
  checkHidePilotBanner();
  checkShowAdvisorTip();
}

/* -------------------------
   Event Setup
--------------------------*/
function setupEventDelegation() {
  const catList = document.getElementById("category-list");
  if (catList) {
    catList.addEventListener("click", (e) => {
      const item = e.target.closest(".category-item");
      if (item) {
        hideNextToast(true);
      }
    }, { capture: true });

    catList.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest(".category-item")) {
        hideNextToast(true);
      }
    }, { capture: true });
  }

  // Level selection auto-scroll + next toast
  document.addEventListener("click", (e) => {
    const selectBtn = e.target.closest?.(".level-select-btn");
    if (!selectBtn) return;

    setTimeout(() => {
      const selectedCard = document.querySelector(".levels-container .level-card.selected") ||
                           selectBtn.closest(".level-card");
      centerCardSmart(selectedCard, 3);

      const nxt = AppState.currentCategory && nextCategoryName(AppState.currentCategory);
      if (nxt) showNextToast(nxt);
    }, 0);
  }, { capture: true });
}

function setupEventListeners() {
  // Health-related toggle
  const healthCheckbox = document.getElementById("health-related");
  if (healthCheckbox) {
    healthCheckbox.addEventListener("change", (e) => {
      AppState.isHealthRelated = e.target.checked;
      saveCurrentVenture();
      
      const note = document.getElementById("health-mode-note");
      if (note) note.classList.toggle("hidden", !AppState.isHealthRelated);
      
      updateIndustrySelectorUI({ forceDefaultOnEnable: true });
      initializeCategories();
      updateSummary();
      syncSummaryHeaderAndIcons();
    });
  }

  // View toggle
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const view = e.target.dataset.view;
      AppState.currentView = view;
      document.querySelectorAll(".view-btn").forEach(b => 
        b.classList.toggle("active", b.dataset.view === view)
      );
      if (AppState.currentCategory) updateCategoryDisplay();
    });
  });

  // Technology subtrack selector
  const industrySelect = document.getElementById("industry-select");
  if (industrySelect) {
    industrySelect.addEventListener("change", updateCategoryDisplay);
  }

  // Summary panel controls
  document.getElementById("minimize-btn")?.addEventListener("click", toggleMinimizeSummaryPanel);
  document.getElementById("maximize-btn")?.addEventListener("click", toggleMaximizeSummaryPanel);
  document.getElementById("panel-overlay")?.addEventListener("click", closeMaximizedPanel);
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMaximizedPanel();
      hideModal("welcome-modal");
      hideModal("feedback-modal");
      hideModal("new-venture-modal");
      hideModal("delete-modal");
      hideModal("import-modal");
    }
  });

  // Venture name binding with auto-save and portfolio auto-fill
  const nameInput = document.getElementById("venture-name");
  if (nameInput) {
    let previousValue = nameInput.value;

    nameInput.addEventListener("input", (e) => {
      AppState.ventureName = e.target.value;
      saveCurrentVenture();
      refreshVentureSelector();
    });

    // Check for portfolio auto-fill when user selects from datalist or finishes typing
    nameInput.addEventListener("change", (e) => {
      const newValue = e.target.value;
      if (newValue && newValue !== previousValue) {
        handleVentureNameChange(newValue);
        previousValue = newValue;
      }
    });
  }

  // Venture selector
  const ventureSelect = document.getElementById("venture-select");
  if (ventureSelect) {
    ventureSelect.addEventListener("change", (e) => {
      loadVentureFromSelector(e.target.value);
    });
  }

  // New venture button
  document.getElementById("btn-new-venture")?.addEventListener("click", () => {
    showModal("new-venture-modal");
    document.getElementById("new-venture-name")?.focus();
  });

  // Delete venture button
  document.getElementById("btn-delete-venture")?.addEventListener("click", () => {
    if (!AppState.activeVentureId) return;
    document.getElementById("delete-venture-name").textContent = 
      AppState.ventureName || "Unnamed Assessment";
    showModal("delete-modal");
  });

  // PDF export
  document.getElementById("btn-export-pdf")?.addEventListener("click", savePdfSnapshot);

  // JSON export/import
  document.getElementById("btn-export-json")?.addEventListener("click", exportCurrentVentureJson);
  document.getElementById("btn-import-json")?.addEventListener("click", () => {
    showModal("import-modal");
    document.getElementById("import-json-input")?.focus();
  });

  // Save to Database button
  document.getElementById("btn-save-db")?.addEventListener("click", handleSaveToDatabase);

  // Advisor name binding with localStorage persistence (debounced)
  const advisorInput = document.getElementById("advisor-name");
  if (advisorInput) {
    let advisorDebounceTimer;
    advisorInput.addEventListener("input", (e) => {
      AppState.advisorName = e.target.value;
      // Debounce localStorage write to reduce writes on every keystroke
      clearTimeout(advisorDebounceTimer);
      advisorDebounceTimer = setTimeout(() => {
        saveAdvisorPreference(e.target.value);
      }, 300);
    });
  }

  // Portfolio dropdown binding
  const portfolioSelect = document.getElementById("portfolio-select");
  if (portfolioSelect) {
    portfolioSelect.addEventListener("change", (e) => {
      AppState.portfolio = e.target.value;
      saveCurrentVenture();
    });
  }

  // Settings bar toggle
  document.getElementById("btn-toggle-settings")?.addEventListener("click", toggleSettingsBar);

  // Help button
  document.getElementById("btn-help")?.addEventListener("click", () => {
    showModal("welcome-modal");
  });

  // Pilot banner
  document.getElementById("close-pilot-banner")?.addEventListener("click", dismissPilotBanner);
  document.getElementById("open-feedback")?.addEventListener("click", showFeedbackModal);

  // Advisor tip dismiss
  document.getElementById("dismiss-advisor-tip")?.addEventListener("click", dismissAdvisorTip);

  // Welcome modal
  document.getElementById("welcome-modal-close")?.addEventListener("click", hideWelcomeModal);
  document.getElementById("welcome-get-started")?.addEventListener("click", hideWelcomeModal);
  document.querySelector("#welcome-modal .modal-backdrop")?.addEventListener("click", hideWelcomeModal);

  // Feedback modal
  document.getElementById("feedback-modal-close")?.addEventListener("click", hideFeedbackModal);
  document.querySelector("#feedback-modal .modal-backdrop")?.addEventListener("click", hideFeedbackModal);

  // New venture modal
  document.getElementById("new-venture-modal-close")?.addEventListener("click", () => hideModal("new-venture-modal"));
  document.getElementById("new-venture-cancel")?.addEventListener("click", () => hideModal("new-venture-modal"));
  document.querySelector("#new-venture-modal .modal-backdrop")?.addEventListener("click", () => hideModal("new-venture-modal"));
  document.getElementById("new-venture-create")?.addEventListener("click", () => {
    const name = document.getElementById("new-venture-name")?.value?.trim() || "";
    createNewVenture(name);
    // Reset to IP category for fresh start
    AppState.currentCategory = "IP";
    syncUIFromState();
    initializeCategories();
    updateSummary();
    syncSummaryHeaderAndIcons();
    hideModal("new-venture-modal");
    document.getElementById("new-venture-name").value = "";
    // Scroll to top for fresh assessment experience
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Delete modal
  document.getElementById("delete-modal-close")?.addEventListener("click", () => hideModal("delete-modal"));
  document.getElementById("delete-cancel")?.addEventListener("click", () => hideModal("delete-modal"));
  document.querySelector("#delete-modal .modal-backdrop")?.addEventListener("click", () => hideModal("delete-modal"));
  document.getElementById("delete-confirm")?.addEventListener("click", () => {
    const idToDelete = AppState.activeVentureId;
    deleteVenture(idToDelete);
    
    // Load another venture or create new
    const ventures = getAllVentures();
    if (ventures.length > 0) {
      loadVenture(ventures[0].id);
    } else {
      createNewVenture("");
    }
    
    syncUIFromState();
    initializeCategories();
    updateSummary();
    syncSummaryHeaderAndIcons();
    hideModal("delete-modal");
  });

  // Import modal
  document.getElementById("import-modal-close")?.addEventListener("click", () => hideModal("import-modal"));
  document.getElementById("import-cancel")?.addEventListener("click", () => hideModal("import-modal"));
  document.querySelector("#import-modal .modal-backdrop")?.addEventListener("click", () => hideModal("import-modal"));
  document.getElementById("import-confirm")?.addEventListener("click", handleImportVenture);
}

/* -------------------------
   Save to Database
--------------------------*/
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN = 5000; // 5 seconds between submissions

async function handleSaveToDatabase() {
  const btn = document.getElementById("btn-save-db");
  if (!btn || isCurrentlySubmitting()) return;

  // Rate limiting - prevent rapid submissions
  const now = Date.now();
  if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
    showToast("Please wait before saving again", "info");
    return;
  }
  lastSubmitTime = now;

  // Store original content
  const originalHTML = btn.innerHTML;

  // Update button state - show loading
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
    </svg>
    <span>Saving...</span>
  `;

  try {
    const result = await submitToSmartsheet();

    if (result.success) {
      showToast("Assessment saved to database", "success");
      // Show success state briefly
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Saved!</span>
      `;
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 2000);
    } else {
      showToast(result.message || "Failed to save", "error");
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  } catch (error) {
    showToast("Failed to save: " + error.message, "error");
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = "info") {
  // Create or reuse toast element
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `app-toast ${type}`;

  // Force reflow then add show class
  toast.offsetHeight;
  toast.classList.add("show");

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/**
 * Populate portfolio dropdown from PORTFOLIOS constant
 */
function populatePortfolioDropdown() {
  const select = document.getElementById("portfolio-select");
  if (!select) return;

  select.innerHTML = '<option value="">Select portfolio...</option>';
  PORTFOLIOS.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.value;
    opt.textContent = p.label;
    select.appendChild(opt);
  });
}

/**
 * Populate venture name autocomplete from both Smartsheets
 * Also stores portfolio data for auto-fill when a venture is selected
 */
async function populateVentureNameAutocomplete() {
  const datalist = document.getElementById("venture-names-list");
  if (!datalist) return;

  try {
    const ventures = await fetchVentureData();

    // Clear existing options
    datalist.innerHTML = "";

    // Add options for each unique venture (limited to most recent 50 for performance)
    // Users can still type any name - this just provides suggestions
    const limitedVentures = ventures.slice(0, 50);
    limitedVentures.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.name;
      // Add source hint in the label for context
      if (v.portfolio) {
        opt.label = `${v.name} (${v.portfolio})`;
      }
      datalist.appendChild(opt);
    });

    console.log(`[Autocomplete] Loaded ${ventures.length} ventures, showing top ${limitedVentures.length}`);
  } catch (error) {
    console.warn("[Autocomplete] Failed to load venture names:", error);
  }
}

/**
 * Handle venture name selection - auto-fill portfolio if available
 */
function handleVentureNameChange(ventureName) {
  if (!ventureName || !ventureName.trim()) return;

  // Look up portfolio from cached data
  const portfolio = getPortfolioForVenture(ventureName);

  if (portfolio) {
    // Only auto-fill if portfolio is currently empty
    const portfolioSelect = document.getElementById("portfolio-select");
    if (portfolioSelect && !AppState.portfolio) {
      AppState.portfolio = portfolio;
      portfolioSelect.value = portfolio;
      saveCurrentVenture();
      console.log(`[Autocomplete] Auto-filled portfolio: ${portfolio}`);

      // Show a brief hint that portfolio was auto-filled
      showToast(`Portfolio set to "${portfolio}"`, "info");
    }
  }
}

/**
 * Toggle settings bar visibility
 */
function toggleSettingsBar() {
  const settingsBar = document.getElementById("settings-bar");
  const toggleBtn = document.getElementById("btn-toggle-settings");

  if (!settingsBar || !toggleBtn) return;

  const isCollapsed = settingsBar.classList.contains("collapsed");
  settingsBar.classList.toggle("collapsed", !isCollapsed);
  toggleBtn.classList.toggle("active", isCollapsed);

  // Save preference
  try {
    localStorage.setItem("nr-rl-settings-expanded", isCollapsed ? "true" : "false");
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Restore settings bar state from localStorage
 */
function restoreSettingsBarState() {
  try {
    const expanded = localStorage.getItem("nr-rl-settings-expanded");
    if (expanded === "true") {
      const settingsBar = document.getElementById("settings-bar");
      const toggleBtn = document.getElementById("btn-toggle-settings");
      if (settingsBar) settingsBar.classList.remove("collapsed");
      if (toggleBtn) toggleBtn.classList.add("active");
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

/* -------------------------
   Boot
--------------------------*/
function normalBoot() {
  populatePortfolioDropdown();
  restoreSettingsBarState();
  initializeApp();
  setupEventDelegation();
  setupEventListeners();
  ensureNextToastDom();

  // Load venture name autocomplete in background (non-blocking)
  populateVentureNameAutocomplete();
}

document.addEventListener("DOMContentLoaded", () => {
  // Check for VDR mode (Associate Mode) via URL parameter
  const params = new URLSearchParams(window.location.search);
  if (params.get('vdr') === 'true') {
    // Import and initialize VDR mode
    import('./vdr/vdr-main.js').then(({ initializeVDR }) => {
      initializeVDR();
    }).catch(err => {
      console.error('[VDR] Failed to load VDR module:', err);
      // Fall back to normal mode
      normalBoot();
    });
    return;
  }
  
  // Normal boot
  normalBoot();
});
