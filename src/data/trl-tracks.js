// trl-tracks.js - per-track TRL content for the Technology (TRL) category.
// Added August 2026. Reworked November 2026: level text now comes from the BRL
// master workbook via trl-levels.generated.js; this file keeps only what the
// workbook does not carry.
//
// PROTECTED CONTENT. Same bar as readiness-levels.js (CLAUDE.md editing rule
// #1): do not edit titles, sources, or notes here without explicit sign-off
// from Brian. Level definitions, activities, and workstreams are generated —
// edit the workbook and rerun tools/make-brl-data.py instead.
//
// SHAPE. Overrides are SPARSE and merged field by field by resolveLevel() in
// src/track-content.js onto the shared general-track text in
// readiness-levels.js. Levels are joined on `level`, not array position.
//
//   levels[]      { level, title?, definition?, workstreams?: [{label, note}],
//                   activities?: [{id, label}] }
//   activities[].id  is the LITERAL score token ("5B") — exactly the string
//                    that is persisted, so there is no derivation math.
//   workstreams[]    is ordered; BARDA's canonical order is positional.
//
// TRL is definitions only (Brian, Oct 2026): no NobleReach deliverables or
// indicators on any track, and the scale is 1-9 (no level 0).
//
// SOURCES
//   general, software, hardware — DoD Technology Readiness Assessment
//     Guidebook (OUSD(R&E), February 2025; Distribution Statement A). General
//     is the short TRL definition; software and hardware add the guidebook's
//     descriptions (hardware pp. 14-15, software pp. 16-18).
//
//   therapeutics — BARDA "Integrated Technology Readiness Levels (TRLs) for
//     Medical Countermeasure Products (Drugs and Biologics)".
//     https://medicalcountermeasures.gov/trl/integrated-trls
//     Defense framing is genericized in the workbook text:
//       "threat agent"                        -> "target disease"
//       "route of threat agent challenge"     -> "route of disease challenge or exposure"
//       "medical countermeasure product"      -> "therapeutic product"
//       "scale compatible with USG requirements"
//                                             -> "scale compatible with anticipated commercial demand"
//       "correlates of protection"            -> "correlates of protection or response"
//
//   diagnostics — BARDA "Technology Readiness Levels (TRLs) for Medical
//     Countermeasure Products (Diagnostics and Medical Devices)", adapted from
//     the harmonized Quantitative TRL (Q-TRL).
//     https://medicalcountermeasures.gov/trl/trls-for-medical-devices
//     BARDA's set stops at 8; level 9 is NobleReach-drafted post-market.
//
//   device — BARDA's level boundaries with device-native content from the FDA
//     design-control pathway and NHLBI Catalyze's Therapeutic Device TRLs
//     (https://nhlbicatalyze.org/trl). Levels 3-9 are NobleReach-drafted.
//
// TRACK BOUNDARY. Diagnostics means IN VITRO diagnostics — the product acts on
// a specimen taken from the body (21 CFR 809.3). Everything else diagnostic,
// including AI imaging software and diagnostic wearables, is a device under FDA
// rules (SaMD) and belongs on the device track.

import { TRL_TRACK_LEVELS } from "./trl-levels.generated.js";

const DOD_SOURCE = "DoD Technology Readiness Assessment Guidebook (February 2025)";
const DOD_SOURCE_NOTE =
  "Levels follow the DoD Technology Readiness Assessment Guidebook, February 2025 (U.S. Government, public domain).";

// BARDA's own level titles (kept by decision, Oct 2026; the workbook omits
// them). Diagnostics and device level 9 titles are NobleReach-drafted, matching
// their NobleReach-drafted level 9 text.
const BARDA_TITLES = {
  therapeutics: {
    1: "Review of Scientific Knowledge Base",
    2: "Development of Hypotheses and Experimental Designs",
    3: "Target/Candidate Identification and Characterization of Preliminary Candidate(s)",
    4: "Candidate Optimization and Non-GLP In Vivo Demonstration of Activity and Efficacy",
    5: "Advanced Characterization of Candidate and Initiation of GMP Process Development",
    6: "GMP Pilot Lot Production, IND Submission, and Phase 1 Clinical Trial(s)",
    7: "Scale-up, Initiation of GMP Process Validation, and Phase 2 Clinical Trial(s)",
    8: "Completion of GMP Validation and Consistency Lot Manufacturing, Pivotal Animal Efficacy Studies or Clinical Trials, and FDA Approval or Licensure",
    9: "Post-Licensure and Post-Approval Activities",
  },
  diagnostics: {
    1: "Review of Scientific Knowledge",
    2: "Concept Generation and Development of Experimental Designs",
    3: "Characterization of Preliminary Candidate(s) and Feasibility Demonstration",
    4: "Optimization and Preparation for Assay, Component, and Instrument Development",
    5: "Product Development — Reagents, Components, Subsystems, and Modules",
    6: "System Integration and Testing",
    7: "Analytical Verification and Preparation for Clinical Studies",
    8: "Clinical Studies and/or Evaluation with Animal Studies, FDA Clearance or Approval, Finalize GMP Manufacturing Preparations",
    9: "Post-Market Activities and Commercial Scale-Up",
  },
  device: {
    1: "Review of Scientific Knowledge",
    2: "Concept Generation and Development of Experimental Designs",
    3: "Characterization of Preliminary Candidate(s) and Feasibility Demonstration",
    4: "Optimization and Preparation for Component and System Development",
    5: "Product Development — Components, Subsystems, and Modules",
    6: "System Integration and Testing",
    7: "Design Verification and Preparation for Clinical Studies",
    8: "Clinical Studies and/or Evaluation with Animal Studies, FDA Clearance or Approval, Finalize Manufacturing Preparations",
    9: "Post-Market Activities and Commercial Scale-Up",
  },
};

function withTitles(track) {
  const titles = BARDA_TITLES[track];
  return TRL_TRACK_LEVELS[track].map((lvl) => ({ ...lvl, title: titles[lvl.level] }));
}

export const TRL_TRACK_CONTENT = {
  // The general track overrides nothing: its text is the shared Technology
  // content in readiness-levels.js. It is declared for provenance and the hint.
  general: {
    label: "General",
    source: DOD_SOURCE,
    sourceNote: DOD_SOURCE_NOTE,
    trackHint: "General-purpose and dual-use technologies.",
    levels: [],
  },
  software: {
    label: "Software",
    source: DOD_SOURCE,
    sourceNote: DOD_SOURCE_NOTE,
    trackHint: "Software, algorithms, and digital products.",
    levels: TRL_TRACK_LEVELS.software,
  },
  hardware: {
    label: "Hardware",
    source: DOD_SOURCE,
    sourceNote: DOD_SOURCE_NOTE,
    trackHint: "Physical products, devices, and instrumentation.",
    levels: TRL_TRACK_LEVELS.hardware,
  },

  therapeutics: {
    label: "Therapeutics",
    source: "BARDA Integrated TRLs for Medical Countermeasure Products (Drugs and Biologics)",
    sourceNote:
      "Levels follow BARDA's medical-countermeasure TRLs for drugs and biologics (U.S. Government, public domain). A level is reached only once every activity at that level is complete.",
    trackHint:
      "Drugs and biologics — small molecules, biologics, vaccines, cell and gene therapies.",
    levels: withTitles("therapeutics"),
  },

  diagnostics: {
    label: "Diagnostics",
    source: "BARDA TRLs for Medical Countermeasure Products (Diagnostics and Medical Devices), adapted from the harmonized Q-TRL",
    sourceNote:
      "Levels follow BARDA's Q-TRL definitions for diagnostics (U.S. Government, public domain). BARDA's set ends at TRL 8 with FDA clearance or approval; level 9 covers post-market activity.",
    trackHint:
      "In vitro diagnostics — assays, reagents, instruments, and software acting on a specimen taken from the body. Imaging AI and diagnostic wearables belong on the medical device track.",
    levels: withTitles("diagnostics"),
  },

  device: {
    label: "Medical device",
    source:
      "BARDA Q-TRL level boundaries with device-native content (FDA design controls; NHLBI Catalyze Therapeutic Device TRLs)",
    sourceNote:
      "Level boundaries follow BARDA's Q-TRL set for devices (U.S. Government, public domain), with device-specific content in place of BARDA's diagnostics wording. BARDA's set ends at TRL 8 with FDA clearance or approval; level 9 covers post-market activity.",
    trackHint:
      "Devices that act on the patient — implants, catheters, instruments, imaging hardware, wearables, and diagnostic or therapeutic software (SaMD). Specimen-based tests belong on the diagnostics track.",
    levels: withTitles("device"),
  },
};
