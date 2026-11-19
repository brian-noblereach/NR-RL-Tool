// intake-columns.js - The "Venture Intake Submissions" Smartsheet columns.
//
// PURE, zero imports. The single source for:
//   - the row the intake writes (intake-model.js buildRow uses COL.* titles)
//   - the columns the proxy sets itself (mirrored in proxy-update/Code.gs
//     INTAKE_SERVER_COLUMNS — tests/intake-row.test.js checks they agree)
//   - the import template in docs/smartsheet/ (tools/make-intake-template.py;
//     tests/intake-row.test.js checks the CSV header matches)
//
// The proxy matches columns by TITLE, so renaming a column is: change the
// title here, regenerate the template, rename the column in Smartsheet.
// Titles shared with the QM and RL sheets use their existing names so rows
// can be joined across tools (Venture Name, Institution, Technology
// Description, Venture URL, Portfolio).
//
// Every column is filled by the tool (Brian, Oct 2026): form answers, the
// draft BRL levels derived from them, and rule-based outputs (no generative
// AI). Columns the team fills by hand are not part of the template.
//
// writtenBy: 'server'   - set by the proxy; client values ignored
//            'app'      - sent by the intake page
// type is the suggested Smartsheet column type (see the template's guide).

const PORTFOLIO_VALUES = ['Northeastern CRI - 2026', 'Penn State GAP - 2026', 'CBC', 'NSF Mid-South', 'NSF Southeast', 'APL', 'Other'];

export const COLUMNS = [
  // Primary column first: Smartsheet uses the first column as the row label.
  { key: 'ventureName', title: 'Venture Name', group: 'Project', type: 'Text', writtenBy: 'server', notes: 'Project or technology title. Same title as the QM and RL sheets. Primary column.' },

  // Submission
  { key: 'submissionId', title: 'Submission ID', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'Unique per submission. Shown to the applicant.' },
  { key: 'submittedAt', title: 'Submitted At', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'ISO timestamp (UTC). Keep as Text, or switch to Date if you only need the day.' },
  { key: 'formVersion', title: 'Form Version', group: 'Submission', type: 'Text', writtenBy: 'app', notes: 'Question-model version, e.g. gen-2.0.' },
  { key: 'frameworkVersion', title: 'Framework Version', group: 'Submission', type: 'Text', writtenBy: 'app', notes: 'BRL framework the draft levels follow, e.g. November 2026.' },
  { key: 'source', title: 'Source', group: 'Submission', type: 'Text', writtenBy: 'app', notes: 'From the ?source= link parameter.' },
  { key: 'portfolio', title: 'Portfolio', group: 'Submission', type: 'Dropdown', options: PORTFOLIO_VALUES, writtenBy: 'app', notes: 'Program, from the intake config or ?portfolio=. Same values as the RL and QM dropdowns.' },
  { key: 'intakeNumber', title: 'Intake Number', group: 'Submission', type: 'Number', writtenBy: 'server', notes: '1 for the first submission from this email, 2 for a re-take, ...' },
  { key: 'previousSubmissionId', title: 'Previous Submission ID', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'The submission a re-take started from.' },
  { key: 'ventureId', title: 'Venture ID', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'Readable ID shared across tools, e.g. UCF-SENSORMESH-7K: organization initials, project words, 2 random characters. Created on the first submission and inherited by every re-take; never changes, even if the project is renamed. Use it to link the RL tool, QM, VDR, Salesforce (External ID field), and SharePoint folders.' },
  { key: 'returnCode', title: 'Return Code', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'One per email. Staff can read it here if an applicant loses it.' },
  { key: 'emailSent', title: 'Email Sent', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'Yes, Pending, or Failed: reason.' },
  { key: 'applicationStatus', title: 'Application Status', group: 'Submission', type: 'Dropdown', options: ['Part 1 submitted', 'Complete'], writtenBy: 'server', notes: 'Part 1 (the facts and draft levels) is saved first; Complete once Part 2 (written answers and materials) arrives. Filter on "Part 1 submitted" to see who has not finished.' },
  { key: 'part2SubmittedAt', title: 'Part 2 Submitted At', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'ISO timestamp (UTC) of Part 2.' },
  { key: 'completedWith', title: 'Completed With', group: 'Submission', type: 'Dropdown', options: ['No', 'Someone on the project', 'A tech transfer office', 'An advisor or mentor'], writtenBy: 'app', notes: 'Did anyone help fill this in? (optional)' },

  // Applicant
  { key: 'institution', title: 'Institution', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'University or organization. Same title as the QM and RL sheets.' },
  { key: 'applicantName', title: 'Applicant Name', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'First and last name.' },
  { key: 'email', title: 'Email', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'Lowercased.' },
  { key: 'emailDomain', title: 'Email Domain', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'For per-institution reports.' },
  { key: 'linkedin', title: 'Applicant LinkedIn', group: 'Applicant', type: 'Text', writtenBy: 'app', notes: 'LinkedIn or other professional profile link (optional).' },
  { key: 'role', title: 'Role', group: 'Applicant', type: 'Dropdown', options: ['Faculty or PI', 'Co-investigator', 'Postdoc', 'Grad student', 'Founder from outside the university', 'Other'], writtenBy: 'app', notes: 'Role on the project.' },
  { key: 'teamMembers', title: 'Team Members', group: 'Applicant', type: 'Text', writtenBy: 'app', notes: 'One person per line: name, role, time commitment, profile link, expertise. Older submissions hold free text.' },

  // Project
  { key: 'technologyForm', title: 'Technology Form', group: 'Project', type: 'Dropdown', options: ['Software', 'Hardware or physical device', 'Material, chemistry, or process', 'Therapeutic', 'Diagnostic', 'Medical device', 'Other'], writtenBy: 'app' },
  { key: 'trlTrack', title: 'TRL Track', group: 'Project', type: 'Dropdown', options: ['General', 'Software', 'Hardware', 'Therapeutics', 'Diagnostics', 'Medical device'], writtenBy: 'app', notes: 'Set by Technology Form.' },
  { key: 'companyFormed', title: 'Company Formed', group: 'Project', type: 'Dropdown', options: ['Yes', 'No', 'Not sure'], writtenBy: 'app' },
  { key: 'companyNameState', title: 'Company Name and State', group: 'Project', type: 'Text', writtenBy: 'app' },
  { key: 'icorps', title: 'I-Corps', group: 'Project', type: 'Dropdown', options: ['Not in I-Corps', 'Regional, in progress', 'Regional, finished', 'National, in progress', 'National, finished'], writtenBy: 'app' },
  { key: 'ventureUrl', title: 'Venture URL', group: 'Project', type: 'Text', writtenBy: 'app', notes: 'Website. Same title as the QM sheet.' },
  { key: 'yearStarted', title: 'Year Started', group: 'Project', type: 'Text', writtenBy: 'app', notes: 'Year work on the project started ("Before 2020", or a year).' },
  { key: 'applicationsConsidered', title: 'Applications Considered', group: 'Project', type: 'Dropdown', options: ['One', '2 to 3', 'More than 3', 'Not sure'], writtenBy: 'app', notes: 'How many applications or markets they are considering for the technology.' },
  { key: 'customersIdentified', title: 'Customers Identified', group: 'Project', type: 'Dropdown', options: ['Yes', 'Not yet'], writtenBy: 'app', notes: 'Have they identified the specific customers or users who have this problem? Sets Market 1 and Product 1.' },

  // Written answers (Part 2, except the one-liner)
  { key: 'oneLiner', title: 'One-Line Description', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'What it is and who it is for, in one sentence (required, up to 40 words).' },
  { key: 'technologyDescription', title: 'Technology Description', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'What it is, how it works, what is new, results so far (200 words). Same title as the QM sheet.' },
  { key: 'applications', title: 'Applications', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'The problem and who has it, what they use today, the first application and why, other applications (150 words).' },
  { key: 'impact', title: 'Impact (optional)', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Broader impact, including public health, environmental, or national security (optional, 40 words).' },
  { key: 'nationalSecurityRelevance', title: 'National Security Relevance', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Picks, separated by ; (Defense or intelligence use, Other government agency use, Commercial use, Not sure yet).' },
  { key: 'collaborators', title: 'Collaborators', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Key collaborators or industry partners (optional).' },

  // Founder
  { key: 'outcomeWanted', title: 'Outcome Wanted', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'roleWanted', title: 'Role Wanted', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'mainReason', title: 'Main Reason', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'whyText', title: 'Why This, Why Now', group: 'Founder', type: 'Text', writtenBy: 'app', notes: 'Part 2, in their words (40 words).' },
  { key: 'timeSpent', title: 'Time Spent Last 3 Months', group: 'Founder', type: 'Dropdown', options: ['Yes', 'No'], writtenBy: 'app' },
  { key: 'hoursPerWeek', title: 'Hours per Week', group: 'Founder', type: 'Dropdown', options: ['Under 3', '3 to 5', '5 to 10', '10 to 20', 'More than 20', 'Full time'], writtenBy: 'app' },
  { key: 'fullTimePlans', title: 'Full-Time Plans', group: 'Founder', type: 'Dropdown', options: ['Already', 'Within 12 months', 'Later', 'No plans'], writtenBy: 'app', notes: 'Does anyone plan to work on this full time?' },
  { key: 'engagementCommitment', title: 'Engagement Commitment', group: 'Founder', type: 'Dropdown', options: ['Yes', 'No', 'Not sure'], writtenBy: 'app', notes: 'Blank when the config sets no engagement terms.' },
  { key: 'conflicts', title: 'Conflicts', group: 'Founder', type: 'Text', writtenBy: 'app', notes: 'Sabbatical, leave, or other conflicts.' },
  { key: 'priorExperience', title: 'Prior Experience', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'changedFromFeedback', title: 'Changed From Feedback', group: 'Founder', type: 'Text', writtenBy: 'app', notes: 'Part 2: one thing they changed because of feedback, or "Nothing yet" (60 words).' },

  // Draft BRL levels, derived from the applicant's answers (not advisor scores)
  { key: 'brlTechnology', title: 'Draft BRL - Technology', group: 'Draft BRL', type: 'Number', writtenBy: 'app', notes: 'Derived from the applicant\'s answers, 1-9; blank if not yet at TRL 1. Not an advisor score.' },
  { key: 'brlIP', title: 'Draft BRL - IP', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlProduct', title: 'Draft BRL - Product', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlMarket', title: 'Draft BRL - Market', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlGTM', title: 'Draft BRL - Go-to-Market', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlBusiness', title: 'Draft BRL - Business Model', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlTeam', title: 'Draft BRL - Team', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlFunding', title: 'Draft BRL - Funding', group: 'Draft BRL', type: 'Number', writtenBy: 'app' },
  { key: 'brlRegulatory', title: 'Draft BRL - Regulatory', group: 'Draft BRL', type: 'Number', writtenBy: 'app', notes: 'Health tracks only; blank otherwise.' },

  // Next level and review
  { key: 'nextLevelNeeds', title: 'Next Level Needs', group: 'Review', type: 'Text', writtenBy: 'app', notes: 'One line per category.' },
  { key: 'gateSignals', title: 'Gate Signals', group: 'Review', type: 'Text', writtenBy: 'app' },
  { key: 'reviewFlags', title: 'Review Flags', group: 'Review', type: 'Text', writtenBy: 'app' },
  { key: 'unsureAbout', title: 'Unsure About', group: 'Review', type: 'Text', writtenBy: 'app' },
  { key: 'questionsForCall', title: 'Questions for the Call', group: 'Review', type: 'Text', writtenBy: 'app', notes: 'From the pre-call brief. The full brief is attached as precall-brief.html.' },

  // Evidence
  { key: 'evidence', title: 'Evidence', group: 'Evidence', type: 'Text', writtenBy: 'app' },
  { key: 'countedFromOther', title: 'Counted From Other Answers', group: 'Evidence', type: 'Text', writtenBy: 'app' },
  { key: 'doneAhead', title: 'Done Ahead of Next Level', group: 'Evidence', type: 'Text', writtenBy: 'app' },
  { key: 'alsoDone', title: 'Also Done', group: 'Evidence', type: 'Text', writtenBy: 'app' },
  { key: 'discoverySources', title: 'Discovery Sources', group: 'Evidence', type: 'Text', writtenBy: 'app', notes: 'Where each conclusion came from (target markets, why customers would choose them, price), and how many interviewees said it.' },

  // Funding history (stored, not scored)
  { key: 'grantsReceived', title: 'Grants Received', group: 'Funding history', type: 'Text', writtenBy: 'app', notes: 'Agency, amount, and period for each grant.' },
  { key: 'privateInvestment', title: 'Private Investment Received', group: 'Funding history', type: 'Text', writtenBy: 'app', notes: 'Source and amount.' },
  { key: 'programsAndAwards', title: 'Programs and Awards', group: 'Funding history', type: 'Text', writtenBy: 'app', notes: 'Other accelerators or programs, awards, and competitions, with dates.' },

  // Other
  { key: 'helpWanted', title: 'Help Wanted', group: 'Other', type: 'Text', writtenBy: 'app' },
  { key: 'anythingElse', title: 'Anything Else', group: 'Other', type: 'Text', writtenBy: 'app', notes: 'Optional closing comments (up to 200 words).' },
  { key: 'aiOptOut', title: 'AI Processing Opt-Out', group: 'Other', type: 'Dropdown', options: ['Yes', 'No'], writtenBy: 'app', notes: 'Yes = do not send this row or its attachments to any AI tool (including the QM tool). Check before any AI step.' },
  { key: 'uploadFileNames', title: 'Upload File Names', group: 'Uploads', type: 'Text', writtenBy: 'server', notes: 'Attached files and submitted links.' },
  { key: 'uploadStatus', title: 'Upload Status', group: 'Uploads', type: 'Text', writtenBy: 'server', notes: 'Per file: attached, or failed with the reason.' },

  // Kept from the founder intake (re-take tracking)
  { key: 'changesSincePrevious', title: 'Changes Since Previous', group: 'Re-take', type: 'Text', writtenBy: 'app' },
  { key: 'factsTrue', title: 'Facts True', group: 'Re-take', type: 'Text', writtenBy: 'app', notes: 'Fact keys, so levels can be recomputed if the rules change.' },

];

// COL.ventureName -> 'Venture Name'. Use these, never literal titles.
export const COL = Object.fromEntries(COLUMNS.map(c => [c.key, c.title]));

export const TITLES = COLUMNS.map(c => c.title);

// Titles the proxy sets itself; any client value under these is ignored.
export const SERVER_TITLES = COLUMNS.filter(c => c.writtenBy === 'server').map(c => c.title);

// Titles Part 2 (intake_complete) never changes: the draft levels are fixed
// when Part 1 is saved, and the AI opt-out is chosen there. Mirrored in
// Code.gs INTAKE_PART1_ONLY_TITLES (tests/proxy-intake.test.js checks).
export const PART1_ONLY_TITLES = [
  ...COLUMNS.filter(c => c.group === 'Draft BRL').map(c => c.title),
  'AI Processing Opt-Out'
];


// Category -> Draft BRL column, in the order shown on the brief.
export const BRL_COLUMN_BY_CAT = {
  TRL: COL.brlTechnology, IP: COL.brlIP, Product: COL.brlProduct, Market: COL.brlMarket,
  GTM: COL.brlGTM, Business: COL.brlBusiness, Team: COL.brlTeam, Funding: COL.brlFunding,
  Regulatory: COL.brlRegulatory
};
