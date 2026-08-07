// trl-tracks.js - per-track TRL content for the Technology (TRL) category.
// Added August 2026.
//
// PROTECTED CONTENT. Same bar as readiness-levels.js (CLAUDE.md editing rule
// #1): do not edit titles, definitions, workstreams, activities, deliverables,
// or indicators here without explicit sign-off from Brian.
//
// SHAPE. Overrides are SPARSE and merged field by field by resolveLevel() in
// src/track-content.js. Any field a level omits falls back to the shared NASA
// content in readiness-levels.js, so a future edit to the shared text still
// reaches every track that did not override it. Levels are joined on `level`,
// not array position, so a track may skip levels entirely.
//
//   levels[]      { level, title?, definition?, deliverables?, indicators?,
//                   workstreams?: [{label, note}], activities?: [{id, label}] }
//   activities[].id  is the LITERAL score token ("5B") — exactly the string
//                    that is persisted, so there is no derivation math.
//   workstreams[]    is ordered; BARDA's canonical order is positional.
//
// Level content is interpolated raw into the level cards, matching how
// readiness-levels.js is rendered. Any literal < > & must be entity-encoded here.
//
// SOURCES
//   therapeutics — BARDA "Integrated Technology Readiness Levels (TRLs) for
//     Medical Countermeasure Products (Drugs and Biologics)", based on the
//     October 2004 DOD Medical TRLs and May 2008 HHS PHEMCE TRLs.
//     https://medicalcountermeasures.gov/trl/integrated-trls
//     Transcribed near-verbatim. BARDA writes for biodefense, so defense
//     framing is genericized and nothing else is changed:
//       "threat agent"                        -> "target disease"
//       "route of threat agent challenge"     -> "route of disease challenge or exposure"
//       "medical countermeasure product"      -> "therapeutic product"
//       "scale compatible with USG requirements"
//                                             -> "scale compatible with anticipated commercial demand"
//       "correlates of protection"            -> "correlates of protection or response"
//       "Animal Rule" / EUA footnote markers  -> dropped (footnotes are not rendered)
//
//   diagnostics — BARDA "Technology Readiness Levels (TRLs) for Medical
//     Countermeasure Products (Diagnostics and Medical Devices)", adapted from
//     the harmonized Quantitative TRL (Q-TRL).
//     https://medicalcountermeasures.gov/trl/trls-for-medical-devices
//     Transcribed near-verbatim for TRL 1-8. BARDA's set stops at 8; level 9 is
//     newly drafted as post-market, mirroring the drugs TRL 9, so that FDA
//     clearance sits at 8 and post-market at 9 on all three life-sciences tracks.
//
//   device — BARDA's device doc is the combined diagnostics set above and its
//     text is diagnostics-native (reagents, assays, diagnostic targets), so
//     using it verbatim would make this track read like a diagnostics track.
//     This track therefore keeps BARDA's level boundaries and level intent but
//     substitutes device-native content, drawn from the FDA design-control
//     pathway BARDA's own doc references (pre-IDE meeting, Design History File)
//     and from NHLBI Catalyze's separate Therapeutic Device TRLs
//     (https://nhlbicatalyze.org/trl). Levels 3-9 are newly drafted.
//
// TRACK BOUNDARY. Diagnostics means IN VITRO diagnostics — the product acts on
// a specimen taken from the body (21 CFR 809.3). Everything else diagnostic,
// including AI imaging software and diagnostic wearables, is a device under FDA
// rules (SaMD) and belongs on the device track.

export const TRL_TRACK_CONTENT = {
  therapeutics: {
    label: "Therapeutics",
    source: "BARDA Integrated TRLs for Medical Countermeasure Products (Drugs and Biologics)",
    sourceNote:
      "This track follows BARDA's medical-countermeasure TRL definitions (drugs and biologics) rather than the NASA TRLs used by the general, software, and hardware tracks. A level is reached only once every activity listed at that level is complete.",
    trackHint:
      "Drugs and biologics — small molecules, biologics, vaccines, cell and gene therapies.",
    levels: [
      // Level 0 intentionally omitted: falls back to the shared
      // "No Technical Activity" plus indicators.therapeutics.
      {
        level: 1,
        title: "Review of Scientific Knowledge Base",
        definition:
          "Active monitoring of scientific knowledge base. Scientific findings are reviewed and assessed as a foundation for characterizing new technologies.",
        deliverables: ["Literature and knowledge-base review", "Scientific rationale memo"],
      },
      {
        level: 2,
        title: "Development of Hypotheses and Experimental Designs",
        definition:
          "Scientific \"paper studies\" to generate research ideas, hypotheses, and experimental designs for addressing the related scientific issues. Focus on practical applications based on basic principles observed. Use of computer simulation or other virtual platforms to test hypotheses.",
        deliverables: ["Research hypotheses", "Experimental design package", "Target Product Profile (draft v0)"],
      },
      {
        level: 3,
        title: "Target/Candidate Identification and Characterization of Preliminary Candidate(s)",
        definition:
          "Begin research, data collection, and analysis to test hypothesis. Explore alternative concepts, identify and evaluate critical technologies and components, and begin characterization of candidate(s). Preliminary efficacy demonstrated in vivo.",
        deliverables: ["Candidate characterization report", "In vitro activity data", "Non-GLP in vivo proof-of-concept data"],
        activities: [
          { id: "3A", label: "Identify target and/or candidate." },
          {
            id: "3B",
            label:
              "Demonstrate in vitro activity of candidate(s) to counteract the effects of the target disease.",
          },
          {
            id: "3C",
            label:
              "Generate preliminary in vivo proof-of-concept efficacy data (non-GLP (Good Laboratory Practice)).",
          },
        ],
      },
      {
        level: 4,
        title: "Candidate Optimization and Non-GLP In Vivo Demonstration of Activity and Efficacy",
        definition:
          "Integration of critical technologies for candidate development. Initiation of animal model development. Non-GLP in vivo toxicity and efficacy demonstration in accordance with the product's intended use. Initiation of experiments to identify markers, correlates of protection or response, assays, and endpoints for further non-clinical and clinical studies.",
        workstreams: [
          {
            label: "Animal Models",
            note: "Initiate development of appropriate and relevant animal model(s) for the desired indications.",
          },
          {
            label: "Assays",
            note: "Initiate development of appropriate and relevant assays and associated reagents for the desired indications.",
          },
          {
            label: "Manufacturing",
            note: "Manufacture laboratory-scale (i.e., non-GMP (Good Manufacturing Practice)) quantities of bulk product and proposed formulated product.",
          },
        ],
        activities: [
          {
            id: "4A",
            label:
              "Demonstrate non-GLP in vivo activity and potential for efficacy consistent with the product's intended use (i.e., dose, schedule, duration, route of administration, and route of disease challenge or exposure).",
          },
          {
            id: "4B",
            label:
              "Conduct initial non-GLP toxicity studies and determine pharmacodynamics and pharmacokinetics and/or immune response in appropriate animal models (as applicable).",
          },
          {
            id: "4C",
            label:
              "Initiate experiments to determine assays, parameters, surrogate markers, correlates of protection or response, and endpoints to be used during non-clinical and clinical studies to further evaluate and characterize candidate(s).",
          },
        ],
      },
      {
        level: 5,
        title: "Advanced Characterization of Candidate and Initiation of GMP Process Development",
        definition:
          "Continue non-GLP in vivo studies, and animal model and assay development. Establish draft Target Product Profiles. Develop a scalable and reproducible manufacturing process amenable to GMP.",
        workstreams: [
          {
            label: "Animal Models",
            note: "Continue development of animal models for efficacy and dose-ranging studies.",
          },
          {
            label: "Assays",
            note: "Initiate development of in-process assays and analytical methods for product characterization and release, including assessments of potency, purity, identity, strength, sterility, and quality as appropriate.",
          },
          {
            label: "Manufacturing",
            note: "Initiate process development for small-scale manufacturing amenable to GMP.",
          },
          {
            label: "Target Product Profile",
            note: "Draft preliminary Target Product Profile. Questions of shelf life, storage conditions, and packaging should be considered to ensure that anticipated use of the product is consistent with the intended use for which approval will be sought from FDA.",
          },
        ],
        activities: [
          {
            id: "5A",
            label:
              "Demonstrate acceptable Absorption, Distribution, Metabolism and Elimination characteristics and/or immune responses in non-GLP animal studies as necessary for IND filing.",
          },
          {
            id: "5B",
            label:
              "Continue establishing correlates of protection or response, endpoints, and/or surrogate markers for efficacy for use in future GLP studies in animal models. Identify minimally effective dose to facilitate determination of \"humanized\" dose once clinical data are obtained.",
          },
        ],
      },
      {
        level: 6,
        title: "GMP Pilot Lot Production, IND Submission, and Phase 1 Clinical Trial(s)",
        definition:
          "Manufacture GMP-compliant pilot lots. Prepare and submit Investigational New Drug (IND) package to FDA and conduct Phase 1 clinical trial(s) to determine the safety and pharmacokinetics of the clinical test article.",
        workstreams: [
          {
            label: "Animal Models",
            note: "Continue animal model development via toxicology, pharmacology, and immunogenicity studies.",
          },
          {
            label: "Assays",
            note: "Qualify assays for manufacturing quality control and immunogenicity, if applicable.",
          },
          {
            label: "Manufacturing",
            note: "Manufacture, release and conduct stability testing of GMP-compliant bulk and formulated product in support of the IND and clinical trial(s).",
          },
          { label: "Target Product Profile", note: "Update Target Product Profile as appropriate." },
        ],
        activities: [
          {
            id: "6A",
            label:
              "Conduct GLP non-clinical studies for toxicology, pharmacology, and immunogenicity as appropriate.",
          },
          { id: "6B", label: "Prepare and submit full IND package to FDA to support initial clinical trial(s)." },
          {
            id: "6C",
            label:
              "Complete Phase 1 clinical trial(s) that establish an initial safety, pharmacokinetics and immunogenicity assessment as appropriate.",
          },
        ],
      },
      {
        level: 7,
        title: "Scale-up, Initiation of GMP Process Validation, and Phase 2 Clinical Trial(s)",
        definition:
          "Scale-up and initiate validation of GMP manufacturing process. Conduct animal efficacy studies as appropriate. Conduct Phase 2 clinical trial(s).",
        workstreams: [
          {
            label: "Animal Models",
            note: "Refine animal model development in preparation for pivotal GLP animal efficacy studies.",
          },
          {
            label: "Assays",
            note: "Validate assays for manufacturing quality control and immunogenicity if applicable.",
          },
          {
            label: "Manufacturing",
            note: "Scale-up and validate GMP manufacturing process at a scale compatible with anticipated commercial demand. Begin stability studies of the GMP product in a formulation, dosage form, and container consistent with Target Product Profile. Initiate manufacturing process validation and consistency lot production.",
          },
          { label: "Target Product Profile", note: "Update Target Product Profile as appropriate." },
        ],
        activities: [
          { id: "7A", label: "Conduct GLP animal efficacy studies as appropriate for the product at this stage." },
          { id: "7B", label: "Complete expanded clinical safety trials as appropriate for the product (e.g., Phase 2)." },
        ],
      },
      {
        level: 8,
        title:
          "Completion of GMP Validation and Consistency Lot Manufacturing, Pivotal Animal Efficacy Studies or Clinical Trials, and FDA Approval or Licensure",
        definition:
          "Finalize GMP manufacturing process. Complete pivotal animal efficacy studies or clinical trials (e.g., Phase 3), and/or expanded clinical safety trials as appropriate. Prepare and submit NDA/BLA.",
        workstreams: [
          {
            label: "Manufacturing",
            note: "Complete validation and manufacturing of consistency lots at a scale compatible with anticipated commercial demand. Complete stability studies in support of label expiry dating.",
          },
          { label: "Target Product Profile", note: "Finalize Target Product Profile in preparation for FDA approval." },
        ],
        activities: [
          {
            id: "8A",
            label:
              "Complete pivotal GLP animal efficacy studies or pivotal clinical trials (e.g., Phase 3), and any additional expanded clinical safety trials as appropriate for the product.",
          },
          {
            id: "8B",
            label:
              "Prepare and submit New Drug Application (NDA) or Biologics Licensing Application (BLA) to the FDA.",
          },
          { id: "8C", label: "Obtain FDA approval or licensure." },
        ],
      },
      {
        level: 9,
        title: "Post-Licensure and Post-Approval Activities",
        definition:
          "Post-licensure and post-approval activities are underway and commercial manufacturing capability is maintained.",
        activities: [
          {
            id: "9A",
            label:
              "Commence post-licensure/post-approval and Phase 4 studies (post-marketing commitments), such as safety surveillance, studies to support use in special populations, and clinical trials to confirm safety and efficacy as feasible and appropriate.",
          },
          { id: "9B", label: "Maintain manufacturing capability as appropriate." },
        ],
      },
    ],
  },

  diagnostics: {
    label: "Diagnostics",
    source: "BARDA TRLs for Medical Countermeasure Products (Diagnostics and Medical Devices), adapted from the harmonized Q-TRL",
    sourceNote:
      "This track follows BARDA's Q-TRL definitions for diagnostics rather than the NASA TRLs used by the general, software, and hardware tracks. BARDA's set runs to TRL 8, which ends at FDA clearance or approval; level 9 covers post-market activity. A level is reached only once every activity at that level is complete.",
    trackHint:
      "In vitro diagnostics — assays, reagents, instruments, and software acting on a specimen taken from the body. Imaging AI and diagnostic wearables belong on the medical device track.",
    levels: [
      {
        // Level 0 carries indicators only; title and definition fall back to the
        // shared "No Technical Activity". readiness-levels.js has no
        // indicators.diagnostics key, so it is supplied here.
        level: 0,
        indicators: [
          "No clinical pathological marker or diagnostic target identified",
          "No assay concept or intended use proposed",
        ],
      },
      {
        level: 1,
        title: "Review of Scientific Knowledge",
        definition:
          "Active monitoring of scientific knowledge base to identify clinical pathological markers for diagnostic candidates. Scientific findings are reviewed and assessed as a foundation for characterizing approaches to intervene in disease. Basic research needs identified.",
        deliverables: ["Literature and marker landscape review", "Basic research needs summary"],
        indicators: [
          "Candidate clinical pathological markers identified",
          "Basic research needs documented",
        ],
      },
      {
        level: 2,
        title: "Concept Generation and Development of Experimental Designs",
        definition:
          "Develop research plans to answer specific questions and experimental designs for addressing the related scientific issues and to establish feasibility. Focus on practical applications based on basic principles.",
        deliverables: ["Research plan", "Experimental design package", "Intended use statement (draft)"],
        indicators: [
          "Specific research questions defined",
          "Experimental designs drafted to establish feasibility",
        ],
      },
      {
        level: 3,
        title: "Characterization of Preliminary Candidate(s) and Feasibility Demonstration",
        definition:
          "Begin research and development (R&amp;D), data collection, and analysis in order to verify feasibility. Explore alternative concepts, identify and evaluate critical technologies and components, and begin characterizing specifications required. Demonstrate the performance of candidate diagnostic targets and high-risk components. Develop a business case for the proposed product.",
        deliverables: [
          "Feasibility data package",
          "Preliminary performance characterization of candidate targets",
          "Business case for the proposed product",
        ],
        indicators: [
          "Candidate diagnostic target performance demonstrated",
          "High-risk components identified and evaluated",
          "Business case developed",
        ],
      },
      {
        level: 4,
        title: "Optimization and Preparation for Assay, Component, and Instrument Development",
        definition:
          "Prepare for test system development. Down-select diagnostic target(s) and finalize methods for detecting or quantitating target(s). Develop detailed plans and finalize critical design requirements. Identify key external development partners. Identify manufacturing resources, vendor sourcing, and experimental designs.",
        workstreams: [
          { label: "Assays", note: "Finalize the method for detecting or quantitating the down-selected target(s)." },
          { label: "Design Requirements", note: "Develop detailed development plans and finalize critical design requirements." },
          { label: "Manufacturing", note: "Identify manufacturing resources and vendor sourcing." },
          { label: "Partners", note: "Identify key external development partners." },
        ],
        deliverables: ["Target down-selection rationale", "Critical design requirements", "Development plan"],
        indicators: [
          "Diagnostic target(s) down-selected",
          "Detection or quantitation method finalized",
          "Critical design requirements frozen",
        ],
      },
      {
        level: 5,
        title: "Product Development — Reagents, Components, Subsystems, and Modules",
        definition:
          "Develop reagents and buffers. Build and test non-GLP prototypes of components and subsystems. Code and unit test software. Begin pilot scale manufacturing preparations. Develop protocols for assay and integration testing. Initiate reagent stability testing. Hold pre-IDE meeting with FDA. Initiate Design History File.",
        workstreams: [
          { label: "Reagents", note: "Develop reagents and buffers, and initiate reagent stability testing." },
          { label: "Components", note: "Build and test non-GLP prototypes of components and subsystems." },
          { label: "Software", note: "Code and unit test software." },
          { label: "Manufacturing", note: "Begin pilot-scale manufacturing preparations." },
          { label: "Regulatory", note: "Hold pre-IDE meeting with FDA and initiate the Design History File." },
        ],
        deliverables: [
          "Component and subsystem prototypes",
          "Assay and integration test protocols",
          "Design History File (initiated)",
          "Pre-IDE meeting record",
        ],
        indicators: [
          "Reagents and buffers developed",
          "Non-GLP component prototypes built and tested",
          "Pre-IDE meeting held with FDA",
          "Design History File initiated",
        ],
      },
      {
        level: 6,
        title: "System Integration and Testing",
        definition:
          "Integrate and test alpha and beta instruments/devices, software and assays, evaluating performance and updating specifications. Implement design improvements to address defects discovered during testing. Produce and evaluate pilot lots of reagents and beta (pilot) instruments. Increase the maturity of software. Complete short-term stability testing of reagents. Prepare for clinical testing.",
        workstreams: [
          { label: "Assays", note: "Integrate and test assays against the instrument and software as a system." },
          { label: "Software", note: "Increase the maturity of software and resolve defects found in integration testing." },
          { label: "Manufacturing", note: "Produce and evaluate pilot lots of reagents and beta (pilot) instruments." },
          { label: "Stability", note: "Complete short-term stability testing of reagents." },
        ],
        deliverables: [
          "Integrated alpha and beta system",
          "Updated system specifications",
          "Pilot lot evaluation report",
          "Short-term reagent stability report",
        ],
        indicators: [
          "Alpha and beta instruments, software, and assays integrated and tested",
          "Pilot lots of reagents and beta instruments produced and evaluated",
          "Preparations for clinical testing underway",
        ],
      },
      {
        level: 7,
        title: "Analytical Verification and Preparation for Clinical Studies",
        definition:
          "Evaluate assay and integrated diagnostic system performance utilizing contrived, retrospective human and animal samples. Make preparations for clinical evaluation. Begin preparation for full scale production of instruments and assays.",
        workstreams: [
          { label: "Assays", note: "Evaluate assay and integrated system performance on contrived, retrospective human and animal samples." },
          { label: "Clinical", note: "Make preparations for clinical evaluation." },
          { label: "Manufacturing", note: "Begin preparation for full-scale production of instruments and assays." },
        ],
        deliverables: [
          "Analytical verification report",
          "Clinical evaluation protocol",
          "Full-scale production plan",
        ],
        indicators: [
          "Analytical performance verified on contrived and retrospective samples",
          "Clinical evaluation prepared",
          "Full-scale production preparation underway",
        ],
      },
      {
        level: 8,
        title:
          "Clinical Studies and/or Evaluation with Animal Studies, FDA Clearance or Approval, Finalize GMP Manufacturing Preparations",
        definition:
          "Complete clinical evaluations. Prepare and submit FDA filing. End of TRL 8: acquire FDA approval, or clearance.",
        workstreams: [
          { label: "Clinical", note: "Complete clinical evaluations, and animal studies where applicable." },
          { label: "Regulatory", note: "Prepare and submit the FDA filing, and obtain approval or clearance." },
          { label: "Manufacturing", note: "Finalize GMP manufacturing preparations." },
        ],
        deliverables: ["Clinical evaluation report", "FDA submission", "FDA clearance or approval"],
        indicators: [
          "Clinical evaluations complete",
          "FDA filing prepared and submitted",
          "FDA clearance or approval obtained",
        ],
      },
      {
        level: 9,
        title: "Post-Market Activities and Commercial Scale-Up",
        definition:
          "Post-market surveillance and any post-clearance study commitments are underway. Full-scale commercial manufacturing of instruments, reagents, and assays is established and maintained.",
        deliverables: [
          "Post-market surveillance plan and records",
          "Commercial manufacturing and lot release records",
        ],
        indicators: [
          "Post-market surveillance underway",
          "Post-clearance study commitments in progress as applicable",
          "Full-scale commercial manufacturing established",
        ],
      },
    ],
  },

  device: {
    label: "Medical device",
    source:
      "BARDA Q-TRL level boundaries with device-native content (FDA design controls; NHLBI Catalyze Therapeutic Device TRLs)",
    sourceNote:
      "This track keeps the level boundaries of BARDA's Q-TRL set for devices but uses device-native content — design controls, verification and validation, and the IDE/510(k)/De Novo/PMA pathway — rather than BARDA's diagnostics wording. BARDA's set runs to TRL 8, which ends at FDA clearance or approval; level 9 covers post-market activity.",
    trackHint:
      "Devices that act on the patient — implants, catheters, instruments, imaging hardware, wearables, and diagnostic or therapeutic software (SaMD). Specimen-based tests belong on the diagnostics track.",
    levels: [
      // Level 0 falls back to the shared "No Technical Activity" plus
      // indicators.device.
      {
        level: 1,
        title: "Review of Scientific Knowledge",
        definition:
          "Active monitoring of scientific knowledge base to characterize the clinical need the device would address. Scientific and clinical findings are reviewed and assessed as a foundation for characterizing candidate approaches. Basic research needs identified.",
        deliverables: ["Clinical need and literature review", "Unmet need statement"],
        indicators: [
          "Clinical need characterized and documented",
          "Candidate technical approaches identified",
        ],
      },
      {
        level: 2,
        title: "Concept Generation and Development of Experimental Designs",
        definition:
          "Develop research plans to answer specific questions and experimental designs for addressing the related technical issues and to establish feasibility. Focus on practical applications based on basic principles. Use paper studies and computer simulation to test concepts.",
        deliverables: ["Device concept description", "Intended use and user statement", "Experimental design package"],
        indicators: [
          "Device concept and intended use defined",
          "Feasibility questions and experimental designs drafted",
        ],
      },
      {
        level: 3,
        title: "Characterization of Preliminary Candidate(s) and Feasibility Demonstration",
        definition:
          "Begin research and development (R&amp;D), data collection, and analysis in order to verify feasibility. Explore alternative concepts, identify and evaluate critical technologies and components, and begin characterizing required specifications. Demonstrate benchtop prototype performance of critical functions and high-risk components. Gather early user feedback and hypothesize the regulatory pathway. Develop a business case for the proposed product.",
        deliverables: [
          "Benchtop prototype",
          "Critical function bench test results",
          "Preliminary risk analysis",
          "Regulatory pathway hypothesis",
          "Business case for the proposed product",
        ],
        indicators: [
          "Benchtop prototype demonstrates critical functions",
          "High-risk components identified and evaluated",
          "Early user feedback gathered",
          "Regulatory pathway and device class hypothesized",
        ],
      },
      {
        level: 4,
        title: "Optimization and Preparation for Component and System Development",
        definition:
          "Prepare for system development. Down-select the design concept and finalize critical design requirements. Establish design inputs and design control activities. Complete design risk analysis and identify the applicable standards and biocompatibility testing. Identify key external development partners, manufacturing resources, and vendor sourcing.",
        workstreams: [
          { label: "Design Controls", note: "Establish design inputs and design control activities under 21 CFR 820.30 and ISO 13485." },
          { label: "Risk Management", note: "Complete design risk analysis (DFMEA and use-related risk) per ISO 14971." },
          { label: "Standards", note: "Identify the applicable consensus standards and biocompatibility testing (e.g., ISO 10993, IEC 60601, IEC 62304)." },
          { label: "Manufacturing", note: "Identify manufacturing resources and vendor sourcing." },
          { label: "Partners", note: "Identify key external development partners." },
        ],
        deliverables: [
          "Design inputs and requirements specification",
          "Design risk analysis (DFMEA)",
          "Standards and biocompatibility test matrix",
          "Development plan",
        ],
        indicators: [
          "Design concept down-selected",
          "Design inputs and critical design requirements frozen",
          "Design risk analysis complete",
          "Applicable standards and biocompatibility testing identified",
        ],
      },
      {
        level: 5,
        title: "Product Development — Components, Subsystems, and Modules",
        definition:
          "Build and test prototypes of components and subsystems. Code and unit test software. Develop design verification and validation protocols and test methods. Conduct animal studies as applicable to the intended use. Begin pilot scale manufacturing preparations. Hold pre-IDE meeting with FDA. Initiate Design History File.",
        workstreams: [
          { label: "Components", note: "Build and test prototypes of components and subsystems against the design inputs." },
          { label: "Software", note: "Code and unit test software per IEC 62304 where applicable." },
          { label: "Verification and Validation", note: "Develop design verification and validation protocols and test methods." },
          { label: "Non-clinical", note: "Conduct animal and biocompatibility studies as applicable to the intended use." },
          { label: "Manufacturing", note: "Begin pilot-scale manufacturing preparations and identify design transfer needs." },
          { label: "Regulatory", note: "Hold pre-IDE meeting with FDA and initiate the Design History File." },
        ],
        deliverables: [
          "Component and subsystem prototypes",
          "Design V&amp;V protocols and test methods",
          "Animal and biocompatibility study reports as applicable",
          "Design History File (initiated)",
          "Pre-IDE meeting record",
        ],
        indicators: [
          "Component and subsystem prototypes built and tested",
          "Design verification and validation protocols developed",
          "Pre-IDE meeting held with FDA",
          "Design History File initiated",
        ],
      },
      {
        level: 6,
        title: "System Integration and Testing",
        definition:
          "Integrate and test alpha and beta devices, software, and accessories, evaluating performance and updating specifications. Implement design improvements to address defects discovered during testing. Conduct human factors and usability evaluation. Produce and evaluate pilot builds. Increase the maturity of software. Prepare for clinical testing.",
        workstreams: [
          { label: "Integration", note: "Integrate and test alpha and beta devices, software, and accessories as a system." },
          { label: "Software", note: "Increase the maturity of software and resolve defects found in integration testing." },
          { label: "Human Factors", note: "Conduct formative human factors and usability evaluation with representative users." },
          { label: "Manufacturing", note: "Produce and evaluate pilot builds on production-intent processes." },
        ],
        deliverables: [
          "Integrated alpha and beta device",
          "Updated design and system specifications",
          "Formative human factors report",
          "Pilot build evaluation report",
        ],
        indicators: [
          "Alpha and beta devices integrated and tested",
          "Human factors and usability evaluation conducted",
          "Pilot builds produced and evaluated",
          "Preparations for clinical testing underway",
        ],
      },
      {
        level: 7,
        title: "Design Verification and Preparation for Clinical Studies",
        definition:
          "Complete design verification against the design inputs in the final or near-final configuration. Complete the non-clinical testing required to support an IDE or a marketing submission. Make preparations for clinical evaluation. Begin preparation for full scale production.",
        workstreams: [
          { label: "Verification", note: "Complete design verification against the design inputs in the final or near-final configuration." },
          { label: "Non-clinical", note: "Complete the bench, biocompatibility, electrical safety, and sterilization or shelf-life testing needed to support the submission." },
          { label: "Clinical", note: "Make preparations for clinical evaluation, including the IDE submission where the device is significant risk." },
          { label: "Manufacturing", note: "Begin preparation for full-scale production and complete design transfer planning." },
        ],
        deliverables: [
          "Design verification report",
          "Non-clinical test reports supporting the submission",
          "Clinical protocol and IDE submission as applicable",
          "Full-scale production plan",
        ],
        indicators: [
          "Design verification complete against design inputs",
          "Non-clinical testing complete to support IDE or marketing submission",
          "Clinical evaluation prepared",
          "Full-scale production preparation underway",
        ],
      },
      {
        level: 8,
        title:
          "Clinical Studies and/or Evaluation with Animal Studies, FDA Clearance or Approval, Finalize Manufacturing Preparations",
        definition:
          "Complete the pivotal clinical study and design validation in the final configuration. Prepare and submit the FDA filing — 510(k), De Novo, or PMA as appropriate to the device class. Finalize quality system and manufacturing preparations. End of TRL 8: acquire FDA approval, or clearance.",
        workstreams: [
          { label: "Clinical", note: "Complete the pivotal clinical study, and animal studies where applicable." },
          { label: "Validation", note: "Complete design validation, including summative human factors validation, in the final configuration." },
          { label: "Regulatory", note: "Prepare and submit the 510(k), De Novo, or PMA, and obtain clearance or approval." },
          { label: "Manufacturing", note: "Finalize the quality system, process validation, and manufacturing preparations." },
        ],
        deliverables: [
          "Pivotal clinical study report",
          "Design validation report",
          "510(k), De Novo, or PMA submission",
          "FDA clearance or approval",
        ],
        indicators: [
          "Pivotal clinical study complete",
          "Design validation complete in the final configuration",
          "Marketing submission prepared and submitted",
          "FDA clearance or approval obtained",
        ],
      },
      {
        level: 9,
        title: "Post-Market Activities and Commercial Scale-Up",
        definition:
          "Post-market surveillance and any post-approval study commitments are underway. Full-scale commercial manufacturing is established and maintained under the quality system.",
        deliverables: [
          "Post-market surveillance plan and records",
          "Commercial manufacturing and quality system records",
        ],
        indicators: [
          "Post-market surveillance underway",
          "Post-approval study commitments in progress as applicable",
          "Full-scale commercial manufacturing established",
        ],
      },
    ],
  },
};
