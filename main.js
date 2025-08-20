// main.js – app entry + wiring (with ES module data import and improved event delegation)
import { AppState } from "./state.js";
import { readinessData } from "./data.js";
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
} from "./ui.js";

// VDR imports
import {
  enterVdr,
  exitVdr,
  renderVdrCards,
  generateVdr,
  downloadVdrPdf,
  initVdrModalListeners,
} from "./vdr.js";

/* -------------------------
   Helpers
--------------------------*/
const CATEGORY_ORDER = [
  "IP","Technology","Market","Product","Team","Go-to-Market","Business","Funding","Regulatory",
];

function pad(n){return n<10?"0"+n:""+n;}
function formatLocalDateTime(d){
  const yr=d.getFullYear(),mo=pad(d.getMonth()+1),da=pad(d.getDate()),hh=pad(d.getHours()),mm=pad(d.getMinutes());
  return `${yr}-${mo}-${da} ${hh}:${mm}`;
}

function centerElement(el){
  if(!el) return;
  el.scrollIntoView({ block:"center", behavior:"smooth"});
}

function categoriesToInclude(){
  const all = Object.keys(readinessData);
  return AppState.isHealthRelated ? all : all.filter(c => c !== "Regulatory");
}

function nextCategoryName(cur){
  const allowed = categoriesToInclude();
  const order = ["IP","Technology","Market","Product","Team","Go-to-Market","Business","Funding","Regulatory"];
  const seq = order.filter(c => allowed.includes(c));
  const idx = seq.indexOf(cur);
  return idx >= 0 && idx < seq.length - 1 ? seq[idx+1] : null;
}

function navigateToCategory(cat) {
  if (!cat) return;
  if (AppState.currentCategory === cat) return;

  console.log("[next-pill] navigating to", cat);
  AppState.currentCategory = cat;

  // Rebuild sidebar so the active state updates, then render the levels
  initializeCategories();
  updateCategoryDisplay();
  updateSummary();
  syncSummaryHeaderAndIcons();

  // Scroll to top of page
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Center the selected card inside .assessment-area ---------- */
function centerCardInAssessment(cardEl, retries = 3) {
  const container = document.querySelector(".assessment-area");
  if (!container || !cardEl) return;

  const doCenter = (tag) => {
    // Recompute each time; card height may have changed after expansion.
    const cRect = container.getBoundingClientRect();
    const tRect = cardEl.getBoundingClientRect();
    const delta = (tRect.top - cRect.top);
    const targetScrollTop = container.scrollTop + delta - (container.clientHeight / 2 - tRect.height / 2);
    _scrollDebug(tag, container, cardEl);
    container.scrollTo({ top: Math.max(targetScrollTop, 0), behavior: "smooth" });
  };

  // First try (immediate)
  doCenter("initial");

  // Try again after layout settles (card expansion)
  if (retries > 0) {
    setTimeout(() => {
      const selectedAgain = document.querySelector(".levels-container .level-card.selected") || cardEl;
      doCenter("retry-120ms");
      if (retries > 1) {
        setTimeout(() => {
          doCenter("retry-350ms");
        }, 230);
      }
    }, 120);
  }
}

/* ---------- Toast DOM + fade helpers ---------- */

/** Find the nearest scrollable ancestor; fallback to the document */
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
  return document.scrollingElement || document.documentElement; // window scroller
}

/** Debug trace used by the auto-center logic */
function _scrollDebug(label, container, card, isDoc) {
  const cRect = isDoc ? { top: 0, height: window.innerHeight } : container.getBoundingClientRect();
  const tRect = card.getBoundingClientRect();
  console.log(`[auto-center] ${label}`, {
    isDoc,
    containerTop: Math.round(cRect.top),
    containerH: Math.round(cRect.height),
    scrollTop: Math.round(isDoc ? (window.pageYOffset || document.documentElement.scrollTop || 0) : container.scrollTop),
    cardTop: Math.round(tRect.top),
    cardH: Math.round(tRect.height)
  });
}

/** Center a card in its real scroll container (document or element), with retries */
function centerCardSmart(cardEl, retries = 3) {
  if (!cardEl) return;

  const container = getScrollParent(cardEl);
  const isDoc = container === document.scrollingElement || container === document.documentElement || container === document.body;

  const apply = (tag) => {
    const rect = cardEl.getBoundingClientRect();

    if (isDoc) {
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const target = (window.pageYOffset || document.documentElement.scrollTop || 0)
                   + rect.top - (viewportH / 2 - rect.height / 2);
      _scrollDebug(tag, container, cardEl, true);
      window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    } else {
      const cRect = container.getBoundingClientRect();
      const delta = rect.top - cRect.top;
      const target = container.scrollTop + delta - (container.clientHeight / 2 - rect.height / 2);
      _scrollDebug(tag, container, cardEl, false);
      container.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    }
  };

  // Immediate attempt
  apply("initial");
  // Retry after layout settles (expansion), then once more
  if (retries > 0) {
    setTimeout(() => {
      apply("retry-120ms");
      if (retries > 1) setTimeout(() => apply("retry-350ms"), 230);
    }, 120);
  }
}

/* ---------- Toast fade helpers ---------- */
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

  // Immediate hide (used when user clicks a category in the sidebar)
  if (immediate) {
    toast.classList.remove("show");
    toast.classList.add("hidden");
    return;
  }

  // Animated fade-out
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
  const btn   = document.getElementById("next-cat-btn");
  const name  = document.getElementById("next-cat-name");
  name.textContent = nextCat;

  if (!toast.classList.contains("show")) {
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show")); // fade in
  }

  // Replace listeners to avoid duplicates, then attach fresh one
  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("next-cat-btn").addEventListener("click", () => {
    hideNextToast();                      // fade out
    navigateToCategory(nextCat);          // actually switch category
  }, { once: true });
}

/* -------------------------
   Snapshot PDF
--------------------------*/
function buildSnapshotRows(){
  const allowed=new Set(categoriesToInclude());
  const rows=[];
  CATEGORY_ORDER.forEach(cat=>{
    if(!readinessData[cat]||!allowed.has(cat)) return;
    rows.push({category:cat, level:AppState.scores[cat]||"-"});
  });
  return rows;
}

function savePdfSnapshot(){
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { alert("PDF library failed to load. Please check your network and reload the page."); return; }
  if (!AppState.assessedAt) stampAssessedNow();

  const ventureName = (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const assessed = AppState.assessedAt ? formatLocalDateTime(AppState.assessedAt) : "—";

  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const left = 16; let y = 20; const lh = 8;

  doc.setFont("helvetica","bold"); doc.setFontSize(16);
  doc.text("NobleReach Readiness Level Snapshot", left, y); y += lh + 2;
  doc.setFont("helvetica","normal"); doc.setFontSize(12);
  doc.text(`Venture: ${ventureName}`, left, y); y += lh;
  doc.text(`Assessed: ${assessed}`, left, y); y += lh + 2;

  doc.setFont("helvetica","bold");
  doc.text("Category", left, y); doc.text("Level", left+120, y); y += lh;
  doc.setLineWidth(0.2); doc.line(left, y-6, left+160, y-6);
  doc.setFont("helvetica","normal");

  buildSnapshotRows().forEach(r=>{
    if (y > 280) {
      doc.addPage(); y = 20;
      doc.setFont("helvetica","bold");
      doc.text("Category", left, y); doc.text("Level", left+120, y); y += lh;
      doc.line(left, y-6, left+160, y-6);
      doc.setFont("helvetica","normal");
    }
    doc.text(r.category, left, y);
    doc.text(String(r.level), left+120, y);
    y += lh;
  });

  const now=new Date();
  const fnameTs = now.getFullYear().toString()+pad(now.getMonth()+1)+pad(now.getDate())+"_"+pad(now.getHours())+pad(now.getMinutes());
  const fileSafeName = ventureName.replace(/[^\w\-]+/g,"_");
  doc.save(`${fileSafeName}_${fnameTs}.pdf`);
}

/* -------------------------
   App boot
--------------------------*/
function initializeApp() {
  initializeCategories();
  updateSummary();
  syncSummaryHeaderAndIcons();

  const nameInput = document.getElementById("venture-name");
  if (nameInput) nameInput.value = AppState.ventureName || "";
  renderAssessedAt();

  // Start summary panel minimized
  const panel = document.getElementById("summary-panel");
  const minimizeBtn = document.getElementById("minimize-btn");
  if (panel && !panel.classList.contains("maximized")) {
    panel.classList.add("minimized");
    syncSummaryHeaderAndIcons(); // Update icons after setting minimized state
  }

  initVdrModalListeners();
}

/* -------------------------
   Event Delegation Setup
--------------------------*/
function setupEventDelegation() {
  // Single delegated listener for category list clicks
  const catList = document.getElementById("category-list");
  if (catList) {
    // Use event delegation for category item clicks
    catList.addEventListener("click", (e) => {
      const item = e.target.closest(".category-item");
      if (item) {
        hideNextToast(true); // immediate hide
        // Note: selectCategory is called by the listener added in renderCategoryList
      }
    }, { capture: true });

    // Keyboard navigation for categories
    catList.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest(".category-item")) {
        hideNextToast(true);
      }
    }, { capture: true });
  }

  // Single delegated listener for level selections (using document-level delegation)
  document.addEventListener("click", (e) => {
    const selectBtn = e.target.closest?.(".level-select-btn");
    if (!selectBtn) return;

    // Let the existing select logic run first (re-renders + expands the card)
    setTimeout(() => {
      const selectedCard =
        document.querySelector(".levels-container .level-card.selected") ||
        selectBtn.closest(".level-card");

      console.log("[auto-center] selection clicked; centering…", { category: AppState.currentCategory });
      centerCardSmart(selectedCard, 3);

      const nxt = (AppState.currentCategory && nextCategoryName(AppState.currentCategory)) || null;
      if (nxt) showNextToast(nxt);
    }, 0);
  }, { capture: true });
}

function setupEventListeners() {
  // Health-related toggle
  document.getElementById("health-related").addEventListener("change",(e)=>{
    AppState.isHealthRelated = e.target.checked;
    const note = document.getElementById("health-mode-note");
    if (note) note.classList.toggle("hidden", !AppState.isHealthRelated);
    updateIndustrySelectorUI({ forceDefaultOnEnable:true });
    initializeCategories();
    updateSummary();
    syncSummaryHeaderAndIcons();
  });

  // View toggle
  document.querySelectorAll(".view-btn").forEach((btn)=>{
    btn.addEventListener("click",(e)=>{
      const view = e.target.dataset.view;
      AppState.currentView = view;
      document.querySelectorAll(".view-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===view));
      if (AppState.currentCategory) updateCategoryDisplay();
    });
  });

  // Technology subtrack selector
  document.getElementById("industry-select").addEventListener("change", updateCategoryDisplay);

  // Summary panel controls
  document.getElementById("minimize-btn").addEventListener("click", toggleMinimizeSummaryPanel);
  document.getElementById("maximize-btn").addEventListener("click", toggleMaximizeSummaryPanel);
  document.getElementById("panel-overlay").addEventListener("click", closeMaximizedPanel);
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeMaximizedPanel(); });

  // Venture name binding
  const nameInput = document.getElementById("venture-name");
  if (nameInput) nameInput.addEventListener("input",(e)=>{ AppState.ventureName = e.target.value; });

  // Snapshot PDF
  const btnPdf = document.getElementById("btn-export-pdf");
  if (btnPdf) btnPdf.addEventListener("click", savePdfSnapshot);

  // VDR buttons
  const btnCreateVdr = document.getElementById("btn-create-vdr");
  if (btnCreateVdr) {
    btnCreateVdr.addEventListener("click", () => {
      enterVdr(); // enterVdr() will call renderVdrCards() internally
    });
  }

  document.getElementById("vdr-back").addEventListener("click", exitVdr);
  document.getElementById("vdr-generate").addEventListener("click", generateVdr);
  document.getElementById("vdr-download-pdf").addEventListener("click", downloadVdrPdf);
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventDelegation(); // Set up delegated listeners
  setupEventListeners();  // Set up direct listeners
  ensureNextToastDom();   // Make sure the Next pill exists
});