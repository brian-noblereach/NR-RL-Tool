// constants.js
// Health term mapping + level-specific health extras (HX)
// Updated December 2024 - Aligned with revised definitions

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

// Level-specific health additions (sparse, unique per level)
// These add clinical/regulatory context to base definitions when health mode is enabled
export const HX = {
  IP: {
    1: { indicators: ["Awareness of clinical IP landscape for target indication"], deliverables: ["IP landscape scan for target indication"] },
    2: { indicators: ["Provisional scope includes clinical claims"], deliverables: ["Provisional draft with clinical claim language"] },
    3: { indicators: ["Initial clinical FTO questions articulated"], deliverables: ["Preliminary FTO notes"] },
    4: { indicators: ["Claims strategy aligned to clinical endpoints"], deliverables: ["Claims strategy outline"] },
    5: { indicators: ["Patent scope supports clinical endpoints"], deliverables: ["Non-provisional with clinical claims"] },
    6: { indicators: ["FTO diligence initiated for intended clinical use"], deliverables: ["FTO memo for clinical application"] },
    7: { indicators: ["FTO supports intended clinical use"], deliverables: ["Multi-jurisdiction clinical IP strategy"] },
    8: { indicators: ["Portfolio covers key clinical applications"], deliverables: ["Portfolio strategy for clinical labeling"] },
    9: { indicators: ["IP position supports labeling and reimbursement"], deliverables: ["Enforcement strategy for clinical market"] },
  },

  Technology_device: {
    1: { indicators: ["Intended use and risk class hypothesis documented"], deliverables: ["Intended use & risk class note"] },
    2: { indicators: ["Initial IEC/ISO requirements identified"], deliverables: ["Standards & bench test matrix"] },
    3: { indicators: ["Preliminary DFMEA/HFMEA started"], deliverables: ["Risk analysis draft"] },
    4: { indicators: ["Bench test protocols approved"], deliverables: ["Bench test plan"] },
    5: { indicators: ["Design inputs traceability established"], deliverables: ["Traceability matrix"] },
    6: { indicators: ["Verification plan aligns to standards"], deliverables: ["V&V plan"] },
    7: { indicators: ["First-in-human/feasibility study planned"], deliverables: ["Clinical protocol synopsis (device)"] },
    8: { indicators: ["Clinical validation underway for intended use"], deliverables: ["Interim clinical evidence (device)"] },
    9: { indicators: ["V&V complete and meets clinical performance"], deliverables: ["V&V report package"] },
  },

  Technology_pharma: {
    1: { indicators: ["Target Product Profile (TPP) drafted"], deliverables: ["TPP v0"] },
    2: { indicators: ["IND-enabling study needs outlined"], deliverables: ["Preclinical plan"] },
    3: { indicators: ["Dose/formulation strategy defined"], deliverables: ["Formulation concept"] },
    4: { indicators: ["GLP study protocols planned"], deliverables: ["GLP plan"] },
    5: { indicators: ["Preclinical evidence generated"], deliverables: ["Preclinical data package"] },
    6: { indicators: ["Clinical development plan defined"], deliverables: ["Clinical development plan (CDP)"] },
    7: { indicators: ["Phase I protocol drafted"], deliverables: ["Phase I synopsis"] },
    8: { indicators: ["Early clinical data demonstrates safety"], deliverables: ["Phase I results/interim"] },
    9: { indicators: ["Efficacy evidence aligned to approval pathway"], deliverables: ["Phase II/III plan or results"] },
  },

  Market: {
    1: { indicators: ["Patient population and unmet need quantified"], deliverables: ["Clinical problem/need brief"] },
    2: { indicators: ["HCP workflow mapping initiated"], deliverables: ["Provider workflow map (draft)"] },
    3: { indicators: ["Site feasibility signals gathered"], deliverables: ["Site interviews summary"] },
    4: { indicators: ["Value hypothesis tested with providers"], deliverables: ["Value proposition test summary"] },
    5: { indicators: ["Payer value drivers validated"], deliverables: ["Payer research summary"] },
    6: { indicators: ["Early adopter sites identified"], deliverables: ["Site pipeline"] },
    7: { indicators: ["Multi-site adoption pattern emerging"], deliverables: ["Adoption metrics across sites"] },
    8: { indicators: ["Coverage path identified with payers"], deliverables: ["Coverage strategy brief"] },
    9: { indicators: ["Outcomes drive adoption across segments"], deliverables: ["Outcomes evidence summary"] },
  },

  Product: {
    1: { indicators: ["Concept demonstrably ties to clinical need"], deliverables: ["Clinical prototype concept note"] },
    2: { indicators: ["Clinical usability goals defined"], deliverables: ["Usability goals document"] },
    3: { indicators: ["Usability risk analysis drafted"], deliverables: ["Risk analysis by clinical use case"] },
    4: { indicators: ["Formative usability sessions scheduled"], deliverables: ["Formative usability plan"] },
    5: { indicators: ["Formative usability evidence collected"], deliverables: ["Formative usability report"] },
    6: { indicators: ["Design updated from clinical usability findings"], deliverables: ["Design iteration log (clinical)"] },
    7: { indicators: ["Summative usability plan approved"], deliverables: ["Summative usability plan"] },
    8: { indicators: ["Summative usability completed; criteria met"], deliverables: ["Summative usability report"] },
    9: { indicators: ["Product supports endpoint capture in clinical setting"], deliverables: ["Clinical data capture capability"] },
  },

  Team: {
    1: { indicators: ["KOL identified and engaged"], deliverables: ["KOL interview notes"] },
    2: { indicators: ["PI/site relationship initiated"], deliverables: ["PI/site contact list"] },
    3: { indicators: ["Clinical advisory panel forming"], deliverables: ["Advisory roster"] },
    4: { indicators: ["Medical director or equivalent engaged"], deliverables: ["Role description & commitment"] },
    5: { indicators: ["Regulatory/QA expertise added"], deliverables: ["RA/QA advisor or hire"] },
    6: { indicators: ["Clinical operations partner identified"], deliverables: ["CRO/operations plan"] },
    7: { indicators: ["Trial management capability in place"], deliverables: ["Trial management SOPs"] },
    8: { indicators: ["Experienced leadership executing clinical plan"], deliverables: ["Clinical org chart"] },
    9: { indicators: ["Team executed pivotal/registrational stage work"], deliverables: ["Track record summary"] },
  },

  "Go-to-Market": {
    1: { indicators: ["Initial site access conversations"], deliverables: ["Site access plan"] },
    2: { indicators: ["Pilot site criteria drafted"], deliverables: ["Site selection criteria"] },
    3: { indicators: ["MoUs with at least one site"], deliverables: ["Site MoUs"] },
    4: { indicators: ["Operational plan for in-clinic deployment"], deliverables: ["Deployment plan"] },
    5: { indicators: ["Provider champion identified at site"], deliverables: ["Champion brief"] },
    6: { indicators: ["Early adoption at initial site(s)"], deliverables: ["Early adoption report"] },
    7: { indicators: ["Expansion to multiple sites underway"], deliverables: ["Scale plan"] },
    8: { indicators: ["Payer engagement in progress"], deliverables: ["Payer meeting notes"] },
    9: { indicators: ["Pathway established across sites and payers"], deliverables: ["Commercial playbook (clinical)"] },
  },

  Business: {
    1: { indicators: ["HIPAA/GxP risks recognized"], deliverables: ["Compliance outline"] },
    2: { indicators: ["QMS plan drafted"], deliverables: ["QMS plan"] },
    3: { indicators: ["Vendor qualification approach defined"], deliverables: ["Vendor list & criteria"] },
    4: { indicators: ["Process controls for clinical work implemented"], deliverables: ["Process SOPs"] },
    5: { indicators: ["Clinical ops budget and timeline approved"], deliverables: ["Ops budget & schedule"] },
    6: { indicators: ["Quality system operating"], deliverables: ["QMS evidence"] },
    7: { indicators: ["Clinical operations running to plan"], deliverables: ["Ops reports"] },
    8: { indicators: ["Audit/readiness checks performed"], deliverables: ["Audit report"] },
    9: { indicators: ["Operational maturity supports filings/scale"], deliverables: ["Readiness dossier"] },
  },

  Funding: {
    1: { indicators: ["Use of proceeds includes clinical validation"], deliverables: ["Seed budget with clinical line items"] },
    2: { indicators: ["Runway covers preclinical/feasibility"], deliverables: ["Budget for early studies"] },
    3: { indicators: ["Capital plan for IND or device studies"], deliverables: ["Milestone-based plan"] },
    4: { indicators: ["Funding allocated to trials"], deliverables: ["Clinical program budget"] },
    5: { indicators: ["Runway sufficient for submissions"], deliverables: ["Submission costs in model"] },
    6: { indicators: ["Investors diligencing clinical strategy"], deliverables: ["DD materials (clinical)"] },
    7: { indicators: ["Capital secured for clinical program"], deliverables: ["Term sheet/funding docs"] },
    8: { indicators: ["Funding tied to clinical outcome milestones"], deliverables: ["Milestone schedule"] },
    9: { indicators: ["Financing supports scale & post-market evidence"], deliverables: ["Scale-evidence plan"] },
  },

  Regulatory: {
    1: { indicators: ["Regulatory landscape & pathway hypothesis"], deliverables: ["Pathway brief"] },
    2: { indicators: ["Pre-sub/Type B meeting considered"], deliverables: ["Briefing package outline"] },
    3: { indicators: ["Testing protocol needs mapped to pathway"], deliverables: ["Testing matrix"] },
    4: { indicators: ["Pre-sub/Type B meeting completed"], deliverables: ["Meeting minutes"] },
    5: { indicators: ["Submission plan & timeline defined"], deliverables: ["Submission plan"] },
    6: { indicators: ["Submission in preparation"], deliverables: ["Module drafts"] },
    7: { indicators: ["Submission filed"], deliverables: ["Filed submission"] },
    8: { indicators: ["Agency interactions underway"], deliverables: ["IR/deficiency response drafts"] },
    9: { indicators: ["Clearance/approval achieved"], deliverables: ["Approval package"] },
  },
};
