
// main.js - entry point & event wiring (additions marked NEW)
import { AppState } from "./state.js";
import { initializeCategories, updateCategoryDisplay } from "./categories.js";
import { updateSummary } from "./summary.js";
import {
  updateIndustrySelectorUI,
  toggleMinimizeSummaryPanel,
  toggleMaximizeSummaryPanel,
  closeMaximizedPanel,
  renderAssessedAt,
  stampAssessedNow,
} from "./ui.js";

// NEW: VDR imports
import { enterVdr, exitVdr, renderVdrGoals, generateVdr, downloadVdrPdf } from "./vdr.js";


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
  return AppState.isHealthRelated ? all : all.filter((c) => c !== "Regulatory");
}

function buildSnapshotRows() {
  // Build rows in fixed order, but only include categories present + allowed
  const allowed = new Set(categoriesToInclude());
  const rows = [];
  CATEGORY_ORDER.forEach((cat) => {
    if (!readinessData[cat] || !allowed.has(cat)) return;
    const lvl = AppState.scores[cat] || "-";
    rows.push({ category: cat, level: lvl });
  });
  return rows;
}

/* -------------------------
   PDF Export (name + timestamp + levels)
--------------------------*/
function savePdfSnapshot() {
  // Ensure jsPDF is available
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    alert("PDF library failed to load. Please check your network and reload the page.");
    return;
  }

  // Ensure we have a timestamp (if none yet, stamp now)
  if (!AppState.assessedAt) {
    stampAssessedNow();
  }

  const ventureName =
    (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const assessed = AppState.assessedAt
    ? formatLocalDateTime(AppState.assessedAt)
    : "—";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 16;
  let y = 20;
  const lh = 8; // line height

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NobleReach Readiness Level Snapshot", left, y);
  y += lh + 2;

  // Meta
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

  // Rows
  doc.setFont("helvetica", "normal");
  const rows = buildSnapshotRows();
  rows.forEach((r) => {
    // Simple page break guard
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

  // Filename: ventureName_YYYYMMDD_HHmm.pdf
  const now = new Date();
  const fnameTs =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    "_" +
    pad(now.getHours()) +
    pad(now.getMinutes());
  const fileSafeName = ventureName.replace(/[^\w\-]+/g, "_");
  const filename = `${fileSafeName}_${fnameTs}.pdf`;

  doc.save(filename);
}

/* -------------------------
   Bootstrap
--------------------------*/
// main.js (only the initializeApp function changes below)

function initializeApp() {
  initializeCategories();
  updateSummary();

  // Initialize meta UI based on state (ventureName, assessedAt)
  const nameInput = document.getElementById("venture-name");
  if (nameInput) {
    nameInput.value = AppState.ventureName || "";
  }

  // NEW: start the summary panel minimized so it doesn't get in the way
  const panel = document.getElementById("summary-panel");
  const minimizeBtn = document.getElementById("minimize-btn");
  if (panel && !panel.classList.contains("maximized")) {
    panel.classList.add("minimized");
    if (minimizeBtn) minimizeBtn.textContent = "+";
  }

  renderAssessedAt(); // shows "—" until set
}


function setupEventListeners() {
	const btnCreateVdr = document.getElementById("btn-create-vdr");
	if (btnCreateVdr) {
		btnCreateVdr.addEventListener("click", () => {
			enterVdr();        // hide main app, show VDR screen
			renderVdrGoals();  // (redundant but safe if you want to refresh)
    });
  }
  const btnVdrBack = document.getElementById("vdr-back");
  if (btnVdrBack) btnVdrBack.addEventListener("click", exitVdr);

  const btnVdrGen = document.getElementById("vdr-generate");
  if (btnVdrGen) btnVdrGen.addEventListener("click", generateVdr);

  const btnVdrPdf = document.getElementById("vdr-download-pdf");
  if (btnVdrPdf) btnVdrPdf.addEventListener("click", downloadVdrPdf);
  // Health-related toggle
  document.getElementById("health-related").addEventListener("change", (e) => {
    AppState.isHealthRelated = e.target.checked;

    const note = document.getElementById("health-mode-note");
    if (note) note.classList.toggle("hidden", !AppState.isHealthRelated);

    updateIndustrySelectorUI({ forceDefaultOnEnable: true });
    initializeCategories();
    updateSummary();
  });

  // View toggle buttons
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const view = e.target.dataset.view;
      AppState.currentView = view;
      document
        .querySelectorAll(".view-btn")
        .forEach((b) => b.classList.toggle("active", b.dataset.view === view));
      if (AppState.currentCategory) updateCategoryDisplay();
    });
  });

  // Technology subtrack selector
  document
    .getElementById("industry-select")
    .addEventListener("change", updateCategoryDisplay);

  // Summary panel controls
  document
    .getElementById("minimize-btn")
    .addEventListener("click", toggleMinimizeSummaryPanel);
  document
    .getElementById("maximize-btn")
    .addEventListener("click", toggleMaximizeSummaryPanel);

  // Panel overlay click to close maximized view
  document
    .getElementById("panel-overlay")
    .addEventListener("click", closeMaximizedPanel);

  // ESC key to close maximized panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMaximizedPanel();
  });

  // NEW: Venture name binding
  const nameInput = document.getElementById("venture-name");
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      AppState.ventureName = e.target.value;
    });
  }

  // NEW: Save PDF button
  const btnPdf = document.getElementById("btn-export-pdf");
  if (btnPdf) {
    btnPdf.addEventListener("click", savePdfSnapshot);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventListeners();
});
