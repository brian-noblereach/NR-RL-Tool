// main.js – app entry + wiring
import {
  AppState,
  loadVenture,
  saveCurrentVenture,
  saveAdvisorPreference,
  loadAdvisorPreference,
  getSubmissionStatus,
  generateStateHash,
  generateVentureId,
  setCommentaryField,
  setReportingMetadata,
  resetActiveVenture,
  hasCurrentVentureData,
  markScoresReviewed,
  isLegacyFramework,
  startAssessment,
  setDualUse,
  LEGACY_FRAMEWORK_VERSION
} from "./state.js";
import {
  APPLICATIONS,
  DUAL_USE_DEFINITION,
  DUAL_USE_ENABLED,
  PRIMARY_APPLICATION,
  isDualUseCategory,
  missingApplicationScores,
  normalizeApplicationScores,
} from "./applications.js";
import { readinessData, BRL_FRAMEWORK_VERSION } from "./data/index.js";
import { normalizeScores } from "./score-utils.js";
import {
  getSubmissionReadiness,
  isFirstAssessmentRound,
  normalizeCommentary
} from "./submission-requirements.js";
import {
  buildReviewChecklist,
  getReviewFlowConfig
} from "./review-flow.js";
import { savePdfSnapshot } from "./pdf-export.js";
import { getCategoryLabel, activeCategoryKeys } from "./category-labels.js";
import { startExternalFlow } from "./external-flow.js";
import { PORTFOLIOS } from "./data/constants.js";
import { BRL_LICENSE, SOURCE_ATTRIBUTIONS, FOOTER_NOTICE, ABOUT_FRAMEWORK } from "./data/index.js";
import { submitToSmartsheet, isCurrentlySubmitting, fetchQualificationRecords, isSharedVentureId } from "./smartsheet.js";
import { initVenturePicker, openVenturePicker, invalidateVenturePicker } from "./venture-picker.js";
import {
  getQualificationMatchResolution,
  normalizeTrackAssignment
} from "./qualification-matching.js";
import { initializeCategories, updateCategoryDisplay } from "./categories.js";
import { Auth } from "./auth.js";
import { PROXY_URL } from "./proxy-client.js";
import {
  updateIndustrySelectorUI,
  renderAssessedAt,
  stampAssessedNow,
  showModal,
  hideModal,
} from "./ui.js";

// Staff-only rollout of the November 2026 framework (Brian, Nov 18, 2026): the
// external password is sent to a frozen copy of v06 in external/, so external
// users keep the older definitions at the same link until the team agrees to
// switch them. Set to null to give external users this version (then delete external/).
const EXTERNAL_LEGACY_PATH = "external/";

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
  return activeCategoryKeys(Object.keys(readinessData), AppState.isHealthRelated);
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

/**
 * Populate the site footer and the attributions modal from
 * src/data/attributions.js. Rendered once at boot; the content is static, and
 * keeping one source means the modal and the PDF footer cannot drift apart.
 */
function renderAttributions() {
  const notice = document.getElementById("site-footer-notice");
  if (notice) notice.textContent = FOOTER_NOTICE;

  // Help modal summary — the visible surface for the source credits. Shown
  // to internal and external users alike.
  const about = document.getElementById("welcome-about");
  if (about) {
    about.innerHTML = `
      <h4>${escapeHtml(ABOUT_FRAMEWORK.heading)}</h4>
      ${ABOUT_FRAMEWORK.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      <p><button type="button" class="link-btn" id="welcome-attributions-link">${escapeHtml(ABOUT_FRAMEWORK.linkLabel)}</button></p>`;

    // Hand off from the help modal to the attributions modal rather than
    // stacking them.
    document.getElementById("welcome-attributions-link")?.addEventListener("click", () => {
      hideModal("welcome-modal");
      showModal("attributions-modal");
    });
  }

  const body = document.getElementById("attributions-body");
  if (!body) return;

  const licenseHtml = `
    <section class="attribution-block">
      <h4>Business Readiness Levels framework</h4>
      <p>${escapeHtml(BRL_LICENSE.summary)}</p>
      <ul>${BRL_LICENSE.terms.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      <p><a href="${BRL_LICENSE.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(BRL_LICENSE.name)}</a></p>
      <p class="attribution-scope">${escapeHtml(BRL_LICENSE.scopeNote)}</p>
    </section>`;

  const sourcesHtml = SOURCE_ATTRIBUTIONS.map(
    (source) => `
    <section class="attribution-block">
      <h4>${escapeHtml(source.heading)}</h4>
      ${source.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      <p><a href="${source.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.urlLabel)}</a></p>
    </section>`
  ).join("");

  body.innerHTML = licenseHtml + sourcesHtml;
}

// With an application, the toast stays on this category and switches the
// level cards to that application (dual-use: Commercial, then Government).
function showNextToast(nextCat, application = null) {
  ensureNextToastDom();
  const toast = document.getElementById("next-cat-toast");
  const btn = document.getElementById("next-cat-btn");
  const name = document.getElementById("next-cat-name");
  name.textContent = application ? `${getCategoryLabel(nextCat)} (${application})` : getCategoryLabel(nextCat);

  if (!toast.classList.contains("show")) {
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
  }

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("next-cat-btn").addEventListener("click", () => {
    hideNextToast();
    if (application) {
      AppState.currentApplication = application;
      updateCategoryDisplay();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigateToCategory(nextCat);
    }
  }, { once: true });
}

function syncUIFromState() {
  // Sync venture name input. For internal users the name comes from the
  // venture picker, so it can't drift from the other tools.
  const nameInput = document.getElementById("venture-name");
  if (nameInput) {
    nameInput.value = AppState.ventureName || "";
    nameInput.readOnly = !Auth.isExternal();
  }

  // Sync health toggle
  const healthCheckbox = document.getElementById("health-related");
  if (healthCheckbox) healthCheckbox.checked = AppState.isHealthRelated;
  const dualUseCheckbox = document.getElementById("dual-use");
  if (dualUseCheckbox) dualUseCheckbox.checked = !!AppState.isDualUse;

  // Sync advisor name from localStorage preference
  const advisorInput = document.getElementById("advisor-name");
  if (advisorInput) {
    const savedAdvisor = loadAdvisorPreference();
    advisorInput.value = AppState.advisorName || savedAdvisor;
    AppState.advisorName = advisorInput.value;
  }

  // Sync portfolio dropdown
  renderPortfolioOptions();

  renderAssessedAt();
  updateSubmissionStatusUI();
  renderWorkspaceHeader();
  renderFrameworkNotice();
}

// Scores given under an earlier BRL framework stay as recorded (they are never
// remapped). The notice asks the advisor to review them against the current
// definitions; "Mark reviewed" stamps the venture as current.
function renderFrameworkNotice() {
  const el = document.getElementById("framework-notice");
  if (!el) return;
  if (!isLegacyFramework()) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    <p><strong>Scored under the ${escapeHtml(AppState.frameworkVersion || LEGACY_FRAMEWORK_VERSION)} framework.</strong>
      The ${escapeHtml(BRL_FRAMEWORK_VERSION)} definitions changed IP, Team, Business, Funding, and TRL.
      Review these scores before saving; saved scores are kept as they are until you change them.</p>
    <button type="button" class="btn" id="framework-reviewed">Mark reviewed</button>`;
  document.getElementById("framework-reviewed").addEventListener("click", () => {
    markScoresReviewed();
    renderFrameworkNotice();
    updateSubmissionStatusUI();
  });
}

/* -------------------------
   PDF Export
   savePdfSnapshot lives in ./pdf-export.js so the external guided stepper can
   reuse the identical assessment PDF. Imported at the top of this file.
--------------------------*/

/* -------------------------
   Submission Status UI
--------------------------*/
function getSaveConsequenceLabel(status) {
  if (status.submitted && !status.hasChanges) {
    return AppState.isEditingExisting ? "Saved to database" : "Saved";
  }
  if (AppState.isEditingExisting && AppState.smartsheetRowId) {
    return status.hasChanges ? "Editing a saved assessment: changes not saved" : "Editing a saved assessment";
  }
  return "New assessment: not saved";
}

function getMetadataMissingLabels() {
  const missing = [];
  if (!String(AppState.ventureName || "").trim()) missing.push("Venture name");
  if (!String(AppState.advisorName || "").trim()) missing.push("Advisor name");
  if (!Auth.isExternal() && !String(AppState.portfolio || "").trim()) missing.push("Portfolio");
  return missing;
}

function setStep(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("done", state === "done");
  el.classList.toggle("current", state === "current");
}

// Compact internal header: venture, ID, assessment number, save state, and the
// three steps (venture, score, review & save). Details sit in a collapsed row.
function renderWorkspaceHeader() {
  const title = document.getElementById("workspace-venture-title");
  const idBadge = document.getElementById("workspace-venture-id");
  const assessmentBadge = document.getElementById("workspace-assessment-badge");
  const consequenceBadge = document.getElementById("workspace-save-consequence");
  if (!title || !assessmentBadge || !consequenceBadge) return;

  const status = getSubmissionStatus();
  const readiness = getSubmissionReadiness(AppState, readinessData);
  const metadataMissing = getMetadataMissingLabels();
  const chosen = !!String(AppState.ventureName || "").trim();
  const saved = status.submitted && !status.hasChanges;

  title.textContent = chosen ? AppState.ventureName.trim() : "Choose a venture";
  if (idBadge) {
    idBadge.hidden = !isSharedVentureId(AppState.ventureId);
    idBadge.textContent = AppState.ventureId || "";
    idBadge.title = "Venture ID, shared with the intake and other tools";
  }
  assessmentBadge.textContent = Auth.isExternal() ? "PDF draft" : `Assessment #${AppState.currentAssessmentNumber || 1}`;
  const healthBadge = document.getElementById("workspace-health-badge");
  if (healthBadge) healthBadge.hidden = !(chosen && AppState.isHealthRelated);
  const dualUseBadge = document.getElementById("workspace-dual-use-badge");
  if (dualUseBadge) dualUseBadge.hidden = !(chosen && AppState.isDualUse);
  consequenceBadge.textContent = Auth.isExternal() ? "Local PDF export" : getSaveConsequenceLabel(status);
  consequenceBadge.classList.toggle("success", saved);
  consequenceBadge.classList.toggle("warning", !saved);

  setStep("step-venture", chosen ? "done" : "current");
  setStep("step-score", !chosen ? "" : readiness.missingScores.length ? "current" : "done");
  setStep("step-save", !chosen || readiness.missingScores.length ? "" : saved ? "done" : "current");

  const summary = document.getElementById("workspace-details-summary");
  if (summary) {
    const parts = [AppState.advisorName, AppState.portfolio].map(s => String(s || "").trim()).filter(Boolean);
    const missing = metadataMissing.filter(m => m !== "Venture name");
    summary.textContent = missing.length ? `(${missing.join(", ")} needed)` : parts.length ? `· ${parts.join(" · ")}` : "";
    summary.classList.toggle("missing", missing.length > 0);
  }
  const details = document.getElementById("workspace-details");
  if (details && chosen && metadataMissing.some(m => m !== "Venture name")) details.open = true;

  const saveBtn = document.getElementById("btn-save-db");
  if (saveBtn) {
    saveBtn.classList.toggle("primary", !Auth.isExternal() && hasDatabaseRelevantChanges());
    saveBtn.title = !chosen
      ? "Choose a venture first"
      : AppState.isEditingExisting && AppState.smartsheetRowId
        ? "Review and save changes to this saved assessment"
        : "Review this assessment and save it to the NobleReach database";
  }
}

export function updateSubmissionStatusUI() {
  if (Auth.isExternal()) return;
  updateBeforeUnloadGuard();
  renderWorkspaceHeader();
}

function hasDatabaseRelevantChanges() {
  if (Auth.isExternal()) return false;
  // Don't nag about a blank fresh assessment — only flag "needs submit" once
  // the advisor has actually entered something worth submitting.
  if (!Object.values(AppState.scores || {}).some(s => s != null)) return false;
  const status = getSubmissionStatus();
  return !status.submitted || status.hasChanges;
}

let beforeUnloadAttached = false;

function handleBeforeUnload(e) {
  if (!hasDatabaseRelevantChanges()) return;
  e.preventDefault();
  e.returnValue = "";
}

function updateBeforeUnloadGuard() {
  const shouldAttach = hasDatabaseRelevantChanges();
  if (shouldAttach && !beforeUnloadAttached) {
    window.addEventListener("beforeunload", handleBeforeUnload);
    beforeUnloadAttached = true;
  } else if (!shouldAttach && beforeUnloadAttached) {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    beforeUnloadAttached = false;
  }
}

/* -------------------------
   Venture picker actions (step 1)
   Switching never discards work: the current draft stays in this browser and
   the picker offers it under "Unsaved work".
--------------------------*/
function noteKeptDraft() {
  if (hasDatabaseRelevantChanges()) {
    showToast(`Unsaved changes to "${AppState.ventureName || "this assessment"}" are kept in this browser. Resume them from Change venture.`, "info");
  }
}

function afterVentureSwitch(message) {
  syncUIFromState();
  initializeCategories();
  updateSubmissionStatusUI();
  if (message) showToast(message, "success");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Start a new assessment of a listed venture.
function startNewAssessmentFor(venture, assessmentNumber) {
  noteKeptDraft();
  const latest = venture.assessments[0] || {};
  startAssessment({
    ventureKey: venture.key,
    ventureId: venture.ventureId || latest.ventureId || "",
    ventureName: venture.ventureName,
    portfolio: venture.portfolio || latest.portfolio,
    institution: venture.institution || latest.institution,
    trackAssignment: latest.trackAssignment,
    isHealthRelated: latest.isHealthRelated,
    isDualUse: latest.isDualUse,
    assessmentNumber,
    locked: true,
  });
  AppState.currentCategory = "IP";
  afterVentureSwitch(`Started Assessment #${assessmentNumber} for ${venture.ventureName}`);
}

// A venture that isn't listed. The proxy gives it a shared Venture ID on the
// first save (reusing one if the name is already known).
function addVenture({ ventureName, institution, portfolio, isHealthRelated, isDualUse }) {
  noteKeptDraft();
  startAssessment({ ventureName, institution, portfolio, isHealthRelated, isDualUse, assessmentNumber: 1, locked: true });
  AppState.currentCategory = "IP";
  afterVentureSwitch(`Started Assessment #1 for ${ventureName}`);
}

function resumeDraft(id) {
  if (loadVenture(id)) afterVentureSwitch(`Resumed ${AppState.ventureName || "your draft"}`);
}

function editAssessment(assessment, venture) {
  noteKeptDraft();
  loadAssessmentIntoState(assessment, venture);
}

function loadAssessmentIntoState(assessment, venture = null) {
  // A new local draft for this saved assessment; everything not set below
  // (TRL track, notes of the previous venture, ...) starts clean.
  resetActiveVenture();
  AppState.activeVentureId = generateId();
  AppState.ventureName = assessment.ventureName;
  AppState.scores = normalizeScores(assessment.scores);
  AppState.frameworkVersion = assessment.frameworkVersion || LEGACY_FRAMEWORK_VERSION;
  AppState.isHealthRelated = assessment.isHealthRelated;
  AppState.isDualUse = DUAL_USE_ENABLED && assessment.isDualUse === true;
  AppState.applicationScores = normalizeApplicationScores(assessment.applicationScores);
  AppState.assessedAt = assessment.assessmentDate ? new Date(assessment.assessmentDate) : new Date();
  AppState.createdAt = new Date();
  AppState.currentCategory = "IP";

  // Commentary: round-trip from Smartsheet for Assessment #1 rows
  AppState.commentary = normalizeCommentary(assessment.commentary || {
    coachability: assessment.Coachability,
    startupInterest: assessment.StartupInterest,
    callNotes: assessment.CallNotes,
  });
  AppState.categoryNotes = { ...(assessment.categoryNotes || {}) };

  // Smartsheet integration fields
  AppState.ventureKey = venture ? venture.key : (assessment.ventureKey || null);
  AppState.ventureLocked = true;
  AppState.ventureId = (venture && venture.ventureId) || assessment.ventureId || generateVentureId();
  AppState.portfolio = assessment.portfolio || "";
  AppState.institution = assessment.institution || "";
  AppState.trackAssignment = normalizeTrackAssignment(assessment.trackAssignment);

  // Edit mode tracking - this is key for UPDATE operations
  AppState.smartsheetRowId = assessment.rowId;
  AppState.isEditingExisting = true;
  AppState.originalAssessment = { ...assessment };

  // Assessment tracking. The last save time is when the row was last written,
  // not the assessment date.
  AppState.currentAssessmentNumber = assessment.assessmentNumber || 1;
  AppState.lastSubmissionTimestamp = assessment.lastEdited || assessment.submissionTimestamp || assessment.assessmentDate;
  // Snapshot the just-loaded state so a freshly loaded row shows as clean
  // until the advisor changes a score or commentary field.
  AppState.lastSubmittedStateHash = generateStateHash();

  saveCurrentVenture();
  afterVentureSwitch(`Opened Assessment #${AppState.currentAssessmentNumber} of "${assessment.ventureName}" for editing`);
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
  // Always open in a fresh, blank state. Internal users then choose a venture
  // in the picker (which also offers unsaved drafts); refresh never silently
  // resurrects the last venture. resetActiveVenture clears AppState in memory
  // only; saved drafts remain in _savedVentures.
  resetActiveVenture();

  syncUIFromState();
  initializeCategories();
  
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

      // A dual-use category scored for Commercial asks for Government next.
      const cat = AppState.currentCategory;
      if (cat && AppState.isDualUse && isDualUseCategory(cat) &&
          (AppState.currentApplication || PRIMARY_APPLICATION) === PRIMARY_APPLICATION) {
        const unscored = APPLICATIONS.find((app) => missingApplicationScores(AppState, [cat], [app]).length);
        if (unscored) {
          showNextToast(cat, unscored);
          return;
        }
      }
      const nxt = cat && nextCategoryName(cat);
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

      // Deliberately does NOT auto-select a life-sciences track. The three
      // life-sciences tracks now render materially different level definitions,
      // so silently picking one would have a therapeutics venture reading
      // device content.
      updateIndustrySelectorUI();
      initializeCategories();
      updateSubmissionStatusUI();
    });
  }

  // Dual-use toggle. Off hides the Government scores without deleting them.
  // While the feature is switched off (DUAL_USE_ENABLED), its controls and Help line are hidden.
  if (!DUAL_USE_ENABLED) {
    document.querySelectorAll("[data-dual-use]").forEach((el) => { el.style.display = "none"; });
  }
  const dualUseHelp = document.getElementById("dual-use-help-text");
  if (dualUseHelp) {
    dualUseHelp.textContent = `${DUAL_USE_DEFINITION} Market, Product and Go-to-Market are then scored for each.`;
  }
  const dualUseCheckbox = document.getElementById("dual-use");
  if (dualUseCheckbox) {
    dualUseCheckbox.addEventListener("change", (e) => {
      setDualUse(e.target.checked);
      initializeCategories();
      updateSubmissionStatusUI();
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

  // TRL subtrack selector
  const industrySelect = document.getElementById("industry-select");
  if (industrySelect) {
    industrySelect.addEventListener("change", () => {
      AppState.technologyTrack = industrySelect.value;
      saveCurrentVenture();
      updateIndustrySelectorUI();
      updateCategoryDisplay();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideModal("welcome-modal");
      hideModal("venture-picker-modal");
      hideModal("submit-review-modal");
    }
  });

  // Venture name binding with auto-save and portfolio auto-fill
  const nameInput = document.getElementById("venture-name");
  if (nameInput) {

    // The external stepper types into this field; internal users set the name
    // through the venture picker (the field is read-only for them).
    nameInput.addEventListener("input", (e) => {
      AppState.ventureName = e.target.value;
      saveCurrentVenture();
      updateSubmissionStatusUI();
    });
  }

  // Step 1: the venture picker
  document.getElementById("btn-change-venture")?.addEventListener("click", openVenturePicker);

  // PDF export
  document.getElementById("btn-export-pdf")?.addEventListener("click", handlePdfExportRequest);

  // Save to Database button
  document.getElementById("btn-save-db")?.addEventListener("click", handleSaveToDatabase);

  // Submit-review modal (Assessment #1 commentary capture)
  document.getElementById("submit-review-close")?.addEventListener("click", () => hideModal("submit-review-modal"));
  document.getElementById("submit-review-cancel")?.addEventListener("click", () => hideModal("submit-review-modal"));
  document.querySelector("#submit-review-modal .modal-backdrop")?.addEventListener("click", () => hideModal("submit-review-modal"));
  document.getElementById("submit-review-confirm")?.addEventListener("click", submitAssessmentFromModal);

  document.getElementById("qualification-match-panel")?.addEventListener("change", (event) => {
    if (event.target?.name !== "qualification-match-choice") return;
    const value = event.target.value;
    qualificationMatchState.selectedIndex = value === "none" ? "none" : Number(value);
    renderSubmitReviewModal();
  });

  document.querySelectorAll('input[name="submit-review-coachability"]').forEach(input => {
    input.addEventListener("change", (e) => {
      setCommentaryField("coachability", e.target.value);
      renderSubmitReviewModal();
      updateSubmissionStatusUI();
    });
  });

  document.querySelectorAll('input[name="submit-review-startup-interest"]').forEach(input => {
    input.addEventListener("change", (e) => {
      setCommentaryField("startupInterest", e.target.value);
      renderSubmitReviewModal();
      updateSubmissionStatusUI();
    });
  });

  // Per-category notes box (built by external-flow.js) marks the save as changed.
  document.getElementById("category-notes")?.addEventListener("input", () => updateSubmissionStatusUI());

  document.getElementById("call-notes")?.addEventListener("input", (e) => {
    setCommentaryField("callNotes", e.target.value);
    renderSubmitReviewModal();
    updateSubmissionStatusUI();
  });

  // Advisor name binding with localStorage persistence (debounced)
  const advisorInput = document.getElementById("advisor-name");
  if (advisorInput) {
    let advisorDebounceTimer;
    advisorInput.addEventListener("input", (e) => {
      AppState.advisorName = e.target.value;
      renderWorkspaceHeader();
      clearTimeout(advisorDebounceTimer);
      advisorDebounceTimer = setTimeout(() => {
        saveAdvisorPreference(e.target.value);
        renderWorkspaceHeader();
      }, 300);
    });
  }

  // Portfolio dropdown binding
  const portfolioSelect = document.getElementById("portfolio-select");
  if (portfolioSelect) {
    portfolioSelect.addEventListener("change", (e) => {
      AppState.portfolio = e.target.value;
      saveCurrentVenture();
      updateSubmissionStatusUI();
    });
  }

  // Help modal (the ? button; it never opens on its own)
  const hideHelp = () => hideModal("welcome-modal");
  document.getElementById("btn-help")?.addEventListener("click", () => showModal("welcome-modal"));
  document.getElementById("welcome-modal-close")?.addEventListener("click", hideHelp);
  document.getElementById("welcome-get-started")?.addEventListener("click", hideHelp);
  document.querySelector("#welcome-modal .modal-backdrop")?.addEventListener("click", hideHelp);

  // Attributions & license modal
  renderAttributions();
  document.getElementById("open-attributions")?.addEventListener("click", () => showModal("attributions-modal"));
  document.getElementById("attributions-modal-close")?.addEventListener("click", () => hideModal("attributions-modal"));
  document.getElementById("attributions-done")?.addEventListener("click", () => hideModal("attributions-modal"));
  document.querySelector("#attributions-modal .modal-backdrop")?.addEventListener("click", () => hideModal("attributions-modal"));

}

/* -------------------------
   Save to Database
--------------------------*/
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN = 5000; // 5 seconds between submissions
let reviewFlowIsExternalPdf = false;

function createQualificationMatchState() {
  return {
    status: "idle",
    candidates: [],
    match: null,
    selectedIndex: null,
    error: "",
  };
}

let qualificationMatchState = createQualificationMatchState();

function resetQualificationMatchState() {
  qualificationMatchState = createQualificationMatchState();
}

function hasReportingMetadata() {
  return Boolean(String(AppState.institution || "").trim() || String(AppState.trackAssignment || "").trim());
}

function shouldRunQualificationMatching() {
  return !reviewFlowIsExternalPdf && isFirstAssessmentRound(AppState);
}

function qualificationMatchCanProceed() {
  if (!shouldRunQualificationMatching()) return true;
  if (hasReportingMetadata()) return true;

  return ["confident", "no-match", "error"].includes(qualificationMatchState.status) ||
    (qualificationMatchState.status === "ambiguous" && qualificationMatchState.selectedIndex !== null);
}

function handlePdfExportRequest() {
  if (Auth.isExternal()) {
    openSubmitReviewModal({ isExternalPdf: true });
    return;
  }

  savePdfSnapshot();
}

async function handleSaveToDatabase() {
  if (Auth.isExternal()) return;
  if (isCurrentlySubmitting()) return;

  // Step 1 comes first.
  if (!String(AppState.ventureName || "").trim()) {
    openVenturePicker();
    return;
  }

  // Every save goes through the review step. Assessment #1 also collects the
  // founder-call commentary there.
  openSubmitReviewModal({ isExternalPdf: false });
}

function currentReviewConfig() {
  return getReviewFlowConfig({
    isExternal: reviewFlowIsExternalPdf,
    ventureName: AppState.ventureName,
    isFirstAssessment: reviewFlowIsExternalPdf || isFirstAssessmentRound(AppState),
  });
}

function openSubmitReviewModal({ isExternalPdf = false } = {}) {
  reviewFlowIsExternalPdf = isExternalPdf;
  resetQualificationMatchState();
  renderSubmitReviewModal();
  showModal("submit-review-modal");

  if (shouldRunQualificationMatching()) {
    prepareQualificationMatch();
  }
}

async function prepareQualificationMatch() {
  if (hasReportingMetadata()) {
    qualificationMatchState = {
      status: "existing",
      candidates: [],
      match: {
        institution: AppState.institution,
        trackAssignment: normalizeTrackAssignment(AppState.trackAssignment),
      },
      selectedIndex: null,
      error: "",
    };
    renderSubmitReviewModal();
    return;
  }

  qualificationMatchState = {
    status: "loading",
    candidates: [],
    match: null,
    selectedIndex: null,
    error: "",
  };
  renderSubmitReviewModal();

  try {
    const records = await fetchQualificationRecords();
    const resolution = getQualificationMatchResolution({
      ventureName: AppState.ventureName,
      advisorName: AppState.advisorName,
      portfolio: AppState.portfolio,
    }, records);

    qualificationMatchState = {
      status: resolution.status,
      candidates: resolution.candidates || [],
      match: resolution.match || null,
      selectedIndex: resolution.status === "confident" ? 0 : null,
      error: "",
    };

    if (resolution.status === "confident" && resolution.match) {
      setReportingMetadata(resolution.match);
    }
  } catch (error) {
    console.warn("[Qualification Match] Failed to fetch Qualification records:", error);
    qualificationMatchState = {
      status: "error",
      candidates: [],
      match: null,
      selectedIndex: null,
      error: error.message || "Qualification lookup failed",
    };
  }

  renderSubmitReviewModal();
}

function formatQualificationMeta(match = {}) {
  const parts = [];
  if (match.institution) parts.push(match.institution);
  if (match.trackAssignment) parts.push(match.trackAssignment);
  return parts.length > 0 ? parts.join(", ") : "No institution or track provided";
}

function renderQualificationCandidateOption(candidate, index) {
  const checked = qualificationMatchState.selectedIndex === index ? "checked" : "";
  const meta = [
    candidate.portfolio,
    candidate.advisorName,
    candidate.institution,
    candidate.trackAssignment,
    candidate.timestamp ? formatAssessmentDate(candidate.timestamp) : "",
  ].filter(Boolean).join(" | ");

  return `
    <label class="qualification-match-option">
      <input type="radio" name="qualification-match-choice" value="${index}" ${checked}>
      <span>
        <span class="qualification-match-name">${escapeHtml(candidate.ventureName)}</span>
        <span class="qualification-match-meta">${escapeHtml(meta || "No metadata available")}</span>
      </span>
    </label>
  `;
}

function renderQualificationMatchPanel() {
  const panel = document.getElementById("qualification-match-panel");
  if (!panel) return;

  if (!shouldRunQualificationMatching()) {
    panel.className = "qualification-match-panel hidden";
    panel.innerHTML = "";
    return;
  }

  if (hasReportingMetadata()) {
    panel.className = "qualification-match-panel success";
    panel.innerHTML = `
      <h4>Qualification metadata attached</h4>
      <p>${escapeHtml(formatQualificationMeta({
        institution: AppState.institution,
        trackAssignment: AppState.trackAssignment,
      }))}</p>
    `;
    return;
  }

  if (qualificationMatchState.status === "loading") {
    panel.className = "qualification-match-panel loading";
    panel.innerHTML = `
      <h4>Looking for Qualification metadata</h4>
      <p>Checking finalized Qualification records by advisor and portfolio.</p>
    `;
    return;
  }

  if (qualificationMatchState.status === "confident" && qualificationMatchState.match) {
    panel.className = "qualification-match-panel success";
    panel.innerHTML = `
      <h4>Qualification metadata found</h4>
      <p>${escapeHtml(formatQualificationMeta(qualificationMatchState.match))}</p>
    `;
    return;
  }

  if (qualificationMatchState.status === "ambiguous") {
    const noneChecked = qualificationMatchState.selectedIndex === "none" ? "checked" : "";
    panel.className = "qualification-match-panel warning";
    panel.innerHTML = `
      <h4>Choose the matching Qualification record</h4>
      <p>Multiple records match this advisor or portfolio. Select one, or save without Qualification metadata.</p>
      <div class="qualification-match-options">
        ${qualificationMatchState.candidates.map(renderQualificationCandidateOption).join("")}
        <label class="qualification-match-option">
          <input type="radio" name="qualification-match-choice" value="none" ${noneChecked}>
          <span>
            <span class="qualification-match-name">Save without Qualification metadata</span>
            <span class="qualification-match-meta">Institution and Track Assignment will be blank in the RL sheet.</span>
          </span>
        </label>
      </div>
    `;
    return;
  }

  if (qualificationMatchState.status === "no-match") {
    panel.className = "qualification-match-panel warning";
    panel.innerHTML = `
      <h4>No Qualification match found</h4>
      <p>You can still save this RL assessment. Institution and Track Assignment will be blank in the RL sheet.</p>
    `;
    return;
  }

  if (qualificationMatchState.status === "error") {
    panel.className = "qualification-match-panel warning";
    panel.innerHTML = `
      <h4>Qualification lookup unavailable</h4>
      <p>You can still save this RL assessment. Institution and Track Assignment will be blank in the RL sheet.</p>
    `;
    return;
  }

  panel.className = "qualification-match-panel hidden";
  panel.innerHTML = "";
}

function renderSubmitReviewModal() {
  const title = document.getElementById("submit-review-modal-title");
  const intro = document.getElementById("submit-review-intro");
  const checklist = document.getElementById("submit-checklist");
  const confirmBtn = document.getElementById("submit-review-confirm");
  const footerNote = document.querySelector("#submit-review-modal .submit-review-note");
  const readiness = getSubmissionReadiness(AppState, readinessData);
  const metadataMissing = getMetadataMissingLabels();
  const config = currentReviewConfig();
  const canConfirm = config.canConfirm(readiness, metadataMissing) && qualificationMatchCanProceed();
  const commentaryFields = document.querySelector("#submit-review-modal .submit-commentary-fields");
  if (commentaryFields) commentaryFields.hidden = !config.showsCommentary;

  if (title) {
    title.textContent = config.title;
  }

  if (intro) intro.textContent = config.intro;
  if (footerNote) footerNote.textContent = config.footerNote;

  const items = buildReviewChecklist({ config, readiness, metadataMissing });

  if (checklist) {
    checklist.innerHTML = `
      <h4>${escapeHtml(config.checklistTitle)}</h4>
      <ul>
        ${items.map(item => `<li class="${item.complete ? "complete" : ""}">${escapeHtml(item.label)}</li>`).join("")}
      </ul>
    `;
  }

  renderQualificationMatchPanel();

  const commentary = AppState.commentary || {};
  document.querySelectorAll('input[name="submit-review-coachability"]').forEach(input => {
    input.checked = input.value === (commentary.coachability || "");
  });
  document.querySelectorAll('input[name="submit-review-startup-interest"]').forEach(input => {
    input.checked = input.value === (commentary.startupInterest || "");
  });
  const notes = document.getElementById("call-notes");
  if (notes && notes.value !== (commentary.callNotes || "")) {
    notes.value = commentary.callNotes || "";
  }

  document.querySelectorAll("#submit-review-modal .required").forEach(marker => {
    marker.textContent = config.requiresCommentary ? "*" : "(optional)";
    marker.classList.toggle("optional", !config.requiresCommentary);
  });

  if (confirmBtn) {
    confirmBtn.disabled = !canConfirm;
    confirmBtn.textContent = config.confirmLabel;
    confirmBtn.title = canConfirm
      ? config.confirmTitleReady
      : config.confirmTitleBlocked;
  }
}

function applyQualificationMatchSelection() {
  if (!shouldRunQualificationMatching()) return;
  if (hasReportingMetadata()) return;

  if (qualificationMatchState.status === "confident" && qualificationMatchState.match) {
    setReportingMetadata(qualificationMatchState.match);
    return;
  }

  if (qualificationMatchState.status === "ambiguous" && typeof qualificationMatchState.selectedIndex === "number") {
    const selected = qualificationMatchState.candidates[qualificationMatchState.selectedIndex];
    if (selected) setReportingMetadata(selected);
  }
}

async function submitAssessmentFromModal() {
  const readiness = getSubmissionReadiness(AppState, readinessData);
  const metadataMissing = getMetadataMissingLabels();
  const config = currentReviewConfig();
  if (!config.canConfirm(readiness, metadataMissing)) {
    renderSubmitReviewModal();
    return;
  }

  if (!qualificationMatchCanProceed()) {
    renderSubmitReviewModal();
    return;
  }

  applyQualificationMatchSelection();

  const modalBtn = document.getElementById("submit-review-confirm");
  const originalText = modalBtn ? modalBtn.textContent : null;
  if (modalBtn) {
    modalBtn.disabled = true;
    modalBtn.textContent = reviewFlowIsExternalPdf ? "Preparing PDF..." : "Submitting...";
  }

  if (reviewFlowIsExternalPdf) {
    savePdfSnapshot({ showPartialWarning: true, includeCommentary: true });
    hideModal("submit-review-modal");
    if (modalBtn) {
      modalBtn.textContent = originalText || config.confirmLabel;
      renderSubmitReviewModal();
    }
    return;
  }

  const result = await submitAssessmentDirect();

  if (result?.success) {
    hideModal("submit-review-modal");
    if (modalBtn) modalBtn.textContent = originalText || config.confirmLabel;
  } else if (modalBtn) {
    modalBtn.textContent = originalText || config.confirmLabel;
    renderSubmitReviewModal();
  }
}

async function submitAssessmentDirect() {
  const btn = document.getElementById("btn-save-db");
  if (!btn || isCurrentlySubmitting()) return { success: false };

  // Rate limiting applies only to the actual database write, not to opening
  // the review modal — so the advisor can re-open the modal freely.
  const now = Date.now();
  if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
    showToast("Please wait before saving again", "info");
    return { success: false };
  }
  lastSubmitTime = now;

  const originalHTML = btn.innerHTML;
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
      showToast("Saved to NobleReach database", "success");
      invalidateVenturePicker();
      updateSubmissionStatusUI();
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
      return { success: true };
    }

    showToast(result.unconfirmed ? "Database save could not be confirmed. Please retry." : (result.message || "Failed to save"), "error");
    updateSubmissionStatusUI();
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    return { success: false, message: result.message, unconfirmed: result.unconfirmed };
  } catch (error) {
    showToast("Failed to save: " + error.message, "error");
    updateSubmissionStatusUI();
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    return { success: false, message: error.message };
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
 * Populate portfolio dropdown from GAS proxy (single source of truth).
 * Falls back to local PORTFOLIOS constant if proxy is unavailable.
 */
// Served by the proxy ({ value, label, archived }); PORTFOLIOS is the fallback.
let portfolioList = PORTFOLIOS;

// Archived portfolios (programs that have ended) are not offered for new work,
// but an assessment that already carries one keeps it.
function renderPortfolioOptions() {
  const select = document.getElementById("portfolio-select");
  if (!select) return;
  const current = AppState.portfolio || "";
  const options = portfolioList.filter(p => !p.archived || p.value === current);
  if (current && !options.some(p => p.value === current)) options.push({ value: current, label: current });
  select.innerHTML = '<option value="">Select portfolio...</option>' + options
    .map(p => `<option value="${escapeHtml(p.value)}">${escapeHtml(p.label)}</option>`).join("");
  select.value = current;
}

async function populatePortfolioDropdown() {
  const select = document.getElementById("portfolio-select");
  if (!select) return;

  let portfolios = PORTFOLIOS; // fallback

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${PROXY_URL}?action=portfolios`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await resp.json();
    if (data.success && Array.isArray(data.portfolios)) {
      portfolios = data.portfolios;
    }
  } catch (e) {
    console.warn("[RL] Could not fetch portfolios from proxy, using local fallback:", e.message);
  }

  portfolioList = portfolios;
  renderPortfolioOptions();
}

/* -------------------------
   Boot
--------------------------*/

/**
 * Apply external mode restrictions.
 * Adds CSS class for hiding elements and renames internal labels.
 */
function applyExternalMode() {
  document.body.classList.add('external-mode');

  // Rename "Advisor Name" → "Your Name"
  const advisorLabel = document.querySelector('.advisor-name-field label[for="advisor-name"]');
  if (advisorLabel) {
    advisorLabel.innerHTML = 'Your Name <span class="required">*</span>';
  }

  const advisorInput = document.getElementById('advisor-name');
  if (advisorInput) {
    advisorInput.placeholder = 'Your name';
  }

  const pdfBtn = document.getElementById('btn-export-pdf');
  if (pdfBtn) {
    pdfBtn.textContent = 'Review & Save PDF';
    pdfBtn.title = 'Review the assessment, optionally add call commentary, and download a PDF';
  }

  console.log('[External Mode] Applied external mode restrictions');
}

function normalBoot() {
  const isExternal = Auth.isExternal();

  if (isExternal) {
    applyExternalMode();
  }

  initializeApp();
  setupEventDelegation();
  setupEventListeners();
  ensureNextToastDom();

  if (!isExternal) {
    // Internal advisors start at step 1, the venture picker.
    initVenturePicker({
      onEdit: editAssessment,
      onNew: startNewAssessmentFor,
      onAdd: addVenture,
      onResume: resumeDraft,
      getPortfolios: () => portfolioList,
      toast: showToast,
    });
    populatePortfolioDropdown().finally(() => openVenturePicker());
  } else {
    // External advisors get the guided stepper (Setup → Score → … → Download).
    startExternalFlow();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Boot function — mode determined after auth (Auth.role is set).
  // Runs once per page load. A later login (after the proxy reports an
  // expired session) only closes the overlay; if the role changed, reload so
  // the internal/external UI is rebuilt from scratch.
  let bootedRole = null;
  function boot() {
    // Staff-only rollout: the external password still gets the older framework.
    if (Auth.isExternal() && EXTERNAL_LEGACY_PATH) {
      const target = new URL(EXTERNAL_LEGACY_PATH, window.location.href);
      window.location.replace(target.origin + target.pathname + window.location.search + window.location.hash);
      return;
    }
    if (bootedRole) {
      if (Auth.role !== bootedRole) window.location.reload();
      return;
    }
    bootedRole = Auth.role;

    normalBoot();
  }

  // Auth gate
  Auth.initLoginForm(boot);

  const hasAccess = await Auth.checkAccess();
  if (hasAccess) {
    Auth.hideLoginOverlay();
    boot();
  } else {
    Auth.showLoginOverlay();
  }
});
