// intake-flow.js - Skip ahead and finish later. PURE: no DOM, no storage.
//
// Applicants may press Continue with required answers missing (gen-1.2, a
// tester's request): the screen's partial answers are saved, the screen is
// marked incomplete, and submitting is blocked until every screen is complete.
// Answers that are wrong rather than missing (a malformed email, too many
// words, a number out of range) still stop Continue; intake-app.js checks those.
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
 *   applicant/project/essays/founder/materials: the answer object
 *   tech:  { stage, ev }
 *   multi: { visible: [item], eff: Set, user: [key], ev: {key: text},
 *            count: '', confirm, src: {key: {from, said}}, roster: [person] }
 * ctx     { A, config }  (A for answers on other screens, config for engagement)
 */
export function missingRequired(id, v, ctx = {}) {
  const out = [], A = ctx.A || {}, config = ctx.config || {};
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
      break;
    case 'essays':
      need(blank(v.science), 'The key innovation');
      need(blank(v.value), 'The problem and target customers');
      need(blank(v.impact), 'The anticipated impact');
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
      need(v.stage >= 4 && blank(v.ev) && !(v.stage >= 7 && A.E && A.E.c_proto), 'The most advanced test or use');
      break;
    case 'materials':
      need(!v.ack, 'Confirm you\'ve read how NobleReach handles your submission');
      break;
    default: {
      // checklist screens
      const visible = v.visible || [], eff = v.eff || new Set(), user = v.user || [];
      const ev = v.ev || {}, src = v.src || {};
      for (const it of visible) {
        if (!user.includes(it.k)) continue;
        if (it.ev && !it.evOptional && blank(ev[it.k])) out.push('Detail for: ' + it.label);
        if (SOURCE_ITEMS[it.k]) {
          const s = src[it.k] || {};
          if (!(s.from || []).length) out.push('Where this comes from: ' + SOURCE_ITEMS[it.k]);
          else if (s.from.includes(CONVERSATIONS) && blank(s.said)) out.push('How many people said this: ' + SOURCE_ITEMS[it.k]);
        }
      }
      if (eff.has('c_talk') && visible.some(it => it.k === 'c_talk')) {
        need(blank(v.count), 'How many people you have interviewed');
        need(Number(v.count) > 0 && blank(v.confirm), 'Whether most confirmed the problem');
      }
      need((v.roster || []).some(p => (p.name || p.role || p.time || p.link || p.expertise) && (blank(p.name) || blank(p.role) || blank(p.time))),
        'Name, role, and time for each person listed');
    }
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
