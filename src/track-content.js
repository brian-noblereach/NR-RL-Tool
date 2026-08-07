// track-content.js - TRL track resolution.
// Added August 2026 with the BARDA-aligned life-sciences tracks.
//
// The TRL (Technology) category is scored against a track. The general,
// software, and hardware tracks share the NASA TRL titles and definitions in
// readiness-levels.js and differ only in their indicators. The three
// life-sciences tracks additionally override titles, definitions, and — for
// therapeutics — workstreams and lettered activities, from trl-tracks.js.

import { TRL_TRACK_CONTENT } from "./data/index.js";

// DOM <option value> -> data sub-key. The health_ prefix on the DOM side is
// load-bearing: it marks the tracks that require Life Sciences Mode.
const TRACK_KEY_BY_DOM_VALUE = {
  general: "general",
  software: "software",
  hardware: "hardware",
  health_diagnostics: "diagnostics",
  health_device: "device",
  health_therapeutics: "therapeutics",

  // Legacy aliases. GitHub Pages will serve a browser-cached index.html against
  // fresh JS for some users, so a stale option value must land on the right
  // track rather than silently degrading to general.
  health_pharma: "therapeutics",
  pharma: "therapeutics",
  meddevice: "device",
};

const HEALTH_ONLY_TRACKS = new Set(["diagnostics", "device", "therapeutics"]);

// level -> override, per track. Built once at module load.
const OVERRIDES_BY_TRACK = new Map(
  Object.entries(TRL_TRACK_CONTENT).map(([track, config]) => [
    track,
    new Map((config.levels || []).map((lvl) => [lvl.level, lvl])),
  ])
);

export function normalizeTrackKey(domValue) {
  return TRACK_KEY_BY_DOM_VALUE[String(domValue == null ? "" : domValue).trim()] || "general";
}

export function isHealthOnlyTrack(trackKey) {
  return HEALTH_ONLY_TRACKS.has(trackKey);
}

/**
 * Health-mode-aware track key. A life-sciences track selected while Life
 * Sciences Mode is off must not leak that track's content — the optgroup is
 * disabled but that does not deselect an already-selected option.
 */
export function effectiveTrackKey(domValue, isHealthRelated) {
  const key = normalizeTrackKey(domValue);
  return !isHealthRelated && isHealthOnlyTrack(key) ? "general" : key;
}

/** Provenance line shown once under the track selector. "" when none. */
export function getTrackAttribution(trackKey) {
  return (TRL_TRACK_CONTENT[trackKey] && TRL_TRACK_CONTENT[trackKey].sourceNote) || "";
}

/** One-line "which track?" hint shown under the selector. "" when none. */
export function getTrackHint(trackKey) {
  return (TRL_TRACK_CONTENT[trackKey] && TRL_TRACK_CONTENT[trackKey].trackHint) || "";
}

/**
 * Field-level sparse merge of a track override onto a shared level. Any field
 * the override omits falls back to the shared content, so a future edit to the
 * shared text still reaches every track that did not override it.
 *
 * Returns levelObj UNCHANGED when no override applies, so the other nine
 * categories and the general/software/hardware tracks are untouched.
 */
export function resolveLevel(category, levelObj, trackKey) {
  if (category !== "Technology") return levelObj;

  const byLevel = OVERRIDES_BY_TRACK.get(trackKey);
  const override = byLevel && byLevel.get(levelObj.level);
  if (!override) return levelObj;

  return {
    ...levelObj,
    title: override.title ?? levelObj.title,
    definition: override.definition ?? levelObj.definition,
    deliverables: override.deliverables ?? levelObj.deliverables,
    indicators: override.indicators ?? levelObj.indicators,
    workstreams: override.workstreams || [],
    activities: override.activities || [],
    // Marks authored clinical canon: transform.js must not run the health term
    // map over it, and must not merge healthExtras on top of it.
    isTrackOverride: true,
    trackKey,
  };
}
