// summary.js - summary panel + venture description
// Updated December 2024 - Aligned with revised definitions
import { AppState } from "./state.js";
import { readinessData } from "./data/index.js";
import { applyHealthTerms } from "./transform.js";

export function updateSummary() {
  const categories = Object.keys(readinessData);
  const categoriesToShow = AppState.isHealthRelated 
    ? categories 
    : categories.filter((c) => c !== "Regulatory");
  
  renderSummaryScores(categoriesToShow);
  updateSummaryHeader(categoriesToShow);
  generateVentureDescription();
}

export function renderSummaryScores(categories) {
  const summaryScores = document.getElementById("summary-scores");
  if (!summaryScores) return;
  
  summaryScores.innerHTML = categories
    .map(
      (cat) => `
      <div class="summary-score-item">
        <div class="score-label">${cat}</div>
        <div class="score-value">${AppState.scores[cat] || "-"}</div>
      </div>`
    )
    .join("");
}

export function updateSummaryHeader(categories) {
  const assessedCount = categories.filter((cat) => AppState.scores[cat] > 0).length;
  const totalCount = categories.length;
  const headerText = document.querySelector(".summary-header h3");
  
  if (headerText) {
    const panel = document.getElementById("summary-panel");
    if (panel?.classList.contains("minimized")) {
      headerText.textContent = `Summary ${assessedCount}/${totalCount}`;
    } else {
      headerText.textContent = `Assessment Summary (${assessedCount}/${totalCount})`;
    }
  }
}

export function generateVentureDescription() {
  let description = new VentureDescriptionGenerator(
    AppState.scores, 
    AppState.isHealthRelated
  ).generate();
  
  if (AppState.isHealthRelated) {
    description = applyHealthTerms(description);
  }
  
  const el = document.getElementById("venture-desc-text");
  if (el) {
    el.textContent = description;
  }
}

export class VentureDescriptionGenerator {
  constructor(scores, isHealthRelated) {
    this.scores = scores;
    this.isHealthRelated = isHealthRelated;
    this.assessedCategories = this.getAssessedCategories();
  }

  getAssessedCategories() {
    return Object.entries(this.scores).filter(
      ([cat, score]) => score > 0 && (this.isHealthRelated || cat !== "Regulatory")
    );
  }

  generate() {
    if (this.assessedCategories.length === 0) {
      return "Begin assessment to generate venture description";
    }

    let description = "";
    description += this.getVentureStageDescription();
    description += this.getTechnologyProductNarrative();
    description += this.getIPNarrative();
    description += this.getMarketGTMNarrative();
    description += this.getTeamNarrative();
    description += this.getBusinessFundingNarrative();
    
    if (this.isHealthRelated) {
      description += this.getRegulatoryNarrative();
    }
    
    description += this.getStrengthsAndGaps();
    description += this.getUnassessedAreas();
    
    return description;
  }

  getVentureStageDescription() {
    const tech = this.scores["Technology"] || 0;
    const market = this.scores["Market"] || 0;
    const product = this.scores["Product"] || 0;
    
    if (tech <= 3 && market <= 3 && product <= 3) {
      return "This early-stage venture is in the ideation and validation phase, focusing on establishing fundamental concepts and initial proof points. ";
    } else if (tech >= 7 || (market >= 7 && product >= 7)) {
      return "This mature venture has achieved significant technical and market validation, approaching or achieving market readiness. ";
    } else if (tech >= 4 && tech <= 6) {
      if (market <= 3) {
        return "This technology-focused venture has achieved meaningful technical progress while still developing market understanding. ";
      } else {
        return "This venture is in active development phase, transitioning from concept to implementation with growing validation across multiple dimensions. ";
      }
    } else {
      return "This venture shows uneven development across key areas, with some dimensions more mature than others. ";
    }
  }

  getTechnologyProductNarrative() {
    const tech = this.scores["Technology"] || 0;
    const product = this.scores["Product"] || 0;
    
    if (tech === 0 && product === 0) return "";
    
    let narrative = "";
    if (tech >= 5 && product >= 4) {
      const techStatus = tech >= 7 
        ? "demonstrated in operational environments" 
        : tech >= 5 
          ? "validated in relevant laboratory conditions" 
          : "integrated and functioning";
      const productStatus = product >= 6 
        ? "a beta product with user engagement" 
        : product >= 4 
          ? "a functional MVP gathering user feedback" 
          : "early product development";
      narrative = `The company has achieved strong technical validation with their technology ${techStatus}, supported by ${productStatus}. `;
    } else if (tech >= 3 || product >= 3) {
      narrative = `Technical development shows ${tech >= 3 ? "proof of concept achieved" : "early concepts formulated"} while product development ${product >= 3 ? "has validated user needs" : "remains in early planning"}. `;
    } else if (tech > 0 || product > 0) {
      narrative = "Technical and product development are in very early stages with basic principles and concepts being explored. ";
    }
    
    return narrative;
  }

  getIPNarrative() {
    const ip = this.scores["IP"] || 0;
    if (ip === 0) return "";
    
    if (ip >= 7) {
      return "Intellectual property protection is well-established with multiple patents or licenses in place and portfolio development underway. ";
    }
    if (ip >= 6) {
      return "The company has secured initial patent protection with at least one patent issued or licensed, and FTO assessment completed. ";
    }
    if (ip >= 4) {
      return "IP strategy is active with patent prosecution underway and strategic planning for future filings. ";
    }
    if (ip >= 2) {
      return "The company has initiated IP protection with invention disclosures filed and initial patent applications submitted. ";
    }
    return "IP strategy is being developed with initial documentation and landscape assessment underway. ";
  }

  getMarketGTMNarrative() {
    const market = this.scores["Market"] || 0;
    const gtm = this.scores["Go-to-Market"] || 0;
    
    if (market === 0 && gtm === 0) return "";
    
    let narrative = "";
    if (market >= 5 && gtm >= 5) {
      const marketStatus = market >= 7 
        ? "paying customers and demonstrated traction" 
        : "pilot customers and LOIs demonstrating commercial interest";
      const gtmStatus = gtm >= 7 
        ? "is generating consistent leads and pipeline" 
        : "is being tested across multiple channels";
      narrative = `Market validation is strong with ${marketStatus}, while go-to-market execution ${gtmStatus}. `;
    } else if (market >= 3 || gtm >= 3) {
      narrative = `The company has ${market >= 4 ? "completed customer discovery with validated problem-solution fit" : market >= 3 ? "strong competitive understanding" : "initiated market research"}, ${gtm >= 3 ? "and designed initial sales processes" : "but go-to-market strategy remains underdeveloped"}. `;
    } else {
      narrative = "Market understanding and go-to-market capabilities are still emerging, requiring significant development. ";
    }
    
    return narrative;
  }

  getTeamNarrative() {
    const team = this.scores["Team"] || 0;
    if (team === 0) return "";
    
    if (team >= 6) {
      return "The team has experienced leadership in place with strong execution capabilities. ";
    }
    if (team >= 4) {
      return `The team has ${team >= 5 ? "functional owners established" : "engaged advisors and mentors"} and is building organizational capability. `;
    }
    if (team >= 2) {
      return `The founding team is ${team >= 3 ? "making key early hires" : "identifying critical roles"} and developing capabilities. `;
    }
    return "The founding team is in early formation stages with core roles being defined. ";
  }

  getBusinessFundingNarrative() {
    const biz = this.scores["Business"] || 0;
    const funding = this.scores["Funding"] || 0;
    
    if (biz === 0 && funding === 0) return "";
    
    let narrative = "";
    if (biz >= 4 && funding >= 4) {
      const bizStatus = biz >= 6 
        ? "initial revenue generation" 
        : "legal entity formed and operations established";
      
      let fundingStatus;
      if (funding >= 8) {
        fundingStatus = "has strong investor interest with deal momentum";
      } else if (funding >= 7) {
        fundingStatus = "is actively fundraising with investor meetings";
      } else if (funding >= 6) {
        fundingStatus = "has a complete data room and is investment ready";
      } else if (funding >= 5) {
        fundingStatus = "has all due diligence materials prepared";
      } else {
        fundingStatus = "is pitch-ready with complete fundraising materials";
      }
      
      narrative = `The business foundation is solid with ${bizStatus}, and the company ${fundingStatus}. `;
    } else if (biz >= 2 || funding >= 2) {
      narrative = `Business planning ${biz >= 3 ? "includes comprehensive projections and milestones" : "has outlined the business model"}, while ${funding >= 3 ? "financial modeling and cap table are documented" : funding >= 2 ? "the legal entity is properly established" : "funding preparation is beginning"}. `;
    }
    
    return narrative;
  }

  getRegulatoryNarrative() {
    const reg = this.scores["Regulatory"] || 0;
    if (reg === 0) return "";
    
    if (reg >= 7) {
      return "Regulatory submission has been filed and is under agency review. ";
    }
    if (reg >= 5) {
      return "Regulatory progress is advanced with agency engagement completed and submission preparation underway. ";
    }
    if (reg >= 3) {
      return "Regulatory strategy is developed with testing protocols and documentation in preparation. ";
    }
    return "Initial regulatory landscape assessment has identified pathways and requirements. ";
  }

  getStrengthsAndGaps() {
    const strengths = [];
    const gaps = [];
    
    // Identify strengths (score >= 5)
    if ((this.scores["Technology"] || 0) >= 5) strengths.push("technical validation");
    if ((this.scores["Market"] || 0) >= 5) strengths.push("market validation");
    if ((this.scores["Product"] || 0) >= 5) strengths.push("product development");
    if ((this.scores["Team"] || 0) >= 5) strengths.push("team building");
    if ((this.scores["Business"] || 0) >= 5) strengths.push("business operations");
    if ((this.scores["Funding"] || 0) >= 5) strengths.push("fundraising readiness");
    if ((this.scores["IP"] || 0) >= 5) strengths.push("IP protection");

    // Identify gaps (score <= 2 but > 0)
    const tech = this.scores["Technology"] || 0;
    const market = this.scores["Market"] || 0;
    const product = this.scores["Product"] || 0;
    const team = this.scores["Team"] || 0;
    const gtm = this.scores["Go-to-Market"] || 0;
    const biz = this.scores["Business"] || 0;
    const funding = this.scores["Funding"] || 0;

    if (tech <= 2 && tech > 0) gaps.push("technical development");
    if (market <= 2 && market > 0) gaps.push("market understanding");
    if (product <= 2 && product > 0) gaps.push("product definition");
    if (team <= 2 && team > 0) gaps.push("team development");
    if (gtm <= 2 && gtm > 0) gaps.push("go-to-market strategy");
    if (biz <= 2 && biz > 0) gaps.push("business foundation");
    if (funding <= 2 && funding > 0) gaps.push("funding preparation");

    let narrative = "";
    if (strengths.length > 0 || gaps.length > 0) {
      narrative += "\n\n";
      if (strengths.length > 0) {
        narrative += `Key strengths include ${strengths.join(", ")}. `;
      }
      if (gaps.length > 0) {
        narrative += `Priority development areas include ${gaps.join(", ")}. `;
      }
    }
    
    return narrative;
  }

  getUnassessedAreas() {
    const all = this.isHealthRelated 
      ? Object.keys(readinessData) 
      : Object.keys(readinessData).filter((c) => c !== "Regulatory");
    
    const unassessed = all.filter(
      (cat) => !this.scores[cat] || this.scores[cat] === 0
    );
    
    if (unassessed.length > 0) {
      return `\n\nAreas pending assessment: ${unassessed.join(", ")}.`;
    }
    
    return "";
  }
}
