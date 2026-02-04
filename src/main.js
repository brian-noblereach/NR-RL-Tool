// main.js – app entry + wiring
import {
  AppState,
  loadVenture,
  saveCurrentVenture,
  createNewVenture,
  deleteVenture,
  getAllVentures,
  saveAdvisorPreference,
  loadAdvisorPreference,
  getCurrentAssessmentNumber,
  incrementAssessmentNumber,
  getSubmissionStatus,
  recordSubmission,
  generateVentureId
} from "./state.js";
import { readinessData } from "./data/index.js";
import { PORTFOLIOS } from "./data/constants.js";
import { submitToSmartsheet, isCurrentlySubmitting, fetchVentureData, getPortfolioForVenture, fetchUserAssessments, clearUserAssessmentsCache } from "./smartsheet.js";
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
  updateSubmissionStatusUI();
  updateStartNewAssessmentButton();
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
   Submission Status UI
--------------------------*/
function formatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function updateSubmissionStatusUI() {
  const statusEl = document.getElementById("submission-status");
  if (!statusEl) return;

  const status = getSubmissionStatus();
  const iconEl = statusEl.querySelector(".status-icon");
  const textEl = statusEl.querySelector(".status-text");

  statusEl.className = "submission-status";

  if (!status.submitted) {
    textEl.textContent = "Not submitted";
    iconEl.innerHTML = '<circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="2"/>';
  } else if (status.hasChanges) {
    statusEl.classList.add("modified");
    textEl.textContent = `Modified since ${formatTime(status.lastSubmitted)}`;
    iconEl.innerHTML = '<path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="2"/>';
  } else {
    statusEl.classList.add("submitted");
    textEl.textContent = `Submitted ${formatTime(status.lastSubmitted)}`;
    iconEl.innerHTML = '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none"/>';
  }

  updateStartNewAssessmentButton();
}

function updateStartNewAssessmentButton() {
  const btn = document.getElementById("btn-start-new-assessment");
  if (!btn) return;

  const status = getSubmissionStatus();

  if (status.submitted) {
    btn.disabled = false;
    btn.title = `Start Assessment #${AppState.currentAssessmentNumber + 1} after venture has progressed`;
  } else {
    btn.disabled = true;
    btn.title = "Submit current assessment before starting new one";
  }
}

/* -------------------------
   Start New Assessment
--------------------------*/
function showStartNewAssessmentModal() {
  const currentNum = AppState.currentAssessmentNumber;
  const nextNum = currentNum + 1;

  document.getElementById("current-num").textContent = currentNum;
  document.getElementById("current-num-2").textContent = currentNum;
  document.getElementById("next-num").textContent = nextNum;
  document.getElementById("next-num-2").textContent = nextNum;

  showModal("start-new-modal");
}

function handleStartNewAssessment() {
  incrementAssessmentNumber();

  // Clear scores for fresh assessment
  AppState.scores = {};
  AppState.goalLevels = {};
  AppState.assessedAt = null;
  AppState.currentCategory = Object.keys(readinessData)[0];

  saveCurrentVenture();
  syncUIFromState();
  initializeCategories();
  updateSummary();
  updateSubmissionStatusUI();

  hideModal("start-new-modal");
  showToast(`Started Assessment #${AppState.currentAssessmentNumber}`, "success");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -------------------------
   Load Assessment from Database
--------------------------*/
let pendingLoadAssessment = null;  // Store assessment to load after warning confirmation

async function showLoadAssessmentModal() {
  const advisorName = AppState.advisorName || loadAdvisorPreference();

  if (!advisorName || !advisorName.trim()) {
    showToast("Please enter your Advisor Name first", "error");
    document.getElementById("advisor-name")?.focus();
    return;
  }

  showModal("load-assessment-modal");
  renderLoadAssessmentLoading();

  // Fetch user's assessments
  const assessments = await fetchUserAssessments(advisorName);
  renderLoadAssessmentList(assessments);

  // Setup search filter
  setupLoadAssessmentSearch(assessments);
}

function renderLoadAssessmentLoading() {
  const listEl = document.getElementById("load-assessment-list");
  if (!listEl) return;

  listEl.innerHTML = `
    <div class="load-assessment-loading">
      <div class="spinner"></div>
      <p>Loading your assessments...</p>
    </div>
  `;
}

function renderLoadAssessmentList(assessments) {
  const listEl = document.getElementById("load-assessment-list");
  if (!listEl) return;

  if (!assessments || assessments.length === 0) {
    listEl.innerHTML = `
      <div class="load-assessment-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h4>No Assessments Found</h4>
        <p>You haven't submitted any assessments to the database yet.</p>
      </div>
    `;
    return;
  }

  const html = assessments.map(a => `
    <div class="load-assessment-card" data-row-id="${a.rowId}">
      <div class="load-assessment-card-header">
        <h4>${escapeHtml(a.ventureName)}</h4>
        ${a.portfolio ? `<span class="load-assessment-badge portfolio">${escapeHtml(a.portfolio)}</span>` : ""}
        ${a.isHealthRelated ? `<span class="load-assessment-badge health">Health</span>` : ""}
        ${a.assessmentNumber > 1 ? `<span class="load-assessment-badge assessment-num">#${a.assessmentNumber}</span>` : ""}
      </div>
      <div class="load-assessment-card-meta">
        <span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${formatAssessmentDate(a.assessmentDate)}
        </span>
      </div>
      <div class="load-assessment-card-scores">
        ${formatScoresCompact(a.scores, a.isHealthRelated)}
      </div>
    </div>
  `).join("");

  listEl.innerHTML = html;

  // Add click handlers
  listEl.querySelectorAll(".load-assessment-card").forEach(card => {
    card.addEventListener("click", () => {
      const rowId = card.dataset.rowId;
      const assessment = assessments.find(a => String(a.rowId) === String(rowId));
      if (assessment) {
        handleLoadAssessmentClick(assessment);
      }
    });
  });
}

function setupLoadAssessmentSearch(allAssessments) {
  const searchInput = document.getElementById("load-assessment-search");
  if (!searchInput) return;

  searchInput.value = "";
  let debounceTimer;

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const searchTerm = searchInput.value.toLowerCase().trim();

      const filtered = allAssessments.filter(a =>
        !searchTerm || a.ventureName.toLowerCase().includes(searchTerm)
      );

      renderLoadAssessmentList(filtered);
    }, 200);
  });
}

function handleLoadAssessmentClick(assessment) {
  // Check if there's current work that would be lost
  const hasCurrentWork = Object.keys(AppState.scores || {}).length > 0;

  if (hasCurrentWork) {
    // Show warning modal
    pendingLoadAssessment = assessment;
    document.getElementById("replace-current-venture").textContent =
      AppState.ventureName || "Unnamed Assessment";
    hideModal("load-assessment-modal");
    showModal("replace-warning-modal");
  } else {
    // Load directly
    loadAssessmentIntoState(assessment);
    hideModal("load-assessment-modal");
  }
}

function confirmLoadAssessment() {
  if (pendingLoadAssessment) {
    loadAssessmentIntoState(pendingLoadAssessment);
    pendingLoadAssessment = null;
  }
  hideModal("replace-warning-modal");
}

function loadAssessmentIntoState(assessment) {
  // Create a new local venture entry for this loaded assessment
  AppState.activeVentureId = generateId();
  AppState.ventureName = assessment.ventureName;
  AppState.scores = { ...assessment.scores };
  AppState.goalLevels = {};
  AppState.isHealthRelated = assessment.isHealthRelated;
  AppState.assessedAt = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
  AppState.createdAt = new Date();
  AppState.currentCategory = "IP";

  // Smartsheet integration fields
  AppState.ventureId = assessment.ventureId || generateVentureId();
  AppState.portfolio = assessment.portfolio || "";

  // Edit mode tracking - this is key for UPDATE operations
  AppState.smartsheetRowId = assessment.rowId;
  AppState.isEditingExisting = true;
  AppState.originalAssessment = { ...assessment };

  // Assessment tracking
  AppState.currentAssessmentNumber = assessment.assessmentNumber || 1;
  AppState.lastSubmissionTimestamp = assessment.assessmentDate;
  AppState.lastSubmittedStateHash = null;  // Will be recalculated

  saveCurrentVenture();
  syncUIFromState();
  initializeCategories();
  updateSummary();
  syncSummaryHeaderAndIcons();
  updateSubmissionStatusUI();
  updateEditModeIndicator();

  showToast(`Loaded "${assessment.ventureName}" for editing`, "success");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateEditModeIndicator() {
  // Update UI to show we're in edit mode
  const saveBtn = document.getElementById("btn-save-db");
  if (saveBtn && AppState.isEditingExisting) {
    saveBtn.title = "Update existing assessment in database";
  } else if (saveBtn) {
    saveBtn.title = "Save to Database";
  }
}

// Helper functions for load assessment modal
function formatAssessmentDate(dateStr) {
  if (!dateStr) return "Unknown date";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return dateStr.split("T")[0];
  }
}

function formatScoresCompact(scores, isHealthRelated) {
  const cats = ["IP", "Technology", "Market", "Product", "Team", "Go-to-Market", "Business", "Funding"];
  if (isHealthRelated) cats.push("Regulatory");

  return cats.map(c => {
    const abbrev = c === "Go-to-Market" ? "GTM" : c === "Technology" ? "Tech" : c.substring(0, 3);
    return `${abbrev}:${scores[c] || 0}`;
  }).join(" ");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generate internal ID (copied from state.js for local use)
function generateId() {
  return "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
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
      hideModal("start-new-modal");
      hideModal("load-assessment-modal");
      hideModal("replace-warning-modal");
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

  // Start New Assessment
  document.getElementById("btn-start-new-assessment")?.addEventListener("click", showStartNewAssessmentModal);
  document.getElementById("start-new-confirm")?.addEventListener("click", handleStartNewAssessment);
  document.getElementById("start-new-cancel")?.addEventListener("click", () => hideModal("start-new-modal"));
  document.getElementById("start-new-close")?.addEventListener("click", () => hideModal("start-new-modal"));
  document.querySelector("#start-new-modal .modal-backdrop")?.addEventListener("click", () => hideModal("start-new-modal"));

  // Load Assessment Modal
  document.getElementById("btn-load-assessment")?.addEventListener("click", showLoadAssessmentModal);
  document.getElementById("load-assessment-modal-close")?.addEventListener("click", () => hideModal("load-assessment-modal"));
  document.querySelector("#load-assessment-modal .modal-backdrop")?.addEventListener("click", () => hideModal("load-assessment-modal"));

  // Replace Warning Modal
  document.getElementById("replace-warning-modal-close")?.addEventListener("click", () => hideModal("replace-warning-modal"));
  document.getElementById("replace-warning-cancel")?.addEventListener("click", () => hideModal("replace-warning-modal"));
  document.querySelector("#replace-warning-modal .modal-backdrop")?.addEventListener("click", () => hideModal("replace-warning-modal"));
  document.getElementById("replace-warning-confirm")?.addEventListener("click", confirmLoadAssessment);

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
      updateSubmissionStatusUI();  // Update status indicator
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

/* -------------------------
   Boot
--------------------------*/
function normalBoot() {
  populatePortfolioDropdown();
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
