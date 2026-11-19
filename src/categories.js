// categories.js - category rendering & interactions
// Updated November 2026: level text is generated plain text (escaped here),
// Life Science ventures read the Life Science variant, and TRL is 1-9.
// Dual-use ventures score Market, Product and GTM per application (applications.js).
import { AppState, setScore, setApplicationScore, saveCurrentVenture } from "./state.js";
import { readinessData } from "./data/index.js";
import { getEffectiveContent } from "./transform.js";
import { updateIndustrySelectorUI, toggleLevel, stampAssessedNow } from "./ui.js";
import { updateSubmissionStatusUI } from "./main.js";
import { getCategoryLabel, getCategoryHeading, activeCategoryKeys } from "./category-labels.js";
import { parseScore, formatScore } from "./score-utils.js";
import { effectiveTrackKey, resolveLevel } from "./track-content.js";
import {
  PRIMARY_APPLICATION, isDualUseCategory, applicationScore, isFollowingPrimary,
  followsPrimary, scoreRowsFor,
} from "./applications.js";

// Track if event delegation has been set up
let delegationInitialized = false;

// Level text comes from the workbook as plain text ("R&D", "Plan & timeline").
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Is the current category scored per application (dual-use venture)?
function scoresPerApplication(category = AppState.currentCategory) {
  return !!AppState.isDualUse && isDualUseCategory(category);
}

// The application the level cards are scoring. Always the primary one unless
// the category is scored per application.
function activeApplication() {
  return scoresPerApplication() ? (AppState.currentApplication || PRIMARY_APPLICATION) : PRIMARY_APPLICATION;
}

function currentCategoryScore() {
  return applicationScore(AppState, activeApplication(), AppState.currentCategory);
}

// Sidebar score pill(s): one per category, or "C5" / "G2" for a category
// scored per application. Never combined.
function categoryScoreHtml(cat) {
  const pills = scoreRowsFor(AppState, cat).map(({ application, score }) => {
    const text = score != null ? formatScore(score) : "-";
    const prefix = application ? application.charAt(0) : "";
    const title = application ? ` title="${application}: ${score != null ? `Level ${text}` : "not scored"}"` : "";
    return `<span class="category-score ${score != null ? "" : "empty"}"${title}>${prefix}${text}</span>`;
  });
  return pills.length > 1 ? `<span class="category-scores">${pills.join("")}</span>` : pills[0];
}

export function initializeCategories() {
  const categoriesToShow = activeCategoryKeys(Object.keys(readinessData), AppState.isHealthRelated);

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
        ${categoryScoreHtml(cat)}
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
  AppState.currentApplication = PRIMARY_APPLICATION;
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

  renderApplicationSelector();

  if (!categoryData) {
    container.innerHTML = "<p>Select a category from the sidebar to begin assessment.</p>";
    notifyCategoryDisplayUpdated();
    return;
  }

  const currentScore = currentCategoryScore();
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

// Dual-use: the Commercial | Government toggle above the level cards, with
// each application's current score and a line saying what is being scored.
export function renderApplicationSelector() {
  const host = document.getElementById("application-selector");
  if (!host) return;
  const cat = AppState.currentCategory;
  if (!scoresPerApplication(cat)) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }

  const active = activeApplication();
  const label = getCategoryLabel(cat);
  const buttons = scoreRowsFor(AppState, cat).map(({ application, score }) => `
      <button type="button" class="application-btn ${application === active ? "active" : ""}"
              data-application="${application}" aria-pressed="${application === active}">
        <span class="application-name">${application}</span>
        <span class="application-score">${score != null ? `Level ${formatScore(score)}` : "Not scored"}${
          score != null && isFollowingPrimary(AppState, application, cat) ? " (same)" : ""}</span>
      </button>`).join("");

  let status;
  if (active === PRIMARY_APPLICATION) {
    status = `Scoring ${esc(label)} for commercial customers. Switch to Government to score it for government buyers.`;
  } else if (isFollowingPrimary(AppState, active, cat)) {
    const primary = AppState.scores[cat];
    status = `Government follows the Commercial score${primary != null ? ` (Level ${formatScore(primary)})` : ""}. ` +
      `Select a level if the government ${esc(label.toLowerCase())} is different.`;
  } else {
    status = `Scoring ${esc(label)} for government buyers, against the same definitions.` +
      (followsPrimary(active, cat)
        ? ` <button type="button" class="link-btn" data-use-primary="${active}">Use the Commercial score</button>`
        : "");
  }

  host.hidden = false;
  host.innerHTML = `
    <div class="application-selector-row">
      <span class="application-selector-label" id="application-selector-label">Scoring</span>
      <div class="application-toggle" role="group" aria-labelledby="application-selector-label">${buttons}</div>
    </div>
    <p class="help-text application-status">${status}</p>`;

  if (!host.dataset.wired) {
    host.dataset.wired = "1";
    host.addEventListener("click", (e) => {
      const appBtn = e.target.closest("[data-application]");
      if (appBtn) {
        AppState.currentApplication = appBtn.dataset.application;
        updateCategoryDisplay();
        return;
      }
      const usePrimary = e.target.closest("[data-use-primary]");
      if (usePrimary) {
        setApplicationScore(usePrimary.dataset.usePrimary, AppState.currentCategory, null);
        initializeCategories();
        updateSubmissionStatusUI();
      }
    });
  }
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

  // Track overrides may replace the title and definition, and may add
  // workstreams and lettered activities. TRL has no level 0 (the DoD and BARDA
  // scales begin at 1), so no TRL card is ever numbered 0.
  const resolved = isTech ? resolveLevel("Technology", level, trackKey) : level;
  const content = getEffectiveContent(resolved);

  const deliverables = Array.isArray(content.deliverables) ? content.deliverables : [];
  const indicators = Array.isArray(content.indicators) ? content.indicators : [];

  const activities = getSubLevelActivities(resolved);
  const workstreams = Array.isArray(resolved.workstreams) ? resolved.workstreams : [];

  // The general TRL track's whole definition is its title line, so its cards
  // have nothing to expand. Render them as a single row: an empty body and an
  // expand arrow read as content that failed to load.
  const hasBody = isIncluded || inProgress || !!String(content.definition || "").trim() ||
    activities.length > 0 || workstreams.length > 0 || deliverables.length > 0 || indicators.length > 0;

  return `
    <div class="level-card ${isIncluded ? "included" : ""} ${isSelected ? "selected" : ""} ${inProgress ? "in-progress" : ""} ${isExpanded ? "expanded" : ""} ${hasBody ? "" : "no-body"}" data-level="${level.level}">
      <div class="level-header">
        <div class="level-number ${inProgress ? "has-sublevel" : ""}">${isIncluded ? "✓" : inProgress ? formatScore(currentScore) : level.level}</div>
        <div class="level-title">Level ${level.level}: ${esc(content.title)}</div>
        <button class="level-select-btn ${isSelected && !inProgress ? "selected" : ""}" data-level="${level.level}" data-score="${level.level}">
          ${isSelected && !inProgress ? "Selected" : inProgress ? `Mark Level ${level.level} complete` : "Select Level " + level.level}
        </button>
        ${hasBody ? `<span class="expand-icon">▼</span>` : ""}
      </div>
      ${hasBody ? `<div class="level-content">
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
        ${renderDefinitionSection(content.definition)}
        ${renderActivitiesSection(level.level, activities, currentRank, currentSubLevel)}
        ${renderWorkstreamsSection(workstreams)}
        ${renderListSection("Expected Deliverables", deliverables)}
        ${renderListSection("Indicators of This Level", indicators)}
      </div>` : ""}
    </div>`;
}

// Sections render only when they have content: TRL is definitions only, the
// general TRL track's whole definition is its title line, and level 0 of the
// other categories has no deliverables or indicators.
function renderDefinitionSection(definition) {
  const paragraphs = String(definition || "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return "";
  return `
        <div class="level-section">
          <h4>Definition</h4>
          ${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
        </div>`;
}

function renderListSection(heading, items) {
  if (!items.length) return "";
  return `
        <div class="level-section">
          <h4>${heading}</h4>
          <ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
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

function renderActivitiesSection(levelNum, activities, currentRank, currentSubLevel) {
  if (!activities.length) return "";

  const items = activities
    .map((a) => {
      const state = subLevelState(levelNum, a.id, currentRank, currentSubLevel);
      const isCurrent = state === "is-current";
      return `
          <li class="sublevel-item ${state}">
            <span class="sublevel-id">${a.id}</span>
            <span class="sublevel-label">${esc(a.label)}</span>
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

function renderWorkstreamsSection(workstreams) {
  if (!workstreams.length) return "";

  const items = workstreams
    .map(
      (w) => `
          <div class="workstream-item">
            <dt class="workstream-label">${esc((w && w.label) || "")}</dt>
            <dd class="workstream-note">${esc((w && w.note) || "")}</dd>
          </div>`
    )
    .join("");

  return `
        <div class="level-section level-section-workstreams">
          <h4>Development Workstreams</h4>
          <dl class="workstream-list">${items}</dl>
        </div>`;
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
      if (card.classList.contains("disabled") || card.classList.contains("no-body")) return;
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
  // chip. setScore normalizes and validates it. A dual-use venture's other
  // application has its own score.
  const application = activeApplication();
  if (application === PRIMARY_APPLICATION) {
    setScore(AppState.currentCategory, score);
  } else {
    setApplicationScore(application, AppState.currentCategory, score);
  }

  // Stamp/refresh the assessment timestamp when any level is chosen
  stampAssessedNow();

  updateCategoryDisplay();
  initializeCategories();
  updateSubmissionStatusUI();  // Update submission status when scores change
}
