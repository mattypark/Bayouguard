# Frontend status

Branch `frontend-finalization`, one commit per phase. Checked on 2026-10-09
against the live Render backend.

## Done

| Phase | What shipped |
| --- | --- |
| 1. Fix what's broken | Render backend connected; the server render waits at most 4 s, then the client keeps trying for up to 70 s with a "Waking up the flood model" state (tested against a real cold start); `/api/keepalive`; warm-up ping on page load; keyless Esri basemap in `lib/theme.ts`; real gauge names; honest status pill (Live / Partial data / Demo data) and score source label; out-of-area guard; Census fallback for type-ahead; graph empty state; `animejs`, `gsap` removed. |
| 2. Clear Sky | Light by default, navy dark theme, theme-aware tier colours, flat panels, sentence-case labels, DM Serif wordmark, water-coloured pin, sparklines and rain. |
| 3. Three languages | Every string in `lib/i18n/{en,es,vi}.ts` (es and vi are type-checked against en). Persisted to `bayouguard_lang`; sets `<html lang>`; settings button on phones. |
| 4. Backend-ready data layer | `lib/contract.ts` (LIVE + PLANNED), one fetcher and one Next route per endpoint (`lib/endpoints.ts`, `app/api/*`), health probe, stale-reading strip, README "Connecting the backend". |
| 5. Core screens | Nav + bottom tabs; address card in urgency order (drive verdict, arc gauge, outlook + hourly chart, rain, nearest gauges, flood memory, reservoirs, weather, actions, disclaimer); shelter/road/report/reservoir layers; legend; Locate me; Report flooding; bottom sheets on phones; welcome card. |
| 6. Pages | `/shelters`, `/alerts`, `/about`. |
| 7. Share + PWA | 1200×630 share card (html2canvas) with native share or PNG download; Open Graph cards for shared links; manifest, generated icons; small service worker with an offline banner. |
| 8. Polish | Skeletons, retry on every failed fetch, motion audit, contrast audit (both themes), lazy map/graph/chart, responsive pass at 375 / 768 / 1024 / 1280 / 1600. |

## Round 2 (2026-10-10): speed and the grandpa test

**Speed.** Measured in headless Chrome with the CPU slowed 6× (an older phone):

| Screen | Before | After |
| --- | --- | --- |
| Map, idle main thread | 100% busy | 4% |
| Map, page elements | 2,142 | 443 |
| Front page, idle main thread | 31% (animated dot field) | 1% |
| Result page, idle main thread | — | 1% |

What did it: ripples only on HIGH and CRITICAL gauges (about 14, not 338); wind layer off by default (still a layer); gauge dots, roads and the Texas mask drawn on one canvas (`preferCanvas`) instead of hundreds of SVG nodes; the mask recomputed after a pan ends rather than every frame; the animated landing page and its map hand-off removed; the graph view loaded only when opened.

**Answer-first design.** `/` is now one question, one address box and two big buttons (Check my address, Use my location), plus "check your saved address again" and neighborhood chips. `/check?address=` gives the answer in order: Is it safe to drive? (largest), the risk score, the next 6 hours in one sentence, what to do now (by risk level; Call 911 at CRITICAL), then three big buttons: Text me if this changes, See it on the map, Find a shelter. Sensors, charts, rain, flood history and reservoirs are folded under "More details". Type is 17–32px and buttons are 56px tall on these screens. The full map stays at `/map` for people who want to explore. Home is a fifth tab.

## Round 3 (2026-10-10): free alerts, Houston-only map, cleaner zooms

- `/alerts` is now a four-step guide to free official alerts, with no sign-up form: subscribe to the HCFWS gauge nearest your address (deep link to its page), sign up for ReadyHarris, turn on phone emergency alerts, add BayouGuard to the home screen. `/api/subscribe` is gone; `/subscribe` stays in the contract as PLANNED in case the backend ever sends its own alerts.
- The map covers only the area the gauges cover (29.05-30.9 N, 96.4-94.55 W), with no Texas mask, statewide USGS layer or Texas locator.
- Street labels fade out during a zoom and back in once the new labels load, instead of stacking stretched old labels over new ones.
- ESLint installed (`next/core-web-vitals`); `npm run lint` is clean.

## Running on fallbacks, and what turns each one live

Nothing below needs a frontend change. Once the backend ships the endpoint with the shape in `lib/contract.ts`, the feature goes live on the next request.

| Feature | Today | Turns live when the backend adds |
| --- | --- | --- |
| Hourly risk chart | Demo bars drifting from the current score, labelled "Demo" | `GET /forecast?lat&lng&hours=6` |
| Shelters page and map layer | Real venues with **sample** statuses; every card says "Sample status" | `GET /shelters` |
| Road closures layer | Four sample segments, marked demo in the legend | `GET /roads` |
| Community reports | Two sample pins; new reports stay on the reporter's device and say so | `GET` / `POST /reports` |
| Reservoirs (Addicks, Barker) | **Real** pool elevation and trend from the HCFWS dam gauges; capacity and outflow show "not available yet" | `GET /reservoirs` |
| Flood memory | **Real** NFIP claims from OpenFEMA v3 (free, keyless) | `GET /flood-history?zip` (optional; FEMA already works) |
| Health | A good `/gauges` counts as healthy | `GET /health` |

When `/gauges` itself is down, the map uses the Harris County feed's own readings ("Partial data"), then demo fixtures at real HCFWS sites ("Demo data").

**Suggestion for the backend:** add a five-line `/health` route returning `{ status, modelLoaded, modelVersion, lastGaugeRefresh }`. The status pill could then tell "model down" apart from "gauges down".

## Not finished, or needs you

- **Lighthouse not measured.** Lighthouse isn't installed here. `/map` first load is 180 kB of JS and `/check` 133 kB; Leaflet, the graph and recharts load on demand.
- **No `.env.local` or `.env.example`.** My setup isn't allowed to create `.env*` files. For local dev, put `NEXT_PUBLIC_API_BASE_URL=https://bayouguard-backend-qibd.onrender.com` in `.env.local`. For production, set it in Vercel and redeploy (see README).
- **`{{SCHOOL}}`** placeholder on `/about` (`components/pages/AboutView.tsx`).
- **Design direction.** Clear Sky replaces the "paper and ink" redesign picked from `docs/boards/2026-10-08-redesign-board.jpg` a day earlier. Worth a quick check with Matthew.
- **Harvey peak pools** on the reservoir card (Addicks 109.1 ft, Barker 101.6 ft) are the USACE-reported records as I know them; confirm before the video.
- **Share on a real phone** hasn't been tried. The card renders and captures correctly in headless Chrome, but the native share sheet only exists on devices.
