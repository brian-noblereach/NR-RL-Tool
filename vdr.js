// vdr.js — Venture Development Report (cards + modal flow)
import { AppState } from "./state.js";
import { applyHealthTerms, getHealthExtras } from "./transform.js";

/* -----------------------------------
   Safe readiness data access
----------------------------------- */
function RD() {
  return (typeof window !== "undefined" && window.readinessData) ||
         (typeof globalThis !== "undefined" && globalThis.readinessData) ||
         null;
}

/* -----------------------------------
   Constants / helpers
----------------------------------- */
const CATEGORY_ORDER = [
  "IP","Technology","Market","Product","Team","Go-to-Market","Business","Funding","Regulatory",
];

function categoriesToInclude() {
  const data = RD();
  if (!data) return [];
  const all = Object.keys(data);
  return AppState.isHealthRelated ? all : all.filter((c) => c !== "Regulatory");
}

function pad(n){return n<10?"0"+n:""+n;}
function formatLocalDateTime(d){
  const yr=d.getFullYear(),mo=pad(d.getMonth()+1),da=pad(d.getDate()),hh=pad(d.getHours()),mm=pad(d.getMinutes());
  return `${yr}-${mo}-${da} ${hh}:${mm}`;
}
function getTrack() {
  const sel = document.getElementById("industry-select");
  return sel ? sel.value : "general";
}

/* -------- Collect deliverables from baseline (+ health extras) -------- */
function collectDeliverables(category, fromLevel, toLevel) {
  const data = RD();
  if (!data || !data[category]) return [];
  const levels = data[category].levels || [];
  const track = AppState.isHealthRelated && category === "Technology" ? getTrack() : null;

  const out = [];
  for (let L = fromLevel; L <= toLevel; L++) {
    const lvlObj = levels.find((x) => Number(x.level) === Number(L));
    if (!lvlObj) continue;

    const base = Array.isArray(lvlObj.deliverables)
      ? lvlObj.deliverables.slice()
      : lvlObj.deliverables ? [lvlObj.deliverables] : [];

    if (AppState.isHealthRelated) {
      const extras = getHealthExtras(category, L, track);
      if (extras && Array.isArray(extras.deliverables)) base.push(...extras.deliverables);
    }

    const mapped = AppState.isHealthRelated ? base.map(applyHealthTerms) : base;
    mapped.forEach((d) => {
      const key = String(d || "").trim();
      if (key) out.push(key);
    });
  }

  const seen = new Set();
  return out.filter((d) => {
    const k = d.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* -------- Level reference (definition + deliverables) -------- */
function getLevelRefBlocks(category, current, goal) {
  const data = RD();
  const blocks = [];
  const levels = data?.[category]?.levels || [];
  const track = AppState.isHealthRelated && category === "Technology" ? getTrack() : null;

  for (let L = 1; L <= 9; L++) {
    const lvlObj = levels.find((x) => Number(x.level) === L);
    if (!lvlObj) continue;

    const def = AppState.isHealthRelated ? applyHealthTerms(lvlObj.definition || "") : (lvlObj.definition || "");
    const baseDeliv = Array.isArray(lvlObj.deliverables) ? lvlObj.deliverables.slice()
                     : lvlObj.deliverables ? [lvlObj.deliverables] : [];

    let deliv = baseDeliv;
    if (AppState.isHealthRelated) {
      const extras = getHealthExtras(category, L, track);
      if (extras?.deliverables) deliv = deliv.concat(extras.deliverables);
      deliv = deliv.map(applyHealthTerms);
    }

    const seen = new Set();
    deliv = deliv.filter((d) => {
      const k = (d || "").toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    blocks.push({
      level: L,
      title: lvlObj.title || `Level ${L}`,
      def,
      deliv,
      inPath: L > (current || 0) && L <= (goal || 0),
    });
  }
  return blocks;
}

/* -------------------------
   VDR View navigation
--------------------------*/
export function enterVdr() {
  renderVdrCards();
  document.getElementById("app-view").classList.add("hidden");
  document.getElementById("vdr-view").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const first = categoriesToInclude()[0];
  if (first) setModalState({ category: first });
}

export function exitVdr() {
  document.getElementById("vdr-view").classList.add("hidden");
  document.getElementById("app-view").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -------------------------
   Goal cards (delegated)
--------------------------*/
export function renderVdrCards() {
  const grid = document.getElementById("vdr-card-grid");
  const cats = categoriesToInclude();
  if (!grid) return;

  const data = RD();
  if (!data) {
    grid.innerHTML = `
      <div class="vdr-card">
        <div class="row"><div class="title">⚠️ <strong>Readiness data not loaded</strong></div></div>
        <p>Please ensure <code>data.js</code> is included before <code>main.js</code>.</p>
      </div>`;
    return;
  }
  if (cats.length === 0) {
    grid.innerHTML = `<div class="vdr-card"><div class="row"><div class="title">No categories available</div></div></div>`;
    return;
  }

  grid.innerHTML = cats.map((cat) => {
    const cur = AppState.scores[cat] || 0;
    const defaultGoal = Math.max(cur || 1, 1);
    const options = Array.from({ length: 9 }, (_, i) => {
      const n = i + 1;
      return `<option value="${n}" ${n === defaultGoal ? "selected" : ""}>Level ${n}</option>`;
    }).join("");

    return `
      <div class="vdr-card" data-category="${cat}">
        <div class="row">
          <div class="title">${cat}</div>
          <button type="button" class="link vdr-view-btn" data-category="${cat}" title="View levels">View levels</button>
        </div>
        <div class="row"><div class="badge">Current: <strong>Level ${cur || 0}</strong></div></div>
        <div class="row" style="flex-direction:column;align-items:stretch;">
          <label>Goal level</label>
          <select class="goal-select" data-category="${cat}">${options}</select>
        </div>
      </div>
    `;
  }).join("");

  // Delegated listener for "View levels"
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".vdr-view-btn");
    if (!btn) return;
    openVdrModal(btn.dataset.category);
  });

  // Keep modal highlight in sync when a card's goal changes
  grid.querySelectorAll(".goal-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const s = getModalState();
      if (s.category === sel.dataset.category && !isModalHidden()) renderVdrModalContent();
    });
  });
}

/* -------------------------
   Generate VDR sections
--------------------------*/
function getGoalSelections() {
  const m = {};
  document.querySelectorAll("#vdr-card-grid .goal-select").forEach((sel) => {
    const cat = sel.dataset.category;
    m[cat] = parseInt(sel.value, 10);
  });
  return m;
}

export function generateVdr() {
  const goals = getGoalSelections();
  const cats = categoriesToInclude().filter((c) => goals[c]);

  const name = (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const dt = AppState.assessedAt ? formatLocalDateTime(AppState.assessedAt) : formatLocalDateTime(new Date());
  document.getElementById("vdr-venture-name").textContent = name;
  document.getElementById("vdr-date").textContent = dt;

  const body = document.getElementById("vdr-body");
  let html = "";
  cats.forEach((cat) => {
    const cur = AppState.scores[cat] || 0;
    const goal = goals[cat];

    let section = `<div class="cat-section"><h4>${cat} — Goal: Level ${goal}</h4>`;
    if (goal <= cur) {
      section += `<p>No additional deliverables required (already at Level ${cur}).</p></div>`;
    } else {
      const deliverables = collectDeliverables(cat, cur + 1, goal);
      section += deliverables.length
        ? `<ul>${deliverables.map((d) => `<li>${d}</li>`).join("")}</ul></div>`
        : `<p>No deliverables found for the specified range.</p></div>`;
    }
    html += section;
  });

  body.innerHTML = html;
  document.getElementById("vdr-output").classList.remove("hidden");
  body.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* -------------------------
   VDR → PDF
--------------------------*/
export function downloadVdrPdf() {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { alert("PDF library failed to load. Please check your network and reload the page."); return; }

  const goals = getGoalSelections();
  const cats = categoriesToInclude().filter((c) => goals[c]);

  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const left=16, lh=7.5; let y=16;

  const ventureName = (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const assessed = AppState.assessedAt ? formatLocalDateTime(AppState.assessedAt) : formatLocalDateTime(new Date());

  doc.setFont("helvetica","bold"); doc.setFontSize(16); doc.text("Venture Development Report", left, y); y+=lh;
  doc.setFont("helvetica","normal"); doc.setFontSize(12);
  doc.text(`Venture: ${ventureName}`, left, y); y+=lh;
  doc.text(`Generated: ${assessed}`, left, y); y+=lh+2;

  CATEGORY_ORDER.forEach((cat)=>{
    if(!cats.includes(cat)) return;
    const cur = AppState.scores[cat] || 0;
    const goal = goals[cat];
    if (y>265){ doc.addPage(); y=16; }

    doc.setFont("helvetica","bold"); doc.text(`${cat} — Goal Level ${goal}`, left, y); y+=lh;
    doc.setFont("helvetica","normal");
    if (goal<=cur){ doc.text(`No additional deliverables required (already at Level ${cur}).`, left, y); y+=lh; return; }

    const items = collectDeliverables(cat, cur+1, goal);
    if (items.length===0){ doc.text("No deliverables found for the specified range.", left, y); y+=lh; return; }

    items.forEach((d)=>{
      const lines = doc.splitTextToSize(`• ${d}`, 178);
      lines.forEach((line)=>{ if(y>280){ doc.addPage(); y=16; } doc.text(line, left, y); y+=6.2; });
    });
    y+=2;
  });

  const now=new Date();
  const fnameTs = now.getFullYear().toString()+pad(now.getMonth()+1)+pad(now.getDate())+"_"+pad(now.getHours())+pad(now.getMinutes());
  const fileSafeName = ventureName.replace(/[^\w\-]+/g,"_");
  doc.save(`${fileSafeName}_VDR_${fnameTs}.pdf`);
}

/* =========================
   Modal logic
========================= */
const modalState = { cats: [], idx: 0, category: null };

function setModalState({ category }) {
  modalState.cats = categoriesToInclude();
  modalState.idx = Math.max(0, modalState.cats.indexOf(category));
  modalState.category = modalState.cats[modalState.idx] || null;
}
function getModalState(){ return modalState; }
function isModalHidden(){
  const m=document.getElementById("vdr-modal");
  return !m || m.classList.contains("hidden");
}

function openVdrModal(category) {
  const data = RD();
  if (!data) { alert("Readiness data not loaded."); return; }

  setModalState({ category });

  const m = document.getElementById("vdr-modal");
  const title = document.getElementById("vdr-modal-title");
  const curEl = document.getElementById("vdr-modal-current");
  const goalSel = document.getElementById("vdr-modal-goal");

  const cat = modalState.category;
  const cur = AppState.scores[cat] || 0;

  const cardSel = document.querySelector(`.goal-select[data-category="${cat}"]`);
  const seedGoal = cardSel ? parseInt(cardSel.value, 10) : Math.max(cur || 1, 1);

  title.textContent = `${cat} — Levels`;
  curEl.textContent = `Level ${cur || 0}`;
  goalSel.innerHTML = Array.from({ length: 9 }, (_, i) => {
    const n = i + 1;
    return `<option value="${n}" ${n === seedGoal ? "selected" : ""}>Level ${n}</option>`;
  }).join("");

  renderVdrModalContent();
  m.classList.remove("hidden");
}

function closeVdrModal(){
  const m=document.getElementById("vdr-modal");
  if(m) m.classList.add("hidden");
}

function renderVdrModalContent(){
  const body=document.getElementById("vdr-modal-body");
  const goalSel=document.getElementById("vdr-modal-goal");
  const cat=modalState.category;
  const cur=AppState.scores[cat]||0;
  const goal=parseInt(goalSel.value,10);

  const blocks=getLevelRefBlocks(cat,cur,goal);
  body.innerHTML=blocks.map(b=>`
    <div class="level-ref ${b.inPath ? "path" : ""}" data-level="${b.level}">
      <div class="lvl-title">Level ${b.level}: ${b.title}</div>
      <p class="lvl-def">${b.def}</p>
      ${b.deliv.length?`<ul class="lvl-deliv">${b.deliv.map(d=>`<li>${d}</li>`).join("")}</ul>`:`<p class="lvl-def" style="margin:0;">No deliverables listed.</p>`}
    </div>
  `).join("");
}

/* Save current modal goal back to its card */
function saveCurrentGoalToCard() {
  const cat = modalState.category;
  if (!cat) return;
  const goal = parseInt(document.getElementById("vdr-modal-goal").value, 10);
  const cardSel = document.querySelector(`.goal-select[data-category="${cat}"]`);
  if (cardSel) {
    cardSel.value = String(goal);
    cardSel.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/* --- Global modal bindings (called once from main.js) --- */
export function initVdrModalListeners(){
  const m=document.getElementById("vdr-modal");
  if(!m) return;

  document.getElementById("vdr-modal-close").addEventListener("click", closeVdrModal);
  m.querySelector(".modal-backdrop").addEventListener("click", closeVdrModal);

  // Change highlights when goal dropdown changes
  document.getElementById("vdr-modal-goal").addEventListener("change", renderVdrModalContent);

  // Click a level card to set goal
  document.getElementById("vdr-modal-body").addEventListener("click", (e)=>{
    const card = e.target.closest(".level-ref");
    if (!card) return;
    const lvl = parseInt(card.dataset.level, 10);
    if (lvl >= 1 && lvl <= 9) {
      const goalSel = document.getElementById("vdr-modal-goal");
      goalSel.value = String(lvl);
      renderVdrModalContent();
    }
  });

  // Prev (no auto-save requested)
  document.getElementById("vdr-modal-prev").addEventListener("click", ()=>{
    const s=getModalState();
    if(s.idx>0){ setModalState({category:s.cats[s.idx-1]}); openVdrModal(s.category); }
  });

  // Next (auto-save current goal, then move forward)
  document.getElementById("vdr-modal-next").addEventListener("click", ()=>{
    saveCurrentGoalToCard();
    const s=getModalState();
    if(s.idx<s.cats.length-1){ setModalState({category:s.cats[s.idx+1]}); openVdrModal(s.category); }
    else { closeVdrModal(); }
  });

  // Apply = save & close
  document.getElementById("vdr-modal-apply").addEventListener("click", ()=>{
    saveCurrentGoalToCard();
    closeVdrModal();
  });

  // ESC key
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape" && !isModalHidden()) closeVdrModal(); });
}
