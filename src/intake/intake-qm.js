// intake-qm.js - A plain-language summary of one application, written for the
// Qualification (QM) tool. PURE.
//
// Why: the QM tool's AI only reads a website URL and uploaded files; it never
// sees spreadsheet columns. This document puts the applicant's own answers in
// a file QM can be pointed at (attached to the row as qm-input.md), organized
// the way QM's Venture Info step extracts: people, technology, problem and
// customers, applications, IP, funding, traction.
//
// Deliberately left out: draft BRL levels, gate signals, review flags, email
// and phone. Applicants who opt out of AI processing get no qm-input.md (the
// client skips it and the proxy refuses it).

import { SCREENS, closure, trlOptions, track, TRACK_LABEL, isHealth } from './intake-model.js';

const SECTION_FOR_SCREEN = {
  cust: 'Customer discovery',
  docs: 'Plans worked out and written down',
  ip: 'Intellectual property',
  team: 'Team',
  fund: 'Funding',
  reg: 'Regulatory',
  scale: 'Traction'
};

function bullets(items) {
  return items.filter(Boolean).map(x => '- ' + x).join('\n');
}

function factsFor(A, C, screenId) {
  const sc = SCREENS.find(s => s.id === screenId);
  if (!sc || !A.done || !A.done[screenId]) return [];
  return sc.items
    .filter(it => C[it.k] === true && !(it.company && !(A.project && A.project.company === 'Yes')))
    .map(it => {
      let text = it.label;
      if (it.k === 'c_talk' && A.count != null) text += ` (${A.count} interviews outside the university` + (A.count >= 20 && A.confirm ? `; most confirmed the problem: ${A.confirm}` : '') + ')';
      if (A.E && A.E[it.k]) text += ': ' + A.E[it.k];
      return text;
    });
}

/**
 * Markdown summary for the QM tool. meta: { submittedAt }
 */
export function buildQmInput(A, meta = {}) {
  const { C } = closure(A);
  const ap = A.applicant || {}, pr = A.project || {}, es = A.essays || {}, fo = A.founder || {}, cx = A.ctx || {};
  const name = [ap.first, ap.last].filter(Boolean).join(' ');
  const out = [];

  out.push(`# ${pr.title || 'Untitled project'}`);
  out.push('');
  out.push(`Prepared from the applicant's own answers on the NobleReach application${meta.submittedAt ? ' (submitted ' + String(meta.submittedAt).slice(0, 10) + ')' : ''}. These are self-reported and not yet verified.`);

  out.push('', '## Organization and status');
  out.push(bullets([
    `Project or venture name: ${pr.title || ''}`,
    pr.website ? `Website: ${pr.website}` : '',
    `Institution or organization: ${ap.org || ''}`,
    pr.company === 'Yes'
      ? `Company: formed (${pr.companyName || 'name not given'}${pr.companyType ? ', ' + pr.companyType : ''})`
      : `Company: ${pr.company === 'No' ? 'not formed yet' : 'not sure whether one has been formed'}`,
    pr.icorps ? `I-Corps: ${pr.icorps}` : '',
    cx.portfolio ? `Program: ${cx.portfolio}` : ''
  ]));

  out.push('', '## People');
  out.push(bullets([
    `${name}${ap.role ? ', ' + ap.role : ''}${ap.org ? ', ' + ap.org : ''} (applicant)`,
    ap.team ? `Other team members: ${ap.team}` : '',
    (fo.prior || []).length ? `Applicant's prior experience: ${fo.prior.join('; ')}${fo.priorDetail ? ' (' + fo.priorDetail + ')' : ''}` : '',
    fo.outcome ? `Outcome the applicant wants: ${fo.outcome}${fo.role ? ', with the applicant as ' + fo.role : ''}` : '',
    fo.hours ? `Time available: ${fo.hours} hours a week over the next six months` : ''
  ]));

  out.push('', '## Technology');
  const opt = A.stage != null ? trlOptions(A)[A.stage] : null;
  out.push(bullets([
    pr.form ? `Form: ${pr.form} (TRL track: ${TRACK_LABEL[track(A)]})` : '',
    es.science ? `Key innovation and underlying science: ${es.science}` : '',
    opt ? (A.stage === 0 ? 'Furthest stage reached: none of the listed TRL milestones yet' : `Furthest stage reached: ${opt.title}${opt.desc ? ' (' + opt.desc + ')' : ''}`) : '',
    A.techEv ? `Most advanced test or use: ${A.techEv}` : '',
    A.facilities ? `Facilities and equipment: ${A.facilities}` : ''
  ]));

  out.push('', '## Problem, customers, and value');
  out.push(bullets([
    es.value ? `Problem, target customers, and why current solutions fall short: ${es.value}` : '',
    es.noCustomers ? 'The applicant has not identified specific customers yet.' : ''
  ]));

  out.push('', '## Applications and impact');
  out.push(bullets([
    es.impact ? `Societal or economic impact and national security relevance: ${es.impact}` : '',
    (es.nsRelevance || []).length ? `Where it could be used: ${es.nsRelevance.join('; ')}` : ''
  ]));

  const screens = isHealth(A) ? ['cust', 'docs', 'ip', 'team', 'fund', 'reg', 'scale'] : ['cust', 'docs', 'ip', 'team', 'fund', 'scale'];
  for (const id of screens) {
    const facts = factsFor(A, C, id);
    if (!facts.length) continue;
    out.push('', '## ' + SECTION_FOR_SCREEN[id]);
    out.push(`Asked: "${SCREENS.find(s => s.id === id).q}" The applicant checked:`);
    out.push(bullets(facts));
  }

  return out.join('\n') + '\n';
}
