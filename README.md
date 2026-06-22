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
- Per-machine status table (Cluster/Line) with live availability/breakdown stats;
  machines can be added and edited (name, cluster, line, Jam Kerja Harian) from the UI;
  dashboard shows the top 5 (sortable), "Semua Mesin" page shows all
- Breakdown timeline + Pareto analysis of failure causes and per-machine frequency
- MTBF/MTTR line charts (separate cards) with a dashed target line that scales with
  total daily working hours (MTBF target = Jam Kerja Harian × 5, MTTR target = × 0.1)
- Downtime trend chart (Harian/Mingguan/Bulanan, aligned to calendar
  day/week(Mon-Sun)/year(Jan-Dec))
- Date picker (from 2026-01-01) to view any specific day/week/month instead of only
  "now" — Harian/Mingguan/Bulanan + the chosen date together decide the range
- Repair Machine Order (RMO) workflow: open with PIC GH, close with PIC MTN,
  resolution/action, duration computed from start/end date+time (counted as machine downtime)
- Auto-refreshing dashboard (polls the API every 30s)
- CSV import/export for bulk-loading and exporting maintenance/breakdown records
  (see "Exporting data to Excel / pgAdmin" below)

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
  Laporan page → "Export Log Work Order (CSV)". Downloads a `.csv` that
  opens directly in Excel.
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

## Importing maintenance data

Use the "Import CSV" sidebar button to upload a `.csv` file with these columns:

```
machine_name, machine_cluster, machine_line, breakdown_date, start_time, end_time, failure_cause, category, technician, notes
```

New machines are created automatically if they don't already exist.

## Next steps / expanding data

- Add more machines/fields by editing `prisma/schema.prisma` and running
  `npx prisma migrate dev` to create a new migration.
- Track production counts per machine to compute real Performance/Quality
  (currently defaulted per machine in the `Machine` table).
- Support multiple admin accounts (the `Admin` table already supports more
  than one row; there's just no UI yet to add a second one).
