// ui.js - UI controls
import { AppState, saveCurrentVenture } from "./state.js";
import {
  normalizeTrackKey,
  isHealthOnlyTrack,
  effectiveTrackKey,
  getTrackAttribution,
  getTrackHint,
} from "./track-content.js";

/* -----------------------------
   Assessed timestamp (MM-DD-YYYY HH:MM)
------------------------------ */
export function renderAssessedAt() {
  const el = document.getElementById("assessed-at");
  if (!el) return;
  
  const d = AppState.assessedAt;
  if (!d) {
    el.textContent = "—";
    return;
  }
  
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  el.textContent = `${mm}-${dd}-${yy} ${hh}:${min}`;
}

export function stampAssessedNow() {
  AppState.assessedAt = new Date();
  renderAssessedAt();
  saveCurrentVenture();
}

/* -----------------------------
   Health-mode industry selector
------------------------------ */
export function updateIndustrySelectorUI() {
  const health = document.getElementById("health-related")?.checked;
  const isTechCategory = AppState.currentCategory === "Technology";
  const wrap = document.getElementById("industry-selector");
  const group = document.getElementById("health-track-optgroup");
  const select = document.getElementById("industry-select");

  // Only show selector if we're on the TRL category
  if (wrap) {
    wrap.classList.toggle("hidden", !isTechCategory);
  }

  // Life-sciences tracks only available when health mode is on
  if (group) {
    group.disabled = !health;
  }

  // AppState.technologyTrack is the source of truth (it persists with the
  // venture); mirror it back onto the select, which resets on every page load.
  if (select && AppState.technologyTrack && select.value !== AppState.technologyTrack) {
    select.value = AppState.technologyTrack;
    // An unrecognized stored value leaves the select on its first option;
    // resync so state and DOM cannot drift.
    if (select.value !== AppState.technologyTrack) {
      AppState.technologyTrack = select.value || "general";
    }
  }

  // Disabling an optgroup does not deselect an option inside it, and nothing
  // else resets the selector, so a life-sciences track left selected when
  // health mode is switched off would keep rendering life-sciences content.
  // Snap it back to General. (effectiveTrackKey() guards the render path too.)
  if (select && !health && isHealthOnlyTrack(normalizeTrackKey(select.value))) {
    select.value = "general";
    AppState.technologyTrack = "general";
  }

  // What the tracks do. The general track is one line per level, which looks
  // unfinished unless the advisor knows the other tracks say more.
  const help = document.getElementById("industry-help");
  if (help) {
    help.textContent = "General shows the DoD one-line definitions. Choose Software or Hardware for the DoD guidebook's fuller descriptions. " +
      (health
        ? "For this Life Science venture, choose Diagnostics, Medical device, or Therapeutics."
        : "The Life Science tracks (Diagnostics, Medical device, Therapeutics) are available when the venture is marked as a Life Science venture.");
  }

  // Provenance line for the selected track. Life-sciences tracks follow BARDA
  // rather than the DoD TRLs, and advisors need to know that on sight.
  const note = document.getElementById("industry-attribution");
  if (note) {
    const trackKey = effectiveTrackKey(select?.value, health);
    const hint = getTrackHint(trackKey);
    const attribution = getTrackAttribution(trackKey);
    const parts = [hint, attribution].filter(Boolean);
    note.textContent = parts.join(" ");
    note.classList.toggle("hidden", parts.length === 0);
  }
}

/* -------------------------------------------------
   Compatibility helpers used by categories.js
-------------------------------------------------- */
export function toggleLevel(cardEl) {
  if (!cardEl) return;
  cardEl.classList.toggle("expanded");
}

/* -------------------------------------------------
   Generic Modal Helpers
-------------------------------------------------- */
export function showModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("hidden");
  }
}

export function hideModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
  }
}
