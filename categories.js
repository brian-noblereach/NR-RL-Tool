// categories.js - category rendering & interactions
import { AppState } from "./state.js";
import { maybeHealth, buildHealthContent } from "./transform.js";
import { updateIndustrySelectorUI, toggleLevel, stampAssessedNow } from "./ui.js";
import { updateSummary, generateVentureDescription } from "./summary.js";

export function initializeCategories() {
  const categories = Object.keys(readinessData);
  const categoriesToShow = AppState.isHealthRelated ? categories : categories.filter((c) => c !== "Regulatory");

  renderCategoryList(categoriesToShow);

  categoriesToShow.forEach((cat) => {
    if (AppState.scores[cat] === undefined) AppState.scores[cat] = 0;
  });

  if (!AppState.currentCategory || !categoriesToShow.includes(AppState.currentCategory)) {
    AppState.currentCategory = categoriesToShow[0] || null;
  }

  if (AppState.currentCategory) {
    document.getElementById("category-title").textContent = AppState.currentCategory + " Readiness Levels";
    document.querySelectorAll(".category-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.category === AppState.currentCategory);
    });
  }

  updateIndustrySelectorUI();
  updateCategoryDisplay();
}

export function renderCategoryList(categories) {
  const categoryList = document.getElementById("category-list");

  categoryList.innerHTML = categories
    .map(
      (cat) => `
      <li class="category-item ${AppState.currentCategory === cat ? "active" : ""}" data-category="${cat}">
        <span>${cat}</span>
        <span class="category-score ${AppState.scores[cat] ? "" : "empty"}">${AppState.scores[cat] || "-"}</span>
      </li>`
    )
    .join("");

  categoryList.querySelectorAll(".category-item").forEach((item) => {
    item.addEventListener("click", () => selectCategory(item.dataset.category));
  });
}


// Add this helper anywhere near the other exports
function scrollCategoryTop() {
  // Scroll the title into view and reset the levels container scroll
  const title = document.getElementById("category-title");
  if (title && title.scrollIntoView) {
    title.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const levels = document.getElementById("levels-container");
  if (levels) levels.scrollTop = 0;
}

// Update selectCategory to call the helper after updateCategoryDisplay()
export function selectCategory(category) {
  AppState.currentCategory = category;
  document.getElementById("category-title").textContent = category + " Readiness Levels";

  document.querySelectorAll(".category-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.category === category);
  });

  updateIndustrySelectorUI();
  updateCategoryDisplay();

  // NEW: ensure we start at Level 1 view for the new category
  scrollCategoryTop();
}

export function updateCategoryDisplay() {
  const container = document.getElementById("levels-container");
  const categoryData = readinessData[AppState.currentCategory];

  if (!categoryData) {
    container.innerHTML = "<p>Select a category from the sidebar to begin assessment.</p>";
    return;
  }

  const currentScore = AppState.scores[AppState.currentCategory] || 0;
  const industryVal = document.getElementById("industry-select").value;

  container.innerHTML = categoryData.levels.map((lvl) => createLevelCard(lvl, currentScore, industryVal)).join("");

  setupLevelCardListeners();
}

export function createLevelCard(level, currentScore, industryVal) {
  const isIncluded = level.level < currentScore;
  const isSelected = level.level === currentScore;
  const isExpanded = AppState.currentView === "expanded" || isSelected || isIncluded;

  const useIndustry =
    AppState.isHealthRelated && AppState.currentCategory === "Technology" ? "general" : industryVal;
  const baseIndicators = getIndicators(level, useIndustry);

  const healthTrack =
    AppState.isHealthRelated && AppState.currentCategory === "Technology" ? industryVal : null;

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

export function setupLevelCardListeners() {
  document.querySelectorAll(".level-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      if (!e.target.classList.contains("level-select-btn")) {
        const card = header.closest(".level-card");
        toggleLevel(card);
      }
    });
  });

  document.querySelectorAll(".level-select-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const level = parseInt(btn.dataset.level, 10);
      selectLevel(level);
    });
  });
}

export function selectLevel(level) {
  AppState.scores[AppState.currentCategory] = level;

  // NEW: stamp/refresh the assessment timestamp when any level is chosen
  stampAssessedNow();

  updateCategoryDisplay();
  initializeCategories();
  updateSummary();
  generateVentureDescription();
}
