// intake-flow.js - Skip ahead and finish later. PURE: no DOM, no storage.
//
// Applicants may press Continue with required answers missing (gen-1.2, a
// tester's request): the screen's partial answers are saved, the screen is
// marked incomplete, and submitting is blocked until every screen is complete.
// Answers that are wrong rather than missing (a malformed email, too many
// words, a number out of range) still stop Continue; intake-app.js checks those.
// gen-3.0: each part is checked on its own. Part 1 can't be saved with a Part 1
// screen incomplete, and Part 2 can't be submitted with a Part 2 screen
// incomplete. Follow-up details are required on the evidence screen, not on the
// checklist that ticked them.
//
// missingRequired() lists what a screen still needs, in plain language.
// planJump() says which finished screens to set aside when the applicant goes
// back to one, so the rest can be carried forward again (see render() in
// intake-app.js, which reuses the re-take carry-forward).

import { ROLE_OPTIONS, SOURCE_ITEMS, CONVERSATIONS } from './intake-model.js';

const blank = v => v == null || String(v).trim() === '';

/**
 * Items still needed on a screen. [] when complete.
 *
 * id      screen id
 * v       the screen's values, in the shape intake-app.js keeps while editing:
 *   applicant/project/founder/consent/written/perspective: the answer object
 *   tech:     { stage }
 *   multi:    { known } (Customers only; the checklists need nothing else)
 *   evidence: { items: evidenceItems(A), ev: {key: text}, src: {key: {from, said}},
 *               count: '', confirm, techEv }
 *   people:   { roster: [person] }
 * ctx     { A, config }  (config for engagement)
 */
export function missingRequired(id, v, ctx = {}) {
  const out = [], config = ctx.config || {};
  const need = (cond, label) => { if (cond) out.push(label); };
  v = v || {};
  switch (id) {
    case 'applicant':
      need(blank(v.first), 'First name');
      need(blank(v.last), 'Last name');
      need(blank(v.email), 'Email');
      need(blank(v.org), 'University or organization');
      need(blank(v.role), 'Your role on the project');
      break;
    case 'project':
      need(blank(v.title), 'Project or technology title');
      need(blank(v.oneLiner), 'One-sentence description');
      need(blank(v.form), 'What form the technology takes');
      need(blank(v.company), 'Whether a company has been formed');
      need(v.company === 'Yes' && blank(v.companyName), 'Company name and state');
      need(blank(v.icorps), 'I-Corps');
      need(blank(v.started), 'The year work started');
      need(blank(v.appCount), 'How many applications or markets you are considering');
      break;
    case 'founder': {
      const roles = ROLE_OPTIONS[v.outcome];
      need(blank(v.why), 'Main reason');
      need(blank(v.outcome), 'Outcome you want');
      need(!!roles && !roles.includes(v.role), 'The role you want');
      need(blank(v.spent), 'Time spent in the last three months');
      need(blank(v.hours), 'Hours a week');
      need(blank(v.fullTime), 'Whether anyone plans to work on it full time');
      need(!!config.engagement && blank(v.engagement), 'The engagement commitment');
      break;
    }
    case 'tech':
      need(v.stage == null, 'How far the technology has gotten');
      break;
    case 'cust':
      need(blank(v.known), 'Whether you have identified specific customers or users');
      break;
    case 'evidence': {
      const items = v.items || { sources: [], details: [] }, ev = v.ev || {}, src = v.src || {};
      if (items.count) {
        need(blank(v.count), 'How many people you have interviewed');
        need(Number(v.count) > 0 && blank(v.confirm), 'Whether most confirmed the problem');
      }
      for (const k of items.sources) {
        const s = src[k] || {};
        if (!(s.from || []).length) out.push('Where this comes from: ' + SOURCE_ITEMS[k]);
        else if (s.from.includes(CONVERSATIONS) && blank(s.said)) out.push('How many people said this: ' + SOURCE_ITEMS[k]);
      }
      // At TRL 7+ the test description is optional once the prototype user is named.
      need(items.techEv === 'required' && blank(v.techEv), 'The most advanced test or use');
      need(items.techEv === 'optional' && blank(v.techEv) && blank(ev.c_proto), 'The most advanced test or use');
      for (const d of items.details) {
        if (!d.optional && blank(ev[d.k])) out.push('Detail for: ' + d.label);
      }
      break;
    }
    case 'consent':
      need(!v.ack, 'Confirm you\'ve read how NobleReach handles your submission');
      break;
    case 'written':
      need(blank(v.technology), 'What the technology is and how it works');
      need(blank(v.applications), 'Where it could be used, and for whom');
      break;
    case 'perspective':
      need(blank(v.whyText), 'Why this, and why now');
      need(!v.nothing && blank(v.changed), 'One thing you changed because of feedback (or "Nothing yet")');
      break;
    case 'people':
      need((v.roster || []).some(p => (p.name || p.role || p.time || p.link || p.expertise) && (blank(p.name) || blank(p.role) || blank(p.time))),
        'Name, role, and time for each person listed');
      break;
    default:
      // the other checklist screens: nothing is required (they say "None of these, continue")
      break;
  }
  return out;
}

/**
 * Going back to `targetId` from the end of the stack H (finished screen ids,
 * in order): the screens after it are set aside and carried forward again
 * once the target is finished.
 * Returns { carry: [ids after the target, in order] }, or null if the target
 * isn't in H.
 */
export function planJump(H, targetId) {
  const at = H.indexOf(targetId);
  if (at === -1) return null;
  return { carry: H.slice(at + 1) };
}
