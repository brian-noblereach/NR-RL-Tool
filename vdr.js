// vdr.js - Venture Development Report builder (clarified Current vs Goal + inline reference panel)
import { AppState } from "./state.js";
import { applyHealthTerms, getHealthExtras } from "./transform.js";

/* -------------------------
   Helpers
--------------------------*/
const CATEGORY_ORDER = [
  "IP",
  "Technology",
  "Market",
  "Product",
  "Team",
  "Go-to-Market",
  "Business",
  "Funding",
  "Regulatory",
];

function categoriesToInclude() {
  const all = Object.keys(readinessData);
  return AppState.isHealthRelated ? all : all.filter((c) => c !== "Regulatory");
}

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

function getTrack() {
  const sel = document.getElementById("industry-select");
  return sel ? sel.value : "general";
}

/* -------- Collect deliverables from baseline (+ health extras) -------- */
function collectDeliverables(category, fromLevel, toLevel) {
  if (!readinessData[category]) return [];
  const levels = readinessData[category].levels || [];
  const track = AppState.isHealthRelated && category === "Technology" ? getTrack() : null;

  const out = [];
  for (let L = fromLevel; L <= toLevel; L++) {
    const lvlObj = levels.find((x) => Number(x.level) === Number(L));
    if (!lvlObj) continue;

    // Base deliverables from data.js
    const base = Array.isArray(lvlObj.deliverables)
      ? lvlObj.deliverables.slice()
      : lvlObj.deliverables
      ? [lvlObj.deliverables]
      : [];

    // Health extras
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
  const blocks = [];
  const levels = readinessData[category]?.levels || [];
  const track = AppState.isHealthRelated && category === "Technology" ? getTrack() : null;

  for (let L = 1; L <= 9; L++) {
    const lvlObj = levels.find((x) => Number(x.level) === L);
    if (!lvlObj) continue;

    // Definition
    const def = AppState.isHealthRelated ? applyHealthTerms(lvlObj.definition || "") : (lvlObj.definition || "");

    // Deliverables (baseline + extras, mapped if health)
    const baseDeliv = Array.isArray(lvlObj.deliverables) ? lvlObj.deliverables.slice()
                     : lvlObj.deliverables ? [lvlObj.deliverables] : [];

    let deliv = baseDeliv;
    if (AppState.isHealthRelated) {
      const extras = getHealthExtras(category, L, track);
      if (extras?.deliverables) deliv = deliv.concat(extras.deliverables);
      deliv = deliv.map(applyHealthTerms);
    }

    // de-dupe
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

function renderRefPanel(category, current, goal) {
  let ref = document.getElementById("vdr-ref");
  const host = document.getElementById("vdr-goals");
  if (!ref && host) {
    ref = document.createElement("aside");
    ref.id = "vdr-ref";
    ref.className = "vdr-ref";
    host.appendChild(ref);
  }
  if (!ref) return;

  if (!category) {
    ref.innerHTML = `<div class="vdr-ref-empty">Select a category to view level definitions and deliverables.</div>`;
    return;
  }

  const blocks = getLevelRefBlocks(category, current, goal);
  const header = `
    <div class="ref-head">
      <h4 class="ref-title">${category}</h4>
      <div class="ref-sub">Current: L${current || 0} &nbsp;→&nbsp; Goal: L${goal || 1}</div>
    </div>
  `;

  const body = blocks.map((b) => `
      <div class="level-ref ${b.inPath ? "path" : ""}">
        <div class="lvl-title">Level ${b.level}: ${b.title}</div>
        <p class="lvl-def">${b.def}</p>
        ${b.deliv.length ? `<ul class="lvl-deliv">${b.deliv.map((d) => `<li>${d}</li>`).join("")}</ul>` : `<p class="lvl-def" style="margin:0;">No deliverables listed.</p>`}
      </div>
  `).join("");

  ref.innerHTML = header + body;
}

/* -------------------------
   View control
--------------------------*/
export function enterVdr() {
  renderVdrGoals();
  document.getElementById("app-view").classList.add("hidden");
  document.getElementById("vdr-view").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Show first category reference by default
  const cats = categoriesToInclude();
  const first = cats[0];
  if (first) {
    const cur = AppState.scores[first] || 0;
    const goalSel = document.querySelector(`.goal-select[data-category="${first}"]`);
    const goal = goalSel ? parseInt(goalSel.value, 10) : Math.max(cur || 1, 1);
    renderRefPanel(first, cur, goal);
  }
}

export function exitVdr() {
  document.getElementById("vdr-view").classList.add("hidden");
  document.getElementById("app-view").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -------------------------
   Goals grid
--------------------------*/
export function renderVdrGoals() {
  const grid = document.getElementById("vdr-goals-grid");
  const cats = categoriesToInclude();

  // Header row
  let html = `
    <div class="hdr">Category</div>
    <div class="hdr">Current</div>
    <div class="hdr">Goal</div>
  `;

  cats.forEach((cat) => {
    const cur = AppState.scores[cat] || 0;
    const defaultGoal = Math.max(cur || 1, 1);

    html += `
      <div class="vdr-row vdr-cat" data-category="${cat}">
        <div class="cat-name">${cat}</div>
        <button type="button" class="link vdr-view" data-category="${cat}" title="View levels">View levels</button>
      </div>
      <div class="vdr-row vdr-cur" data-category="${cat}">
        <span class="badge">Current: <strong>Level ${cur || 0}</strong></span>
      </div>
      <div class="vdr-row vdr-goal" data-category="${cat}">
        <label for="goal-${cat}">Goal level</label>
        <select class="goal-select" id="goal-${cat}" data-category="${cat}">
          ${[1,2,3,4,5,6,7,8,9]
            .map((n) => `<option value="${n}" ${n === defaultGoal ? "selected" : ""}>Level ${n}</option>`)
            .join("")}
        </select>
      </div>
    `;
  });

  grid.innerHTML = html;

  // Ensure reference panel exists (and empty state)
  renderRefPanel(null, 0, 1);

  // Wire row click + "View levels" + goal change to update ref panel
  grid.querySelectorAll(".vdr-cat, .vdr-cur").forEach((el) => {
    el.addEventListener("click", () => {
      const cat = el.dataset.category;
      const cur = AppState.scores[cat] || 0;
      const goalSel = grid.querySelector(`.goal-select[data-category="${cat}"]`);
      const goal = goalSel ? parseInt(goalSel.value, 10) : Math.max(cur || 1, 1);
      renderRefPanel(cat, cur, goal);
    });
  });

  grid.querySelectorAll(".vdr-view").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const cat = btn.dataset.category;
      const cur = AppState.scores[cat] || 0;
      const goalSel = grid.querySelector(`.goal-select[data-category="${cat}"]`);
      const goal = goalSel ? parseInt(goalSel.value, 10) : Math.max(cur || 1, 1);
      renderRefPanel(cat, cur, goal);
      e.stopPropagation();
    });
  });

  grid.querySelectorAll(".goal-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const cat = sel.dataset.category;
      const cur = AppState.scores[cat] || 0;
      const goal = parseInt(sel.value, 10);
      renderRefPanel(cat, cur, goal);
    });
    sel.addEventListener("focus", () => {
      const cat = sel.dataset.category;
      const cur = AppState.scores[cat] || 0;
      const goal = parseInt(sel.value, 10);
      renderRefPanel(cat, cur, goal);
    });
  });
}

/* -------------------------
   VDR generation
--------------------------*/
function getGoalSelections() {
  const m = {};
  document.querySelectorAll(".goal-select").forEach((sel) => {
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
      if (deliverables.length === 0) {
        section += `<p>No deliverables found for the specified range.</p></div>`;
      } else {
        section += `<ul>${deliverables.map((d) => `<li>${d}</li>`).join("")}</ul></div>`;
      }
    }
    html += section;
  });

  body.innerHTML = html;
  document.getElementById("vdr-output").classList.remove("hidden");
  body.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* -------------------------
   PDF (VDR)
--------------------------*/
export function downloadVdrPdf() {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    alert("PDF library failed to load. Please check your network and reload the page.");
    return;
  }

  const goals = getGoalSelections();
  const cats = categoriesToInclude().filter((c) => goals[c]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 16;
  const lh = 7.5;
  let y = 16;

  const ventureName = (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const assessed = AppState.assessedAt ? formatLocalDateTime(AppState.assessedAt) : formatLocalDateTime(new Date());

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Venture Development Report", left, y);
  y += lh;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Venture: ${ventureName}`, left, y);
  y += lh;
  doc.text(`Generated: ${assessed}`, left, y);
  y += lh + 2;

  CATEGORY_ORDER.forEach((cat) => {
    if (!cats.includes(cat)) return;

    const cur = AppState.scores[cat] || 0;
    const goal = goals[cat];

    if (y > 265) { doc.addPage(); y = 16; }

    doc.setFont("helvetica", "bold");
    doc.text(`${cat} — Goal Level ${goal}`, left, y);
    y += lh;

    doc.setFont("helvetica", "normal");
    if (goal <= cur) {
      doc.text(`No additional deliverables required (already at Level ${cur}).`, left, y);
      y += lh;
      return;
    }

    const items = collectDeliverables(cat, cur + 1, goal);
    if (items.length === 0) {
      doc.text("No deliverables found for the specified range.", left, y);
      y += lh;
      return;
    }

    items.forEach((d) => {
      const lines = doc.splitTextToSize(`• ${d}`, 178);
      lines.forEach((line) => {
        if (y > 280) { doc.addPage(); y = 16; }
        doc.text(line, left, y);
        y += 6.2;
      });
    });
    y += 2;
  });

  const now = new Date();
  const fnameTs =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "_" +
    pad(now.getHours()) +
    pad(now.getMinutes());
  const fileSafeName = ventureName.replace(/[^\w\-]+/g, "_");
  doc.save(`${fileSafeName}_VDR_${fnameTs}.pdf`);
}
