// ui.js
import { AppState } from "./state.js";



/* Summary panel controls (icons + titles) */
function setSummaryHeaderText(){
  const panel = document.getElementById("summary-panel");
  const h = panel?.querySelector(".summary-header h3");
  if (!panel || !h) return;
  const done = Object.values(AppState.scores || {}).filter(Boolean).length;
  const total = document.getElementById("health-related")?.checked ? 9 : 8;
  if (panel.classList.contains("minimized")) {
    h.textContent = `Summary ${done}/${total}`;
  } else {
    h.textContent = `Assessment Summary (${done}/${total})`;
  }
}


/* MM-DD-YYYY from earlier step */
export function renderAssessedAt(){
  const el = document.getElementById("assessed-at");
  if (!el) return;
  const d = AppState.assessedAt || new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const yy = d.getFullYear();
  el.textContent = `${mm}-${dd}-${yy}`;
}
export function stampAssessedNow(){ AppState.assessedAt = new Date(); renderAssessedAt(); }

/* ---- Summary panel controls & titles ---- */
function syncSummaryControls(){
  const panel = document.getElementById("summary-panel");
  if (!panel) return;

  const isMin = panel.classList.contains("minimized");
  const isMax = panel.classList.contains("maximized");

  const h = panel.querySelector(".summary-header h3");
  if (h) {
    const done = Object.values(AppState.scores || {}).filter(Boolean).length;
    const total = document.getElementById("health-related")?.checked ? 9 : 8;
    h.textContent = isMin ? `Summary ${done}/${total}` : `Assessment Summary (${done}/${total})`;
  }

  // Icons
  const minBtn = document.getElementById("minimize-btn");
  const maxBtn = document.getElementById("maximize-btn");
  if (minBtn){
    const iconMinus = minBtn.querySelector("#icon-minus");
    const iconPlus  = minBtn.querySelector("#icon-plus");
    // Show + only when minimized, otherwise show −
    iconPlus?.classList.toggle("hidden", !isMin);
    iconMinus?.classList.toggle("hidden", isMin);
    minBtn.setAttribute("title", isMin ? "Restore" : "Minimize");
    minBtn.setAttribute("aria-label", isMin ? "Restore" : "Minimize");
  }
  if (maxBtn){
    const iconExpand  = maxBtn.querySelector("#icon-expand");
    const iconRestore = maxBtn.querySelector("#icon-restore");
    const showRestore = isMax;
    iconExpand?.classList.toggle("hidden", showRestore);
    iconRestore?.classList.toggle("hidden", !showRestore);
    maxBtn.setAttribute("title", showRestore ? "Restore" : "Maximize");
    maxBtn.setAttribute("aria-label", showRestore ? "Restore" : "Maximize");
  }
}

export function toggleMinimizeSummaryPanel(){
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  if (!panel) return;

  if (panel.classList.contains("minimized")) {
    // restore to normal (not maximized)
    panel.classList.remove("minimized","maximized");
    overlay?.classList.remove("active");
  } else {
    // minimize from normal or maximized
    panel.classList.remove("maximized");
    panel.classList.add("minimized");
    overlay?.classList.remove("active");
  }
  syncSummaryControls();
}

export function toggleMaximizeSummaryPanel(){
  const panel = document.getElementById("summary-panel");
  const overlay = document.getElementById("panel-overlay");
  if (!panel) return;

  if (panel.classList.contains("maximized")) {
    // restore to normal (not minimized)
    panel.classList.remove("maximized","minimized");
    overlay?.classList.remove("active");
  } else {
    // ensure not minimized, then maximize
    panel.classList.remove("minimized");
    panel.classList.add("maximized");
    overlay?.classList.add("active");
  }
  syncSummaryControls();
}

export function closeMaximizedPanel(){
  const panel = document.getElementById("summary-panel");
  if (!panel) return;
  if (panel.classList.contains("maximized")){
    panel.classList.remove("maximized");
    document.getElementById("panel-overlay")?.classList.remove("active");
    syncSummaryControls();
  }
}

/* Keep this logic from earlier; unchanged except icons now sync via syncSummaryControls */
export function updateIndustrySelectorUI({ forceDefaultOnEnable=false } = {}){
  const health = document.getElementById("health-related")?.checked;
  const sel = document.getElementById("industry-selector");
  const group = document.getElementById("health-track-optgroup");
  if (sel) sel.classList.toggle("hidden", !health);
  if (group) group.disabled = !health;
  if (forceDefaultOnEnable && health){
    const s = document.getElementById("industry-select");
    if (s) s.value = "health_device";
  }
}

/* Expose one sync call for others */
export function syncSummaryHeaderAndIcons(){ syncSummaryControls(); }









export function toggleLevel(card) {
  card.classList.toggle("expanded");
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




