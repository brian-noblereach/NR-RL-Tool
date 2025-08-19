// data.js - Readiness Level Data Structure

const readinessData = {
    'IP': {
        levels: [
            {
                level: 1,
                title: "Initial IP Strategy",
                definition: "Initial IP strategy development with identified forms of intellectual property rights including basic understanding of IP positioning and relevant patent landscapes.",
                deliverables: ["Initial IP Strategy Memo"],
                indicators: ["Clarity on whether any of the IP is possibly patentable", "Understanding of IP landscape basics"]
            },
            {
                level: 2,
                title: "Formal IP Documentation",
                definition: "Formal IP documentation and evaluation, comprehensive records of technological developments and basic patent application information gathered for legal consideration.",
                deliverables: ["Invention Disclosure Forms", "IP Documentation Templates", "Technology Development Records"],
                indicators: ["Initial invention disclosure forms completed", "Patent attorney engaged for preliminary assessment"]
            },
            {
                level: 3,
                title: "IP Filings Initiated",
                definition: "Obtained invention disclosures, preliminary patent landscape assessments, identification of potential IP obstacles, and initial IP filings made.",
                deliverables: ["Patent Landscape Analysis", "Patent Application Submission Package"],
                indicators: ["Patent application submitted", "FTO preliminary assessment completed"]
            },
            {
                level: 4,
                title: "Strategic IP Planning",
                definition: "Possesses IP planning and disclosure capability, developing IP strategies that anticipate future innovation directions, competitive landscape evolution, and potential ancillary IP.",
                deliverables: ["IP Protection Strategy Document", "Prioritized List of Patentable Innovations"],
                indicators: ["Begin licensing conversations", "Developing regulatory pathway requirements for IP protection"]
            },
            {
                level: 5,
                title: "Patent Prosecution",
                definition: "Patent development and prosecution in development with the completion of professional drafting, submission, and active prosecution of a patent.",
                deliverables: ["Patent Application Package", "Patent Prosecution Documentation"],
                indicators: ["Active patent prosecution underway", "Continuing licensing conversations"]
            },
            {
                level: 6,
                title: "Active IP Implementation",
                definition: "Active IP strategy implementation with completed initial landscape / FTO assessment.",
                deliverables: ["FTO Assessment", "IP Implementation Plan"],
                indicators: ["Demonstrating licensing negotiation capabilities", "Third-party IP assets identified and assessed"]
            },
            {
                level: 7,
                title: "Comprehensive IP Portfolio",
                definition: "Comprehensive IP portfolio established with all relevant IPR filed across key jurisdictions. Strategic licenses obtained or granted for critical IP.",
                deliverables: ["Multi-Jurisdiction Patent Filing Strategy", "IP Portfolio Dashboard"],
                indicators: ["Multiple patent applications filed", "Licensing solutions for third-party IP in place"]
            },
            {
                level: 8,
                title: "Mature IP Management",
                definition: "Mature IP strategy and management fully implemented with ongoing portfolio optimization. Multiple patents issued in core technology areas.",
                deliverables: ["IP Portfolio Optimization Report"],
                indicators: ["Multiple patents issued", "IP access discussions occurring"]
            },
            {
                level: 9,
                title: "Full IP Protection",
                definition: "IPR support and protection for business. Patent(s) granted in all relevant countries and actively maintained. Broad patent portfolio with continuation strategies in place.",
                deliverables: ["IP Enforcement Strategy"],
                indicators: ["IP effectively excludes third parties from practicing", "Full patent portfolio in place"]
            }
        ]
    },
    
    'Technology': {
        levels: [
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
                }
            }
        ]
    },
    
    'Market': {
        levels: [
            {
                level: 1,
                title: "Initial Market Understanding",
                definition: "High level understanding of initial target market and applications.",
                deliverables: ["Market opportunity brief"],
                indicators: ["Initial market hypothesis", "Potential applications identified"]
            },
            {
                level: 2,
                title: "Market Analysis",
                definition: "Market/segments(s) analysis (TAM, SAM, SOM, growth rates) and overview of \"in market\" competitors.",
                deliverables: ["Market analysis report", "Competitive overview"],
                indicators: ["TAM/SAM/SOM calculated", "Competitors identified"]
            },
            {
                level: 3,
                title: "Competitive Understanding",
                definition: "Strong understanding of market as well as emerging competitors, competitive overview completed.",
                deliverables: ["Detailed competitive analysis", "Market positioning"],
                indicators: ["Emerging competitors tracked", "Competitive advantages identified"]
            },
            {
                level: 4,
                title: "Customer Discovery",
                definition: "Customer discovery completed with documented evidence of product-market fit from target customer interviews",
                deliverables: ["Customer discovery report", "Product-market fit evidence"],
                indicators: ["100+ customer interviews", "Problem-solution fit validated"]
            },
            {
                level: 5,
                title: "Market Validation",
                definition: "Market validation achieved through pilot customers or LOIs demonstrating commercial interest",
                deliverables: ["LOIs or pilot agreements", "Validation metrics"],
                indicators: ["Pilot customers secured", "Willingness to pay confirmed"]
            },
            {
                level: 6,
                title: "Go-to-Market Strategy",
                definition: "Market entry strategy defined with clear go-to-market plan and initial customer acquisition channels identified",
                deliverables: ["Go-to-market plan", "Sales strategy"],
                indicators: ["Distribution channels identified", "Pricing strategy set"]
            },
            {
                level: 7,
                title: "Early Market Traction",
                definition: "Early market traction demonstrated with paying customers and validated unit economics",
                deliverables: ["Customer case studies", "Revenue reports"],
                indicators: ["First paying customers", "Positive unit economics"]
            },
            {
                level: 8,
                title: "Market Penetration",
                definition: "Market penetration accelerating with proven customer acquisition model and expanding market share",
                deliverables: ["Growth metrics", "Market share analysis"],
                indicators: ["Customer acquisition cost optimized", "Retention rates strong"]
            },
            {
                level: 9,
                title: "Market Leadership",
                definition: "Market leadership position established with sustainable competitive advantages and strong brand recognition",
                deliverables: ["Market position report", "Brand value assessment"],
                indicators: ["Market leader position", "Strong brand equity"]
            }
        ]
    },
    
    'Product': {
        levels: [
            {
                level: 1,
                title: "Market Need Identified",
                definition: "Can identify a market need and application for which the technology is applicable.",
                deliverables: ["Product vision document"],
                indicators: ["Market need identified", "Application concept defined"]
            },
            {
                level: 2,
                title: "Product Concept",
                definition: "Validated market need and identified product concept; Value proposition thesis.",
                deliverables: ["Product concept document", "Value proposition"],
                indicators: ["Market need validated", "Value proposition drafted"]
            },
            {
                level: 3,
                title: "User Validation",
                definition: "Initial validation of product concept through user engagement. Validated value proposition.",
                deliverables: ["User feedback reports", "Validated value proposition"],
                indicators: ["User engagement conducted", "Value proposition validated"]
            },
            {
                level: 4,
                title: "MVP Development",
                definition: "Minimum Viable Product (MVP) developed with core features functional",
                deliverables: ["MVP release", "Testing documentation"],
                indicators: ["Core features working", "Initial user feedback collected"]
            },
            {
                level: 5,
                title: "Product Iteration",
                definition: "Product iterations based on user feedback with enhanced features and improved performance",
                deliverables: ["Updated product versions", "User feedback reports"],
                indicators: ["Multiple iterations released", "User satisfaction improving"]
            },
            {
                level: 6,
                title: "Beta Product",
                definition: "Beta product released to select users with most planned features implemented",
                deliverables: ["Beta release", "Beta test reports"],
                indicators: ["Beta users engaged", "Critical bugs resolved"]
            },
            {
                level: 7,
                title: "Market-Ready Product",
                definition: "Market-ready product with full feature set, quality assurance, and support systems",
                deliverables: ["Production release", "Support documentation"],
                indicators: ["Quality standards met", "Support systems operational"]
            },
            {
                level: 8,
                title: "Product Optimization",
                definition: "Product optimized for scale with performance, reliability, and user experience refined",
                deliverables: ["Performance reports", "Optimization documentation"],
                indicators: ["Performance metrics excellent", "User experience refined"]
            },
            {
                level: 9,
                title: "Product Excellence",
                definition: "Industry-leading product with continuous innovation and market differentiation",
                deliverables: ["Product roadmap", "Innovation pipeline"],
                indicators: ["Industry recognition", "Continuous innovation"]
            }
        ]
    },
    
    'Team': {
        levels: [
            {
                level: 1,
                title: "Founding Team",
                definition: "Initial founding team with commitment to the venture and complementary skills",
                deliverables: ["Team bios", "Roles and responsibilities"],
                indicators: ["Founders committed", "Initial roles defined"]
            },
            {
                level: 2,
                title: "Core Team Forming",
                definition: "Core team forming with key technical and business roles identified",
                deliverables: ["Org chart", "Hiring plan"],
                indicators: ["Key roles identified", "Initial hires planned"]
            },
            {
                level: 3,
                title: "Key Hires Made",
                definition: "Key early hires made in critical technical or business functions",
                deliverables: ["Team expansion plan", "Onboarding materials"],
                indicators: ["Critical positions filled", "Team capabilities expanding"]
            },
            {
                level: 4,
                title: "Functional Teams",
                definition: "Functional teams established for major areas (tech, sales, operations)",
                deliverables: ["Department structures", "Team KPIs"],
                indicators: ["Departments operational", "Clear reporting structure"]
            },
            {
                level: 5,
                title: "Advisory Board",
                definition: "Advisory board or mentors engaged with industry expertise and networks",
                deliverables: ["Advisory agreements", "Board meeting minutes"],
                indicators: ["Advisors engaged", "Regular advisory meetings"]
            },
            {
                level: 6,
                title: "Experienced Leadership",
                definition: "Experienced leadership team with proven track records in relevant domains",
                deliverables: ["Leadership team profiles", "Management processes"],
                indicators: ["Seasoned executives hired", "Management systems in place"]
            },
            {
                level: 7,
                title: "Scaling Team",
                definition: "Team scaling with hiring processes, culture, and talent development programs",
                deliverables: ["Hiring playbook", "Culture documentation"],
                indicators: ["Hiring velocity increased", "Strong culture established"]
            },
            {
                level: 8,
                title: "High-Performance Team",
                definition: "High-performance team with low turnover and strong execution capabilities",
                deliverables: ["Performance metrics", "Retention programs"],
                indicators: ["Low turnover rates", "High performance metrics"]
            },
            {
                level: 9,
                title: "World-Class Team",
                definition: "World-class team recognized as industry leaders with exceptional talent density",
                deliverables: ["Talent strategy", "Succession planning"],
                indicators: ["Industry recognition", "Top talent attraction"]
            }
        ]
    },
    
    'Go-to-Market': {
        levels: [
            {
                level: 1,
                title: "GTM Concept",
                definition: "Initial go-to-market concepts and channels identified",
                deliverables: ["GTM concept brief"],
                indicators: ["Initial channels identified", "Basic messaging drafted"]
            },
            {
                level: 2,
                title: "GTM Strategy Draft",
                definition: "Go-to-market strategy drafted with target segments and positioning",
                deliverables: ["GTM strategy document", "Positioning statement"],
                indicators: ["Target segments defined", "Value proposition clear"]
            },
            {
                level: 3,
                title: "Sales Process Design",
                definition: "Sales process designed with customer journey and touchpoints mapped",
                deliverables: ["Sales process documentation", "Customer journey map"],
                indicators: ["Sales stages defined", "Customer touchpoints mapped"]
            },
            {
                level: 4,
                title: "Marketing Foundation",
                definition: "Marketing foundation established with brand, messaging, and content",
                deliverables: ["Brand guidelines", "Marketing materials"],
                indicators: ["Brand identity created", "Initial content produced"]
            },
            {
                level: 5,
                title: "Channel Testing",
                definition: "Distribution and marketing channels tested with early results",
                deliverables: ["Channel test results", "Marketing metrics"],
                indicators: ["Multiple channels tested", "Early metrics tracked"]
            },
            {
                level: 6,
                title: "Sales Team Built",
                definition: "Sales team built with processes, tools, and training in place",
                deliverables: ["Sales playbook", "Training materials"],
                indicators: ["Sales team hired", "CRM implemented"]
            },
            {
                level: 7,
                title: "GTM Execution",
                definition: "Go-to-market execution underway with consistent lead generation",
                deliverables: ["Sales reports", "Marketing analytics"],
                indicators: ["Pipeline growing", "Conversion rates improving"]
            },
            {
                level: 8,
                title: "GTM Optimization",
                definition: "Go-to-market optimized with predictable customer acquisition",
                deliverables: ["CAC/LTV analysis", "Growth metrics"],
                indicators: ["CAC optimized", "Predictable growth"]
            },
            {
                level: 9,
                title: "Market Dominance",
                definition: "Market dominance strategies executing with category leadership",
                deliverables: ["Market expansion plans", "Category strategy"],
                indicators: ["Category leader", "Market expansion successful"]
            }
        ]
    },
    
    'Business': {
        levels: [
            {
                level: 1,
                title: "Business Concept",
                definition: "Initial business concept with basic value proposition identified",
                deliverables: ["Business concept document"],
                indicators: ["Value proposition drafted", "Business idea articulated"]
            },
            {
                level: 2,
                title: "Business Model Canvas",
                definition: "Business model canvas completed with key components defined",
                deliverables: ["Business model canvas", "Revenue model"],
                indicators: ["Revenue streams identified", "Cost structure outlined"]
            },
            {
                level: 3,
                title: "Business Plan",
                definition: "Comprehensive business plan with financial projections and milestones",
                deliverables: ["Business plan", "Financial projections"],
                indicators: ["3-year projections", "Key milestones defined"]
            },
            {
                level: 4,
                title: "Entity Formation",
                definition: "Legal entity formed with governance structure and initial agreements",
                deliverables: ["Incorporation documents", "Founder agreements"],
                indicators: ["Company incorporated", "Equity structure set"]
            },
            {
                level: 5,
                title: "Operations Established",
                definition: "Basic operations established with systems and processes in place",
                deliverables: ["Operations manual", "Process documentation"],
                indicators: ["Core processes defined", "Systems implemented"]
            },
            {
                level: 6,
                title: "Revenue Generation",
                definition: "Revenue generation started with initial customers and transactions",
                deliverables: ["Revenue reports", "Customer contracts"],
                indicators: ["First revenue generated", "Customer base growing"]
            },
            {
                level: 7,
                title: "Business Scaling",
                definition: "Business scaling with operational efficiency and growth metrics",
                deliverables: ["Scaling plan", "KPI dashboard"],
                indicators: ["Operations scaling", "Efficiency improving"]
            },
            {
                level: 8,
                title: "Sustainable Business",
                definition: "Sustainable business model with path to profitability clear",
                deliverables: ["Path to profitability", "Unit economics"],
                indicators: ["Positive unit economics", "Break-even approaching"]
            },
            {
                level: 9,
                title: "Profitable Growth",
                definition: "Profitable growth achieved with strong financial performance",
                deliverables: ["Financial statements", "Growth strategy"],
                indicators: ["Profitability achieved", "Sustainable growth"]
            }
        ]
    },
    
    'Funding': {
        levels: [
            {
                level: 1,
                title: "Funding Recognition",
                definition: "Company recognizes need for institutional funding and begins understanding venture capital requirements.",
                deliverables: ["Fundraising Strategy and Timeline"],
                indicators: ["Founders understand funding landscape", "Initial corporate structure in place"]
            },
            {
                level: 2,
                title: "Legal Foundation",
                definition: "Legal entity properly established with all basic incorporation documents complete. Basic financial tracking in place.",
                deliverables: ["Corporate Bylaws"],
                indicators: ["Company incorporated", "Basic financial systems operational"]
            },
            {
                level: 3,
                title: "Financial Modeling",
                definition: "Basic financial model created projecting 12 months forward. Cap table documented.",
                deliverables: ["Initial Cap Table", "12-Month Financial Model"],
                indicators: ["Financial projections created", "Equity structure documented"]
            },
            {
                level: 4,
                title: "Pitch Ready",
                definition: "Pitch deck addressing problem, solution, market, team, traction, financials, ask. Three-year financial model with revenue projections.",
                deliverables: ["Investor Pitch Deck"],
                indicators: ["Complete pitch materials", "Comprehensive financial model", "Clear fundraising strategy"]
            },
            {
                level: 5,
                title: "Due Diligence Ready",
                definition: "All standard due diligence documents prepared including material contracts, IP assignments, employment agreements.",
                deliverables: ["Due diligence package"],
                indicators: ["All legal documents organized", "Technical materials prepared"]
            },
            {
                level: 6,
                title: "Investment Ready",
                definition: "Data room organized. Financial model includes scenario planning. Legal documentation reviewed by experienced counsel.",
                deliverables: ["Valuation Analysis"],
                indicators: ["Data room complete", "Professional valuation completed", "References prepared"]
            },
            {
                level: 7,
                title: "Active Fundraising",
                definition: "Investor pipeline built. Tailored pitch materials for different investor types. Multiple investor meetings scheduled.",
                deliverables: ["Investor Target List"],
                indicators: ["Active investor outreach", "Multiple meetings scheduled", "Negotiation strategy defined"]
            },
            {
                level: 8,
                title: "Deal Momentum",
                definition: "Multiple investors progressing through due diligence simultaneously. Strong investor interest validated.",
                deliverables: ["Term sheet drafts"],
                indicators: ["Multiple investors in due diligence", "Verbal commitments received", "Clear closing timeline"]
            },
            {
                level: 9,
                title: "Closing Round",
                definition: "Multiple term sheets received and compared. Sophisticated negotiation of terms beyond valuation.",
                deliverables: ["Executed term sheets", "Legal documentation"],
                indicators: ["Multiple term sheets", "Terms negotiated", "Legal closing process underway"]
            }
        ]
    },
    
    'Regulatory': {
        levels: [
            {
                level: 1,
                title: "Regulatory Landscape",
                definition: "Initial regulatory landscape assessment and pathway identification",
                deliverables: ["Regulatory assessment"],
                indicators: ["Regulatory requirements identified", "Pathway outlined"]
            },
            {
                level: 2,
                title: "Regulatory Strategy",
                definition: "Regulatory strategy developed with timeline and requirements",
                deliverables: ["Regulatory strategy document", "Timeline"],
                indicators: ["Strategy documented", "Consultants engaged"]
            },
            {
                level: 3,
                title: "Pre-Submission Preparation",
                definition: "Pre-submission preparation with documentation and testing plans",
                deliverables: ["Pre-submission package", "Testing protocols"],
                indicators: ["Documentation started", "Testing planned"]
            },
            {
                level: 4,
                title: "Regulatory Testing",
                definition: "Regulatory testing underway with protocols and quality systems",
                deliverables: ["Test reports", "Quality documentation"],
                indicators: ["Testing initiated", "Quality systems implemented"]
            },
            {
                level: 5,
                title: "Pre-Submission Meeting",
                definition: "Pre-submission meetings with regulatory agencies completed",
                deliverables: ["Meeting minutes", "Agency feedback"],
                indicators: ["FDA meeting held", "Feedback incorporated"]
            },
            {
                level: 6,
                title: "Regulatory Submission",
                definition: "Regulatory submission prepared and submitted to agencies",
                deliverables: ["Submission package", "510(k)/PMA/IND"],
                indicators: ["Submission complete", "Under review"]
            },
            {
                level: 7,
                title: "Regulatory Review",
                definition: "Under regulatory review with responses to agency questions",
                deliverables: ["Response documents", "Additional data"],
                indicators: ["Responding to FDA", "Review progressing"]
            },
            {
                level: 8,
                title: "Regulatory Approval",
                definition: "Regulatory approval or clearance received from agencies",
                deliverables: ["Approval letter", "Post-market requirements"],
                indicators: ["FDA approval/clearance", "Market access granted"]
            },
            {
                level: 9,
                title: "Post-Market Compliance",
                definition: "Post-market compliance and surveillance systems operational",
                deliverables: ["Compliance reports", "Surveillance data"],
                indicators: ["Post-market surveillance active", "Compliance maintained"]
            }
        ]
    }
};
// --- Expose for ESM modules (vdr.js, main.js, etc.) ---
if (typeof window !== "undefined" && !window.readinessData) {
  window.readinessData = readinessData;
}
