/* Backend adapter. The FastAPI backend exposes /risk and /gauges (no /snapshot),
 * has no weather or drive verdict, and needs lat/lng. This layer geocodes the
 * address, calls the backend + HCFWS + Open-Meteo, and assembles a FloodView
 * that says honestly where every number came from.
 *
 * Server-side (the /map render and the /api/flood route). Set
 * NEXT_PUBLIC_API_BASE_URL to the backend. Gauges fall back from the backend
 * to the HCFWS feed (real readings, no model) to lib/fixtures (demo). */

import type {
  HomeSnapshot,
  RiskSnapshot,
  Tier,
  BayouReading,
  DriveVerdict,
  GaugePoint,
  FloodView,
  DataSource,
  RiskSource,
} from './types';
import {
  isBackendGauge,
  isBackendRisk,
  tierForBuffer,
  type BackendGauge,
  type BackendRisk,
  type RawTier,
} from './contract';
import { geocode, inServiceArea } from './geocode';
import { getConditions } from './weather';
import { getHcfws, type GaugeExtra } from './hcfws';
import { buildOutlook } from './outlook';
import { DEMO_GAUGES } from './fixtures';
import { gaugeName } from './gaugeNames';
import { haversine } from './geo';

export const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
export const HAS_BACKEND = BASE.length > 0;

const NEAREST_BAYOU_COUNT = 4;
/** Default wait for a backend that is already awake. */
export const WARM_TIMEOUT_MS = 15_000;

type NamedGauge = BackendGauge & { name?: string; trend?: number };

export type Fetched<T> =
  | { ok: true; data: T }
  | { ok: false; timedOut: boolean; status?: number };

/* One backend GET with a hard timeout. Never throws. */
export async function backendGet<T>(
  path: string,
  timeoutMs: number,
  validate: (v: unknown) => v is T,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<Fetched<T>> {
  if (!HAS_BACKEND) return { ok: false, timedOut: false };
  try {
    const res = await fetch(`${BASE}${path}`, {
      cache: init?.next ? undefined : 'no-store',
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, timedOut: false, status: res.status };
    const data: unknown = await res.json();
    return validate(data) ? { ok: true, data } : { ok: false, timedOut: false, status: res.status };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    return { ok: false, timedOut: name === 'TimeoutError' || name === 'AbortError' };
  }
}

// Backend tier set -> frontend Tier. SAFE (and anything unknown) folds into LOW.
export function normalizeTier(t: string): Tier {
  switch (t) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH':     return 'HIGH';
    case 'MEDIUM':   return 'MEDIUM';
    default:         return 'LOW';
  }
}

function rawTier(t: string): RawTier {
  return t === 'SAFE' || t === 'LOW' || t === 'MEDIUM' || t === 'HIGH' || t === 'CRITICAL' ? t : 'LOW';
}

/* Score for a locally-estimated risk, from headroom alone. Only used when the
 * model is unavailable; labelled as an estimate wherever it shows. */
function scoreFromBuffer(bufferFt: number): number {
  if (bufferFt <= 0) return 95;
  if (bufferFt < 2) return Math.round(90 - bufferFt * 7.5); // 90..75
  if (bufferFt < 5) return Math.round(74 - (bufferFt - 2) * 8); // 74..50
  if (bufferFt < 10) return Math.round(49 - (bufferFt - 5) * 5); // 49..25
  return Math.max(5, Math.round(24 - (bufferFt - 10)));
}

// Backend has no drive verdict; derive it from the risk tier.
function driveFromTier(tier: Tier): DriveVerdict {
  switch (tier) {
    case 'CRITICAL':
    case 'HIGH':
      return { state: 'NO' };
    case 'MEDIUM':
      return { state: 'CAUTION' };
    default:
      return { state: 'YES' };
  }
}

function zipFromAddress(address: string): string {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : '';
}

function byDistance(gauges: NamedGauge[], lat: number, lng: number) {
  return gauges
    .map((g) => ({ g, miles: haversine(lat, lng, g.latitude, g.longitude) }))
    .sort((a, b) => a.miles - b.miles);
}

function nameOf(g: NamedGauge, extras: Map<number, GaugeExtra>): string {
  return g.name || gaugeName(g.id, extras.get(g.id)?.name);
}

// Nearest gauges -> readings, with real names and the live HCFWS trend.
function nearestBayous(
  sorted: Array<{ g: NamedGauge; miles: number }>,
  extras: Map<number, GaugeExtra>,
): BayouReading[] {
  return sorted.slice(0, NEAREST_BAYOU_COUNT).map(({ g, miles }) => ({
    id: g.id,
    name: nameOf(g, extras),
    miles: Math.round(miles * 10) / 10,
    stage: g.current_level_ft,
    flood: g.flood_level_ft,
    spark: [g.current_level_ft, g.current_level_ft],
    trend: g.trend ?? extras.get(g.id)?.trend,
  }));
}

export interface GaugeLoad {
  gauges: NamedGauge[];
  source: FloodView['gaugeSource'];
  timedOut: boolean;
}

/* Real gauges when the backend answers; the HCFWS feed's own readings when it
 * doesn't; the demo set when neither does. */
export async function loadGauges(
  timeoutMs = WARM_TIMEOUT_MS,
  hcfws?: Promise<Awaited<ReturnType<typeof getHcfws>>>,
): Promise<GaugeLoad> {
  const live = await backendGet(
    '/gauges',
    timeoutMs,
    (v): v is { gauges: BackendGauge[] } =>
      Array.isArray((v as { gauges?: unknown })?.gauges),
    { next: { revalidate: 60 } },
  );
  if (live.ok) {
    const gauges = live.data.gauges.filter(isBackendGauge);
    if (gauges.length > 0) return { gauges, source: 'backend', timedOut: false };
  }
  const timedOut = !live.ok && live.timedOut;
  const feed = await (hcfws ?? getHcfws());
  if (feed.gauges.length > 0) return { gauges: feed.gauges, source: 'hcfws', timedOut };
  return { gauges: [...DEMO_GAUGES], source: 'demo', timedOut };
}

function toGaugePoints(gauges: NamedGauge[], extras: Map<number, GaugeExtra>): GaugePoint[] {
  return gauges.map((g) => {
    const x = extras.get(g.id);
    return {
      id: g.id,
      lat: g.latitude,
      lng: g.longitude,
      current: g.current_level_ft,
      flood: g.flood_level_ft,
      buffer: g.buffer_ft,
      tier: normalizeTier(g.risk_tier),
      rawTier: rawTier(g.risk_tier),
      name: nameOf(g, extras),
      trend: g.trend ?? x?.trend,
      rainfall: x?.rainfall,
      readAt: x?.readAt,
      county: x?.county,
    };
  });
}

function gaugeOnlySource(load: GaugeLoad): DataSource {
  return load.source === 'backend' ? 'live' : load.source === 'hcfws' ? 'partial' : 'demo';
}

/** Gauges only — the map before any address is searched. */
export async function getGaugeView(timeoutMs = WARM_TIMEOUT_MS): Promise<FloodView> {
  const hcfws = getHcfws();
  const [load, { extras }] = await Promise.all([loadGauges(timeoutMs, hcfws), hcfws]);
  return {
    snapshot: null,
    center: null,
    address: null,
    gauges: toGaugePoints(load.gauges, extras),
    dataSource: gaugeOnlySource(load),
    gaugeSource: load.source,
    backendTimedOut: load.timedOut,
    fetchedAt: new Date().toISOString(),
  };
}

/** The demo view: what the server renders when it can't wait any longer. */
export function demoView(
  center: { lat: number; lng: number } | null = null,
  address: string | null = null,
  pending = false,
): FloodView {
  return {
    snapshot: null,
    center,
    address,
    gauges: toGaugePoints([...DEMO_GAUGES], new Map()),
    dataSource: 'demo',
    gaugeSource: 'demo',
    backendTimedOut: false,
    pending,
    fetchedAt: new Date().toISOString(),
  };
}

/* Full assembly: geocode -> /risk + gauges + weather -> snapshot + map data. */
export async function getFloodView(
  address?: string,
  coords?: { lat: number; lng: number },
  /** lite: leave the gauge list out — the result page shows no map. */
  opts: { timeoutMs?: number; lang?: string; lite?: boolean } = {},
): Promise<FloodView> {
  const timeoutMs = opts.timeoutMs ?? WARM_TIMEOUT_MS;
  const query = address?.trim();
  if (!query) return getGaugeView(timeoutMs);

  // A picked suggestion already carries coords — skip re-geocoding.
  const geo = coords
    ? { lat: coords.lat, lng: coords.lng, label: query }
    : await geocode(query);

  const hcfws = getHcfws();
  if (!geo) {
    const view = await getGaugeView(timeoutMs);
    return { ...view, address: query, notFound: true };
  }

  const resolvedAddress = geo.label ?? query;
  const center = { lat: geo.lat, lng: geo.lng };

  // The backend 500s far from Harris County — don't ask it.
  if (!inServiceArea(geo.lat, geo.lng)) {
    const view = await getGaugeView(timeoutMs);
    return { ...view, center, address: resolvedAddress, outOfArea: true };
  }

  const lang = opts.lang && /^(en|es|vi)$/.test(opts.lang) ? opts.lang : 'en';
  const riskPath =
    `/risk?address=${encodeURIComponent(resolvedAddress)}` +
    `&lat=${geo.lat}&lng=${geo.lng}&lang=${lang}`;

  const [risk, load, { weather, rain }, { extras }] = await Promise.all([
    backendGet<BackendRisk>(riskPath, timeoutMs, isBackendRisk),
    loadGauges(timeoutMs, hcfws),
    getConditions(geo.lat, geo.lng),
    hcfws,
  ]);

  const sorted = byDistance(load.gauges, geo.lat, geo.lng);
  const nearest = sorted[0] ?? null;
  const nearestName = nearest ? nameOf(nearest.g, extras) : null;

  let riskSnapshot: RiskSnapshot;
  if (risk.ok) {
    const r = risk.data;
    const source: RiskSource = r.model_used === 'ML' ? 'model' : 'rules';
    riskSnapshot = {
      address: resolvedAddress,
      zip: zipFromAddress(resolvedAddress),
      score: Math.max(0, Math.min(100, Math.round(r.risk_score))),
      tier: normalizeTier(r.risk_tier),
      rawTier: rawTier(r.risk_tier),
      source,
      bufferFt: r.buffer_ft,
      nearestMiles: r.nearest_gauge_distance_miles,
      nearestName,
      backendMessage: r.message,
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Score locally from the nearest gauge's headroom — real readings when the
    // gauges are real, but a rule of thumb, not the model.
    const buffer = nearest?.g.buffer_ft ?? 10;
    const raw = tierForBuffer(buffer);
    riskSnapshot = {
      address: resolvedAddress,
      zip: zipFromAddress(resolvedAddress),
      score: scoreFromBuffer(buffer),
      tier: normalizeTier(raw),
      rawTier: raw,
      source: load.source === 'demo' ? 'demo' : 'gauge-estimate',
      bufferFt: nearest ? buffer : null,
      nearestMiles: nearest ? Math.round(nearest.miles * 100) / 100 : null,
      nearestName,
      updatedAt: new Date().toISOString(),
    };
  }

  // 6-hour outlook: nearest gauge's headroom + live trend + incoming rain.
  const outlook = nearest
    ? buildOutlook(
        riskSnapshot.bufferFt ?? nearest.g.buffer_ft,
        nearest.g.trend ?? extras.get(nearest.g.id)?.trend ?? 0,
        rain,
      )
    : undefined;

  const snapshot: HomeSnapshot = {
    risk: riskSnapshot,
    weather,
    drive: driveFromTier(riskSnapshot.tier),
    bayous: nearestBayous(sorted, extras),
    rain: rain ?? undefined,
    outlook,
  };

  const gaugesLive = load.source === 'backend';
  const dataSource: DataSource =
    risk.ok && gaugesLive
      ? 'live'
      : risk.ok || gaugesLive || load.source === 'hcfws'
        ? 'partial'
        : 'demo';

  return {
    snapshot,
    center,
    address: resolvedAddress,
    gauges: opts.lite ? [] : toGaugePoints(load.gauges, extras),
    dataSource,
    gaugeSource: load.source,
    backendTimedOut: (!risk.ok && risk.timedOut) || load.timedOut,
    fetchedAt: new Date().toISOString(),
  };
}
