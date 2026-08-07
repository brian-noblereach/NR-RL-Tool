// categories.js - category rendering & interactions
// Updated December 2024
import { AppState, setScore, saveCurrentVenture } from "./state.js";
import { readinessData } from "./data/index.js";
import { maybeHealth, getEffectiveContent } from "./transform.js";
import { updateIndustrySelectorUI, toggleLevel, stampAssessedNow, syncSummaryHeaderAndIcons } from "./ui.js";
import { updateSummary, generateVentureDescription } from "./summary.js";
import { updateSubmissionStatusUI } from "./main.js";
import { getCategoryLabel, getCategoryHeading } from "./category-labels.js";
import { parseScore, formatScore } from "./score-utils.js";
import { effectiveTrackKey, resolveLevel } from "./track-content.js";

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
      AppState.scores[cat] = null;
    }
  });

  if (!AppState.currentCategory || !categoriesToShow.includes(AppState.currentCategory)) {
    AppState.currentCategory = categoriesToShow[0] || null;
  }

  if (AppState.currentCategory) {
    document.getElementById("category-title").textContent =
      getCategoryHeading(AppState.currentCategory);
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
        <span class="cat-name">${getCategoryLabel(cat)}</span>
        <span class="category-score ${AppState.scores[cat] != null ? "" : "empty"}">${AppState.scores[cat] != null ? AppState.scores[cat] : "-"}</span>
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
  document.getElementById("category-title").textContent = getCategoryHeading(category);

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
    notifyCategoryDisplayUpdated();
    return;
  }

  const currentScore = AppState.scores[AppState.currentCategory];
  // AppState.technologyTrack is the source of truth; updateIndustrySelectorUI
  // mirrors it onto the select. Fall back to the DOM in case a caller renders
  // before the selector has been synced.
  const industryVal =
    AppState.technologyTrack || document.getElementById("industry-select")?.value || "general";

  container.innerHTML = categoryData.levels
    .map((lvl) => createLevelCard(lvl, currentScore, industryVal))
    .join("");

  setupLevelCardDelegation();
  notifyCategoryDisplayUpdated();
}

// Signal that the level cards for the current category were (re)rendered.
// The external flow listens for this to refresh its per-category notes box;
// internal mode registers no listener, so this is a no-op there.
function notifyCategoryDisplayUpdated() {
  window.dispatchEvent(new CustomEvent("categoryDisplayUpdated", { detail: AppState.currentCategory }));
}

export function createLevelCard(level, currentScore, industryVal) {
  // A TRL score may be a sub-level string like "3B", meaning that level is in
  // progress. Compare on the rank, never on the raw score.
  const parsed = parseScore(currentScore);
  const currentRank = parsed ? parsed.level : null;
  const currentSubLevel = parsed ? parsed.subLevel : null;

  const isIncluded = currentRank != null && level.level < currentRank;
  const isSelected = currentRank != null && level.level === currentRank;
  const inProgress = isSelected && !!currentSubLevel;
  const isExpanded = AppState.currentView === "expanded" || isSelected || isIncluded;

  const isTech = AppState.currentCategory === "Technology";
  const trackKey = isTech ? effectiveTrackKey(industryVal, AppState.isHealthRelated) : null;

  // Track overrides may replace the title, definition, deliverables, and
  // indicators, and may add workstreams and lettered activities.
  const resolved = isTech ? resolveLevel("Technology", level, trackKey) : level;

  const baseIndicators = getIndicators(resolved, trackKey);
  const content = getEffectiveContent(AppState.currentCategory, resolved, baseIndicators, trackKey);

  const deliverables = Array.isArray(content.deliverables) ? content.deliverables : [];
  const indicators = Array.isArray(content.indicators) ? content.indicators : [];

  // Override content is authored canon and bypasses the health term map, so it
  // must not be run through maybeHealth() on the way out either.
  const text = resolved.isTrackOverride ? (s) => s : maybeHealth;

  const activities = getSubLevelActivities(resolved);
  const workstreams = Array.isArray(resolved.workstreams) ? resolved.workstreams : [];

  return `
    <div class="level-card ${isIncluded ? "included" : ""} ${isSelected ? "selected" : ""} ${inProgress ? "in-progress" : ""} ${isExpanded ? "expanded" : ""}" data-level="${level.level}">
      <div class="level-header">
        <div class="level-number ${inProgress ? "has-sublevel" : ""}">${isIncluded ? "✓" : inProgress ? formatScore(currentScore) : level.level}</div>
        <div class="level-title">Level ${level.level}: ${text(resolved.title)}</div>
        <button class="level-select-btn ${isSelected && !inProgress ? "selected" : ""}" data-level="${level.level}" data-score="${level.level}">
          ${isSelected && !inProgress ? "Selected" : inProgress ? `Mark Level ${level.level} complete` : "Select Level " + level.level}
        </button>
        <span class="expand-icon">▼</span>
      </div>
      <div class="level-content">
        ${
          isIncluded
            ? `<div class="cumulative-indicator">✓ This level has been completed as part of reaching Level ${formatScore(currentScore)}</div>`
            : ""
        }
        ${
          inProgress
            ? `<div class="sublevel-indicator">Level ${level.level} is in progress — currently at ${formatScore(currentScore)}. Use “Mark Level ${level.level} complete” once every activity below is done.</div>`
            : ""
        }
        <div class="level-section">
          <h4>Definition</h4>
          <p>${text(content.definition)}</p>
        </div>
        ${renderActivitiesSection(level.level, activities, currentRank, currentSubLevel, text)}
        ${renderWorkstreamsSection(workstreams, text)}
        <div class="level-section">
          <h4>Expected Deliverables</h4>
          <ul>${deliverables.map((d) => `<li>${text(d)}</li>`).join("")}</ul>
        </div>
        <div class="level-section">
          <h4>Indicators of This Level</h4>
          <ul>${indicators.map((i) => `<li>${text(i)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>`;
}

/**
 * Lettered activities for the current level, from the track override. Only the
 * therapeutics track defines them (BARDA gives lettered activities to drugs and
 * biologics and deliberately not to diagnostics or devices), so every other
 * track returns [] and the section does not render at all.
 */
function getSubLevelActivities(resolvedLevel) {
  const activities = Array.isArray(resolvedLevel.activities) ? resolvedLevel.activities : [];
  return activities
    .map((a) => ({ id: String((a && a.id) || "").toUpperCase(), label: String((a && a.label) || "") }))
    // The id is the literal score token, e.g. "3B".
    .filter((a) => /^[0-9][A-Z]$/.test(a.id));
}

/** "" (complete), "is-current", or "" for an activity given the current score. */
function subLevelState(cardLevel, activityId, currentRank, currentSubLevel) {
  if (currentRank == null) return "";
  if (cardLevel < currentRank) return "is-complete";  // whole level already achieved
  if (cardLevel > currentRank) return "";
  if (!currentSubLevel) return "is-complete";         // integer score = level complete
  const letter = activityId.slice(1);
  if (letter < currentSubLevel) return "is-complete";
  if (letter === currentSubLevel) return "is-current";
  return "";
}

function renderActivitiesSection(levelNum, activities, currentRank, currentSubLevel, text) {
  if (!activities.length) return "";

  const items = activities
    .map((a) => {
      const state = subLevelState(levelNum, a.id, currentRank, currentSubLevel);
      const isCurrent = state === "is-current";
      return `
          <li class="sublevel-item ${state}">
            <span class="sublevel-id">${a.id}</span>
            <span class="sublevel-label">${text(a.label)}</span>
            <button type="button" class="sublevel-chip ${isCurrent ? "selected" : ""}"
                    data-score="${a.id}" data-level="${levelNum}" aria-pressed="${isCurrent}">
              ${isCurrent ? "Selected" : "Select " + a.id}
            </button>
          </li>`;
    })
    .join("");

  return `
        <div class="level-section level-section-activities" data-activities-level="${levelNum}">
          <h4>Key Activities</h4>
          <p class="activities-hint">Select the activity that best reflects current progress, or mark the whole level complete above.</p>
          <ul class="sublevel-list">${items}</ul>
        </div>`;
}

function renderWorkstreamsSection(workstreams, text) {
  if (!workstreams.length) return "";

  const items = workstreams
    .map(
      (w) => `
          <div class="workstream-item">
            <dt class="workstream-label">${text(String((w && w.label) || ""))}</dt>
            <dd class="workstream-note">${text(String((w && w.note) || ""))}</dd>
          </div>`
    )
    .join("");

  return `
        <div class="level-section level-section-workstreams">
          <h4>Development Workstreams</h4>
          <dl class="workstream-list">${items}</dl>
        </div>`;
}

export function getIndicators(level, track) {
  let indicators = level.indicators;
  // Technology stores indicators as an object keyed by track. A track override
  // may supply a flat array instead — and typeof [] === "object", so the array
  // case must be excluded explicitly or the lookup silently yields [].
  if (indicators && !Array.isArray(indicators) && typeof indicators === "object") {
    indicators = indicators[track] || indicators.general || [];
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
    // Sub-level activity chips. These live in .level-content, a sibling of
    // .level-header, so they can never reach the expand/collapse branch — but
    // claim them first anyway so future markup changes cannot reroute them.
    const subBtn = e.target.closest(".sublevel-chip");
    if (subBtn) {
      e.stopPropagation();
      selectLevel(subBtn.dataset.score);  // e.g. "3B"
      return;
    }

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
      // data-score, not parseInt(data-level): setScore normalizes it.
      selectLevel(selectBtn.dataset.score);
    }
  });

  levelsDelegationInitialized = true;
}

export function selectLevel(score) {
  // `score` is an integer level, or a sub-level token like "3B" from an activity
  // chip. setScore normalizes and validates it.
  setScore(AppState.currentCategory, score);

  // Stamp/refresh the assessment timestamp when any level is chosen
  stampAssessedNow();

  updateCategoryDisplay();
  initializeCategories();
  updateSummary();
  generateVentureDescription();
  syncSummaryHeaderAndIcons();
  updateSubmissionStatusUI();  // Update submission status when scores change
}
