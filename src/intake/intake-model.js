// intake-model.js - Venture intake question model and scoring. PURE: no DOM,
// no storage, no network.
//
// The applicant answers facts ("which of these has happened"), never ratings.
// gateVal() maps facts to each BRL level; scan() applies the strict ladder
// (a level counts only if every lower level is also true).
//
// History: ported from docs/venture-intake.html (phys-0.4), then merged with
// Katy Lenshin's application per docs/superpowers/specs/2026-10-20-venture-
// intake-merge-spec.md (gen-1.0).
//
// CONTENT RULE (CLAUDE.md rule 1c): the wording in TRACK_OPTS, NEXT, IMPLIES,
// SCREENS, and the gate-signal / flag text is Brian's. Prototype strings are
// kept verbatim; strings added by the merge spec are verbatim from the spec.
// Do not reword without sign-off. TRL option labels come from the BRL Master
// workbook (general tracks) and src/data/trl-tracks.js (health tracks).
//
// Answers state `A`:
//   { applicant, project, essays, problem:{known}, founder, stage, techEv,
//     facilities, F:{fact:bool}, E:{fact:text}, I:{fact:source}, count,
//     confirm, unsure:{screenId:true}, materials, uploads, ctx:{source,portfolio},
//     done:{screenId:true} }

import { TRL_TRACK_CONTENT } from '../data/trl-tracks.js';
import { COL, BRL_COLUMN_BY_CAT } from './intake-columns.js';

/* ---------- question model: facts, screens, scoring ---------- */
export const CATS=['TRL','IP','Product','Market','GTM','Business','Team','Funding','Regulatory'];
export const NAMES={TRL:'Technology',IP:'Intellectual property',Product:'Product',Market:'Market',GTM:'Go-to-market',Business:'Business model',Team:'Team',Funding:'Funding',Regulatory:'Regulatory'};

// Plain-language milestones for the general tracks (prototype wording).
export const TRACK_OPTS={
 General:['Basic principles observed and written up (paper, thesis, or lab report)','A specific application written down: what it would do and for whom','An experiment or analysis showed the key function works','Main parts put together and tested as one system in the lab','System tested in conditions that resemble real use','Prototype close to the final design built and tested','Prototype tested with real users where it would actually be used','Final version complete, testing finished, ready for production','Final product in regular use under real operating conditions'],
 Software:['Core algorithms or methods worked out','Architecture designed and key features listed','Early working version (alpha) performs the core function','Main modules combined into a minimum viable product someone outside the team could use','Tested under realistic data volumes or user load, and checked for security problems','Release candidate has passed acceptance testing with intended users','Deployed and used by real users in their own work','Full production release meeting agreed reliability or uptime commitments','Deployed at scale across multiple customer organizations'],
 Hardware:['Physical principles understood, with a basic concept sketch or drawing','Technical specifications drafted and components listed','Rough bench prototype (breadboard) demonstrates the key function','Components integrated into one prototype system and tested in the lab','Prototype passed testing under realistic conditions (temperature, vibration, durability) and works reliably','Prototype built close to how it would be manufactured, with field testing started','Small pilot production run made and tested successfully by customers','Production line set up with quality controls','Full production with a working supply chain'],
};

// Official TRL labels, levels 1-9 (BRL Master workbook, TRL sheet, general definition).
export const TRL_LABELS=['Basic Principles Observed and reported','Technology concept and/or application formulated','Analytical or experimental critical function POC','Basic technology components integrated to work together','Validation in relevant environment, and/or simulated in lab','Initial prototype model or system','Prototype demonstrated in operational environment - actual system prototype in application','Proven to work in final form and under expected conditions. End of true system development','In final form under mission conditions. System proven in operational environment. Production ready'];

// Regulatory ladder (merge spec, from the BRL Master Regulatory sheet).
const REG_ITEMS=['Regulatory requirements identified and possible pathways outlined (for example 510(k), De Novo, PMA, IND)','Written regulatory strategy, with regulatory expertise engaged','Testing requirements mapped to the chosen pathway','Regulatory testing underway under a working quality system','Pre-submission meeting held with FDA','Submission sections drafted','Submission filed and accepted for review','Responding to agency questions','Clearance or approval received'];

export const NEXT={
 IP:['Identify what could be protected','Invention disclosure filed or patent attorney engaged','Patent application filed','Licensing conversations','Full application moving through the patent office','Patent issued or license signed','Multiple filings, including outside the US','Two or more patents issued','Patents protect the product, with an enforcement plan'],
 Product:['Name the problem and who has it','Describe the product and why users want it','Users react to the concept','Outside users try a working prototype','Users get real value from a minimum version','Roadmap from user feedback and a pricing strategy','Ready to produce or deploy at scale','Commercially available','Customer feedback drives engineering'],
 Market:['Name target industries or customer types','Estimate market size and list competitors','Say why customers would choose you','20 or more customer interviews that confirm the problem','Written commitment to pay (LOI, PO, paid pilot)','Document market barriers and track competitors','Ongoing customer relationships shaping the product','Independent validation of market position','Customers using it at scale'],
 GTM:['Choose a first market and customer type','Identify user, buyer, and approver','Map how customers would buy','Test the buying path with real customers','Written go-to-market plan with owners','Structured outreach with sales materials','Repeatable lead generation with conversion tracked','Know acquisition cost; set growth targets from sales data','Documented playbook across channels'],
 Business:['Describe what you would sell and to whom','Revenue sources and main costs (business model canvas)','Business plan with 12 to 18 month milestones','Test a price with customers','A paid pilot, test sale, or contract','Ongoing revenue from the intended model','Repeat purchases and positive unit economics','Metrics improving as sales grow','Growing recurring revenue'],
 Team:['Someone committed to spending time on commercialization','Founders agreement on ownership and roles','Add a key technical or business person','Advisors giving regular input','Defined roles; main technical and business roles filled','All needed skills, including an experienced business lead','Two-year organization plan','Experienced management and a working board','Stable, high-performing leadership over years'],
 Funding:['Know the funding options and what each expects','Form a company','12-month projection and cap table','Pitch deck and three-year model','Legal documents ready for investor review','Data room and counsel review','Meeting multiple investors','Investors in due diligence','Term sheet received'],
 Regulatory:REG_ITEMS,
};
/* Implications: if the first fact is true, the listed facts are true. */
export const IMPLIES={
 ftime:['t_commit'], c_mvp:['c_proto'], c_proto:['c_concept'], c_concept:['c_talk','d_product'],
 c_path:['c_talk','d_path'], c_outreach:['c_talk'], c_price:['c_talk','d_business'], c_wtp:['c_talk'],
 c_paid:['c_wtp','c_price'], c_rev:['c_paid'],
 ip3:['ip2'], ip2:['ip1'], ip5:['ip3'], ip7:['ip3'], ip8:['ip6','ip5'],
 d_product:['d_business'], d_roles:['d_first'], f_applied:['f1'], f_received:['f_applied'],
 t_full:['t_roles'], t_roles:['t_commit'], t_agree:['t_commit'], t_added:['t_commit'],
 r7:['r6'], r8:['r7'], r9:['r7'],
};

/* ---------- technology form and TRL tracks ---------- */
export const FORMS=['Software','Hardware or physical device','Material, chemistry, or process','Therapeutic','Diagnostic','Medical device','Other'];
const FORM_TRACK={'Software':'Software','Hardware or physical device':'Hardware','Material, chemistry, or process':'General','Therapeutic':'Therapeutics','Diagnostic':'Diagnostics','Medical device':'Device','Other':'General'};
export const HEALTH_TRACKS=['Therapeutics','Diagnostics','Device'];
const TRACK_KEY={General:'general',Software:'software',Hardware:'hardware',Therapeutics:'therapeutics',Diagnostics:'diagnostics',Device:'device'};
// TRL Track column values.
export const TRACK_LABEL={General:'General',Software:'Software',Hardware:'Hardware',Therapeutics:'Therapeutics',Diagnostics:'Diagnostics',Device:'Medical device'};
// Forms that get the optional facilities question.
const FACILITY_FORMS=['Hardware or physical device','Material, chemistry, or process','Therapeutic','Diagnostic','Medical device'];

export const ICORPS=['Not in I-Corps','Regional, in progress','Regional, finished','National, in progress','National, finished'];
export const HOURS=['Under 3','3 to 5','5 to 10','10 to 20','More than 20','Full time'];
export const OUTCOMES=['Start a company I help lead','Start a company someone else leads','License it to an existing company','Partner with an existing company','Not sure yet'];
export const PRIOR_EXPERIENCE=['Founded or co-founded a company','Licensed a technology','Received an SBIR or STTR award','Worked in industry in a related field','None'];
export const NS_RELEVANCE=['Defense or intelligence use','Other government agency use','Commercial use','Not sure yet'];

export function track(A) { return FORM_TRACK[A.project && A.project.form] || 'General'; }
export function isHealth(A) { return HEALTH_TRACKS.includes(track(A)); }
export function hasFacilities(A) { return FACILITY_FORMS.includes(A.project && A.project.form); }
function companyFormed(A) { return !!(A.project && A.project.company === 'Yes'); }

function healthTitle(trk, level) {
  const lv = TRL_TRACK_CONTENT[TRACK_KEY[trk]].levels.find(x => x.level === level);
  return lv && lv.title ? String(lv.title).trim() : '';
}

/**
 * The technology-stage options: index 0 is "None of these yet", 1-9 are TRL levels.
 * General tracks: official label + plain-language description. Health tracks:
 * official label + the BARDA title from trl-tracks.js.
 */
export function trlOptions(A) {
  const trk = track(A);
  const opts = [{ title: 'None of these yet', desc: '' }];
  for (let l = 1; l <= 9; l++) {
    opts.push(HEALTH_TRACKS.includes(trk)
      ? { title: `TRL ${l} — ${healthTitle(trk, l)}`, desc: '' }
      : { title: `TRL ${l} — ${TRL_LABELS[l - 1]}`, desc: TRACK_OPTS[trk][l - 1] });
  }
  return opts;
}

// Plain text for a TRL level on this track (next-level needs, recap, diff).
function trlText(trk, level) {
  return HEALTH_TRACKS.includes(trk) ? `TRL ${level}: ${healthTitle(trk, level)}` : TRACK_OPTS[trk][level - 1];
}

/* Health tracks: customer-facing items name providers, payers, and patients.
   Display only; keys and scoring are unchanged. */
const CUSTOMER_SCREENS=['cust','docs','scale'];
export function displayText(text, screenId, A) {
  if (!isHealth(A) || !CUSTOMER_SCREENS.includes(screenId)) return text;
  return String(text).replace(/\bcustomers\b/, 'customers (providers, payers, or patients)');
}

export const SCREENS=[
 {id:'applicant',type:'applicant',sect:'Applicant'},
 {id:'project',type:'project',sect:'Project'},
 {id:'essays',type:'essays',sect:'The technology and the problem'},
 {id:'founder',type:'founder',sect:'You and the project'},
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
   {k:'d_why',cat:'Market',lvl:3,label:'Why a customer would choose you over the best option they have today'},
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
   {k:'ip_public',label:'The work has been presented or published publicly'},
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
   {k:'f_received',label:'Received SBIR/STTR or other grant funding',ev:'List each grant: agency, amount, and period.'},
   {k:'f_private',label:'Received angel, venture capital, or other private investment',ev:'Source and amount.'},
   {k:'f_proj',label:'A 12-month financial projection'},
   {k:'f_cap',company:true,label:'A cap table showing who owns what share of the company'},
   {k:'f_deck',label:'A pitch deck',special:'deck'},
   {k:'f_model',label:'A three-year financial model with revenue projections'},
   {k:'f5',cat:'Funding',lvl:5,company:true,label:'Legal documents organized for investor review (IP assigned to the company, key contracts, employment agreements)'},
   {k:'f6',cat:'Funding',lvl:6,company:true,label:'A data room ready for investors, with documents reviewed by experienced counsel',showIf:s=>s.has('f5')},
   {k:'f7',cat:'Funding',lvl:7,company:true,label:'Actively meeting with multiple investors'},
   {k:'f8',cat:'Funding',lvl:8,company:true,label:'Two or more investors doing due diligence now',showIf:s=>s.has('f7')},
   {k:'f9',cat:'Funding',lvl:9,company:true,label:'Received one or more term sheets',showIf:s=>s.has('f8')},
 ]},
 {id:'reg',type:'multi',sect:'Regulatory',when:(v,A)=>isHealth(A),q:'Which of these regulatory steps have you taken?',items:[
   {k:'r1',cat:'Regulatory',lvl:1,label:REG_ITEMS[0]},
   {k:'r2',cat:'Regulatory',lvl:2,label:REG_ITEMS[1]},
   {k:'r3',cat:'Regulatory',lvl:3,label:REG_ITEMS[2]},
   {k:'r4',cat:'Regulatory',lvl:4,label:REG_ITEMS[3]},
   {k:'r5',cat:'Regulatory',lvl:5,label:REG_ITEMS[4],ev:'Meeting type and date'},
   {k:'r6',cat:'Regulatory',lvl:6,label:REG_ITEMS[5]},
   {k:'r7',cat:'Regulatory',lvl:7,label:REG_ITEMS[6]},
   {k:'r8',cat:'Regulatory',lvl:8,label:REG_ITEMS[7],showIf:s=>s.has('r7')},
   {k:'r9',cat:'Regulatory',lvl:9,label:REG_ITEMS[8],showIf:s=>s.has('r7')},
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
 {id:'materials',type:'materials',sect:'Materials and submit'},
];

/* ---------- constants ---------- */

// Question-model version recorded with every submission.
export const VERSION = 'gen-1.0';

// Applicants do not see numeric levels (workshop guidance, Oct 2026; merge
// spec open decision 1). Flip only with sign-off.
export const SHOW_LEVELS_TO_FOUNDER = false;

// Intake category keys -> readinessData keys, for a later self-score vs
// advisor-score comparison.
export const INTAKE_TO_BRL_KEY = {
  TRL: 'Technology', IP: 'IP', Product: 'Product', Market: 'Market',
  GTM: 'Go-to-Market', Business: 'Business', Team: 'Team', Funding: 'Funding',
  Regulatory: 'Regulatory'
};

// Plain-language label for every fact key.
export const LABEL = {};
SCREENS.forEach(s => (s.items || []).forEach(it => { LABEL[it.k] = it.label; }));
LABEL.ftime = 'Spent time on this outside research duties in the last three months';

/* ---------- state and evaluation ---------- */

export function freshAnswers() {
  return { F: {}, E: {}, unsure: {}, done: {} };
}

/* Categories scored for this applicant: Regulatory only on health tracks. */
export function activeCats(A) {
  return isHealth(A) ? CATS : CATS.filter(c => c !== 'Regulatory');
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

/**
 * Evaluate an answers state. Recreate after every change (it is cheap).
 */
export function createModel(A) {
  const { C, by } = closure(A);
  const val = k => C[k];
  const cats = activeCats(A);
  const trk = track(A);

  /* maps facts to each BRL level. This is the scoring rule. */
  function gateVal(cat, l) {
    const v = val;
    switch (cat) {
      case 'TRL': return A.stage == null ? undefined : A.stage >= l;
      case 'Funding':
        if (l === 2) return A.project ? A.project.company === 'Yes' : undefined;
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
      case 'Regulatory': return v('r' + l);
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

  function nextText(cat, level) {
    if (level >= 9) return '';
    return cat === 'TRL' ? trlText(trk, level + 1) : NEXT[cat][level];
  }

  function itemVisible(it, local) {
    if (it.company && !companyFormed(A)) return false;
    if (it.showIf && !it.showIf(local)) return false;
    return true;
  }

  function screenActive(sc) { return !sc.when || sc.when(val, A); }

  function hasItems(sc) {
    if (sc.type !== 'multi') return true;
    const pre = new Set(sc.items.filter(it => C[it.k] === true).map(it => it.k));
    const eff = closeSet([...pre]);
    return sc.items.some(it => !pre.has(it.k) && itemVisible(it, eff));
  }

  function activeScreens() { return SCREENS.filter(s => A.done[s.id] || (screenActive(s) && hasItems(s))); }
  function nextScreen() { return SCREENS.find(s => !A.done[s.id] && screenActive(s) && hasItems(s)); }

  /* consistency flags for the reviewer: [{id, text}] */
  function flagItems() {
    const f = [], v = k => val(k) === true, help = (A.materials && A.materials.help) || [];
    const add = (id, text) => f.push({ id, text });
    if ((v('c_paid') || v('c_rev')) && !(A.count > 0)) add('paid_no_interviews', 'Reports a paid pilot or revenue but no customer interviews counted');
    if (v('c_rev') && A.project && A.project.company !== 'Yes') add('revenue_no_company', 'Reports ongoing revenue but no company formed');
    if (v('t_full') && help.includes('A business co-founder or CEO')) add('team_vs_help', 'Says the team has experienced business leadership but asks for a business co-founder or CEO');
    if ((A.stage || 0) >= 7 && val('c_proto') !== true) add('trl_no_proto', 'Technology answer says it was tested with real users, but no outside user is reported trying a working prototype');
    if (A.count >= 20 && A.confirm !== 'Yes') add('interviews_unconfirmed', '20 or more interviews, but most did not clearly confirm the problem (' + (A.confirm || 'no answer') + ')');
    if (v('ip_public') && val('ip3') !== true) add('public_no_patent', 'Presented or published publicly with no patent application filed (possible bar to patenting)');
    if (v('f_private') && !companyFormed(A)) add('private_no_company', 'Private investment received but no company formed');
    return f;
  }

  /* gate signals for the reviewer; applicants never see them: [{id, text}] */
  function gateItems() {
    const f = [], o = A.founder;
    if (!o) return f;
    const add = (id, text) => f.push({ id, text });
    const icorps = (A.project && A.project.icorps) || '';
    if (o.why === 'My funding or department expects it') add('why_expected', 'Main reason given is that funding or the department expects it');
    if (o.why === 'Not sure yet') add('why_unsure', 'Not sure yet why they want to take this beyond the lab');
    if (o.outcome === 'Not sure yet') add('outcome_unsure', 'No outcome in mind yet');
    if (o.spent === 'No') add('no_time', 'No time spent on this outside research duties in the last three months');
    if (o.spent === 'No' && ['10 to 20', 'More than 20', 'Full time'].includes(o.hours)) add('plans_hours_no_time', 'Plans ' + (o.hours === 'Full time' ? 'to work full time' : o.hours.toLowerCase() + ' hours a week') + ' on it but has spent no time on it yet');
    if (o.hours === 'Under 3') add('low_hours', 'Under 3 hours a week available');
    if (o.outcome === 'Start a company I help lead' && ['Under 3', '3 to 5'].includes(o.hours)) add('lead_low_hours', 'Wants to help lead a company with under 5 hours a week');
    if (o.nothing && /finished$/.test(icorps)) add('icorps_nothing_changed', 'Finished I-Corps but reports nothing changed from customer or mentor feedback');
    if (['No', 'Not sure'].includes(o.engagement)) add('engagement', "Can't commit, or isn't sure they can commit, to the engagement");
    return f;
  }

  /* full reviewer result */
  function result(screensAnswered = 0) {
    const scores = {}, next = {};
    for (const c of CATS) {
      if (!cats.includes(c)) { scores[c] = null; next[c] = ''; continue; }
      const s = scan(c);
      scores[c] = s.level;
      next[c] = nextText(c, s.level);
    }
    const implied = Object.entries(Object.assign({}, A.I || {}, by))
      .filter(([k]) => LABEL[k] && A.F[k] !== false)
      .map(([k, src]) => LABEL[k] + (src ? ' (from: ' + (LABEL[src] || src) + ')' : ''));
    const evidence = [];
    if (A.techEv) evidence.push({ q: 'Most advanced test or use', a: A.techEv });
    if (A.facilities) evidence.push({ q: 'Facilities and equipment', a: A.facilities });
    if (A.count != null) evidence.push({ q: 'Customer interviews outside the university', a: String(A.count) + (A.count >= 20 ? ' (most confirmed the problem: ' + (A.confirm || '') + ')' : '') });
    for (const [k, a] of Object.entries(A.E)) evidence.push({ q: LABEL[k], a });
    if (companyFormed(A)) evidence.push({ q: 'Company name and state', a: A.project.companyName });
    const extras = ['ip_search', 'ip_fto', 'ip_soft', 'ip_public', 'f_applied', 'f_received', 'f_private'].filter(k => C[k] === true).map(k => LABEL[k]);
    const progress = [];
    for (const c of cats) {
      const s = scan(c);
      for (let l = s.level + 2; l <= 9; l++) {
        if (gateVal(c, l) === true) progress.push({ cat: c, level: l, text: NAMES[c] + ' level ' + l + ': ' + (c === 'TRL' ? trlText(trk, l) : NEXT[c][l - 1]) });
      }
    }
    const notSure = Object.keys(A.unsure || {}).map(id => SCREENS.find(s => s.id === id).sect);
    const gates = gateItems(), fl = flagItems();
    return {
      version: VERSION, track: trk, cats, scores, next,
      gateFlags: gates.map(g => g.text), gateItems: gates,
      flags: fl.map(x => x.text), flagItems: fl,
      implied, evidence, extras, progress: progress.map(p => p.text), progressItems: progress,
      notSure, screens: screensAnswered, facts: C, stage: A.stage
    };
  }

  return { A, C, by, val, gateVal, scan, itemVisible, screenActive, hasItems, activeScreens, nextScreen, flags: () => flagItems().map(x => x.text), gateFlags: () => gateItems().map(x => x.text), flagItems, gateItems, result };
}

/* ---------- comparisons between two intakes ---------- */

/**
 * What changed between a previous intake and this one, in plain language.
 */
export function diffFacts(prevA, A) {
  const before = closure(prevA).C, after = closure(A).C;
  const keys = Object.keys(LABEL);
  const added = keys.filter(k => after[k] === true && before[k] !== true).map(k => LABEL[k]);
  const removed = keys.filter(k => before[k] === true && after[k] !== true).map(k => LABEL[k]);
  const s0 = prevA.stage || 0, s1 = A.stage || 0;
  if (s1 > s0) added.unshift('Technology: ' + trlText(track(A), s1));
  if (s1 < s0) removed.unshift('Technology: ' + trlText(track(prevA), s0));
  return { added, removed };
}

export function formatDiff(d) {
  const parts = [];
  if (d.added.length) parts.push('Added: ' + d.added.join('; '));
  if (d.removed.length) parts.push('No longer reported: ' + d.removed.join('; '));
  return parts.join(' | ') || 'No changes';
}

/* ---------- outputs ---------- */

function joinList(xs, sep = '; ') { return (xs || []).filter(Boolean).join(sep); }

function uploadNames(A) {
  const u = A.uploads || {}, out = [];
  const name = (x) => x ? (x.link ? x.link : x.name) : '';
  if (u.deck) out.push('Pitch deck: ' + name(u.deck));
  (u.supporting || []).forEach((x, i) => { if (x) out.push('Supporting ' + (i + 1) + ': ' + name(x)); });
  return out;
}

/**
 * One Smartsheet row, keyed by column title (see intake-columns.js). Includes
 * reviewer-only fields (levels, gate signals, flags), which the applicant
 * never sees. Empty values are left out. The proxy fills in its own columns
 * (Submission ID, Return Code, Upload Status, ...).
 *
 * ctx: { screensAnswered, previousA, questions: [string] }
 */
export function buildRow(A, ctx = {}) {
  const r = createModel(A).result(ctx.screensAnswered || 0);
  const ap = A.applicant || {}, pr = A.project || {}, es = A.essays || {}, fo = A.founder || {}, ma = A.materials || {}, cx = A.ctx || {};
  const C_ = r.facts;
  const row = {
    [COL.ventureName]: pr.title,
    [COL.formVersion]: VERSION,
    [COL.source]: cx.source,
    [COL.portfolio]: cx.portfolio,
    [COL.institution]: ap.org,
    [COL.applicantName]: [ap.first, ap.last].filter(Boolean).join(' '),
    [COL.email]: ap.email,
    [COL.phone]: ap.phone ? ap.phone + (ap.ext ? ' ext. ' + ap.ext : '') : '',
    [COL.title]: ap.title,
    [COL.department]: ap.dept,
    [COL.role]: ap.role,
    [COL.teamMembers]: ap.team,
    [COL.technologyDomain]: pr.domain === 'Other' ? 'Other: ' + (pr.domainOther || '') : pr.domain,
    [COL.technologyForm]: pr.form,
    [COL.trlTrack]: TRACK_LABEL[r.track],
    [COL.companyFormed]: pr.company,
    [COL.companyNameState]: pr.company === 'Yes' ? pr.companyName : '',
    [COL.companyType]: pr.company === 'Yes' ? pr.companyType : '',
    [COL.icorps]: pr.icorps,
    [COL.ventureUrl]: pr.website,
    [COL.technologyDescription]: es.science,
    [COL.valueProposition]: es.value,
    [COL.impact]: es.impact,
    [COL.nationalSecurityRelevance]: joinList(es.nsRelevance),
    [COL.outcomeWanted]: fo.outcome,
    [COL.roleWanted]: fo.role,
    [COL.mainReason]: fo.why,
    [COL.whyText]: fo.whyText,
    [COL.timeSpent]: fo.spent,
    [COL.hoursPerWeek]: fo.hours,
    [COL.engagementCommitment]: fo.engagement,
    [COL.conflicts]: fo.conflicts,
    [COL.priorExperience]: joinList(fo.prior) + (fo.priorDetail ? ' (' + fo.priorDetail + ')' : ''),
    [COL.changedFromFeedback]: fo.nothing ? 'Nothing yet' : fo.changed,
    [COL.nextLevelNeeds]: r.cats.filter(c => r.next[c]).map(c => NAMES[c] + ': ' + r.next[c]).join('\n'),
    [COL.gateSignals]: joinList(r.gateFlags),
    [COL.reviewFlags]: joinList(r.flags),
    [COL.unsureAbout]: joinList(r.notSure),
    [COL.questionsForCall]: (ctx.questions || []).map((q, i) => (i + 1) + '. ' + q).join('\n'),
    [COL.evidence]: r.evidence.map(e => e.q + ': ' + e.a).join(' | '),
    [COL.countedFromOther]: joinList(r.implied),
    [COL.doneAhead]: joinList(r.progress),
    [COL.alsoDone]: joinList(r.extras),
    [COL.grantsReceived]: C_.f_received === true ? (A.E.f_received || 'Yes') : '',
    [COL.privateInvestment]: C_.f_private === true ? (A.E.f_private || 'Yes') : '',
    [COL.helpWanted]: joinList(ma.help),
    [COL.aiOptOut]: ma.aiOptOut ? 'Yes' : 'No',
    [COL.uploadFileNames]: uploadNames(A).join('\n'),
    [COL.factsTrue]: Object.keys(C_).filter(k => C_[k] === true).sort().join(', ')
  };
  for (const c of r.cats) row[BRL_COLUMN_BY_CAT[c]] = r.scores[c];
  if (ctx.previousA) row[COL.changesSincePrevious] = formatDiff(diffFacts(ctx.previousA, A));
  for (const k of Object.keys(row)) if (row[k] === undefined || row[k] === null || row[k] === '') delete row[k];
  return row;
}

/**
 * What the applicant sees and keeps: their own answers, grouped by section.
 * No levels, next-level text, gate signals, or review flags.
 * Returns [{ sect, items: [string] }].
 */
export function founderRecap(A) {
  const { C } = closure(A);
  const ap = A.applicant || {}, pr = A.project || {}, es = A.essays || {}, fo = A.founder || {}, ma = A.materials || {};
  const sections = [];
  const nonEmpty = xs => xs.filter(x => x && !/: $/.test(x) && !/: undefined$/.test(x));

  if (A.applicant) {
    sections.push({ sect: 'Applicant', items: nonEmpty([
      'Name: ' + [ap.first, ap.last].filter(Boolean).join(' '),
      'Email: ' + ap.email,
      ap.title ? 'Title: ' + ap.title : '',
      'Organization: ' + ap.org,
      ap.dept ? 'Department: ' + ap.dept : '',
      'Your role: ' + ap.role,
      ap.team ? 'Team members: ' + ap.team : ''
    ]) });
  }
  if (A.project) {
    sections.push({ sect: 'Project', items: nonEmpty([
      'Project: ' + pr.title,
      'Technology domain: ' + (pr.domain === 'Other' ? pr.domainOther : pr.domain),
      'Technology form: ' + pr.form,
      pr.company === 'Yes' ? 'Company: ' + pr.companyName + (pr.companyType ? ' (' + pr.companyType + ')' : '') : 'Company formed: ' + pr.company,
      'I-Corps: ' + pr.icorps,
      pr.website ? 'Website: ' + pr.website : ''
    ]) });
  }
  if (A.essays) {
    sections.push({ sect: 'The technology and the problem', items: nonEmpty([
      'Key innovation: ' + es.science,
      'Problem and customers: ' + es.value + (es.noCustomers ? ' (specific customers not yet identified)' : ''),
      'Impact: ' + es.impact,
      (es.nsRelevance || []).length ? 'Relevance: ' + es.nsRelevance.join(', ') : ''
    ]) });
  }
  if (A.founder) {
    sections.push({ sect: 'You and the project', items: nonEmpty([
      'Main reason: ' + fo.why + (fo.whyText ? ' (' + fo.whyText + ')' : ''),
      'Outcome you want: ' + fo.outcome + (fo.role ? ', as ' + fo.role : ''),
      'Time on this in the last three months: ' + fo.spent,
      'Hours a week available: ' + fo.hours,
      fo.engagement ? 'Engagement commitment: ' + fo.engagement + (fo.conflicts ? ' (' + fo.conflicts + ')' : '') : '',
      (fo.prior || []).length ? 'Prior experience: ' + fo.prior.join(', ') : '',
      fo.nothing ? 'Changed from feedback: Nothing yet' : (fo.changed ? 'Changed from feedback: ' + fo.changed : '')
    ]) });
  }

  for (const sc of SCREENS) {
    if (sc.id === 'tech' && A.stage != null) {
      const items = [A.stage === 0 ? 'None of the listed milestones yet' : 'Furthest point reached: ' + trlText(track(A), A.stage)];
      if (A.techEv) items.push('Most advanced test or use: ' + A.techEv);
      if (A.facilities) items.push('Facilities and equipment: ' + A.facilities);
      sections.push({ sect: 'Technology', items });
    }
    if (sc.type !== 'multi' || !A.done[sc.id]) continue;
    const items = sc.items
      .filter(it => C[it.k] === true && !(it.company && pr.company !== 'Yes'))
      .map(it => {
        let text = displayText(it.label, sc.id, A);
        if (it.k === 'c_talk' && A.count != null) text += ' (' + A.count + ' interviews)';
        if (A.E[it.k]) text += ': ' + A.E[it.k];
        return text;
      });
    sections.push({ sect: sc.sect, items: items.length ? items : ['None yet'] });
  }

  if (A.materials) {
    const files = uploadNames(A);
    sections.push({ sect: 'Materials', items: nonEmpty([
      files.length ? 'Files and links: ' + files.join('; ') : 'No files or links added',
      'What would help most: ' + ((ma.help || []).join(', ') || 'Nothing selected'),
      ma.aiOptOut ? 'You opted out of AI processing' : ''
    ]) });
  }
  return sections;
}
