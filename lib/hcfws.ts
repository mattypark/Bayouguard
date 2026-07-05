/* Direct Harris County Flood Warning System enrichment.
 *
 * The Python backend's /gauges returns id/position/level/tier but drops fields
 * the HCFWS feed already carries: the live gauge TREND (ft/hr — the single most
 * important flood signal), recent rainfall at the site, the reading timestamp,
 * and which county network the gauge belongs to. This module fetches the same
 * feed server-side and exposes those extras keyed by SiteId, so the UI can show
 * where the water is HEADING, not just where it is.
 *
 * Server-only: the HCFWS endpoint requires a Referer header and has no CORS. */

export interface GaugeExtra {
  trend: number; // ft/hr; >0 rising, <0 falling
  rainfall: number; // inches at the site over the feed window
  readAt: string; // ISO timestamp of the latest reading
  county: string; // owning flood-warning network (from RegionId)
}

// All region networks the HCFWS map exposes. Verified geographically against
// per-region gauge centroids (2026-07): 1 = Harris core network, rest are the
// neighboring county networks the feed also carries.
const REGION_COUNTY: Record<number, string> = {
  1: 'Harris',
  3: 'Brazoria',
  4: 'Fort Bend',
  10: 'Fort Bend',
  14: 'Walker',
  18: 'Walker',
  19: 'Liberty',
  20: 'Montgomery',
  21: 'Chambers',
  22: 'Galveston',
  23: 'Waller',
  24: 'Galveston',
  25: 'Galveston',
  26: 'Fort Bend',
};

const FEED_URL =
  'https://www.harriscountyfws.org/Home/GetSiteRecentData' +
  '?regionId=3&regionId=24&regionId=25&regionId=26&regionId=21&regionId=4' +
  '&regionId=10&regionId=22&regionId=1&regionId=14&regionId=18&regionId=19' +
  '&regionId=23&regionId=20&timeSpan=7&dt=1779069600000';

interface FeedFeature {
  properties?: {
    SiteId?: number;
    RegionId?: number;
    Rainfall?: number | string;
    StreamData?: Array<{
      CurrentGageTrend?: number | null;
      CurrentReadingDate?: string;
    }>;
  };
}

function toNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/* Fetch the feed and index the extras by SiteId. Returns an empty map on any
 * failure — enrichment is additive, never load-bearing. */
export async function getGaugeExtras(): Promise<Map<number, GaugeExtra>> {
  const extras = new Map<number, GaugeExtra>();
  try {
    const res = await fetch(FEED_URL, {
      headers: { Referer: 'https://www.harriscountyfws.org/' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return extras;
    const data = await res.json();
    const features: FeedFeature[] = Array.isArray(data?.features)
      ? data.features
      : [];

    for (const f of features) {
      const p = f.properties;
      const id = p?.SiteId;
      const stream = p?.StreamData?.[0];
      if (typeof id !== 'number' || !stream) continue;
      extras.set(id, {
        trend: toNum(stream.CurrentGageTrend),
        rainfall: toNum(p?.Rainfall),
        readAt: stream.CurrentReadingDate ?? '',
        county: REGION_COUNTY[p?.RegionId ?? -1] ?? 'Regional',
      });
    }
  } catch {
    // Feed unreachable — return what we have (possibly nothing).
  }
  return extras;
}

// Trend classification shared by UI + outlook. Thresholds in ft/hr; HCFWS noise
// floor sits well under 0.05.
export type TrendState = 'rising' | 'falling' | 'steady';

export function classifyTrend(trend: number): TrendState {
  if (trend >= 0.05) return 'rising';
  if (trend <= -0.05) return 'falling';
  return 'steady';
}
