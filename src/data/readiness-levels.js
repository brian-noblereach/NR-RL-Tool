// data.js - Readiness Level Data Structure (ES Module)
// Updated April 2026 - Revised definitions per alignment document + healthExtras merged

export const readinessData = {
    'IP': {
        levels: [
            {
                level: 0,
                title: "No IP Awareness",
                definition: "Hypothesizing on possible Intellectual Property Rights (IPR) (patents, software, copyright, trade secrets etc)",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Initial IP Strategy",
                definition: "Initial IP strategy development with basic understanding of IP positioning and relevant patent landscapes.",
                deliverables: ["Initial IP Strategy Memo"],
                indicators: ["Clarity on whether any IP is potentially patentable", "Understanding of IP landscape basics"],
                healthExtras: { indicators: ["Awareness of clinical IP landscape for target indication"], deliverables: ["IP landscape scan for target indication"] }
            },
            {
                level: 2,
                title: "Formal IP Documentation",
                definition: "Formal IP documentation and evaluation with comprehensive records of technological developments gathered for legal consideration.",
                deliverables: ["Invention Disclosure Forms", "IP Documentation Templates", "Technology Development Records"],
                indicators: ["Initial invention disclosure forms completed", "Patent attorney or tech transfer office engaged for preliminary assessment"],
                healthExtras: { indicators: ["Provisional scope includes clinical claims"], deliverables: ["Provisional draft with clinical claim language"] }
            },
            {
                level: 3,
                title: "IP Filings Initiated",
                definition: "Preliminary patent landscape assessments completed, potential IP obstacles identified, and initial IP filings made.",
                deliverables: ["Patent Landscape Analysis", "Patent Application Submission Package"],
                indicators: ["Patent application submitted (provisional or non-provisional)", "Preliminary FTO assessment completed"],
                healthExtras: { indicators: ["Initial clinical FTO questions articulated"], deliverables: ["Preliminary FTO notes"] }
            },
            {
                level: 4,
                title: "Strategic IP Planning",
                definition: "IP planning and disclosure capability established with strategies that anticipate future innovation directions and competitive landscape evolution.",
                deliverables: ["IP Protection Strategy Document", "Prioritized List of Patentable Innovations"],
                indicators: ["Licensing conversations initiated (in or out)", "Regulatory pathway requirements for IP protection understood"],
                healthExtras: { indicators: ["Claims strategy aligned to clinical endpoints"], deliverables: ["Claims strategy outline"] }
            },
            {
                level: 5,
                title: "Patent Prosecution",
                definition: "Active patent prosecution underway with professional drafting, submission, and response to office actions.",
                deliverables: ["Patent Application Package", "Patent Prosecution Documentation"],
                indicators: ["Active patent prosecution underway", "Licensing negotiations progressing"],
                healthExtras: { indicators: ["Patent scope supports clinical endpoints"], deliverables: ["Non-provisional with clinical claims"] }
            },
            {
                level: 6,
                title: "First Patent Issued",
                definition: "At least one patent granted or licensed. Initial FTO assessment completed for core technology.",
                deliverables: ["Issued Patent or Executed License Agreement", "FTO Assessment"],
                indicators: ["First patent issued or exclusive license secured", "Third-party IP risks identified and addressed"],
                healthExtras: { indicators: ["FTO diligence initiated for intended clinical use"], deliverables: ["FTO memo for clinical application"] }
            },
            {
                level: 7,
                title: "Portfolio Development",
                definition: "IP portfolio expanding with multiple applications filed across relevant jurisdictions. Strategic licensing arrangements in place.",
                deliverables: ["Multi-Jurisdiction Filing Strategy", "IP Portfolio Summary"],
                indicators: ["Multiple patent applications filed or in-licensed", "Licensing solutions for third-party IP in place"],
                healthExtras: { indicators: ["FTO supports intended clinical use"], deliverables: ["Multi-jurisdiction clinical IP strategy"] }
            },
            {
                level: 8,
                title: "Mature IP Portfolio",
                definition: "Multiple patents issued with ongoing portfolio optimization. Continuation strategies active for core technology areas.",
                deliverables: ["IP Portfolio Optimization Report", "Continuation Filing Plan"],
                indicators: ["Multiple patents issued", "Portfolio actively managed and expanded"],
                healthExtras: { indicators: ["Portfolio covers key clinical applications"], deliverables: ["Portfolio strategy for clinical labeling"] }
            },
            {
                level: 9,
                title: "Comprehensive IP Protection",
                definition: "Strong IP position supporting business operations with broad patent portfolio providing meaningful competitive protection.",
                deliverables: ["IP Enforcement Strategy", "Portfolio Valuation"],
                indicators: ["IP effectively supports market position", "Comprehensive granted portfolio in place"],
                healthExtras: { indicators: ["IP position supports labeling and reimbursement"], deliverables: ["Enforcement strategy for clinical market"] }
            }
        ]
    },

    'Technology': {
        levels: [
            {
                level: 0,
                title: "No Technical Activity",
                definition: "N/A",
                deliverables: [],
                indicators: {
                    general: ["No scientific principles explored", "No research activity initiated"],
                    pharma: ["No target identification or literature review", "No preclinical hypothesis formed"],
                    meddevice: ["No clinical need identified", "No device concept proposed"],
                    hardware: ["No physical principles explored", "No concept designs considered"],
                    software: ["No algorithms or architecture considered", "No technical feasibility explored"]
                }
            },
            {
                level: 1,
                title: "Basic Principles",
                definition: "Basic Principles Observed and reported",
                deliverables: ["Scientific principles documentation", "Initial research findings"],
                indicators: {
                    general: ["Basic scientific principles identified", "Initial observations documented"],
                    pharma: ["Review of scientific knowledge", "Gathering existing research"],
                    meddevice: ["Basic device concept identified", "Clinical need documented"],
                    hardware: ["Physical principles understood", "Basic concept sketched"],
                    software: ["Core algorithms conceptualized", "Basic architecture outlined"]
                },
                healthExtras: {
                    device: { indicators: ["Intended use and risk class hypothesis documented"], deliverables: ["Intended use & risk class note"] },
                    pharma: { indicators: ["Target Product Profile (TPP) drafted"], deliverables: ["TPP v0"] }
                }
            },
            {
                level: 2,
                title: "Concept Formulated",
                definition: "Technology concept and/or application formulated",
                deliverables: ["Concept design document", "Application use cases"],
                indicators: {
                    general: ["Specific applications identified", "Concept refined and documented"],
                    pharma: ["Hypotheses developed", "Experimental designs created", "Computer simulations conducted"],
                    meddevice: ["Device specifications outlined", "Intended use defined"],
                    hardware: ["Technical specifications drafted", "Component requirements identified"],
                    software: ["System architecture designed", "Key features specified"]
                },
                healthExtras: {
                    device: { indicators: ["Initial IEC/ISO requirements identified"], deliverables: ["Standards & bench test matrix"] },
                    pharma: { indicators: ["IND-enabling study needs outlined"], deliverables: ["Preclinical plan"] }
                }
            },
            {
                level: 3,
                title: "Proof of Concept",
                definition: "Analytical or experimental critical function POC",
                deliverables: ["POC demonstration", "Test results documentation"],
                indicators: {
                    general: ["Critical functions demonstrated", "Feasibility proven"],
                    pharma: ["Target/candidate identified", "In vitro efficacy demonstrated"],
                    meddevice: ["Bench testing completed", "Initial prototype built"],
                    hardware: ["Breadboard prototype functional", "Key components tested"],
                    software: ["Core functionality implemented", "Alpha version operational"]
                },
                healthExtras: {
                    device: { indicators: ["Preliminary DFMEA/HFMEA started"], deliverables: ["Risk analysis draft"] },
                    pharma: { indicators: ["Dose/formulation strategy defined"], deliverables: ["Formulation concept"] }
                }
            },
            {
                level: 4,
                title: "Component Integration",
                definition: "Basic technology components integrated to work together",
                deliverables: ["Integration test results", "System design documentation"],
                indicators: {
                    general: ["Components working together", "System integration demonstrated"],
                    pharma: ["Candidate optimization underway", "Non-GLP in vivo testing initiated"],
                    meddevice: ["Integrated prototype developed", "Pre-clinical testing initiated"],
                    hardware: ["Integrated system prototype", "Laboratory testing complete"],
                    software: ["Beta version released", "Core modules integrated"]
                },
                healthExtras: {
                    device: { indicators: ["Bench test protocols approved"], deliverables: ["Bench test plan"] },
                    pharma: { indicators: ["GLP study protocols planned"], deliverables: ["GLP plan"] }
                }
            },
            {
                level: 5,
                title: "Validation in Lab",
                definition: "Validation in relevant environment, and/or simulated in lab",
                deliverables: ["Validation test reports", "Performance metrics"],
                indicators: {
                    general: ["Performance validated in lab", "Specifications met in controlled environment"],
                    pharma: ["Advanced characterization complete", "GMP process development initiated"],
                    meddevice: ["Animal studies completed", "Design verification testing"],
                    hardware: ["Environmental testing passed", "Reliability demonstrated"],
                    software: ["Load testing completed", "Security validation performed"]
                },
                healthExtras: {
                    device: { indicators: ["Design inputs traceability established"], deliverables: ["Traceability matrix"] },
                    pharma: { indicators: ["Preclinical evidence generated"], deliverables: ["Preclinical data package"] }
                }
            },
            {
                level: 6,
                title: "Prototype System",
                definition: "Initial prototype model or system",
                deliverables: ["Prototype documentation", "Test protocols"],
                indicators: {
                    general: ["Prototype built and tested", "Near-final configuration"],
                    pharma: ["GMP pilot lot produced", "IND submission prepared", "Phase I trials planned"],
                    meddevice: ["Clinical prototype ready", "IDE submission prepared"],
                    hardware: ["Production-intent prototype", "Field testing initiated"],
                    software: ["Release candidate version", "User acceptance testing"]
                },
                healthExtras: {
                    device: { indicators: ["Verification plan aligns to standards"], deliverables: ["V&V plan"] },
                    pharma: { indicators: ["Clinical development plan defined"], deliverables: ["Clinical development plan (CDP)"] }
                }
            },
            {
                level: 7,
                title: "Operational Demonstration",
                definition: "Prototype demonstrated in operational environment - actual system prototype in application",
                deliverables: ["Field test results", "Performance validation"],
                indicators: {
                    general: ["Real-world testing complete", "Customer feedback incorporated"],
                    pharma: ["Phase 2 clinical trials underway", "Scale-up initiated"],
                    meddevice: ["Clinical trials underway", "Regulatory pathway clear"],
                    hardware: ["Pilot production run", "Customer trials successful"],
                    software: ["Production deployment", "Live user testing"]
                },
                healthExtras: {
                    device: { indicators: ["First-in-human/feasibility study planned"], deliverables: ["Clinical protocol synopsis (device)"] },
                    pharma: { indicators: ["Phase I protocol drafted"], deliverables: ["Phase I synopsis"] }
                }
            },
            {
                level: 8,
                title: "System Complete",
                definition: "Proven to work in final form and under expected conditions. End of true system development",
                deliverables: ["Final test reports", "Certification documents"],
                indicators: {
                    general: ["All testing complete", "Ready for production"],
                    pharma: ["Phase 3 trials complete", "GMP validation complete"],
                    meddevice: ["Pivotal clinical trials complete", "510(k) or PMA submitted"],
                    hardware: ["Production line established", "Quality systems in place"],
                    software: ["Full production release", "SLA compliance demonstrated"]
                },
                healthExtras: {
                    device: { indicators: ["Clinical validation underway for intended use"], deliverables: ["Interim clinical evidence (device)"] },
                    pharma: { indicators: ["Early clinical data demonstrates safety"], deliverables: ["Phase I results/interim"] }
                }
            },
            {
                level: 9,
                title: "Production Ready",
                definition: "In final form under mission conditions. System proven in operational environment. Production ready",
                deliverables: ["Production documentation", "Quality certifications"],
                indicators: {
                    general: ["Full production capability", "Market deployment"],
                    pharma: ["FDA approval received", "Commercial manufacturing"],
                    meddevice: ["FDA clearance/approval", "Commercial production"],
                    hardware: ["Mass production achieved", "Supply chain established"],
                    software: ["Scaled deployment", "Enterprise ready"]
                },
                healthExtras: {
                    device: { indicators: ["V&V complete and meets clinical performance"], deliverables: ["V&V report package"] },
                    pharma: { indicators: ["Efficacy evidence aligned to approval pathway"], deliverables: ["Phase II/III plan or results"] }
                }
            }
        ]
    },

    'Market': {
        levels: [
            {
                level: 0,
                title: "No Market Awareness",
                definition: "Understanding of importance of market engagement and willingness to spend time externally focused",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Initial Market Understanding",
                definition: "High-level understanding of initial target market and applications.",
                deliverables: ["Market opportunity brief"],
                indicators: ["Initial market hypothesis", "Potential applications identified"],
                healthExtras: { indicators: ["Patient population and unmet need quantified"], deliverables: ["Clinical problem/need brief"] }
            },
            {
                level: 2,
                title: "Market Analysis",
                definition: "Market/segment(s) analysis (TAM, SAM, SOM, growth rates) and overview of in-market competitors",
                deliverables: ["Market analysis report", "Competitive overview"],
                indicators: ["TAM/SAM/SOM calculated", "Key competitors identified"],
                healthExtras: { indicators: ["HCP workflow mapping initiated"], deliverables: ["Provider workflow map (draft)"] }
            },
            {
                level: 3,
                title: "Competitive Positioning",
                definition: "Strong understanding of market dynamics including emerging competitors. Competitive positioning defined with clear view of differentiation.",
                deliverables: ["Detailed competitive analysis", "Market positioning document", "Differentiation summary"],
                indicators: ["Emerging competitors tracked", "Competitive advantages articulated", "Clear view of how venture is differentiated from alternatives"],
                healthExtras: { indicators: ["Site feasibility signals gathered"], deliverables: ["Site interviews summary"] }
            },
            {
                level: 4,
                title: "Customer Discovery",
                definition: "Customer discovery completed with evidence that the target problem is real, frequent, and a pain point that can be addressed.",
                deliverables: ["Customer discovery report", "Problem validation evidence"],
                indicators: ["Substantial customer interviews completed", "Problem validated as real, frequent, and painful", "Target customer profile refined based on discovery"],
                healthExtras: { indicators: ["Value hypothesis tested with providers"], deliverables: ["Value proposition test summary"] }
            },
            {
                level: 5,
                title: "Market Validation",
                definition: "Active engagement with target customers and ecosystem partners confirms willingness to pay and validates competitive positioning.",
                deliverables: ["Engagement summary with validation evidence", "Willingness-to-pay documentation"],
                indicators: ["Target customers confirm willingness to pay", "Competitive positioning validated through external engagement", "Ecosystem partners engaged and providing input"],
                healthExtras: { indicators: ["Payer value drivers validated"], deliverables: ["Payer research summary"] }
            },
            {
                level: 6,
                title: "Market Intelligence",
                definition: "Market barriers, competitive dynamics, and regulatory considerations are well understood and actively monitored.",
                deliverables: ["Market barrier analysis", "Competitive monitoring process", "Regulatory landscape summary (if applicable)"],
                indicators: ["Key market barriers identified and accounted for", "Competitive dynamics tracked on ongoing basis", "Regulatory requirements understood (where relevant)"],
                healthExtras: { indicators: ["Clinical market barriers and regulatory dynamics mapped"], deliverables: ["Clinical market intelligence summary"] }
            },
            {
                level: 7,
                title: "Ongoing Market Engagement",
                definition: "Active, ongoing customer and partner engagement driving validation. Verified competitiveness and positive engagement feedback.",
                deliverables: ["Customer engagement reports", "Partner feedback documentation"],
                indicators: ["Ongoing customer relationships driving product and strategy decisions", "Competitiveness verified through direct market feedback", "Positive reception from ecosystem partners"],
                healthExtras: { indicators: ["Ongoing provider and site engagement driving clinical strategy"], deliverables: ["Provider engagement tracker"] }
            },
            {
                level: 8,
                title: "Ecosystem Validation",
                definition: "Customer, partner, and ecosystem stakeholder relationships defined and executing. Third-party validation of market position. Adjacent market opportunities identified.",
                deliverables: ["Stakeholder relationship map", "Third-party validation evidence", "Adjacent market assessment"],
                indicators: ["Stakeholder strategies defined and being executed", "Third-party or independent validation of market position obtained", "Adjacent or expansion market opportunities documented"],
                healthExtras: { indicators: ["Coverage path identified with payers"], deliverables: ["Coverage strategy brief"] }
            },
            {
                level: 9,
                title: "Market Maturity",
                definition: "Customers at initial scale with product/solution adopted. Voice of Customer feedback informing product roadmap and growth strategy.",
                deliverables: ["VoC feedback report", "Market-informed product roadmap inputs", "Growth strategy informed by market data"],
                indicators: ["Customers actively using product at meaningful scale", "VoC process established and feeding into product decisions", "Market intelligence actively informing growth strategy"],
                healthExtras: { indicators: ["Outcomes drive adoption across segments"], deliverables: ["Outcomes evidence summary"] }
            }
        ]
    },

    'Product': {
        levels: [
            {
                level: 0,
                title: "No Product Vision",
                definition: "May have technology application ideas/theories without use case identification or any validation",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Market Need Identified",
                definition: "Can identify a market need and application for which the technology is applicable",
                deliverables: ["Product vision document"],
                indicators: ["Market need identified", "Application concept defined"],
                healthExtras: { indicators: ["Concept demonstrably ties to clinical need"], deliverables: ["Clinical prototype concept note"] }
            },
            {
                level: 2,
                title: "Product Concept",
                definition: "Validated market need and identified product concept; Value proposition thesis",
                deliverables: ["Product concept document", "Value proposition"],
                indicators: ["Market need validated", "Value proposition drafted"],
                healthExtras: { indicators: ["Clinical usability goals defined"], deliverables: ["Usability goals document"] }
            },
            {
                level: 3,
                title: "User Validation",
                definition: "Initial validation of product concept through user engagement. Validated value proposition.",
                deliverables: ["User feedback reports", "Validated value proposition"],
                indicators: ["User engagement conducted", "Value proposition validated"],
                healthExtras: { indicators: ["Usability risk analysis drafted"], deliverables: ["Risk analysis by clinical use case"] }
            },
            {
                level: 4,
                title: "Working Prototype",
                definition: "Working prototype deployed for user feedback. Product concept validated through demonstrated use.",
                deliverables: ["Working prototype", "User feedback documentation", "Prototype test results"],
                indicators: ["Functional prototype in users' hands", "User feedback collected from prototype use", "Product concept validated through demonstrated (not hypothetical) use"],
                healthExtras: { indicators: ["Formative usability sessions scheduled"], deliverables: ["Formative usability plan"] }
            },
            {
                level: 5,
                title: "Minimum Viable Product",
                definition: "MVP with articulated product vision, strategy, and plan for a commercially viable offering. Users can derive value and are willing to pay for the product.",
                deliverables: ["MVP release", "Product vision and strategy document", "Evidence of willingness to pay"],
                indicators: ["Users deriving real value from the product", "Willingness to pay demonstrated (LOI, pilot purchase, subscription, etc.)", "Product vision and commercial strategy articulated"],
                healthExtras: { indicators: ["Formative usability evidence collected"], deliverables: ["Formative usability report"] }
            },
            {
                level: 6,
                title: "Product Processes",
                definition: "Product roadmap incorporating user feedback, with product execution processes and pricing strategy in place.",
                deliverables: ["Product roadmap", "Pricing strategy document", "Product execution process documentation (e.g., release management, issue tracking)"],
                indicators: ["Product roadmap exists and reflects user feedback", "Pricing strategy defined and tested", "Product development process formalized (e.g., JIRA, sprint cycles, release controls)"],
                healthExtras: { indicators: ["Clinical usability findings integrated into product processes"], deliverables: ["Clinical usability integration log"] }
            },
            {
                level: 7,
                title: "Production Readiness",
                definition: "Product ready for production at scale. For physical products, manufacturing processes and supply chain relationships established. For software, scalable architecture and security requirements met.",
                deliverables: ["Production readiness assessment", "Manufacturing plan or scalable architecture documentation", "Supply chain agreements (hardware) or security audit (software)"],
                indicators: ["Product can be produced/deployed at scale", "Quality and reliability requirements defined and met"],
                healthExtras: { indicators: ["Summative usability plan approved"], deliverables: ["Summative usability plan"] }
            },
            {
                level: 8,
                title: "Product Launch",
                definition: "Product launch: the product and everything necessary to sell it (legal, marketing, collateral, export control as applicable) are in place.",
                deliverables: ["Product launch package", "Sales collateral", "Legal and compliance documentation", "Export control classification (if applicable)"],
                indicators: ["All elements required to sell the product are in place", "Marketing collateral and sales materials ready", "Legal, regulatory, and export control requirements addressed", "Product is commercially available"],
                healthExtras: { indicators: ["Summative usability completed and clinical launch criteria met"], deliverables: ["Clinical launch readiness checklist"] }
            },
            {
                level: 9,
                title: "Product-Driven Organization",
                definition: "Customer feedback, product roadmap, and release processes driving engineering, marketing, and sales. Organization operates as product-driven rather than engineering-driven.",
                deliverables: ["Product management process documentation", "Customer feedback integration evidence", "Product-driven organizational structure"],
                indicators: ["Product decisions drive engineering priorities (not the reverse)", "Customer feedback systematically incorporated into roadmap", "Product management discipline established at center of organization", "Continuous improvement process active and measurable"],
                healthExtras: { indicators: ["Clinical evidence and endpoint data feeding product-driven organization"], deliverables: ["Clinical evidence integration plan"] }
            }
        ]
    },

    'Team': {
        levels: [
            {
                level: 0,
                title: "No Team Formed",
                definition: "Individual or small group without clarity on needed competencies or roles to move forward.",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Founding Team",
                definition: "Initial founding team with commitment to the venture and complementary skills identified.",
                deliverables: ["Team bios", "Roles and responsibilities"],
                indicators: ["Founders committed", "Initial roles defined"],
                healthExtras: { indicators: ["KOL identified and engaged"], deliverables: ["KOL interview notes"] }
            },
            {
                level: 2,
                title: "Core Team Forming",
                definition: "Core team forming with key technical and business roles identified and hiring priorities set.",
                deliverables: ["Org chart", "Hiring plan"],
                indicators: ["Key roles identified", "Initial hires planned"],
                healthExtras: { indicators: ["PI/site relationship initiated"], deliverables: ["PI/site contact list"] }
            },
            {
                level: 3,
                title: "Key Hires Made",
                definition: "Key early hires made in critical technical or business functions.",
                deliverables: ["Team expansion plan", "Onboarding materials"],
                indicators: ["Critical positions filled", "Team capabilities expanding"],
                healthExtras: { indicators: ["Clinical advisory panel forming"], deliverables: ["Advisory roster"] }
            },
            {
                level: 4,
                title: "Advisors Engaged",
                definition: "Advisors or mentors engaged with relevant industry expertise and networks. Functional responsibilities clarifying.",
                deliverables: ["Advisory agreements", "Role descriptions"],
                indicators: ["Advisors actively engaged", "Regular advisory input received"],
                healthExtras: { indicators: ["Medical director or equivalent engaged"], deliverables: ["Role description & commitment"] }
            },
            {
                level: 5,
                title: "Founding Team Aligned",
                definition: "Initial founding team with main needed competencies. Ownership, roles, and alignment agreed.",
                deliverables: ["Founders agreement or equivalent", "Roles and responsibilities document", "Equity/ownership structure"],
                indicators: ["Founding team has main needed competencies across key areas", "Ownership and equity agreed and documented", "Roles are clear and team is aligned on vision and goals"],
                healthExtras: { indicators: ["Regulatory/QA expertise added"], deliverables: ["RA/QA advisor or hire"] }
            },
            {
                level: 6,
                title: "Complete Stage-Appropriate Team",
                definition: "Complementary, committed team with all key competencies needed for current stage, including both business and technical. Extended support (mentors, advisors) in place.",
                deliverables: ["Team competency assessment", "Advisory board or mentor roster", "Near-term hiring plan (if gaps remain)"],
                indicators: ["All key competencies for current stage present (business and technical)", "Team is committed and spending significant time", "Mentors or advisors actively supporting the venture", "Team diversity considered in composition"],
                healthExtras: { indicators: ["Clinical operations partner identified"], deliverables: ["CRO/operations plan"] }
            },
            {
                level: 7,
                title: "Team and Culture Development",
                definition: "Team and culture are established and being proactively developed. Clear plan for building necessary organization over the medium term.",
                deliverables: ["Organizational development plan (~2 year horizon)", "Culture and values documentation"],
                indicators: ["Team culture is articulated and intentionally maintained", "Plan exists for medium-term organizational growth", "Knowledge sharing and team development practices in place"],
                healthExtras: { indicators: ["Trial management capability in place"], deliverables: ["Trial management SOPs"] }
            },
            {
                level: 8,
                title: "Professional Management",
                definition: "Professional management in place with effective use of board and advisors. Team executing consistently.",
                deliverables: ["Board meeting materials and cadence", "Management reporting processes"],
                indicators: ["Management team with relevant professional experience in place", "Board and advisors used effectively and regularly", "Team demonstrates consistent execution capability", "HR practices appropriate to stage"],
                healthExtras: { indicators: ["Experienced leadership executing clinical plan"], deliverables: ["Clinical org chart"] }
            },
            {
                level: 9,
                title: "High-Performing Organization",
                definition: "High-performing, well-structured team and organization that is maintained and performs over time.",
                deliverables: ["Organizational performance evidence", "Leadership continuity plan"],
                indicators: ["Organization is high-performing and well-functioning", "Leadership team maintained and developed over time", "Organizational structure and processes continuously improved"],
                healthExtras: { indicators: ["Team executed pivotal/registrational stage work"], deliverables: ["Track record summary"] }
            }
        ]
    },

    'Go-to-Market': {
        levels: [
            {
                level: 0,
                title: "No GTM Thinking",
                definition: "No consideration yet of how the technology would reach customers or what channels might be relevant.",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Entry Market Identified",
                definition: "Target entry market and segment established.",
                deliverables: ["Entry market and segment description"],
                indicators: ["Target entry market selected", "Initial segment for first customers identified"],
                healthExtras: { indicators: ["Initial site access conversations"], deliverables: ["Site access plan"] }
            },
            {
                level: 2,
                title: "Ideal Customer Defined",
                definition: "Ideal customer profile and target entry point defined.",
                deliverables: ["Ideal customer profile", "Entry point rationale"],
                indicators: ["Ideal customer profile documented (who, what role, what context)", "Target entry point defined (how you first engage the customer)", "User, buyer, and decision maker identified (if different)"],
                healthExtras: { indicators: ["Pilot site criteria drafted"], deliverables: ["Site selection criteria"] }
            },
            {
                level: 3,
                title: "Buyer Journey Hypothesis",
                definition: "Channel hypothesis and initial buyer journey defined.",
                deliverables: ["Buyer journey map (draft)", "Channel hypothesis document"],
                indicators: ["Initial buyer journey mapped from awareness to purchase", "Channel hypothesis articulated (how product reaches customer)", "Key touchpoints and decision points identified"],
                healthExtras: { indicators: ["Clinical site engagement pathway mapped"], deliverables: ["Clinical site engagement plan"] }
            },
            {
                level: 4,
                title: "Commercial Concept Validation",
                definition: "Initial validation and refinement of customer entry point and buyer journey.",
                deliverables: ["Validated buyer journey", "Refined channel assessment"],
                indicators: ["Buyer journey tested against real customer interactions", "Entry point and channel hypothesis refined based on feedback", "Key assumptions about customer acquisition tested"],
                healthExtras: { indicators: ["Operational plan for in-clinic deployment"], deliverables: ["Deployment plan"] }
            },
            {
                level: 5,
                title: "GTM Strategy Defined",
                definition: "GTM strategy defines the alignment between product, marketing, and sales/business development.",
                deliverables: ["GTM strategy document", "Product-marketing-sales alignment plan"],
                indicators: ["GTM strategy articulates how product, marketing, and sales/BD work together", "Roles and responsibilities across GTM functions clarified", "Strategy accounts for venture's specific sales model (direct, channel, government, etc.)"],
                healthExtras: { indicators: ["Provider champion identified at site"], deliverables: ["Champion brief"] }
            },
            {
                level: 6,
                title: "GTM Early Execution",
                definition: "GTM early execution with initial collateral, key partnerships and channel agreements, and any necessary certification or regulatory motions in progress.",
                deliverables: ["Initial sales/marketing collateral", "Partnership or channel agreements (if applicable)", "Certification/regulatory tracker (if applicable)"],
                indicators: ["Initial collateral produced and in use", "Key partnerships or channel relationships formalized", "Any required certifications or regulatory steps initiated", "First structured outreach to customers underway"],
                healthExtras: { indicators: ["Clinical site onboarding and early adoption underway"], deliverables: ["Site onboarding tracker"] }
            },
            {
                level: 7,
                title: "GTM Execution",
                definition: "Marketing and sales processes (including channel management as appropriate) defined and in use. Consistent lead generation.",
                deliverables: ["Sales process documentation", "Marketing analytics reports", "CRM or pipeline tracking"],
                indicators: ["Sales and marketing processes documented and followed", "Pipeline growing with consistent lead generation", "Conversion rates being tracked", "Channel management processes in place (if applicable)"],
                healthExtras: { indicators: ["Expansion to multiple sites underway"], deliverables: ["Scale plan"] }
            },
            {
                level: 8,
                title: "GTM Optimization",
                definition: "Marketing, sales, and product processes aligned through active metrics. Growth targets tied to process performance.",
                deliverables: ["CAC/LTV analysis", "Growth metrics dashboard", "Process performance reports"],
                indicators: ["CAC understood and improving", "Growth targets set and tracked against GTM process metrics", "Marketing, sales, and product teams operating from shared data", "Growth becoming predictable"],
                healthExtras: { indicators: ["Payer engagement in progress"], deliverables: ["Payer meeting notes"] }
            },
            {
                level: 9,
                title: "GTM Playbook",
                definition: "GTM playbook established and in use, with ongoing refinement for market developments.",
                deliverables: ["GTM playbook", "Channel performance analysis", "Market development response plan"],
                indicators: ["Documented, repeatable GTM processes across channels", "Playbook actively used and refined", "New market or segment entry can follow established processes", "Multiple channels performing"],
                healthExtras: { indicators: ["Pathway established across sites and payers"], deliverables: ["Commercial playbook (clinical)"] }
            }
        ]
    },

    'Business': {
        levels: [
            {
                level: 0,
                title: "No Business Planning",
                definition: "No business model or revenue approach considered. Focus remains on research or technology development.",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Business Concept",
                definition: "Initial business concept with basic value proposition identified.",
                deliverables: ["Business concept document"],
                indicators: ["Value proposition drafted", "Business idea articulated"],
                healthExtras: { indicators: ["HIPAA/GxP risks recognized"], deliverables: ["Compliance outline"] }
            },
            {
                level: 2,
                title: "Business Model Canvas",
                definition: "Business model canvas completed with key components defined.",
                deliverables: ["Business model canvas", "Revenue model"],
                indicators: ["Revenue streams identified", "Cost structure outlined"],
                healthExtras: { indicators: ["QMS plan drafted"], deliverables: ["QMS plan"] }
            },
            {
                level: 3,
                title: "Initial Business Plan",
                definition: "Initial strategic business plan with revenue/cost hypotheses and key milestones defined.",
                deliverables: ["Initial business plan", "Revenue/cost hypotheses", "Milestone plan"],
                indicators: ["Revenue and cost hypotheses articulated (not yet validated)", "Key milestones defined for next 12-18 months", "Business plan reflects understanding of market and product assumptions"],
                healthExtras: { indicators: ["Vendor qualification approach defined"], deliverables: ["Vendor list & criteria"] }
            },
            {
                level: 4,
                title: "Business Plan Validation",
                definition: "Initial validation of business plan with organization structure defined. Revenue model and pricing hypothesis tested.",
                deliverables: ["Validated business plan elements", "Organization structure document", "Pricing test results or feedback"],
                indicators: ["Revenue model and pricing tested with potential customers or partners", "Organization structure defined for current stage", "Business plan assumptions being validated against real data"],
                healthExtras: { indicators: ["Clinical process controls and compliance requirements mapped"], deliverables: ["Clinical compliance requirements"] }
            },
            {
                level: 5,
                title: "Business Model Verified",
                definition: "Business model verified through test sales or equivalent commercial engagement.",
                deliverables: ["Test sale or pilot engagement evidence", "Business model validation report"],
                indicators: ["Business model tested through real commercial engagement (test sale, paid pilot, contract, etc.)", "Revenue model assumptions validated by actual transactions", "Cost assumptions checked against real operational data"],
                healthExtras: { indicators: ["Clinical ops costs validated against business model"], deliverables: ["Clinical cost validation"] }
            },
            {
                level: 6,
                title: "Initial Revenue",
                definition: "Initial revenue aligned to business model.",
                deliverables: ["Revenue reports", "Business model alignment assessment"],
                indicators: ["Revenue being generated", "Revenue source and structure aligns with the intended business model", "Not just one-off or opportunistic revenue \u2014 tied to the model"],
                healthExtras: { indicators: ["Quality system operating"], deliverables: ["QMS evidence"] }
            },
            {
                level: 7,
                title: "Product/Market Fit",
                definition: "Product/market fit and customer willingness demonstrated. Positive unit economics.",
                deliverables: ["Unit economics analysis", "Product/market fit evidence", "Customer willingness documentation"],
                indicators: ["Customers demonstrably willing to pay at intended price point", "Unit economics are positive or have clear path to positive", "Product/market fit evidenced by retention, repeat purchase, or expansion", "Business model supports the product \u2014 right product AND right model"],
                healthExtras: { indicators: ["Clinical operations running to plan"], deliverables: ["Ops reports"] }
            },
            {
                level: 8,
                title: "Scalable Business Model",
                definition: "Sales and metrics show the business model holds at scale.",
                deliverables: ["Business metrics dashboard", "Scale analysis"],
                indicators: ["Key business metrics tracked and trending positively", "Business model assumptions validated at increasing scale", "Revenue growth consistent with model projections"],
                healthExtras: { indicators: ["Audit/readiness checks performed"], deliverables: ["Audit report"] }
            },
            {
                level: 9,
                title: "Established Business Model",
                definition: "Business model established and scaling with growing recurring revenues.",
                deliverables: ["Financial performance reports", "Growth trajectory analysis"],
                indicators: ["Recurring revenue growing", "Business model proven and scaling", "Financial sustainability demonstrated or clearly achievable"],
                healthExtras: { indicators: ["Operational maturity supports filings/scale"], deliverables: ["Readiness dossier"] }
            }
        ]
    },

    'Funding': {
        levels: [
            {
                level: 0,
                title: "No Funding Awareness",
                definition: "No awareness of funding options or financial requirements beyond current research grants.",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Funding Recognition",
                definition: "Company recognizes need for institutional funding and begins understanding venture capital requirements",
                deliverables: ["Fundraising strategy and timeline"],
                indicators: ["Founders understand funding options", "Initial corporate structure considerations"],
                healthExtras: { indicators: ["Use of proceeds includes clinical validation"], deliverables: ["Seed budget with clinical line items"] }
            },
            {
                level: 2,
                title: "Legal Foundation",
                definition: "Legal entity properly established with all basic incorporation documents complete. Basic financial tracking in place",
                deliverables: ["Corporate bylaws", "Incorporation documents"],
                indicators: ["Company incorporated", "Basic financial systems operational"],
                healthExtras: { indicators: ["Runway covers preclinical/feasibility"], deliverables: ["Budget for early studies"] }
            },
            {
                level: 3,
                title: "Financial Modeling",
                definition: "Basic financial model created projecting 12 months forward. Cap table documented",
                deliverables: ["Initial cap table", "12-month financial model"],
                indicators: ["Financial projections created", "Equity structure documented", "SBIR Phase I, university grants, or friends & family funding may be achievable"],
                healthExtras: { indicators: ["Capital plan for IND or device studies"], deliverables: ["Milestone-based plan"] }
            },
            {
                level: 4,
                title: "Pitch Ready",
                definition: "Pitch deck addressing problem, solution, market, team, traction, financials, and ask. Three-year financial model with revenue projections",
                deliverables: ["Investor pitch deck", "3-year financial model"],
                indicators: ["Complete pitch materials", "Comprehensive financial model", "Clear fundraising strategy", "SBIR Phase I/II, accelerator, or angel funding may be achievable"],
                healthExtras: { indicators: ["Funding allocated to trials"], deliverables: ["Clinical program budget"] }
            },
            {
                level: 5,
                title: "Due Diligence Ready",
                definition: "All standard due diligence documents prepared including material contracts, IP assignments, employment agreements",
                deliverables: ["Due diligence package", "Document checklist"],
                indicators: ["All legal documents organized", "Technical documentation prepared", "SBIR Phase II, angel investment, or pre-seed VC may be achievable"],
                healthExtras: { indicators: ["Runway sufficient for submissions"], deliverables: ["Submission costs in model"] }
            },
            {
                level: 6,
                title: "Investment Ready",
                definition: "Data room organized. Financial model includes scenario planning. Legal documentation reviewed by experienced counsel",
                deliverables: ["Data room", "Valuation analysis"],
                indicators: ["Data room complete", "Professional valuation supportable", "References prepared", "Seed VC or strategic investment may be achievable"],
                healthExtras: { indicators: ["Investors diligencing clinical strategy"], deliverables: ["DD materials (clinical)"] }
            },
            {
                level: 7,
                title: "Active Fundraising",
                definition: "Investor pipeline built. Tailored pitch materials for different investor types. Multiple investor meetings scheduled",
                deliverables: ["Investor target list", "Meeting schedule"],
                indicators: ["Active investor outreach", "Multiple meetings occurring", "Negotiation approach defined"],
                healthExtras: { indicators: ["Capital secured for clinical program"], deliverables: ["Term sheet/funding docs"] }
            },
            {
                level: 8,
                title: "Deal Momentum",
                definition: "Multiple investors progressing through due diligence simultaneously. Strong investor interest validated",
                deliverables: ["Term sheet drafts", "Investor updates"],
                indicators: ["Multiple investors in due diligence", "Verbal interest expressed", "Closing timeline identified"],
                healthExtras: { indicators: ["Funding tied to clinical outcome milestones"], deliverables: ["Milestone schedule"] }
            },
            {
                level: 9,
                title: "Closing Round",
                definition: "Term sheets received and compared. Final negotiation and legal documentation underway",
                deliverables: ["Executed term sheets", "Legal documentation"],
                indicators: ["Terms under negotiation", "Legal closing process underway"],
                healthExtras: { indicators: ["Financing supports scale & post-market evidence"], deliverables: ["Scale-evidence plan"] }
            }
        ]
    },

    'Regulatory': {
        levels: [
            {
                level: 0,
                title: "No Regulatory Awareness",
                definition: "No regulatory considerations have been identified. The venture has not assessed whether regulatory pathways or compliance requirements apply.",
                deliverables: [],
                indicators: []
            },
            {
                level: 1,
                title: "Regulatory Landscape",
                definition: "Initial regulatory landscape assessed with potential pathways identified for target markets.",
                deliverables: ["Regulatory landscape assessment"],
                indicators: ["Regulatory requirements identified", "Potential pathways outlined (e.g., 510(k), PMA, De Novo, IND)"],
                healthExtras: { indicators: ["Regulatory landscape & pathway hypothesis"], deliverables: ["Pathway brief"] }
            },
            {
                level: 2,
                title: "Regulatory Strategy",
                definition: "Regulatory strategy developed with timeline, resource requirements, and pathway selection rationale.",
                deliverables: ["Regulatory strategy document", "Regulatory timeline"],
                indicators: ["Strategy documented", "Regulatory consultants or expertise engaged"],
                healthExtras: { indicators: ["Pre-sub/Type B meeting considered"], deliverables: ["Briefing package outline"] }
            },
            {
                level: 3,
                title: "Pre-Submission Preparation",
                definition: "Pre-submission preparation underway with testing requirements identified and documentation planning initiated.",
                deliverables: ["Pre-submission outline", "Testing requirements matrix"],
                indicators: ["Testing requirements mapped to pathway", "Documentation approach defined"],
                healthExtras: { indicators: ["Testing protocol needs mapped to pathway"], deliverables: ["Testing matrix"] }
            },
            {
                level: 4,
                title: "Regulatory Testing",
                definition: "Regulatory testing underway with protocols established and quality systems implemented to support submissions.",
                deliverables: ["Test protocols", "Quality system documentation"],
                indicators: ["Testing initiated per protocol", "Quality systems operational"],
                healthExtras: { indicators: ["Pre-sub/Type B meeting completed"], deliverables: ["Meeting minutes"] }
            },
            {
                level: 5,
                title: "Agency Engagement",
                definition: "Pre-submission meeting completed with regulatory agency and feedback incorporated into development plan.",
                deliverables: ["Pre-submission meeting request", "Meeting minutes"],
                indicators: ["Agency meeting held (e.g., Pre-Sub, Type B)", "Feedback incorporated into plan"],
                healthExtras: { indicators: ["Submission plan & timeline defined"], deliverables: ["Submission plan"] }
            },
            {
                level: 6,
                title: "Submission Preparation",
                definition: "Regulatory submission in active preparation with all sections drafted and supporting data compiled.",
                deliverables: ["Submission draft", "Supporting data package"],
                indicators: ["Submission sections drafted", "Data compilation underway"],
                healthExtras: { indicators: ["Submission in preparation"], deliverables: ["Module drafts"] }
            },
            {
                level: 7,
                title: "Submission Filed",
                definition: "Regulatory submission filed with agency and under active review.",
                deliverables: ["Filed submission confirmation", "Submission package"],
                indicators: ["Submission accepted by agency", "Review process initiated"],
                healthExtras: { indicators: ["Submission filed"], deliverables: ["Filed submission"] }
            },
            {
                level: 8,
                title: "Agency Review",
                definition: "Under active agency review with responses to questions or deficiencies submitted as needed.",
                deliverables: ["Response documents", "Additional data submissions"],
                indicators: ["Responding to agency requests", "Review progressing toward decision"],
                healthExtras: { indicators: ["Agency interactions underway"], deliverables: ["IR/deficiency response drafts"] }
            },
            {
                level: 9,
                title: "Regulatory Authorization",
                definition: "Regulatory clearance, approval, or authorization received with post-market requirements understood.",
                deliverables: ["Approval/clearance letter", "Post-market requirements summary"],
                indicators: ["Regulatory authorization received", "Post-market obligations identified"],
                healthExtras: { indicators: ["Clearance/approval achieved"], deliverables: ["Approval package"] }
            }
        ]
    }
};

// Default export for convenience
export default readinessData;
