// intake-model.js - Founder intake question model and scoring. PURE: no DOM,
// no storage, no network. Ported from docs/venture-intake.html (phys-0.4).
//
// The founder answers facts ("which of these has happened"), never ratings.
// gateVal() maps facts to each BRL level; scan() applies the strict ladder
// (a level counts only if every lower level is also true).
//
// CONTENT RULE: CATS, NAMES, TRACK_OPTS, NEXT, IMPLIES, and SCREENS below are
// copied verbatim from the prototype. The wording is Brian's (see CLAUDE.md
// editing rules) — do not reword without sign-off. The only code change is
// that SCREENS[].when receives the fact lookup as an argument instead of
// reading a global.
//
// Answers state `A`:
//   { about, founder, problem, stage, techEv, F:{fact:bool}, E:{fact:text},
//     I:{fact:sourceFact}, count, confirm, unsure:{screenId:true}, plans,
//     done:{screenId:true} }

/* ---------- question model: facts, screens, scoring ---------- */
export const CATS=['TRL','IP','Product','Market','GTM','Business','Team','Funding'];
export const NAMES={TRL:'Technology',IP:'Intellectual property',Product:'Product',Market:'Market',GTM:'Go-to-market',Business:'Business model',Team:'Team',Funding:'Funding'};
export const TRACK_OPTS={
 General:['Basic principles observed and written up (paper, thesis, or lab report)','A specific application written down: what it would do and for whom','An experiment or analysis showed the key function works','Main parts put together and tested as one system in the lab','System tested in conditions that resemble real use','Prototype close to the final design built and tested','Prototype tested with real users where it would actually be used','Final version complete, testing finished, ready for production','Final product in regular use under real operating conditions'],
 Software:['Core algorithms or methods worked out','Architecture designed and key features listed','Early working version (alpha) performs the core function','Main modules combined into a minimum viable product someone outside the team could use','Tested under realistic data volumes or user load, and checked for security problems','Release candidate has passed acceptance testing with intended users','Deployed and used by real users in their own work','Full production release meeting agreed reliability or uptime commitments','Deployed at scale across multiple customer organizations'],
 Hardware:['Physical principles understood, with a basic concept sketch or drawing','Technical specifications drafted and components listed','Rough bench prototype (breadboard) demonstrates the key function','Components integrated into one prototype system and tested in the lab','Prototype passed testing under realistic conditions (temperature, vibration, durability) and works reliably','Prototype built close to how it would be manufactured, with field testing started','Small pilot production run made and tested successfully by customers','Production line set up with quality controls','Full production with a working supply chain'],
};
export const NEXT={
 IP:['Identify what could be protected','Invention disclosure filed or patent attorney engaged','Patent application filed','Licensing conversations','Full application moving through the patent office','Patent issued or license signed','Multiple filings, including outside the US','Two or more patents issued','Patents protect the product, with an enforcement plan'],
 Product:['Name the problem and who has it','Describe the product and why users want it','Users react to the concept','Outside users try a working prototype','Users get real value from a minimum version','Roadmap from user feedback and a pricing strategy','Ready to produce or deploy at scale','Commercially available','Customer feedback drives engineering'],
 Market:['Name target industries or customer types','Estimate market size and list competitors','Say why customers would choose you','20 or more customer interviews that confirm the problem','Written commitment to pay (LOI, PO, paid pilot)','Document market barriers and track competitors','Ongoing customer relationships shaping the product','Independent validation of market position','Customers using it at scale'],
 GTM:['Choose a first market and customer type','Identify user, buyer, and approver','Map how customers would buy','Test the buying path with real customers','Written go-to-market plan with owners','Structured outreach with sales materials','Repeatable lead generation with conversion tracked','Know acquisition cost; set growth targets from sales data','Documented playbook across channels'],
 Business:['Describe what you would sell and to whom','Revenue sources and main costs (business model canvas)','Business plan with 12 to 18 month milestones','Test a price with customers','A paid pilot, test sale, or contract','Ongoing revenue from the intended model','Repeat purchases and positive unit economics','Metrics improving as sales grow','Growing recurring revenue'],
 Team:['Someone committed to spending time on commercialization','Founders agreement on ownership and roles','Add a key technical or business person','Advisors giving regular input','Defined roles; main technical and business roles filled','All needed skills, including an experienced business lead','Two-year organization plan','Experienced management and a working board','Stable, high-performing leadership over years'],
 Funding:['Know the funding options and what each expects','Form a company','12-month projection and cap table','Pitch deck and three-year model','Legal documents ready for investor review','Data room and counsel review','Meeting multiple investors','Investors in due diligence','Term sheet received'],
};
/* Implications: if the first fact is true, the listed facts are true. */
export const IMPLIES={
 ftime:['t_commit'], c_mvp:['c_proto'], c_proto:['c_concept'], c_concept:['c_talk','d_product'],
 c_path:['c_talk','d_path'], c_outreach:['c_talk'], c_price:['c_talk','d_business'], c_wtp:['c_talk'],
 c_paid:['c_wtp','c_price'], c_rev:['c_paid'],
 ip3:['ip2'], ip2:['ip1'], ip5:['ip3'], ip7:['ip3'], ip8:['ip6','ip5'],
 d_product:['d_business'], d_roles:['d_first'], f_applied:['f1'], f_received:['f_applied'],
 t_full:['t_roles'], t_roles:['t_commit'], t_agree:['t_commit'], t_added:['t_commit'],
};
export const SCREENS=[
 {id:'about',type:'about',sect:'About you'},
 {id:'founder',type:'founder',sect:'You and the project'},
 {id:'problem',type:'problem',sect:'The problem'},
 {id:'cust',type:'multi',sect:'Customers',q:'Which of these have happened with potential customers or users outside your university?',items:[
   {k:'c_talk',cat:'Market',lvl:4,label:'Talked with them about the problem',special:'count'},
   {k:'c_concept',cat:'Product',lvl:3,label:'Shown them a description, sketch, or mockup of the product, and they found it useful'},
   {k:'c_proto',cat:'Product',lvl:4,label:'Had them use a working prototype and give feedback',ev:'Who used it? Organization and role'},
   {k:'c_mvp',cat:'Product',lvl:5,label:'They get real value today from a minimum version of the product',showIf:s=>s.has('c_proto')},
   {k:'c_path',cat:'GTM',lvl:4,label:'Tested how they would buy, and changed your approach based on what you learned'},
   {k:'c_outreach',cat:'GTM',lvl:6,label:'Reached out to them in a structured way using your own sales materials (one-pager, deck, demo)'},
   {k:'c_price',cat:'Business',lvl:4,label:'Tested a specific price with them'},
   {k:'c_wtp',cat:'Market',lvl:5,label:'Received a letter of intent, purchase order, or a written price they would accept',ev:'Which organization?'},
   {k:'c_paid',cat:'Business',lvl:5,label:'One paid for a test sale, paid pilot, or contract',ev:'Who paid, and for what?',showIf:s=>s.has('c_wtp')||s.has('c_price')},
   {k:'c_rev',cat:'Business',lvl:6,label:'You earn ongoing revenue from the model you plan to grow',showIf:s=>s.has('c_paid')},
 ]},
 {id:'docs',type:'multi',sect:'Plans on paper',q:'Which of these have you worked out and written down?',items:[
   {k:'d_product',cat:'Product',lvl:2,label:'The product you would sell, who would buy it, and why they would want it'},
   {k:'d_first',cat:'GTM',lvl:1,label:'Which one market and type of customer you will start with'},
   {k:'d_roles',cat:'GTM',lvl:2,label:'For that first customer: who uses the product, who pays, and who approves the purchase',showIf:s=>s.has('d_first')},
   {k:'d_path',cat:'GTM',lvl:3,label:'How a customer would go from first hearing about you to buying, and how the product reaches them'},
   {k:'d_size',cat:'Market',lvl:2,label:'An estimate of market size (how many potential customers and what they spend)'},
   {k:'d_comp',cat:'Market',lvl:2,label:'Your main competitors'},
   {k:'d_why',cat:'Market',lvl:3,label:'Why a customer would choose you over the best option they have today',ev:'In a sentence or two, why would they choose you?'},
   {k:'d_barriers',cat:'Market',lvl:6,label:'The main barriers to entering this market (regulations, certifications, incumbents, procurement rules), with a regular way to track competitors'},
   {k:'d_bmc',cat:'Business',lvl:2,label:'Revenue sources and main costs (a business model canvas or similar)'},
   {k:'d_plan',cat:'Business',lvl:3,label:'A business plan with revenue and cost estimates and milestones for the next 12 to 18 months'},
   {k:'d_gtmplan',cat:'GTM',lvl:5,label:'A go-to-market plan that says who handles product, marketing, and sales'},
   {k:'d_roadmap',cat:'Product',lvl:6,label:'A product roadmap shaped by user feedback, and a pricing strategy',showIf:s=>s.has('d_product')},
 ]},
 {id:'tech',type:'tech',sect:'Technology'},
 {id:'ip',type:'multi',sect:'Intellectual property',q:'Which of these are true for the IP behind your technology?',items:[
   {k:'ip1',cat:'IP',lvl:1,label:'We have identified which parts might be patentable or otherwise protectable'},
   {k:'ip2',cat:'IP',lvl:2,label:"An invention disclosure is filed with the university's tech transfer office, or a patent attorney is engaged"},
   {k:'ip3',cat:'IP',lvl:3,label:'A patent application has been filed (provisional or full)',ev:'Application number(s)'},
   {k:'ip4',cat:'IP',lvl:4,label:'There have been conversations about licensing it, to a company or from the university'},
   {k:'ip5',cat:'IP',lvl:5,label:'A full (non-provisional) application is moving through the patent office',showIf:s=>s.has('ip3')},
   {k:'ip6',cat:'IP',lvl:6,label:'At least one patent has been issued, or a company has signed a license',ev:'Patent number, or the licensee and date signed',showIf:s=>s.has('ip3')||s.has('ip4')},
   {k:'ip7',cat:'IP',lvl:7,label:'Multiple applications filed, including at least one outside the US',showIf:s=>s.has('ip3')},
   {k:'ip8',cat:'IP',lvl:8,label:'Two or more patents have been issued',showIf:s=>s.has('ip6')},
   {k:'ip9',cat:'IP',lvl:9,label:'Issued patents protect the main product you sell, with a plan to enforce them',showIf:s=>s.has('ip8')},
   {k:'ip_search',label:'A search for related patents (prior art or landscape search)'},
   {k:'ip_fto',label:'A freedom-to-operate review'},
   {k:'ip_soft',label:'Software copyright or trade secret protection'},
 ]},
 {id:'team',type:'multi',sect:'Team',q:'Which of these describe the people working on this?',items:[
   {k:'t_commit',cat:'Team',lvl:1,label:'At least one person spends regular time moving this toward a business, beyond the research itself'},
   {k:'t_agree',cat:'Team',lvl:2,label:'The founders have written down how ownership is split and who does what'},
   {k:'t_added',cat:'Team',lvl:3,label:'Someone has joined beyond the original founders in a key technical or business role (equity can still be undecided)'},
   {k:'t_adv',cat:'Team',lvl:4,label:'Advisors or mentors with relevant industry experience give input on a regular basis'},
   {k:'t_roles',cat:'Team',lvl:5,label:'Every core member has a defined role, and the main technical and business roles are filled'},
   {k:'t_full',cat:'Team',lvl:6,label:'The team has every skill needed right now, including experienced business leadership, and everyone spends significant time'},
   {k:'t_orgplan',cat:'Team',lvl:7,label:'There is a written plan for how the organization will grow over the next two years',company:true},
   {k:'t_board',cat:'Team',lvl:8,label:'There is an experienced management team and a board that meets regularly',company:true},
   {k:'t_stable',cat:'Team',lvl:9,label:'The leadership team has stayed in place and performed well over several years',company:true,showIf:s=>s.has('t_board')},
 ]},
 {id:'fund',type:'multi',sect:'Funding',q:'Which of these funding steps have you taken?',items:[
   {k:'f1',cat:'Funding',lvl:1,label:'You can name the funding options that fit your stage (SBIR/STTR, angels, venture capital, strategic partners) and what each expects'},
   {k:'f_applied',label:'Applied for SBIR/STTR or other grants'},
   {k:'f_received',label:'Received SBIR/STTR or other grant funding'},
   {k:'f_proj',label:'A 12-month financial projection'},
   {k:'f_cap',company:true,label:'A cap table showing who owns what share of the company'},
   {k:'f_deck',label:'A pitch deck'},
   {k:'f_model',label:'A three-year financial model with revenue projections'},
   {k:'f5',cat:'Funding',lvl:5,company:true,label:'Legal documents organized for investor review (IP assigned to the company, key contracts, employment agreements)'},
   {k:'f6',cat:'Funding',lvl:6,company:true,label:'A data room ready for investors, with documents reviewed by experienced counsel',showIf:s=>s.has('f5')},
   {k:'f7',cat:'Funding',lvl:7,company:true,label:'Actively meeting with multiple investors'},
   {k:'f8',cat:'Funding',lvl:8,company:true,label:'Two or more investors doing due diligence now',showIf:s=>s.has('f7')},
   {k:'f9',cat:'Funding',lvl:9,company:true,label:'Received one or more term sheets',showIf:s=>s.has('f8')},
 ]},
 {id:'scale',type:'multi',sect:'Traction',when:v=>v('c_mvp')===true||v('c_rev')===true,q:'Which of these are true today?',items:[
   {k:'s_m7',cat:'Market',lvl:7,label:'Ongoing customer or partner relationships whose feedback changes your product or plans'},
   {k:'s_m8',cat:'Market',lvl:8,label:'An independent party (investor, analyst, industry body, or major customer) has validated your market position'},
   {k:'s_m9',cat:'Market',lvl:9,label:'Customers are using the product at meaningful scale'},
   {k:'s_p7',cat:'Product',lvl:7,label:'The product can be produced or deployed at scale (manufacturing and suppliers in place, or scalable and secure software)'},
   {k:'s_p8',cat:'Product',lvl:8,label:'The product is commercially available, with sales materials and legal terms in place'},
   {k:'s_p9',cat:'Product',lvl:9,label:'Customer feedback and the roadmap drive what engineering builds, through a regular release process'},
   {k:'s_g7',cat:'GTM',lvl:7,label:'A repeatable sales process brings in new leads every month, and you track how many become customers'},
   {k:'s_g8',cat:'GTM',lvl:8,label:'You know your cost to acquire a customer and set growth targets from your sales numbers'},
   {k:'s_g9',cat:'GTM',lvl:9,label:'A documented sales and marketing playbook works across more than one channel'},
   {k:'s_b7',cat:'Business',lvl:7,label:'Customers come back, renew, or expand, and each sale earns more than it costs to deliver'},
   {k:'s_b8',cat:'Business',lvl:8,label:'Key business metrics keep improving as sales grow'},
   {k:'s_b9',cat:'Business',lvl:9,label:'Recurring revenue is growing'},
 ]},
 {id:'plans',type:'plans',sect:'Wrap-up'},
];

/* ---------- constants added for the RL Tool port ---------- */

// Question-model version recorded with every submission. The questions and
// scoring rules are unchanged from the tested prototype.
export const VERSION = 'phys-0.4';

// Founders do not see numeric levels (workshop guidance, Oct 2026). Flip this
// only with sign-off; the end screen and PDF read it.
export const SHOW_LEVELS_TO_FOUNDER = false;

// Intake category keys -> readinessData keys, for a later self-score vs
// advisor-score comparison. Storage keeps the intake's own keys.
export const INTAKE_TO_BRL_KEY = {
  TRL: 'Technology', IP: 'IP', Product: 'Product', Market: 'Market',
  GTM: 'Go-to-Market', Business: 'Business', Team: 'Team', Funding: 'Funding'
};

// Plain-language label for every fact key.
export const LABEL = {};
SCREENS.forEach(s => (s.items || []).forEach(it => { LABEL[it.k] = it.label; }));
LABEL.ftime = 'Spent time on this outside research duties in the last three months';

/* ---------- state and evaluation ---------- */

export function freshAnswers() {
  return { F: {}, E: {}, unsure: {}, done: {} };
}

/* in-screen implication closure over a set of keys */
export function closeSet(keys) {
  const s = new Set(keys);
  let ch = true;
  while (ch) {
    ch = false;
    for (const k of [...s]) for (const b of (IMPLIES[k] || [])) if (!s.has(b)) { s.add(b); ch = true; }
  }
  return s;
}

/* every fact implied by the answers so far; `by` records which fact implied it */
export function closure(A) {
  const C = Object.assign({}, A.F), by = {};
  if (A.founder) C.ftime = A.founder.spent === 'Yes';
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, bs] of Object.entries(IMPLIES)) {
      if (C[a] === true) for (const b of bs) if (C[b] !== true) { C[b] = true; by[b] = a; changed = true; }
    }
  }
  return { C, by };
}

const and3 = (...xs) => xs.some(x => x === false) ? false : xs.every(x => x === true) ? true : undefined;

export function track(A) {
  const t = A.about && A.about.tech;
  return t === 'Software' ? 'Software' : t === 'Hardware or physical device' ? 'Hardware' : 'General';
}

/**
 * Evaluate an answers state. Recreate after every change (it is cheap).
 * Returns the prototype's evaluation functions bound to `A`.
 */
export function createModel(A) {
  const { C, by } = closure(A);
  const val = k => C[k];

  /* maps facts to each BRL level. This is the scoring rule. */
  function gateVal(cat, l) {
    const v = val;
    switch (cat) {
      case 'TRL': return A.stage == null ? undefined : A.stage >= l;
      case 'Funding':
        if (l === 2) return A.about ? A.about.company === 'Yes' : undefined;
        if (l === 3) return and3(v('f_proj'), v('f_cap'));
        if (l === 4) return and3(v('f_deck'), v('f_model'));
        return v('f' + l);
      case 'IP': return v('ip' + l);
      case 'Team': return v(['t_commit', 't_agree', 't_added', 't_adv', 't_roles', 't_full', 't_orgplan', 't_board', 't_stable'][l - 1]);
      case 'Market':
        if (l === 1) return A.problem ? A.problem.known : undefined;
        if (l === 2) return and3(v('d_size'), v('d_comp'));
        if (l === 3) return v('d_why');
        if (l === 4) {
          const t = v('c_talk');
          if (t !== true) return t;
          if (!A.done.cust) return undefined;
          return (A.count || 0) >= 20 && A.confirm === 'Yes';
        }
        return v(['c_wtp', 'd_barriers', 's_m7', 's_m8', 's_m9'][l - 5]);
      case 'Product':
        if (l === 1) return A.problem ? A.problem.known : undefined;
        return v([null, 'd_product', 'c_concept', 'c_proto', 'c_mvp', 'd_roadmap', 's_p7', 's_p8', 's_p9'][l - 1]);
      case 'GTM': return v(['d_first', 'd_roles', 'd_path', 'c_path', 'd_gtmplan', 'c_outreach', 's_g7', 's_g8', 's_g9'][l - 1]);
      case 'Business': return v(['d_business', 'd_bmc', 'd_plan', 'c_price', 'c_paid', 'c_rev', 's_b7', 's_b8', 's_b9'][l - 1]);
    }
  }

  /* level reached so far, and the first level known to be false (the cap) */
  function scan(cat) {
    let level = 0, open = true, cap = null;
    for (let l = 1; l <= 9; l++) {
      const g = gateVal(cat, l);
      if (open && g === true) level = l; else open = false;
      if (g === false && cap == null) cap = l;
    }
    return { level, cap };
  }

  function itemVisible(it, local) {
    if (it.company && !(A.about && A.about.company === 'Yes')) return false;
    if (it.showIf && !it.showIf(local)) return false;
    return true;
  }

  function screenActive(sc) { return !sc.when || sc.when(val); }

  function hasItems(sc) {
    if (sc.type !== 'multi') return true;
    const pre = new Set(sc.items.filter(it => C[it.k] === true).map(it => it.k));
    const eff = closeSet([...pre]);
    return sc.items.some(it => !pre.has(it.k) && itemVisible(it, eff));
  }

  function activeScreens() { return SCREENS.filter(s => A.done[s.id] || (screenActive(s) && hasItems(s))); }
  function nextScreen() { return SCREENS.find(s => !A.done[s.id] && screenActive(s) && hasItems(s)); }

  /* consistency flags for the reviewer */
  function flags() {
    const f = [], v = k => val(k) === true, p = Object.assign({}, A.founder || {}, { help: (A.plans || {}).help || [] });
    if ((v('c_paid') || v('c_rev')) && !(A.count > 0)) f.push('Reports a paid pilot or revenue but no customer interviews counted');
    if (v('c_rev') && A.about && A.about.company !== 'Yes') f.push('Reports ongoing revenue but no company formed');
    if (v('t_full') && (p.help || []).includes('A business co-founder or CEO')) f.push('Says the team has experienced business leadership but asks for a business co-founder or CEO');
    if ((A.stage || 0) >= 7 && val('c_proto') !== true) f.push('Technology answer says it was tested with real users, but no outside user is reported trying a working prototype');
    if (A.count >= 20 && A.confirm !== 'Yes') f.push('20 or more interviews, but most did not clearly confirm the problem (' + (A.confirm || 'no answer') + ')');
    return f;
  }

  /* gate signals for the hub reviewer; respondents never see them */
  function gateFlags() {
    const f = [], o = A.founder;
    if (!o) return f;
    if (o.why === 'My funding or department expects it') f.push('Main reason given is that funding or the department expects it');
    if (o.why === 'Not sure yet') f.push('Not sure yet why they want to take this beyond the lab');
    if (o.outcome === 'Not sure yet') f.push('No outcome in mind yet');
    if (o.spent === 'No') f.push('No time spent on this outside research duties in the last three months');
    if (o.spent === 'No' && ['10 to 20', 'More than 20', 'Full time'].includes(o.hours)) f.push('Plans ' + (o.hours === 'Full time' ? 'to work full time' : o.hours.toLowerCase() + ' hours a week') + ' on it but has spent no time on it yet');
    if (o.hours === 'Under 5') f.push('Under 5 hours a week available');
    if (o.outcome === 'Start a company I help lead' && o.hours === 'Under 5') f.push('Wants to help lead a company with under 5 hours a week');
    if (o.nothing && A.about && A.about.icorps === 'Finished') f.push('Finished I-Corps but reports nothing changed from customer or mentor feedback');
    return f;
  }

  /* full reviewer result (prototype's result()) */
  function result(screensAnswered = 0) {
    const scores = {}, next = {}, trk = track(A);
    for (const c of CATS) {
      const s = scan(c);
      scores[c] = s.level;
      next[c] = s.level >= 9 ? '' : (c === 'TRL' ? TRACK_OPTS[trk][s.level] : NEXT[c][s.level]);
    }
    const implied = Object.entries(Object.assign({}, A.I || {}, by))
      .filter(([k]) => LABEL[k] && A.F[k] !== false)
      .map(([k, src]) => LABEL[k] + (src ? ' (from: ' + (LABEL[src] || src) + ')' : ''));
    const evidence = [];
    if (A.problem && A.problem.text) evidence.push({ q: 'Problem and who has it', a: A.problem.text });
    if (A.techEv) evidence.push({ q: 'Most advanced test or use', a: A.techEv });
    if (A.count != null) evidence.push({ q: 'Customer interviews outside the university', a: String(A.count) + (A.count >= 20 ? ' (most confirmed the problem: ' + (A.confirm || '') + ')' : '') });
    for (const [k, a] of Object.entries(A.E)) evidence.push({ q: LABEL[k], a });
    if (A.about && A.about.company === 'Yes') evidence.push({ q: 'Company name and state', a: A.about.companyName });
    const extras = ['ip_search', 'ip_fto', 'ip_soft', 'f_applied', 'f_received'].filter(k => C[k] === true).map(k => LABEL[k]);
    const progress = [];
    for (const c of CATS) {
      const s = scan(c);
      for (let l = s.level + 2; l <= 9; l++) {
        if (gateVal(c, l) === true) progress.push(NAMES[c] + ' level ' + l + ': ' + (c === 'TRL' ? TRACK_OPTS[trk][l - 1] : NEXT[c][l - 1]));
      }
    }
    const notSure = Object.keys(A.unsure || {}).map(id => SCREENS.find(s => s.id === id).sect);
    return {
      version: VERSION, founder: A.founder || {}, gateFlags: gateFlags(), about: A.about, track: trk,
      scores, next, flags: flags(), implied, evidence, extras, progress, notSure,
      plans: A.plans || {}, screens: screensAnswered, facts: C, stage: A.stage
    };
  }

  return { A, C, by, val, gateVal, scan, itemVisible, screenActive, hasItems, activeScreens, nextScreen, flags, gateFlags, result };
}

/* ---------- comparisons between two intakes ---------- */

/**
 * What changed between a previous intake and this one, in plain language.
 * Includes the technology milestone when it moved.
 */
export function diffFacts(prevA, A) {
  const before = closure(prevA).C, after = closure(A).C;
  const keys = Object.keys(LABEL);
  const added = keys.filter(k => after[k] === true && before[k] !== true).map(k => LABEL[k]);
  const removed = keys.filter(k => before[k] === true && after[k] !== true).map(k => LABEL[k]);
  const s0 = prevA.stage || 0, s1 = A.stage || 0;
  if (s1 > s0) added.unshift('Technology: ' + TRACK_OPTS[track(A)][s1 - 1]);
  if (s1 < s0) removed.unshift('Technology: ' + TRACK_OPTS[track(prevA)][s0 - 1]);
  return { added, removed };
}

export function formatDiff(d) {
  const parts = [];
  if (d.added.length) parts.push('Added: ' + d.added.join('; '));
  if (d.removed.length) parts.push('No longer reported: ' + d.removed.join('; '));
  return parts.join(' | ') || 'No changes';
}

/* ---------- outputs ---------- */

/**
 * One Smartsheet row, keyed by column title. Includes reviewer-only fields
 * (levels, gate signals, flags) — never shown to the founder.
 */
export function buildRecord(A, { screensAnswered = 0, previousA = null } = {}) {
  const r = createModel(A).result(screensAnswered);
  const a = A.about || {}, p = A.plans || {}, fo = A.founder || {};
  const rec = {
    'Name': a.name,
    'Email': a.email,
    'Institution': a.university,
    'Project': a.project,
    'I-Corps Stage': a.icorps,
    'Technology Type': a.tech,
    'Technology Track': r.track,
    'Company Formed': a.company,
    'Company Name and State': a.companyName
  };
  for (const c of CATS) rec['Self: ' + c] = r.scores[c];
  for (const c of CATS) rec['Next: ' + c] = r.next[c];
  Object.assign(rec, {
    'Respondent Role': fo.respRole,
    'Main Reason': fo.why,
    'Why (their words)': fo.whyText,
    'Outcome Wanted': fo.outcome,
    'Role Wanted': fo.role,
    'Spent Time Last 3 Months': fo.spent,
    'Hours per Week': fo.hours,
    'Changed From Feedback': fo.nothing ? 'Nothing yet' : fo.changed,
    'Gate Signals': r.gateFlags.join('; '),
    'Review Flags': r.flags.join('; '),
    'Unsure About': r.notSure.join('; '),
    'Counted From Other Answers': r.implied.join('; '),
    'Evidence': r.evidence.map(e => e.q + ': ' + e.a).join(' | '),
    'Done Ahead of Next Level': r.progress.join('; '),
    'Also Done': r.extras.join('; '),
    'Help Wanted': (p.help || []).join('; '),
    'Facts True': Object.keys(r.facts).filter(k => r.facts[k] === true).sort().join(', '),
    'Form Version': VERSION,
    'Screens Answered': screensAnswered
  });
  if (previousA) rec['Changes Since Previous'] = formatDiff(diffFacts(previousA, A));
  return rec;
}

/**
 * What the founder sees and keeps: their own answers, grouped by section.
 * Contains no levels, next-level text, gate signals, or review flags.
 * Returns [{ sect, items: [string] }].
 */
export function founderRecap(A) {
  const { C } = closure(A);
  const a = A.about || {}, fo = A.founder || {};
  const sections = [];

  if (A.about) {
    sections.push({ sect: 'About you', items: [
      'Project: ' + a.project,
      'Institution: ' + a.university,
      'I-Corps: ' + a.icorps,
      'Technology type: ' + a.tech,
      a.company === 'Yes' ? 'Company formed: ' + a.companyName : 'Company formed: ' + a.company
    ] });
  }

  if (A.founder) {
    const items = [
      'Your role: ' + fo.respRole,
      'Main reason: ' + fo.why + (fo.whyText ? ' (' + fo.whyText + ')' : ''),
      'Outcome you want: ' + fo.outcome + (fo.role ? ', as ' + fo.role : ''),
      'Time on this in the last three months: ' + fo.spent,
      'Hours a week available: ' + fo.hours,
      'Changed from feedback: ' + (fo.nothing ? 'Nothing yet' : fo.changed)
    ];
    sections.push({ sect: 'You and the project', items });
  }

  if (A.problem) {
    sections.push({ sect: 'The problem', items: [A.problem.known ? A.problem.text : 'Not pinned down yet'] });
  }

  for (const sc of SCREENS) {
    if (sc.id === 'tech' && A.stage != null) {
      const items = [A.stage === 0 ? 'None of the listed milestones yet' : 'Furthest point reached: ' + TRACK_OPTS[track(A)][A.stage - 1]];
      if (A.techEv) items.push('Most advanced test or use: ' + A.techEv);
      sections.push({ sect: 'Technology', items });
    }
    if (sc.type !== 'multi' || !A.done[sc.id]) continue;
    const items = sc.items
      .filter(it => C[it.k] === true && !(it.company && a.company !== 'Yes'))
      .map(it => {
        let text = it.label;
        if (it.k === 'c_talk' && A.count != null) text += ' (' + A.count + ' interviews)';
        if (A.E[it.k]) text += ': ' + A.E[it.k];
        return text;
      });
    sections.push({ sect: sc.sect, items: items.length ? items : ['None yet'] });
  }

  const help = (A.plans && A.plans.help) || [];
  if (A.plans) sections.push({ sect: 'What would help most', items: help.length ? help : ['Nothing selected'] });

  return sections;
}
