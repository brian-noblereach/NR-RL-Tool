// intake-brief.js - Rule-based pre-call brief for the BRL interview. PURE.
//
// No AI: it runs for every submission, including AI opt-outs. Question
// wording lives in intake-config.js (brief.*); the selection rules live here.
//
// Questions are chosen in this priority order (merge spec, "Pre-call brief"):
//   1. one per gate signal
//   2. one per review flag
//   3. one per screen marked unsure
//   4. evidence to verify: patent application, LOI, paid pilot, interviews, prototype user
//   5. each item done ahead of the next level
//   6. the two lowest categories, as discussion prompts
// then capped at maxQuestions. If fewer than minQuestions qualify, more of the
// lowest categories are added.

import { CATS, NAMES, TRACK_LABEL } from './intake-model.js';

const EVIDENCE_ORDER = ['ip3', 'c_wtp', 'c_paid', 'c_talk', 'c_proto'];

function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (values[k] == null ? '' : String(values[k])));
}

// Lowest categories first; ties keep CATS order. Categories at 9 have no next step.
function lowestCats(result) {
  return result.cats
    .filter(c => result.next[c])
    .map(c => ({ c, s: result.scores[c] }))
    .sort((a, b) => a.s - b.s || CATS.indexOf(a.c) - CATS.indexOf(b.c))
    .map(x => x.c);
}

/**
 * @param A       answers state
 * @param result  createModel(A).result()
 * @param config  INTAKE_CONFIG (uses config.brief)
 * @returns string[] questions, 0..maxQuestions
 */
export function selectQuestions(A, result, config) {
  const b = config.brief;
  const out = [];
  const push = q => { if (q && !out.includes(q)) out.push(q); };
  const hours = (A.founder && A.founder.hours) || '';

  // 1. gate signals
  for (const g of result.gateItems) push(b.gate[g.id] && fill(b.gate[g.id], { hours: hours.toLowerCase() }));
  // 2. review flags
  for (const f of result.flagItems) push(b.flag[f.id]);
  // 3. screens marked unsure
  for (const screen of result.notSure) push(fill(b.unsure, { screen }));
  // 4. evidence to verify
  for (const k of EVIDENCE_ORDER) {
    if (result.facts[k] !== true || !b.evidence[k]) continue;
    const count = k === 'c_talk' && A.count != null ? A.count : '';
    push(fill(b.evidence[k], { count }).replace(/\s{2,}/g, ' '));
  }
  // 5. done ahead of the next level
  for (const p of result.progressItems) {
    const done = p.text.replace(/^.*? level \d+: /, '');
    push(fill(b.ahead, { done, missing: result.next[p.cat] }));
  }
  // 6. the two lowest categories, then more if below the floor
  const lows = lowestCats(result);
  const lowestQ = c => fill(b.lowest, { category: NAMES[c], next: result.next[c] });
  lows.slice(0, 2).forEach(c => push(lowestQ(c)));
  for (const c of lows.slice(2)) {
    if (out.length >= b.minQuestions) break;
    push(lowestQ(c));
  }
  return out.slice(0, b.maxQuestions);
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/**
 * A self-contained HTML brief for the BRL interview (attached to the
 * Smartsheet row as precall-brief.html, and shown to staff).
 * meta: { submissionId, submittedAt }
 */
export function buildBriefHtml(A, result, questions, meta = {}) {
  const ap = A.applicant || {}, pr = A.project || {};
  const name = [ap.first, ap.last].filter(Boolean).join(' ');
  const list = (items, empty) => items.length ? `<ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="muted">${esc(empty)}</p>`;
  const rows = result.cats.map(c => `<tr><td>${esc(NAMES[c])}</td><td class="n">${esc(result.scores[c])}</td><td>${esc(result.next[c] || '')}</td></tr>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Pre-call brief: ${esc(pr.title)}</title>
<style>
body{font:15px/1.5 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;max-width:820px;margin:24px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;color:#024A66}
.meta{color:#475569;font-size:13px;margin:0 0 16px}table{border-collapse:collapse;width:100%}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}th{font-size:12px;color:#475569}
td.n{font-weight:700;width:56px}.muted{color:#64748b}ol li,ul li{margin:0 0 6px}
.note{font-size:12px;color:#64748b;margin-top:24px}
</style></head><body>
<h1>${esc(pr.title || 'Untitled project')}</h1>
<p class="meta">${esc(name)} &middot; ${esc(ap.org)} &middot; I-Corps: ${esc(pr.icorps)} &middot; TRL track: ${esc(TRACK_LABEL[result.track])}${meta.submissionId ? ' &middot; ' + esc(meta.submissionId) : ''}${meta.submittedAt ? ' &middot; ' + esc(String(meta.submittedAt).slice(0, 10)) : ''}</p>
<h2>Questions for the call</h2>
${questions.length ? `<ol>${questions.map(q => `<li>${esc(q)}</li>`).join('')}</ol>` : '<p class="muted">None generated.</p>'}
<h2>Draft BRL levels (from the applicant's answers)</h2>
<table><thead><tr><th>Category</th><th>Level</th><th>Next level needs</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Gate signals</h2>
${list(result.gateFlags, 'None.')}
<h2>Review flags</h2>
${list(result.flags, 'None.')}
<h2>Evidence given</h2>
${list(result.evidence.map(e => e.q + ': ' + e.a), 'None.')}
<p class="note">Generated by rules from the applicant's answers, without AI. Draft levels are not advisor scores.</p>
</body></html>`;
}

export function buildBrief(A, result, config, meta = {}) {
  const questions = selectQuestions(A, result, config);
  return { questions, html: buildBriefHtml(A, result, questions, meta) };
}
