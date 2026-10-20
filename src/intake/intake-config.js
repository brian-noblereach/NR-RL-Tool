// intake-config.js - Everything program-specific about the venture intake.
//
// PURE, zero imports. The form itself names no cohort, region, deadline, or
// technology domain; those live here. Edit this file to re-point the intake
// at a different program, then redeploy the static site.
//
// The upload limits are also enforced by the proxy (INTAKE_UPLOAD in
// proxy-update/Code.gs). tests/proxy-intake.test.js fails if the two differ.

export const INTAKE_CONFIG = {
  // Shown as "{programName} application". Applicants include researchers, formed
  // companies, and everything in between: avoid "venture" and "founder" here.
  programName: 'NobleReach',

  // Default Portfolio column value. A ?portfolio= link parameter overrides it.
  // Use the same values as the RL and QM portfolio dropdowns.
  portfolio: '',

  landing: {
    heading: 'Tell us about your project',
    paragraphs: [
      'This application asks what has actually happened with your project so far: the technology, customers, IP, team, and funding. It is not a test, and there are no wrong answers.',
      'Your answers go to the NobleReach team, who will be in touch about next steps.'
    ]
  },

  // Shown on the first screen. Set after internal testing.
  estimatedTime: 'about 20 minutes',

  // Structured engagement. Leave as null to hide the commitment question.
  // Example: { hoursPerWeek: 5, months: 6 }
  engagement: null,

  // Optional organization pick list. Empty = free text (with suggestions).
  organizations: [],
  organizationSuggestions: ['UKY', 'Vandy', 'UoL', 'UTK', 'UCF', 'UF', 'USF', 'Embry Riddle'],

  // Technology domain pick list. Seeded from the Sector values in
  // S2V_Master_Portfolio (v3/v4). "Other" (with text) is always added.
  domains: [
    'Advanced Manufacturing', 'Advanced Materials', 'Aerospace / UAV', 'Biotech',
    'Chemical / Industrial', 'Communications / RF', 'Cybersecurity', 'Defense',
    'Defense / Autonomy', 'Diagnostics', 'Digital Health', 'Energy / CleanTech',
    'Environmental', 'Lab Equipment', 'Medtech', 'Robotics', 'Semiconductor',
    'Software/AI', 'Space Tech', 'Therapeutics'
  ],

  // Written answers. Warn at the limit; block above limit x blockFactor.
  wordLimits: { science: 250, value: 200, impact: 200 },
  wordLimitBlockFactor: 1.25,

  uploads: {
    maxBytes: 20 * 1024 * 1024,
    maxSupporting: 3,
    // extension -> accepted MIME types (an empty or generic browser type is also accepted)
    types: {
      pdf: ['application/pdf'],
      pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      png: ['image/png'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      mp4: ['video/mp4']
    }
  },

  // Screen 12. DRAFT (spec Appendix B) — needs Brian's review before use.
  submissionHandling: {
    heading: 'How NobleReach handles your submission',
    paragraphs: [
      'Your answers and any files you upload are stored in NobleReach\'s Smartsheet Gov account. Only NobleReach staff and the advisors reviewing your submission can see them.',
      'NobleReach may use AI tools to help review submissions, for example to summarize your materials or research your market. These are paid platforms whose terms don\'t allow training on your data. A person reviews every submission and makes every decision.',
      'You can opt out. If you check the box below, NobleReach won\'t process your files or written answers with AI tools, and a person will review them instead.',
      'Please leave out confidential details that aren\'t yet protected, such as specifics of an invention that hasn\'t been filed, unless your tech transfer office has cleared them. Submitting this form doesn\'t create a confidentiality agreement.'
    ],
    ackLabel: 'I\'ve read how NobleReach handles my submission.',
    optOutLabel: 'Don\'t use AI tools to process my files or written answers.'
  },

  // Thank-you screen: what happens next.
  nextSteps: 'The NobleReach team reviews every submission. If your project is a fit for a readiness interview, someone from the team will email you to set up a call.',

  // Pre-call brief questions (rule-based, no AI). {placeholders} are filled in
  // by src/intake/intake-brief.js. Tune wording here; selection rules live there.
  brief: {
    minQuestions: 5,
    maxQuestions: 10,
    gate: {
      why_expected: 'You said your funding or department expects this. What would you want out of it for yourself?',
      why_unsure: 'What would make taking this beyond the lab worth it to you?',
      outcome_unsure: 'If this works, what would you like to happen with the technology: a company, a license, or something else?',
      no_time: 'What has kept you from working on this so far, and what changes now?',
      plans_hours_no_time: 'You plan to give this {hours} but haven\'t spent time on it yet. What will you set aside to make room?',
      low_hours: 'With under 3 hours a week, what would you realistically get done over the next six months?',
      lead_low_hours: 'You want to help lead a company with only {hours} hours a week. Who else would carry the work?',
      icorps_nothing_changed: 'You finished I-Corps but reported no changes from feedback. What did the customer interviews tell you?',
      engagement: 'Can the project lead commit to the engagement? What would need to change to make the time?'
    },
    flag: {
      paid_no_interviews: 'You reported a paid pilot or revenue but no customer interviews. Who are these customers, and how did you find them?',
      revenue_no_company: 'You reported ongoing revenue but no company. Who receives that revenue today?',
      team_vs_help: 'You described the team as having experienced business leadership but asked for a business co-founder. Which role is missing?',
      trl_no_proto: 'You said the technology has been tested with real users, but no outside user tried a prototype. Who tested it, and where?',
      interviews_unconfirmed: 'Most of your interviews did not clearly confirm the problem. What did you hear instead?',
      public_no_patent: 'The work has been presented or published, but no patent application is filed. When was it disclosed, and has the tech transfer office reviewed the patenting risk?',
      private_no_company: 'You reported private investment but no company. Who invested, and into what?'
    },
    unsure: 'Walk through the {screen} items you weren\'t sure about.',
    evidence: {
      ip3: 'Confirm the application number, filing date, and who owns it.',
      c_wtp: 'Who signed the letter of intent or purchase order, and what does it commit them to?',
      c_paid: 'What was the scope and amount of the paid pilot, and who paid?',
      c_talk: 'Who were the {count} people you interviewed, and how many were buyers versus users?',
      c_proto: 'What did the prototype users do with it, and what did they say?'
    },
    ahead: 'You\'ve done "{done}" but not "{missing}". What\'s blocking that?',
    lowest: '{category}: what would it take to get to "{next}"?'
  }
};
