// intake-app.js - Venture intake page (intake.html).
//
// Scoring lives in intake-model.js, the pre-call brief in intake-brief.js,
// program-specific text in intake-config.js. Applicants never see levels,
// gate signals, review flags, or next-level text; those go only to the
// Venture Intake Submissions sheet (and to staff, on the thank-you screen).
//
// Flow (gen-3.0): login -> start (new / pick up from this browser / email +
//   return code) -> Part 1 screens -> save Part 1 (creates the row; idempotent,
//   retry) -> "Part 1 is saved" -> Part 2 screens -> submit Part 2 (same row)
//   -> thank-you; files upload one per request after Part 2, with per-file
//   retry. Part 2 can be finished later, on this browser from the draft or
//   anywhere with the email and return code.

import {
  SCREENS, CATS, NAMES, VERSION, SHOW_LEVELS_TO_FOUNDER, FORMS, ICORPS, HOURS, OUTCOMES,
  PRIOR_EXPERIENCE, NS_RELEVANCE, RETAKE_SECTIONS, FULL_TIME, APP_COUNTS, ROSTER_ROLES, ROSTER_TIME,
  ROLE_OPTIONS, NOT_SURE_YET, SOURCES, SOURCE_ITEMS, CONVERSATIONS, SOURCE_NOT_SURE,
  HELP, COMPLETED_WITH, CUSTOMERS_KNOWN, CUSTOMERS_KNOWN_Q, ICORPS_HELP, GLP_GMP_HELP, yearOptions,
  freshAnswers, closeSet, createModel, track, isHealth, hasFacilities, trlOptions, displayText,
  buildRow, founderRecap, diffFacts, canCarry, carryForward, sectionSummary, hasNewQuestions,
  evidenceItems, hasEvidenceQuestions, partOf, itemLabel, trackAllows
} from './intake-model.js';
import { missingRequired, planJump } from './intake-flow.js';
import { buildBrief } from './intake-brief.js';
import { buildQmInput } from './intake-qm.js';
import { INTAKE_CONFIG as CFG } from './intake-config.js';
import { IntakeAuth } from './intake-auth.js';
import { submitIntake, completeIntake, uploadIntakeFile, checkFile, lookupIntake, resendCode, newSubmissionId } from './intake-api.js';
import { TRL_TRACK_CONTENT } from '../data/trl-tracks.js';
import { FOOTER_NOTICE, BRL_LICENSE, SOURCE_ATTRIBUTIONS, EXPORT_ATTRIBUTION_LINES } from '../data/attributions.js';

// v3 with gen-3.0: a gen-2.0 draft's screens no longer exist, so it isn't resumed.
const DRAFT_KEY = 'nr-intake-draft-v3';   // in-progress answers (autosave), through Part 2
const LAST_KEY = 'nr-intake-last-v2';     // last submitted answers on this browser
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/i;
const PARAMS = new URLSearchParams(location.search);
const TRACK_KEY = { General: 'general', Software: 'software', Hardware: 'hardware', Therapeutics: 'therapeutics', Diagnostics: 'diagnostics', Device: 'device' };
// Application Status on a row whose Part 2 hasn't arrived (proxy INTAKE_STATUS.part1).
const PART1_STATUS = 'Part 1 submitted';

/* "Part 1 takes about X; Part 2 about Y. " once the timing pilot sets them; else "". */
function timeEstimate() {
  const t = CFG.estimatedTime || {};
  if (t.part1 && t.part2) return `Part 1 takes ${t.part1}; Part 2, ${t.part2}. `;
  if (t.part1) return `Part 1 takes ${t.part1}. `;
  return '';
}

/* ---------- state ---------- */
let A;                 // answers (see intake-model.js)
let H = [];            // finished screen ids, in order
let P = null;          // previous submission's answers, used to prefill a re-take
// { submissionId, previous: { submissionId, submittedAt } | null,
//   once Part 1 is saved: rowToken, part1: { returnCode, intakeNumber, emailSent, submittedAt } }
let meta = {};
let phase = 'start';   // 'start' | 'intake' | 'done'
let submitState = { status: 'idle' }; // 'idle' | 'sending' | 'error'
let done = null;       // thank-you screen data
let startState = { email: '', code: '', msg: '', err: false, busy: false, submissions: null };
let model = null;
let HP = '';           // honeypot value (never stored)
// Files live in memory only (too big for browser storage); links and file
// names are saved in A.uploads.
const FILES = { deck: [null], plan: [null], supporting: [null, null, null] };

const M = () => model || (model = createModel(A));
const invalidate = () => { model = null; };
// Part 2 opens once Part 1 is saved; screens and the rail are per part.
const currentPart = () => (A && A.part1 ? 2 : 1);

/* ---------- timing: active seconds per screen (spec section 13), into record.json ---------- */
let clock = null;      // { id, since } for the screen on view
let pausedId = null;   // screen whose clock stopped when the tab was hidden
function stopClock() {
  if (!clock || !A) { clock = null; return; }
  A.timing = A.timing || {};
  A.timing[clock.id] = Math.round(((A.timing[clock.id] || 0) + (Date.now() - clock.since) / 1000) * 10) / 10;
  clock = null;
}
function startClock(id) {
  if (clock && clock.id === id) return;
  stopClock();
  if (id && document.visibilityState !== 'hidden') clock = { id, since: Date.now() };
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    pausedId = clock && clock.id;
    stopClock();
    if (A && phase === 'intake') saveDraft();
  } else if (pausedId) {
    startClock(pausedId);
    pausedId = null;
  }
});
/* seconds per part, for record.json */
function timingTotals() {
  const t = (A && A.timing) || {}, out = { part1: 0, part2: 0 };
  Object.entries(t).forEach(([id, s]) => { out['part' + partOf(id)] += s; });
  out.part1 = Math.round(out.part1); out.part2 = Math.round(out.part2);
  return out;
}

/* ---------- storage ---------- */
function store(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* storage unavailable: the intake still works, just without autosave */ }
}
function load(key) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function saveDraft() { store(DRAFT_KEY, { A, H, P, meta }); }
function clearDraft() { store(DRAFT_KEY, null); }

/* answers without in-progress screen state */
function cleanA(src) {
  const o = JSON.parse(JSON.stringify(src));
  Object.keys(o).forEach(k => { if (k.startsWith('_')) delete o[k]; });
  delete o.carry; delete o.carryFrom;   // navigation state, not answers
  return o;
}

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const $ = id => document.getElementById(id);
const view = () => $('view');
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtSize(bytes) {
  return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function setLayout(withRail) {
  $('steps-nav').hidden = !withRail;
  $('main').classList.toggle('single', !withRail);
}

/* The rail lists the current part's steps (decision D-2), and the other part as
   one line, so Part 1 always shows that Part 2 follows. The evidence screen is
   always listed, so the rail never shows that ticking adds work. */
function rail(cur) {
  const part = currentPart();
  const screens = M().activeScreens().filter(s => s.part === part), list = screens.map(s => s.sect);
  const i = cur ? list.indexOf(cur.sect) : list.length;
  const steps = `<li class="part-label">Part ${part} of 2</li>` + screens.map((s, j) => {
    const cls = [j < i ? 'done' : j === i ? 'now' : '', A.done[s.id] && isMissing(s.id) ? 'missing' : ''].filter(Boolean).join(' ');
    return `<li class="${cls}">${esc(s.sect)}${cls.includes('missing') ? '<span class="sr-only"> (answers still needed)</span>' : ''}</li>`;
  }).join('');
  $('rail').innerHTML = part === 1
    ? steps + '<li class="part-label">Part 2 of 2</li><li class="next-part">In your own words</li>'
    : '<li class="part-label">Part 1 of 2</li><li class="done">Saved</li>' + steps;
  const left = incompleteScreens().length, toFinish = `${left} section${left === 1 ? '' : 's'} to finish`;
  $('railmini').textContent = `Part ${part} of 2 · ` + (cur ? `Step ${i + 1} of ${list.length}: ${cur.sect}` + (left ? ` · ${toFinish}` : '') : (left ? toFinish : 'Finished'));
}

/* Back never leaves the current part: Part 1 is saved before Part 2 opens. */
const canGoBack = () => H.length > 0 && partOf(H[H.length - 1]) === currentPart();
function backLink() { return canGoBack() ? '<button class="linkish" id="back">Back</button>' : ''; }
function wireBack() {
  const b = $('back'); if (b) b.onclick = back;
  const l = $('finish-later'); if (l) l.onclick = showFinishLater;
}

/* ----- Part 2 is the default next step; stopping is a choice, not the end ----- */

/* A short "Part 1 saved" banner on the first Part 2 screen, instead of a stop page. */
function part2Intro() {
  if (!meta.part2Intro || !meta.part1) return '';
  return `<div class="note ok part2-intro" role="status"><strong>Part 1 is saved.</strong> Now Part 2: describe the technology and where it could be used, in your own words. It's the last part of the application.</div>`;
}
/* Every Part 2 screen offers to stop, next to Continue. */
function laterLink() {
  return currentPart() === 2 ? '<button type="button" class="linkish" id="finish-later">Finish later</button>' : '';
}
function showFinishLater() {
  const p1 = meta.part1 || {};
  const panel = view().querySelector('.panel');
  if (!panel || panel.querySelector('.later-note')) return;
  saveDraft();   // in-progress answers are already autosaved; this covers the last keystroke's screen state
  panel.querySelector('.q').insertAdjacentHTML('afterend', `<div class="note later-note" role="status">
    <p><strong>Your answers are saved, but your application isn't finished until you submit Part 2.</strong></p>
    <p>To come back, open this page on this device, or on any device choose "Continue from a previous submission" and enter ${esc(A.applicant.email)} and your return code <span class="mono">${esc(p1.returnCode)}</span>${p1.emailSent ? ' (we emailed it to you)' : ''}.</p>
    <p><button type="button" class="linkish" id="keep-going">Keep going now</button></p></div>`);
  $('keep-going').onclick = () => { panel.querySelector('.later-note').remove(); };
  panel.querySelector('.later-note').scrollIntoView({ block: 'nearest' });
}

/* "What's this?" (gen-3.0): one line, expanded in place so it works on touch screens. */
function helpHtml(id, text) {
  if (!text) return '';
  return `<button type="button" class="linkish whats" aria-expanded="false" aria-controls="help_${id}">What's this?</button><p class="hint help-line" id="help_${id}" hidden>${esc(text)}</p>`;
}
function wireHelp() {
  view().querySelectorAll('.whats').forEach(b => {
    b.onclick = () => {
      const el = $(b.getAttribute('aria-controls'));
      el.hidden = !el.hidden;
      b.setAttribute('aria-expanded', String(!el.hidden));
    };
  });
}

function selectHtml(cls, opts, value, label) {
  return `<select class="${cls}" aria-label="${esc(label)}"><option value="">${esc(label)}</option>${opts.map(o => `<option ${value === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
}
function seg(obj, name, opts) {
  return `<div class="seg" data-name="${name}">${opts.map(o => `<button type="button" aria-pressed="${obj[name] === o}">${esc(o)}</button>`).join('')}</div>`;
}
function checks(name, opts, selected) {
  return `<div class="checks" data-name="${name}">${opts.map(o => `<label class="chk"><input type="checkbox" value="${esc(o)}" ${(selected || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
}
function readChecks(name) {
  return [...view().querySelectorAll(`.checks[data-name="${name}"] input:checked`)].map(i => i.value);
}
/* A "not sure" choice that can't be combined: checking it clears the others, and checking another clears it. */
function wireExclusive(name, exclusive, onChange) {
  const boxes = [...view().querySelectorAll(`.checks[data-name="${name}"] input`)];
  boxes.forEach(b => {
    b.onchange = () => {
      if (b.checked) boxes.forEach(o => { if (o !== b && (b.value === exclusive || o.value === exclusive)) o.checked = false; });
      onChange();
    };
  });
}
function wireSegs(read, save, rerender) {
  view().querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => {
    b.onclick = () => { const o = read(); o[s.dataset.name] = b.textContent; save(o); saveDraft(); rerender(); };
  }));
}
function err(msg) { $('err').textContent = msg; }

function prefillNote() {
  return P && meta.previous
    ? `<p class="note ok">We filled in your answers from ${esc(fmtDate(meta.previous.submittedAt)) || 'your last submission'}. Update anything that has changed.</p>`
    : '';
}

/* ---------- uploads (file or link per slot) ---------- */
const SLOT_LABEL = (slot, i) => slot === 'deck' ? 'Pitch deck' : slot === 'plan' ? 'Business plan or canvas' : 'Supporting file ' + (i + 1);

function uploadsOf() {
  A.uploads = A.uploads || { deck: null, plan: null, supporting: [null, null, null] };
  A.uploads.supporting = A.uploads.supporting || [null, null, null];
  return A.uploads;
}
function slotValue(slot, i) { const u = uploadsOf(); return slot === 'supporting' ? u.supporting[i] : u[slot]; }
function setSlot(slot, i, value, file) {
  const u = uploadsOf();
  if (slot === 'supporting') u.supporting[i] = value; else u[slot] = value;
  FILES[slot][i] = file || null;
  saveDraft();
}
/* a file name in the draft whose File was lost on reload */
const fileMissing = (slot, i) => { const v = slotValue(slot, i); return !!(v && v.name && !FILES[slot][i]); };

function slotHtml(slot, i, hint) {
  const v = slotValue(slot, i), id = `${slot}${i}`;
  if (v && (v.link || v.name)) {
    const what = v.link ? `Link: ${esc(v.link)}` : `${esc(v.name)} (${fmtSize(v.size)})`;
    return `<div class="slot" data-slot="${slot}" data-i="${i}"><span class="slot-name">${what}</span>
      <button type="button" class="linkish slot-remove">Remove</button>
      ${fileMissing(slot, i) ? '<p class="status err">Files aren\'t kept when the page reloads. Choose the file again, or remove it.</p><input type="file" class="slot-file">' : ''}</div>`;
  }
  return `<div class="slot" data-slot="${slot}" data-i="${i}">
    <input type="file" class="slot-file" aria-label="${esc(SLOT_LABEL(slot, i))} file" accept=".pdf,.pptx,.docx,.xlsx,.png,.jpg,.jpeg,.mp4">
    <span class="slot-or">or</span>
    <input type="url" class="slot-link" placeholder="Paste a link (Box, Google Drive, OneDrive)" aria-label="${esc(SLOT_LABEL(slot, i))} link">
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}<p class="status err slot-err"></p></div>`;
}

function wireSlots(rerender) {
  view().querySelectorAll('.slot').forEach(el => {
    const slot = el.dataset.slot, i = +el.dataset.i;
    const fileIn = el.querySelector('.slot-file'), linkIn = el.querySelector('.slot-link'), errEl = el.querySelector('.slot-err');
    const rm = el.querySelector('.slot-remove');
    if (rm) rm.onclick = () => { setSlot(slot, i, null); rerender(); };
    if (fileIn) fileIn.onchange = () => {
      const f = fileIn.files[0];
      if (!f) return;
      const problem = checkFile(f);
      if (problem) { if (errEl) errEl.textContent = problem; else alert(problem); fileIn.value = ''; return; }
      setSlot(slot, i, { name: f.name, size: f.size, type: f.type || '' }, f);
      rerender();
    };
    if (linkIn) linkIn.onchange = () => {
      const url = linkIn.value.trim();
      if (!url) return;
      if (!URL_RE.test(url)) { errEl.textContent = 'Links start with http:// or https://.'; return; }
      setSlot(slot, i, { link: url });
      rerender();
    };
  });
}

/* planned uploads sent with the submit: files present in memory, and links */
function plannedUploads() {
  const out = [], u = uploadsOf();
  const add = (slot, i, v) => {
    if (!v) return;
    if (v.link) out.push({ slot, index: i, link: v.link });
    else if (FILES[slot][i]) out.push({ slot, index: i, name: v.name, size: v.size, mimeType: v.type || '' });
  };
  add('deck', 0, u.deck);
  add('plan', 0, u.plan);
  u.supporting.forEach((v, i) => add('supporting', i, v));
  return out;
}

/* ---------- flow ---------- */
function beginIntake(prev) {
  A = freshAnswers();
  H = [];
  P = prev ? prev.answers : null;
  // Re-take of a submission from this form version family: open on "What's
  // changed", carry forward unchanged sections, and keep the same email so the
  // history and return code stay linked.
  if (P && P.applicant && P.done) {
    A.retake = true;
    A.lockedEmail = P.applicant.email || '';
  }
  const pctx = (P && P.ctx) || {};
  A.ctx = { source: PARAMS.get('source') || '', portfolio: PARAMS.get('portfolio') || pctx.portfolio || CFG.portfolio || '' };
  meta = {
    submissionId: newSubmissionId(),
    previous: prev ? { submissionId: prev.submissionId || '', submittedAt: prev.submittedAt || '' } : null
  };
  FILES.deck = [null]; FILES.plan = [null]; FILES.supporting = [null, null, null];
  phase = 'intake';
  submitState = { status: 'idle' };
  invalidate();
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

/**
 * Commit a screen. `missing` lists required answers still blank: the screen is
 * kept as finished (so the applicant can look ahead) but marked incomplete,
 * and submitting waits until it is complete.
 */
function finish(id, missing = []) {
  stopClock();
  A.done[id] = true;
  H.push(id);
  A.missing = A.missing || {};
  if (missing.length) { A.missing[id] = missing; A._skipped = SCREENS.find(s => s.id === id).sect; }
  else delete A.missing[id];
  if (A._locals) delete A._locals[id];
  if (A.review) delete A.review[id];
  invalidate();
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

const sectOf = id => SCREENS.find(s => s.id === id).sect;
const isMissing = id => !!(A.missing && A.missing[id] && A.missing[id].length);
/* finished screens in the current part that still need answers, in order */
const incompleteScreens = () => H.filter(id => isMissing(id) && partOf(id) === currentPart());

/**
 * Put one screen's committed answers (from `src`: A itself, or a snapshot)
 * into its in-progress state, so the screen shows them again.
 */
function toProgress(id, src) {
  const sc = SCREENS.find(s => s.id === id);
  const unsure = !!(src.unsure && src.unsure[id]);
  const copy = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  if (id === 'changes') A._changes = copy(src.changeChoices);
  else if (id === 'applicant') A._applicant = copy(src.applicant);
  else if (id === 'project') A._project = copy(src.project);
  else if (id === 'founder') A._founder = copy(src.founder);
  else if (id === 'tech') A._tech = { stage: src.stage == null ? null : src.stage, unsure };
  else if (id === 'evidence') {
    A._evidence = { ev: copy(src.E) || {}, src: copy(src.src) || {}, count: src.count != null ? String(src.count) : '', confirm: src.confirm || null, techEv: src.techEv || '' };
  }
  else if (id === 'consent') A._consent = copy(src.consent);
  else if (id === 'written') A._written = copy(src.written);
  else if (id === 'perspective') A._perspective = copy(src.perspective);
  else if (id === 'people') A._people = { roster: copy(src.team) || [], facilities: src.facilities || '' };
  else if (id === 'materials') A._materials = copy(src.materials);
  else {
    const L = { id, user: [], unsure };
    (sc.items || []).forEach(it => {
      if (src.F && src.F[it.k] === true && !(src.I && it.k in src.I)) L.user.push(it.k);
    });
    if (id === 'cust' && src.problem && typeof src.problem.known === 'boolean') L.known = src.problem.known ? 'Yes' : 'Not yet';
    A._locals = A._locals || {};
    A._locals[id] = L;
  }
}

/* Remove one screen's committed answers. */
function clearCommitted(id) {
  const sc = SCREENS.find(s => s.id === id);
  delete A.done[id];
  delete A.unsure[id];
  if (id === 'changes') { delete A.changeChoices; A.carry = {}; }
  else if (id === 'applicant') delete A.applicant;
  else if (id === 'project') delete A.project;
  else if (id === 'founder') delete A.founder;
  else if (id === 'tech') delete A.stage;
  else if (id === 'evidence') { A.E = {}; A.src = {}; delete A.count; delete A.confirm; delete A.techEv; delete A.evidenceSkipped; }
  else if (id === 'consent') delete A.consent;
  else if (id === 'written') delete A.written;
  else if (id === 'perspective') delete A.perspective;
  else if (id === 'people') { delete A.team; delete A.facilities; }
  else if (id === 'materials') delete A.materials;
  else {
    (sc.items || []).forEach(it => {
      delete A.F[it.k];
      if (A.I) delete A.I[it.k];
    });
    if (id === 'cust') delete A.problem;
  }
}

/* A changed Part 1 answer is a new submission. Part 2 belongs to the saved row. */
function afterRewind() {
  if (!A.part1) meta.submissionId = newSubmissionId();
  submitState = { status: 'idle' };
  invalidate();
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

/**
 * Go back one screen. The screen's answers move back into its in-progress
 * state so the applicant sees them again rather than a blank form. Each
 * checklist screen keeps its own in-progress state (A._locals), so stepping
 * back over several screens loses nothing. An evidence screen that was
 * skipped because it had nothing to ask is stepped over.
 */
function back() {
  if (!canGoBack()) return;
  let id = H.pop();
  if (id === 'evidence' && A.evidenceSkipped && canGoBack()) {
    clearCommitted('evidence');
    id = H.pop();
  }
  stopClock();
  toProgress(id, A);
  clearCommitted(id);
  afterRewind();
}

/**
 * Go back to a finished screen to complete it. The screens after it are set
 * aside and carried forward again from a snapshot once it is finished, by the
 * same loop a re-take uses (render()); only screens that are still
 * incomplete, or that the change affects, are shown again.
 */
function jumpTo(id) {
  const plan = planJump(H, id);
  if (!plan) return;
  const snapshot = cleanA(A);
  while (H[H.length - 1] !== id) {
    const later = H.pop();
    clearCommitted(later);
    if (A._locals) delete A._locals[later];
  }
  H.pop();
  toProgress(id, A);
  clearCommitted(id);
  A.carry = A.carry || {};
  plan.carry.forEach(x => { A.carry[x] = true; });
  A.carryFrom = snapshot;
  afterRewind();
}

function startOver() {
  if (!confirm('Start over? The answers you have entered so far will be cleared.')) return;
  clock = null;
  clearDraft();
  A = freshAnswers(); H = []; P = null; meta = {};
  FILES.deck = [null]; FILES.plan = [null]; FILES.supporting = [null, null, null];
  phase = 'start';
  invalidate();
  render();
}

/* ---------- render ---------- */
function render() {
  $('start-over').hidden = phase !== 'intake' || !!(A && A.part1);
  if (phase !== 'intake') startClock(null);
  if (phase === 'start') return renderStart();
  if (phase === 'done') return renderDone();

  let sc = M().nextScreen();
  // Carry forward without showing, in screen order (so Back still walks
  // through them): sections marked "No change" on a re-take (from P), or the
  // screens set aside by jumpTo() (from its snapshot). An evidence screen with
  // nothing to ask is passed over the same way.
  let carried = false;
  for (;;) {
    if (sc && sc.id === 'evidence' && !hasEvidenceQuestions(A)) {
      if (A.carry) delete A.carry.evidence;
      if (A.missing) delete A.missing.evidence;
      A.E = {}; A.src = {}; delete A.count; delete A.confirm; delete A.techEv;
      A.done.evidence = true;
      A.evidenceSkipped = true;
      H.push('evidence');
      invalidate();
      carried = true;
      sc = M().nextScreen();
      continue;
    }
    if (!(sc && A.carry && A.carry[sc.id])) break;
    delete A.carry[sc.id];
    const src = A.carryFrom || P;
    if (A.carryFrom && isMissing(sc.id)) { toProgress(sc.id, src); break; }   // still incomplete: show it
    if (!canCarry(A, src, sc.id)) {
      if (A.carryFrom) toProgress(sc.id, src);
      A.review = Object.assign(A.review || {}, { [sc.id]: !A.carryFrom && P && hasNewQuestions(P, sc.id) ? 'new' : 'changed' });
      break;
    }
    carryForward(A, src, sc.id);
    A.done[sc.id] = true;
    H.push(sc.id);
    invalidate();
    carried = true;
    sc = M().nextScreen();
  }
  if (!sc) {
    // Anything left was for screens no longer asked. At the end of Part 1,
    // keep the re-take's Part 2 choices for when Part 2 opens.
    delete A.carryFrom;
    if (A.part1 || !A.carry) delete A.carry;
    else Object.keys(A.carry).forEach(id => { if (partOf(id) === 1) delete A.carry[id]; });
  }
  if (carried) saveDraft();
  setLayout(true);
  rail(sc);
  startClock(sc ? sc.id : null);
  if (!sc) return incompleteScreens().length ? renderReview() : renderSubmit();
  ({ changes: renderChanges, applicant: renderApplicant, project: renderProject, founder: renderFounder,
     tech: renderTech, multi: renderMulti, evidence: renderEvidence, consent: renderConsent,
     written: renderWritten, perspective: renderPerspective, people: renderPeople, materials: renderMaterials })[sc.type](sc);
  wireHelp();
  const panel = view().querySelector('.panel');
  // Just skipped required answers on the previous screen
  if (A._skipped && panel) {
    panel.querySelector('.sect').insertAdjacentHTML('afterend', `<p class="note skip-note">Skipped for now: required answers on ${esc(A._skipped)}. You'll finish them before you submit.</p>`);
    delete A._skipped;
  }
  // Coming back to an incomplete screen
  if (isMissing(sc.id) && panel) {
    panel.querySelector('.q').insertAdjacentHTML('afterend', `<p class="note missing-note">Still needed: ${A.missing[sc.id].map(esc).join('; ')}.</p>`);
  }
  // A carried section that can't be reused as-is (an earlier answer changed what it asks)
  if (A.review && A.review[sc.id]) {
    const panel = view().querySelector('.panel');
    if (panel && !panel.querySelector('.review-note')) {
      const why = A.review[sc.id] === 'new' ? 'This section has a new question since your last submission.' : 'An answer you updated changes this section, so please check it.';
      panel.querySelector('.q').insertAdjacentHTML('afterend', `<p class="note review-note">${why} Your previous answers are filled in.</p>`);
    }
  }
}

/* ----- re-take: what's changed? ----- */
function renderChanges() {
  const choices = A._changes || {};
  const rows = RETAKE_SECTIONS.filter(s => P.done && P.done[s.id]);
  rows.forEach(s => { if (!choices[s.id]) choices[s.id] = 'No change'; });
  A._changes = choices;
  view().innerHTML = `<div class="panel"><p class="sect">What's changed</p>
    <h2 class="q">What's changed since ${esc(fmtDate(meta.previous && meta.previous.submittedAt)) || 'last time'}?</h2>
    <p class="hint lead">Sections marked <strong>No change</strong> keep your previous answers and won't be asked again. Choose <strong>Update</strong> for anything that's different, including things that are no longer true. Changing direction is normal; it's fine to uncheck items.</p>
    <div class="changes">${rows.map(s => `<div class="change-row">
      <div class="change-text"><strong>${esc(s.label)}</strong><span>${esc(sectionSummary(P, s.id))}</span></div>
      <div class="seg" data-name="${s.id}">${['No change', 'Update'].map(o => `<button type="button" aria-pressed="${choices[s.id] === o}">${o}</button>`).join('')}</div>
    </div>`).join('')}</div>
    <p class="hint">Asked again every time: your time and hours, why this and why now, and materials. Sections you didn't answer last time are new this time.</p>
    <div class="actions"><button class="btn" id="go">Continue</button><button class="btn ghost" id="pivot">We've changed direction: review everything</button><span class="status err" id="err"></span></div></div>`;
  view().querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => {
    b.onclick = () => { choices[seg.dataset.name] = b.textContent; saveDraft(); renderChanges(); };
  }));
  const go = () => {
    A.changeChoices = choices;
    A.carry = {};
    rows.forEach(s => { if (choices[s.id] === 'No change') A.carry[s.id] = true; });
    // The evidence screen follows the checklists: carried only when none of them changed.
    const facts = SCREENS.filter(s => s.type === 'multi' || s.id === 'tech').map(s => s.id);
    if (rows.some(s => facts.includes(s.id)) && rows.every(s => !facts.includes(s.id) || choices[s.id] === 'No change')) A.carry.evidence = true;
    delete A._changes;
    finish('changes');
  };
  $('go').onclick = go;
  $('pivot').onclick = () => { rows.forEach(s => { choices[s.id] = 'Update'; }); go(); };
}

/* ----- start ----- */
function renderStart() {
  setLayout(false);
  const last = load(LAST_KEY);
  const s = startState;
  view().innerHTML = `<div class="panel intro">
    <p class="sect">Welcome</p>
    <h2 class="q">${esc(CFG.landing.heading)}</h2>
    ${CFG.landing.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}
    <p class="hint">${timeEstimate()}Your answers are saved on this device as you go, so you can stop and come back.</p>
    <div class="choices">
      <div class="choice">
        <h3>Start a new submission</h3>
        <p>Your first time, or a different project.</p>
        <button class="btn" id="new">Start</button>
      </div>
      ${last && last.answers ? `<div class="choice">
        <h3>Pick up from your last submission</h3>
        <p>${esc(last.project)}, submitted ${esc(fmtDate(last.submittedAt))}. Your previous answers will be filled in, so you only update what has changed.</p>
        <div class="actions" style="margin-top:0"><button class="btn" id="pick">Start from these answers</button><button class="linkish" id="forget">Not you? Forget this</button></div>
      </div>` : ''}
      <div class="choice">
        <h3>Continue from a previous submission</h3>
        <p>Enter the email you used and the return code we sent you.</p>
        <div class="inline-fields">
          <input type="email" id="lk-email" placeholder="Email" value="${esc(s.email)}" autocomplete="email" aria-label="Email">
          <input type="text" id="lk-code" placeholder="Return code" value="${esc(s.code)}" autocapitalize="characters" spellcheck="false" aria-label="Return code">
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn ghost" id="lookup" ${s.busy ? 'disabled' : ''}>Find my submission</button>
          <button class="linkish" id="resend" ${s.busy ? 'disabled' : ''}>Forgot your code? Email it to me</button>
        </div>
        <p class="status${s.err ? ' err' : ''}" id="lk-msg" role="status">${esc(s.msg)}</p>
        ${s.submissions ? `<div class="picklist">${s.submissions.map((x, i) => `<button class="opt" data-i="${i}"><span class="k">${esc(x.intakeNumber || '')}</span>${esc(x.project)} · ${esc(fmtDate(x.submittedAt))}${x.status === PART1_STATUS ? ' · <strong>Part 2 not finished</strong>' : ''}</button>`).join('')}</div>` : ''}
      </div>
    </div></div>`;

  const readLookup = () => { s.email = $('lk-email').value.trim(); s.code = $('lk-code').value.trim(); };
  const setMsg = (msg, isErr) => { s.msg = msg; s.err = !!isErr; };

  $('new').onclick = () => beginIntake(null);
  if ($('pick')) $('pick').onclick = () => beginIntake({ answers: last.answers, submissionId: last.submissionId, submittedAt: last.submittedAt });
  if ($('forget')) $('forget').onclick = () => { store(LAST_KEY, null); renderStart(); };

  $('lookup').onclick = async () => {
    readLookup();
    s.submissions = null;
    if (!EMAIL_RE.test(s.email) || !s.code) { setMsg('Enter your email and return code.', true); return renderStart(); }
    s.busy = true; setMsg('Looking up your submission...'); renderStart();
    try {
      const res = await lookupIntake({ email: s.email, code: s.code });
      if (!res.success) { setMsg(res.error || 'That email and code do not match our records.', true); return; }
      if (!res.submissions.length) { setMsg('No submissions found for that email.', true); return; }
      if (res.submissions.length === 1) { await loadPrevious(res.submissions[0]); return; }
      s.submissions = res.submissions;
      setMsg('Choose the submission to continue or start from:');
    } catch (e) {
      if (e.unauthorized) return showLogin(e.message);
      setMsg('We could not reach the server. Check your connection and try again.', true);
    } finally {
      s.busy = false;
      if (phase === 'start') renderStart();
    }
  };

  $('resend').onclick = async () => {
    readLookup();
    if (!EMAIL_RE.test(s.email)) { setMsg('Enter the email you used, then choose "Email it to me".', true); return renderStart(); }
    s.busy = true; setMsg('Sending...'); renderStart();
    try {
      const res = await resendCode(s.email);
      setMsg(res.message || 'If we have a submission for that address, we have emailed its return code.');
    } catch (e) {
      if (e.unauthorized) return showLogin(e.message);
      setMsg('We could not reach the server. Check your connection and try again.', true);
    } finally {
      s.busy = false;
      if (phase === 'start') renderStart();
    }
  };

  view().querySelectorAll('.picklist .opt').forEach(b => {
    b.onclick = async () => {
      s.busy = true; setMsg('Loading your answers...'); renderStart();
      try { await loadPrevious(s.submissions[+b.dataset.i]); }
      catch (e) {
        if (e.unauthorized) return showLogin(e.message);
        setMsg('We could not load that submission. Try again.', true);
      } finally {
        s.busy = false;
        if (phase === 'start') renderStart();
      }
    };
  });
}

async function loadPrevious(sub) {
  const s = startState;
  const res = await lookupIntake({ email: s.email, code: s.code, submissionId: sub.submissionId });
  if (!res.success || !res.answers || !res.answers.A) {
    s.msg = res.error || 'We could not load the answers for that submission.';
    s.err = true;
    return;
  }
  const code = s.code;
  startState = { email: '', code: '', msg: '', err: false, busy: false, submissions: null };
  // Part 1 saved, Part 2 not yet: carry on with Part 2 on the same row.
  if (res.status === PART1_STATUS && res.rowToken) return resumePart2(res, sub, code);
  beginIntake({ answers: res.answers.A, submissionId: sub.submissionId, submittedAt: res.submittedAt || sub.submittedAt });
}

/* Open Part 2 of a saved Part 1 (from another browser, or after the draft was cleared). */
function resumePart2(res, sub, code) {
  A = res.answers.A;
  A.E = A.E || {}; A.F = A.F || {}; A.unsure = A.unsure || {};
  A.part1 = { submittedAt: res.submittedAt || sub.submittedAt };
  delete A.carry; delete A.carryFrom;
  H = (res.answers.H || []).slice();
  P = null;
  meta = {
    submissionId: sub.submissionId,
    previous: null,
    rowToken: res.rowToken,
    part1: { returnCode: String(code || '').toUpperCase(), intakeNumber: sub.intakeNumber || 1, emailSent: true, submittedAt: A.part1.submittedAt }
  };
  FILES.deck = [null]; FILES.plan = [null]; FILES.supporting = [null, null, null];
  phase = 'intake';
  submitState = { status: 'idle' };
  invalidate();
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

/* ----- 1. Applicant ----- */
function renderApplicant() {
  const a = A._applicant || (P && P.applicant ? { ...P.applicant } : { org: PARAMS.get('org') || '' });
  // Plain free text: no pick list or suggestions to maintain (Brian, Oct 2026).
  const orgField = `<input id="org" type="text" value="${esc(a.org)}" autocomplete="organization" placeholder="For example, University of Central Florida">`;
  view().innerHTML = `<div class="panel intro"><p class="sect">Applicant</p><h2 class="q">A few details first</h2>
    ${prefillNote()}
    <p>Answer based on what has actually happened so far, not what is planned.</p>
    <div class="row2">
      <div class="field"><label class="f" for="first">First name</label><input id="first" type="text" value="${esc(a.first)}" autocomplete="given-name"></div>
      <div class="field"><label class="f" for="last">Last name</label><input id="last" type="text" value="${esc(a.last)}" autocomplete="family-name"></div>
    </div>
    ${A.lockedEmail
      ? `<div class="field"><label class="f" for="email">Email</label><input id="email" type="email" value="${esc(A.lockedEmail)}" readonly aria-readonly="true"><p class="hint">This is the email on file for your earlier submissions, so it stays the same. To use a different email, start a new submission instead.</p></div>`
      : `<div class="field"><label class="f" for="email">Email</label><input id="email" type="email" value="${esc(a.email)}" autocomplete="email"><p class="hint">We send your return code here, so you can pick up from these answers next time.</p></div>`}
    <div class="field"><label class="f" for="org">University or organization</label>${orgField}</div>
    <div class="field"><label class="f">Your role on the project</label>${seg(a, 'role', ['Faculty or PI', 'Co-investigator', 'Postdoc', 'Grad student', 'Founder from outside the university', 'Other'])}</div>
    <div class="field"><label class="f" for="linkedin">Your LinkedIn or professional profile <span class="opt-tag">optional</span></label><input id="linkedin" type="url" value="${esc(a.linkedin)}" placeholder="https://"><p class="hint">You can list the rest of the team in Part 2.</p></div>
    <div class="actions"><button class="btn" id="go">Continue</button><span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const o = Object.assign({}, a);
    delete o.phone; delete o.ext;   // no longer asked (gen-3.0)
    ['first', 'last', 'email', 'linkedin'].forEach(f => { o[f] = $(f).value.trim(); });
    if (A.lockedEmail) o.email = A.lockedEmail;
    o.org = $('org').value.trim();
    return o;
  };
  wireSegs(read, o => { A._applicant = o; }, renderApplicant);
  $('go').onclick = () => {
    const o = read();
    A._applicant = o;
    if (o.email && !EMAIL_RE.test(o.email)) return err('Enter a valid email address.');
    if (o.linkedin && !URL_RE.test(o.linkedin)) return err('Profile links start with http:// or https://.');
    delete A._applicant;
    A.applicant = o;
    finish('applicant', missingRequired('applicant', o));
  };
}

/* ----- 2. Project ----- */
function renderProject() {
  const p = A._project || (P && P.project ? { ...P.project } : {});
  view().innerHTML = `<div class="panel"><p class="sect">Project</p><h2 class="q">About the project</h2>
    <div class="field"><label class="f" for="ptitle">Project or technology title</label><input id="ptitle" type="text" value="${esc(p.title)}"><p class="hint">No company yet? Use the name you call the project, or a few words describing the technology.</p></div>
    <div class="field"><label class="f" for="oneLiner">In one sentence, what is it and who is it for?</label>
      <textarea id="oneLiner" class="short" rows="2" placeholder="For example: A low-cost sensor that warns utilities before transformers overheat.">${esc(p.oneLiner)}</textarea>
      ${wordHint('oneLiner', p.oneLiner)}</div>
    <div class="field"><label class="f">What form does the technology take?</label>${seg(p, 'form', FORMS)}</div>
    <div class="field"><label class="f">Has a company been legally formed (incorporated or registered as an LLC)?</label>${seg(p, 'company', ['Yes', 'No', 'Not sure'])}</div>
    ${p.company === 'Yes' ? `<div class="field"><label class="f" for="companyName">Company name and state where it was formed</label><input id="companyName" type="text" value="${esc(p.companyName)}"></div>` : ''}
    <div class="field"><label class="f" for="started">What year did work on this start?</label>${selectHtml('started-pick', yearOptions(), p.started, 'Choose a year').replace('<select ', '<select id="started" ')}</div>
    <div class="field"><label class="f">How many different applications or markets are you considering for the technology?</label>${seg(p, 'appCount', APP_COUNTS)}</div>
    <div class="field"><label class="f">I-Corps</label>${helpHtml('icorps', ICORPS_HELP)}${seg(p, 'icorps', ICORPS)}</div>
    <div class="field"><label class="f" for="website">Website <span class="opt-tag">optional</span></label><input id="website" type="url" value="${esc(p.website)}" placeholder="https://"></div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const o = Object.assign({}, p);
    delete o.companyType;   // no longer asked (gen-3.0)
    o.title = $('ptitle').value.trim();
    o.oneLiner = $('oneLiner').value;
    o.website = $('website').value.trim();
    o.started = $('started').value;
    if ($('companyName')) o.companyName = $('companyName').value.trim();
    return o;
  };
  wireSegs(read, o => { if (o.company !== 'Yes') delete o.companyName; A._project = o; }, renderProject);
  wireWordCount('oneLiner', () => { A._project = read(); saveDraft(); });
  $('started').onchange = () => { A._project = read(); saveDraft(); };
  wireHelp();
  $('go').onclick = () => {
    const o = read();
    A._project = o;
    o.oneLiner = o.oneLiner.trim().replace(/\s+/g, ' ');
    if (wordNote('oneLiner', o.oneLiner).block) return err('Please shorten the one-sentence description.');
    if (o.website && !URL_RE.test(o.website)) return err('Websites start with http:// or https://.');
    delete A._project;
    A.project = o;
    finish('project', missingRequired('project', o));
  };
  wireBack();
}

/* ----- word limits (the one-liner here; the Part 2 written answers below) ----- */
function wordNote(k, text) {
  const limit = CFG.wordLimits[k], n = words(text);
  const blockAt = (CFG.wordLimitBlockAt || {})[k] || Math.floor(limit * CFG.wordLimitBlockFactor);
  const over = n > limit, block = n > blockAt;
  return { n, limit, over, block, html: `${n} / ${limit} words${block ? ' — please shorten this answer' : over ? ' — a little over the limit' : ''}` };
}
const wcClass = w => 'hint wc' + (w.block ? ' block' : w.over ? ' over' : '');
function wordHint(k, text) {
  const w = wordNote(k, text);
  return `<p class="${wcClass(w)}" id="wc_${k}">${w.html}</p>`;
}
/* live word count under a text box; the count element is wc_{k} */
function wireWordCount(k, onChange, inputId = k) {
  $(inputId).oninput = () => {
    const w = wordNote(k, $(inputId).value), el = $('wc_' + k);
    el.textContent = w.html;
    el.className = wcClass(w);
    onChange();
  };
}
/* ----- 4. You and the project ----- */
function renderFounder() {
  // On a re-take the time questions are asked fresh: last time's answers go stale.
  const o = A._founder || (P && P.founder ? { ...P.founder, spent: undefined, engagement: undefined, conflicts: undefined } : {});
  const roles = ROLE_OPTIONS[o.outcome];
  const eng = CFG.engagement;
  view().innerHTML = `<div class="panel"><p class="sect">You and the project</p><h2 class="q">About you and why you're doing this</h2>
    <p class="hint lead">Filling this out for someone else? Answer for the person who leads the project.</p>
    <div class="field"><label class="f">What's the main reason you want to take this beyond the lab?</label>${seg(o, 'why', ['I want to see it used', 'I want to build a company', 'My funding or department expects it', 'A company or customer asked for it', 'Not sure yet'])}</div>
    <div class="field"><label class="f">What outcome do you want for this technology?</label>${seg(o, 'outcome', OUTCOMES)}</div>
    ${roles ? `<div class="field"><label class="f">If a company forms, what role do you want?</label>${seg(o, 'role', roles)}</div>` : ''}
    <div class="field"><label class="f">In the last three months, have you spent time on this outside your research duties?</label>${seg(o, 'spent', ['Yes', 'No'])}</div>
    <div class="field"><label class="f">How many hours a week can you put toward this over the next six months?</label>${seg(o, 'hours', HOURS)}</div>
    <div class="field"><label class="f">Does anyone plan to work on this full time?</label>${seg(o, 'fullTime', FULL_TIME)}</div>
    ${eng ? `<div class="field"><label class="f">Can the project lead take part in a structured engagement of about ${esc(eng.hoursPerWeek)} hours a week for ${esc(eng.months)} months?</label>${seg(o, 'engagement', ['Yes', 'No', 'Not sure'])}
      ${['No', 'Not sure'].includes(o.engagement) ? `<label class="f" for="conflicts" style="margin-top:12px">Note any sabbatical, leave, or other conflicts <span class="opt-tag">optional</span></label><input id="conflicts" type="text" value="${esc(o.conflicts)}">` : ''}</div>` : ''}
    <div class="field"><label class="f">Prior experience <span class="opt-tag">optional, check all that apply</span></label>${checks('prior', PRIOR_EXPERIENCE, o.prior)}
      <input id="priorDetail" type="text" placeholder="Details, including anything under Other (optional)" value="${esc(o.priorDetail)}">
      <p class="hint">Leave these blank if none apply.</p></div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const x = Object.assign({}, o);
    // asked in Part 2 since gen-3.0 ("Your perspective")
    delete x.whyText; delete x.changed; delete x.nothing;
    x.priorDetail = $('priorDetail').value;
    x.prior = readChecks('prior');
    if ($('conflicts')) x.conflicts = $('conflicts').value;
    return x;
  };
  wireSegs(read, x => {
    // a role that the chosen outcome doesn't offer is cleared
    if (!(ROLE_OPTIONS[x.outcome] || []).includes(x.role)) delete x.role;
    if (!['No', 'Not sure'].includes(x.engagement)) delete x.conflicts;
    A._founder = x;
  }, renderFounder);
  view().querySelectorAll('.checks[data-name="prior"] input').forEach(c => {
    c.onchange = () => { A._founder = read(); saveDraft(); };
  });
  $('go').onclick = () => {
    const x = read();
    A._founder = x;
    if (!(ROLE_OPTIONS[x.outcome] || []).includes(x.role)) delete x.role;
    x.priorDetail = (x.priorDetail || '').trim();
    if (x.conflicts) x.conflicts = x.conflicts.trim();
    delete A._founder;
    A.founder = x;
    finish('founder', missingRequired('founder', x, { config: CFG }));
  };
  wireBack();
}

/* ----- Technology stage ----- */
function renderTech() {
  const opts = trlOptions(A);
  // The test description is asked on the evidence screen, and facilities in
  // Part 2, so picking a higher stage never adds a question here (gen-3.0).
  const t = A._tech || (P && P.stage != null
    ? { stage: P.stage, unsure: !!(P.unsure && P.unsure.tech) }
    : { stage: null, unsure: false });
  const note = (TRL_TRACK_CONTENT[TRACK_KEY[track(A)]] || {}).sourceNote || '';
  view().innerHTML = `<div class="panel"><p class="sect">Technology</p>
    <h2 class="q">What is the furthest your technology has gotten?</h2><p class="hint lead">Pick the furthest point reached. Each step includes the ones above it.</p>
    ${track(A) === 'Therapeutics' ? `<p class="hint">${helpHtml('glp', GLP_GMP_HELP)}</p>` : ''}
    <div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}" aria-pressed="${t.stage === i}"><span class="k">${i}</span><span class="opt-text"><strong>${esc(o.title)}</strong>${o.desc ? `<span class="opt-desc">${esc(o.desc)}</span>` : ''}</span></button>`).join('')}</div>
    ${note ? `<p class="hint source-note">${esc(note)}</p>` : ''}
    <label class="chk"><input type="checkbox" id="tu" ${t.unsure ? 'checked' : ''}><span>I'm not sure about this one</span></label>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  view().querySelectorAll('.opt').forEach(b => {
    b.onclick = () => { t.stage = +b.dataset.i; A._tech = t; saveDraft(); renderTech(); };
  });
  $('tu').onchange = () => { t.unsure = $('tu').checked; A._tech = t; };
  $('go').onclick = () => {
    const missing = missingRequired('tech', { stage: t.stage });
    delete A._tech;
    A.stage = t.stage;
    if (t.unsure) A.unsure.tech = true;
    finish('tech', missing);
  };
  wireHelp();
  wireBack();
}

/* ----- checklist screens (Customers, Plans, IP, Team, Funding, Regulatory, Traction) ----- */
function renderMulti(sc) {
  const m = M();
  const { C } = m;
  const pre = new Set(sc.items.filter(it => C[it.k] === true).map(it => it.k));

  // drop user picks whose prerequisites are no longer checked
  const prune = L => {
    let ch = true;
    while (ch) {
      ch = false;
      const e = closeSet([...pre, ...L.user]);
      const keepK = L.user.filter(k => { const it = sc.items.find(i => i.k === k); return pre.has(k) || m.itemVisible(it, e); });
      if (keepK.length !== L.user.length) { L.user = keepK; ch = true; }
    }
  };

  A._locals = A._locals || {};
  let L = A._locals[sc.id];
  if (!L) {
    L = A._locals[sc.id] = { id: sc.id, user: [], unsure: false };
    if (P && P.F) {
      // Re-take: start from last time's checks (only the ones the applicant
      // ticked, not ones that were counted from other answers).
      L.user = sc.items.filter(it => P.F[it.k] === true && !(P.I && it.k in P.I) && !pre.has(it.k)).map(it => it.k);
      if (sc.id === 'cust' && P.problem && typeof P.problem.known === 'boolean') L.known = P.problem.known ? 'Yes' : 'Not yet';
      L.unsure = !!(P.unsure && P.unsure[sc.id]);
      prune(L);
    }
  }

  const eff = closeSet([...pre, ...L.user]);
  const vis = sc.items.filter(it => pre.has(it.k) || m.itemVisible(it, eff));
  // Ticking a box never adds a question to this page (gen-3.0): details,
  // sources, and the interview count are asked on the evidence screen.
  const row = it => {
    const on = eff.has(it.k), userOn = L.user.includes(it.k), locked = on && !userOn;
    const note = pre.has(it.k) ? 'Covered by an earlier answer' : locked ? 'Included by another item you checked' : '';
    return `<div class="item${on ? ' on' : ''}"><label class="chk"><input type="checkbox" data-k="${it.k}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${esc(displayText(itemLabel(it.k, A), sc.id, A))}${note ? `<span class="lock">${note}</span>` : ''}</span></label>${helpHtml(it.k, it.help)}</div>`;
  };
  // Customers first asks outright whether specific customers are identified
  // (Market 1 and Product 1): never inferred from an unticked box.
  const known = sc.id === 'cust'
    ? `<div class="field known"><p class="f">${esc(displayText(CUSTOMERS_KNOWN_Q, sc.id, A))}</p>${seg(L, 'known', CUSTOMERS_KNOWN)}</div>`
    : '';
  view().innerHTML = `<div class="panel"><p class="sect">${esc(sc.sect)}</p>${known}<h2 class="q">${esc(displayText(sc.q, sc.id, A))}</h2><p class="hint lead">Check all that apply. Leave the rest blank.</p>
    <div class="items">${vis.map(row).join('')}</div>
    <label class="chk unsure"><input type="checkbox" id="un" ${L.unsure ? 'checked' : ''}><span>I'm not sure about some of these</span></label>
    <div class="actions"><button class="btn" id="go">${vis.some(it => eff.has(it.k)) ? 'Continue' : 'None of these, continue'}</button>${backLink()}<span class="status err" id="err"></span></div></div>`;

  view().querySelectorAll('.seg[data-name="known"] button').forEach(b => {
    b.onclick = () => { L.known = b.textContent; saveDraft(); renderMulti(sc); };
  });
  view().querySelectorAll('.items input[data-k]').forEach(x => {
    x.onchange = () => {
      const k = x.dataset.k;
      L.user = x.checked ? L.user.concat(k) : L.user.filter(u => u !== k);
      prune(L);
      saveDraft();
      renderMulti(sc);
    };
  });
  $('un').onchange = () => { L.unsure = $('un').checked; };
  $('go').onclick = () => {
    const eff2 = closeSet([...pre, ...L.user]);
    const vis2 = sc.items.filter(it => pre.has(it.k) || m.itemVisible(it, eff2));
    const missing = missingRequired(sc.id, { known: L.known });
    const by0 = m.by;
    A.I = A.I || {};
    // gen-3.2: drop an answer to an item the current technology form doesn't ask
    // (Product 5 differs on the health tracks), so a changed form can't leave it counting.
    sc.items.forEach(it => { if (!trackAllows(it, A)) { delete A.F[it.k]; delete A.I[it.k]; } });
    vis2.forEach(it => {
      A.F[it.k] = eff2.has(it.k);
      if (eff2.has(it.k) && !L.user.includes(it.k)) {
        const src = pre.has(it.k) ? by0[it.k] : L.user.find(u => closeSet([u]).has(it.k));
        A.I[it.k] = src || '';
      }
    });
    if (sc.id === 'cust') {
      if (L.known) A.problem = { known: L.known === 'Yes' }; else delete A.problem;
    }
    if (L.unsure) A.unsure[sc.id] = true;
    finish(sc.id, missing);
  };
  wireHelp();
  wireBack();
}

/* ----- About your evidence: every follow-up to a ticked box (gen-3.0) ----- */
// Each question repeats the claim it backs up. Required: a short phrase for a
// claim that unlocks a level. Optional: numbers that need looking up.
function renderEvidence() {
  const items = evidenceItems(A);
  if (!A._evidence) {
    const from = P || {};
    A._evidence = {
      ev: Object.assign({}, from.E || {}, A.E || {}),
      src: JSON.parse(JSON.stringify(Object.assign({}, from.src || {}, A.src || {}))),
      count: A.count != null ? String(A.count) : (from.count != null ? String(from.count) : ''),
      confirm: A.confirm || from.confirm || null,
      techEv: A.techEv || from.techEv || ''
    };
  }
  const L = A._evidence;
  L.ev = L.ev || {}; L.src = L.src || {};
  const interviews = () => {
    const n = Number(L.count);
    return L.count === '' || L.count == null || !(n > 0) ? 0 : Math.floor(n);
  };
  const saidLabel = n => n ? `How many of the ${n} people you interviewed said this?` : 'How many people said this?';
  const youSaid = (text, screenId) => `<p class="you-said">You said: "${esc(displayText(text, screenId, A))}"</p>`;
  const optTag = '<span class="opt-tag">optional: add it now if you have it handy, or send it later</span>';

  const sourceBlock = k => {
    const s = L.src[k] || {}, from = s.from || [], n = interviews();
    const said = from.includes(CONVERSATIONS)
      ? `<label class="f" for="said_${k}" style="margin-top:10px">${saidLabel(n)}</label>
         <input type="number" id="said_${k}" class="said" min="0" ${n ? `max="${n}"` : ''} step="1" inputmode="numeric" value="${esc(s.said == null ? '' : s.said)}" style="max-width:140px">`
      : '';
    return `<div class="ev-item">${youSaid(LABEL_OF(k), screenOf(k))}
      <label class="f">Where does this come from? <span class="opt-tag">pick all that apply</span></label>
      ${checks('src_' + k, SOURCES, from)}${said}</div>`;
  };
  const detailBlock = d => `<div class="ev-item">${youSaid(d.label, d.screen)}
    <label class="f" for="ev_${d.k}">${esc(d.ev)} ${d.optional ? optTag : ''}</label>
    <input type="text" id="ev_${d.k}" value="${esc(L.ev[d.k] || '')}"></div>`;

  const custDetails = items.details.filter(d => d.screen === 'cust');
  const otherDetails = items.details.filter(d => d.screen !== 'cust');
  const n = interviews();
  const discovery = items.count || items.sources.length || custDetails.length
    ? `<h3 class="ev-head">Customers</h3>
      ${items.count ? `<div class="ev-item">${youSaid(LABEL_OF('c_talk'), 'cust')}
        <label class="f" for="cnt">How many potential customers or users outside your university have you interviewed?</label>
        <input type="number" id="cnt" min="0" step="1" inputmode="numeric" value="${esc(L.count)}" style="max-width:140px">
        ${n > 0 ? `<p class="f" style="margin:12px 0 6px;font-weight:500">Did most of them confirm the problem is real and happens often?</p>${seg(L, 'confirm', ['Yes', 'No', 'Not sure'])}` : ''}</div>` : ''}
      ${items.sources.map(sourceBlock).join('')}
      ${custDetails.map(detailBlock).join('')}`
    : '';
  const tech = items.techEv
    ? `<h3 class="ev-head">Technology</h3><div class="ev-item">${youSaid(trlOptions(A)[A.stage].title, 'tech')}
      <label class="f" for="tev">Describe the most advanced test or use so far: what was tested, where, and with whom.${items.techEv === 'optional' ? ' <span class="opt-tag">optional once you name who used the prototype</span>' : ''}</label>
      <textarea id="tev">${esc(L.techEv)}</textarea></div>`
    : '';
  const others = otherDetails.length ? `<h3 class="ev-head">Other details</h3>${otherDetails.map(detailBlock).join('')}` : '';

  view().innerHTML = `<div class="panel"><p class="sect">About your evidence</p><h2 class="q">A few details about what you told us</h2>
    <p class="hint lead">These back up what you checked. The optional ones you can add now if you have them handy, or send later.</p>
    ${discovery}${tech}${others}
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;

  const keep = () => {
    items.details.forEach(d => { const e = $('ev_' + d.k); if (e) L.ev[d.k] = e.value; });
    items.sources.forEach(k => {
      const s = L.src[k] = L.src[k] || {};
      s.from = readChecks('src_' + k);
      const said = $('said_' + k);
      if (said) s.said = said.value === '' ? null : Number(said.value); else delete s.said;
    });
    if ($('cnt')) L.count = $('cnt').value;
    if ($('tev')) L.techEv = $('tev').value;
  };
  // source picks: "Not sure" is exclusive; picking conversations shows the count
  items.sources.forEach(k => wireExclusive('src_' + k, SOURCE_NOT_SURE, () => { keep(); saveDraft(); renderEvidence(); }));
  view().querySelectorAll('.ev-item input[type=text], .said, #tev').forEach(x => { x.oninput = () => { keep(); saveDraft(); }; });
  if ($('cnt')) {
    $('cnt').oninput = () => {
      const before = interviews() > 0;
      keep();
      saveDraft();
      if ((interviews() > 0) !== before) { renderEvidence(); $('cnt').focus(); return; }
      // the "of N" wording under each conclusion follows the count, in place
      const now = interviews();
      items.sources.forEach(k => {
        const said = $('said_' + k);
        if (!said) return;
        view().querySelector(`label[for="said_${k}"]`).textContent = saidLabel(now);
        if (now) said.max = now; else said.removeAttribute('max');
      });
    };
  }
  view().querySelectorAll('.seg[data-name="confirm"] button').forEach(b => { b.onclick = () => { keep(); L.confirm = b.textContent; saveDraft(); renderEvidence(); }; });
  $('go').onclick = () => {
    keep();
    // Wrong answers stop here; missing ones are allowed and marked (see finish()).
    if (items.count && L.count !== '' && !(Number(L.count) >= 0)) return err('Enter how many people you have interviewed, as a number.');
    const count = interviews();
    for (const k of items.sources) {
      const s = L.src[k];
      if (!s || s.said == null) continue;
      if (!(s.said >= 0)) return err('Enter how many people said it, as a number.');
      if (count && s.said > count) return err('The number who said it can\'t be more than the ' + count + ' people you interviewed.');
    }
    const missing = missingRequired('evidence', { items, ev: L.ev, src: L.src, count: L.count, confirm: L.confirm, techEv: L.techEv });
    // Keep only what is asked now: an unticked claim takes its detail with it.
    A.E = {};
    items.details.forEach(d => { const t = (L.ev[d.k] || '').trim(); if (t) A.E[d.k] = t; });
    A.src = {};
    items.sources.forEach(k => {
      const s = L.src[k];
      if (!s || !(s.from || []).length) return;
      A.src[k] = { from: s.from.slice() };
      if (s.from.includes(CONVERSATIONS) && s.said != null) A.src[k].said = Math.floor(s.said);
    });
    delete A.count; delete A.confirm; delete A.techEv;
    if (items.count) {
      if (L.count !== '') A.count = Math.floor(Number(L.count));
      if (count > 0 && L.confirm) A.confirm = L.confirm;
    }
    if (items.techEv && (L.techEv || '').trim()) A.techEv = L.techEv.trim();
    delete A.evidenceSkipped;
    delete A._evidence;
    finish('evidence', missing);
  };
  wireBack();
}
const LABEL_OF = k => itemLabel(k, A) || k;
const screenOf = k => (SCREENS.find(s => (s.items || []).some(it => it.k === k)) || {}).id;

/* ----- Save Part 1: two quick picks, the handling text, then straight on to Part 2 ----- */
function renderConsent() {
  const c = A._consent || {
    help: P && P.consent && P.consent.help ? [...P.consent.help] : [],
    completedWith: P && P.consent ? P.consent.completedWith : undefined,
    ack: false,
    aiOptOut: !!(P && P.consent && P.consent.aiOptOut)
  };
  const h = CFG.submissionHandling;
  const t2 = (CFG.estimatedTime || {}).part2;
  view().innerHTML = `<div class="panel"><p class="sect">Save Part 1</p><h2 class="q">Two quick questions, then on to Part 2</h2>
    <div class="field"><label class="f">What would help most right now? <span class="opt-tag">check all that apply</span></label>${checks('help', HELP, c.help)}</div>
    <div class="field"><label class="f">Did anyone help you fill this in? <span class="opt-tag">optional</span></label>${seg(c, 'completedWith', COMPLETED_WITH)}</div>
    <div class="handling"><h3>${esc(h.heading)}</h3>${h.paragraphs.map(x => `<p>${esc(x)}</p>`).join('')}
      <label class="chk"><input type="checkbox" id="ack" ${c.ack ? 'checked' : ''}><span>${esc(h.ackLabel)} <span class="opt-tag">required</span></span></label>
      <label class="chk"><input type="checkbox" id="optout" ${c.aiOptOut ? 'checked' : ''}><span>${esc(h.optOutLabel)} <span class="opt-tag">optional</span></span></label></div>
    <div class="hp" aria-hidden="true"><label for="company_fax">Leave this field empty</label><input type="text" id="company_fax" name="company_fax" tabindex="-1" autocomplete="off" value="${esc(HP)}"></div>
    <p class="hint">Next is Part 2, the last part: the technology and where it could be used, in your own words${t2 ? ` (${esc(t2)})` : ''}. We'll save Part 1 first, so nothing is lost if you need to stop.</p>
    <div class="actions"><button class="btn" id="go">${incompleteScreens().length ? 'Continue' : 'Save and continue to Part 2'}</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => ({ help: readChecks('help'), completedWith: c.completedWith, ack: $('ack').checked, aiOptOut: $('optout').checked });
  view().querySelectorAll('input[type=checkbox]').forEach(x => { x.onchange = () => { A._consent = read(); saveDraft(); }; });
  wireSegs(read, o => { A._consent = o; }, renderConsent);
  $('company_fax').oninput = () => { HP = $('company_fax').value; };
  $('go').onclick = () => {
    const x = read();
    A._consent = x;
    // The acknowledgment blocks even under skip-ahead: nothing is stored without it.
    if (!x.ack) return err('Please confirm you\'ve read how NobleReach handles your submission.');
    HP = $('company_fax').value;
    delete A._consent;
    A.consent = x;
    finish('consent', missingRequired('consent', x));
  };
  wireBack();
}

/* ----- Part 2: the technology and its applications ----- */
function renderWritten() {
  const w = A._written || (P && P.written ? JSON.parse(JSON.stringify(P.written)) : { nsRelevance: [] });
  w.nsRelevance = w.nsRelevance || [];
  const W = CFG.written;
  const box = (k, rows) => `<div class="field"><label class="f" for="wr_${k}">${esc(W[k].q)}</label>
      <p class="hint cover-intro">Cover:</p><ul class="cover">${W[k].cover.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <textarea id="wr_${k}" class="essay" rows="${rows}">${esc(w[k])}</textarea>
      ${wordHint(k, w[k])}</div>`;
  view().innerHTML = `<div class="panel"><p class="sect">The technology and its applications</p>${part2Intro()}<h2 class="q">In your own words</h2>
    ${prefillNote()}
    ${box('technology', 9)}
    ${box('applications', 7)}
    <div class="field"><label class="f">Where could the technology be used? <span class="opt-tag">optional, check all that apply</span></label>${checks('ns', NS_RELEVANCE, w.nsRelevance)}</div>
    <div class="field"><label class="f" for="wr_impact">${esc(W.impact)} <span class="opt-tag">optional</span></label>
      <textarea id="wr_impact" class="short" rows="2">${esc(w.impact)}</textarea>${wordHint('impact', w.impact)}</div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}${laterLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => ({
    technology: $('wr_technology').value, applications: $('wr_applications').value,
    impact: $('wr_impact').value, nsRelevance: readChecks('ns')
  });
  ['technology', 'applications', 'impact'].forEach(k => wireWordCount(k, () => { A._written = read(); saveDraft(); }, 'wr_' + k));
  wireExclusive('ns', NOT_SURE_YET, () => { A._written = read(); saveDraft(); });
  $('go').onclick = () => {
    const o = read();
    A._written = o;
    if (['technology', 'applications', 'impact'].some(k => wordNote(k, o[k]).block)) return err('Please shorten the answers marked in red.');
    ['technology', 'applications', 'impact'].forEach(k => { o[k] = o[k].trim(); });
    delete A._written;
    A.written = o;
    delete meta.part2Intro;
    finish('written', missingRequired('written', o));
  };
  wireBack();
}

/* ----- Part 2: your perspective (why now, what changed, collaborators) ----- */
function renderPerspective() {
  const o = A._perspective || (P && P.perspective ? { ...P.perspective } : {});
  view().innerHTML = `<div class="panel"><p class="sect">Your perspective</p><h2 class="q">A little about how you see it</h2>
    <div class="field"><label class="f" for="whyText">In a sentence: why this, and why now?</label>
      <textarea id="whyText" class="short" rows="2">${esc(o.whyText)}</textarea>${wordHint('whyText', o.whyText)}</div>
    <div class="field"><label class="f" for="changed">Describe one thing you changed in the technology or plan because of what a customer, mentor, or reviewer told you.</label>
      <textarea id="changed" class="short" rows="3" ${o.nothing ? 'disabled' : ''}>${esc(o.changed)}</textarea>${wordHint('changed', o.changed)}
      <label class="chk"><input type="checkbox" id="nothing" ${o.nothing ? 'checked' : ''}><span>Nothing yet</span></label></div>
    <div class="field"><label class="f" for="collaborators">Key collaborators or industry partners, if any. <span class="opt-tag">optional</span></label>
      <textarea id="collaborators" class="short" rows="2">${esc(o.collaborators)}</textarea>${wordHint('collaborators', o.collaborators)}</div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}${laterLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => ({ whyText: $('whyText').value, changed: $('changed').value, nothing: $('nothing').checked, collaborators: $('collaborators').value });
  ['whyText', 'changed', 'collaborators'].forEach(k => wireWordCount(k, () => { A._perspective = read(); saveDraft(); }));
  $('nothing').onchange = () => { A._perspective = read(); renderPerspective(); };
  $('go').onclick = () => {
    const x = read();
    A._perspective = x;
    if (['whyText', 'changed', 'collaborators'].some(k => wordNote(k, x[k]).block)) return err('Please shorten the answers marked in red.');
    x.whyText = x.whyText.trim();
    x.changed = x.nothing ? '' : x.changed.trim();
    x.collaborators = x.collaborators.trim();
    delete A._perspective;
    A.perspective = x;
    finish('perspective', missingRequired('perspective', x));
  };
  wireBack();
}

/* ----- Part 2: who's involved (the roster, and facilities for physical work) ----- */
function renderPeople() {
  const L = A._people = A._people || {
    roster: P && P.team ? JSON.parse(JSON.stringify(P.team)) : [],
    facilities: (P && P.facilities) || ''
  };
  view().innerHTML = `<div class="panel"><p class="sect">Who's involved</p><h2 class="q">The people and resources behind it</h2>
    ${rosterHtml(L.roster)}
    ${hasFacilities(A) ? `<div class="field"><label class="f" for="fac">Facilities and equipment for prototype development or validation, and how you'll access any you don't have. <span class="opt-tag">optional</span></label><textarea id="fac">${esc(L.facilities)}</textarea></div>` : ''}
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}${laterLink()}<span class="status err" id="err"></span></div></div>`;
  const keep = () => { L.roster = readRoster(); if ($('fac')) L.facilities = $('fac').value; };
  wireRoster(L, keep, renderPeople);
  if ($('fac')) $('fac').oninput = () => { keep(); saveDraft(); };
  $('go').onclick = () => {
    keep();
    const roster = L.roster.map(p => ({ name: (p.name || '').trim(), role: p.role || '', time: p.time || '', link: (p.link || '').trim(), expertise: (p.expertise || '').trim() }))
      .filter(p => p.name || p.role || p.time || p.link || p.expertise);
    if (roster.some(p => p.link && !URL_RE.test(p.link))) return err('Profile links start with http:// or https://.');
    const missing = missingRequired('people', { roster });
    A.team = roster;
    A.facilities = hasFacilities(A) ? (L.facilities || '').trim() : '';
    delete A._people;
    finish('people', missing);
  };
  wireBack();
}

/* ----- team roster (Who's involved; optional) ----- */
function rosterHtml(roster) {
  // An earlier submission's free-text team list, so it can be re-entered here.
  const legacy = P && !P.team && P.applicant && P.applicant.team;
  return `<div class="field roster"><label class="f">Who is working on this? <span class="opt-tag">optional</span></label>
    <p class="hint">List the other people on the team. Don't include yourself.</p>
    ${legacy ? `<p class="note">Last time you listed: ${esc(legacy)}</p>` : ''}
    ${roster.map((p, i) => `<div class="person" data-i="${i}">
      <input type="text" class="r-name" value="${esc(p.name)}" placeholder="Name" aria-label="Name">
      ${selectHtml('r-role', ROSTER_ROLES, p.role, 'Role')}
      ${selectHtml('r-time', ROSTER_TIME, p.time, 'Time')}
      <input type="url" class="r-link" value="${esc(p.link)}" placeholder="LinkedIn or profile link (optional)" aria-label="LinkedIn or profile link (optional)">
      <input type="text" class="r-exp" value="${esc(p.expertise)}" placeholder="Expertise (optional)" aria-label="Expertise (optional)">
      <button type="button" class="linkish r-remove">Remove</button>
    </div>`).join('')}
    <button type="button" class="btn ghost small" id="add-person">Add a person</button></div>`;
}
function readRoster() {
  return [...view().querySelectorAll('.roster .person')].map(el => ({
    name: el.querySelector('.r-name').value, role: el.querySelector('.r-role').value, time: el.querySelector('.r-time').value,
    link: el.querySelector('.r-link').value, expertise: el.querySelector('.r-exp').value
  }));
}
function wireRoster(L, keep, rerender) {
  view().querySelectorAll('.roster input, .roster select').forEach(x => { x.oninput = x.onchange = () => { keep(); saveDraft(); }; });
  view().querySelectorAll('.roster .r-remove').forEach(b => {
    b.onclick = () => { keep(); L.roster.splice(+b.closest('.person').dataset.i, 1); saveDraft(); rerender(); };
  });
  $('add-person').onclick = () => {
    keep(); L.roster.push({}); saveDraft(); rerender();
    const rows = view().querySelectorAll('.roster .r-name');
    rows[rows.length - 1].focus();
  };
}

/* ----- Part 2: materials and submit ----- */
function renderMaterials() {
  const mt = A._materials || { anythingElse: '' };
  // Re-take: links from last time carry over (files were attached to the earlier row).
  if (!A._materials && P && P.uploads && !A.linksCarried) {
    A.linksCarried = true;
    const pu = P.uploads;
    if (pu.deck && pu.deck.link && !slotValue('deck', 0)) setSlot('deck', 0, { link: pu.deck.link });
    if (pu.plan && pu.plan.link && !slotValue('plan', 0)) setSlot('plan', 0, { link: pu.plan.link });
    (pu.supporting || []).forEach((x, i) => { if (x && x.link && !slotValue('supporting', i)) setSlot('supporting', i, { link: x.link }); });
  }
  // The plan or canvas slot, for applicants who said they have one written down.
  const planAsked = A.F.d_bmc === true || A.F.d_plan === true;
  if (!planAsked && slotValue('plan', 0)) setSlot('plan', 0, null);
  view().innerHTML = `<div class="panel"><p class="sect">Materials and submit</p><h2 class="q">Last, add any materials and submit</h2>
    <div class="field"><label class="f">Pitch deck <span class="opt-tag">optional</span></label>${slotHtml('deck', 0)}</div>
    ${planAsked ? `<div class="field"><label class="f">Business plan or canvas <span class="opt-tag">optional</span></label>${slotHtml('plan', 0)}</div>` : ''}
    <div class="field"><label class="f">Supporting materials <span class="opt-tag">optional, up to ${CFG.uploads.maxSupporting}</span></label>
      <p class="hint" style="margin:0 0 8px">Publications, white papers, prototype images, or videos. Files up to ${Math.round(CFG.uploads.maxBytes / 1048576)} MB; for anything bigger, share a link.</p>
      ${Array.from({ length: CFG.uploads.maxSupporting }, (_, i) => slotHtml('supporting', i)).join('')}</div>
    <div class="field"><label class="f" for="anythingElse">Anything else we should know? <span class="opt-tag">optional</span></label>
      <textarea id="anythingElse" rows="4">${esc(mt.anythingElse)}</textarea>
      ${wordHint('anythingElse', mt.anythingElse)}</div>
    <div class="actions"><button class="btn" id="go">${incompleteScreens().length ? 'Continue' : 'Submit application'}</button>${backLink()}${laterLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => ({ anythingElse: $('anythingElse').value });
  wireWordCount('anythingElse', () => { A._materials = read(); saveDraft(); });
  wireSlots(() => { A._materials = read(); renderMaterials(); });
  $('go').onclick = () => {
    const x = read();
    A._materials = x;
    if (wordNote('anythingElse', x.anythingElse).block) return err('Please shorten your note under "Anything else".');
    x.anythingElse = x.anythingElse.trim();
    const lost = [['deck', 0], ['plan', 0], ...Array.from({ length: CFG.uploads.maxSupporting }, (_, i) => ['supporting', i])].find(([s, i]) => fileMissing(s, i));
    if (lost) return err('Choose ' + SLOT_LABEL(lost[0], lost[1]).toLowerCase() + ' again, or remove it.');
    // Part 2 never changes levels (decision D-1), so a deck added here doesn't
    // tick "A pitch deck" on the Funding screen.
    delete A._materials;
    A.materials = x;
    finish('materials');
  };
  wireBack();
}

/* ----- before you save or submit: sections skipped with required answers missing ----- */
function renderReview() {
  const ids = incompleteScreens();
  const part1 = currentPart() === 1;
  view().innerHTML = `<div class="panel"><p class="sect">${part1 ? 'Before you save Part 1' : 'Before you submit'}</p>
    <h2 class="q">A few answers are still needed</h2>
    <p class="hint lead">You skipped some required questions. Finish them, and you'll be able to ${part1 ? 'save Part 1' : 'submit'}. Everything else you entered is saved.</p>
    <div class="review-list">${ids.map(id => `<div class="review-row">
      <div class="review-text"><strong>${esc(sectOf(id))}</strong><span>${A.missing[id].map(esc).join('; ')}</span></div>
      <button type="button" class="btn ghost small" data-goto="${id}">Go to</button></div>`).join('')}</div>
    <div class="actions"><button class="btn" id="finish-missing">Finish missing answers</button>${backLink()}</div></div>`;
  view().querySelectorAll('[data-goto]').forEach(b => { b.onclick = () => jumpTo(b.dataset.goto); });
  $('finish-missing').onclick = () => jumpTo(ids[0]);
  wireBack();
}

/* ----- save Part 1, or submit Part 2 ----- */
function renderSubmit() {
  const st = submitState, part1 = currentPart() === 1;
  const what = part1 ? 'Part 1' : 'your application';
  let body;
  if (st.status === 'expired') {
    // Part 2's row token ran out (14 days): a fresh one comes with the return code.
    body = `<p class="status err" role="status">This session for Part 2 has expired. Your answers are still saved on this device. Enter your return code to continue.</p>
      <div class="inline-fields"><input type="text" id="renew-code" placeholder="Return code" autocapitalize="characters" spellcheck="false" aria-label="Return code"></div>
      <p class="status err" id="err"></p>
      <div class="actions"><button class="btn" id="renew">Continue</button></div>`;
  } else {
    const msg = st.status === 'error'
      ? `We could not save ${what}: ${esc(st.message)}. Your answers are still saved on this device.`
      : `Saving ${what}...`;
    body = `<p class="status${st.status === 'error' ? ' err' : ''}" role="status">${msg}</p>
      <div class="actions">${st.status === 'error' ? '<button class="btn" id="retry">Try again</button>' : ''}${st.status === 'sending' ? '' : backLink()}</div>`;
  }
  view().innerHTML = `<div class="panel"><p class="sect">${part1 ? 'Saving Part 1' : 'Submitting'}</p><h2 class="q">${st.status === 'error' || st.status === 'expired' ? 'Not saved yet' : 'Saving your answers'}</h2>${body}</div>`;
  if ($('retry')) $('retry').onclick = () => { submitState = { status: 'idle' }; render(); };
  if ($('renew')) $('renew').onclick = renewRowToken;
  wireBack();
  if (st.status === 'idle') (part1 ? submitPart1 : submitPart2)();
}

async function renewRowToken() {
  const code = $('renew-code').value.trim();
  if (!code) return err('Enter your return code.');
  $('renew').disabled = true;
  try {
    const res = await lookupIntake({ email: A.applicant.email, code, submissionId: meta.submissionId });
    if (!res.success || !res.rowToken) {
      $('renew').disabled = false;
      return err(res.error || 'That code does not match our records.');
    }
    meta.rowToken = res.rowToken;
    saveDraft();
    submitState = { status: 'idle' };
    render();
  } catch (e) {
    if (e.unauthorized) return showLogin(e.message);
    $('renew').disabled = false;
    err('We could not reach the server. Check your connection and try again.');
  }
}

/* What a re-take started from, so the brief can show what moved (up or down). */
function previousScores() {
  return A.retake && P ? { scores: createModel(P).result().scores, submittedAt: meta.previous && meta.previous.submittedAt } : null;
}

/* Part 1: create the row with the facts, the levels, and the brief. */
async function submitPart1() {
  if (incompleteScreens().length) return render();   // never save with required answers missing
  submitState = { status: 'sending' };
  render();
  const submittedAt = new Date().toISOString();
  const result = createModel(A).result(H.length);
  const brief = buildBrief(A, result, CFG, { submissionId: meta.submissionId, submittedAt, previous: previousScores() });
  const record = buildRow(A, { screensAnswered: H.length, previousA: A.retake ? P : null, questions: brief.questions });
  const answers = {
    version: VERSION, part: 1, submissionId: meta.submissionId, submittedAt, A: cleanA(A), H: H.slice(),
    facts: result.facts, levels: result.scores, nextLevelNeeds: result.next,
    gateSignals: result.gateFlags, reviewFlags: result.flags, questionsForCall: brief.questions, timing: timingTotals()
  };
  try {
    const res = await submitIntake({
      submissionId: meta.submissionId,
      previousSubmissionId: (meta.previous && meta.previous.submissionId) || '',
      record, answers, briefHtml: brief.html, hp: HP
    });
    if (!res || !res.success) throw new Error((res && res.error) || 'Unknown error');
    meta.rowToken = res.rowToken;
    meta.part1 = { returnCode: res.returnCode, intakeNumber: res.intakeNumber, emailSent: !!res.emailSent, submittedAt };
    A.part1 = { submittedAt };
    invalidate();
    // Straight on to Part 2, with a short "Part 1 is saved" banner: no stop page,
    // so the default is to keep going (Brian, Oct 30, 2026).
    meta.part2Intro = true;
    submitState = { status: 'idle' };
    saveDraft();   // Part 2 continues from this draft, even after a reload
    render();
    window.scrollTo(0, 0);
  } catch (e) {
    if (e.unauthorized) { submitState = { status: 'idle' }; showLogin(e.message); return; }
    console.warn('[Intake] Part 1 save failed:', e);
    submitState = { status: 'error', message: e.name === 'AbortError' ? 'the server took too long to respond' : e.message };
    render();
  }
}

/* Part 2: add the written answers, materials, rebuilt brief, and QM summary to the same row. */
async function submitPart2() {
  if (incompleteScreens().length) return render();
  submitState = { status: 'sending' };
  render();
  const submittedAt = meta.part1.submittedAt;
  const part2At = new Date().toISOString();
  // Same levels as Part 1 (Part 2 answers score nothing); the brief adds their own words.
  const result = createModel(A).result(H.length);
  const brief = buildBrief(A, result, CFG, { submissionId: meta.submissionId, submittedAt, previous: previousScores() });
  const record = buildRow(A, { screensAnswered: H.length, previousA: A.retake ? P : null, questions: brief.questions });
  const finalA = cleanA(A);
  const answers = {
    version: VERSION, part: 2, submissionId: meta.submissionId, submittedAt, part2SubmittedAt: part2At, A: finalA, H: H.slice(),
    facts: result.facts, levels: result.scores, nextLevelNeeds: result.next,
    gateSignals: result.gateFlags, reviewFlags: result.flags, questionsForCall: brief.questions, timing: timingTotals()
  };
  const planned = plannedUploads();
  try {
    const res = await completeIntake({
      rowToken: meta.rowToken, record, answers, briefHtml: brief.html, uploads: planned,
      // No QM summary for applicants who opted out of AI processing.
      qmInput: A.consent && A.consent.aiOptOut ? undefined : buildQmInput(finalA, { submittedAt })
    });
    if (res && res.error === 'expired') { submitState = { status: 'expired' }; return render(); }
    if (!res || !res.success) throw new Error((res && res.error) || 'Unknown error');

    done = {
      submissionId: meta.submissionId,
      returnCode: meta.part1.returnCode,
      intakeNumber: meta.part1.intakeNumber,
      emailSent: meta.part1.emailSent,
      rowToken: meta.rowToken,
      name: [A.applicant.first, A.applicant.last].join(' '),
      first: A.applicant.first,
      email: A.applicant.email,
      institution: A.applicant.org,
      project: A.project.title,
      submittedAt: part2At,
      A: finalA,
      result,
      brief,
      previousAt: meta.previous ? meta.previous.submittedAt : null,
      diff: P && P.applicant ? diffFacts(P, finalA) : null,
      uploads: planned.filter(u => !u.link).map(u => ({ slot: u.slot, index: u.index, name: u.name, state: 'pending', error: '' }))
    };
    store(LAST_KEY, { submissionId: meta.submissionId, submittedAt: part2At, email: done.email, project: done.project, returnCode: done.returnCode, answers: finalA });
    clearDraft();
    phase = 'done';
    submitState = { status: 'idle' };
    render();
    window.scrollTo(0, 0);
    uploadAll();
  } catch (e) {
    if (e.unauthorized) { submitState = { status: 'idle' }; showLogin(e.message); return; }
    console.warn('[Intake] Part 2 submit failed:', e);
    submitState = { status: 'error', message: e.name === 'AbortError' ? 'the server took too long to respond' : e.message };
    render();
  }
}

/* Upload each file, one request per file, after the row exists. */
async function uploadAll() {
  for (const u of done.uploads) if (u.state !== 'done') await uploadOne(u);
}
async function uploadOne(u) {
  const file = FILES[u.slot][u.index];
  if (!file) { u.state = 'failed'; u.error = 'The file is no longer available. Choose it again.'; return renderUploads(); }
  u.state = 'uploading'; u.error = ''; renderUploads();
  try {
    const res = await uploadIntakeFile({ rowToken: done.rowToken, slot: u.slot, index: u.index, file });
    if (res && res.success) { u.state = 'done'; }
    else { u.state = 'failed'; u.error = (res && res.error) || 'Upload failed.'; }
  } catch (e) {
    u.state = 'failed';
    u.error = e.unauthorized ? e.message : 'The upload did not finish. Check your connection and try again.';
  }
  renderUploads();
}

function uploadsHtml() {
  if (!done.uploads.length) return '';
  const label = { pending: 'Waiting', uploading: 'Uploading...', done: 'Uploaded', failed: 'Not uploaded' };
  return `<div class="blk" id="uploads"><h3>Your files</h3><ul class="uploads">${done.uploads.map((u, j) => `<li class="up-${u.state}">
      <span>${esc(SLOT_LABEL(u.slot, u.index))}: ${esc(u.name)}</span> <strong>${label[u.state]}</strong>
      ${u.state === 'failed' ? `<p class="status err">${esc(u.error)}</p>
        <span class="up-actions">${FILES[u.slot][u.index] ? `<button class="btn ghost small" data-retry="${j}">Retry</button>` : ''}
        <input type="file" data-pick="${j}" aria-label="Choose ${esc(SLOT_LABEL(u.slot, u.index))} again" accept=".pdf,.pptx,.docx,.xlsx,.png,.jpg,.jpeg,.mp4"></span>` : ''}</li>`).join('')}</ul></div>`;
}
function renderUploads() {
  const el = $('uploads');
  if (!el) return;
  el.outerHTML = uploadsHtml();
  wireUploads();
}
function wireUploads() {
  view().querySelectorAll('[data-retry]').forEach(b => { b.onclick = () => uploadOne(done.uploads[+b.dataset.retry]); });
  view().querySelectorAll('[data-pick]').forEach(inp => {
    inp.onchange = () => {
      const u = done.uploads[+inp.dataset.pick], f = inp.files[0];
      if (!f) return;
      const problem = checkFile(f);
      if (problem) { u.error = problem; return renderUploads(); }
      FILES[u.slot][u.index] = f; u.name = f.name;
      uploadOne(u);
    };
  });
}

/* ----- thank-you ----- */
function renderDone() {
  setLayout(false);
  const d = done;
  const recap = founderRecap(d.A);
  const levels = SHOW_LEVELS_TO_FOUNDER ? d.result.scores : null;
  const staff = IntakeAuth.isStaff();
  view().innerHTML = `<div class="panel wide">
    <p class="sect">Submitted</p>
    <h2 class="r">Thank you${d.first ? ', ' + esc(d.first) : ''}</h2>
    <p class="meta">${esc(d.project)} · ${esc(d.institution)} · ${esc(fmtDate(d.submittedAt))}${d.intakeNumber > 1 ? ' · submission #' + esc(d.intakeNumber) : ''}</p>
    <p class="meta">Submission ID: <span class="mono">${esc(d.submissionId)}</span></p>
    <div class="code-box">
      <p class="label">Your return code</p>
      <p class="code">${esc(d.returnCode)}</p>
      <p>${d.emailSent ? `We emailed this code to ${esc(d.email)} when you saved Part 1.` : 'We could not email this code, so write it down or download the PDF below.'} Next time, enter your email and this code to start from these answers.</p>
    </div>
    <div class="blk"><h3>What happens next</h3><p>${esc(CFG.nextSteps)}</p></div>
    ${uploadsHtml()}
    ${d.diff ? `<div class="blk"><h3>Since your submission on ${esc(fmtDate(d.previousAt))}</h3>
      ${d.diff.added.length ? `<ul>${d.diff.added.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">Nothing new since last time.</p>'}
      ${d.diff.removed.length ? `<p class="muted">No longer reported: ${d.diff.removed.map(esc).join('; ')}</p>` : ''}</div>` : ''}
    ${levels ? `<div class="blk scroll"><h3>Readiness levels</h3><table><tbody>${CATS.filter(c => levels[c] != null).map(c => `<tr><td>${esc(NAMES[c])}</td><td>${levels[c]}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="blk"><h3>What you told us</h3></div>
    ${recap.map(s => `<div class="blk recap"><h4>${esc(s.sect)}</h4><ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
    <div class="actions">
      <button class="btn" id="pdf">Download a PDF copy</button>
      <button class="btn ghost" id="again">Start another submission</button>
      <span class="status err" id="pdf-err"></span>
    </div>
    ${staff ? `<div class="staff-view"><h3>Staff view</h3><p class="hint">You're signed in with the staff password, so you also see the reviewer result and the pre-call brief. Applicants never see this.</p>
      <iframe class="brief-frame" title="Pre-call brief" sandbox="" srcdoc="${esc(d.brief.html)}"></iframe></div>` : ''}
    </div>`;
  $('pdf').onclick = () => downloadPdf(d, recap, levels);
  $('again').onclick = () => { done = null; phase = 'start'; render(); window.scrollTo(0, 0); };
  wireUploads();
}

function downloadPdf(d, recap, levels) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { $('pdf-err').textContent = 'The PDF library did not load. Check your connection and reload the page.'; return; }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 16, width = 178;
  let y = 20;
  const line = (text, { size = 10, bold = false, color = 20, gap = 5 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.splitTextToSize(String(text), width).forEach(l => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(l, left, y);
      y += gap;
    });
  };

  line(CFG.programName + ' application', { size: 16, bold: true, gap: 8 });
  line(`${d.project} - ${d.institution}`, { size: 11, gap: 6 });
  line(`${d.name} - ${d.email} - submitted ${fmtDate(d.submittedAt)}${d.intakeNumber > 1 ? ' - submission #' + d.intakeNumber : ''}`, { size: 9, color: 90 });
  line(`Submission ID: ${d.submissionId}`, { size: 9, color: 90 });
  y += 3;
  line(`Return code: ${d.returnCode}`, { size: 12, bold: true, gap: 6 });
  line('Next time, enter your email and this code to start from these answers.', { size: 9, color: 90 });

  if (d.diff) {
    y += 4;
    line(`Since your submission on ${fmtDate(d.previousAt)}`, { size: 12, bold: true, gap: 6 });
    if (d.diff.added.length) d.diff.added.forEach(x => line('- ' + x));
    else line('Nothing new since last time.');
    if (d.diff.removed.length) line('No longer reported: ' + d.diff.removed.join('; '), { color: 90 });
  }

  if (levels) {
    y += 4;
    line('Readiness levels', { size: 12, bold: true, gap: 6 });
    CATS.filter(c => levels[c] != null).forEach(c => line(`${NAMES[c]}: ${levels[c]}`));
  }

  y += 4;
  line('What you told us', { size: 13, bold: true, gap: 7 });
  recap.forEach(s => {
    y += 2;
    line(s.sect, { size: 11, bold: true, gap: 6 });
    s.items.forEach(x => line('- ' + x));
  });

  y += 6;
  line('Generated by the NobleReach application form', { size: 8, color: 110, gap: 4 });
  EXPORT_ATTRIBUTION_LINES.forEach(l => line(l, { size: 7, color: 130, gap: 3.5 }));

  const safe = String(d.project || 'application').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`NobleReach application - ${safe} - ${new Date(d.submittedAt).toISOString().slice(0, 10)}.pdf`);
}

/* ---------- login ---------- */
function showLogin(message) {
  $('auth-overlay').hidden = false;
  $('auth-error').textContent = message || '';
  $('auth-password').value = '';
  setTimeout(() => $('auth-password').focus(), 50);
}

function wireLogin() {
  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('auth-password').value.trim();
    if (!pw) return;
    const btn = $('auth-submit');
    btn.disabled = true;
    btn.textContent = 'Checking...';
    $('auth-error').textContent = '';
    const res = await IntakeAuth.login(pw);
    btn.disabled = false;
    btn.textContent = 'Enter';
    if (!res.success) { $('auth-error').textContent = res.error; $('auth-password').select(); return; }
    $('auth-overlay').hidden = true;
    render();
  });
}

/* ---------- attributions (mirrors renderAttributions in src/main.js) ---------- */
function renderAttributions() {
  $('site-footer-notice').textContent = FOOTER_NOTICE;
  $('attributions-body').innerHTML = `
    <section>
      <h4>Business Readiness Levels framework</h4>
      <p>${esc(BRL_LICENSE.summary)}</p>
      <ul>${BRL_LICENSE.terms.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <p><a href="${BRL_LICENSE.url}" target="_blank" rel="noopener noreferrer">${esc(BRL_LICENSE.name)}</a></p>
      <p>${esc(BRL_LICENSE.scopeNote)}</p>
    </section>
    ${SOURCE_ATTRIBUTIONS.map(s => `<section>
      <h4>${esc(s.heading)}</h4>
      ${s.body.map(p => `<p>${esc(p)}</p>`).join('')}
      <p><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.urlLabel)}</a></p>
    </section>`).join('')}`;
  const dlg = $('attributions-dialog');
  $('open-attributions').onclick = () => dlg.showModal();
  $('attributions-close').onclick = () => dlg.close();
}

/* ---------- boot ---------- */
async function boot() {
  document.title = CFG.programName + ' application';
  $('page-title').textContent = CFG.programName + ' application';
  renderAttributions();
  wireLogin();
  $('start-over').onclick = startOver;

  const draft = load(DRAFT_KEY);
  if (draft && draft.A) {
    A = draft.A; H = draft.H || []; P = draft.P || null; meta = draft.meta || {};
    // drafts from before gen-1.2 kept one checklist screen's in-progress state
    if (A._local) { A._locals = Object.assign({}, A._locals, { [A._local.id]: A._local }); delete A._local; }
    if (!meta.submissionId) meta.submissionId = newSubmissionId();
    phase = 'intake';
  } else {
    A = freshAnswers();
    phase = 'start';
  }
  invalidate();

  if (await IntakeAuth.checkAccess()) render();
  else showLogin();
}

boot();
