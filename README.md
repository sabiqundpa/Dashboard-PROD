# Dashboard-MTN

CNC machine maintenance monitoring dashboard — Express REST API, PostgreSQL
(via Prisma, hosted on Supabase), and a React (Vite) frontend with admin
login. Deployable as a single Express app (local/VPS-style hosts) or as
Netlify (static frontend + serverless function for the API).

## Features

- Admin login (JWT) — the dashboard and API are only reachable when logged in
- Dark/light theme toggle (persisted, defaults to OS preference)
- KPI overview: breakdowns, downtime, Availability, MTBF, MTTR
  - Availability = ((Jam Kerja Harian × hari periode) − downtime) / (Jam Kerja Harian × hari periode) × 100%
  - "Jam Kerja Harian" is set per machine (`plannedHours`) when adding/editing it
- Per-machine status table with live availability/breakdown stats; machines can be
  added and edited one-by-one from the UI (Nama Mesin, Nomor Asset, Type, Merk
  Tahun, Daya, Cluster, Line, Shift, Jam Kerja Harian) or bulk-loaded via CSV
  import; dashboard shows the top 5 (sortable), "Semua Mesin" page shows the full
  master data for every machine
- Breakdown timeline + Pareto analysis of failure causes and per-machine frequency
- MTBF/MTTR combo charts (bar = actual, line = target) with an Excel-style data table
  underneath and a TOTAL column
  - MTBF = (Jam Kerja Mesin − Downtime) / Jumlah Frekuensi Kerusakan; target MTBF
    scales with the bucket's planned hours (a 31-day month has a higher target than
    a 28-day one), based on each machine's Jam Kerja Harian
  - MTTR = Jumlah Waktu Downtime / Jumlah Frekuensi Kerusakan; target MTTR is a
    fixed 1 jam org-wide, regardless of calendar length or machine
- Downtime trend chart (Harian/Mingguan/Bulanan, aligned to calendar
  day/week(Mon-Sun)/year(Jan-Dec))
- Date picker (from 2026-01-01) to view any specific day/week/month instead of only
  "now" — Harian/Mingguan/Bulanan + the chosen date together decide the range
- Per-machine filter ("Semua Mesin" dropdown) that scopes every KPI/chart/list on the
  dashboard to one machine at a time (including the MTBF/MTTR targets, which then use
  that machine's own Jam Kerja Harian instead of the whole fleet's)
- Dashboard-wide search bar that filters the machine table, breakdown timeline, and
  both Pareto lists by machine/cause/category/PIC/resolution/action in one go
- Repair Machine Order (RMO) workflow: open with PIC GH and a Level Bahaya
  (Kritis/Waspada/Info) (machine auto-flips to "down" status), close with PIC MTN,
  resolution/action, duration computed from start/end date+time (counted as machine
  downtime). Log filters: Semua/Open/Close.
- Top bar To-Do button lists every still-open work order (color-coded by danger
  level) so new RMOs are visible fleet-wide, separate from the general notification
  bell (new RMOs, theme/import events, etc.)
- Auto-refreshing dashboard (polls the API every 30s)
- CSV import/export for bulk-loading and exporting both machine master data and
  maintenance/breakdown records (see "Importing data" and "Exporting data to
  Excel / pgAdmin" below)
- Export Log Work Order supports Harian/Mingguan/Bulanan (+ a reference date) or
  the full unfiltered history; the CSV always includes both date and time columns

## Project structure

```
web/                     # React + Vite frontend
  src/
    App.jsx, AuthContext.jsx, AppContext.jsx, UIContext.jsx
    pages/                # Login, Dashboard, Machines, Maintenance, Reports
    components/           # Topbar, Sidebar, modals, charts, etc.
  vite.config.js
src/app.js               # Express app (API + serves web/dist)
src/server.js            # local dev entrypoint (runs src/app.js)
src/routes/api.js        # REST API routes (all but /health and /login require login)
src/lib/auth.js           # JWT sign/verify middleware
src/db.js                # Prisma client
scripts/create-admin.js  # provision/reset the admin account
netlify/functions/api.js # Netlify Function wrapper around the API router
netlify.toml             # Netlify build/redirect config
prisma/schema.prisma
prisma/migrations/        # SQL migrations
prisma/seed.js            # sample data (local dev only)
```

## Local development

1. Install dependencies (root + frontend):
   ```bash
   npm install
   npm install --prefix web
   ```
2. Create a `.env` file (see `.env.example`) with `DATABASE_URL`, `DIRECT_URL`,
   and `JWT_SECRET` pointing at your Postgres database.
3. Apply migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Create the admin account:
   ```bash
   npm run create-admin -- <username> <password>
   ```
5. Build the frontend and start the server:
   ```bash
   npm run build --prefix web
   npm start
   ```
6. Open http://localhost:3001 — log in, the dashboard and API are served from the same port.

For frontend-only iteration with hot reload, run `npm run dev --prefix web`
instead (it proxies `/api` to `http://localhost:3001`, so the backend must
also be running).

## Deploying online (Netlify + Supabase)

1. **Database**: create a free Postgres project on [Supabase](https://supabase.com).
   Get two connection strings from the project's "Connect" dialog:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler or direct** (port 5432) → `DIRECT_URL`

   Append `?pgbouncer=true&connection_limit=9` to `DATABASE_URL`. **Don't use
   a low `connection_limit`** (e.g. 1) — the dashboard fires 7 API requests
   in parallel on every load/refresh, and too few pooled connections means
   some requests queue indefinitely instead of just being a bit slower.

2. **Netlify site**: Import this repo. `netlify.toml` already configures:
   - Build command: `npm install && npm run build && npm install --prefix web && npm run build --prefix web`
   - Publish directory: `web/dist`
   - Functions directory: `netlify/functions`

   In Site configuration → Environment variables, add `DATABASE_URL`,
   `DIRECT_URL`, and `JWT_SECRET` (same values as your local `.env`).

3. **Migrate + create the admin** against the Supabase database (run locally,
   pointed at the same `DATABASE_URL`/`DIRECT_URL` Netlify uses):
   ```bash
   npx prisma migrate deploy
   npm run create-admin -- <username> <password>
   ```

4. Trigger a deploy. Netlify gives you a public URL — open it, log in with
   the admin account you created.

## Deploying online (Render + Supabase)

An alternative to Netlify when its free build-minutes run out. No code changes
needed — Render just runs this app as a single Express server (`npm start`),
serving both the built React app and the API from one process, instead of
splitting frontend/static + serverless function the way Netlify does.

1. **Database**: same Supabase setup as above (see step 1 in the Netlify
   section) — reuse the same `DATABASE_URL`/`DIRECT_URL`.

2. **Render**: [render.com](https://render.com) → New → **Blueprint** → connect
   this repo. `render.yaml` already configures:
   - Build command: `npm install && npm run build && npm install --prefix web && npm run build --prefix web`
   - Start command: `npm start`
   - Plan: free

   Render will prompt for the env vars marked `sync: false` in `render.yaml`:
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (same values as Netlify/`.env`).

3. Deploy. Render gives you a `*.onrender.com` URL.

**Free tier behavior**: the service spins down after 15 minutes with no
traffic and takes ~30s to wake up on the next request — fine for a demo, not
for a 24/7 production site. Netlify and Render can run side by side off the
same Supabase database; nothing needs to be removed from either.

### Troubleshooting

- **`/api/health`** (no login required) — open `https://<site>/api/health`.
  `{"ok":true,"machines":N}` means the function can reach Postgres.
- **Login works but the dashboard never finishes "Updating…"** — almost
  always `connection_limit` set too low on `DATABASE_URL` (see above).
- **POST/PATCH requests fail with no error** — `express.json()` doesn't parse
  the body correctly under `serverless-http` because the mock request object
  sets `complete: true` upfront, tricking `body-parser`'s "already read"
  check. `netlify/functions/api.js` works around this with a manual
  `JSON.parse` of the raw body — don't replace it with bare `express.json()`.

## Exporting data to Excel / pgAdmin

All Work Order (RMO) records are exposed through a single Postgres view,
`work_order_export` (defined in
`prisma/migrations/20260619100000_add_work_order_export_view/migration.sql`),
joining `Breakdown` with `Machine` and renaming columns to their Indonesian
labels (mesin, cluster, line, tanggal, jenis_problem, pic_gh, pic_mtn, dst).
Both the website and pgAdmin read from the same view, so the columns/format
are always identical.

- **From the website**: Sidebar/Drawer → "Export Log Work Order", or
  Laporan page → "Export Log Work Order (CSV)". A dialog lets you pick
  Harian/Mingguan/Bulanan (with a reference date) or the full unfiltered
  history before downloading a `.csv` that opens directly in Excel.
- **From pgAdmin**: connect to the same Supabase database → Query Tool → run
  ```sql
  SELECT * FROM work_order_export ORDER BY tanggal DESC;
  ```
  then right-click the result grid → **Export...** → CSV. Useful for ad-hoc
  filtering/joins before exporting, without needing a website feature for
  every possible report.
- **Monitoring via SQL** without installing anything: Supabase dashboard →
  **SQL Editor** works the same way as pgAdmin's Query Tool, directly in the
  browser.

## Importing data

The "Import CSV" sidebar button has two modes:

- **Data Breakdown / Work Order** — columns:
  ```
  machine_name, machine_cluster, machine_line, breakdown_date, start_time, end_time, failure_cause, category, technician, notes
  ```
  New machines are created automatically if they don't already exist.

- **Master Data Mesin** — bulk-loads/updates machine master data (`POST
  /api/import/machines`), columns:
  ```
  NO, Nomor Asset, Nama Mesin, Type, Merk tahun, Daya, Cluster, Line, Shift, Jam Waktu Kerja
  ```
  Matched by `Nama Mesin`: existing machines are updated, new ones are created.
  Master data can also still be entered manually one machine at a time via
  "Tambah Mesin" / "Edit Info Mesin" in the UI.

## Next steps / expanding data

- Add more machines/fields by editing `prisma/schema.prisma` and running
  `npx prisma migrate dev` to create a new migration.
- Track production counts per machine to compute real Performance/Quality
  (currently defaulted per machine in the `Machine` table).
- Support multiple admin accounts (the `Admin` table already supports more
  than one row; there's just no UI yet to add a second one).
