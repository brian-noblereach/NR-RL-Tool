// constants.js
// Health term mapping (HX now lives in readiness-levels.js as healthExtras per level)
// Updated April 2026

// Portfolio options for Smartsheet integration
// Keep aligned with Qualification Tool v02 portfolio dropdown
// Add new portfolios here as needed
export const PORTFOLIOS = [
  { value: "Northeastern CRI - 2026", label: "Northeastern CRI - 2026" },
  { value: "Penn State GAP - 2026", label: "Penn State GAP - 2026" },
  { value: "Other", label: "Other" }
];

export const HEALTH_TERM_MAP = [
  { from: /\busers?\b/gi, to: (m) => (m[0] === m[0].toUpperCase() ? "Patients" : "patients") },
  { from: /\bend[- ]?users?\b/gi, to: (m) => (m[0] === m[0].toUpperCase() ? "Patients" : "patients") },
  { from: /\bcustomers?\b/gi, to: (m) => (m[0] === m[0].toUpperCase() ? "Providers or payers" : "providers or payers") },
  { from: /\bmarket[- ]?fit\b/gi, to: "clinical and economic fit" },
  { from: /\bproduct[- ]?market[- ]?fit\b/gi, to: "clinical and economic fit" },
  { from: /\bMVP\b/g, to: "clinical prototype" },
  { from: /\bbeta\b/gi, to: "clinical prototype" },
  { from: /\bpilot studies?\b/gi, to: "clinical studies" },
  { from: /\bpilots?\b/gi, to: "clinical studies" },
  { from: /\bfeedback\b/gi, to: "clinical evidence and feedback" },
  { from: /\busage\b/gi, to: "patient outcomes and usage" },
  { from: /\bpricing\b/gi, to: "pricing and reimbursement" },
  { from: /\brevenue\b/gi, to: "reimbursement and revenue" },
];
