/* Everything the landing page draws, assembled server-side in one pass:
 * every gauge as a dot, the four stat cards, and the freshness line.
 *
 * Statewide dots are real (USGS, keyless). Harris County dots are the
 * backend's when it answers and the placeholder set when it doesn't — the
 * `sample` flag travels with them so the page can say which. */

import { getUsgsGauges } from './usgs';
import { getRainForecast } from './weather';
import { loadGauges, normalizeTier } from './api';
import type { Tier } from './types';

/** One dot on the landing map. `tier` is null for statewide gauges, which carry no flood stage. */
export interface LandingDot {
  lat: number;
  lng: number;
  tier: Tier | null;
}

export interface LandingStat {
  value: string;
  label: string;
  /** Short, true detail under the number — what the number is made of. */
  detail: string;
}

export interface LandingData {
  dots: LandingDot[];
  stats: LandingStat[];
  /** ISO time of the newest reading anywhere in the set, or null. */
  latestReading: string | null;
  sample: boolean;
}

const HOUSTON = { lat: 29.7604, lng: -95.3698 };

export async function getLandingData(): Promise<LandingData> {
  const [usgs, harris, rain] = await Promise.all([
    getUsgsGauges(),
    loadGauges(),
    getRainForecast(HOUSTON.lat, HOUSTON.lng),
  ]);

  const harrisDots: LandingDot[] = harris.gauges.map((g) => ({
    lat: g.latitude,
    lng: g.longitude,
    tier: normalizeTier(g.risk_tier),
  }));
  const statewideDots: LandingDot[] = usgs.map((g) => ({ lat: g.lat, lng: g.lng, tier: null }));

  const nearFlood = harrisDots.filter((d) => d.tier === 'HIGH' || d.tier === 'CRITICAL').length;
  const total = usgs.length + harrisDots.length;

  const latestReading = usgs.reduce<string | null>(
    (best, g) => (!best || g.readAt > best ? g.readAt : best),
    null,
  );

  const rainIn = rain ? rain.totalNext12h : null;

  const stats: LandingStat[] = [
    {
      value: total.toLocaleString('en-US'),
      label: 'Gauges live',
      detail: `${usgs.length.toLocaleString('en-US')} statewide · ${harrisDots.length} around Houston`,
    },
    {
      value: String(nearFlood),
      label: 'Near flood stage',
      detail: harris.sample ? 'Sample data · backend offline' : 'Within 2.5 ft of flooding',
    },
    {
      value: rainIn === null ? '—' : `${rainIn.toFixed(2)}″`,
      label: 'Rain next 12 h',
      detail: 'Downtown Houston · Open-Meteo',
    },
    {
      value: '5 min',
      label: 'Between readings',
      detail: 'USGS · Harris County FWS',
    },
  ];

  return {
    dots: [...statewideDots, ...harrisDots],
    stats,
    latestReading,
    sample: harris.sample,
  };
}
