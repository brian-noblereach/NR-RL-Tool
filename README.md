# Business Readiness Level (BRL) Assessment Tool

A web-based assessment tool for evaluating science-based venture readiness across nine business dimensions. Built for [NobleReach Foundation](https://noblereach.org)'s Science-to-Venture advisors to track and submit structured readiness level assessments.

## Overview

Advisors use this tool to score ventures on a 0–9 scale across nine categories, generating narrative summaries and persisting results to a central Smartsheet database via a Google Apps Script proxy.

### Assessment Categories

| Category | Description |
|----------|-------------|
| IP | Intellectual property strategy and protection |
| Technology | Technical development and validation |
| Market | Market research, sizing, and validation |
| Product | Product definition and development |
| Team | Team composition and capabilities |
| Go-to-Market | Distribution, sales, and channel strategy |
| Business | Business model, legal structure, and operations |
| Funding | Funding strategy, fundraising, and financial planning |
| Mission Impact | Identification of, alignment to, and progress against a core mission — covering both mission-oriented work (social/community impact) and national-security/dual-use ventures |
| Regulatory | Regulatory pathway and compliance (health ventures only) |

Each level (0–9) includes a definition, deliverables, and progress indicators. Level 0 represents a deliberate "Not Started" assessment, distinct from categories that have not yet been evaluated.

### Health Mode

Toggling "Health-Related Venture" activates the Regulatory category and applies health-specific terminology and indicators across all categories (e.g., "users" becomes "patients," "MVP" becomes "clinical prototype").

## Features

- **Password-protected access** — Token-based authentication with periodic rotation
- **Multi-venture management** — Create, switch between, and delete venture assessments
- **Auto-save** — All scores persist to localStorage automatically
- **Smartsheet integration** — Submit assessments to a central database; supports both new submissions and updates to existing rows
- **Assessment versioning** — Track multiple assessment rounds per venture
- **Narrative summary** — Auto-generated plain-language description of the venture's readiness profile
- **Portfolio tagging** — Assign ventures to program portfolios (fetched from backend)
- **Venture name autocomplete** — Pre-populates from existing database entries
- **Export** — Copy summary text or download assessment data
- **Responsive layout** — Works on desktop and tablet screens

### VDR Companion Mode

Accessed via `?vdr=true`, this mode lets associates load a baseline RL assessment from the database and set engagement goals per category, producing a Venture Development Roadmap (VDR) document.

## Project Structure

```
rl-tool-v06/
├── index.html              # Single-page application shell
├── assets/
│   ├── styles.css          # All styling (responsive, auth, level cards, VDR)
│   ├── favicon.svg
│   └── logo-icon.svg
├── src/
│   ├── main.js             # App entry point, boot sequence, event wiring
│   ├── auth.js             # Password authentication module
│   ├── state.js            # Central AppState, localStorage persistence, venture CRUD
│   ├── categories.js       # Category grid and level card rendering
│   ├── summary.js          # VentureDescriptionGenerator (narrative output)
│   ├── smartsheet.js       # Smartsheet submission via JSONP through GAS proxy
│   ├── ui.js               # Panel controls, view toggles, print/export
│   ├── transform.js        # Health term mapping transform
│   └── data/
│       ├── index.js         # Data barrel export
│       ├── readiness-levels.js  # Level definitions for all 9 categories (0–9)
│       └── constants.js     # Health extras, term mappings, portfolio list
├── src/vdr/                # VDR Companion Mode modules
│   ├── vdr-main.js         # VDR boot and navigation
│   ├── vdr-state.js        # VDR-specific state management
│   ├── baseline-loader.js  # Fetch and select baseline assessments
│   ├── goal-setting.js     # Per-category goal level selection
│   ├── vdr-generator.js    # VDR document generation
│   └── vdr-export.js       # VDR export (copy/download)
└── proxy-update/
    └── Code.gs             # Google Apps Script proxy source (deployed separately)
```

## Architecture

The tool is a static single-page application with no build step. All JavaScript uses ES modules loaded directly by the browser.

**Data flow:**
1. Advisor authenticates (token stored in localStorage, shared with Qualification Tool)
2. Scores are saved to `AppState` and auto-persisted to localStorage
3. On "Save to Database," scores are submitted to Smartsheet via JSONP through the GAS proxy
4. Portfolio options and venture names are fetched from the GAS proxy on load

**Backend:** The Google Apps Script proxy (`proxy-update/Code.gs`) handles authentication, Smartsheet read/write operations, and portfolio management. It is deployed as a web app and shared across NobleReach tools.

## Deployment

This is a static site. Deploy the root directory to any static host (GitHub Pages, Netlify, S3, SharePoint, etc.). No build step required.

The GAS proxy must be deployed separately as a Google Apps Script web app. See `proxy-update/Code.gs` for the current source.

## Configuration

- **Proxy URL** — Hardcoded in `src/auth.js`, `src/main.js`, `src/smartsheet.js`, and `src/vdr/baseline-loader.js`. Update all references if the GAS deployment changes.
- **Portfolios** — Fetched from the GAS proxy at runtime. The local fallback list is in `src/data/constants.js`.
- **Password rotation** — Managed server-side in the GAS proxy. Rotating the password invalidates existing tokens after their expiry window.

## Browser Support

Requires a modern browser with ES module support (Chrome, Firefox, Safari, Edge). No IE11 support.
