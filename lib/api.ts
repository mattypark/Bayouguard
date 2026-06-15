/* Backend adapter. The FastAPI backend exposes /risk and /gauges (no /snapshot),
 * has no weather or drive verdict, and needs lat/lng. This layer geocodes the
 * address, calls the backend + Open-Meteo, and assembles a HomeSnapshot.
 *
 * Isomorphic: runs on the Next server (initial render) and in the browser (search).
 * Set NEXT_PUBLIC_API_BASE_URL in .env.local. */

import type {
  HomeSnapshot,
  Tier,
  BayouReading,
  DriveVerdict,
  GaugePoint,
  FloodView,
} from './types';
import { geocode } from './geocode';
import { getWeather } from './weather';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const DEFAULT_ADDRESS = '2100 Memorial Dr, Houston, TX 77027';
const NEAREST_BAYOU_COUNT = 4;

// Shown when backend is unset or a lookup fails, so the UI never renders empty.
const MOCK: HomeSnapshot = {
  risk: {
    address: DEFAULT_ADDRESS,
    zip: '77027',
    score: 42,
    tier: 'MEDIUM',
    message: 'Brays Bayou rising. Monitor conditions.',
    updatedAt: new Date().toISOString(),
  },
  weather: { tempF: 78, conditions: 'Partly cloudy', windMph: 12, humidity: 71 },
  drive: { state: 'CAUTION', message: 'Some low-lying roads may flood. Avoid underpasses.' },
  bayous: [
    { name: 'Brays',     stage: 18.4, flood: 20, spark: [12,13,14,15,16,16.5,17,17.4,17.8,18,18.2,18.4] },
    { name: 'Buffalo',   stage: 14.1, flood: 25, spark: [11,11.4,12,12.6,13,13.2,13.4,13.6,13.8,13.9,14,14.1] },
    { name: 'White Oak', stage:  9.8, flood: 18, spark: [6,6.5,7,7.4,7.8,8.2,8.5,8.8,9,9.3,9.6,9.8] },
    { name: 'Cypress',   stage:  7.2, flood: 16, spark: [4,4.4,4.8,5.2,5.6,5.8,6,6.3,6.6,6.8,7,7.2] },
  ],
};

interface BackendRisk {
  address: string;
  risk_tier: string; // SAFE | LOW | MEDIUM | HIGH | CRITICAL | UNKNOWN
  risk_score: number;
  buffer_ft: number;
  nearest_gauge_distance_miles: number;
  message: string;
  error?: string;
}

interface BackendGauge {
  id: number;
  latitude: number;
  longitude: number;
  current_level_ft: number;
  flood_level_ft: number;
  buffer_ft: number;
  risk_tier: string;
}

// Backend tier set -> frontend Tier. SAFE/UNKNOWN collapse to LOW.
function normalizeTier(t: string): Tier {
  switch (t) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH':     return 'HIGH';
    case 'MEDIUM':   return 'MEDIUM';
    default:         return 'LOW';
  }
}

// Backend has no drive verdict; derive it from the risk tier.
function driveFromTier(tier: Tier): DriveVerdict {
  switch (tier) {
    case 'CRITICAL':
    case 'HIGH':
      return { state: 'NO', message: 'High-water risk on local roads. Do not drive.' };
    case 'MEDIUM':
      return { state: 'CAUTION', message: 'Some low-lying roads may flood. Avoid underpasses.' };
    default:
      return { state: 'YES', message: 'Roads clear. Normal driving conditions.' };
  }
}

function zipFromAddress(address: string): string {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : '';
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Nearest gauges -> bayou readings. Gauges carry no name, so label by id.
// /gauges is a single snapshot (no history), so spark is a flat 2-point series.
function nearestBayous(
  gauges: BackendGauge[],
  lat: number,
  lng: number,
): BayouReading[] {
  return [...gauges]
    .sort(
      (a, b) =>
        haversine(lat, lng, a.latitude, a.longitude) -
        haversine(lat, lng, b.latitude, b.longitude),
    )
    .slice(0, NEAREST_BAYOU_COUNT)
    .map((g) => ({
      name: `Gauge ${g.id}`,
      stage: g.current_level_ft,
      flood: g.flood_level_ft,
      spark: [g.current_level_ft, g.current_level_ft],
    }));
}

async function fetchRisk(
  address: string,
  lat: number,
  lng: number,
): Promise<BackendRisk | null> {
  const url =
    `${BASE}/risk?address=${encodeURIComponent(address)}` +
    `&lat=${lat}&lng=${lng}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as BackendRisk;
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchGauges(): Promise<BackendGauge[]> {
  try {
    const res = await fetch(`${BASE}/gauges`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.gauges) ? (data.gauges as BackendGauge[]) : [];
  } catch {
    return [];
  }
}

function toGaugePoints(gauges: BackendGauge[]): GaugePoint[] {
  return gauges.map((g) => ({
    id: g.id,
    lat: g.latitude,
    lng: g.longitude,
    current: g.current_level_ft,
    flood: g.flood_level_ft,
    buffer: g.buffer_ft,
    tier: normalizeTier(g.risk_tier),
  }));
}

const MOCK_VIEW: FloodView = { snapshot: MOCK, center: null, gauges: [] };

/* Full assembly: geocode -> /risk + /gauges + weather -> snapshot + map data.
 * Both the SSR snapshot and the interactive map are built from this. */
export async function getFloodView(address?: string): Promise<FloodView> {
  if (!BASE) return MOCK_VIEW;

  const query = address ?? DEFAULT_ADDRESS;

  const geo = await geocode(query);
  if (!geo) return MOCK_VIEW; // unresolvable address -> keep UI populated

  const [risk, gauges, weather] = await Promise.all([
    fetchRisk(geo.label ?? query, geo.lat, geo.lng),
    fetchGauges(),
    getWeather(geo.lat, geo.lng),
  ]);

  if (!risk) return { ...MOCK_VIEW, center: { lat: geo.lat, lng: geo.lng } };

  const tier = normalizeTier(risk.risk_tier);
  const bayous = gauges.length ? nearestBayous(gauges, geo.lat, geo.lng) : MOCK.bayous;

  const snapshot: HomeSnapshot = {
    risk: {
      address: geo.label ?? risk.address,
      zip: zipFromAddress(geo.label ?? query),
      score: risk.risk_score,
      tier,
      message: risk.message,
      updatedAt: new Date().toISOString(),
    },
    weather: weather ?? MOCK.weather,
    drive: driveFromTier(tier),
    bayous,
  };

  return {
    snapshot,
    center: { lat: geo.lat, lng: geo.lng },
    gauges: toGaugePoints(gauges),
  };
}

export async function getHomeSnapshot(address?: string): Promise<HomeSnapshot> {
  return (await getFloodView(address)).snapshot;
}
