# Defense Budget Explorer

Live site: https://tchaudhary1.github.io/defense-budget-explorer/

Twenty-five years of the Department of Defense's own budget exhibits (P-1, R-1, O-1, M-1, C-1; President's Budgets FY2003 to FY2027), normalized into one table and joined to the FY2023 Green Book, OMB Historical Tables and USAspending. Includes a RuBase-style taxonomy demonstration over the 2,236 RDT&E program elements and a guided eight-step story written for readers without a budget background.

Built as a Pursestrings demonstration, Sam Nunn School of International Affairs, Georgia Tech. All figures are as published by the sources named in the page's Data & methods tab.

## How it is hosted

- `index.html` is the whole application. It works in two modes:
  - **Open mode** (no `config.js`): data files are read from the same folder (used for local work and the claude.ai artifact copy).
  - **Gated mode** (`config.js` defines `window.DBE = { SUPABASE_URL, SUPABASE_ANON_KEY }`): visitors must sign in; data is read from a private Supabase storage bucket readable only by signed-in users. **This is the mode the live site runs in.** The data files are not in this repository; `tools/setup-supabase.mjs` uploads them to the bucket from a local folder.
- `tools/setup-supabase.mjs` performs the one-time Supabase setup for gated mode (bucket, read policy, uploads, invite-only auth, demo account). It takes its credentials from environment variables and never stores them.

## Rebuilding the data

The pipeline (download, parse, normalize, taxonomy assembly) lives in the research project folder, not here; this repository holds only the built site. See `pursestrings_dashboard/README.md` there.

## Sources

- Office of the Under Secretary of War (Comptroller), Budget Materials, FY2003 to FY2027: https://comptroller.war.gov/Budget-Materials/
- National Defense Budget Estimates for FY 2023 (Green Book), Excel archive
- OMB Historical Tables, FY2027 edition: https://www.whitehouse.gov/omb/information-resources/budget/historical-tables/
- USAspending API, agency 097 budgetary resources: https://api.usaspending.gov/
