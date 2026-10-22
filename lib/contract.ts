/* The FastAPI backend contract, typed from real responses.
 *
 * Captured 2026-10-09 against https://bayouguard-backend-qibd.onrender.com
 * (re-verified the same day):
 *
 *   GET /risk?address=2100%20Memorial%20Dr%20Houston%20TX&lat=29.7633&lng=-95.3998 -> 200
 *   {"address":"2100 Memorial Dr Houston TX","risk_tier":"SAFE","risk_score":10,
 *    "buffer_ft":17.9,"nearest_gauge_distance_miles":0.57,
 *    "message":"Flood risk at 2100 Memorial Dr Houston TX is SAFE (10%). The nearest
 *    gauge is 0.6 miles away with water level at 7.11 ft (floods at 25.0 ft).",
 *    "model_used":"ML"}
 *
 *   GET /gauges -> 200 {"count":338,"gauges":[...]}, each:
 *   {"id":100,"latitude":29.554639,"longitude":-95.025513,"current_level_ft":2.87,
 *    "flood_level_ft":4.7,"buffer_ft":1.8,"risk_tier":"HIGH"}
 *   Tiers in that snapshot: SAFE 156, LOW 115, MEDIUM 53, HIGH 13, CRITICAL 1.
 *   Tier cut points inferred from buffer_ft: CRITICAL <= 0 < HIGH < 2 <= MEDIUM
 *   < 5 <= LOW < 10 <= SAFE.
 *
 * Known behaviour:
 *   - /risk without lat/lng -> 422. Far outside Harris County (Dallas) -> 500.
 *   - /risk ignores `lang`; `message` is always English, so the UI builds its
 *     own sentence from the numbers and keeps `message` for debugging only.
 *   - GET / reports {"model_status":"Active (ML)"}; /health is 404.
 *   - Render's free tier sleeps after 15 min idle; the first call can take ~1 min. */

/** Demo fixtures reuse real HCFWS site ids offset by this, so live extras never attach to them. */
export const DEMO_ID_BASE = 900_000;

export type RawTier = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// LIVE — GET /risk?address&lat&lng&lang
export interface BackendRisk {
  address: string;
  risk_tier: RawTier | string;
  risk_score: number; // integer 0-100
  buffer_ft: number;
  nearest_gauge_distance_miles: number;
  message: string;
  /** "ML" when the random-forest model scored it; anything else is a rule-based fallback. */
  model_used?: string;
  error?: string;
}

// LIVE — GET /gauges
export interface BackendGauge {
  id: number;
  latitude: number;
  longitude: number;
  current_level_ft: number;
  flood_level_ft: number;
  buffer_ft: number;
  risk_tier: RawTier | string;
}

export interface BackendGaugesResponse {
  count: number;
  gauges: BackendGauge[];
}

/** Headroom -> backend tier, using the cut points the live backend uses. */
export function tierForBuffer(bufferFt: number): RawTier {
  if (bufferFt <= 0) return 'CRITICAL';
  if (bufferFt < 2) return 'HIGH';
  if (bufferFt < 5) return 'MEDIUM';
  if (bufferFt < 10) return 'LOW';
  return 'SAFE';
}

export function isBackendRisk(v: unknown): v is BackendRisk {
  const r = v as BackendRisk;
  return (
    !!r &&
    typeof r.risk_score === 'number' &&
    typeof r.risk_tier === 'string' &&
    typeof r.buffer_ft === 'number' &&
    !r.error
  );
}

export function isBackendGauge(v: unknown): v is BackendGauge {
  const g = v as BackendGauge;
  return (
    !!g &&
    typeof g.id === 'number' &&
    typeof g.latitude === 'number' &&
    typeof g.longitude === 'number' &&
    typeof g.current_level_ft === 'number' &&
    typeof g.flood_level_ft === 'number' &&
    typeof g.buffer_ft === 'number' &&
    typeof g.risk_tier === 'string'
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * PLANNED — not built on the backend yet. The frontend already calls each
 * one through a Next route in app/api/ and falls back (see lib/endpoints.ts)
 * until it ships; when it does, the feature goes live with no frontend
 * change. A 404 here never affects the data-status pill.
 * ───────────────────────────────────────────────────────────────────────── */

// PLANNED — GET /forecast?lat&lng&hours=6
export interface Forecast {
  hours: string[]; // ISO hour timestamps, first is now
  scores: number[]; // risk score 0-100 per hour
}

// PLANNED — GET /shelters
export interface Shelter {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: 'open' | 'full' | 'closed';
  petFriendly: boolean;
  accessible: boolean;
  capacity?: number;
  occupancy?: number;
  updatedAt: string;
}

// PLANNED — GET /reservoirs (Addicks and Barker)
export interface Reservoir {
  name: string;
  poolElevationFt: number;
  outflowCfs: number | null;
  percentCapacity: number | null;
  trend: 'rising' | 'falling' | 'steady';
  updatedAt: string;
}

// PLANNED — GET /roads: GeoJSON of closed or flooded road segments
export interface RoadFeature {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: Array<[number, number]> };
  properties: { name: string; status: 'closed' | 'flooded'; updatedAt: string };
}
export interface RoadCollection {
  type: 'FeatureCollection';
  features: RoadFeature[];
}

// PLANNED — GET /flood-history?zip
export interface FloodHistory {
  zip: string;
  claimsSince2015: number;
  events: string[]; // named storms with claims in this ZIP, oldest first
}

// PLANNED — POST /subscribe
export interface SubscribeRequest {
  phone?: string;
  email?: string;
  addresses: string[];
  threshold: 'HIGH' | 'CRITICAL';
  lang: 'en' | 'es' | 'vi';
  allClear?: boolean;
}

// PLANNED — POST /reports and GET /reports
export type ReportSeverity = 'water_on_road' | 'passable' | 'impassable';
export interface CommunityReport {
  id?: string;
  lat: number;
  lng: number;
  severity: ReportSeverity;
  note?: string;
  createdAt: string;
  expiresAt: string;
}

// PLANNED — GET /health
export interface Health {
  status: string;
  lastGaugeRefresh?: string;
  modelLoaded?: boolean;
  modelVersion?: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

export function isForecast(v: unknown): v is Forecast {
  const f = v as Forecast;
  return !!f && Array.isArray(f.hours) && Array.isArray(f.scores) && f.scores.length > 0 && f.scores.every(isNum);
}

export function isShelterList(v: unknown): v is Shelter[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s: Shelter) =>
        s && isStr(s.id) && isStr(s.name) && isNum(s.lat) && isNum(s.lng) &&
        (s.status === 'open' || s.status === 'full' || s.status === 'closed'),
    )
  );
}

export function isReservoirList(v: unknown): v is Reservoir[] {
  return Array.isArray(v) && v.length > 0 && v.every((r: Reservoir) => r && isStr(r.name) && isNum(r.poolElevationFt));
}

export function isRoadCollection(v: unknown): v is RoadCollection {
  const c = v as RoadCollection;
  return !!c && c.type === 'FeatureCollection' && Array.isArray(c.features);
}

export function isFloodHistory(v: unknown): v is FloodHistory {
  const h = v as FloodHistory;
  return !!h && isStr(h.zip) && isNum(h.claimsSince2015) && Array.isArray(h.events);
}

export function isReportList(v: unknown): v is CommunityReport[] {
  return Array.isArray(v) && v.every((r: CommunityReport) => r && isNum(r.lat) && isNum(r.lng) && isStr(r.severity));
}

export function isHealth(v: unknown): v is Health {
  return !!v && isStr((v as Health).status);
}
