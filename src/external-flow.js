// external-flow.js — guided stepper for external advisors.
//
// Sequences existing screens into one clean, Smartsheet-free workflow:
//   Setup → Score → (first only) Questions → Download → (first only) VDR Goals → VDR Generate
// Follow-up assessments run Setup → Score → Download (scores-only PDF, no VDR).
//
// It reuses, unchanged: the scoring view (#app-view), the shared PDF export,
// and the VDR renderers. Step/stage visibility is driven by a single
// `body[data-flow-step]` attribute that the CSS keys off of.

import { AppState, saveCurrentVenture, setCommentaryField, setCategoryNote, resetActiveVenture } from "./state.js";
import { readinessData } from "./data/index.js";
import {
  getSubmissionReadiness,
  isFirstAssessmentRound,
  normalizeCommentary,
  getActiveSubmissionCategories,
} from "./submission-requirements.js";
import { savePdfSnapshot } from "./pdf-export.js";
import { initializeCategories, updateCategoryDisplay } from "./categories.js";
import { updateSummary } from "./summary.js";
import { updateIndustrySelectorUI } from "./ui.js";
import { VDRState } from "./vdr/vdr-state.js";
import { renderGoalSetting } from "./vdr/goal-setting.js";
import { renderVDROutput } from "./vdr/vdr-generator.js";

// All score keys we hand to the VDR baseline. The VDR itself ignores
// Technology and Mission Impact by design (see vdr-state.js); extra keys are
// harmless.
const VDR_SCORE_KEYS = [
  "IP", "Technology", "Market", "Product", "Team",
  "Go-to-Market", "Business", "Funding", "Mission Impact", "Regulatory",
];

const STEP_LABELS = {
  setup: "Setup",
  score: "Score",
  questions: "Questions",
  download: "Download",
  "vdr-goals": "VDR · Goals",
  "vdr-generate": "VDR · Generate",
};

// Granular step → the DOM stage shown (the two VDR steps share one container).
const DOM_STEP = {
  setup: "setup",
  score: "score",
  questions: "questions",
  download: "download",
  "vdr-goals": "vdr",
  "vdr-generate": "vdr",
};

let isExternalFlowActive = false;
let currentStep = "setup";
let pdfDownloaded = false;

/* ---------- small helpers ---------- */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function isFirst() {
  return isFirstAssessmentRound(AppState);
}

function stepsForBranch() {
  return isFirst()
    ? ["setup", "score", "questions", "download", "vdr-goals", "vdr-generate"]
    : ["setup", "score", "download"];
}

// Mirror a stepper field into the canonical (hidden) input so the existing
// state handlers run and everything stays in sync.
function proxyInput(realId, value) {
  const real = document.getElementById(realId);
  if (!real) return;
  real.value = value;
  real.dispatchEvent(new Event("input", { bubbles: true }));
}

function proxyCheckbox(realId, checked) {
  const real = document.getElementById(realId);
  if (!real || real.checked === checked) return;
  real.checked = checked;
  real.dispatchEvent(new Event("change", { bubbles: true }));
}

function buildVdrBaselineFromState() {
  const scores = {};
  VDR_SCORE_KEYS.forEach((key) => {
    scores[key] = AppState.scores?.[key] ?? 0;
  });
  return {
    ventureId: AppState.ventureId || AppState.activeVentureId || "",
    ventureName: AppState.ventureName || "",
    advisorName: AppState.advisorName || "",
    portfolio: AppState.portfolio || "",
    assessmentNumber: AppState.currentAssessmentNumber || 1,
    assessmentDate: AppState.assessedAt
      ? new Date(AppState.assessedAt).toISOString()
      : new Date().toISOString(),
    isHealthRelated: !!AppState.isHealthRelated,
    scores,
  };
}

/* ---------- navigation + rail ---------- */

// Back always lives at the top of the step (the VDR screens already put their
// own Back at the top, so we hide ours there to avoid a duplicate).
function backTargetFor(step) {
  switch (step) {
    case "score": return "setup";
    case "questions": return "score";
    case "download": return isFirst() ? "questions" : "score";
    default: return null; // setup + both VDR steps
  }
}

function renderTopbar(backTarget) {
  const bar = document.getElementById("flow-topbar");
  if (!bar) return;
  if (!backTarget) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }
  bar.hidden = false;
  bar.innerHTML = `<button class="btn flow-btn-back" id="flow-topback">← Back</button>`;
  document.getElementById("flow-topback").addEventListener("click", () => goToStep(backTarget));
}

function goToStep(step) {
  currentStep = step;
  document.body.dataset.flowStep = DOM_STEP[step] || step;
  renderRail();
  renderTopbar(backTargetFor(step));

  switch (step) {
    case "setup": renderSetup(); break;
    case "score": enterScore(); break;
    case "questions": renderQuestions(); break;
    case "download": renderDownload(); break;
    case "vdr-goals": renderGoalSetting(document.getElementById("step-vdr")); break;
    case "vdr-generate": {
      const vdrEl = document.getElementById("step-vdr");
      renderVDROutput(vdrEl);
      appendVdrEndActions(vdrEl);
      break;
    }
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRail() {
  const rail = document.getElementById("external-rail");
  if (!rail) return;
  const steps = stepsForBranch();
  const curIdx = steps.indexOf(currentStep);
  rail.innerHTML =
    `<ol class="flow-rail-list">` +
    steps.map((s, i) => {
      const cls = i < curIdx ? "is-done" : (i === curIdx ? "is-current" : "is-todo");
      return `<li class="flow-rail-step ${cls}"><span class="flow-rail-num">${i + 1}</span>${escapeHtml(STEP_LABELS[s])}</li>`;
    }).join("") +
    `</ol>`;
}

/* ---------- Step: Setup ---------- */

function renderSetup() {
  const el = document.getElementById("step-setup");
  const first = isFirst();
  el.innerHTML = `
    <div class="flow-card">
      <h2>Set up the assessment</h2>
      <p class="flow-card-sub">Tell us about the venture and yourself. Nothing here is sent to NobleReach.</p>

      <div class="flow-field">
        <label for="flow-venture-name">Venture name <span class="required">*</span></label>
        <input type="text" id="flow-venture-name" placeholder="e.g. Acme Diagnostics" autocomplete="off" />
      </div>

      <div class="flow-field">
        <label for="flow-advisor-name">Your name <span class="required">*</span></label>
        <input type="text" id="flow-advisor-name" placeholder="Your name" autocomplete="off" />
      </div>

      <div class="flow-field">
        <label>Is this the venture's first BRL assessment?</label>
        <div class="flow-choice">
          <label class="flow-choice-card">
            <input type="radio" name="flow-round" value="first" ${first ? "checked" : ""}>
            <span class="flow-choice-text">
              <span class="flow-choice-title">First assessment</span>
              <span class="flow-choice-desc">Baseline scoring. Adds founder questions and the option to build a Venture Development Roadmap.</span>
            </span>
          </label>
          <label class="flow-choice-card">
            <input type="radio" name="flow-round" value="followup" ${first ? "" : "checked"}>
            <span class="flow-choice-text">
              <span class="flow-choice-title">Follow-up assessment</span>
              <span class="flow-choice-desc">A later check-in. Skips the founder questions and the roadmap — just scores and a PDF.</span>
            </span>
          </label>
        </div>
      </div>

      <div class="flow-field" id="flow-assessment-number-field" ${first ? "hidden" : ""}>
        <label for="flow-assessment-number">Which assessment number is this?</label>
        <input type="number" id="flow-assessment-number" min="2" step="1" value="${(AppState.currentAssessmentNumber > 1) ? AppState.currentAssessmentNumber : 2}">
        <p class="flow-field-help">Labels the PDF (e.g. “Assessment #2”).</p>
      </div>

      <div class="flow-field">
        <label class="flow-toggle">
          <input type="checkbox" id="flow-health" ${AppState.isHealthRelated ? "checked" : ""}>
          <span class="flow-choice-text">
            <span class="flow-choice-title">Life Sciences mode</span>
            <span class="flow-choice-desc">Uses patient/clinical language and adds the Regulatory category.</span>
          </span>
        </label>
      </div>

      <div class="flow-nav">
        <span class="flow-note warn" id="flow-setup-error"></span>
        <button class="btn accent" id="flow-setup-continue">Start scoring →</button>
      </div>
    </div>
  `;

  const vn = document.getElementById("flow-venture-name");
  const an = document.getElementById("flow-advisor-name");
  vn.value = AppState.ventureName || "";
  an.value = AppState.advisorName || "";

  vn.addEventListener("input", () => proxyInput("venture-name", vn.value));
  an.addEventListener("input", () => proxyInput("advisor-name", an.value));

  const numberField = document.getElementById("flow-assessment-number-field");
  const numberInput = document.getElementById("flow-assessment-number");

  el.querySelectorAll('input[name="flow-round"]').forEach((r) => {
    r.addEventListener("change", () => {
      const followup = r.value === "followup";
      numberField.hidden = !followup;
      if (followup) {
        AppState.currentAssessmentNumber = Math.max(2, parseInt(numberInput.value, 10) || 2);
      } else {
        AppState.currentAssessmentNumber = 1;
      }
      saveCurrentVenture();
      renderRail(); // branch (and therefore the rail) may change
    });
  });

  numberInput.addEventListener("input", () => {
    AppState.currentAssessmentNumber = Math.max(2, parseInt(numberInput.value, 10) || 2);
    saveCurrentVenture();
  });

  document.getElementById("flow-health").addEventListener("change", (e) => {
    proxyCheckbox("health-related", e.target.checked);
  });

  document.getElementById("flow-setup-continue").addEventListener("click", () => {
    const errEl = document.getElementById("flow-setup-error");
    const missing = [];
    if (!String(AppState.ventureName || "").trim()) missing.push("a venture name");
    if (!String(AppState.advisorName || "").trim()) missing.push("your name");
    if (missing.length) {
      errEl.textContent = `Please enter ${missing.join(" and ")} to continue.`;
      return;
    }
    goToStep("score");
  });
}

/* ---------- Step: Score (reuses #app-view) ---------- */

function enterScore() {
  // Auto-select the first active category so the advisor lands on level cards
  // instead of an empty "select a category" prompt.
  if (!AppState.currentCategory) {
    const active = getActiveSubmissionCategories(AppState, readinessData);
    AppState.currentCategory = active[0] || "IP";
    updateIndustrySelectorUI();
    initializeCategories();
    updateCategoryDisplay();
    updateSummary();
  }
  renderScoreNav();
  // Build/refresh the per-category notes box. Needed here because at boot
  // initializeApp() already set currentCategory (firing categoryDisplayUpdated
  // before our listener existed), so re-entering Score otherwise wouldn't build it.
  refreshCategoryNotes();
}

function renderScoreNav() {
  const nav = document.getElementById("score-nav");
  if (!nav) return;
  const readiness = getSubmissionReadiness(AppState, readinessData);
  const total = readiness.activeCategories.length;
  const remaining = readiness.missingScores.length;
  const done = remaining === 0;
  const hint = done
    ? `✓ All ${total} categories scored — ready to continue.`
    : `${total - remaining} of ${total} categories scored — you can continue any time.`;
  const nextLabel = isFirst() ? "Continue to questions →" : "Continue to download →";
  nav.innerHTML = `
    <span class="flow-note ${done ? "done" : ""}" id="flow-score-hint">${hint}</span>
    <button class="btn accent ${done ? "flow-pulse" : ""}" id="flow-score-continue">${nextLabel}</button>
  `;
  document.getElementById("flow-score-continue").addEventListener("click", () => {
    goToStep(isFirst() ? "questions" : "download");
  });
}

// Optional per-category note shown under the level cards on the Score step.
// Refreshed whenever the displayed category changes (via the categoryDisplayUpdated
// event from categories.js). Built once, then label + value are updated in place so
// re-renders for the same category (e.g. after picking a level) don't clobber typing.
function refreshCategoryNotes() {
  const host = document.getElementById("category-notes");
  if (!host) return;

  const cat = AppState.currentCategory;
  if (!cat) {
    host.innerHTML = "";
    host.dataset.built = "";
    host.dataset.cat = "";
    return;
  }

  if (!host.dataset.built) {
    host.innerHTML = `
      <label class="category-notes-label" for="category-note-input"></label>
      <textarea id="category-note-input" class="category-notes-input" rows="3"
        placeholder="Optional: why this level? Evidence, caveats, or context for this category. Included in the PDF."></textarea>
    `;
    host.dataset.built = "1";
    const input = host.querySelector("#category-note-input");
    input.addEventListener("input", () => setCategoryNote(AppState.currentCategory, input.value));
  }

  host.querySelector(".category-notes-label").textContent = `Notes for ${cat} (optional)`;
  if (host.dataset.cat !== cat) {
    host.querySelector("#category-note-input").value = AppState.categoryNotes?.[cat] || "";
    host.dataset.cat = cat;
  }
}

/* ---------- Step: Questions (first only) ---------- */

function renderQuestions() {
  const el = document.getElementById("step-questions");
  const c = normalizeCommentary(AppState.commentary);
  const radio = (name, val, cur) =>
    `<label><input type="radio" name="${name}" value="${val}" ${cur === val ? "checked" : ""}> ${val}</label>`;

  el.innerHTML = `
    <div class="flow-card">
      <h2>Founder conversation notes</h2>
      <p class="flow-card-sub">Optional — capture impressions from the conversation. These are included in your PDF.</p>
      <div class="submit-commentary-fields">
        <fieldset class="commentary-radio-group">
          <legend>Founder coachability</legend>
          ${radio("flow-coachability", "Yes", c.coachability)}
          ${radio("flow-coachability", "Maybe", c.coachability)}
          ${radio("flow-coachability", "No", c.coachability)}
        </fieldset>
        <fieldset class="commentary-radio-group">
          <legend>Interest in forming a startup</legend>
          ${radio("flow-startup-interest", "Yes", c.startupInterest)}
          ${radio("flow-startup-interest", "Maybe", c.startupInterest)}
          ${radio("flow-startup-interest", "No", c.startupInterest)}
        </fieldset>
        <div class="commentary-notes-field">
          <label for="flow-call-notes">Call notes, milestone ideas, and task ideas</label>
          <p class="help-text">Summarize the founder call and capture early ideas for program milestones or work assignments.</p>
          <textarea id="flow-call-notes" rows="7" placeholder="Examples: technical details learned; application areas; market/customer conclusions; advisor concerns; milestones the venture might realistically hit; tasks or follow-ups to assign."></textarea>
        </div>
      </div>
      <div class="flow-nav">
        <button class="btn accent" id="flow-q-continue">Continue →</button>
      </div>
    </div>
  `;

  const notes = document.getElementById("flow-call-notes");
  notes.value = c.callNotes || "";

  el.querySelectorAll('input[name="flow-coachability"]').forEach((i) =>
    i.addEventListener("change", () => setCommentaryField("coachability", i.value)));
  el.querySelectorAll('input[name="flow-startup-interest"]').forEach((i) =>
    i.addEventListener("change", () => setCommentaryField("startupInterest", i.value)));
  notes.addEventListener("input", () => setCommentaryField("callNotes", notes.value));

  document.getElementById("flow-q-continue").addEventListener("click", () => goToStep("download"));
}

/* ---------- Step: Download ---------- */

function downloadPdf() {
  savePdfSnapshot({ showPartialWarning: true, includeCommentary: isFirst() });
  pdfDownloaded = true;
}

function renderDownload() {
  const el = document.getElementById("step-download");
  const first = isFirst();
  const readiness = getSubmissionReadiness(AppState, readinessData);
  const active = getActiveSubmissionCategories(AppState, readinessData);
  const c = normalizeCommentary(AppState.commentary);

  const rows = active.map((cat) => {
    const s = AppState.scores?.[cat];
    return `<tr><td>${escapeHtml(cat)}</td><td>${s != null ? s : "—"}</td></tr>`;
  }).join("");

  const missing = readiness.missingScores.length;
  const partial = missing
    ? `<p class="flow-note warn">${missing} categor${missing === 1 ? "y is" : "ies are"} unscored (${escapeHtml(readiness.missingScores.join(", "))}). They will show as "—" in the PDF.</p>`
    : "";

  let answersHtml = "";
  if (first) {
    const items = [
      ["Founder coachability", c.coachability],
      ["Interest in forming a startup", c.startupInterest],
      ["Call notes, milestone ideas, and task ideas", c.callNotes],
    ].filter(([, v]) => v);
    answersHtml = `
      <h3>Founder notes</h3>
      ${items.length
        ? `<dl class="flow-review-answers">${items.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>`
        : `<p class="flow-note">No founder notes entered (optional).</p>`}
    `;
  }

  el.innerHTML = `
    <div class="flow-card">
      <h2>Review &amp; download</h2>
      <p class="flow-card-sub">Download a PDF of the assessment to keep for your records. Nothing is sent to NobleReach.</p>
      ${partial}
      <table class="flow-review-table">
        <thead><tr><th>Category</th><th>Level</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${answersHtml}
      <div class="flow-nav">
        ${first ? `<button class="btn" id="flow-go-vdr">Continue to develop a VDR →</button>` : ""}
        <button class="btn accent" id="flow-dl-download">Download PDF</button>
      </div>
      <div id="flow-after-download"></div>
    </div>
  `;

  document.getElementById("flow-dl-download").addEventListener("click", () => {
    downloadPdf();
    renderAfterDownload();
  });
  document.getElementById("flow-go-vdr")?.addEventListener("click", continueToVdr);

  if (pdfDownloaded) renderAfterDownload();
}

function renderAfterDownload() {
  const host = document.getElementById("flow-after-download");
  if (!host) return;
  host.innerHTML = `
    <div class="flow-success">
      <h3>PDF downloaded ✓</h3>
      <p>Save it somewhere safe — it isn't stored by NobleReach.${isFirst() ? " You can also continue to build a VDR with the button above." : ""}</p>
      <div class="flow-success-actions">
        <button class="btn flow-btn-back" id="flow-dl-again">Download again</button>
        <button class="btn flow-btn-back" id="flow-new-venture">Start a new venture assessment</button>
      </div>
    </div>
  `;
  document.getElementById("flow-dl-again")?.addEventListener("click", downloadPdf);
  document.getElementById("flow-new-venture")?.addEventListener("click", startNewVentureAssessment);
}

/* ---------- VDR hand-off (first only) ---------- */

function continueToVdr() {
  // Seed the VDR with the just-scored assessment, then land on goal-setting.
  // setBaseline initializes goals = baseline and is called only here, so
  // navigating Generate → Goals (via the VDR's own Back button) preserves the
  // advisor's chosen goals.
  VDRState.setBaseline(buildVdrBaselineFromState());
  goToStep("vdr-goals");
}

/* ---------- Start over (run another venture in the same session) ---------- */

function startNewVentureAssessment() {
  if (!window.confirm("Start a new venture assessment? This clears the current scores and notes from the tool. Your downloaded PDF and VDR are not affected.")) {
    return;
  }
  // Turn off Life Sciences via its handler so categories re-render cleanly,
  // then clear the in-memory venture (the advisor's name persists).
  proxyCheckbox("health-related", false);
  resetActiveVenture();
  const realName = document.getElementById("venture-name");
  if (realName) realName.value = "";
  VDRState.reset();
  pdfDownloaded = false;
  goToStep("setup");
}

// The VDR output screen is rendered by vdr-generator.js (shared with ?vdr=true),
// so we append our "start over" action to it rather than editing that file.
function appendVdrEndActions(container) {
  const bar = document.createElement("div");
  bar.className = "flow-nav";
  bar.innerHTML = `<button class="btn flow-btn-back" id="flow-new-venture-vdr">Start a new venture assessment</button>`;
  container.appendChild(bar);
  document.getElementById("flow-new-venture-vdr").addEventListener("click", startNewVentureAssessment);
}

/* ---------- entry ---------- */

export function startExternalFlow() {
  if (isExternalFlowActive) return;
  isExternalFlowActive = true;

  const flow = document.getElementById("external-flow");
  if (flow) flow.hidden = false;
  const scoreNav = document.getElementById("score-nav");
  if (scoreNav) scoreNav.hidden = false; // visibility now driven by data-flow-step CSS

  // Keep the Score footer's progress hint and "ready" pulse current as the
  // advisor selects levels (level cards live in the reused #app-view).
  document.addEventListener("click", (e) => {
    if (!isExternalFlowActive || currentStep !== "score") return;
    if (e.target.closest?.(".level-select-btn")) {
      setTimeout(renderScoreNav, 0);
    }
  }, true);

  // Refresh the per-category notes box whenever the displayed category changes.
  window.addEventListener("categoryDisplayUpdated", () => {
    if (isExternalFlowActive) refreshCategoryNotes();
  });

  // Our flow owns VDR navigation (vdr-main.js only registers under ?vdr=true).
  // The VDR's own screens dispatch these events; we reinterpret them against
  // our steps — 'baseline' has no picker here, so it steps back to Download.
  window.addEventListener("vdr-navigate", (e) => {
    if (!isExternalFlowActive) return;
    const target = e.detail;
    if (target === "output") goToStep("vdr-generate");
    else if (target === "goals") goToStep("vdr-goals");
    else if (target === "baseline") goToStep("download");
  });

  goToStep("setup");
}
