# Command Centre

A static dashboard that pulls task and revenue data from Notion and visualises it
across an Overview tab and five project-specific tabs (PhD, Freelance, STL, POD,
Admin). Built with React + Vite, deployed via GitHub Pages, kept in sync by a
GitHub Actions workflow that runs every hour.

![architecture](https://img.shields.io/badge/architecture-static-blue) ![data](https://img.shields.io/badge/data%20source-Notion%20API-black) ![ci](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-green) ![host](https://img.shields.io/badge/hosting-GitHub%20Pages-lightgrey)

---

## Architecture

```
┌──────────────────┐   hourly cron   ┌─────────────────┐
│  Notion          │ ◄────────────── │ GitHub Action   │
│  (source of      │                  │ fetch-notion.js │
│   truth)         │ ─────────────►  │                 │
└──────────────────┘   API query     └────────┬────────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │ public/       │
                                      │   data.json   │
                                      └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │ Vite build    │
                                      │ → dist/       │
                                      └───────┬───────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │ GitHub Pages  │
                                      │  (live URL)   │
                                      └───────────────┘
```

Three pieces:

1. **React dashboard** (`src/`) — reads `data.json` at load time. No runtime API
   calls, no CORS, no authentication in the browser.
2. **Sync script** (`scripts/fetch-notion.js`) — Node.js script that calls the
   Notion API server-side, transforms property shapes, writes `data.json`.
3. **GitHub Actions workflow** (`.github/workflows/sync-notion.yml`) — runs the
   sync, builds the site, and deploys to Pages. Triggers: hourly schedule, manual
   button, or any push to `main`.

---

## Setup

One-time, ~15 minutes.

### 1. Create a Notion integration

Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
and create a new **internal integration**. Copy the token — it starts with `ntn_`
and is shown only once.

### 2. Share both databases with the integration

In Notion, open each database (Master Tasks, Monthly Revenue Tracker):

1. Click the **⋯** menu (top right)
2. Choose **Connections** → **Connect to**
3. Select the integration you just created

This step is what most people miss — without it, the API returns
`object_not_found`.

### 3. Clone and configure

```bash
git clone https://github.com/<your-username>/command-centre.git
cd command-centre
npm install
cp .env.example .env
# Edit .env and paste your NOTION_TOKEN
```

If your database IDs differ from the defaults (yours don't, but if you ever
clone the Notion setup), set `TASKS_DB_ID` and `REVENUE_DB_ID` in `.env` as well.

### 4. Test locally

```bash
npm run sync   # fetches Notion data → public/data.json
npm run dev    # opens dashboard at http://localhost:5173
```

If `npm run sync` fails with `object_not_found`, you skipped step 2.

### 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/command-centre.git
git push -u origin main
```

### 6. Configure GitHub Pages

In the repo on github.com:

- **Settings → Secrets and variables → Actions → New repository secret**
  - Name: `NOTION_TOKEN`
  - Value: your `ntn_...` token

- **Settings → Pages**
  - Source: **GitHub Actions**

Push any commit (or run the workflow manually via **Actions → Sync Notion &
Deploy → Run workflow**) to trigger the first deploy. After ~2 minutes the
dashboard is live at:

```
https://<your-username>.github.io/command-centre/
```

---

## Daily use

- **Just view it:** open the URL. Reflects whatever the last hourly sync pulled.
- **Force a refresh:** GitHub repo → **Actions** tab → **Sync Notion & Deploy** →
  **Run workflow**. Takes about 90 seconds.
- **Reload from the browser:** the "Reload" button in the header re-fetches
  `data.json` from the deployed site — useful only if you forced a sync from
  another device and want to pull the new data without a page refresh.

---

## Customisation

- **Sync frequency** — edit the cron expression in
  `.github/workflows/sync-notion.yml`. Examples: `*/30 * * * *` (every 30 min),
  `0 */4 * * *` (every 4 hours), `0 8,18 * * *` (8 AM and 6 PM daily).
- **Reference dates** — viva and build deadline are in `src/App.jsx` near the top
  (`VIVA_DATE`, `BUILD_DEADLINE`). Update if dates shift.
- **PhD phases** — edit the `PHD_PHASES` array in `src/App.jsx`.
- **Colour palette** — `AREA_META` in `src/App.jsx`.

---

## Project structure

```
.
├── .github/workflows/sync-notion.yml   GitHub Action: hourly sync + deploy
├── public/
│   └── data.json                       Output of sync; read by dashboard
├── scripts/
│   └── fetch-notion.js                 Notion → data.json transformer
├── src/
│   ├── App.jsx                         Dashboard (tabs, charts, calendar, timeline)
│   ├── main.jsx                        React entry point
│   └── index.css                       Tailwind + global styles
├── index.html                          Vite entry, Google Fonts preloads
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js                      Auto base-path for GitHub Pages
├── .env.example
├── .gitignore
└── LICENSE
```

---

## Stack

- **Frontend:** React 18 · Vite 6 · Tailwind 3 · Recharts · lucide-react
- **Data:** Notion API (`@notionhq/client`)
- **CI/CD:** GitHub Actions
- **Hosting:** GitHub Pages (free, static)

No backend, no database, no paid services.

---

## Licence

MIT — see [LICENSE](LICENSE).
