/* Placeholder Harris County gauges, used while the BayouGuard backend is not
 * connected (NEXT_PUBLIC_API_BASE_URL unset, or /gauges unreachable).
 *
 * BACKEND: delete this file's callers once /gauges is deployed. Everything
 * built from it is flagged `sample: true` so the UI can say so — a flood app
 * must never pass invented water levels off as real ones.
 *
 * The points sit along rough traces of the real bayous so the map and the
 * landing globe have the right shape, and the generator is seeded so the
 * sample never reshuffles between renders. */

import type { Tier } from './types';

// Same shape the FastAPI backend returns from /gauges.
export interface SampleGauge {
  id: number;
  latitude: number;
  longitude: number;
  current_level_ft: number;
  flood_level_ft: number;
  buffer_ft: number;
  risk_tier: Tier;
}

// [name, from [lng, lat], to [lng, lat], gauges along it]
const BAYOUS: Array<[string, [number, number], [number, number], number]> = [
  ['Buffalo', [-95.78, 29.77], [-95.27, 29.75], 12],
  ['Brays', [-95.66, 29.68], [-95.28, 29.71], 11],
  ['White Oak', [-95.56, 29.88], [-95.37, 29.77], 8],
  ['Greens', [-95.56, 29.95], [-95.2, 29.82], 9],
  ['Cypress Creek', [-95.86, 29.98], [-95.35, 30.05], 10],
  ['Sims', [-95.46, 29.65], [-95.25, 29.7], 6],
  ['Clear Creek', [-95.36, 29.56], [-95.05, 29.55], 7],
  ['Halls', [-95.45, 29.92], [-95.25, 29.83], 6],
  ['Hunting', [-95.36, 29.8], [-95.25, 29.76], 4],
  ['San Jacinto', [-95.13, 30.06], [-95.08, 29.78], 7],
];

// Ids well above any real HCFWS site id, so live extras never attach to them.
const ID_BASE = 900_000;

/** Small seeded PRNG (mulberry32) — deterministic sample, same on server and client. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mostly calm water, a few rising, one or two in trouble — what a wet spring
// afternoon looks like, so every tier colour shows up somewhere.
function tierFor(r: number): Tier {
  if (r < 0.02) return 'CRITICAL';
  if (r < 0.08) return 'HIGH';
  if (r < 0.24) return 'MEDIUM';
  return 'LOW';
}

const HEADROOM_FT: Record<Tier, [number, number]> = {
  LOW: [6, 14],
  MEDIUM: [2.5, 6],
  HIGH: [0.5, 2.5],
  CRITICAL: [-1.5, 0.5],
};

function build(): SampleGauge[] {
  const rand = rng(7713);
  const out: SampleGauge[] = [];
  for (const [, [x0, y0], [x1, y1], count] of BAYOUS) {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      // A little meander off the straight trace.
      const lng = x0 + (x1 - x0) * t + (rand() - 0.5) * 0.03;
      const lat = y0 + (y1 - y0) * t + (rand() - 0.5) * 0.025;
      const tier = tierFor(rand());
      const [lo, hi] = HEADROOM_FT[tier];
      const flood = Math.round((18 + rand() * 30) * 10) / 10;
      const buffer = Math.round((lo + rand() * (hi - lo)) * 10) / 10;
      out.push({
        id: ID_BASE + out.length + 1,
        latitude: +lat.toFixed(4),
        longitude: +lng.toFixed(4),
        current_level_ft: Math.round((flood - buffer) * 10) / 10,
        flood_level_ft: flood,
        buffer_ft: buffer,
        risk_tier: tier,
      });
    }
  }
  return out;
}

export const SAMPLE_GAUGES: readonly SampleGauge[] = build();
