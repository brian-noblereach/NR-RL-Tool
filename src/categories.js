// categories.js - category rendering & interactions
// Updated December 2024
import { AppState, setScore, saveCurrentVenture } from "./state.js";
import { readinessData } from "./data/index.js";
import { maybeHealth, buildHealthContent } from "./transform.js";
import { updateIndustrySelectorUI, toggleLevel, stampAssessedNow, syncSummaryHeaderAndIcons } from "./ui.js";
import { updateSummary, generateVentureDescription } from "./summary.js";
import { updateSubmissionStatusUI } from "./main.js";

// Track if event delegation has been set up
let delegationInitialized = false;

export function initializeCategories() {
  const categories = Object.keys(readinessData);
  const categoriesToShow = AppState.isHealthRelated 
    ? categories 
    : categories.filter((c) => c !== "Regulatory");

  renderCategoryList(categoriesToShow);

  categoriesToShow.forEach((cat) => {
    if (AppState.scores[cat] === undefined) {
      AppState.scores[cat] = 0;
    }
  });

  if (!AppState.currentCategory || !categoriesToShow.includes(AppState.currentCategory)) {
    AppState.currentCategory = categoriesToShow[0] || null;
  }

  if (AppState.currentCategory) {
    document.getElementById("category-title").textContent = 
      AppState.currentCategory + " Readiness Levels";
    document.querySelectorAll(".category-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.category === AppState.currentCategory);
    });
  }

  updateIndustrySelectorUI();
  updateCategoryDisplay();
  updateCumulativeNoticeVisibility();
}

export function renderCategoryList(categories) {
  const categoryList = document.getElementById("category-list");
  if (!categoryList) return;

  categoryList.innerHTML = categories
    .map(
      (cat) => `
      <li class="category-item ${AppState.currentCategory === cat ? "active" : ""}" data-category="${cat}">
        <span class="cat-name">${cat}</span>
        <span class="category-score ${AppState.scores[cat] ? "" : "empty"}">${AppState.scores[cat] || "-"}</span>
      </li>`
    )
    .join("");

  // Set up delegation for category clicks (only once)
  if (!delegationInitialized) {
    categoryList.addEventListener("click", (e) => {
      const item = e.target.closest(".category-item");
      if (item) {
        selectCategory(item.dataset.category);
      }
    });
    delegationInitialized = true;
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function selectCategory(category) {
  AppState.currentCategory = category;
  document.getElementById("category-title").textContent = category + " Readiness Levels";

  document.querySelectorAll(".category-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.category === category);
  });

  updateIndustrySelectorUI();
  updateCategoryDisplay();
  updateCumulativeNoticeVisibility();
  scrollToTop();
}

// Show/hide the cumulative notice based on whether a category is selected
function updateCumulativeNoticeVisibility() {
  const notice = document.getElementById("cumulative-notice");
  if (notice) {
    notice.style.display = AppState.currentCategory ? "flex" : "none";
  }
}

export function updateCategoryDisplay() {
  const container = document.getElementById("levels-container");
  const categoryData = readinessData[AppState.currentCategory];

  if (!categoryData) {
    container.innerHTML = "<p>Select a category from the sidebar to begin assessment.</p>";
    return;
  }

  const currentScore = AppState.scores[AppState.currentCategory] || 0;
  const industryVal = document.getElementById("industry-select")?.value || "general";

  container.innerHTML = categoryData.levels
    .map((lvl) => createLevelCard(lvl, currentScore, industryVal))
    .join("");

  setupLevelCardDelegation();
}

export function createLevelCard(level, currentScore, industryVal) {
  const isIncluded = level.level < currentScore;
  const isSelected = level.level === currentScore;
  const isExpanded = AppState.currentView === "expanded" || isSelected || isIncluded;

  const useIndustry =
    AppState.isHealthRelated && AppState.currentCategory === "Technology" 
      ? "general" 
      : industryVal;
  const baseIndicators = getIndicators(level, useIndustry);

  const healthTrack =
    AppState.isHealthRelated && AppState.currentCategory === "Technology" 
      ? industryVal 
      : null;

  const content = AppState.isHealthRelated
    ? buildHealthContent(AppState.currentCategory, level, baseIndicators, healthTrack)
    : {
        definition: level.definition,
        deliverables: Array.isArray(level.deliverables) ? level.deliverables : [],
        indicators: baseIndicators,
      };

  const deliverables = Array.isArray(content.deliverables) ? content.deliverables : [];
  const indicators = Array.isArray(content.indicators) ? content.indicators : [];

  return `
    <div class="level-card ${isIncluded ? "included" : ""} ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}" data-level="${level.level}">
      <div class="level-header">
        <div class="level-number">${isIncluded ? "✓" : level.level}</div>
        <div class="level-title">Level ${level.level}: ${level.title}</div>
        <button class="level-select-btn ${isSelected ? "selected" : ""}" data-level="${level.level}">
          ${isSelected ? "Selected" : "Select Level " + level.level}
        </button>
        <span class="expand-icon">▼</span>
      </div>
      <div class="level-content">
        ${
          isIncluded
            ? `<div class="cumulative-indicator">✓ This level has been completed as part of reaching Level ${currentScore}</div>`
            : ""
        }
        <div class="level-section">
          <h4>Definition</h4>
          <p>${maybeHealth(content.definition)}</p>
        </div>
        <div class="level-section">
          <h4>Expected Deliverables</h4>
          <ul>${deliverables.map((d) => `<li>${maybeHealth(d)}</li>`).join("")}</ul>
        </div>
        <div class="level-section">
          <h4>Indicators of This Level</h4>
          <ul>${indicators.map((i) => `<li>${maybeHealth(i)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>`;
}

export function getIndicators(level, industry) {
  let indicators = level.indicators;
  if (AppState.currentCategory === "Technology" && typeof indicators === "object") {
    indicators = indicators[industry] || indicators.general || [];
  }
  if (!Array.isArray(indicators)) indicators = [indicators];
  return indicators;
}

// Use delegation for level cards to avoid recreating listeners
let levelsDelegationInitialized = false;

function setupLevelCardDelegation() {
  const container = document.getElementById("levels-container");
  if (!container || levelsDelegationInitialized) return;

  container.addEventListener("click", (e) => {
    // Handle level header clicks (expand/collapse)
    const header = e.target.closest(".level-header");
    if (header && !e.target.classList.contains("level-select-btn")) {
      const card = header.closest(".level-card");
      toggleLevel(card);
      return;
    }

    // Handle level select button clicks
    const selectBtn = e.target.closest(".level-select-btn");
    if (selectBtn) {
      e.stopPropagation();
      const level = parseInt(selectBtn.dataset.level, 10);
      selectLevel(level);
    }
  });

  levelsDelegationInitialized = true;
}

export function selectLevel(level) {
  // Use the new state management that auto-saves
  setScore(AppState.currentCategory, level);

  // Stamp/refresh the assessment timestamp when any level is chosen
  stampAssessedNow();

  updateCategoryDisplay();
  initializeCategories();
  updateSummary();
  generateVentureDescription();
  syncSummaryHeaderAndIcons();
  updateSubmissionStatusUI();  // Update submission status when scores change
}
