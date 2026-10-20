// intake-app.js - Founder intake page (intake.html).
//
// Screens are ported from the tested prototype (docs/venture-intake.html).
// Scoring lives in intake-model.js. Founders never see levels, gate signals,
// review flags, or next-level text; those go only to the Founder Intake
// Smartsheet for reviewers.
//
// Flow: login -> start (new / pick up from this browser / email + code) ->
//       screens -> submit (idempotent, retry) -> thank-you with return code,
//       recap, "since last time", and a PDF copy.

import {
  SCREENS, TRACK_OPTS, CATS, NAMES, VERSION, SHOW_LEVELS_TO_FOUNDER,
  freshAnswers, closeSet, createModel, track, buildRecord, founderRecap, diffFacts
} from './intake-model.js';
import { IntakeAuth } from './intake-auth.js';
import { submitIntake, lookupIntake, resendCode, newSubmissionId } from './intake-api.js';
import { FOOTER_NOTICE, BRL_LICENSE, SOURCE_ATTRIBUTIONS, EXPORT_ATTRIBUTION_LINES } from '../data/attributions.js';

const DRAFT_KEY = 'nr-intake-draft-v1';   // in-progress answers (autosave)
const LAST_KEY = 'nr-intake-last-v1';     // last submitted intake on this browser

// Suggestions only; free text is still accepted. Consistent spelling makes
// per-institution Smartsheet reports work.
const INSTITUTION_SUGGESTIONS = ['UKY', 'Vandy', 'UoL', 'UTK', 'UCF', 'UF', 'USF', 'Embry Riddle'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- state ---------- */
let A;                 // answers (see intake-model.js)
let H = [];            // finished screen ids, in order
let P = null;          // previous intake's answers, used to prefill a re-take
let meta = {};         // { submissionId, previous: { submissionId, submittedAt } | null }
let phase = 'start';   // 'start' | 'intake' | 'done'
let submitState = { status: 'idle' }; // 'idle' | 'sending' | 'error'
let done = null;       // end-screen data
let startState = { email: '', code: '', msg: '', err: false, busy: false, submissions: null };
let model = null;

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

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

function prefillNote() {
  return P && meta.previous
    ? `<p class="note ok">We filled in your answers from ${esc(fmtDate(meta.previous.submittedAt)) || 'your last intake'}. Update anything that has changed.</p>`
    : '';
}

/* ---------- flow ---------- */
function beginIntake(prev) {
  A = freshAnswers();
  H = [];
  P = prev ? prev.answers : null;
  meta = {
    submissionId: newSubmissionId(),
    previous: prev ? { submissionId: prev.submissionId || '', submittedAt: prev.submittedAt || '' } : null
  };
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
 * Go back one screen. The screen's answers are moved back into its
 * in-progress state so the founder sees them again rather than a blank form.
 */
function back() {
  const id = H.pop();
  if (!id) return;
  const sc = SCREENS.find(s => s.id === id);
  delete A.done[id];
  delete A._local;
  const wasUnsure = !!A.unsure[id];
  delete A.unsure[id];

  if (id === 'about') { A._about = A.about; delete A.about; }
  else if (id === 'founder') { A._founder = A.founder; delete A.founder; }
  else if (id === 'problem') { if (A.problem) A._problem = { text: A.problem.text, none: !A.problem.known }; delete A.problem; }
  else if (id === 'tech') { A._tech = { stage: A.stage, ev: A.techEv || '', unsure: wasUnsure }; delete A.stage; delete A.techEv; }
  else if (id === 'plans') { A._plans = A.plans; delete A.plans; }
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
  phase = 'start';
  invalidate();
  render();
}

/* ---------- render ---------- */
function render() {
  $('start-over').hidden = phase !== 'intake';
  if (phase === 'start') return renderStart();
  if (phase === 'done') return renderDone();

  const sc = M().nextScreen();
  setLayout(true);
  rail(sc);
  if (!sc) return renderSubmit();
  ({ about: renderAbout, founder: renderFounder, problem: renderProblem, tech: renderTech, multi: renderMulti, plans: renderPlans })[sc.type](sc);
}

/* ----- start ----- */
function renderStart() {
  setLayout(false);
  const last = load(LAST_KEY);
  const s = startState;
  view().innerHTML = `<div class="panel intro">
    <p class="sect">Welcome</p>
    <h2 class="q">Venture readiness intake</h2>
    <p>This intake asks what has actually happened with your project so far: customers, technology, IP, team, and funding. It is not a test, and there are no wrong answers. Most people finish in under 10 minutes.</p>
    <p>Your answers go to the NobleReach and hub team supporting your project.</p>
    <div class="choices">
      <div class="choice">
        <h3>Start a new intake</h3>
        <p>Your first time, or a different project.</p>
        <button class="btn" id="new">Start</button>
      </div>
      ${last && last.answers ? `<div class="choice">
        <h3>Pick up from your last intake</h3>
        <p>${esc(last.project)}, submitted ${esc(fmtDate(last.submittedAt))}. Your previous answers will be filled in, so you only update what has changed.</p>
        <div class="actions" style="margin-top:0"><button class="btn" id="pick">Start from these answers</button><button class="linkish" id="forget">Not you? Forget this</button></div>
      </div>` : ''}
      <div class="choice">
        <h3>Continue from a previous intake</h3>
        <p>Enter the email you used and the return code we sent you.</p>
        <div class="inline-fields">
          <input type="email" id="lk-email" placeholder="Email" value="${esc(s.email)}" autocomplete="email" aria-label="Email">
          <input type="text" id="lk-code" placeholder="Return code" value="${esc(s.code)}" autocapitalize="characters" spellcheck="false" aria-label="Return code">
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn ghost" id="lookup" ${s.busy ? 'disabled' : ''}>Find my intake</button>
          <button class="linkish" id="resend" ${s.busy ? 'disabled' : ''}>Forgot your code? Email it to me</button>
        </div>
        <p class="status${s.err ? ' err' : ''}" id="lk-msg" role="status">${esc(s.msg)}</p>
        ${s.submissions ? `<div class="picklist">${s.submissions.map((x, i) => `<button class="opt" data-i="${i}"><span class="k">${esc(x.intakeNumber || '')}</span>${esc(x.project)} · ${esc(fmtDate(x.submittedAt))}</button>`).join('')}</div>` : ''}
      </div>
    </div></div>`;

  const readLookup = () => { s.email = $('lk-email').value.trim(); s.code = $('lk-code').value.trim(); };
  const setMsg = (msg, err) => { s.msg = msg; s.err = !!err; };

  $('new').onclick = () => beginIntake(null);
  if ($('pick')) $('pick').onclick = () => beginIntake({ answers: last.answers, submissionId: last.submissionId, submittedAt: last.submittedAt });
  if ($('forget')) $('forget').onclick = () => { store(LAST_KEY, null); renderStart(); };

  $('lookup').onclick = async () => {
    readLookup();
    s.submissions = null;
    if (!EMAIL_RE.test(s.email) || !s.code) { setMsg('Enter your email and return code.', true); return renderStart(); }
    s.busy = true; setMsg('Looking up your intake...'); renderStart();
    try {
      const res = await lookupIntake({ email: s.email, code: s.code });
      if (!res.success) { setMsg(res.error || 'That email and code do not match our records.', true); return; }
      if (!res.submissions.length) { setMsg('No intakes found for that email.', true); return; }
      if (res.submissions.length === 1) { await loadPrevious(res.submissions[0]); return; }
      s.submissions = res.submissions;
      setMsg('Choose the intake to start from:');
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
      setMsg(res.message || 'If we have an intake for that address, we have emailed its return code.');
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
        setMsg('We could not load that intake. Try again.', true);
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
    s.msg = res.error || 'We could not load the answers for that intake.';
    s.err = true;
    return;
  }
  startState = { email: '', code: '', msg: '', err: false, busy: false, submissions: null };
  beginIntake({ answers: res.answers.A, submissionId: sub.submissionId, submittedAt: res.submittedAt || sub.submittedAt });
}

/* ----- screens (ported from the prototype) ----- */
function renderAbout() {
  const a = A._about || (P && P.about ? { ...P.about } : {});
  view().innerHTML = `<div class="panel intro"><p class="sect">About you</p><h2 class="q">A few details first</h2>
    ${prefillNote()}
    <p>Answer based on what has actually happened so far, not what is planned. Most people finish in under 10 minutes.</p>
    <div class="field"><label class="f" for="name">Your name</label><input id="name" type="text" value="${esc(a.name)}" autocomplete="name"></div>
    <div class="field"><label class="f" for="email">Your email</label><input id="email" type="email" value="${esc(a.email)}" autocomplete="email"><p class="hint">We send your return code here, so you can pick up from these answers next time.</p></div>
    <div class="field"><label class="f" for="university">University or organization</label><input id="university" type="text" list="inst-list" value="${esc(a.university)}"><datalist id="inst-list">${INSTITUTION_SUGGESTIONS.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    <div class="field"><label class="f" for="project">Project or venture name</label><input id="project" type="text" value="${esc(a.project)}"><p class="hint">No company yet? Use the name you call the project, or a few words describing the technology.</p></div>
    <div class="field"><label class="f">Where are you in the I-Corps program?</label>${seg(a, 'icorps', ['Before or at the start', 'Finished', 'Not in I-Corps'])}</div>
    <div class="field"><label class="f">Which best describes your technology?</label>${seg(a, 'tech', ['Software', 'Hardware or physical device', 'Material, chemistry, or process', 'Other'])}</div>
    <div class="field"><label class="f">Has a company been legally formed (incorporated or registered as an LLC)?</label>${seg(a, 'company', ['Yes', 'No', 'Not sure'])}</div>
    <div class="field" ${a.company === 'Yes' ? '' : 'hidden'}><label class="f" for="companyName">Company name and state where it was formed</label><input id="companyName" type="text" value="${esc(a.companyName)}"></div>
    <div class="actions"><button class="btn" id="go">Start</button><span class="status err" id="err"></span></div></div>`;
  const read = () => { const o = Object.assign({}, a); ['name', 'email', 'university', 'project', 'companyName'].forEach(f => { o[f] = $(f).value.trim(); }); return o; };
  view().querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => {
    b.onclick = () => { const o = read(); o[s.dataset.name] = b.textContent; A._about = o; saveDraft(); renderAbout(); };
  }));
  $('go').onclick = () => {
    const o = read();
    A._about = o;
    const need = ['name', 'email', 'university', 'project', 'icorps', 'tech', 'company'].filter(f => !o[f]);
    if (o.company === 'Yes' && !o.companyName) need.push('companyName');
    if (need.length) { $('err').textContent = 'Fill in every field to continue.'; return; }
    if (!EMAIL_RE.test(o.email)) { $('err').textContent = 'Enter a valid email address.'; return; }
    if (o.company !== 'Yes') delete o.companyName;
    delete A._about;
    A.about = o;
    finish('about');
  };
}

function renderFounder() {
  const o = A._founder || (P && P.founder ? { ...P.founder } : {});
  const showRole = o.outcome && o.outcome.startsWith('Start a company');
  view().innerHTML = `<div class="panel"><p class="sect">You and the project</p><h2 class="q">First, about you and why you're doing this</h2>
    <p class="hint lead">Filling this out for someone else? Answer for the person who would lead the venture.</p>
    <div class="field"><label class="f">Your role on the project</label>${seg(o, 'respRole', ['Faculty or PI', 'Postdoc', 'Grad student', 'Founder from outside the university', 'Other'])}</div>
    <div class="field"><label class="f">What's the main reason you want to take this beyond the lab?</label>${seg(o, 'why', ['I want to see it used', 'I want to build a company', 'My funding or department expects it', 'A company or customer asked for it', 'Not sure yet'])}</div>
    <div class="field"><label class="f" for="whyText">In a sentence: why this, and why now?</label><input type="text" id="whyText" value="${esc(o.whyText)}"></div>
    <div class="field"><label class="f">What outcome do you want for this technology?</label>${seg(o, 'outcome', ['Start a company I help lead', 'Start a company someone else leads', 'License it to an existing company', 'Not sure yet'])}</div>
    ${showRole ? `<div class="field"><label class="f">If a company forms, what role do you want?</label>${seg(o, 'role', ['CEO or business lead', 'Technical lead (CTO or chief scientist)', 'Advisor', 'No role', 'Not sure'])}</div>` : ''}
    <div class="field"><label class="f">In the last three months, have you spent time on this outside your research duties?</label>${seg(o, 'spent', ['Yes', 'No'])}</div>
    <div class="field"><label class="f">How many hours a week can you put toward this over the next six months?</label>${seg(o, 'hours', ['Under 5', '5 to 10', '10 to 20', 'More than 20', 'Full time'])}</div>
    <div class="field"><label class="f" for="changed">Describe one thing you changed in the technology or plan because of what a customer, mentor, or reviewer told you.</label>
      <textarea id="changed" ${o.nothing ? 'disabled' : ''}>${esc(o.changed)}</textarea>
      <label class="chk"><input type="checkbox" id="nothing" ${o.nothing ? 'checked' : ''}><span>Nothing yet</span></label></div>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  const read = () => { const x = Object.assign({}, o); x.whyText = $('whyText').value; x.changed = $('changed').value; x.nothing = $('nothing').checked; return x; };
  view().querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => {
    b.onclick = () => { const x = read(); x[s.dataset.name] = b.textContent; if (!(x.outcome || '').startsWith('Start a company')) delete x.role; A._founder = x; saveDraft(); renderFounder(); };
  }));
  $('nothing').onchange = () => { A._founder = read(); renderFounder(); };
  $('go').onclick = () => {
    const x = read();
    A._founder = x;
    const sr = (x.outcome || '').startsWith('Start a company');
    const ok = x.respRole && x.why && (x.whyText || '').trim() && x.outcome && (!sr || x.role) && x.spent && x.hours && (x.nothing || (x.changed || '').trim());
    if (!ok) { $('err').textContent = 'Answer each question to continue.'; return; }
    x.whyText = x.whyText.trim();
    x.changed = x.nothing ? '' : x.changed.trim();
    delete A._founder;
    A.founder = x;
    finish('founder');
  };
  wireBack();
}

function renderProblem() {
  const p = A._problem || (P && P.problem ? { text: P.problem.text || '', none: !P.problem.known } : { text: '', none: false });
  view().innerHTML = `<div class="panel"><p class="sect">The problem</p>
    <h2 class="q">What problem does your technology solve, and which industries or types of customers have that problem?</h2>
    <div class="field"><textarea id="pt" aria-label="Problem and who has it" ${p.none ? 'disabled' : ''}>${esc(p.text)}</textarea><p class="hint">Two or three sentences is plenty.</p></div>
    <label class="chk"><input type="checkbox" id="pn" ${p.none ? 'checked' : ''}><span>We haven't pinned this down yet</span></label>
    <div class="actions"><button class="btn" id="go">Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  $('pt').oninput = () => { p.text = $('pt').value; A._problem = p; };
  $('pn').onchange = () => { p.none = $('pn').checked; p.text = $('pt').value; A._problem = p; renderProblem(); };
  $('go').onclick = () => {
    const t = $('pt').value.trim();
    if (!p.none && !t) { $('err').textContent = 'Describe the problem, or check the box.'; return; }
    delete A._problem;
    A.problem = { known: !p.none, text: p.none ? '' : t };
    finish('problem');
  };
  wireBack();
  if (!p.none) $('pt').focus();
}

function renderTech() {
  const opts = TRACK_OPTS[track(A)];
  const t = A._tech || (P && P.stage != null
    ? { stage: P.stage, ev: P.techEv || '', unsure: !!(P.unsure && P.unsure.tech) }
    : { stage: null, ev: '', unsure: false });
  view().innerHTML = `<div class="panel"><p class="sect">Technology</p>
    <h2 class="q">What is the furthest your technology has gotten?</h2><p class="hint lead">Pick the furthest point reached. Each step includes the ones above it.</p>
    <div class="opts">${['None of these yet'].concat(opts).map((o, i) => `<button class="opt" data-i="${i}" aria-pressed="${t.stage === i}"><span class="k">${i}</span>${esc(o)}</button>`).join('')}</div>
    ${t.stage >= 4 ? `<div class="field"><label class="f" for="tev">${t.stage >= 7 && A.E.c_proto ? 'Anything to add about where it was tested? (optional; you already named who used the prototype)' : 'Describe the most advanced test or use so far: what was tested, where, and with whom.'}</label><textarea id="tev">${esc(t.ev)}</textarea></div>` : ''}
    <label class="chk"><input type="checkbox" id="tu" ${t.unsure ? 'checked' : ''}><span>I'm not sure about this one</span></label>
    <div class="actions"><button class="btn" id="go" ${t.stage == null ? 'disabled' : ''}>Continue</button>${backLink()}<span class="status err" id="err"></span></div></div>`;
  view().querySelectorAll('.opt').forEach(b => {
    b.onclick = () => { t.stage = +b.dataset.i; if ($('tev')) t.ev = $('tev').value; A._tech = t; renderTech(); if ($('tev')) $('tev').focus(); };
  });
  if ($('tev')) $('tev').oninput = () => { t.ev = $('tev').value; A._tech = t; };
  $('tu').onchange = () => { t.unsure = $('tu').checked; A._tech = t; };
  $('go').onclick = () => {
    if (t.stage == null) return;
    const ev = $('tev') ? $('tev').value.trim() : '';
    if (t.stage >= 4 && !ev && !(t.stage >= 7 && A.E.c_proto)) { $('err').textContent = 'Add a short description of the test.'; return; }
    delete A._tech;
    A.stage = t.stage;
    A.techEv = t.stage >= 4 ? ev : '';
    if (t.unsure) A.unsure.tech = true;
    finish('tech');
  };
  wireBack();
}

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
    if (P) {
      // Re-take: start from last time's checks (only the ones the founder ticked,
      // not ones that were counted from other answers).
      L.user = sc.items.filter(it => P.F && P.F[it.k] === true && !(P.I && it.k in P.I) && !pre.has(it.k)).map(it => it.k);
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
    return `<div class="item${on ? ' on' : ''}"><label class="chk"><input type="checkbox" data-k="${it.k}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${esc(it.label)}${note ? `<span class="lock">${note}</span>` : ''}</span></label>${extra}</div>`;
  };
  view().innerHTML = `<div class="panel"><p class="sect">${esc(sc.sect)}</p><h2 class="q">${esc(sc.q)}</h2><p class="hint lead">Check all that apply. Leave the rest blank.</p>
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
  $('un').onchange = () => { L.unsure = $('un').checked; };
  $('go').onclick = () => {
    keep();
    const eff2 = closeSet([...pre, ...L.user]);
    const vis2 = sc.items.filter(it => pre.has(it.k) || m.itemVisible(it, eff2));
    const missing = vis2.filter(it => L.user.includes(it.k) && it.ev && !(L.ev[it.k] || '').trim());
    if (missing.length) { $('err').textContent = 'Fill in the detail under each checked item.'; return; }
    if (eff2.has('c_talk') && vis2.some(it => it.k === 'c_talk')) {
      const n = Number(L.count);
      if (L.count === '' || n < 0) { $('err').textContent = 'Enter how many people you have interviewed.'; return; }
      if (n >= 20 && !L.confirm) { $('err').textContent = 'Answer whether most confirmed the problem.'; return; }
      A.count = Math.floor(n);
      A.confirm = n >= 20 ? L.confirm : null;
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

function renderPlans() {
  const p = A._plans || { help: P && P.plans && P.plans.help ? [...P.plans.help] : [] };
  const help = ['Introductions to potential customers', 'A business co-founder or CEO', 'IP or licensing guidance', 'Help applying for SBIR/STTR or grants', 'Investor introductions', 'Product or engineering help', 'Regulatory or certification guidance', 'A mentor in my industry'];
  view().innerHTML = `<div class="panel"><p class="sect">Wrap-up</p><h2 class="q">Last, what would help most right now?</h2><p class="hint lead">Check all that apply.</p>
    <div class="field">${help.map(h => `<label class="chk"><input type="checkbox" value="${esc(h)}" ${p.help.includes(h) ? 'checked' : ''}><span>${esc(h)}</span></label>`).join('')}</div>
    <div class="actions"><button class="btn" id="go">Finish and submit</button>${backLink()}</div></div>`;
  const readHelp = () => [...view().querySelectorAll('input:checked')].map(i => i.value);
  view().querySelectorAll('input[type=checkbox]').forEach(x => { x.onchange = () => { p.help = readHelp(); A._plans = p; saveDraft(); }; });
  $('go').onclick = () => { p.help = readHelp(); delete A._plans; A.plans = p; finish('plans'); };
  wireBack();
}

/* ----- submit ----- */
function renderSubmit() {
  const st = submitState;
  const msg = st.status === 'error'
    ? `We could not save your intake: ${esc(st.message)}. Your answers are still saved in this browser.`
    : 'Saving your intake...';
  view().innerHTML = `<div class="panel"><p class="sect">Finishing up</p><h2 class="q">${st.status === 'error' ? 'Not saved yet' : 'Saving your answers'}</h2>
    <p class="status${st.status === 'error' ? ' err' : ''}" role="status">${msg}</p>
    <div class="actions">${st.status === 'error' ? '<button class="btn" id="retry">Try again</button>' : ''}${st.status === 'sending' ? '' : backLink()}</div></div>`;
  if ($('retry')) $('retry').onclick = () => { submitState = { status: 'idle' }; render(); };
  wireBack();
  if (st.status === 'idle') doSubmit();
}

async function doSubmit() {
  submitState = { status: 'sending' };
  render();
  const record = buildRecord(A, { screensAnswered: H.length, previousA: P });
  const answers = { version: VERSION, A: cleanA(A), H: H.slice() };
  try {
    const res = await submitIntake({
      submissionId: meta.submissionId,
      previousSubmissionId: (meta.previous && meta.previous.submissionId) || '',
      record,
      answers
    });
    if (!res || !res.success) throw new Error((res && res.error) || 'Unknown error');

    const submittedAt = new Date().toISOString();
    const finalA = cleanA(A);
    done = {
      returnCode: res.returnCode,
      intakeNumber: res.intakeNumber,
      emailSent: !!res.emailSent,
      name: A.about.name,
      email: A.about.email,
      institution: A.about.university,
      project: A.about.project,
      submittedAt,
      A: finalA,
      previousAt: meta.previous ? meta.previous.submittedAt : null,
      diff: P ? diffFacts(P, finalA) : null
    };
    store(LAST_KEY, {
      submissionId: meta.submissionId, submittedAt, email: done.email, project: done.project,
      returnCode: res.returnCode, answers: finalA
    });
    clearDraft();
    phase = 'done';
    submitState = { status: 'idle' };
    render();
    window.scrollTo(0, 0);
  } catch (e) {
    if (e.unauthorized) { submitState = { status: 'idle' }; showLogin(e.message); return; }
    console.warn('[Intake] Submit failed:', e);
    submitState = { status: 'error', message: e.name === 'AbortError' ? 'the server took too long to respond' : e.message };
    render();
  }
}

/* ----- thank-you ----- */
function renderDone() {
  setLayout(false);
  const d = done;
  const recap = founderRecap(d.A);
  const first = (d.name || '').split(/\s+/)[0];
  const levels = SHOW_LEVELS_TO_FOUNDER ? createModel(d.A).result().scores : null;
  view().innerHTML = `<div class="panel wide">
    <p class="sect">Submitted</p>
    <h2 class="r">Thank you${first ? ', ' + esc(first) : ''}</h2>
    <p class="meta">${esc(d.project)} · ${esc(d.institution)} · ${esc(fmtDate(d.submittedAt))}${d.intakeNumber > 1 ? ' · intake #' + esc(d.intakeNumber) : ''}</p>
    <div class="code-box">
      <p class="label">Your return code</p>
      <p class="code">${esc(d.returnCode)}</p>
      <p>${d.emailSent ? `We emailed this code to ${esc(d.email)}.` : 'We could not email this code, so write it down or download the PDF below.'} Next time, enter your email and this code to start from these answers.</p>
    </div>
    <p>Your answers have gone to the team supporting your project, and they will follow up with you. You may be asked to take this again later, for example after I-Corps, so you and your team can see how the project has moved.</p>
    ${d.diff ? `<div class="blk"><h3>Since your intake on ${esc(fmtDate(d.previousAt))}</h3>
      ${d.diff.added.length ? `<ul>${d.diff.added.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">Nothing new since last time.</p>'}
      ${d.diff.removed.length ? `<p class="muted">No longer reported: ${d.diff.removed.map(esc).join('; ')}</p>` : ''}</div>` : ''}
    ${levels ? `<div class="blk scroll"><h3>Readiness levels</h3><table><tbody>${CATS.map(c => `<tr><td>${esc(NAMES[c])}</td><td>${levels[c]}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="blk"><h3>What you told us</h3></div>
    ${recap.map(s => `<div class="blk recap"><h4>${esc(s.sect)}</h4><ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
    <div class="actions">
      <button class="btn" id="pdf">Download a PDF copy</button>
      <button class="btn ghost" id="again">Start another intake</button>
      <span class="status err" id="pdf-err"></span>
    </div></div>`;
  $('pdf').onclick = () => downloadPdf(d, recap, levels);
  $('again').onclick = () => { done = null; phase = 'start'; render(); window.scrollTo(0, 0); };
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

  line('NobleReach Venture Readiness Intake', { size: 16, bold: true, gap: 8 });
  line(`${d.project} - ${d.institution}`, { size: 11, gap: 6 });
  line(`${d.name} - ${d.email} - submitted ${fmtDate(d.submittedAt)}${d.intakeNumber > 1 ? ' - intake #' + d.intakeNumber : ''}`, { size: 9, color: 90 });
  y += 3;
  line(`Return code: ${d.returnCode}`, { size: 12, bold: true, gap: 6 });
  line('Next time, enter your email and this code to start from these answers.', { size: 9, color: 90 });

  if (d.diff) {
    y += 4;
    line(`Since your intake on ${fmtDate(d.previousAt)}`, { size: 12, bold: true, gap: 6 });
    if (d.diff.added.length) d.diff.added.forEach(x => line('- ' + x));
    else line('Nothing new since last time.');
    if (d.diff.removed.length) line('No longer reported: ' + d.diff.removed.join('; '), { color: 90 });
  }

  if (levels) {
    y += 4;
    line('Readiness levels', { size: 12, bold: true, gap: 6 });
    CATS.forEach(c => line(`${NAMES[c]}: ${levels[c]}`));
  }

  y += 4;
  line('What you told us', { size: 13, bold: true, gap: 7 });
  recap.forEach(s => {
    y += 2;
    line(s.sect, { size: 11, bold: true, gap: 6 });
    s.items.forEach(x => line('- ' + x));
  });

  y += 6;
  line('Generated by the NobleReach Venture Readiness Intake', { size: 8, color: 110, gap: 4 });
  EXPORT_ATTRIBUTION_LINES.forEach(l => line(l, { size: 7, color: 130, gap: 3.5 }));

  const safe = String(d.project || 'intake').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`NobleReach intake - ${safe} - ${new Date(d.submittedAt).toISOString().slice(0, 10)}.pdf`);
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
