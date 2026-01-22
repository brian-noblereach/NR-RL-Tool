# NobleReach Readiness Level Assessment Tool

A browser-based assessment tool for evaluating commercialization readiness across 8 key dimensions for early-stage ventures and research commercialization projects.

## Overview

The Readiness Level Assessment Tool helps research teams, early-stage ventures, and their advisors measure progress toward commercialization. It provides a structured framework for assessing de-risking milestones across multiple dimensions, with cloud persistence via Smartsheet integration.

## Features

### Assessment Capabilities
- **8 Readiness Categories**: IP, Technology, Market, Product, Team, Go-to-Market, Business, Funding
- **9th Regulatory Category**: Enabled via Health-related mode for medical devices and pharmaceuticals
- **Health-Related Mode**: Transforms terminology for clinical/patient-centric language
- **Technology Subtracks**: General, Software, Hardware, Medical Device, Pharmaceuticals
- **Cumulative Levels**: Selecting a level indicates all prior levels achieved
- **Auto-generated Descriptions**: Dynamic narrative summaries based on scores

### Data Management
- **Smartsheet Integration**: Save assessments to a central database for team tracking
- **Temporal Tracking**: Each save creates a new record, enabling progress tracking over time
- **Multi-Venture Support**: Create, save, and manage multiple assessments locally
- **Venture Name Autocomplete**: Suggests existing ventures from both the Qualification Tool and previous RL assessments
- **Portfolio Auto-fill**: Automatically sets portfolio based on Qualification Tool records
- **PDF Export**: Save assessment snapshots as PDF documents
- **JSON Import/Export**: Backup and transfer assessments between devices

### User Experience
- **Collapsible Settings Bar**: Advisor name and portfolio settings tucked away for a cleaner interface
- **Persistent Preferences**: Advisor name remembered across sessions
- **Toast Notifications**: Feedback on saves and auto-fill actions

## File Structure

```
rl-tool-v05/
├── index.html              # Main application entry point
├── README.md               # This documentation file
│
├── assets/
│   ├── favicon.svg         # Browser tab icon
│   ├── logo-icon.svg       # NobleReach logo
│   └── styles.css          # All application styles
│
└── src/
    ├── main.js             # Application entry and event wiring
    ├── state.js            # State management and localStorage
    ├── smartsheet.js       # Smartsheet integration module
    ├── ui.js               # UI controls and panel management
    ├── categories.js       # Category rendering and interactions
    ├── summary.js          # Summary panel and description generator
    ├── transform.js        # Health mode transformations
    │
    └── data/
        ├── index.js            # Re-exports all data modules
        ├── readiness-levels.js # Category definitions and levels
        └── constants.js        # Health term mappings, extras, portfolios
```

## Usage

### Running Locally

1. Open `index.html` in a modern web browser
2. No build step or server required - runs entirely in the browser
3. Local data is persisted in browser localStorage
4. Cloud saves require network connectivity

### For Advisors

- **Enter your name**: Click the Settings gear icon to expand the settings bar
- **Select portfolio**: Choose your portfolio affiliation (auto-fills for known ventures)
- **Levels are cumulative**: Selecting Level 5 means Levels 1-4 have been achieved
- **Use judgment**: Definitions are guidelines, not rigid requirements
- **Deliverables and indicators are suggestions**: Ventures may demonstrate readiness through equivalent evidence
- **Save to Database**: Click to save the current assessment to Smartsheet for team visibility

### Venture Name Autocomplete

When you start typing a venture name, the tool suggests ventures from:
- Previous Qualification Tool assessments
- Previous Readiness Level assessments

Selecting an existing venture will auto-fill the portfolio if it's known.

### Health-Related Mode

Enable "Health-related mode" in the toolbar to:
- Transform terminology (users → patients, MVP → clinical prototype, etc.)
- Enable the Regulatory category
- Access Medical Device and Pharmaceuticals technology subtracks

## Data Persistence

### Local Storage
Assessment data is stored in browser localStorage:
- `nr-rl-assessments` - All saved ventures
- `nr-rl-active` - Current active venture ID
- `nr-rl-advisor-name` - Your advisor name preference
- `nr-rl-assessment-history` - Submission tracking per venture
- `nr-rl-settings-expanded` - Settings bar visibility preference
- `nr-rl-welcome-dismissed` - Welcome modal preference
- `nr-rl-pilot-banner-dismissed` - Pilot banner preference
- `nr-rl-advisor-tip-dismissed` - Advisor tip preference

### Smartsheet Integration
Cloud saves are written to a dedicated Smartsheet via a Google Apps Script proxy. Each save creates a new row with:
- Venture identification (name, ID, portfolio)
- Advisor name and assessment date
- All readiness level scores
- Assessment number (for temporal tracking)

## Development

### Technologies Used

- Vanilla JavaScript (ES6 modules)
- CSS3 with custom properties
- jsPDF library for PDF generation
- JSONP/Image beacon for cross-origin Smartsheet submission
- No build tools or dependencies required

### Modifying Definitions

Category definitions are located in `src/data/readiness-levels.js`. Each level includes:
- `level` - Numeric level (1-9)
- `title` - Short descriptive title
- `definition` - What this level represents
- `deliverables` - Expected outputs at this level
- `indicators` - Signs that suggest this level has been reached

### Health Mode Extensions

Health-specific additions are in `src/data/constants.js`:
- `HEALTH_TERM_MAP` - Text substitutions for clinical terminology
- `HX` - Level-specific deliverables and indicators for health ventures

### Adding Portfolios

Portfolio options are defined in `src/data/constants.js`:
```javascript
export const PORTFOLIOS = [
  { value: "Penn State", label: "Penn State" },
  { value: "Northeastern", label: "Northeastern" },
  { value: "Other", label: "Other" }
];
```
Add new portfolios by extending this array.

## Version History

- **v0.6** (January 2025) - Smartsheet integration, venture autocomplete, portfolio auto-fill, collapsible settings bar
- **v0.5** (December 2024) - Pilot release with revised definitions, file restructuring
- **v0.4** - Multi-venture support, import/export
- **v0.3** - Summary panel maximize/minimize
- **v0.2** - Health-related mode toggle
- **v0.1** - Initial prototype

## Contact

For feedback or questions: brian.hayt@noblereach.org

---

© NobleReach Foundation
