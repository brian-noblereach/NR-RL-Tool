// summary.js - summary panel + venture description
import { AppState } from "./state.js";
import { applyHealthTerms } from "./transform.js";
import { /* ... */ } from "./transform.js";
import { updateIndustrySelectorUI, /* ... */ } from "./ui.js";


export function updateSummary() {
  const categories = Object.keys(readinessData);
  const categoriesToShow = AppState.isHealthRelated ? categories : categories.filter((c) => c !== "Regulatory");
  renderSummaryScores(categoriesToShow);
  updateSummaryHeader(categoriesToShow);
  const panel = document.getElementById("summary-panel");
const h = panel?.querySelector(".summary-header h3");
if (h) {
  const done = Object.values(AppState.scores || {}).filter(Boolean).length;
  const total = document.getElementById("health-related")?.checked ? 9 : 8;
  if (panel.classList.contains("minimized")) {
    h.textContent = `Summary ${done}/${total}`;
  } else {
    h.textContent = `Assessment Summary (${done}/${total})`;
  }
}
}

export function renderSummaryScores(categories) {
  const summaryScores = document.getElementById("summary-scores");
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
  if (headerText) headerText.textContent = `Assessment Summary (${assessedCount}/${totalCount})`;
}

export function generateVentureDescription() {
  let description = new VentureDescriptionGenerator(AppState.scores, AppState.isHealthRelated).generate();
  if (AppState.isHealthRelated) description = applyHealthTerms(description);
  document.getElementById("venture-desc-text").textContent = description;
}

export class VentureDescriptionGenerator {
  constructor(scores, isHealthRelated) {
    this.scores = scores;
    this.isHealthRelated = isHealthRelated;
    this.assessedCategories = this.getAssessedCategories();
  }

  getAssessedCategories() {
    return Object.entries(this.scores).filter(([cat, score]) => score > 0 && (this.isHealthRelated || cat !== "Regulatory"));
  }

  generate() {
    if (this.assessedCategories.length === 0) return "Begin assessment to generate venture description";

    let description = "";
    description += this.getVentureStageDescription();
    description += this.getTechnologyProductNarrative();
    description += this.getIPNarrative();
    description += this.getMarketGTMNarrative();
    description += this.getTeamNarrative();
    description += this.getBusinessFundingNarrative();
    if (this.isHealthRelated) description += this.getRegulatoryNarrative();
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
      const techStatus = tech >= 7 ? "demonstrated in operational environments" : tech >= 5 ? "validated in relevant laboratory conditions" : "integrated and functioning";
      const productStatus = product >= 6 ? "a beta product with user engagement" : product >= 4 ? "a functional MVP gathering user feedback" : "early product development";
      narrative = "The company has achieved strong technical validation with their technology " + techStatus + ", supported by " + productStatus + ". ";
    } else if (tech >= 3 || product >= 3) {
      narrative = "Technical development shows " + (tech >= 3 ? "proof of concept achieved" : "early concepts formulated") + " while product development " + (product >= 3 ? "has defined specifications and design" : "remains in early planning") + ". ";
    } else if (tech > 0 || product > 0) {
      narrative = "Technical and product development are in very early stages with basic principles and concepts being explored. ";
    }
    return narrative;
  }

  getIPNarrative() {
    const ip = this.scores["IP"] || 0;
    if (ip === 0) return "";
    if (ip >= 6) return "Intellectual property protection is well-established with active patent prosecution and FTO assessment completed. ";
    if (ip >= 3) return "The company has made progress on IP protection with invention disclosures filed and initial patent applications submitted. ";
    return "IP strategy is being developed with initial documentation and landscape assessment underway. ";
  }

  getMarketGTMNarrative() {
    const market = this.scores["Market"] || 0;
    const gtm = this.scores["Go-to-Market"] || 0;
    if (market === 0 && gtm === 0) return "";
    let narrative = "";
    if (market >= 5 && gtm >= 5) {
      const marketStatus = market >= 7 ? "paying customers and proven traction" : "pilot customers and LOIs demonstrating commercial interest";
      const gtmStatus = gtm >= 7 ? "is generating consistent leads and sales" : "is being tested across multiple channels";
      narrative = "Market validation is strong with " + marketStatus + ", while go-to-market execution " + gtmStatus + ". ";
    } else if (market >= 3 || gtm >= 3) {
      narrative = "The company has " + (market >= 3 ? "completed detailed market analysis with validated customer pain points" : "initiated market research") + ", " + (gtm >= 3 ? "and designed initial sales processes" : "but go-to-market strategy remains underdeveloped") + ". ";
    } else {
      narrative = "Market understanding and go-to-market capabilities are still emerging, requiring significant development. ";
    }
    return narrative;
  }

  getTeamNarrative() {
    const team = this.scores["Team"] || 0;
    if (team === 0) return "";
    if (team >= 6) return "The team is well-developed with experienced leadership and strong execution capabilities. ";
    if (team >= 3) return "The founding team is " + (team >= 4 ? "building functional departments" : "making key early hires") + " and " + (team >= 5 ? "has engaged advisory support" : "recognizes capability gaps") + ". ";
    return "The founding team is in early formation stages with core roles being defined. ";
  }

  getBusinessFundingNarrative() {
    const biz = this.scores["Business"] || 0;
    const funding = this.scores["Funding"] || 0;
    if (biz === 0 && funding === 0) return "";
    let narrative = "";
    if (biz >= 4 && funding >= 4) {
      const bizStatus = biz >= 6 ? "revenue generation underway" : "legal entity formed and operations established";
      const fundingStatus = funding >= 8 ? "has strong investor interest with deal momentum" : funding >= 7 ? "is actively fundraising with investor meetings" : funding >= 6 ? "has a complete data room and professional valuation" : funding >= 5 ? "has all due diligence materials prepared" : "is pitch-ready with complete fundraising materials and strategy";
      narrative = "The business foundation is solid with " + bizStatus + ", and the company " + fundingStatus + ". ";
    } else if (biz >= 2 || funding >= 2) {
      narrative = "Business planning " + (biz >= 3 ? "includes comprehensive projections and milestones" : "has outlined the business model") + ", while " + (funding >= 3 ? "financial modeling and cap table are documented" : (funding >= 2 ? "the legal entity is properly established" : "funding preparation is beginning")) + ". ";
    }
    return narrative;
  }

  getRegulatoryNarrative() {
    const reg = this.scores["Regulatory"] || 0;
    if (reg === 0) return "";
    if (reg >= 6) return "Regulatory progress is advanced with submissions to agencies underway or completed. ";
    if (reg >= 3) return "Regulatory strategy is developed with testing protocols and documentation in preparation. ";
    return "Initial regulatory landscape assessment has identified pathways and requirements. ";
  }

  getStrengthsAndGaps() {
    const strengths = [];
    const gaps = [];
    if ((this.scores["Technology"] || 0) >= 5) strengths.push("technical validation");
    if ((this.scores["Market"] || 0) >= 5) strengths.push("market validation");
    if ((this.scores["Product"] || 0) >= 5) strengths.push("product development");
    if ((this.scores["Team"] || 0) >= 5) strengths.push("team building");
    if ((this.scores["Business"] || 0) >= 5) strengths.push("business operations");
    if ((this.scores["Funding"] || 0) >= 5) strengths.push("fundraising");
    if ((this.scores["IP"] || 0) >= 5) strengths.push("IP protection");

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
      if (strengths.length > 0) narrative += `Key strengths include ${strengths.join(", ")}. `;
      if (gaps.length > 0) narrative += `Priority development areas include ${gaps.join(", ")}. `;
    }
    return narrative;
  }

  getUnassessedAreas() {
    const all = this.isHealthRelated ? Object.keys(readinessData) : Object.keys(readinessData).filter((c) => c !== "Regulatory");
    const unassessed = all.filter((cat) => !this.scores[cat] || this.scores[cat] === 0);
    if (unassessed.length > 0) return `\n\nAreas pending assessment: ${unassessed.join(", ")}.`;
    return "";
  }
}
