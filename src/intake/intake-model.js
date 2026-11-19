// intake-model.js - Venture intake question model and scoring. PURE: no DOM,
// no storage, no network.
//
// The applicant answers facts ("which of these has happened"), never ratings.
// gateVal() maps facts to each BRL level; scan() applies the strict ladder
// (a level counts only if every lower level is also true).
//
// History: ported from docs/venture-intake.html (phys-0.4), then merged with
// Katy Lenshin's application per docs/superpowers/specs/2026-10-20-venture-
// intake-merge-spec.md (gen-1.0). gen-1.1 (Oct 2026) added the one-line
// description, LinkedIn, the team roster, full-time plans, the number of
// applications considered, optional revenue and publication details, other
// programs and awards, the business plan upload, and "anything else".
// gen-1.2 added where customer-discovery conclusions came from (SOURCE_ITEMS),
// the confirm pick at any interview count, role choices by outcome, and the
// discovery review flags.
// gen-2.0 (Oct 2026) follows the November 2026 BRL framework (redlines signed
// off Oct 28, 2026: docs/superpowers/specs/2026-10-28-brl-nov2026-redlines.md):
// Team L2-L4 reordered with a named business lead, the IP trade-secret route,
// Funding L2 as a prepared ask and L7-L9 redefined, Business L3-L5 tied to the
// financial models and a formed company, DoD TRL labels, and "None of these
// yet" as no TRL rather than TRL 0.
// gen-3.0 (Oct 29, 2026; docs/superpowers/specs/2026-10-29-intake-gen-3-burden-
// redesign.md) splits the form in two. Part 1 is the facts and produces the
// levels; Part 2 is the written answers, the roster and the files. Ticking a
// box never adds a question to the page it is on: every follow-up moves to the
// "About your evidence" screen after the last checklist. Market 1 and Product 1
// come from an explicit Customers pick, not from an unticked box. Look-up
// details (patent numbers, grants, private investment, programs) are optional.
// "What's this?" lines sit on items as `help`.
// gen-3.1 (Nov 6, 2026) follows the workbook's Market, Business and Funding
// update (Brian's choices): Market L2 = any customer interviews, L3 = first
// market chosen + size + competitors, L4 = 20+ confirming interviews + why
// customers would choose you. Business L3 adds a chosen path (outcome other
// than "Not sure yet"); Business L5 accepts a license path in place of a
// company (reverses D-6). Funding L3 accepts the written ownership split
// (t_agree) when there is no company (reverses D-4). No new questions.
// gen-3.2 (Nov 16, 2026) follows the workbook's Product, Life Science Market and
// Product, and Funding update (Brian's choices): Product 1 ("Product
// Hypothesis") also needs a technology form picked, with new next-level text.
// On the health tracks, the Market 5 box reads as evidence of value (LOI,
// evaluation agreement, paid pilot, payer advisory input, partner term sheet;
// same key c_wtp), and Product 5 is a new box, c_reqs (requirements validated
// with a staged plan from first clinical to commercial version), in place of
// the MVP box. Funding 5 text says "funder" for "investor".
// gen-3.3 (Nov 19, 2026) follows the workbook's "one or a few" target markets
// (Market 3-4, GTM 1): wording only, same gates. Market 4 still counts 20+
// confirming interviews in total, not per market (Brian's choice).
//
// CONTENT RULE (CLAUDE.md rule 1c): the wording in TRACK_OPTS, NEXT, IMPLIES,
// SCREENS, and the gate-signal / flag text is Brian's. Prototype strings are
// kept verbatim; strings added by the merge spec are verbatim from the spec.
// Do not reword without sign-off. TRL option labels come from the generated
// level data: the DoD TRL lines (general, hardware, software) and the BARDA
// titles in src/data/trl-tracks.js (health tracks).
//
// Answers state `A`:
//   Part 1: { applicant, project (incl. started, appCount), problem:{known},
//     founder, stage, F:{fact:bool}, I:{fact:source}, unsure:{screenId:true},
//     evidence screen: E:{fact:text}, src:{fact:{from,said}}, count, confirm, techEv,
//     consent:{help, completedWith, ack, aiOptOut} }
//   Part 2: { written:{technology, applications, impact, nsRelevance},
//     perspective:{whyText, changed, nothing, collaborators},
//     team:[{name,role,time,link,expertise}], facilities, materials:{anythingElse}, uploads }
//   Both: ctx:{source,portfolio}, done:{screenId:true}, part1:{submittedAt} once
//   Part 1 is saved, timing:{screenId:seconds}

import { TRL_TRACK_CONTENT } from '../data/trl-tracks.js';
import { readinessData, BRL_FRAMEWORK_VERSION } from '../data/readiness-levels.js';
import { COL, BRL_COLUMN_BY_CAT } from './intake-columns.js';
import { INTAKE_CONFIG } from './intake-config.js';

/* ---------- question model: facts, screens, scoring ---------- */
export const CATS=['TRL','IP','Product','Market','GTM','Business','Team','Funding','Regulatory'];
export const NAMES={TRL:'Technology',IP:'Intellectual property',Product:'Product',Market:'Market',GTM:'Go-to-market',Business:'Business model',Team:'Team',Funding:'Funding',Regulatory:'Regulatory'};

// Plain-language milestones for the general tracks (prototype wording).
export const TRACK_OPTS={
 General:['Basic principles observed and written up (paper, thesis, or lab report)','A specific application written down: what it would do and for whom','An experiment or analysis showed the key function works','Main parts put together and tested as one system in the lab','System tested in conditions that resemble real use','Prototype close to the final design built and tested','Prototype tested with real users where it would actually be used','Final version complete, testing finished, ready for production','Final product in regular use under real operating conditions'],
 Software:['Core algorithms or methods worked out','Architecture designed and key features listed','Early working version (alpha) performs the core function','Main modules work together in a lab or development environment','Tested under realistic data volumes or user load, and checked for security problems','Release candidate has passed acceptance testing with intended users','Deployed and used by real users in their own work','Full production release meeting agreed reliability or uptime commitments','In regular operational use, with ongoing engineering support in place'],
 Hardware:['Physical principles understood, with a basic concept sketch or drawing','Technical specifications drafted and components listed','Rough bench prototype (breadboard) demonstrates the key function','Components integrated into one prototype system and tested in the lab','Prototype passed testing under realistic conditions (temperature, vibration, durability) and works reliably','Prototype built close to how it would be manufactured, with field testing started','Prototype close to the final design tested where it will actually be used','Final system built and qualified through testing: it meets its design specifications','Final system proven in real operating conditions'],
};

// Official TRL labels, levels 1-9: the DoD TRA Guidebook lines from the
// generated level data. General and hardware share the general lines; software
// has its own. Read from the data, never hard-coded.
const softwareLevels = TRL_TRACK_CONTENT.software.levels;
export function trlLabel(trk, level) {
  const src = trk === 'Software' ? softwareLevels : readinessData.Technology.levels;
  const lv = src.find(x => x.level === level);
  return lv ? String(lv.title).trim().replace(/\.$/, '') : '';
}

// Regulatory ladder (merge spec, from the BRL Master Regulatory sheet).
const REG_ITEMS=['Regulatory requirements identified and possible pathways outlined (for example IND or IDE for clinical studies; 510(k), De Novo, PMA, NDA, or BLA to market)','Written regulatory strategy and timeline, with regulatory expertise engaged','Testing requirements mapped to the chosen pathway','Regulatory testing underway under a working quality system','Pre-submission meeting held with FDA (for example Pre-Sub or pre-IND), and its feedback built into your plan','Submission sections drafted','Submission filed and accepted for review','Responding to agency questions','Clearance or approval received'];

export const NEXT={
 IP:['Identify what could be protected and how','Invention disclosure filed or IP counsel engaged','Patent application filed, or trade secrets documented with access controls','Licensing conversations','Patent moving through the patent office, or an enforced trade-secret program','Patent issued or exclusive license signed','Multiple filings, including outside the US','Two or more patents issued','Patents protect the product, with an enforcement plan'],
 Product:['Describe the product the technology could become and who would use it','Describe the product and why users want it','Users react to the concept','Outside users try a working prototype','Users get real value from a minimum version','Roadmap from user feedback and a pricing strategy','Ready to produce or deploy at scale','Commercially available','Customer feedback drives engineering'],
 Market:['Name target industries or customer types','Talk with potential customers about the problem','Choose one or a few target markets, and estimate each one\'s size and list competitors','20 or more customer interviews that confirm the problem, and say why customers would choose you','Written commitment to pay (LOI, PO, paid pilot)','Document market barriers and track competitors','Ongoing customer relationships shaping the product','Independent validation of market position','Customers using it at scale'],
 GTM:['Choose one or a few entry markets and a customer type','Identify user, buyer, and approver','Map how customers would buy','Test the buying path with real customers','Written go-to-market plan with owners','Structured outreach with sales materials','Repeatable lead generation with conversion tracked','Know acquisition cost; set growth targets from sales data','Documented playbook across channels'],
 Business:['Describe what you would sell and to whom','Revenue sources and main costs (business model canvas)','Business plan with 12 to 18 month milestones and a 12-month projection, and a chosen path (company, license, or other)','Test a price with customers and build a three-year model','A paid pilot, test sale, contract, or license, with a company formed to sign it (or the university or licensee on a license path)','Ongoing revenue from the intended model','Repeat purchases and positive unit economics','Metrics improving as sales grow','Growing recurring revenue'],
 Team:['Someone committed to spending time on commercialization','Advisors giving regular input','A written agreement on ownership, roles, and decisions, with a named business lead','Add a key technical or business person','Core team working together with clear roles','All needed skills, including an experienced business lead','Two-year organization plan','Experienced management and a working board','Stable, high-performing leadership over years'],
 Funding:['Know the funding options and what you need for your next milestone','Apply for funding or prepare a specific ask','A 12-month projection tied to milestones, and a cap table or written ownership split','Pitch deck and three-year model','Legal documents ready for funder review','Data room and counsel review','Outside investment received and tracked against milestones','Prior milestones met, with board and investor reporting','Ready for a lead institutional investor (Series A or equivalent)'],
 Regulatory:REG_ITEMS,
};
/* Health-track next-level text where the Life Science level differs (gen-3.2); index = level - 1. */
export const NEXT_HEALTH={
 Market:{4:'Evidence of value from purchasers, payers, or partners (LOI, evaluation agreement, paid pilot, payer advisory input, or term sheet)'},
 Product:{4:'Product requirements validated with users, partners, or payers, with a plan from the first clinical version to the commercial version'},
};
/* Health-track wording for a whole item (gen-3.2): same key, same scoring. */
const HEALTH_LABEL={
 c_wtp:'Received a letter of intent, evaluation agreement, paid pilot, payer advisory input, or a partner term sheet',
};
/* Implications: if the first fact is true, the listed facts are true. */
export const IMPLIES={
 ftime:['t_commit'], c_mvp:['c_proto'], c_reqs:['c_proto'], c_proto:['c_concept'], c_concept:['c_talk','d_product'],
 c_path:['c_talk','d_path'], c_outreach:['c_talk'], c_price:['c_talk','d_business'], c_wtp:['c_talk'],
 c_paid:['c_wtp','c_price'], c_rev:['c_paid'],
 ip3:['ip2'], ip2:['ip1'], ip5:['ip3'], ip7:['ip3'], ip8:['ip6','ip5'], ip_tsprog:['ip_ts'],
 d_product:['d_business'], d_roles:['d_first'], f_applied:['f1'], f_received:['f_applied'],
 t_full:['t_roles'], t_roles:['t_commit'], t_agree:['t_commit'], t_added:['t_commit'], t_lead:['t_commit'],
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
// 'License' and 'Partner' merged into one option at Brian's direction (Oct 2026).
export const OUTCOMES=['Start a company I help lead','Start a company someone else leads','Work with an existing company (license or partnership)','Not sure yet'];
// 'None' replaced by 'Other' (Brian, Oct 2026): applicants with no prior experience leave it blank.
export const PRIOR_EXPERIENCE=['Founded or co-founded a company','Licensed a technology','Received an SBIR or STTR award','Worked in industry in a related field','Other'];
export const NS_RELEVANCE=['Defense or intelligence use','Other government agency use','Commercial use','Not sure yet'];
// gen-1.1 picks (Brian, Oct 2026).
export const FULL_TIME=['Already','Within 12 months','Later','No plans'];
export const APP_COUNTS=['One','2 to 3','More than 3','Not sure'];
export const ROSTER_ROLES=['Co-founder or co-PI','Team member','Student','Advisor','Board member'];
export const ROSTER_TIME=['Full time','Part time','Occasional'];
// gen-1.2 (Brian, Oct 2026). The role choices depend on the outcome, so a
// "help lead" answer can't be paired with "Advisor" or "No formal role".
export const ROLE_OPTIONS={
 'Start a company I help lead':['CEO or business lead','Technical lead (CTO or chief scientist)','Not sure'],
 'Start a company someone else leads':['Technical lead (CTO or chief scientist)','Advisor','No formal role','Not sure'],
};
// Exclusive choices: picking one clears the others in the same list.
export const NOT_SURE_YET='Not sure yet';
// Where a customer-discovery conclusion came from. Asked under each item in
// SOURCE_ITEMS when the applicant checks it (not when it is implied).
export const CONVERSATIONS='Customer conversations';
export const SOURCE_NOT_SURE='Not sure';
export const SOURCES=[CONVERSATIONS,'Our own experience','Published research or reports','An advisor or partner',SOURCE_NOT_SURE];
export const SOURCE_ITEMS={d_first:'Target markets',d_why:'Why customers would choose you',c_price:'Price'};
// gen-3.0 (Brian, Oct 29, 2026).
// Market 1 and Product 1: an explicit answer, never an unticked box.
export const CUSTOMERS_KNOWN_Q='Have you identified the specific customers or users who have this problem?';
export const CUSTOMERS_KNOWN=['Yes','Not yet'];
// Moved from Materials to the Part 1 submit screen; team_vs_help reads it.
export const HELP=['Introductions to potential customers','A business co-founder or CEO','IP or licensing guidance','Help applying for SBIR/STTR or grants','Investor introductions','Product or engineering help','Regulatory or certification guidance','A mentor in my industry'];
export const COMPLETED_WITH=['No','Someone on the project','A tech transfer office','An advisor or mentor'];
export const ICORPS_HELP='An NSF program that teaches research teams to test a commercial idea by interviewing potential customers. Universities run shorter regional versions; NSF runs the national program.';
// Shown once under the technology question on the therapeutics track.
export const GLP_GMP_HELP='GLP (Good Laboratory Practice) is the quality standard for safety studies submitted to FDA; most academic studies are non-GLP. GMP (Good Manufacturing Practice) is the standard for making material given to people.';
/** Year work started: "Before 2020", then each year to this one. */
export function yearOptions(now = new Date()) {
  const out = ['Before 2020'];
  for (let y = 2020; y <= now.getFullYear(); y++) out.push(String(y));
  return out;
}

export function track(A) { return FORM_TRACK[A.project && A.project.form] || 'General'; }
export function isHealth(A) { return HEALTH_TRACKS.includes(track(A)); }
export function hasFacilities(A) { return FACILITY_FORMS.includes(A.project && A.project.form); }
function companyFormed(A) { return !!(A.project && A.project.company === 'Yes'); }
export const LICENSE_OUTCOME = 'Work with an existing company (license or partnership)';
/* Outcome pick ("You and the project"): undefined until answered. */
function outcome(A) { return A.founder && A.founder.outcome ? A.founder.outcome : undefined; }
function pathChosen(A) { const o = outcome(A); return o === undefined ? undefined : o !== 'Not sure yet'; }
function licensePath(A) { const o = outcome(A); return o === undefined ? undefined : o === LICENSE_OUTCOME; }
/** A startup-path applicant with no company yet (the brief asks what would trigger forming it). */
export function startupWithoutCompany(A) {
  return /^Start a company/.test(outcome(A) || '') && !!A.project && A.project.company !== 'Yes';
}

function healthTitle(trk, level) {
  const lv = TRL_TRACK_CONTENT[TRACK_KEY[trk]].levels.find(x => x.level === level);
  return lv && lv.title ? String(lv.title).trim() : '';
}

/**
 * The technology-stage options: index 0 is "None of these yet" (no TRL), 1-9
 * are TRL levels. General tracks: the DoD line + a plain-language description.
 * Health tracks: the BARDA title from trl-tracks.js.
 */
export function trlOptions(A) {
  const trk = track(A);
  const opts = [{ title: 'None of these yet', desc: '' }];
  for (let l = 1; l <= 9; l++) {
    opts.push(HEALTH_TRACKS.includes(trk)
      ? { title: `TRL ${l} — ${healthTitle(trk, l)}`, desc: '' }
      : { title: `TRL ${l} — ${trlLabel(trk, l)}`, desc: TRACK_OPTS[trk][l - 1] });
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

// part: 1 = the facts (levels are computed from these), 2 = written answers and materials.
// Part 2 screens open only once Part 1 is saved (A.part1).
const PART2 = (v, A) => !!A.part1;
export const SCREENS=[
 {id:'changes',part:1,type:'changes',sect:"What's changed",when:(v,A)=>!!A.retake},
 {id:'applicant',part:1,type:'applicant',sect:'Applicant'},
 {id:'project',part:1,type:'project',sect:'Project'},
 {id:'founder',part:1,type:'founder',sect:'You and the project'},
 {id:'cust',part:1,type:'multi',sect:'Customers',q:'Which of these have happened with potential customers or users outside your university?',items:[
   {k:'c_talk',cat:'Market',lvl:2,label:'Talked with them about the problem',special:'count'},
   {k:'c_concept',cat:'Product',lvl:3,label:'Shown them a description, sketch, or mockup of the product, and they found it useful'},
   {k:'c_proto',cat:'Product',lvl:4,label:'Had them use a working prototype and give feedback',ev:'Who used it? Organization and role'},
   {k:'c_mvp',cat:'Product',lvl:5,label:'They get real value today from a minimum version of the product',showIf:s=>s.has('c_proto'),notHealth:true},
   // gen-3.2: Life Science Product 5 ("Product Requirements Validated") replaces the MVP box on the health tracks.
   {k:'c_reqs',cat:'Product',lvl:5,label:'Product requirements (intended use, claims, minimum and target requirements) validated with users, partners, or payers, with a plan from the first clinical version to the commercial version',showIf:s=>s.has('c_proto'),healthOnly:true},
   {k:'c_path',cat:'GTM',lvl:4,label:'Tested how they would buy, and changed your approach based on what you learned'},
   {k:'c_outreach',cat:'GTM',lvl:6,label:'Reached out to them in a structured way using your own sales materials (one-pager, deck, demo)'},
   {k:'c_price',cat:'Business',lvl:4,label:'Tested a specific price with them'},
   {k:'c_wtp',cat:'Market',lvl:5,label:'Received a letter of intent, purchase order, or a written price they would accept',ev:'Which organization?'},
   {k:'c_paid',cat:'Business',lvl:5,label:'A customer or partner paid for a test sale, paid pilot, contract, sponsored research, or an option or license',ev:'Who paid, and for what?',showIf:s=>s.has('c_wtp')||s.has('c_price')},
   {k:'c_rev',cat:'Business',lvl:6,label:'You earn ongoing revenue from the model you plan to grow',ev:'Roughly how much per year? (optional)',evOptional:true,showIf:s=>s.has('c_paid')},
 ]},
 {id:'docs',part:1,type:'multi',sect:'Plans on paper',q:'Which of these have you worked out and written down?',items:[
   {k:'d_product',cat:'Product',lvl:2,label:'The product you would sell, who would buy it, and why they would want it'},
   {k:'d_first',cat:'GTM',lvl:1,label:'The one or few markets, and the type of customer, you will start with'},
   {k:'d_roles',cat:'GTM',lvl:2,label:'For that first customer: who uses the product, who pays, and who approves the purchase',showIf:s=>s.has('d_first')},
   {k:'d_path',cat:'GTM',lvl:3,label:'How a customer would go from first hearing about you to buying, and how the product reaches them'},
   {k:'d_size',cat:'Market',lvl:3,label:'An estimate of each market\'s size (how many potential customers and what they spend)'},
   {k:'d_comp',cat:'Market',lvl:3,label:'Your main competitors'},
   {k:'d_why',cat:'Market',lvl:4,label:'Why a customer would choose you over the best option they have today'},
   {k:'d_barriers',cat:'Market',lvl:6,label:'The main barriers to entering this market (regulations, certifications, incumbents, procurement rules), with a regular way to track competitors'},
   {k:'d_bmc',cat:'Business',lvl:2,label:'Revenue sources and main costs (a business model canvas or similar)',help:'A one-page outline of your customers, what you offer them, how you reach them, and where money comes in and goes out.'},
   {k:'d_plan',cat:'Business',lvl:3,label:'A business plan with revenue and cost estimates and milestones for the next 12 to 18 months'},
   {k:'d_gtmplan',cat:'GTM',lvl:5,label:'A go-to-market plan that says who handles product, marketing, and sales'},
   {k:'d_roadmap',cat:'Product',lvl:6,label:'A product roadmap shaped by user feedback, and a pricing strategy',showIf:s=>s.has('d_product')},
 ]},
 {id:'tech',part:1,type:'tech',sect:'Technology'},
 {id:'ip',part:1,type:'multi',sect:'Intellectual property',q:'Which of these are true for the IP behind your technology?',items:[
   {k:'ip1',cat:'IP',lvl:1,label:'We know which parts could be protected, and how (patent, trade secret, copyright, or trademark)'},
   {k:'ip2',cat:'IP',lvl:2,label:"An invention disclosure is filed with the university's tech transfer office, or IP counsel is engaged",help:"A confidential form describing an invention, filed with your university's tech transfer or innovation office. If you've talked with that office about this work, you may already have filed one."},
   {k:'ip3',cat:'IP',lvl:3,label:'A patent application has been filed (provisional or full)',ev:'Application number(s)',evOptional:true,help:'A provisional application secures a filing date for 12 months and is not examined. A full (non-provisional) application is the one the patent office examines.'},
   {k:'ip_ts',cat:'IP',lvl:3,label:'Trade secrets are documented, with controls on who can access them',help:'Know-how kept confidential instead of patented, such as a process, a formulation, or source code. It stays protected only while access is controlled.'},
   {k:'ip4',cat:'IP',lvl:4,label:'There have been conversations about licensing it, to a company or from the university'},
   {k:'ip5',cat:'IP',lvl:5,label:'A full (non-provisional) application is moving through the patent office',showIf:s=>s.has('ip3')},
   {k:'ip_tsprog',cat:'IP',lvl:5,label:'The trade-secret program is enforced: NDAs, access controls, and a record of what was shared with whom',showIf:s=>s.has('ip_ts')},
   {k:'ip6',cat:'IP',lvl:6,label:'At least one patent has been issued, or an exclusive license is signed',ev:'Patent number, or the licensee and date signed',showIf:s=>s.has('ip3')||s.has('ip4'),help:"An agreement giving one company sole rights to the technology, often limited to a field or region. An option to license doesn't count yet."},
   {k:'ip7',cat:'IP',lvl:7,label:'Multiple applications filed, including at least one outside the US',showIf:s=>s.has('ip3')},
   {k:'ip8',cat:'IP',lvl:8,label:'Two or more patents have been issued',showIf:s=>s.has('ip6')},
   {k:'ip9',cat:'IP',lvl:9,label:'Issued patents protect the main product you sell, with a plan to enforce them',showIf:s=>s.has('ip8')},
   {k:'ip_search',label:'A search for related patents (prior art or landscape search)',help:"A search of existing patents and publications for work close to yours, to see what's already claimed."},
   {k:'ip_fto',label:'A freedom-to-operate review',help:"A review, usually by a patent attorney, of whether making or selling your product would infringe someone else's patents. It's different from checking whether your own idea can be patented."},
   {k:'ip_copyright',label:'Software or content copyright is registered'},
   {k:'ip_public',label:'The work has been presented or published publicly',ev:'Link or DOI',evOptional:true},
 ]},
 {id:'team',part:1,type:'multi',sect:'Team',q:'Which of these describe the people working on this?',items:[
   {k:'t_commit',cat:'Team',lvl:1,label:'At least one person spends regular time moving this toward a business, beyond the research itself'},
   {k:'t_adv',cat:'Team',lvl:2,label:'Advisors or mentors with relevant industry experience give input on a regular basis'},
   {k:'t_agree',cat:'Team',lvl:3,label:'The people starting it have written down how ownership is split, who does what, and how decisions are made'},
   {k:'t_lead',cat:'Team',lvl:3,label:'One person is named as the business or entrepreneurial lead, and you know which roles to hire next'},
   {k:'t_added',cat:'Team',lvl:4,label:'Someone has joined beyond the original founders in a key technical or business role (equity can still be undecided)'},
   {k:'t_roles',cat:'Team',lvl:5,label:'The core team is working together with clear roles, even if some needed skills are still missing'},
   {k:'t_full',cat:'Team',lvl:6,label:'The team has every skill needed right now, including experienced business leadership, and everyone spends significant time'},
   {k:'t_orgplan',cat:'Team',lvl:7,label:'There is a written plan for how the organization will grow over the next two years',company:true},
   {k:'t_board',cat:'Team',lvl:8,label:'There is an experienced management team and a board that meets regularly',company:true},
   {k:'t_stable',cat:'Team',lvl:9,label:'The leadership team has stayed in place and performed well over several years',company:true,showIf:s=>s.has('t_board')},
 ]},
 {id:'fund',part:1,type:'multi',sect:'Funding',q:'Which of these funding steps have you taken?',items:[
   {k:'f1',cat:'Funding',lvl:1,label:'You can name the funding options that fit your stage (SBIR/STTR, angels, venture capital, strategic partners), what each expects, and roughly how much you need to reach your next milestone',help:'SBIR and STTR are federal programs that fund research and development at small businesses. STTR requires a formal partnership with a research institution.'},
   {k:'f_applied',cat:'Funding',lvl:2,label:'Applied for funding, or prepared a specific ask for a funder (grant application, pitch competition, friends and family)'},
   {k:'f_received',label:'Received grants or other non-dilutive funding (SBIR/STTR, gap funds, prizes)',ev:'List each grant: agency, amount, and period.',evOptional:true,help:"Money that doesn't cost any ownership: grants, SBIR/STTR awards, prizes, and gap funds."},
   {k:'f_private',label:'Received angel, venture capital, or other private investment',ev:'Source and amount.',evOptional:true},
   {k:'f_programs',label:'Taken part in other accelerators or programs, or won awards or competitions',ev:'Which ones, and when?',evOptional:true},
   {k:'f_proj',label:'A 12-month financial projection that ties funding needs to milestones'},
   {k:'f_cap',company:true,label:'A cap table showing who owns what share of the company',help:'A table of who owns what share of the company.'},
   {k:'f_deck',label:'A pitch deck'},
   {k:'f_model',label:'A three-year financial model with revenue projections'},
   {k:'f5',cat:'Funding',lvl:5,company:true,label:'Legal documents organized for funder review (IP assigned to the company, key contracts, employment agreements)'},
   {k:'f6',cat:'Funding',lvl:6,company:true,label:'A data room ready for investors, with documents reviewed by experienced counsel',showIf:s=>s.has('f5'),help:'An organized, shared folder of the documents investors review before investing.'},
   {k:'f7',cat:'Funding',lvl:7,company:true,label:'Outside investment (angel, strategic, philanthropic, or seed) has been received and is spent against defined milestones, with regular updates to investors'},
   {k:'f8',cat:'Funding',lvl:8,company:true,label:'Milestones from the last funding were met and documented, and board and investor reporting is in place',showIf:s=>s.has('f7')},
   {k:'f9',cat:'Funding',lvl:9,company:true,label:'Your diligence materials and record of delivering on past funding meet what a lead institutional investor (Series A or equivalent) requires',showIf:s=>s.has('f8')},
 ]},
 {id:'reg',part:1,type:'multi',sect:'Regulatory',when:(v,A)=>isHealth(A),q:'Which of these regulatory steps have you taken?',items:[
   {k:'r1',cat:'Regulatory',lvl:1,label:REG_ITEMS[0],help:'IND and IDE are FDA permission to test a new drug or biologic (IND) or a significant-risk device (IDE) in people. 510(k), De Novo, and PMA are routes to market a device; NDA and BLA are approvals to market a drug or biologic.'},
   {k:'r2',cat:'Regulatory',lvl:2,label:REG_ITEMS[1]},
   {k:'r3',cat:'Regulatory',lvl:3,label:REG_ITEMS[2]},
   {k:'r4',cat:'Regulatory',lvl:4,label:REG_ITEMS[3],help:'The documented procedures for design, testing, and manufacturing that FDA expects, such as design controls for a device.'},
   {k:'r5',cat:'Regulatory',lvl:5,label:REG_ITEMS[4],ev:'Meeting type and month',help:'A meeting you request with FDA before filing, to get feedback on your plan: a pre-IND meeting for drugs and biologics, a Pre-Submission (Q-Sub) for devices and diagnostics.'},
   {k:'r6',cat:'Regulatory',lvl:6,label:REG_ITEMS[5]},
   {k:'r7',cat:'Regulatory',lvl:7,label:REG_ITEMS[6]},
   {k:'r8',cat:'Regulatory',lvl:8,label:REG_ITEMS[7],showIf:s=>s.has('r7')},
   {k:'r9',cat:'Regulatory',lvl:9,label:REG_ITEMS[8],showIf:s=>s.has('r7')},
 ]},
 {id:'scale',part:1,type:'multi',sect:'Traction',when:(v,A)=>v(isHealth(A)?'c_reqs':'c_mvp')===true||v('c_rev')===true,q:'Which of these are true today?',items:[
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
 // Every follow-up to a ticked box, after the last checklist. Always in the
 // rail; skipped automatically when nothing needs a detail (evidenceItems()).
 {id:'evidence',part:1,type:'evidence',sect:'About your evidence'},
 // "Save", not "Submit": Part 1 is a checkpoint and the application goes straight on to Part 2.
 {id:'consent',part:1,type:'consent',sect:'Save Part 1'},
 {id:'written',part:2,type:'written',sect:'The technology and its applications',when:PART2},
 {id:'perspective',part:2,type:'perspective',sect:'Your perspective',when:PART2},
 {id:'people',part:2,type:'people',sect:"Who's involved",when:PART2},
 {id:'materials',part:2,type:'materials',sect:'Materials and submit',when:PART2},
];

export const partOf = id => (SCREENS.find(s => s.id === id) || {}).part || 1;

/* ---------- constants ---------- */

// Question-model version recorded with every submission.
export const VERSION = 'gen-3.3';

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

/** An item's wording for this applicant: the health-track version where there is one (gen-3.2). */
export function itemLabel(k, A) {
  return (A && isHealth(A) && HEALTH_LABEL[k]) || LABEL[k];
}

/* Items shown only on, or never on, the health tracks (gen-3.2). */
export function trackAllows(it, A) {
  if (it.healthOnly) return isHealth(A);
  if (it.notHealth) return !isHealth(A);
  return true;
}

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
const or3 = (...xs) => xs.some(x => x === true) ? true : xs.every(x => x === false) ? false : undefined;

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
    const company = A.project ? companyFormed(A) : undefined;
    switch (cat) {
      case 'TRL': return A.stage == null ? undefined : A.stage >= l;
      case 'Funding':
        if (l === 2) return v('f_applied');
        // gen-3.1: current or planned ownership. With a company, the cap table;
        // without one, the written ownership split from the Team screen.
        if (l === 3) return company === undefined ? undefined : and3(v('f_proj'), company ? v('f_cap') : v('t_agree'));
        if (l === 4) return and3(v('f_deck'), v('f_model'));
        return v('f' + l);
      case 'IP':
        if (l === 3) return or3(v('ip3'), v('ip_ts'));
        if (l === 5) return or3(v('ip5'), v('ip_tsprog'));
        return v('ip' + l);
      case 'Team':
        if (l === 3) return and3(v('t_agree'), v('t_lead'));
        return v(['t_commit', 't_adv', null, 't_added', 't_roles', 't_full', 't_orgplan', 't_board', 't_stable'][l - 1]);
      case 'Market':
        if (l === 1) return A.problem ? A.problem.known : undefined;
        // gen-3.1 (November 2026 framework, Market 2-4 reordered): L2 is early
        // discovery (any interviews), L3 one or a few chosen target markets sized,
        // with competitors, L4 substantial confirming discovery plus positioning.
        if (l === 2 || l === 4) {
          const t = v('c_talk');
          if (t !== true) return t;
          // the interview count and confirm pick are asked on the evidence screen
          if (!A.done.evidence) return undefined;
          if (l === 2) return (A.count || 0) >= 1;
          return and3((A.count || 0) >= 20 && A.confirm === 'Yes', v('d_why'));
        }
        if (l === 3) return and3(v('d_first'), v('d_size'), v('d_comp'));
        return v(['c_wtp', 'd_barriers', 's_m7', 's_m8', 's_m9'][l - 5]);
      case 'Product':
        // gen-3.2: Product 1 is a product hypothesis (form, intended use, intended
        // users) for a need found in Market: the customers pick plus a technology form.
        if (l === 1) return A.problem ? and3(A.problem.known, A.project && A.project.form ? true : undefined) : undefined;
        // gen-3.2: health tracks score Product 5 from validated requirements, not an MVP.
        if (l === 5) return v(isHealth(A) ? 'c_reqs' : 'c_mvp');
        return v([null, 'd_product', 'c_concept', 'c_proto', null, 'd_roadmap', 's_p7', 's_p8', 's_p9'][l - 1]);
      case 'GTM': return v(['d_first', 'd_roles', 'd_path', 'c_path', 'd_gtmplan', 'c_outreach', 's_g7', 's_g8', 's_g9'][l - 1]);
      case 'Business':
        // gen-3.1: L3 adds a chosen commercialization path (the outcome pick).
        if (l === 3) return and3(v('d_plan'), v('f_proj'), pathChosen(A));
        if (l === 4) return and3(v('c_price'), v('f_model'));
        // gen-3.1: the entity is the project's own company, or the university
        // or licensee on a license path.
        if (l === 5) return and3(v('c_paid'), or3(company, licensePath(A)));
        return v(['d_business', 'd_bmc', null, null, null, 'c_rev', 's_b7', 's_b8', 's_b9'][l - 1]);
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

  // Next-level text by index (level - 1); health tracks use NEXT_HEALTH where it differs.
  const health = isHealth(A);
  function nextFor(cat, i) {
    return (health && NEXT_HEALTH[cat] && NEXT_HEALTH[cat][i]) || NEXT[cat][i];
  }

  function nextText(cat, level) {
    if (level >= 9) return '';
    return cat === 'TRL' ? trlText(trk, level + 1) : nextFor(cat, level);
  }

  function itemVisible(it, local) {
    if (!trackAllows(it, A)) return false;
    if (it.company && !companyFormed(A)) return false;
    if (it.showIf && !it.showIf(local)) return false;
    return true;
  }

  function screenActive(sc) { return !sc.when || sc.when(val, A); }

  function hasItems(sc) {
    // Customers always asks whether specific customers are identified.
    if (sc.type !== 'multi' || sc.id === 'cust') return true;
    const pre = new Set(sc.items.filter(it => C[it.k] === true).map(it => it.k));
    const eff = closeSet([...pre]);
    return sc.items.some(it => !pre.has(it.k) && itemVisible(it, eff));
  }

  function activeScreens() { return SCREENS.filter(s => A.done[s.id] || (screenActive(s) && hasItems(s))); }
  function nextScreen() { return SCREENS.find(s => !A.done[s.id] && screenActive(s) && hasItems(s)); }

  /* consistency flags for the reviewer: [{id, text}]; per-claim flags also carry {item, said, count} */
  function flagItems() {
    const f = [], v = k => val(k) === true, help = (A.consent && A.consent.help) || [];
    const add = (id, text, extra) => f.push(Object.assign({ id, text }, extra));
    const n = A.count || 0;
    if ((v('c_paid') || v('c_rev')) && !(A.count > 0)) add('paid_no_interviews', 'Reports a paid pilot or revenue but no customer interviews counted');
    if (v('c_rev') && A.project && A.project.company !== 'Yes') add('revenue_no_company', 'Reports ongoing revenue but no company formed');
    if (v('t_full') && help.includes('A business co-founder or CEO')) add('team_vs_help', 'Says the team has experienced business leadership but asks for a business co-founder or CEO');
    if ((A.stage || 0) >= 7 && val('c_proto') !== true) add('trl_no_proto', 'Technology answer says it was tested with real users, but no outside user is reported trying a working prototype');
    // Asked at any count since gen-1.2; an older 20+ submission with no answer still counts.
    if (n > 0 && A.confirm !== 'Yes' && (A.confirm || n >= 20)) add('interviews_unconfirmed', 'Most interviews did not clearly confirm the problem (' + n + ' interviews; ' + (A.confirm || 'no answer') + ')');
    if (v('ip_public') && val('ip3') !== true) add('public_no_patent', 'Presented or published publicly with no patent application filed (possible bar to patenting)');
    if (v('f_private') && !companyFormed(A)) add('private_no_company', 'Private investment received but no company formed');
    if (A.project && ['2 to 3', 'More than 3'].includes(A.project.appCount) && val('d_first') !== true) add('many_apps_no_first', "Considering several applications but hasn't narrowed to one or a few target markets");

    // Customer discovery: conclusions vs. the conversations behind them (gen-1.2).
    const talked = v('c_talk') && n > 0;
    for (const [k, item] of Object.entries(SOURCE_ITEMS)) {
      const s = A.src && A.src[k];
      if (!v(k) || !s || !(s.from || []).length) continue;
      if (s.from.includes(SOURCE_NOT_SURE)) { add('claim_source_unsure', item + ': source not sure', { item }); continue; }
      if (!s.from.includes(CONVERSATIONS)) continue;
      if (!talked) add('claim_conversations_none', item + ': says it came from customer conversations, but no interviews are reported', { item });
      else if (s.said != null && (s.said * 2 < n || s.said < 5)) add('claim_thin_support', item + ': based on ' + s.said + ' of ' + n + ' interviews', { item, said: s.said, count: n });
    }
    if ((v('d_first') || v('d_why')) && !talked) add('claims_no_interviews', 'Has written down target markets or why customers would choose them, without customer conversations');
    if (A.problem && A.problem.known === false && (v('d_first') || v('d_why'))) add('no_customers_but_claims', 'Says no specific customers are identified yet, but has chosen target markets or a reason customers would choose them');
    const icorps = (A.project && A.project.icorps) || '';
    const floor = INTAKE_CONFIG.icorpsInterviewFloor || {};
    const kind = icorps.split(',')[0];
    if (/finished$/.test(icorps) && floor[kind] != null && n < floor[kind]) add('icorps_few_interviews', 'Finished ' + kind + ' I-Corps with ' + n + ' customer interviews');
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
    if ((o.outcome || '').startsWith('Start a company') && o.fullTime === 'No plans') add('no_full_time', 'Wants to start a company, but no one plans to work on it full time');
    // "Nothing yet" is answered in Part 2, so this is the one signal Part 2 can add.
    if (A.perspective && A.perspective.nothing && /finished$/.test(icorps)) add('icorps_nothing_changed', 'Finished I-Corps but reports nothing changed from customer or mentor feedback');
    if (['No', 'Not sure'].includes(o.engagement)) add('engagement', "Can't commit, or isn't sure they can commit, to the engagement");
    return f;
  }

  /* full reviewer result */
  function result(screensAnswered = 0) {
    const scores = {}, next = {};
    for (const c of CATS) {
      if (!cats.includes(c)) { scores[c] = null; next[c] = ''; continue; }
      const s = scan(c);
      // "None of these yet" (stage 0) means no TRL, not TRL 0: TRL starts at 1.
      scores[c] = c === 'TRL' && A.stage === 0 ? null : s.level;
      next[c] = nextText(c, s.level);
    }
    const implied = Object.entries(Object.assign({}, A.I || {}, by))
      .filter(([k]) => LABEL[k] && A.F[k] !== false)
      .map(([k, src]) => itemLabel(k, A) + (src ? ' (from: ' + (itemLabel(src, A) || src) + ')' : ''));
    const evidence = [];
    if (A.techEv) evidence.push({ q: 'Most advanced test or use', a: A.techEv });
    if (A.facilities) evidence.push({ q: 'Facilities and equipment', a: A.facilities });
    if (A.count != null) evidence.push({ q: 'Customer interviews outside the university', a: String(A.count) + (A.confirm ? ' (most confirmed the problem: ' + A.confirm + ')' : '') });
    for (const [k, a] of Object.entries(A.E)) evidence.push({ q: itemLabel(k, A), a });
    if (companyFormed(A)) evidence.push({ q: 'Company name and state', a: A.project.companyName });
    const extras = ['ip_search', 'ip_fto', 'ip_copyright', 'ip_public', 'f_applied', 'f_received', 'f_private', 'f_programs'].filter(k => C[k] === true).map(k => LABEL[k]);
    const progress = [];
    for (const c of cats) {
      const s = scan(c);
      for (let l = s.level + 2; l <= 9; l++) {
        if (gateVal(c, l) === true) progress.push({ cat: c, level: l, text: NAMES[c] + ' level ' + l + ': ' + (c === 'TRL' ? trlText(trk, l) : nextFor(c, l - 1)) });
      }
    }
    const notSure = Object.keys(A.unsure || {}).map(id => SCREENS.find(s => s.id === id).sect);
    const gates = gateItems(), fl = flagItems();
    return {
      version: VERSION, frameworkVersion: BRL_FRAMEWORK_VERSION, track: trk, cats, scores, next,
      gateFlags: gates.map(g => g.text), gateItems: gates,
      flags: fl.map(x => x.text), flagItems: fl,
      implied, evidence, extras, progress: progress.map(p => p.text), progressItems: progress,
      notSure, screens: screensAnswered, facts: C, stage: A.stage
    };
  }

  return { A, C, by, val, gateVal, scan, itemVisible, screenActive, hasItems, activeScreens, nextScreen, flags: () => flagItems().map(x => x.text), gateFlags: () => gateItems().map(x => x.text), flagItems, gateItems, result };
}

/* ---------- the evidence screen: follow-ups to what was ticked ---------- */

/**
 * What the "About your evidence" screen asks, from the committed Part 1
 * answers. Only items the applicant ticked get a detail or a source question;
 * implied ones don't.
 * Returns {
 *   count:   true when customer conversations are reported (the interview count,
 *            and the confirm pick when it is above 0)
 *   sources: [fact key] conclusions that get "Where does this come from?"
 *   details: [{ k, label, ev, optional, screen }] in screen order
 *   techEv:  'required' at TRL 4+; 'optional' at TRL 7+ when a prototype user is
 *            also asked for (it becomes optional once that is filled in); else null
 * }
 */
export function evidenceItems(A) {
  const { C } = closure(A);
  const ticked = k => !!(A.F && A.F[k] === true && !(A.I && k in A.I));
  const company = companyFormed(A);
  const details = [], sources = [];
  for (const sc of SCREENS) {
    if (sc.type !== 'multi' || !(A.done && A.done[sc.id])) continue;
    for (const it of sc.items) {
      if (!ticked(it.k) || (it.company && !company)) continue;
      if (it.ev) details.push({ k: it.k, label: itemLabel(it.k, A), ev: it.ev, optional: !!it.evOptional, screen: sc.id });
      if (SOURCE_ITEMS[it.k]) sources.push(it.k);
    }
  }
  const stage = A.stage || 0;
  return {
    count: C.c_talk === true,
    sources,
    details,
    techEv: stage >= 4 ? (stage >= 7 && details.some(d => d.k === 'c_proto') ? 'optional' : 'required') : null
  };
}

export function hasEvidenceQuestions(A) {
  const e = evidenceItems(A);
  return e.count || e.sources.length > 0 || e.details.length > 0 || !!e.techEv;
}

/* ---------- re-takes: carry forward what hasn't changed ---------- */
//
// A re-take opens on the "What's changed" screen. Each section from the last
// submission defaults to "No change" and is carried forward without being
// asked again; "Update" shows it pre-filled, and anything can be unchecked
// (applicants do pivot, and levels can go down). These are always asked again:
// "You and the project" (time spent goes stale), the Part 1 submit screen
// (the acknowledgment), "Your perspective", and "Materials and submit". The
// evidence screen is carried only when every checklist section is.

export const RETAKE_SECTIONS = [
  { id: 'applicant', label: 'Your details' },
  { id: 'project', label: 'Project' },
  { id: 'cust', label: 'Customers' },
  { id: 'docs', label: 'Plans on paper' },
  { id: 'tech', label: 'Technology stage' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'team', label: 'Team' },
  { id: 'fund', label: 'Funding' },
  { id: 'reg', label: 'Regulatory' },
  { id: 'scale', label: 'Traction' },
  { id: 'written', label: 'The technology and its applications (written)' },
  { id: 'people', label: "Who's involved" }
];

/**
 * True when a section answered on an earlier form version is missing a
 * question that is now required, so it has to be shown again. gen-3.0 added
 * the year started and moved the number of applications to Project, and
 * replaced the "no customers yet" box with the Customers pick.
 */
export function hasNewQuestions(P, id) {
  if (id === 'project') return !(P.project && P.project.oneLiner && P.project.started && P.project.appCount);
  if (id === 'cust') return !(P.problem && typeof P.problem.known === 'boolean');
  return false;
}

/* Every evidence question A now needs was answered in P. */
function evidenceAnswered(A, P) {
  const e = evidenceItems(A), blank = v => v == null || String(v).trim() === '';
  if (e.count && (P.count == null || (P.count > 0 && !P.confirm))) return false;
  for (const k of e.sources) {
    const s = P.src && P.src[k];
    if (!s || !(s.from || []).length) return false;
    if (s.from.includes(CONVERSATIONS) && s.said == null) return false;
  }
  if (e.details.some(d => !d.optional && blank(P.E && P.E[d.k]))) return false;
  if (e.techEv === 'required' && blank(P.techEv)) return false;
  return true;
}

/**
 * True when last time's answers for this screen can be carried forward
 * as they are. False when the screen was never answered, when it has a
 * new required question, or when an updated answer changes what the screen
 * asks (company status changes the Team and Funding items; a different
 * technology form changes the TRL options, the Regulatory screen, and the
 * facilities question; a newly ticked item adds an evidence question).
 */
export function canCarry(A, P, id) {
  if (!P || !P.done || !P.done[id]) return false;
  if (hasNewQuestions(P, id)) return false;
  const co = x => !!(x.project && x.project.company === 'Yes');
  if ((id === 'team' || id === 'fund') && co(A) !== co(P)) return false;
  if ((id === 'tech' || id === 'reg') && track(A) !== track(P)) return false;
  // gen-3.2: the Customers screen words Market 5 and asks Product 5 differently on the health tracks.
  if (id === 'cust' && isHealth(A) !== isHealth(P)) return false;
  if (id === 'people' && hasFacilities(A) !== hasFacilities(P)) return false;
  if (id === 'evidence') return evidenceAnswered(A, P);
  return true;
}

const clone = x => (x == null ? x : JSON.parse(JSON.stringify(x)));

/**
 * Copy one screen's answers from P into A. Call only when canCarry(). P is the
 * previous submission on a re-take, or a snapshot of this one when the
 * applicant jumps back to finish a skipped section (the screens that are
 * always asked again are only ever carried from a snapshot).
 */
export function carryForward(A, P, id) {
  const sc = SCREENS.find(s => s.id === id);
  if (id === 'applicant') A.applicant = clone(P.applicant);
  else if (id === 'project') A.project = clone(P.project);
  else if (id === 'founder') A.founder = clone(P.founder);
  else if (id === 'consent') A.consent = clone(P.consent);
  else if (id === 'written') A.written = clone(P.written);
  else if (id === 'perspective') A.perspective = clone(P.perspective);
  else if (id === 'materials') A.materials = clone(P.materials);
  else if (id === 'people') {
    A.team = clone(P.team) || [];
    A.facilities = hasFacilities(A) ? (P.facilities || '') : '';
  } else if (id === 'tech') A.stage = P.stage;
  else if (id === 'evidence') {
    const e = evidenceItems(A);
    A.E = {}; A.src = {};
    for (const d of e.details) if (P.E && P.E[d.k]) A.E[d.k] = P.E[d.k];
    for (const k of e.sources) if (P.src && P.src[k]) A.src[k] = clone(P.src[k]);
    if (e.count) { A.count = P.count; if (P.count > 0) A.confirm = P.confirm; }
    if (e.techEv && P.techEv) A.techEv = P.techEv;
  } else if (sc && sc.type === 'multi') {
    A.I = A.I || {};
    for (const it of sc.items) {
      if (P.F && it.k in P.F) A.F[it.k] = P.F[it.k];
      if (P.I && it.k in P.I) A.I[it.k] = P.I[it.k];
    }
    if (id === 'cust') A.problem = clone(P.problem);
  }
  if (P.unsure && P.unsure[id]) A.unsure[id] = true;
}

/** One line describing last time's answers for a section ("" if never answered). */
export function sectionSummary(P, id) {
  if (!P || !P.done || !P.done[id]) return '';
  const ap = P.applicant || {}, pr = P.project || {};
  if (id === 'applicant') return [[ap.first, ap.last].filter(Boolean).join(' '), ap.org].filter(Boolean).join(' · ');
  if (id === 'project') return [pr.title, pr.form, pr.company === 'Yes' ? 'company formed' : 'no company yet'].filter(Boolean).join(' · ');
  if (id === 'written') return 'Your written answers about the technology and its applications';
  if (id === 'people') {
    const n = (P.team || []).length;
    return n ? `${n} ${n === 1 ? 'person' : 'people'} listed` : 'No one listed';
  }
  if (id === 'tech') return P.stage ? trlOptions(P)[P.stage].title : 'None of the milestones yet';
  const sc = SCREENS.find(s => s.id === id);
  const n = sc.items.filter(it => P.F && P.F[it.k] === true).length;
  return n ? `${n} item${n === 1 ? '' : 's'} checked` : 'Nothing checked';
}

/* ---------- comparisons between two intakes ---------- */

/** Categories whose draft level moved between two submissions: [{cat, before, now}]. */
export function levelChanges(prevA, A) {
  const before = createModel(prevA).result(), now = createModel(A).result();
  return now.cats
    .filter(c => before.scores[c] != null && now.scores[c] != null && before.scores[c] !== now.scores[c])
    .map(c => ({ cat: c, before: before.scores[c], now: now.scores[c] }));
}

/**
 * What changed between a previous intake and this one, in plain language.
 */
export function diffFacts(prevA, A) {
  const before = closure(prevA).C, after = closure(A).C;
  const keys = Object.keys(LABEL);
  const added = keys.filter(k => after[k] === true && before[k] !== true).map(k => itemLabel(k, A));
  const removed = keys.filter(k => before[k] === true && after[k] !== true).map(k => itemLabel(k, prevA));
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

/** The team roster, one person per line: "Name — role, time, link, expertise". */
export function rosterLines(team) {
  return (team || []).filter(p => p && p.name)
    .map(p => p.name + ' — ' + [p.role, p.time, p.link, p.expertise].filter(Boolean).join(', '));
}

/** Where a checked conclusion item came from, e.g. "customer conversations (12 of 25 said this)"; "" if not asked. */
export function sourceText(A, k) {
  const s = A.src && A.src[k];
  if (!s || !(s.from || []).length) return '';
  const n = A.count || 0;
  const said = s.said == null ? '' : ' (' + s.said + (n > 0 ? ' of ' + n : '') + ' said this)';
  return s.from.map(x => x.toLowerCase()).join(', ') + said;
}

function uploadNames(A) {
  const u = A.uploads || {}, out = [];
  const name = (x) => x ? (x.link ? x.link : x.name) : '';
  if (u.deck) out.push('Pitch deck: ' + name(u.deck));
  if (u.plan) out.push('Business plan or canvas: ' + name(u.plan));
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
  const ap = A.applicant || {}, pr = A.project || {}, wr = A.written || {}, pe = A.perspective || {}, fo = A.founder || {}, ma = A.materials || {}, cs = A.consent || {}, cx = A.ctx || {};
  const C_ = r.facts;
  const known = A.problem && typeof A.problem.known === 'boolean' ? (A.problem.known ? 'Yes' : 'Not yet') : '';
  const row = {
    [COL.ventureName]: pr.title,
    [COL.formVersion]: VERSION,
    [COL.frameworkVersion]: BRL_FRAMEWORK_VERSION,
    [COL.source]: cx.source,
    [COL.portfolio]: cx.portfolio,
    [COL.completedWith]: cs.completedWith,
    [COL.institution]: ap.org,
    [COL.applicantName]: [ap.first, ap.last].filter(Boolean).join(' '),
    [COL.email]: ap.email,
    [COL.linkedin]: ap.linkedin,
    [COL.role]: ap.role,
    // The roster (Part 2); a re-take that carried an older Team section keeps its free text.
    [COL.teamMembers]: A.team ? rosterLines(A.team).join('\n') : ap.team,
    [COL.oneLiner]: pr.oneLiner,
    [COL.technologyForm]: pr.form,
    [COL.trlTrack]: TRACK_LABEL[r.track],
    [COL.companyFormed]: pr.company,
    [COL.companyNameState]: pr.company === 'Yes' ? pr.companyName : '',
    [COL.icorps]: pr.icorps,
    [COL.ventureUrl]: pr.website,
    [COL.yearStarted]: pr.started,
    [COL.applicationsConsidered]: pr.appCount,
    [COL.customersIdentified]: known,
    [COL.technologyDescription]: wr.technology,
    [COL.applications]: wr.applications,
    [COL.impact]: wr.impact,
    [COL.nationalSecurityRelevance]: joinList(wr.nsRelevance),
    [COL.collaborators]: pe.collaborators,
    [COL.outcomeWanted]: fo.outcome,
    [COL.roleWanted]: fo.role,
    [COL.mainReason]: fo.why,
    [COL.whyText]: pe.whyText,
    [COL.timeSpent]: fo.spent,
    [COL.hoursPerWeek]: fo.hours,
    [COL.fullTimePlans]: fo.fullTime,
    [COL.engagementCommitment]: fo.engagement,
    [COL.conflicts]: fo.conflicts,
    [COL.priorExperience]: joinList(fo.prior) + (fo.priorDetail ? ' (' + fo.priorDetail + ')' : ''),
    [COL.changedFromFeedback]: pe.nothing ? 'Nothing yet' : pe.changed,
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
    [COL.programsAndAwards]: C_.f_programs === true ? (A.E.f_programs || 'Yes') : '',
    [COL.discoverySources]: Object.entries(SOURCE_ITEMS).filter(([k]) => C_[k] === true && sourceText(A, k))
      .map(([k, item]) => item + ': ' + sourceText(A, k)).join('; '),
    [COL.helpWanted]: joinList(cs.help),
    [COL.anythingElse]: ma.anythingElse,
    [COL.aiOptOut]: cs.aiOptOut ? 'Yes' : 'No',
    [COL.uploadFileNames]: uploadNames(A).join('\n'),
    [COL.factsTrue]: Object.keys(C_).filter(k => C_[k] === true).sort().join(', ')
  };
  for (const c of r.cats) row[BRL_COLUMN_BY_CAT[c]] = r.scores[c];
  if (ctx.previousA) {
    const moved = levelChanges(ctx.previousA, A).map(x => `${NAMES[x.cat]} ${x.before} to ${x.now}`);
    row[COL.changesSincePrevious] = (moved.length ? 'Level changes: ' + moved.join('; ') + ' | ' : '') + formatDiff(diffFacts(ctx.previousA, A));
  }
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
  const ap = A.applicant || {}, pr = A.project || {}, wr = A.written || {}, pe = A.perspective || {}, fo = A.founder || {}, ma = A.materials || {}, cs = A.consent || {};
  const sections = [];
  const nonEmpty = xs => xs.filter(x => x && !/: $/.test(x) && !/: undefined$/.test(x));

  if (A.applicant) {
    sections.push({ sect: 'Applicant', items: nonEmpty([
      'Name: ' + [ap.first, ap.last].filter(Boolean).join(' '),
      'Email: ' + ap.email,
      'Organization: ' + ap.org,
      'Your role: ' + ap.role,
      ap.linkedin ? 'LinkedIn or profile: ' + ap.linkedin : '',
      ap.team && !A.team ? 'Team members: ' + ap.team : ''
    ]) });
  }
  if (A.project) {
    sections.push({ sect: 'Project', items: nonEmpty([
      'Project: ' + pr.title,
      pr.oneLiner ? 'In one sentence: ' + pr.oneLiner : '',
      'Technology form: ' + pr.form,
      pr.company === 'Yes' ? 'Company: ' + pr.companyName : 'Company formed: ' + pr.company,
      'I-Corps: ' + pr.icorps,
      pr.started ? 'Work started: ' + pr.started : '',
      pr.appCount ? 'Applications or markets considered: ' + pr.appCount : '',
      pr.website ? 'Website: ' + pr.website : ''
    ]) });
  }
  if (A.founder) {
    sections.push({ sect: 'You and the project', items: nonEmpty([
      'Main reason: ' + fo.why,
      'Outcome you want: ' + fo.outcome + (fo.role ? ', as ' + fo.role : ''),
      'Time on this in the last three months: ' + fo.spent,
      'Hours a week available: ' + fo.hours,
      fo.fullTime ? 'Anyone planning to work on it full time: ' + fo.fullTime : '',
      fo.engagement ? 'Engagement commitment: ' + fo.engagement + (fo.conflicts ? ' (' + fo.conflicts + ')' : '') : '',
      (fo.prior || []).length ? 'Prior experience: ' + fo.prior.join(', ') + (fo.priorDetail ? ' (' + fo.priorDetail + ')' : '') : ''
    ]) });
  }

  for (const sc of SCREENS) {
    if (sc.id === 'tech' && A.stage != null) {
      const items = [A.stage === 0 ? 'None of the listed milestones yet' : 'Furthest point reached: ' + trlText(track(A), A.stage)];
      if (A.techEv) items.push('Most advanced test or use: ' + A.techEv);
      sections.push({ sect: 'Technology', items });
    }
    if (sc.type !== 'multi' || !A.done[sc.id]) continue;
    const items = sc.items
      .filter(it => C[it.k] === true && !(it.company && pr.company !== 'Yes') && trackAllows(it, A))
      .map(it => {
        let text = displayText(itemLabel(it.k, A), sc.id, A);
        if (it.k === 'c_talk' && A.count != null) text += ' (' + A.count + ' interviews)';
        if (A.E[it.k]) text += ': ' + A.E[it.k];
        if (sourceText(A, it.k)) text += ' (from: ' + sourceText(A, it.k) + ')';
        return text;
      });
    if (sc.id === 'cust' && A.problem && typeof A.problem.known === 'boolean') {
      items.unshift('Specific customers or users identified: ' + (A.problem.known ? 'Yes' : 'Not yet'));
    }
    sections.push({ sect: sc.sect, items: items.length ? items : ['None yet'] });
  }
  if (A.consent) {
    sections.push({ sect: 'Other answers', items: nonEmpty([
      'What would help most: ' + ((cs.help || []).join(', ') || 'Nothing selected'),
      cs.completedWith && cs.completedWith !== 'No' ? 'Filled in with help from: ' + cs.completedWith : '',
      cs.aiOptOut ? 'You opted out of AI processing' : ''
    ]) });
  }

  if (A.written) {
    sections.push({ sect: 'The technology and its applications', items: nonEmpty([
      'The technology: ' + wr.technology,
      'The applications: ' + wr.applications,
      (wr.nsRelevance || []).length ? 'Where it could be used: ' + wr.nsRelevance.join(', ') : '',
      wr.impact ? 'Broader impact: ' + wr.impact : ''
    ]) });
  }
  if (A.perspective) {
    sections.push({ sect: 'Your perspective', items: nonEmpty([
      'Why this, why now: ' + pe.whyText,
      pe.nothing ? 'Changed from feedback: Nothing yet' : 'Changed from feedback: ' + pe.changed,
      pe.collaborators ? 'Key collaborators or partners: ' + pe.collaborators : ''
    ]) });
  }
  if (A.done && A.done.people) {
    const people = rosterLines(A.team);
    sections.push({ sect: "Who's involved", items: nonEmpty([
      ...(people.length ? people : ['No one else listed']),
      A.facilities ? 'Facilities and equipment: ' + A.facilities : ''
    ]) });
  }
  if (A.materials) {
    const files = uploadNames(A);
    sections.push({ sect: 'Materials', items: nonEmpty([
      files.length ? 'Files and links: ' + files.join('; ') : 'No files or links added',
      ma.anythingElse ? 'Anything else: ' + ma.anythingElse : ''
    ]) });
  }
  return sections;
}
