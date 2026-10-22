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

import type { BackendGauge } from './contract';
import { tierForBuffer } from './contract';

export interface GaugeExtra {
  trend: number; // ft/hr; >0 rising, <0 falling
  rainfall: number; // inches at the site over the feed window
  readAt: string; // ISO timestamp of the latest reading
  county: string; // owning flood-warning network (from RegionId)
  name: string; // "Brays Bayou @ Main Street" (feed text minus the id)
}

/** A gauge built straight from the feed, in the backend's /gauges shape, for
 * when the backend is unreachable but HCFWS is not. */
export interface FeedGauge extends BackendGauge {
  name: string;
}

export interface HcfwsData {
  extras: Map<number, GaugeExtra>;
  gauges: FeedGauge[];
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
  geometry?: {
    coordinates?: [string | number, string | number];
    Text?: string;
  };
  properties?: {
    SiteId?: number;
    RegionId?: number;
    Rainfall?: number | string;
    StreamData?: Array<{
      CurrentLevel?: number | null;
      CurrentGageTrend?: number | null;
      CurrentReadingDate?: string;
      ChannelInfo?: { FloodLevelIndicator?: number | null };
    }>;
  };
}

function toNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/* HCFWS readings are Central time with no offset; pin them so "minutes ago"
 * is right on a UTC server. */
function centralToIso(local: string | undefined): string {
  if (!local) return '';
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(local)) return local;
  // CDT runs mid-March to early November, which covers storm season.
  const month = Number(local.slice(5, 7));
  const offset = month >= 3 && month <= 10 ? '-05:00' : '-06:00';
  const d = new Date(local + offset);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/* Fetch the feed once and derive the trend extras and a gauge list from it.
 * Empty on any failure — the feed is enrichment and a fallback, never the
 * only source. */
export async function getHcfws(timeoutMs = 8000): Promise<HcfwsData> {
  const extras = new Map<number, GaugeExtra>();
  const gauges: FeedGauge[] = [];
  try {
    const res = await fetch(FEED_URL, {
      headers: { Referer: 'https://www.harriscountyfws.org/' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { extras, gauges };
    const data = await res.json();
    const features: FeedFeature[] = Array.isArray(data?.features) ? data.features : [];

    for (const f of features) {
      const p = f.properties;
      const id = p?.SiteId;
      const stream = p?.StreamData?.[0];
      if (typeof id !== 'number' || !stream) continue;
      const name = (f.geometry?.Text ?? '').replace(/^\s*\d+\s+/, '').trim();
      extras.set(id, {
        trend: toNum(stream.CurrentGageTrend),
        rainfall: toNum(p?.Rainfall),
        readAt: centralToIso(stream.CurrentReadingDate),
        county: REGION_COUNTY[p?.RegionId ?? -1] ?? 'Regional',
        name,
      });

      const [lngRaw, latRaw] = f.geometry?.coordinates ?? [];
      const lat = toNum(latRaw);
      const lng = toNum(lngRaw);
      const current = stream.CurrentLevel;
      const flood = stream.ChannelInfo?.FloodLevelIndicator;
      if (!lat || !lng || typeof current !== 'number' || typeof flood !== 'number') continue;
      const buffer = Math.round((flood - current) * 10) / 10;
      gauges.push({
        id,
        name,
        latitude: lat,
        longitude: lng,
        current_level_ft: current,
        flood_level_ft: flood,
        buffer_ft: buffer,
        risk_tier: tierForBuffer(buffer),
      });
    }
  } catch {
    // Feed unreachable — return what we have (possibly nothing).
  }
  return { extras, gauges };
}
