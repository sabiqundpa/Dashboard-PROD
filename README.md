# Dashboard-MTN

Real-time CNC machine maintenance monitoring dashboard — Express + Socket.io API,
PostgreSQL (via Prisma), and a static HTML/JS frontend served from the same app.

## Features

- KPI overview: breakdowns, downtime, availability, performance, quality, OEE, MTBF, MTTR
- Per-machine status table with live availability/breakdown stats
- Breakdown timeline + Pareto analysis of failure causes
- Downtime-per-day chart (last 7 days)
- Real-time updates via Socket.io (new breakdowns, status changes)
- CSV import for bulk-loading maintenance/breakdown records

## Project structure

```
index.html          # frontend (served statically by Express)
src/server.js       # Express + Socket.io entrypoint
src/routes/api.js   # REST API
src/db.js           # Prisma client
prisma/schema.prisma
prisma/migrations/  # SQL migrations
prisma/seed.js      # sample data
```

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (see `.env.example`) pointing `DATABASE_URL` at a Postgres database.
3. Apply migrations and seed sample data:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open http://localhost:3001 — the dashboard and API are served from the same port.

## Deploying online for free (Render + Neon)

This repo includes a `render.yaml` for one-click setup on [Render](https://render.com).

1. **Create a free Postgres database on [Neon](https://neon.tech)**
   - Sign up, create a project, and copy the connection string
     (looks like `postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require`).

2. **Create a Web Service on [Render](https://render.com)**
   - New → Blueprint → connect this GitHub repo (Render will detect `render.yaml`).
   - Or manually: New → Web Service → connect repo →
     - Build command: `npm install && npx prisma migrate deploy`
     - Start command: `npm start`
   - Add environment variable `DATABASE_URL` = your Neon connection string.

3. **Seed the database** (once, after first deploy)
   - In Render, open the service → Shell tab, run:
     ```bash
     npm run seed
     ```

4. Render will give you a public URL (e.g. `https://dashboard-mtn.onrender.com`)
   serving both the dashboard and the API/Socket.io — open it to test live.

   Note: free Render web services spin down after inactivity and take ~30-60s
   to wake up on the next request.

## Importing maintenance data

Use the "Import Excel" sidebar button to upload a `.csv` file with these columns:

```
machine_name, machine_type, breakdown_date, start_time, end_time, failure_cause, technician, notes
```

New machines are created automatically if they don't already exist.

## Next steps / expanding data

- Add more machines/fields by editing `prisma/schema.prisma` and running
  `npx prisma migrate dev` to create a new migration.
- Track production counts per machine to compute real Performance/Quality
  (currently defaulted per machine in the `Machine` table).
- Add authentication if this will hold real factory data.
