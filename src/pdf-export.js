// pdf-export.js – assessment PDF snapshot.
// Shared by the internal review modal and the external guided stepper so both
// produce an identical scores (+ optional commentary) PDF with no Smartsheet
// dependency. jsPDF is loaded globally via a <script> tag in index.html.

import { AppState } from "./state.js";
import { readinessData } from "./data/index.js";
import {
  getSubmissionReadiness,
  normalizeCommentary,
  getActiveSubmissionCategories,
  SUBMISSION_CATEGORY_ORDER,
} from "./submission-requirements.js";
import { stampAssessedNow } from "./ui.js";

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

function buildSnapshotRows() {
  const allowed = new Set(getActiveSubmissionCategories(AppState, readinessData));
  const rows = [];
  SUBMISSION_CATEGORY_ORDER.forEach(cat => {
    if (!readinessData[cat] || !allowed.has(cat)) return;
    rows.push({ category: cat, level: AppState.scores[cat] != null ? AppState.scores[cat] : "-" });
  });
  return rows;
}

function addWrappedPdfText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  lines.forEach(line => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function ensurePdfSpace(doc, y, needed = 20) {
  if (y + needed <= 280) return y;
  doc.addPage();
  return 20;
}

export function savePdfSnapshot(options = {}) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    alert("PDF library failed to load. Please check your network and reload the page.");
    return;
  }
  if (!AppState.assessedAt) stampAssessedNow();

  const ventureName = (AppState.ventureName && AppState.ventureName.trim()) || "(unnamed venture)";
  const assessmentNumber = parseInt(AppState.currentAssessmentNumber, 10) || 1;
  const readiness = getSubmissionReadiness(AppState, readinessData);
  const commentary = normalizeCommentary(AppState.commentary);
  const includeCommentary = options.includeCommentary !== false;
  const showPartialWarning = Boolean(options.showPartialWarning && readiness.missingScores.length > 0);
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
  doc.text(`Assessment #: ${assessmentNumber}`, left, y);
  y += lh;
  doc.text(`Assessed: ${assessed}`, left, y);
  y += lh + 2;

  if (showPartialWarning) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(154, 52, 18);
    y = addWrappedPdfText(
      doc,
      `Partial assessment: ${readiness.missingScores.length} active ${readiness.missingScores.length === 1 ? "category is" : "categories are"} unscored (${readiness.missingScores.join(", ")}).`,
      left,
      y,
      178,
      6
    );
    doc.setTextColor(0);
    y += 2;
  }

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

  // Per-category notes (external flow). Internal mode never populates
  // categoryNotes, so this section simply doesn't appear there. Included for
  // both first and follow-up assessments since notes are scoring justifications.
  const noteRows = getActiveSubmissionCategories(AppState, readinessData)
    .map((cat) => [cat, String((AppState.categoryNotes && AppState.categoryNotes[cat]) || "").trim()])
    .filter(([, note]) => note);

  if (noteRows.length > 0) {
    y = ensurePdfSpace(doc, y + 6, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Category Notes", left, y);
    y += lh;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    noteRows.forEach(([cat, note]) => {
      y = ensurePdfSpace(doc, y, 18);
      doc.setFont("helvetica", "bold");
      doc.text(`${cat}:`, left, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      y = addWrappedPdfText(doc, note, left, y, 178, 5);
      y += 2;
    });
  }

  if (includeCommentary) {
    const commentaryRows = [
      ["Founder coachability", commentary.coachability],
      ["Interest in forming a startup", commentary.startupInterest],
      ["Call notes, milestone ideas, and task ideas", commentary.callNotes],
    ].filter(([, value]) => value);

    y = ensurePdfSpace(doc, y + 6, commentaryRows.length > 0 ? 34 : 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Assessment Commentary", left, y);
    y += lh;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    if (commentaryRows.length === 0) {
      doc.text("No commentary provided.", left, y);
      y += lh;
    } else {
      commentaryRows.forEach(([label, value]) => {
        y = ensurePdfSpace(doc, y, 18);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, left, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        y = addWrappedPdfText(doc, value, left, y, 178, 5);
        y += 2;
      });
    }
  }

  // Footer
  y = ensurePdfSpace(doc, y + lh, 12);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Generated by NobleReach Readiness Level Assessment Tool (Pilot v0.5)", left, y);

  const now = new Date();
  const fnameTs = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const fileSafeName = ventureName.replace(/[^\w\-]+/g, "_");
  doc.save(`${fileSafeName}_A${assessmentNumber}_${fnameTs}.pdf`);
}
