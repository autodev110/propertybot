# PropertyBot

Internal real estate buyer assistant built with Next.js, TypeScript, Tailwind, Gemini, and a RapidAPI Zillow helper.

## Getting started
1. Install deps: `npm install`
2. Copy `.env.example` to `.env.local` and fill values.
3. Run dev server: `npm run dev`

## Environment variables
- `GEMINI_API_KEY` – Google Generative AI key (Gemini 2.0 Flash)
- `RAPIDAPI_KEY` – RapidAPI key (used for search providers and RSAPI). If you subscribe to provider-specific plans, you can override with `RAPIDAPI_KEY_ZILLOW56`, `RAPIDAPI_KEY_ZILLOW_WORKING_API`, etc.
- `EMAIL_USER`, `EMAIL_PASS` – Gmail address and app password used by Nodemailer
- `AGENT_SIGNATURE` (optional) – override the default footer appended to emails

## Data storage
- File-based storage under `data/` (override base with `DATA_DIR` env var; on Vercel it defaults to `/tmp/propertybot`)
  - `data/clients/{clientId}.json`
  - `data/searches/{searchId}.json`
  - `data/logs/emails.log` (JSON lines)

## API overview
- `POST /api/search/create` – create a search session, scrape Zillow, enrich via RSAPI, evaluate with Gemini
- `GET /api/search/[searchId]` – load search + client
- `POST /api/search/[searchId]/selectProperties` – save selected property IDs
- `POST /api/search/[searchId]/draftEmail` – compose email draft with Gemini
- `POST /api/search/[searchId]/sendEmail` – send via Nodemailer and log
- `GET /api/clients` – list clients
- `GET /api/clients/[clientId]` – client detail + sessions

## Notes
- Requires Node 18+
- Network calls for Zillow scrape, RapidAPI, and Gemini happen server-side in route handlers.
- If scraping or RSAPI returns no viable properties, `/api/search/create` returns a friendly error for the UI to display.
