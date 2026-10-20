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
// can be joined across tools (Venture Name, Institution, Technology Domain,
// Technology Description, Venture URL, Portfolio).
//
// writtenBy: 'server'   - set by the proxy; client values ignored
//            'app'      - sent by the intake page
//            'reviewer' - never written by the app; for the review team
// type is the suggested Smartsheet column type (see the template's guide).

const PORTFOLIO_VALUES = ['Northeastern CRI - 2026', 'Penn State GAP - 2026', 'CBC', 'NSF Mid-South', 'NSF Southeast', 'APL', 'Other'];

export const COLUMNS = [
  // Primary column first: Smartsheet uses the first column as the row label.
  { key: 'ventureName', title: 'Venture Name', group: 'Project', type: 'Text', writtenBy: 'server', notes: 'Project or technology title. Same title as the QM and RL sheets. Primary column.' },

  // Submission
  { key: 'submissionId', title: 'Submission ID', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'Unique per submission. Shown to the applicant.' },
  { key: 'submittedAt', title: 'Submitted At', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'ISO timestamp (UTC). Keep as Text, or switch to Date if you only need the day.' },
  { key: 'formVersion', title: 'Form Version', group: 'Submission', type: 'Text', writtenBy: 'app', notes: 'Question-model version, e.g. gen-1.0.' },
  { key: 'source', title: 'Source', group: 'Submission', type: 'Text', writtenBy: 'app', notes: 'From the ?source= link parameter.' },
  { key: 'portfolio', title: 'Portfolio', group: 'Submission', type: 'Dropdown', options: PORTFOLIO_VALUES, writtenBy: 'app', notes: 'Program, from the intake config or ?portfolio=. Same values as the RL and QM dropdowns.' },
  { key: 'intakeNumber', title: 'Intake Number', group: 'Submission', type: 'Number', writtenBy: 'server', notes: '1 for the first submission from this email, 2 for a re-take, ...' },
  { key: 'previousSubmissionId', title: 'Previous Submission ID', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'The submission a re-take started from.' },
  { key: 'returnCode', title: 'Return Code', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'One per email. Staff can read it here if an applicant loses it.' },
  { key: 'emailSent', title: 'Email Sent', group: 'Submission', type: 'Text', writtenBy: 'server', notes: 'Yes, Pending, or Failed: reason.' },

  // Applicant
  { key: 'institution', title: 'Institution', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'University or organization. Same title as the QM and RL sheets.' },
  { key: 'applicantName', title: 'Applicant Name', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'First and last name.' },
  { key: 'email', title: 'Email', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'Lowercased.' },
  { key: 'emailDomain', title: 'Email Domain', group: 'Applicant', type: 'Text', writtenBy: 'server', notes: 'For per-institution reports.' },
  { key: 'phone', title: 'Phone', group: 'Applicant', type: 'Text', writtenBy: 'app' },
  { key: 'title', title: 'Title', group: 'Applicant', type: 'Text', writtenBy: 'app', notes: 'Title or academic rank.' },
  { key: 'department', title: 'Department', group: 'Applicant', type: 'Text', writtenBy: 'app' },
  { key: 'role', title: 'Role', group: 'Applicant', type: 'Dropdown', options: ['Faculty or PI', 'Co-investigator', 'Postdoc', 'Grad student', 'Founder from outside the university', 'Other'], writtenBy: 'app', notes: 'Role on the project.' },
  { key: 'teamMembers', title: 'Team Members', group: 'Applicant', type: 'Text', writtenBy: 'app', notes: 'Co-investigators and other team members.' },

  // Project
  { key: 'technologyDomain', title: 'Technology Domain', group: 'Project', type: 'Text', writtenBy: 'app', notes: 'Pick list from config, or Other: text. Same title as the QM sheet.' },
  { key: 'technologyForm', title: 'Technology Form', group: 'Project', type: 'Dropdown', options: ['Software', 'Hardware or physical device', 'Material, chemistry, or process', 'Therapeutic', 'Diagnostic', 'Medical device', 'Other'], writtenBy: 'app' },
  { key: 'trlTrack', title: 'TRL Track', group: 'Project', type: 'Dropdown', options: ['General', 'Software', 'Hardware', 'Therapeutics', 'Diagnostics', 'Medical device'], writtenBy: 'app', notes: 'Set by Technology Form.' },
  { key: 'companyFormed', title: 'Company Formed', group: 'Project', type: 'Dropdown', options: ['Yes', 'No', 'Not sure'], writtenBy: 'app' },
  { key: 'companyNameState', title: 'Company Name and State', group: 'Project', type: 'Text', writtenBy: 'app' },
  { key: 'companyType', title: 'Company Type', group: 'Project', type: 'Dropdown', options: ['LLC', 'C corp', 'S corp', 'Other'], writtenBy: 'app' },
  { key: 'icorps', title: 'I-Corps', group: 'Project', type: 'Dropdown', options: ['Not in I-Corps', 'Regional, in progress', 'Regional, finished', 'National, in progress', 'National, finished'], writtenBy: 'app' },
  { key: 'ventureUrl', title: 'Venture URL', group: 'Project', type: 'Text', writtenBy: 'app', notes: 'Website. Same title as the QM sheet.' },

  // Written answers
  { key: 'technologyDescription', title: 'Technology Description', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Key innovation and underlying science (250 words). Same title as the QM sheet.' },
  { key: 'valueProposition', title: 'Value Proposition', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Problem, target customers, why alternatives fall short (200 words).' },
  { key: 'impact', title: 'Impact and National Security', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Societal or economic impact and national security relevance (200 words).' },
  { key: 'nationalSecurityRelevance', title: 'National Security Relevance', group: 'Written answers', type: 'Text', writtenBy: 'app', notes: 'Picks, separated by ; (Defense or intelligence use, Other government agency use, Commercial use, Not sure yet).' },

  // Founder
  { key: 'outcomeWanted', title: 'Outcome Wanted', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'roleWanted', title: 'Role Wanted', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'mainReason', title: 'Main Reason', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'whyText', title: 'Why (their words)', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'timeSpent', title: 'Time Spent Last 3 Months', group: 'Founder', type: 'Dropdown', options: ['Yes', 'No'], writtenBy: 'app' },
  { key: 'hoursPerWeek', title: 'Hours per Week', group: 'Founder', type: 'Dropdown', options: ['Under 3', '3 to 5', '5 to 10', '10 to 20', 'More than 20', 'Full time'], writtenBy: 'app' },
  { key: 'engagementCommitment', title: 'Engagement Commitment', group: 'Founder', type: 'Dropdown', options: ['Yes', 'No', 'Not sure'], writtenBy: 'app', notes: 'Blank when the config sets no engagement terms.' },
  { key: 'conflicts', title: 'Conflicts', group: 'Founder', type: 'Text', writtenBy: 'app', notes: 'Sabbatical, leave, or other conflicts.' },
  { key: 'priorExperience', title: 'Prior Experience', group: 'Founder', type: 'Text', writtenBy: 'app' },
  { key: 'changedFromFeedback', title: 'Changed From Feedback', group: 'Founder', type: 'Text', writtenBy: 'app' },

  // Draft BRL levels, derived from the applicant's answers (not advisor scores)
  { key: 'brlTechnology', title: 'Draft BRL - Technology', group: 'Draft BRL', type: 'Number', writtenBy: 'app', notes: 'Derived from the applicant\'s answers, 0-9. Not an advisor score.' },
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

  // Funding history (stored, not scored)
  { key: 'grantsReceived', title: 'Grants Received', group: 'Funding history', type: 'Text', writtenBy: 'app', notes: 'Agency, amount, and period for each grant.' },
  { key: 'privateInvestment', title: 'Private Investment Received', group: 'Funding history', type: 'Text', writtenBy: 'app', notes: 'Source and amount.' },

  // Other
  { key: 'helpWanted', title: 'Help Wanted', group: 'Other', type: 'Text', writtenBy: 'app' },
  { key: 'aiOptOut', title: 'AI Processing Opt-Out', group: 'Other', type: 'Dropdown', options: ['Yes', 'No'], writtenBy: 'app', notes: 'Yes = do not send this row or its attachments to any AI tool (including the QM tool). Check before any AI step.' },
  { key: 'uploadFileNames', title: 'Upload File Names', group: 'Uploads', type: 'Text', writtenBy: 'server', notes: 'Attached files and submitted links.' },
  { key: 'uploadStatus', title: 'Upload Status', group: 'Uploads', type: 'Text', writtenBy: 'server', notes: 'Per file: attached, or failed with the reason.' },

  // Kept from the founder intake (re-take tracking)
  { key: 'changesSincePrevious', title: 'Changes Since Previous', group: 'Re-take', type: 'Text', writtenBy: 'app' },
  { key: 'factsTrue', title: 'Facts True', group: 'Re-take', type: 'Text', writtenBy: 'app', notes: 'Fact keys, so levels can be recomputed if the rules change.' },

  // Reviewer columns: the app never writes these.
  { key: 'reviewer', title: 'Reviewer', group: 'Reviewer', type: 'Contact List', writtenBy: 'reviewer' },
  { key: 'ddStatus', title: 'DD Status', group: 'Reviewer', type: 'Dropdown', options: ['Not started', 'In progress', 'Complete'], writtenBy: 'reviewer' },
  { key: 'interviewDecision', title: 'Interview Decision', group: 'Reviewer', type: 'Dropdown', options: ['Interview', 'Hold', 'Decline'], writtenBy: 'reviewer' },
  { key: 'notes', title: 'Notes', group: 'Reviewer', type: 'Text', writtenBy: 'reviewer' }
];

// COL.ventureName -> 'Venture Name'. Use these, never literal titles.
export const COL = Object.fromEntries(COLUMNS.map(c => [c.key, c.title]));

export const TITLES = COLUMNS.map(c => c.title);

// Titles the proxy sets itself; any client value under these is ignored.
export const SERVER_TITLES = COLUMNS.filter(c => c.writtenBy === 'server').map(c => c.title);

// Titles the app must never write.
export const REVIEWER_TITLES = COLUMNS.filter(c => c.writtenBy === 'reviewer').map(c => c.title);

// Category -> Draft BRL column, in the order shown on the brief.
export const BRL_COLUMN_BY_CAT = {
  TRL: COL.brlTechnology, IP: COL.brlIP, Product: COL.brlProduct, Market: COL.brlMarket,
  GTM: COL.brlGTM, Business: COL.brlBusiness, Team: COL.brlTeam, Funding: COL.brlFunding,
  Regulatory: COL.brlRegulatory
};
