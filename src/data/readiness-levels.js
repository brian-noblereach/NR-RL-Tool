// data.js - Readiness Level Data Structure (ES Module)
// Updated December 2024 - Revised definitions based on advisor feedback

export const readinessData = {
    'IP': {
        levels: [
            {
                level: 1,
                title: "Initial IP Strategy",
                definition: "Initial IP strategy development with basic understanding of IP positioning and relevant patent landscapes.",
                deliverables: ["Initial IP Strategy Memo"],
                indicators: ["Clarity on whether any IP is potentially patentable", "Understanding of IP landscape basics"]
            },
            {
                level: 2,
                title: "Formal IP Documentation",
                definition: "Formal IP documentation and evaluation with comprehensive records of technological developments gathered for legal consideration.",
                deliverables: ["Invention Disclosure Forms", "IP Documentation Templates", "Technology Development Records"],
                indicators: ["Initial invention disclosure forms completed", "Patent attorney or tech transfer office engaged for preliminary assessment"]
            },
            {
                level: 3,
                title: "IP Filings Initiated",
                definition: "Preliminary patent landscape assessments completed, potential IP obstacles identified, and initial IP filings made.",
                deliverables: ["Patent Landscape Analysis", "Patent Application Submission Package"],
                indicators: ["Patent application submitted (provisional or non-provisional)", "Preliminary FTO assessment completed"]
            },
            {
                level: 4,
                title: "Strategic IP Planning",
                definition: "IP planning and disclosure capability established with strategies that anticipate future innovation directions and competitive landscape evolution.",
                deliverables: ["IP Protection Strategy Document", "Prioritized List of Patentable Innovations"],
                indicators: ["Licensing conversations initiated (in or out)", "Regulatory pathway requirements for IP protection understood"]
            },
            {
                level: 5,
                title: "Patent Prosecution",
                definition: "Active patent prosecution underway with professional drafting, submission, and response to office actions.",
                deliverables: ["Patent Application Package", "Patent Prosecution Documentation"],
                indicators: ["Active patent prosecution underway", "Licensing negotiations progressing"]
            },
            {
                level: 6,
                title: "First Patent Issued",
                definition: "At least one patent granted or licensed. Initial FTO assessment completed for core technology.",
                deliverables: ["Issued Patent or Executed License Agreement", "FTO Assessment"],
                indicators: ["First patent issued or exclusive license secured", "Third-party IP risks identified and addressed"]
            },
            {
                level: 7,
                title: "Portfolio Development",
                definition: "IP portfolio expanding with multiple applications filed across relevant jurisdictions. Strategic licensing arrangements in place.",
                deliverables: ["Multi-Jurisdiction Filing Strategy", "IP Portfolio Summary"],
                indicators: ["Multiple patent applications filed or in-licensed", "Licensing solutions for third-party IP in place"]
            },
            {
                level: 8,
                title: "Mature IP Portfolio",
                definition: "Multiple patents issued with ongoing portfolio optimization. Continuation strategies active for core technology areas.",
                deliverables: ["IP Portfolio Optimization Report", "Continuation Filing Plan"],
                indicators: ["Multiple patents issued", "Portfolio actively managed and expanded"]
            },
            {
                level: 9,
                title: "Comprehensive IP Protection",
                definition: "Strong IP position supporting business operations with broad patent portfolio providing meaningful competitive protection.",
                deliverables: ["IP Enforcement Strategy", "Portfolio Valuation"],
                indicators: ["IP effectively supports market position", "Comprehensive granted portfolio in place"]
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
                definition: "High-level understanding of initial target market and applications.",
                deliverables: ["Market opportunity brief"],
                indicators: ["Initial market hypothesis", "Potential applications identified"]
            },
            {
                level: 2,
                title: "Market Analysis",
                definition: "Market and segment analysis (TAM, SAM, SOM, growth rates) with overview of existing competitors.",
                deliverables: ["Market analysis report", "Competitive overview"],
                indicators: ["TAM/SAM/SOM calculated", "Key competitors identified"]
            },
            {
                level: 3,
                title: "Competitive Understanding",
                definition: "Strong understanding of market dynamics and emerging competitors with competitive positioning defined.",
                deliverables: ["Detailed competitive analysis", "Market positioning document"],
                indicators: ["Emerging competitors tracked", "Competitive advantages identified"]
            },
            {
                level: 4,
                title: "Customer Discovery",
                definition: "Customer discovery completed with documented evidence of problem-solution fit from target customer interviews.",
                deliverables: ["Customer discovery report", "Problem-solution fit evidence"],
                indicators: ["Substantial customer interviews completed", "Problem-solution fit validated"]
            },
            {
                level: 5,
                title: "Market Validation",
                definition: "Market validation achieved through pilot customers or LOIs demonstrating commercial interest.",
                deliverables: ["LOIs or pilot agreements", "Validation metrics"],
                indicators: ["Pilot customers secured", "Willingness to pay confirmed"]
            },
            {
                level: 6,
                title: "Go-to-Market Strategy",
                definition: "Market entry strategy defined with clear go-to-market plan and initial customer acquisition channels identified.",
                deliverables: ["Go-to-market plan", "Sales strategy"],
                indicators: ["Distribution channels identified", "Pricing strategy established"]
            },
            {
                level: 7,
                title: "Early Market Traction",
                definition: "Early market traction demonstrated with paying customers and validated unit economics.",
                deliverables: ["Customer case studies", "Revenue reports"],
                indicators: ["First paying customers acquired", "Positive unit economics demonstrated"]
            },
            {
                level: 8,
                title: "Repeatable Sales",
                definition: "Repeatable customer acquisition model validated with growing customer base and improving retention.",
                deliverables: ["Growth metrics", "Customer acquisition analysis"],
                indicators: ["Customer acquisition process repeatable", "Retention rates established"]
            },
            {
                level: 9,
                title: "Market Expansion",
                definition: "Market position established with multiple customer segments or geographies and sustainable competitive positioning.",
                deliverables: ["Market expansion plan", "Competitive position analysis"],
                indicators: ["Multiple customer segments served", "Clear competitive differentiation"]
            }
        ]
    },
    
    'Product': {
        levels: [
            {
                level: 1,
                title: "Market Need Identified",
                definition: "Market need and application identified for which the technology is applicable.",
                deliverables: ["Product vision document"],
                indicators: ["Market need identified", "Application concept defined"]
            },
            {
                level: 2,
                title: "Product Concept",
                definition: "Validated market need with identified product concept and value proposition thesis.",
                deliverables: ["Product concept document", "Value proposition"],
                indicators: ["Market need validated", "Value proposition drafted"]
            },
            {
                level: 3,
                title: "User Validation",
                definition: "Initial validation of product concept through user engagement with validated value proposition.",
                deliverables: ["User feedback reports", "Validated value proposition"],
                indicators: ["User engagement conducted", "Value proposition validated"]
            },
            {
                level: 4,
                title: "MVP Development",
                definition: "Minimum Viable Product (MVP) developed with core features functional.",
                deliverables: ["MVP release", "Testing documentation"],
                indicators: ["Core features working", "Initial user feedback collected"]
            },
            {
                level: 5,
                title: "Product Iteration",
                definition: "Product iterations based on user feedback with enhanced features and improved performance.",
                deliverables: ["Updated product versions", "User feedback analysis"],
                indicators: ["Multiple iterations released", "User satisfaction improving"]
            },
            {
                level: 6,
                title: "Beta Product",
                definition: "Beta product released to select users with most planned features implemented.",
                deliverables: ["Beta release", "Beta test reports"],
                indicators: ["Beta users actively engaged", "Critical issues resolved"]
            },
            {
                level: 7,
                title: "Market-Ready Product",
                definition: "Market-ready product with full feature set, quality assurance, and support systems in place.",
                deliverables: ["Production release", "Support documentation"],
                indicators: ["Quality standards met", "Support systems operational"]
            },
            {
                level: 8,
                title: "Product Optimization",
                definition: "Product optimized for scale with performance, reliability, and user experience refined based on market feedback.",
                deliverables: ["Performance reports", "Optimization documentation"],
                indicators: ["Performance metrics strong", "User experience refined"]
            },
            {
                level: 9,
                title: "Mature Product",
                definition: "Mature product with established roadmap, continuous improvement process, and clear differentiation from alternatives.",
                deliverables: ["Product roadmap", "Feature pipeline"],
                indicators: ["Product roadmap established", "Continuous improvement process active"]
            }
        ]
    },
    
    'Team': {
        levels: [
            {
                level: 1,
                title: "Founding Team",
                definition: "Initial founding team with commitment to the venture and complementary skills identified.",
                deliverables: ["Team bios", "Roles and responsibilities"],
                indicators: ["Founders committed", "Initial roles defined"]
            },
            {
                level: 2,
                title: "Core Team Forming",
                definition: "Core team forming with key technical and business roles identified and hiring priorities set.",
                deliverables: ["Org chart", "Hiring plan"],
                indicators: ["Key roles identified", "Initial hires planned"]
            },
            {
                level: 3,
                title: "Key Hires Made",
                definition: "Key early hires made in critical technical or business functions.",
                deliverables: ["Team expansion plan", "Onboarding materials"],
                indicators: ["Critical positions filled", "Team capabilities expanding"]
            },
            {
                level: 4,
                title: "Advisors Engaged",
                definition: "Advisors or mentors engaged with relevant industry expertise and networks. Functional responsibilities clarifying.",
                deliverables: ["Advisory agreements", "Role descriptions"],
                indicators: ["Advisors actively engaged", "Regular advisory input received"]
            },
            {
                level: 5,
                title: "Functional Teams",
                definition: "Functional teams or owners established for major areas (technology, sales, operations).",
                deliverables: ["Department structures", "Team KPIs"],
                indicators: ["Key functions staffed", "Clear accountability established"]
            },
            {
                level: 6,
                title: "Experienced Leadership",
                definition: "Experienced leadership in place with relevant domain expertise and execution capability.",
                deliverables: ["Leadership team profiles", "Management processes"],
                indicators: ["Experienced leaders hired", "Management systems operational"]
            },
            {
                level: 7,
                title: "Scaling Team",
                definition: "Team scaling with hiring processes, culture, and talent development approaches established.",
                deliverables: ["Hiring playbook", "Culture documentation"],
                indicators: ["Hiring velocity appropriate to stage", "Team culture established"]
            },
            {
                level: 8,
                title: "High-Performance Team",
                definition: "High-performing team with strong retention and consistent execution capability.",
                deliverables: ["Performance metrics", "Retention data"],
                indicators: ["Low turnover", "Consistent execution demonstrated"]
            },
            {
                level: 9,
                title: "Complete Leadership Team",
                definition: "Complete leadership team with all key functions covered and proven ability to execute strategic plans.",
                deliverables: ["Leadership coverage analysis", "Succession considerations"],
                indicators: ["All key leadership roles filled", "Team executing effectively"]
            }
        ]
    },
    
    'Go-to-Market': {
        levels: [
            {
                level: 1,
                title: "GTM Concept",
                definition: "Initial go-to-market concepts and channels identified.",
                deliverables: ["GTM concept brief"],
                indicators: ["Initial channels identified", "Basic messaging drafted"]
            },
            {
                level: 2,
                title: "GTM Strategy Draft",
                definition: "Go-to-market strategy drafted with target segments and positioning defined.",
                deliverables: ["GTM strategy document", "Positioning statement"],
                indicators: ["Target segments defined", "Value proposition clear"]
            },
            {
                level: 3,
                title: "Sales Process Design",
                definition: "Sales process designed with customer journey and touchpoints mapped.",
                deliverables: ["Sales process documentation", "Customer journey map"],
                indicators: ["Sales stages defined", "Customer touchpoints mapped"]
            },
            {
                level: 4,
                title: "Marketing Foundation",
                definition: "Marketing foundation established with brand, messaging, and initial content.",
                deliverables: ["Brand guidelines", "Marketing materials"],
                indicators: ["Brand identity created", "Initial content produced"]
            },
            {
                level: 5,
                title: "Channel Testing",
                definition: "Distribution and marketing channels tested with early results measured.",
                deliverables: ["Channel test results", "Marketing metrics"],
                indicators: ["Multiple channels tested", "Early metrics tracked"]
            },
            {
                level: 6,
                title: "Sales Capability Built",
                definition: "Sales capability built with processes, tools, and training in place.",
                deliverables: ["Sales playbook", "Training materials"],
                indicators: ["Sales capability established", "CRM implemented"]
            },
            {
                level: 7,
                title: "GTM Execution",
                definition: "Go-to-market execution underway with consistent lead generation and pipeline development.",
                deliverables: ["Sales reports", "Marketing analytics"],
                indicators: ["Pipeline growing", "Conversion rates tracked"]
            },
            {
                level: 8,
                title: "GTM Optimization",
                definition: "Go-to-market optimized with predictable customer acquisition costs and improving efficiency.",
                deliverables: ["CAC/LTV analysis", "Growth metrics"],
                indicators: ["CAC understood and improving", "Growth becoming predictable"]
            },
            {
                level: 9,
                title: "Scalable GTM",
                definition: "Scalable go-to-market engine with repeatable processes across channels and segments.",
                deliverables: ["Expansion playbook", "Channel performance analysis"],
                indicators: ["GTM processes repeatable", "Multiple channels performing"]
            }
        ]
    },
    
    'Business': {
        levels: [
            {
                level: 1,
                title: "Business Concept",
                definition: "Initial business concept with basic value proposition identified.",
                deliverables: ["Business concept document"],
                indicators: ["Value proposition drafted", "Business idea articulated"]
            },
            {
                level: 2,
                title: "Business Model Canvas",
                definition: "Business model canvas completed with key components defined.",
                deliverables: ["Business model canvas", "Revenue model"],
                indicators: ["Revenue streams identified", "Cost structure outlined"]
            },
            {
                level: 3,
                title: "Business Plan",
                definition: "Comprehensive business plan with financial projections and milestones.",
                deliverables: ["Business plan", "Financial projections"],
                indicators: ["3-year projections", "Key milestones defined"]
            },
            {
                level: 4,
                title: "Entity Formation",
                definition: "Legal entity formed with governance structure and initial agreements.",
                deliverables: ["Incorporation documents", "Founder agreements"],
                indicators: ["Company incorporated", "Equity structure set"]
            },
            {
                level: 5,
                title: "Operations Established",
                definition: "Basic operations established with systems and processes in place.",
                deliverables: ["Operations manual", "Process documentation"],
                indicators: ["Core processes defined", "Systems implemented"]
            },
            {
                level: 6,
                title: "Initial Revenue",
                definition: "Revenue generation initiated with first customers or contracts in place.",
                deliverables: ["Revenue reports", "Customer contracts"],
                indicators: ["First revenue generated", "Customer base growing"]
            },
            {
                level: 7,
                title: "Operational Scaling",
                definition: "Operations scaling with defined processes and performance metrics tracked.",
                deliverables: ["Scaling plan", "KPI dashboard"],
                indicators: ["Operations scaling", "Efficiency improving"]
            },
            {
                level: 8,
                title: "Sustainable Operations",
                definition: "Business operations sustainable with clear unit economics and operational efficiency demonstrated.",
                deliverables: ["Unit economics analysis", "Operational efficiency report"],
                indicators: ["Unit economics understood and improving", "Key operational processes efficient"]
            },
            {
                level: 9,
                title: "Financial Sustainability",
                definition: "Financial model validated with path to sustainability clear and key business metrics established.",
                deliverables: ["Financial dashboard", "Key metrics report"],
                indicators: ["Financial model assumptions validated", "Business metrics consistently tracked and improving"]
            }
        ]
    },
    
    'Funding': {
        levels: [
            {
                level: 1,
                title: "Funding Recognition",
                definition: "Company recognizes need for external funding and begins understanding funding landscape and requirements.",
                deliverables: ["Fundraising strategy and timeline"],
                indicators: ["Founders understand funding options", "Initial corporate structure considerations"]
            },
            {
                level: 2,
                title: "Legal Foundation",
                definition: "Legal entity properly established with basic incorporation documents complete. Basic financial tracking in place.",
                deliverables: ["Corporate bylaws", "Incorporation documents"],
                indicators: ["Company incorporated", "Basic financial systems operational"]
            },
            {
                level: 3,
                title: "Financial Modeling",
                definition: "Basic financial model created with 12-month projections. Cap table documented. Initial funding conversations possible.",
                deliverables: ["Initial cap table", "12-month financial model"],
                indicators: ["Financial projections created", "Equity structure documented", "SBIR Phase I, university grants, or friends & family funding may be achievable"]
            },
            {
                level: 4,
                title: "Pitch Ready",
                definition: "Pitch deck complete addressing problem, solution, market, team, traction, financials, and ask. Three-year financial model with revenue projections.",
                deliverables: ["Investor pitch deck", "3-year financial model"],
                indicators: ["Complete pitch materials", "Comprehensive financial model", "Clear fundraising strategy", "SBIR Phase I/II, accelerator, or angel funding may be achievable"]
            },
            {
                level: 5,
                title: "Due Diligence Ready",
                definition: "All standard due diligence documents prepared including material contracts, IP documentation, and key agreements.",
                deliverables: ["Due diligence package", "Document checklist"],
                indicators: ["All legal documents organized", "Technical documentation prepared", "SBIR Phase II, angel investment, or pre-seed VC may be achievable"]
            },
            {
                level: 6,
                title: "Investment Ready",
                definition: "Data room organized and complete. Financial model includes scenario planning. Professional advisors engaged.",
                deliverables: ["Data room", "Valuation analysis"],
                indicators: ["Data room complete", "Professional valuation supportable", "References prepared", "Seed VC or strategic investment may be achievable"]
            },
            {
                level: 7,
                title: "Active Fundraising",
                definition: "Investor pipeline built with tailored materials for different investor types. Multiple investor meetings scheduled.",
                deliverables: ["Investor target list", "Meeting schedule"],
                indicators: ["Active investor outreach", "Multiple meetings occurring", "Negotiation approach defined"]
            },
            {
                level: 8,
                title: "Deal Momentum",
                definition: "Multiple investors progressing through due diligence. Strong investor interest validated through continued engagement.",
                deliverables: ["Term sheet drafts", "Investor updates"],
                indicators: ["Multiple investors in due diligence", "Verbal interest expressed", "Closing timeline identified"]
            },
            {
                level: 9,
                title: "Closing Round",
                definition: "Term sheets received and compared. Final negotiation and legal documentation underway.",
                deliverables: ["Executed term sheets", "Legal documentation"],
                indicators: ["Terms under negotiation", "Legal closing process underway"]
            }
        ]
    },
    
    'Regulatory': {
        levels: [
            {
                level: 1,
                title: "Regulatory Landscape",
                definition: "Initial regulatory landscape assessed with potential pathways identified for target markets.",
                deliverables: ["Regulatory landscape assessment"],
                indicators: ["Regulatory requirements identified", "Potential pathways outlined (e.g., 510(k), PMA, De Novo, IND)"]
            },
            {
                level: 2,
                title: "Regulatory Strategy",
                definition: "Regulatory strategy developed with timeline, resource requirements, and pathway selection rationale.",
                deliverables: ["Regulatory strategy document", "Regulatory timeline"],
                indicators: ["Strategy documented", "Regulatory consultants or expertise engaged"]
            },
            {
                level: 3,
                title: "Pre-Submission Preparation",
                definition: "Pre-submission preparation underway with testing requirements identified and documentation planning initiated.",
                deliverables: ["Pre-submission outline", "Testing requirements matrix"],
                indicators: ["Testing requirements mapped to pathway", "Documentation approach defined"]
            },
            {
                level: 4,
                title: "Regulatory Testing",
                definition: "Regulatory testing underway with protocols established and quality systems implemented to support submissions.",
                deliverables: ["Test protocols", "Quality system documentation"],
                indicators: ["Testing initiated per protocol", "Quality systems operational"]
            },
            {
                level: 5,
                title: "Agency Engagement",
                definition: "Pre-submission meeting completed with regulatory agency and feedback incorporated into development plan.",
                deliverables: ["Pre-submission meeting request", "Meeting minutes"],
                indicators: ["Agency meeting held (e.g., Pre-Sub, Type B)", "Feedback incorporated into plan"]
            },
            {
                level: 6,
                title: "Submission Preparation",
                definition: "Regulatory submission in active preparation with all sections drafted and supporting data compiled.",
                deliverables: ["Submission draft", "Supporting data package"],
                indicators: ["Submission sections drafted", "Data compilation underway"]
            },
            {
                level: 7,
                title: "Submission Filed",
                definition: "Regulatory submission filed with agency and under active review.",
                deliverables: ["Filed submission confirmation", "Submission package"],
                indicators: ["Submission accepted by agency", "Review process initiated"]
            },
            {
                level: 8,
                title: "Agency Review",
                definition: "Under active agency review with responses to questions or deficiencies submitted as needed.",
                deliverables: ["Response documents", "Additional data submissions"],
                indicators: ["Responding to agency requests", "Review progressing toward decision"]
            },
            {
                level: 9,
                title: "Regulatory Authorization",
                definition: "Regulatory clearance, approval, or authorization received with post-market requirements understood.",
                deliverables: ["Approval/clearance letter", "Post-market requirements summary"],
                indicators: ["Regulatory authorization received", "Post-market obligations identified"]
            }
        ]
    }
};

// Default export for convenience
export default readinessData;
