# BayouGuard

Hyperlocal flood risk for Houston. Type an address and BayouGuard reads the
nearest Harris County flood gauges, scores the risk with a random-forest model,
and tells you whether it's safe to drive — in English, Spanish, or Vietnamese.

Built for the Congressional App Challenge 2026 (TX-07).

## Run it locally

```bash
npm install
NEXT_PUBLIC_API_BASE_URL=https://bayouguard-backend-qibd.onrender.com npm run dev
```

Or put that one line in `.env.local` (no trailing slash) and run `npm run dev`.
Without the variable the app still runs: gauges come straight from the Harris
County feed, or from labelled demo data, and the status pill says so.

## Deploying on Vercel

1. Vercel → Project → Settings → Environment Variables → add
   `NEXT_PUBLIC_API_BASE_URL` = `https://bayouguard-backend-qibd.onrender.com`
   for **Production** and **Preview**.
2. **Redeploy.** `NEXT_PUBLIC_` values are baked in at build time, so adding the
   variable does nothing until the next build.

## Keeping the backend awake

The backend runs on Render's free tier, which sleeps after 15 minutes without
traffic and takes about a minute to wake. The app handles this — it shows
"Waking up the flood model" and keeps trying for 70 seconds — but a judge
shouldn't have to wait.

`/api/keepalive` pings the backend's `/gauges` and returns `{ ok, ms }`. Point a
free uptime monitor at it every 10 minutes during demo recording and the judging
window (Oct 28 – Nov 23):

- **UptimeRobot**: New monitor → HTTP(s) → `https://bayouguard.vercel.app/api/keepalive` → interval 10 min.
- **cron-job.org**: New cronjob → same URL → every 10 minutes.

Render's free tier gives 750 instance hours a month — enough for one service
running all month. A second free service in the same Render workspace shares
those hours, so keeping two awake around the clock would run out.

## Connecting the backend

Everything the frontend expects from the FastAPI backend is typed in
[`lib/contract.ts`](lib/contract.ts), each endpoint marked **LIVE** or
**PLANNED**. The browser never calls the backend directly — every call goes
through a Next route in `app/api/`, so the backend needs no CORS setup.

Setting `NEXT_PUBLIC_API_BASE_URL` is the whole hookup. When a planned endpoint
ships with the shape in the contract, its feature goes live on the next request
with no frontend change. Until then each one falls back as shown, and a 404 on a
planned endpoint never changes the data-status pill — only `/risk` and `/gauges`
do.

| Endpoint | Status | What the UI does with it | Until it exists |
| --- | --- | --- | --- |
| `GET /risk?address&lat&lng&lang` | LIVE | Risk score, tier and "ML model score" label on the address card | Score estimated from the nearest gauge's headroom, labelled as an estimate |
| `GET /gauges` | LIVE | Every dot on the map and graph, the leaderboard, the nearest-gauge list | Readings straight from the Harris County feed ("Partial data"), then demo fixtures ("Demo data") |
| `GET /forecast?lat&lng&hours=6` | PLANNED | Hourly risk bars (Now … +6h) on the address card | Demo bars drifting from the current score, labelled "Demo" |
| `GET /shelters` | PLANNED | `/shelters` list and map, shelter pins on the map | Real venues with sample statuses, every card labelled "Sample status" |
| `GET /reservoirs` | PLANNED | Addicks and Barker card: pool, % capacity, outflow, trend | Pool elevation and trend from the HCFWS dam gauges; capacity and outflow shown as unavailable |
| `GET /roads` | PLANNED | Red dashed closures on the map | Four sample segments, labelled demo in the legend |
| `GET /flood-history?zip` | PLANNED | "Flood memory" line on the address card | Real NFIP claims straight from OpenFEMA (free, keyless) |
| `POST /subscribe` | PLANNED | Not used yet — `/alerts` sends people to free official alerts (HCFWS gauge subscriptions, ReadyHarris, phone emergency alerts) | — |
| `GET` / `POST /reports` | PLANNED | Community flood pins and "Report flooding here" | Two sample pins; a new report stays on the reporter's device and says it isn't shared |
| `GET /health` | PLANNED | Health probe at `/api/health` | A successful `/gauges` counts as healthy |

`/risk` is never called without coordinates (it returns 422) or outside the
Houston service area (it returns 500 far from Harris County); the app says
"BayouGuard covers the Houston area for now" instead.

Gauge names come from the HCFWS feed. To refresh the bundled fallback table:

```bash
node scripts/build-gauge-names.mjs
```
