// venture-picker.js - The advisor venture picker (internal users, v07).
//
// Step 1 of the internal flow: choose a venture, then edit one of your saved
// assessments, start a new one, or add a venture that isn't listed. Ventures
// come from the proxy's rl_directory action (RL and intake sheets, grouped by
// shared Venture ID). Filtering and sorting live in venture-directory.js.
//
// main.js supplies the actions through initVenturePicker(); this module only
// renders the modal and calls them.

import { AppState, saveAdvisorPreference, getResumableDrafts } from "./state.js";
import { fetchVentureDirectory, setVentureStatus } from "./smartsheet.js";
import {
  findVentures, lastScored, monthsAgoText, nextAssessmentNumber, similarVentures, canEdit,
  advisorNames,
} from "./venture-directory.js";
import { readinessData } from "./data/index.js";
import { activeCategoryKeys, getCategoryAbbrev } from "./category-labels.js";
import { showModal, hideModal } from "./ui.js";
import { DUAL_USE_DEFINITION, DUAL_USE_ENABLED, isDualUseCategory, compactScorePair } from "./applications.js";

const MAX_ROWS = 100;
const STATUSES = ["Active", "Graduated", "Inactive"];

let actions = null;          // { onEdit, onNew, onAdd, onResume, getPortfolios, toast }
let ventures = [];
let loadState = "idle";      // idle | loading | ready | error
let loadError = "";
let expandedKey = null;
let adding = false;
const filters = { scope: "mine", query: "", portfolio: "", notScoredMonths: "", sort: "due", showGraduated: false };

const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return isNaN(date) ? String(d).slice(0, 10)
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Date and time a round was saved; date only for rows without a timestamp. */
function formatRoundTime(a) {
  const t = new Date(a.submissionTimestamp);
  return a.submissionTimestamp && !isNaN(t)
    ? t.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : formatDate(a.assessmentDate);
}

/** Fill the "Your name" pick list with every advisor in the RL sheet. */
function renderAdvisorOptions() {
  const list = $("picker-advisor-names");
  if (list) list.innerHTML = advisorNames(ventures).map((n) => `<option value="${esc(n)}"></option>`).join("");
}

function scoresCompact(a) {
  return activeCategoryKeys(Object.keys(readinessData), a.isHealthRelated)
    .map((c) => `${getCategoryAbbrev(c)}:${DUAL_USE_ENABLED && a.isDualUse && isDualUseCategory(c)
      ? compactScorePair(a, c)
      : a.scores[c] != null ? a.scores[c] : "-"}`).join(" ");
}

function portfolios() {
  return actions.getPortfolios();   // [{ value, label, archived }]
}

function archivedPortfolios() {
  return portfolios().filter((p) => p.archived).map((p) => p.value);
}

function advisor() {
  return String(AppState.advisorName || "").trim();
}

/* ---------- public ---------- */

export function initVenturePicker(a) {
  actions = a;
  const close = () => hideModal("venture-picker-modal");
  $("venture-picker-close")?.addEventListener("click", close);
  document.querySelector("#venture-picker-modal .modal-backdrop")?.addEventListener("click", close);

  $("picker-advisor-name")?.addEventListener("input", (e) => {
    AppState.advisorName = e.target.value;
    const main = $("advisor-name");
    if (main) main.value = e.target.value;
    saveAdvisorPreference(e.target.value);
    renderList();
  });
  $("picker-search")?.addEventListener("input", (e) => { filters.query = e.target.value; renderList(); });
  $("picker-portfolio")?.addEventListener("change", (e) => { filters.portfolio = e.target.value; renderList(); });
  $("picker-not-scored")?.addEventListener("change", (e) => { filters.notScoredMonths = e.target.value; renderList(); });
  $("picker-sort")?.addEventListener("change", (e) => { filters.sort = e.target.value; renderList(); });
  $("picker-show-graduated")?.addEventListener("change", (e) => { filters.showGraduated = e.target.checked; renderList(); });
  document.querySelectorAll("#venture-picker-modal [data-scope]").forEach((btn) => {
    btn.addEventListener("click", () => { filters.scope = btn.dataset.scope; renderList(); });
  });
  $("picker-retry")?.addEventListener("click", () => load(true));

  // Delegated clicks on the list, resume drafts, and the add form.
  $("venture-picker-modal")?.addEventListener("click", onClick);
  $("venture-picker-modal")?.addEventListener("change", onChange);
  $("venture-picker-modal")?.addEventListener("input", (e) => {
    if (e.target.id === "picker-add-name") renderAddMatches();
    if (e.target.closest?.("#picker-add")) updateAddButton();
  });
}

export function openVenturePicker() {
  const input = $("picker-advisor-name");
  if (input) input.value = AppState.advisorName || "";
  adding = false;
  renderPortfolioFilter();
  renderResume();
  renderAdd();
  showModal("venture-picker-modal");
  load(false);
  setTimeout(() => (advisor() ? $("picker-search") : input)?.focus(), 50);
}

export function closeVenturePicker() {
  hideModal("venture-picker-modal");
}

/** Refresh after a save or status change, so the list is current next time. */
export function invalidateVenturePicker() {
  loadState = "idle";
}

/* ---------- loading ---------- */

async function load(force) {
  if (loadState === "ready" && !force) { renderList(); return; }
  loadState = "loading";
  renderList();
  const result = await fetchVentureDirectory({ force });
  if (result.ok) {
    ventures = result.ventures;
    loadState = "ready";
    renderAdvisorOptions();
    loadError = result.intakeError ? "Intake submissions could not be loaded; showing saved assessments only." : "";
  } else {
    loadState = "error";
    loadError = result.error;
  }
  renderList();
}

/* ---------- rendering ---------- */

function renderPortfolioFilter() {
  const sel = $("picker-portfolio");
  if (!sel) return;
  sel.innerHTML = `<option value="">All portfolios</option>` + portfolios()
    .map((p) => `<option value="${esc(p.value)}">${esc(p.label)}${p.archived ? " (archived)" : ""}</option>`).join("");
  sel.value = filters.portfolio;
}

function renderResume() {
  const el = $("picker-resume");
  if (!el) return;
  const drafts = getResumableDrafts();
  el.hidden = drafts.length === 0;
  el.innerHTML = drafts.length ? `
    <h4>Unsaved work in this browser</h4>
    ${drafts.map((d) => `
      <div class="picker-resume-row">
        <span><strong>${esc(d.ventureName || "Unnamed venture")}</strong> · Assessment #${esc(d.currentAssessmentNumber || 1)} · last changed ${esc(formatDate(d.updatedAt))}</span>
        <button type="button" class="btn small" data-resume="${esc(d.id)}">Resume</button>
      </div>`).join("")}` : "";
}

function renderList() {
  const listEl = $("picker-list");
  const note = $("picker-note");
  const retry = $("picker-retry");
  if (!listEl || !note) return;

  document.querySelectorAll("#venture-picker-modal [data-scope]").forEach((b) =>
    b.classList.toggle("active", b.dataset.scope === filters.scope));
  if (retry) retry.hidden = loadState !== "error";

  if (loadState === "loading" || loadState === "idle") {
    note.textContent = "Loading ventures…";
    listEl.innerHTML = "";
    return;
  }
  if (loadState === "error") {
    note.textContent = loadError || "Could not load ventures.";
    listEl.innerHTML = "";
    return;
  }
  if (filters.scope === "mine" && !advisor()) {
    note.textContent = "Enter your name to see the ventures you've scored, or switch to All ventures.";
    listEl.innerHTML = "";
    return;
  }

  const { list, widened } = findVentures(ventures, {
    ...filters,
    advisor: advisor(),
    notScoredMonths: Number(filters.notScoredMonths) || 0,
    archivedPortfolios: archivedPortfolios(),
  });

  const parts = [];
  if (widened) parts.push(list.length ? "None of your ventures match, so these are matches from all ventures." : "");
  if (!list.length) parts.push("No ventures match. Not listed? Use Add a venture above.");
  if (list.length > MAX_ROWS) parts.push(`Showing ${MAX_ROWS} of ${list.length}. Search or filter to narrow the list.`);
  if (loadError) parts.push(loadError);
  note.textContent = parts.filter(Boolean).join(" ");

  listEl.innerHTML = list.slice(0, MAX_ROWS).map(renderRow).join("");
}

function renderRow(v) {
  const last = lastScored(v);
  const expanded = expandedKey === v.key;
  const meta = [v.institution, v.portfolio].filter(Boolean).join(" · ");
  const status = v.status && v.status !== "Active" ? `<span class="picker-badge muted">${esc(v.status)}</span>` : "";
  const intakeOnly = !v.assessments.length && v.fromIntake ? `<span class="picker-badge">From intake</span>` : "";
  return `
    <li class="picker-row${expanded ? " expanded" : ""}">
      <button type="button" class="picker-row-head" data-expand="${esc(v.key)}" aria-expanded="${expanded}">
        <span class="picker-row-name">${esc(v.ventureName)}</span>
        ${v.ventureId ? `<span class="picker-badge id">${esc(v.ventureId)}</span>` : ""}
        ${status}${intakeOnly}
        <span class="picker-row-meta">${esc(meta)}</span>
        <span class="picker-row-last">${last ? `Last scored ${esc(formatDate(last))} (${esc(monthsAgoText(last))})` : "Not scored yet"}</span>
      </button>
      ${expanded ? renderDetail(v) : ""}
    </li>`;
}

function renderDetail(v) {
  const me = advisor();
  const rounds = v.assessments.map((a) => {
    const mine = canEdit(a, me);
    const edited = a.lastEdited ? ` · edited ${esc(formatDate(a.lastEdited))}` : "";
    return `
      <div class="picker-round">
        <div>
          <strong>#${esc(a.assessmentNumber)}</strong> · ${esc(formatRoundTime(a))} · ${esc(a.advisorName || "Unknown advisor")}${edited}
          <div class="picker-round-scores">${esc(scoresCompact(a))}</div>
        </div>
        ${mine
          ? `<button type="button" class="btn small outline" data-edit="${esc(a.rowId)}" data-venture="${esc(v.key)}">Edit</button>`
          : `<span class="picker-view-only" title="Only the advisor who saved it can edit it">View only</span>`}
      </div>`;
  }).join("");
  const statusControl = v.assessments.length ? `
    <label class="picker-status">Status
      <select data-status="${esc(v.key)}">
        ${STATUSES.map((s) => `<option${(v.status || "Active") === s ? " selected" : ""}>${s}</option>`).join("")}
      </select>
    </label>` : "";
  return `
    <div class="picker-detail">
      ${rounds || `<p class="picker-empty">No saved assessments yet.</p>`}
      <div class="picker-detail-actions">
        <button type="button" class="btn small primary" data-new="${esc(v.key)}">New assessment (#${nextAssessmentNumber(v)})</button>
        ${statusControl}
      </div>
    </div>`;
}

/* ---------- add a venture ---------- */

function renderAdd() {
  const el = $("picker-add");
  if (!el) return;
  if (!adding) {
    el.innerHTML = `<button type="button" class="btn small outline" data-add-open="1">+ Add a venture</button>
      <span class="help-text">For a venture that isn't listed. Search first so names stay consistent across tools.</span>`;
    return;
  }
  const active = portfolios().filter((p) => !p.archived);
  el.innerHTML = `
    <h4>Add a venture</h4>
    <div class="picker-add-fields">
      <label>Venture name <input type="text" id="picker-add-name" autocomplete="off" value="${esc(filters.query)}"></label>
      <label>Institution <input type="text" id="picker-add-institution" autocomplete="off"></label>
      <label>Portfolio
        <select id="picker-add-portfolio">
          <option value="">Select portfolio…</option>
          ${active.map((p) => `<option value="${esc(p.value)}">${esc(p.label)}</option>`).join("")}
        </select>
      </label>
    </div>
    <label class="picker-add-health">
      <input type="checkbox" id="picker-add-health">
      <span><strong>Life Science venture</strong>: uses the Life Science level definitions and adds the Regulatory category. Later assessments carry it over.</span>
    </label>
    ${DUAL_USE_ENABLED ? `<label class="picker-add-health">
      <input type="checkbox" id="picker-add-dual-use">
      <span><strong>Dual-use venture</strong>: ${esc(DUAL_USE_DEFINITION.replace(/^Dual-use: /, ""))} Market, Product and Go-to-Market are scored for each. Later assessments carry it over.</span>
    </label>` : ""}
    <div id="picker-add-matches" class="picker-add-matches"></div>
    <div class="picker-add-actions">
      <button type="button" class="btn small outline" data-add-cancel="1">Cancel</button>
      <button type="button" class="btn small primary" id="picker-add-confirm" disabled>Start Assessment #1</button>
    </div>`;
  renderAddMatches();
}

function renderAddMatches() {
  const el = $("picker-add-matches");
  if (!el) return;
  const name = $("picker-add-name")?.value || "";
  const matches = similarVentures(ventures, name);
  el.innerHTML = matches.length ? `
    <p><strong>Is it one of these?</strong> Open it instead of adding a duplicate.</p>
    ${matches.map((v) => `
      <button type="button" class="picker-match" data-open="${esc(v.key)}">
        ${esc(v.ventureName)}${v.ventureId ? ` (${esc(v.ventureId)})` : ""}${v.institution ? ` · ${esc(v.institution)}` : ""}
      </button>`).join("")}` : "";
  updateAddButton();
}

function updateAddButton() {
  const btn = $("picker-add-confirm");
  if (!btn) return;
  btn.disabled = !(($("picker-add-name")?.value || "").trim() && $("picker-add-portfolio")?.value && advisor());
  btn.title = advisor() ? "" : "Enter your name first";
}

/* ---------- events ---------- */

function findVenture(key) {
  return ventures.find((v) => v.key === key);
}

function onClick(e) {
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;
  if (d.expand) {
    expandedKey = expandedKey === d.expand ? null : d.expand;
    renderList();
  } else if (d.edit) {
    const v = findVenture(d.venture);
    const a = v && v.assessments.find((x) => String(x.rowId) === d.edit);
    if (a) { closeVenturePicker(); actions.onEdit(a, v); }
  } else if (d.new) {
    const v = findVenture(d.new);
    if (v) {
      if (!advisor()) { actions.toast("Enter your name first", "error"); $("picker-advisor-name")?.focus(); return; }
      closeVenturePicker();
      actions.onNew(v, nextAssessmentNumber(v));
    }
  } else if (d.resume) {
    closeVenturePicker();
    actions.onResume(d.resume);
  } else if (d.addOpen) {
    adding = true;
    renderAdd();
    $("picker-add-name")?.focus();
  } else if (d.addCancel) {
    adding = false;
    renderAdd();
  } else if (d.open) {
    // A close match: show that venture instead of adding a duplicate.
    const v = findVenture(d.open);
    if (!v) return;
    adding = false;
    renderAdd();
    filters.scope = "all";
    filters.showGraduated = filters.showGraduated || v.status === "Graduated" || v.status === "Inactive";
    filters.query = v.ventureName;
    const search = $("picker-search");
    if (search) search.value = v.ventureName;
    const grad = $("picker-show-graduated");
    if (grad) grad.checked = filters.showGraduated;
    expandedKey = v.key;
    renderList();
  } else if (t.id === "picker-add-confirm") {
    const name = ($("picker-add-name")?.value || "").trim();
    const portfolio = $("picker-add-portfolio")?.value || "";
    if (!name || !portfolio || !advisor()) return;
    closeVenturePicker();
    actions.onAdd({
      ventureName: name,
      institution: ($("picker-add-institution")?.value || "").trim(),
      portfolio,
      isHealthRelated: !!$("picker-add-health")?.checked,
      isDualUse: !!$("picker-add-dual-use")?.checked,
    });
  }
}

async function onChange(e) {
  if (e.target.closest?.("#picker-add")) { updateAddButton(); return; }
  const key = e.target.dataset?.status;
  if (!key) return;
  const v = findVenture(key);
  const status = e.target.value;
  if (!v || status === (v.status || "Active")) return;
  const verb = status === "Active" ? "back to Active" : `as ${status}`;
  if (!window.confirm(`Mark ${v.ventureName} ${verb}? ${status === "Active" ? "" : "It will be hidden from the default list."}`)) {
    e.target.value = v.status || "Active";
    return;
  }
  e.target.disabled = true;
  const result = await setVentureStatus(key, status);
  if (result.success) {
    v.status = status;
    actions.toast(`${v.ventureName} marked ${status}`, "success");
    renderList();
  } else {
    actions.toast(result.error, "error");
    e.target.value = v.status || "Active";
    e.target.disabled = false;
  }
}
