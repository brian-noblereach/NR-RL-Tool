// attributions.js - licensing and source-attribution notices.
// Added August 2026.
//
// PROTECTED CONTENT. This is legal and licensing text. Do not reword, shorten,
// or restructure it without explicit sign-off from Brian. Two passages in
// particular are load-bearing: the copyright scope (what the © covers, and what
// it deliberately does not) and the KTH paragraph, which credits an influence
// WITHOUT asserting that the BRLs are an adaptation of KTH's material.
//
// Single source of truth: the attributions modal (index.html/main.js) and the
// assessment PDF footer (pdf-export.js) both render from here so they cannot
// drift apart.
//
// ---------------------------------------------------------------------------
// Why the KTH wording is careful
//
// The KTH Innovation Readiness Level™ is licensed CC BY-NC-SA 4.0. Its
// ShareAlike term binds *adaptations*: an adaptation must carry the same
// license. The NobleReach BRLs are registered under CC BY-NC-SA 4.0, so the
// ShareAlike obligation would be satisfied either way — but claiming to be an
// adaptation when the level text is independently authored would overstate the
// relationship, and linking KTH's license deed here would imply derivation.
//
// The assessed position is independent expression: what the two frameworks
// share is the *method* (scoring a venture independently across several
// readiness dimensions on a nine-grade scale), which is a system rather than
// protectable expression, plus a handful of short functional dimension names.
// The level text, the 0-9 scale, and the title/definition/deliverables/
// indicators structure are NobleReach's own. Where the two are most alike —
// the Technology dimension — both trace independently to NASA's public-domain
// TRL definitions.
// ---------------------------------------------------------------------------

// What is and is not covered
//
// Copyright subsists in the *written text* — the category descriptions, level
// definitions, deliverables, and indicators. It does not subsist in the term
// "Business Readiness Levels", which is a short name, nor in the framework's
// underlying method (scoring a venture independently across dimensions on a
// nine-grade scale), which is a system and expressly outside copyright under
// 17 U.S.C. § 102(b). The notice below is scoped accordingly.
//
// This is the same line drawn in the KTH acknowledgment further down: we cannot
// argue KTH's method is unprotectable and then claim our own framework as
// copyright. If NobleReach holds or asserts trademark rights in the BRL name,
// that is a separate notice and is deliberately not asserted here — add it only
// on instruction.
export const BRL_LICENSE = {
  holder: "NobleReach Foundation",
  name: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International",
  shortName: "CC BY-NC-SA 4.0",
  url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  summary:
    "The text of the NobleReach Business Readiness Levels (BRL) — the category descriptions, level definitions, deliverables, and indicators — is © NobleReach Foundation and is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0).",
  scopeNote:
    "This covers the written content. It is not a claim of copyright in the name “Business Readiness Levels” or in the framework's underlying method of assessing readiness across independent dimensions.",
  terms: [
    "Attribution — you must give appropriate credit, provide a link to the license, and indicate if changes were made.",
    "NonCommercial — you may not use the material for commercial purposes.",
    "ShareAlike — if you remix, transform, or build upon the material, you must distribute your contributions under the same license.",
  ],
};

export const SOURCE_ATTRIBUTIONS = [
  {
    id: "nasa",
    heading: "Technology Readiness Levels — general, software, and hardware tracks",
    url: "https://www.nasa.gov/directorates/somd/space-communications-navigation-program/technology-readiness-levels/",
    urlLabel: "nasa.gov",
    body: [
      "The TRL category's general, software, and hardware tracks adopt the NASA Technology Readiness Level definitions (TRL 1–9), which remain the common anchor for readiness conversations with federal agencies and university partners.",
      "NASA TRL definitions are a work of the U.S. Government and are in the public domain. NASA does not endorse this tool.",
    ],
  },
  {
    id: "barda",
    heading: "Technology Readiness Levels — life-sciences tracks",
    url: "https://medicalcountermeasures.gov/trl",
    urlLabel: "medicalcountermeasures.gov/trl",
    body: [
      "The TRL category's therapeutics track follows BARDA's “Integrated Technology Readiness Levels for Medical Countermeasure Products (Drugs and Biologics),” which is itself based on the October 2004 DOD Medical TRLs and the May 2008 HHS PHEMCE TRLs. Level text is reproduced closely, with BARDA's biodefense framing generalized to a therapeutic-development context.",
      "The diagnostics track follows BARDA's “Technology Readiness Levels for Medical Countermeasure Products (Diagnostics and Medical Devices),” adapted from the harmonized Quantitative TRL (Q-TRL). The medical device track keeps that document's level boundaries but substitutes device-specific content — FDA design controls, verification and validation, and the IDE/510(k)/De Novo/PMA pathway — in place of BARDA's diagnostics wording, informed by the NHLBI Catalyze Therapeutic Device readiness levels.",
      "BARDA's set runs to TRL 8, which ends at FDA clearance or approval; level 9 on both tracks is NobleReach's own addition covering post-market activity.",
      "BARDA and NHLBI materials are works of the U.S. Government and are in the public domain. Neither BARDA, HHS, nor NIH endorses this tool, and nothing here is FDA guidance or regulatory advice.",
    ],
  },
  {
    id: "kth",
    heading: "Acknowledgment — KTH Innovation Readiness Level™",
    url: "https://kthinnovationreadinesslevel.com/",
    urlLabel: "kthinnovationreadinesslevel.com",
    body: [
      "The BRL framework's multi-dimensional approach — assessing a venture independently across several readiness dimensions on a nine-level scale, diagnostically rather than as a single composite score — was inspired in part by the KTH Innovation Readiness Level™, developed by KTH Innovation at KTH Royal Institute of Technology.",
      "The NobleReach BRL category set, level definitions, deliverables, and indicators are independently authored and are not derived from KTH's materials. KTH Innovation Readiness Level™ is a trademark of KTH Innovation, which does not endorse this tool.",
    ],
  },
];

// Short form for the welcome modal, which both the internal workspace and the
// external stepper show on first visit and again via the Help button. This is
// where the source credits become *visible* rather than one click away — the
// footer carries the license, the modal carries the detail, this carries the
// summary a new advisor actually reads.
export const ABOUT_FRAMEWORK = {
  heading: "About this framework",
  body: [
    "The Business Readiness Levels are © NobleReach Foundation and licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0). The copyright covers the written level definitions, deliverables, and indicators — not the framework's name or its underlying method.",
    "Technology Readiness Level definitions come from NASA for the general, software, and hardware tracks, and from BARDA for the diagnostics, medical device, and therapeutics tracks. Both are U.S. Government works in the public domain, and neither agency endorses this tool.",
    "The multi-dimensional approach — scoring a venture independently across several readiness dimensions rather than as one composite score — was inspired in part by the KTH Innovation Readiness Level™, developed by KTH Innovation. The BRL level text is independently authored.",
  ],
  linkLabel: "Full attributions & license",
};

// Compact form for the assessment PDF footer. Kept to single lines that fit the
// page width without wrapping surprises.
export const EXPORT_ATTRIBUTION_LINES = [
  "Business Readiness Levels text (level definitions, deliverables, indicators) © NobleReach",
  "Foundation, licensed CC BY-NC-SA 4.0 (creativecommons.org/licenses/by-nc-sa/4.0/):",
  "Attribution, NonCommercial, ShareAlike. TRL definitions adapted from NASA (general tracks)",
  "and BARDA/HHS (life-sciences tracks), both U.S. Government works in the public domain.",
  "Multi-dimensional readiness approach inspired in part by the KTH Innovation Readiness",
  "Level™, KTH Innovation.",
];

// One-line form for the site footer. Names the material, not the framework, so
// the footer does not read as a copyright claim in the term itself.
export const FOOTER_NOTICE = `BRL framework text © ${BRL_LICENSE.holder} · ${BRL_LICENSE.shortName}`;
