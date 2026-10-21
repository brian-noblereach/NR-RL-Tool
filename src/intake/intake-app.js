// intake-app.js - Venture intake page (intake.html).
//
// Scoring lives in intake-model.js, the pre-call brief in intake-brief.js,
// program-specific text in intake-config.js. Applicants never see levels,
// gate signals, review flags, or next-level text; those go only to the
// Venture Intake Submissions sheet (and to staff, on the thank-you screen).
//
// Flow: login -> start (new / pick up from this browser / email + return code)
//   -> screens -> submit row (idempotent, retry) -> thank-you; files upload
//   one per request after the row exists, with per-file retry.

import {
  SCREENS, CATS, NAMES, VERSION, SHOW_LEVELS_TO_FOUNDER, FORMS, ICORPS, HOURS, OUTCOMES,
  PRIOR_EXPERIENCE, NS_RELEVANCE, RETAKE_SECTIONS,
  freshAnswers, closeSet, createModel, track, isHealth, hasFacilities, trlOptions, displayText,
  buildRow, founderRecap, diffFacts, canCarry, carryForward, sectionSummary
} from './intake-model.js';
import { buildBrief } from './intake-brief.js';
import { buildQmInput } from './intake-qm.js';
import { INTAKE_CONFIG as CFG } from './intake-config.js';
import { IntakeAuth } from './intake-auth.js';
import { submitIntake, uploadIntakeFile, checkFile, lookupIntake, resendCode, newSubmissionId } from './intake-api.js';
import { TRL_TRACK_CONTENT } from '../data/trl-tracks.js';
import { FOOTER_NOTICE, BRL_LICENSE, SOURCE_ATTRIBUTIONS, EXPORT_ATTRIBUTION_LINES } from '../data/attributions.js';

const DRAFT_KEY = 'nr-intake-draft-v2';   // in-progress answers (autosave)
const LAST_KEY = 'nr-intake-last-v2';     // last submitted answers on this browser
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/i;
const PARAMS = new URLSearchParams(location.search);
const TRACK_KEY = { General: 'general', Software: 'software', Hardware: 'hardware', Therapeutics: 'therapeutics', Diagnostics: 'diagnostics', Device: 'device' };

/* ---------- state ---------- */
let A;                 // answers (see intake-model.js)
let H = [];            // finished screen ids, in order
let P = null;          // previous submission's answers, used to prefill a re-take
let meta = {};         // { submissionId, previous: { submissionId, submittedAt } | null }
let phase = 'start';   // 'start' | 'intake' | 'done'
let submitState = { status: 'idle' }; // 'idle' | 'sending' | 'error'
let done = null;       // thank-you screen data
let startState = { email: '', code: '', msg: '', err: false, busy: false, submissions: null };
let model = null;
let HP = '';           // honeypot value (never stored)
// Files live in memory only (too big for browser storage); links and file
// names are saved in A.uploads.
const FILES = { deck: [null], supporting: [null, null, null] };

const M = () => model || (model = createModel(A));
const invalidate = () => { model = null; };

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

function rail(cur) {
  const list = M().activeScreens().map(s => s.sect);
  const i = cur ? list.indexOf(cur.sect) : list.length;
  $('rail').innerHTML = list.map((s, j) => `<li class="${j < i ? 'done' : j === i ? 'now' : ''}">${esc(s)}</li>`).join('');
  $('railmini').textContent = cur ? `Step ${i + 1} of ${list.length}: ${cur.sect}` : 'Finished';
}

function backLink() { return H.length ? '<button class="linkish" id="back">Back</button>' : ''; }
function wireBack() { const b = $('back'); if (b) b.onclick = back; }

function seg(obj, name, opts) {
  return `<div class="seg" data-name="${name}">${opts.map(o => `<button type="button" aria-pressed="${obj[name] === o}">${esc(o)}</button>`).join('')}</div>`;
}
function checks(name, opts, selected) {
  return `<div class="checks" data-name="${name}">${opts.map(o => `<label class="chk"><input type="checkbox" value="${esc(o)}" ${(selected || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
}
function readChecks(name) {
  return [...view().querySelectorAll(`.checks[data-name="${name}"] input:checked`)].map(i => i.value);
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
const SLOT_LABEL = (slot, i) => slot === 'deck' ? 'Pitch deck' : 'Supporting file ' + (i + 1);

function uploadsOf() {
  A.uploads = A.uploads || { deck: null, supporting: [null, null, null] };
  A.uploads.supporting = A.uploads.supporting || [null, null, null];
  return A.uploads;
}
function slotValue(slot, i) { const u = uploadsOf(); return slot === 'deck' ? u.deck : u.supporting[i]; }
function setSlot(slot, i, value, file) {
  const u = uploadsOf();
  if (slot === 'deck') u.deck = value; else u.supporting[i] = value;
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
  FILES.deck = [null]; FILES.supporting = [null, null, null];
  phase = 'intake';
  submitState = { status: 'idle' };
  invalidate();
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

function finish(id) {
  A.done[id] = true;
  H.push(id);
  delete A._local;
  invalidate();
  saveDraft();
  render();
  window.scrollTo(0, 0);
}

/**
 * Go back one screen. The screen's answers move back into its in-progress
 * state so the applicant sees them again rather than a blank form.
 */
function back() {
  const id = H.pop();
  if (!id) return;
  const sc = SCREENS.find(s => s.id === id);
  delete A.done[id];
  delete A._local;
  const wasUnsure = !!A.unsure[id];
  delete A.unsure[id];

  if (id === 'changes') { A._changes = A.changeChoices; delete A.changeChoices; A.carry = {}; }
  else if (id === 'applicant') { A._applicant = A.applicant; delete A.applicant; }
  else if (id === 'project') { A._project = A.project; delete A.project; }
  else if (id === 'essays') { A._essays = A.essays; delete A.essays; delete A.problem; }
  else if (id === 'founder') { A._founder = A.founder; delete A.founder; }
  else if (id === 'tech') { A._tech = { stage: A.stage, ev: A.techEv || '', facilities: A.facilities || '', unsure: wasUnsure }; delete A.stage; delete A.techEv; delete A.facilities; }
  else if (id === 'materials') { A._materials = A.materials; delete A.materials; }
  else {
    const L = { id, user: [], ev: {}, count: '', confirm: null, unsure: wasUnsure };
    (sc.items || []).forEach(it => {
      if (A.F[it.k] === true && !(A.I && it.k in A.I)) L.user.push(it.k);
      if (A.E[it.k]) L.ev[it.k] = A.E[it.k];
      delete A.F[it.k]; delete A.E[it.k]; if (A.I) delete A.I[it.k];
    });
    if (id === 'cust') {
      if (A.count != null) { L.count = String(A.count); L.confirm = A.confirm || null; }
      delete A.count; delete A.confirm;
    }
    A._local = L;
  }

  // A changed answer is a new submission.
  meta.submissionId = newSubmissionId();
  submitState = { status: 'idle' };
  invalidate();
  saveDraft();
  render();
}

function startOver() {
  if (!confirm('Start over? The answers you have entered so far will be cleared.')) return;
  clearDraft();
  A = freshAnswers(); H = []; P = null; meta = {};
  FILES.deck = [null]; FILES.supporting = [null, null, null];
  phase = 'start';
  invalidate();
  render();
}

/* ---------- render ---------- */
function render() {
  $('start-over').hidden = phase !== 'intake';
  if (phase === 'start') return renderStart();
  if (phase === 'done') return renderDone();

  let sc = M().nextScreen();
  // Re-take: sections marked "No change" are carried forward without being
  // shown, in screen order (so Back still walks through them).
  let carried = false;
  while (sc && A.carry && A.carry[sc.id]) {
    delete A.carry[sc.id];
    if (!canCarry(A, P, sc.id)) { A.review = Object.assign(A.review || {}, { [sc.id]: true }); break; }
    carryForward(A, P, sc.id);
    A.done[sc.id] = true;
    H.push(sc.id);
    invalidate();
    carried = true;
    sc = M().nextScreen();
  }
  if (carried) saveDraft();
  setLayout(true);
  rail(sc);
  if (!sc) return renderSubmit();
  ({ changes: renderChanges, applicant: renderApplicant, project: renderProject, essays: renderEssays, founder: renderFounder,
     tech: renderTech, multi: renderMulti, materials: renderMaterials })[sc.type](sc);
  // A carried section that can't be reused as-is (an earlier answer changed what it asks)
  if (A.review && A.review[sc.id]) {
    const panel = view().querySelector('.panel');
    if (panel && !panel.querySelector('.review-note')) {
      panel.querySelector('.q').insertAdjacentHTML('afterend', '<p class="note review-note">An answer you updated changes this section, so please check it. Your previous answers are filled in.</p>');
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
    <p class="hint">Asked again every time: your time and hours, and materials. Sections you didn't answer last time are new this time.</p>
    <div class="actions"><button class="btn" id="go">Continue</button><button class="btn ghost" id="pivot">We've changed direction: review everything</button><span class="status err" id="err"></span></div></div>`;
  view().querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => {
    b.onclick = () => { choices[seg.dataset.name] = b.textContent; saveDraft(); renderChanges(); };
  }));
  const go = () => {
    A.changeChoices = choices;
    A.carry = {};
    rows.forEach(s => { if (choices[s.id] === 'No change') A.carry[s.id] = true; });
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
    <p class="hint">Takes ${esc(CFG.estimatedTime)}. Your answers are saved on this device as you go, so you can stop and come back.</p>
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
        ${s.submissions ? `<div class="picklist">${s.submissions.map((x, i) => `<button class="opt" data-i="${i}"><span class="k">${esc(x.intakeNumber || '')}</span>${esc(x.project)} · ${esc(fmtDate(x.submittedAt))}</button>`).join('')}</div>` : ''}
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
      setMsg('Choose the submission to start from:');
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
  startState = { email: '', code: '', msg: '', err: false, busy: false, submissions: null };
  beginIntake({ answers: res.answers.A, submissionId: sub.submissionId, submittedAt: res.submittedAt || sub.submittedAt });
}

/* ----- 1. Applicant ----- */
function renderApplicant() {
  const a = A._applicant || (P && P.applicant ? { ...P.applicant } : { org: PARAMS.get('org') || '' });
  const orgField = CFG.organizations.length
    ? `<select id="org"><option value="">Choose...</option>${CFG.organizations.concat('Other').map(o => `<option ${a.orgPick === o || (!a.orgPick && a.org === o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
       <input id="orgOther" type="text" placeholder="Organization name" value="${esc(a.orgPick === 'Other' ? a.org : '')}" ${a.orgPick === 'Other' ? '' : 'hidden'}>`
    : `<input id="org" type="text" list="org-list" value="${esc(a.org)}" autocomplete="organization"><datalist id="org-list">${CFG.organizationSuggestions.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
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
    <div class="row2">
      <div class="field"><label class="f" for="phone">Phone <span class="opt-tag">optional</span></label><input id="phone" type="tel" value="${esc(a.phone)}" autocomplete="tel"></div>
      <div class="field narrow"><label class="f" for="ext">Ext. <span class="opt-tag">optional</span></label><input id="ext" type="text" value="${esc(a.ext)}"></div>
    </div>
    <div class="field"><label class="f" for="org">University or organization</label>${orgField}</div>
    <div class="field"><label class="f">Your role on the project</label>${seg(a, 'role', ['Faculty or PI', 'Co-investigator', 'Postdoc', 'Grad student', 'Founder from outside the university', 'Other'])}</div>
    <div class="field"><label class="f" for="team">Co-investigators or other team members <span class="opt-tag">optional</span></label><textarea id="team" placeholder="Name, title, and department for each">${esc(a.team)}</textarea></div>
    <div class="actions"><button class="btn" id="go">Continue</button><span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const o = Object.assign({}, a);
    ['first', 'last', 'email', 'phone', 'ext', 'team'].forEach(f => { o[f] = $(f).value.trim(); });
    if (A.lockedEmail) o.email = A.lockedEmail;
    if (CFG.organizations.length) { o.orgPick = $('org').value; o.org = o.orgPick === 'Other' ? $('orgOther').value.trim() : o.orgPick; }
    else o.org = $('org').value.trim();
    return o;
  };
  wireSegs(read, o => { A._applicant = o; }, renderApplicant);
  if (CFG.organizations.length) $('org').onchange = () => { A._applicant = read(); renderApplicant(); };
  $('go').onclick = () => {
    const o = read();
    A._applicant = o;
    if (!o.first || !o.last || !o.email || !o.org || !o.role) return err('Fill in each required field to continue.');
    if (!EMAIL_RE.test(o.email)) return err('Enter a valid email address.');
    delete A._applicant;
    A.applicant = o;
    finish('applicant');
  };
}

/* ----- 2. Project ----- */
function renderProject() {
  const p = A._project || (P && P.project ? { ...P.project } : {});
  view().innerHTML = `<div class="panel"><p class="sect">Project</p><h2 class="q">About the project</h2>
    <div class="field"><label class="f" for="ptitle">Project or technology title</label><input id="ptitle" type="text" value="${esc(p.title)}"><p class="hint">No company yet? Use the name you call the project, or a few words describing the technology.</p></div>
    <div class="field"><label class="f">What form does the technology take?</label>${seg(p, 'form', FORMS)}</div>
    <div class="field"><label class="f">Has a company been legally formed (incorporated or registered as an LLC)?</label>${seg(p, 'company', ['Yes', 'No', 'Not sure'])}</div>
    ${p.company === 'Yes' ? `<div class="field"><label class="f" for="companyName">Company name and state where it was formed</label><input id="companyName" type="text" value="${esc(p.companyName)}"></div>
      <div class="field"><label class="f">Company type <span class="opt-tag">optional</span></label>${seg(p, 'companyType', ['LLC', 'C corp', 'S corp', 'Other'])}</div>` : ''}
    <div class="field"><label class="f">I-Corps</label>${seg(p, 'icorps', ICORPS)}</div>
    <div class="field"><label class="f" for="website">Website <span class="opt-tag">optional</span></label><input id="website" type="url" value="${esc(p.website)}" placeholder="https://"></div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const o = Object.assign({}, p);
    o.title = $('ptitle').value.trim();
    o.website = $('website').value.trim();
    if ($('companyName')) o.companyName = $('companyName').value.trim();
    return o;
  };
  wireSegs(read, o => { if (o.company !== 'Yes') { delete o.companyName; delete o.companyType; } A._project = o; }, renderProject);
  $('go').onclick = () => {
    const o = read();
    A._project = o;
    if (!o.title || !o.form || !o.company || !o.icorps) return err('Fill in each required field to continue.');
    if (o.company === 'Yes' && !o.companyName) return err('Add the company name and state.');
    if (o.website && !URL_RE.test(o.website)) return err('Websites start with http:// or https://.');
    delete A._project;
    A.project = o;
    finish('project');
  };
  wireBack();
}

/* ----- 3. The technology and the problem ----- */
const ESSAYS = [
  { k: 'science', q: 'Describe the key innovation, the underlying science or technology, and what makes it distinctive.' },
  { k: 'value', q: 'Describe the problem being solved, who the target customers are, and why existing or competing solutions are insufficient.' },
  { k: 'impact', q: 'Explain the anticipated societal and/or economic impact and any national security relevance.' }
];
function wordNote(k, text) {
  const limit = CFG.wordLimits[k], n = words(text);
  const over = n > limit, block = n > Math.floor(limit * CFG.wordLimitBlockFactor);
  return { n, limit, over, block, html: `${n} / ${limit} words${block ? ' — please shorten this answer' : over ? ' — a little over the limit' : ''}` };
}
function renderEssays() {
  const e = A._essays || (P && P.essays ? { ...P.essays } : { nsRelevance: [] });
  view().innerHTML = `<div class="panel"><p class="sect">The technology and the problem</p><h2 class="q">Tell us about the work</h2>
    ${ESSAYS.map(x => {
      const w = wordNote(x.k, e[x.k]);
      return `<div class="field"><label class="f" for="es_${x.k}">${esc(x.q)}</label>
        <textarea id="es_${x.k}" class="essay" data-k="${x.k}" rows="7">${esc(e[x.k])}</textarea>
        <p class="hint wc${w.block ? ' block' : w.over ? ' over' : ''}" id="wc_${x.k}">${w.html}</p>
        ${x.k === 'value' ? `<label class="chk"><input type="checkbox" id="noCustomers" ${e.noCustomers ? 'checked' : ''}><span>We haven't identified specific customers yet.</span></label>` : ''}</div>`;
    }).join('')}
    <div class="field"><label class="f">Where could the technology be used? <span class="opt-tag">check all that apply</span></label>${checks('ns', NS_RELEVANCE, e.nsRelevance)}</div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const o = Object.assign({}, e);
    ESSAYS.forEach(x => { o[x.k] = $('es_' + x.k).value; });
    o.noCustomers = $('noCustomers').checked;
    o.nsRelevance = readChecks('ns');
    return o;
  };
  view().querySelectorAll('.essay').forEach(t => {
    t.oninput = () => {
      const w = wordNote(t.dataset.k, t.value), el = $('wc_' + t.dataset.k);
      el.textContent = w.html;
      el.className = 'hint wc' + (w.block ? ' block' : w.over ? ' over' : '');
      A._essays = read(); saveDraft();
    };
  });
  view().querySelectorAll('input[type=checkbox]').forEach(c => { c.onchange = () => { A._essays = read(); saveDraft(); }; });
  $('go').onclick = () => {
    const o = read();
    A._essays = o;
    if (ESSAYS.some(x => !o[x.k].trim())) return err('Answer all three questions to continue.');
    const tooLong = ESSAYS.find(x => wordNote(x.k, o[x.k]).block);
    if (tooLong) return err('Please shorten the answers marked in red.');
    ESSAYS.forEach(x => { o[x.k] = o[x.k].trim(); });
    delete A._essays;
    A.essays = o;
    A.problem = { known: !o.noCustomers };
    finish('essays');
  };
  wireBack();
}

/* ----- 4. You and the project ----- */
function renderFounder() {
  // On a re-take the time questions are asked fresh: last time's answers go stale.
  const o = A._founder || (P && P.founder ? { ...P.founder, spent: undefined, engagement: undefined, conflicts: undefined } : {});
  const showRole = o.outcome && o.outcome.startsWith('Start a company');
  const eng = CFG.engagement;
  view().innerHTML = `<div class="panel"><p class="sect">You and the project</p><h2 class="q">About you and why you're doing this</h2>
    <p class="hint lead">Filling this out for someone else? Answer for the person who leads the project.</p>
    <div class="field"><label class="f">What's the main reason you want to take this beyond the lab?</label>${seg(o, 'why', ['I want to see it used', 'I want to build a company', 'My funding or department expects it', 'A company or customer asked for it', 'Not sure yet'])}</div>
    <div class="field"><label class="f" for="whyText">In a sentence: why this, and why now? <span class="opt-tag">optional</span></label><input type="text" id="whyText" value="${esc(o.whyText)}"></div>
    <div class="field"><label class="f">What outcome do you want for this technology?</label>${seg(o, 'outcome', OUTCOMES)}</div>
    ${showRole ? `<div class="field"><label class="f">If a company forms, what role do you want?</label>${seg(o, 'role', ['CEO or business lead', 'Technical lead (CTO or chief scientist)', 'Advisor', 'No role', 'Not sure'])}</div>` : ''}
    <div class="field"><label class="f">In the last three months, have you spent time on this outside your research duties?</label>${seg(o, 'spent', ['Yes', 'No'])}</div>
    <div class="field"><label class="f">How many hours a week can you put toward this over the next six months?</label>${seg(o, 'hours', HOURS)}</div>
    ${eng ? `<div class="field"><label class="f">Can the project lead take part in a structured engagement of about ${esc(eng.hoursPerWeek)} hours a week for ${esc(eng.months)} months?</label>${seg(o, 'engagement', ['Yes', 'No', 'Not sure'])}
      ${['No', 'Not sure'].includes(o.engagement) ? `<label class="f" for="conflicts" style="margin-top:12px">Note any sabbatical, leave, or other conflicts <span class="opt-tag">optional</span></label><input id="conflicts" type="text" value="${esc(o.conflicts)}">` : ''}</div>` : ''}
    <div class="field"><label class="f">Prior experience <span class="opt-tag">optional, check all that apply</span></label>${checks('prior', PRIOR_EXPERIENCE, o.prior)}
      <input id="priorDetail" type="text" placeholder="Details (optional)" value="${esc(o.priorDetail)}"></div>
    <div class="field"><label class="f" for="changed">Describe one thing you changed in the technology or plan because of what a customer, mentor, or reviewer told you. <span class="opt-tag">optional</span></label>
      <textarea id="changed" ${o.nothing ? 'disabled' : ''}>${esc(o.changed)}</textarea>
      <label class="chk"><input type="checkbox" id="nothing" ${o.nothing ? 'checked' : ''}><span>Nothing yet</span></label></div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => {
    const x = Object.assign({}, o);
    x.whyText = $('whyText').value; x.changed = $('changed').value; x.nothing = $('nothing').checked;
    x.priorDetail = $('priorDetail').value;
    x.prior = readChecks('prior');
    if ($('conflicts')) x.conflicts = $('conflicts').value;
    return x;
  };
  wireSegs(read, x => {
    if (!(x.outcome || '').startsWith('Start a company')) delete x.role;
    if (!['No', 'Not sure'].includes(x.engagement)) delete x.conflicts;
    A._founder = x;
  }, renderFounder);
  $('nothing').onchange = () => { A._founder = read(); renderFounder(); };
  // "None" is exclusive
  view().querySelectorAll('.checks[data-name="prior"] input').forEach(c => {
    c.onchange = () => {
      const all = view().querySelectorAll('.checks[data-name="prior"] input');
      if (c.checked && c.value === 'None') all.forEach(x => { if (x !== c) x.checked = false; });
      if (c.checked && c.value !== 'None') all.forEach(x => { if (x.value === 'None') x.checked = false; });
      A._founder = read(); saveDraft();
    };
  });
  $('go').onclick = () => {
    const x = read();
    A._founder = x;
    const sr = (x.outcome || '').startsWith('Start a company');
    const ok = x.why && x.outcome && (!sr || x.role) && x.spent && x.hours && (!eng || x.engagement);
    if (!ok) return err('Answer each question to continue.');
    x.whyText = (x.whyText || '').trim();
    x.changed = x.nothing ? '' : (x.changed || '').trim();
    x.priorDetail = (x.priorDetail || '').trim();
    if (x.conflicts) x.conflicts = x.conflicts.trim();
    delete A._founder;
    A.founder = x;
    finish('founder');
  };
  wireBack();
}

/* ----- Technology stage ----- */
function renderTech() {
  const opts = trlOptions(A);
  const t = A._tech || (P && P.stage != null
    ? { stage: P.stage, ev: P.techEv || '', facilities: P.facilities || '', unsure: !!(P.unsure && P.unsure.tech) }
    : { stage: null, ev: '', facilities: '', unsure: false });
  const note = (TRL_TRACK_CONTENT[TRACK_KEY[track(A)]] || {}).sourceNote || '';
  view().innerHTML = `<div class="panel"><p class="sect">Technology</p>
    <h2 class="q">What is the furthest your technology has gotten?</h2><p class="hint lead">Pick the furthest point reached. Each step includes the ones above it.</p>
    <div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}" aria-pressed="${t.stage === i}"><span class="k">${i}</span><span class="opt-text"><strong>${esc(o.title)}</strong>${o.desc ? `<span class="opt-desc">${esc(o.desc)}</span>` : ''}</span></button>`).join('')}</div>
    ${note ? `<p class="hint source-note">${esc(note)}</p>` : ''}
    ${t.stage >= 4 ? `<div class="field"><label class="f" for="tev">${t.stage >= 7 && A.E.c_proto ? 'Anything to add about where it was tested? (optional; you already named who used the prototype)' : 'Describe the most advanced test or use so far: what was tested, where, and with whom.'}</label><textarea id="tev">${esc(t.ev)}</textarea></div>` : ''}
    ${hasFacilities(A) ? `<div class="field"><label class="f" for="fac">Facilities and equipment for prototype development or validation, and how you'll access any you don't have. <span class="opt-tag">optional</span></label><textarea id="fac">${esc(t.facilities)}</textarea></div>` : ''}
    <label class="chk"><input type="checkbox" id="tu" ${t.unsure ? 'checked' : ''}><span>I'm not sure about this one</span></label>
    <div class="actions"><button class="btn" id="go" ${t.stage == null ? 'disabled' : ''}>Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const keep = () => { if ($('tev')) t.ev = $('tev').value; if ($('fac')) t.facilities = $('fac').value; A._tech = t; };
  view().querySelectorAll('.opt').forEach(b => {
    b.onclick = () => { keep(); t.stage = +b.dataset.i; A._tech = t; saveDraft(); renderTech(); if ($('tev')) $('tev').focus(); };
  });
  ['tev', 'fac'].forEach(id => { if ($(id)) $(id).oninput = () => { keep(); saveDraft(); }; });
  $('tu').onchange = () => { t.unsure = $('tu').checked; A._tech = t; };
  $('go').onclick = () => {
    if (t.stage == null) return;
    keep();
    const ev = (t.ev || '').trim();
    if (t.stage >= 4 && !ev && !(t.stage >= 7 && A.E.c_proto)) return err('Add a short description of the test.');
    delete A._tech;
    A.stage = t.stage;
    A.techEv = t.stage >= 4 ? ev : '';
    A.facilities = hasFacilities(A) ? (t.facilities || '').trim() : '';
    if (t.unsure) A.unsure.tech = true;
    finish('tech');
  };
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

  let L = A._local && A._local.id === sc.id ? A._local : null;
  if (!L) {
    L = A._local = { id: sc.id, user: [], ev: {}, count: '', confirm: null, unsure: false };
    if (P && P.F) {
      // Re-take: start from last time's checks (only the ones the applicant
      // ticked, not ones that were counted from other answers).
      L.user = sc.items.filter(it => P.F[it.k] === true && !(P.I && it.k in P.I) && !pre.has(it.k)).map(it => it.k);
      sc.items.forEach(it => { if (P.E && P.E[it.k]) L.ev[it.k] = P.E[it.k]; });
      if (sc.id === 'cust' && P.count != null) { L.count = String(P.count); L.confirm = P.confirm || null; }
      L.unsure = !!(P.unsure && P.unsure[sc.id]);
      prune(L);
    }
  }

  const eff = closeSet([...pre, ...L.user]);
  const vis = sc.items.filter(it => pre.has(it.k) || m.itemVisible(it, eff));
  const row = it => {
    const on = eff.has(it.k), userOn = L.user.includes(it.k), locked = on && !userOn;
    const note = pre.has(it.k) ? 'Covered by an earlier answer' : locked ? 'Included by another item you checked' : '';
    let extra = '';
    if (userOn && it.ev) extra = `<div class="sub"><label class="f" for="ev_${it.k}">${esc(it.ev)}</label><input type="text" id="ev_${it.k}" value="${esc(L.ev[it.k] || '')}"></div>`;
    if (on && it.special === 'count') {
      const n = L.count === '' ? null : Number(L.count);
      extra += `<div class="sub"><label class="f" for="cnt">How many potential customers or users outside your university have you interviewed?</label><input type="number" id="cnt" min="0" step="1" inputmode="numeric" value="${esc(L.count)}" style="max-width:140px">
      ${n != null && n >= 20 ? `<p class="f" style="margin:12px 0 6px;font-weight:500">Did most of them confirm the problem is real and happens often?</p>${seg(L, 'confirm', ['Yes', 'No', 'Not sure'])}` : ''}</div>`;
    }
    if (on && it.special === 'deck') extra += `<div class="sub"><label class="f">Upload the deck <span class="opt-tag">optional</span></label>${slotHtml('deck', 0)}</div>`;
    return `<div class="item${on ? ' on' : ''}"><label class="chk"><input type="checkbox" data-k="${it.k}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${esc(displayText(it.label, sc.id, A))}${note ? `<span class="lock">${note}</span>` : ''}</span></label>${extra}</div>`;
  };
  view().innerHTML = `<div class="panel"><p class="sect">${esc(sc.sect)}</p><h2 class="q">${esc(displayText(sc.q, sc.id, A))}</h2><p class="hint lead">Check all that apply. Leave the rest blank.</p>
    <div class="items">${vis.map(row).join('')}</div>
    <label class="chk unsure"><input type="checkbox" id="un" ${L.unsure ? 'checked' : ''}><span>I'm not sure about some of these</span></label>
    <div class="actions"><button class="btn" id="go">${vis.some(it => eff.has(it.k)) ? 'Continue' : 'None of these, continue'}</button>${backLink()}<span class="status err" id="err"></span></div></div>`;

  const keep = () => {
    sc.items.forEach(it => { const e = $('ev_' + it.k); if (e) L.ev[it.k] = e.value; });
    if ($('cnt')) L.count = $('cnt').value;
  };
  view().querySelectorAll('.items input[type=checkbox]').forEach(x => {
    x.onchange = () => {
      keep();
      const k = x.dataset.k;
      L.user = x.checked ? L.user.concat(k) : L.user.filter(u => u !== k);
      prune(L);
      saveDraft();
      renderMulti(sc);
      const e = $('ev_' + k) || ($('cnt') && k === 'c_talk' ? $('cnt') : null);
      if (x.checked && e) e.focus();
    };
  });
  if ($('cnt')) {
    $('cnt').oninput = () => {
      const before = Number(L.count) >= 20;
      L.count = $('cnt').value;
      if ((Number(L.count) >= 20) !== before) { keep(); renderMulti(sc); $('cnt').focus(); }
    };
  }
  view().querySelectorAll('.seg[data-name="confirm"] button').forEach(b => { b.onclick = () => { keep(); L.confirm = b.textContent; renderMulti(sc); }; });
  wireSlots(() => { keep(); renderMulti(sc); });
  $('un').onchange = () => { L.unsure = $('un').checked; };
  $('go').onclick = () => {
    keep();
    const eff2 = closeSet([...pre, ...L.user]);
    const vis2 = sc.items.filter(it => pre.has(it.k) || m.itemVisible(it, eff2));
    const missing = vis2.filter(it => L.user.includes(it.k) && it.ev && !(L.ev[it.k] || '').trim());
    if (missing.length) return err('Fill in the detail under each checked item.');
    if (eff2.has('c_talk') && vis2.some(it => it.k === 'c_talk')) {
      const n = Number(L.count);
      if (L.count === '' || n < 0) return err('Enter how many people you have interviewed.');
      if (n >= 20 && !L.confirm) return err('Answer whether most confirmed the problem.');
      A.count = Math.floor(n);
      A.confirm = n >= 20 ? L.confirm : null;
    }
    if (vis2.some(it => it.special === 'deck')) {
      if (!eff2.has('f_deck')) setSlot('deck', 0, null);
      else if (fileMissing('deck', 0)) return err('Choose the deck file again, or remove it.');
    }
    const by0 = m.by;
    A.I = A.I || {};
    vis2.forEach(it => {
      A.F[it.k] = eff2.has(it.k);
      if (L.user.includes(it.k) && it.ev) A.E[it.k] = L.ev[it.k].trim();
      if (eff2.has(it.k) && !L.user.includes(it.k)) {
        const src = pre.has(it.k) ? by0[it.k] : L.user.find(u => closeSet([u]).has(it.k));
        A.I[it.k] = src || '';
      }
    });
    if (L.unsure) A.unsure[sc.id] = true;
    finish(sc.id);
  };
  wireBack();
}

/* ----- 12. Materials and submit ----- */
const HELP = ['Introductions to potential customers', 'A business co-founder or CEO', 'IP or licensing guidance', 'Help applying for SBIR/STTR or grants', 'Investor introductions', 'Product or engineering help', 'Regulatory or certification guidance', 'A mentor in my industry'];

function renderMaterials() {
  const mt = A._materials || { help: P && P.materials && P.materials.help ? [...P.materials.help] : [], ack: false, aiOptOut: !!(P && P.materials && P.materials.aiOptOut) };
  // Re-take: links from last time carry over (files were attached to the earlier row).
  if (!A._materials && P && P.uploads && !A.linksCarried) {
    A.linksCarried = true;
    const pu = P.uploads;
    if (pu.deck && pu.deck.link && !slotValue('deck', 0)) setSlot('deck', 0, { link: pu.deck.link });
    (pu.supporting || []).forEach((x, i) => { if (x && x.link && !slotValue('supporting', i)) setSlot('supporting', i, { link: x.link }); });
  }
  const deckFromFunding = A.F.f_deck === true && slotValue('deck', 0);
  const h = CFG.submissionHandling;
  view().innerHTML = `<div class="panel"><p class="sect">Materials and submit</p><h2 class="q">Last, add any materials and submit</h2>
    ${deckFromFunding ? '' : `<div class="field"><label class="f">Pitch deck <span class="opt-tag">optional</span></label>${slotHtml('deck', 0)}</div>`}
    <div class="field"><label class="f">Supporting materials <span class="opt-tag">optional, up to ${CFG.uploads.maxSupporting}</span></label>
      <p class="hint" style="margin:0 0 8px">Publications, white papers, prototype images, or videos. Files up to ${Math.round(CFG.uploads.maxBytes / 1048576)} MB; for anything bigger, share a link.</p>
      ${Array.from({ length: CFG.uploads.maxSupporting }, (_, i) => slotHtml('supporting', i)).join('')}</div>
    <div class="field"><label class="f">What would help most right now? <span class="opt-tag">check all that apply</span></label>${checks('help', HELP, mt.help)}</div>
    <div class="handling"><h3>${esc(h.heading)}</h3>${h.paragraphs.map(x => `<p>${esc(x)}</p>`).join('')}
      <label class="chk"><input type="checkbox" id="ack" ${mt.ack ? 'checked' : ''}><span>${esc(h.ackLabel)} <span class="opt-tag">required</span></span></label>
      <label class="chk"><input type="checkbox" id="optout" ${mt.aiOptOut ? 'checked' : ''}><span>${esc(h.optOutLabel)} <span class="opt-tag">optional</span></span></label></div>
    <div class="hp" aria-hidden="true"><label for="company_fax">Leave this field empty</label><input type="text" id="company_fax" name="company_fax" tabindex="-1" autocomplete="off" value="${esc(HP)}"></div>
    <div class="actions"><button class="btn" id="go">Submit</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => ({ help: readChecks('help'), ack: $('ack').checked, aiOptOut: $('optout').checked });
  view().querySelectorAll('input[type=checkbox]').forEach(x => { x.onchange = () => { A._materials = read(); saveDraft(); }; });
  $('company_fax').oninput = () => { HP = $('company_fax').value; };
  wireSlots(() => { A._materials = read(); renderMaterials(); });
  $('go').onclick = () => {
    const x = read();
    A._materials = x;
    if (!x.ack) return err('Please confirm you\'ve read how NobleReach handles your submission.');
    const lost = [['deck', 0], ...Array.from({ length: CFG.uploads.maxSupporting }, (_, i) => ['supporting', i])].find(([s, i]) => fileMissing(s, i));
    if (lost) return err('Choose ' + SLOT_LABEL(lost[0], lost[1]).toLowerCase() + ' again, or remove it.');
    // A deck added here counts as "A pitch deck" (Funding).
    if (slotValue('deck', 0)) A.F.f_deck = true;
    HP = $('company_fax').value;
    delete A._materials;
    A.materials = x;
    finish('materials');
  };
  wireBack();
}

/* ----- submit ----- */
function renderSubmit() {
  const st = submitState;
  const msg = st.status === 'error'
    ? `We could not save your submission: ${esc(st.message)}. Your answers are still saved on this device.`
    : 'Saving your submission...';
  view().innerHTML = `<div class="panel"><p class="sect">Submitting</p><h2 class="q">${st.status === 'error' ? 'Not saved yet' : 'Saving your answers'}</h2>
    <p class="status${st.status === 'error' ? ' err' : ''}" role="status">${msg}</p>
    <div class="actions">${st.status === 'error' ? '<button class="btn" id="retry">Try again</button>' : ''}${st.status === 'sending' ? '' : backLink()}</div></div>`;
  if ($('retry')) $('retry').onclick = () => { submitState = { status: 'idle' }; render(); };
  wireBack();
  if (st.status === 'idle') doSubmit();
}

async function doSubmit() {
  submitState = { status: 'sending' };
  render();
  const submittedAt = new Date().toISOString();
  const result = createModel(A).result(H.length);
  // Re-take: last time's levels, so the brief can show what moved (up or down).
  const previous = A.retake && P ? { scores: createModel(P).result().scores, submittedAt: meta.previous && meta.previous.submittedAt } : null;
  const brief = buildBrief(A, result, CFG, { submissionId: meta.submissionId, submittedAt, previous });
  const record = buildRow(A, { screensAnswered: H.length, previousA: A.retake ? P : null, questions: brief.questions });
  const finalA = cleanA(A);
  const answers = {
    version: VERSION, submissionId: meta.submissionId, submittedAt, A: finalA, H: H.slice(),
    facts: result.facts, levels: result.scores, nextLevelNeeds: result.next,
    gateSignals: result.gateFlags, reviewFlags: result.flags, questionsForCall: brief.questions
  };
  const planned = plannedUploads();
  try {
    const res = await submitIntake({
      submissionId: meta.submissionId,
      previousSubmissionId: (meta.previous && meta.previous.submissionId) || '',
      record, answers, briefHtml: brief.html, uploads: planned, hp: HP,
      // No QM summary for applicants who opted out of AI processing.
      qmInput: A.materials.aiOptOut ? undefined : buildQmInput(finalA, { submittedAt })
    });
    if (!res || !res.success) throw new Error((res && res.error) || 'Unknown error');

    done = {
      submissionId: meta.submissionId,
      returnCode: res.returnCode,
      intakeNumber: res.intakeNumber,
      emailSent: !!res.emailSent,
      uploadToken: res.uploadToken,
      name: [A.applicant.first, A.applicant.last].join(' '),
      first: A.applicant.first,
      email: A.applicant.email,
      institution: A.applicant.org,
      project: A.project.title,
      submittedAt,
      A: finalA,
      result,
      brief,
      previousAt: meta.previous ? meta.previous.submittedAt : null,
      diff: P && P.applicant ? diffFacts(P, finalA) : null,
      uploads: planned.filter(u => !u.link).map(u => ({ slot: u.slot, index: u.index, name: u.name, state: 'pending', error: '' }))
    };
    store(LAST_KEY, { submissionId: meta.submissionId, submittedAt, email: done.email, project: done.project, returnCode: res.returnCode, answers: finalA });
    clearDraft();
    phase = 'done';
    submitState = { status: 'idle' };
    render();
    window.scrollTo(0, 0);
    uploadAll();
  } catch (e) {
    if (e.unauthorized) { submitState = { status: 'idle' }; showLogin(e.message); return; }
    console.warn('[Intake] Submit failed:', e);
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
    const res = await uploadIntakeFile({ uploadToken: done.uploadToken, slot: u.slot, index: u.index, file });
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
      <p>${d.emailSent ? `We emailed this code to ${esc(d.email)}.` : 'We could not email this code, so write it down or download the PDF below.'} Next time, enter your email and this code to start from these answers.</p>
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
