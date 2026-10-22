/* Server-side fetchers for the PLANNED backend endpoints (lib/contract.ts).
 * Each tries the backend first; when that 404s, times out or returns the
 * wrong shape, it falls back — to another real source where one exists, to
 * labelled fixtures otherwise — and says which with `source`. None of these
 * affect the data-status pill: only /risk and /gauges do. */

import {
  isFloodHistory,
  isForecast,
  isHealth,
  isReportList,
  isReservoirList,
  isRoadCollection,
  isShelterList,
  type CommunityReport,
  type FloodHistory,
  type Forecast,
  type Health,
  type Reservoir,
  type RoadCollection,
  type Shelter,
} from './contract';
import { BASE, HAS_BACKEND, WARM_TIMEOUT_MS, backendGet } from './api';
import { getHcfws } from './hcfws';
import { classifyTrend } from './trend';
import { demoForecast, demoReports, demoReservoirs, demoRoads, demoShelters } from './fixtures';

/** live — the backend; partial — another real source (HCFWS, FEMA); demo — fixtures. */
export type EndpointSource = 'live' | 'partial' | 'demo';
export interface Sourced<T> {
  data: T;
  source: EndpointSource;
  /** Where a non-backend real source came from, for the label. */
  via?: 'hcfws' | 'fema';
}

// Planned endpoints 404 fast when the backend is up; don't wait long on them.
const PLANNED_TIMEOUT_MS = 8_000;

export async function getForecast(
  lat: number,
  lng: number,
  current: { score: number; level: 'CLEAR' | 'WATCH' | 'WARNING' },
): Promise<Sourced<Forecast>> {
  const r = await backendGet(`/forecast?lat=${lat}&lng=${lng}&hours=6`, PLANNED_TIMEOUT_MS, isForecast);
  if (r.ok) return { data: r.data, source: 'live' };
  return { data: demoForecast(current.score, current.level), source: 'demo' };
}

export async function getShelters(): Promise<Sourced<Shelter[]>> {
  const r = await backendGet('/shelters', PLANNED_TIMEOUT_MS, isShelterList, { next: { revalidate: 120 } });
  if (r.ok) return { data: r.data, source: 'live' };
  return { data: demoShelters(), source: 'demo' };
}

export async function getRoads(): Promise<Sourced<RoadCollection>> {
  const r = await backendGet('/roads', PLANNED_TIMEOUT_MS, isRoadCollection, { next: { revalidate: 120 } });
  if (r.ok) return { data: r.data, source: 'live' };
  return { data: demoRoads(), source: 'demo' };
}

export async function getReports(): Promise<Sourced<CommunityReport[]>> {
  const r = await backendGet('/reports', PLANNED_TIMEOUT_MS, isReportList);
  if (r.ok) return { data: r.data, source: 'live' };
  return { data: demoReports(), source: 'demo' };
}

/* POST helper: true when the backend accepted it. In demo mode nothing is
 * stored or sent anywhere, and the UI says so. */
async function backendPost(path: string, body: unknown): Promise<boolean> {
  if (!HAS_BACKEND) return false;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(PLANNED_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const postReport = (report: CommunityReport) => backendPost('/reports', report);

/* Addicks and Barker. Backend first; then the HCFWS dam gauges, which carry
 * the real pool elevation and trend (but no outflow or capacity); then demo. */
const DAM_SITES = [
  { name: 'Addicks', site: 2110 },
  { name: 'Barker', site: 2010 },
];

export async function getReservoirs(): Promise<Sourced<Reservoir[]>> {
  const r = await backendGet('/reservoirs', PLANNED_TIMEOUT_MS, isReservoirList, { next: { revalidate: 300 } });
  if (r.ok) return { data: r.data, source: 'live' };

  const { gauges, extras } = await getHcfws();
  const fromFeed: Reservoir[] = [];
  for (const { name, site } of DAM_SITES) {
    const g = gauges.find((x) => x.id === site);
    if (!g) continue;
    const x = extras.get(site);
    fromFeed.push({
      name,
      poolElevationFt: g.current_level_ft,
      outflowCfs: null,
      percentCapacity: null,
      trend: classifyTrend(x?.trend ?? 0),
      updatedAt: x?.readAt || new Date().toISOString(),
    });
  }
  if (fromFeed.length === DAM_SITES.length) return { data: fromFeed, source: 'partial', via: 'hcfws' };
  return { data: demoReservoirs(), source: 'demo' };
}

/* NFIP flood-insurance claims by ZIP since 2015. Backend first; otherwise
 * straight from OpenFEMA (free, keyless). Null when neither has an answer —
 * the card hides rather than inventing a history. */
const FEMA_URL = 'https://www.fema.gov/api/open/v3/NfipClaims';

// Named Houston-area flood events since 2015, by date of loss.
const EVENTS: Array<{ name: string; from: string; to: string }> = [
  { name: 'Memorial Day flood (2015)', from: '2015-05-24', to: '2015-05-28' },
  { name: 'Tax Day flood (2016)', from: '2016-04-17', to: '2016-04-20' },
  { name: 'Harvey (2017)', from: '2017-08-25', to: '2017-09-05' },
  { name: 'Imelda (2019)', from: '2019-09-17', to: '2019-09-22' },
  { name: 'Beryl (2024)', from: '2024-07-07', to: '2024-07-10' },
];
// A named event counts for a ZIP only with at least this many claims there.
const EVENT_MIN_CLAIMS = 5;

export async function getFloodHistory(zip: string): Promise<Sourced<FloodHistory> | null> {
  if (!/^\d{5}$/.test(zip)) return null;
  const r = await backendGet(`/flood-history?zip=${zip}`, PLANNED_TIMEOUT_MS, isFloodHistory, {
    next: { revalidate: 86_400 },
  });
  if (r.ok) return { data: r.data, source: 'live' };

  try {
    const url =
      `${FEMA_URL}?$filter=${encodeURIComponent(`reportedZipCode eq '${zip}' and yearOfLoss ge 2015`)}` +
      '&$select=dateOfLoss&$top=10000';
    const res = await fetch(url, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const json = await res.json();
    const rows: Array<{ dateOfLoss?: string }> = Array.isArray(json?.NfipClaims) ? json.NfipClaims : [];
    const dates = rows.map((x) => (x.dateOfLoss ?? '').slice(0, 10)).filter(Boolean);
    const events = EVENTS.filter(
      (e) => dates.filter((d) => d >= e.from && d <= e.to).length >= EVENT_MIN_CLAIMS,
    ).map((e) => e.name);
    return { data: { zip, claimsSince2015: dates.length, events }, source: 'partial', via: 'fema' };
  } catch {
    return null;
  }
}

/* No /health yet: try it, and when it 404s count a good /gauges as healthy. */
export async function getHealth(): Promise<{ healthy: boolean; health: Health | null; via: 'health' | 'gauges' | 'none' }> {
  const h = await backendGet('/health', WARM_TIMEOUT_MS, isHealth);
  if (h.ok) return { healthy: h.data.status === 'ok' || h.data.status === 'healthy', health: h.data, via: 'health' };
  const g = await backendGet('/gauges', WARM_TIMEOUT_MS, (v): v is unknown => Array.isArray((v as { gauges?: unknown })?.gauges));
  return { healthy: g.ok, health: null, via: g.ok ? 'gauges' : 'none' };
}
