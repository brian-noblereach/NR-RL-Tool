# Business Readiness Level (BRL) Assessment Tool

A web-based assessment tool for evaluating science-based venture readiness across independent business dimensions. Built for [NobleReach Foundation](https://noblereach.org)'s Science-to-Venture advisors to track and submit structured readiness level assessments.

## Overview

Advisors use this tool to score ventures on a 0–9 scale (TRL: 1–9) in each category and save the results to a central Smartsheet database through a Google Apps Script proxy. Categories are scored independently; there is no composite score.

Level definitions follow the NobleReach BRL framework, November 2026 version.

### Assessment Categories

| Category | Description |
|----------|-------------|
| IP | Intellectual property strategy and protection, by patent or trade secret |
| Technology (TRL) | Technology readiness, levels 1–9, by track: general, software, and hardware (DoD Technology Readiness Assessment Guidebook) or diagnostics, medical device, and therapeutics (BARDA) |
| Market | Market understanding, sizing, and validation |
| Product | Product definition and development |
| Team | Team composition and capabilities |
| Go-to-Market | Distribution, sales, and channel strategy |
| Business | Business model, entity formation, and operations |
| Funding | Funding strategy, fundraising, and capital deployment |
| Regulatory | Regulatory pathway and compliance (Life Science ventures only) |

Each level includes a definition, deliverables, and progress indicators (TRL levels carry definitions only). Level 0 represents a deliberate "Not Started" assessment, distinct from categories that have not yet been evaluated.

Mission Impact is part of the framework but is temporarily not offered in the tool while it is being reworked. Existing Mission Impact scores are kept.

### Life Science ventures

Marking a venture as a "Life Science venture" activates the Regulatory category, enables the life-sciences TRL tracks, and shows the framework's Life Science level text (for example, "Stakeholder Discovery" in place of "Customer Discovery").

### Dual-use ventures

A dual-use venture is taking the same core technology to both commercial customers and government buyers or users (such as defense, homeland security or other agencies). Marking a venture as "Dual-use" scores Market, Product and Go-to-Market separately for Commercial and Government, against the same definitions; the two scores are never combined. The Government Product score follows the Commercial one until the advisor scores it separately. A venture that serves only government isn't dual-use and is scored once, as usual. Dual-use scoring is built but hidden in the current release (`DUAL_USE_ENABLED` in `src/applications.js`).

## Features

- **Password-protected access** — Token-based authentication with periodic rotation
- **Venture picker** — Advisors choose a venture from the database (filtered to their own by default, with portfolio, "not scored since", and search), then edit one of their saved assessments or start a new one. Ventures that aren't listed can be added, with a check for similar names first
- **Shared Venture ID** — The intake's readable ID (for example `UCF-SENSORMESH-7K`) links the intake, assessments and other tools
- **Graduation** — Archived portfolios and ventures marked Graduated or Inactive are hidden by default
- **Auto-save** — Scores persist to localStorage; unsaved work can be resumed from the picker
- **Smartsheet integration** — Submit assessments to a central database; edits update the existing row and record when it was last edited
- **Assessment versioning** — Track multiple assessment rounds per venture, each stamped with the BRL framework version it was scored under
- **Portfolio tagging** — Assign ventures to program portfolios (fetched from backend)
- **Venture name autocomplete** — Pre-populates from existing database entries
- **PDF export** — Download the assessment, with license and source notices
- **Guided stepper** — External advisors score through Setup → Score → Questions → Download, saving locally only
- **Venture intake** — A separate applicant page (`intake.html`)

## Project Structure

```
rl-tool-v07/
├── index.html              # Advisor tool
├── intake.html             # Venture intake (applicants)
├── assets/                 # Styles and icons
├── src/
│   ├── main.js             # App entry point, boot sequence, event wiring
│   ├── auth.js             # Password authentication module
│   ├── state.js            # Central AppState, localStorage persistence, venture CRUD
│   ├── categories.js       # Category list and level card rendering
│   ├── venture-picker.js   # Venture picker (internal step 1)
│   ├── venture-directory.js # Picker filtering and sorting
│   ├── external-flow.js    # Guided stepper for external advisors
│   ├── pdf-export.js       # Assessment PDF
│   ├── smartsheet.js       # Smartsheet submission via the GAS proxy
│   ├── transform.js        # Life Science level text
│   ├── proxy-client.js     # The GAS proxy URL (single source)
│   ├── data/
│   │   ├── readiness-levels.js      # Level definitions (generated from the BRL workbook)
│   │   ├── trl-levels.generated.js  # Per-track TRL definitions (generated)
│   │   ├── trl-tracks.js            # TRL track metadata and sources
│   │   ├── attributions.js          # License and source notices
│   │   └── constants.js             # Portfolio fallback list
│   └── intake/             # Venture intake modules
├── tests/                  # node:assert test scripts (node tests/<name>.test.js)
├── tools/                  # Generators, run by hand
└── proxy-update/
    └── Code.gs             # Google Apps Script proxy source (deployed separately)
```

## Architecture

The tool is a static single-page application with no build step. All JavaScript uses ES modules loaded directly by the browser.

**Data flow:**
1. Advisor authenticates (token stored in localStorage, shared with the Qualification Tool)
2. Scores are saved to `AppState` and auto-persisted to localStorage
3. On "Save to Database," scores are submitted to Smartsheet through the GAS proxy
4. Portfolio options and venture names are fetched from the GAS proxy on load

**Level content:** `src/data/readiness-levels.js` and `src/data/trl-levels.generated.js` are generated from the BRL master workbook with `python tools/make-brl-data.py "<workbook.xlsx>"`. Don't edit them by hand.

**Backend:** The Google Apps Script proxy (`proxy-update/Code.gs`) handles authentication, Smartsheet read/write operations, portfolio management, and the venture intake. It is deployed as a web app.

## Deployment

This is a static site. Deploy the root directory to any static host (GitHub Pages, Netlify, S3, etc.). No build step required.

The GAS proxy must be deployed separately as a Google Apps Script web app. See `proxy-update/Code.gs` for the current source.

## Configuration

- **Proxy URL** — `PROXY_URL` in `src/proxy-client.js` is the only place it lives.
- **Portfolios** — Fetched from the GAS proxy at runtime. The local fallback list is in `src/data/constants.js`.
- **Password rotation** — Managed server-side in the GAS proxy. Rotating the password invalidates existing tokens after their expiry window.

## License

The BRL framework text (level definitions, deliverables, and indicators) is © NobleReach Foundation and licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). TRL definitions are U.S. Government works in the public domain. See the tool's "Attributions & license" link for full notices.

## Browser Support

Requires a modern browser with ES module support (Chrome, Firefox, Safari, Edge). No IE11 support.
