/* Statewide Texas stream gauges from the USGS Instantaneous Values service.
 *
 * The HCFWS network only covers greater Houston; USGS carries ~800 active
 * gage-height sites across all of Texas. No flood-stage data here, so these
 * render as a separate "context" layer (level + name only), not risk-tiered
 * dots. Free API, no key. */

export interface UsgsGauge {
  id: string;
  name: string;
  lat: number;
  lng: number;
  levelFt: number;
  readAt: string; // ISO timestamp
}

const USGS_URL =
  'https://waterservices.usgs.gov/nwis/iv/' +
  '?format=json&stateCd=tx&parameterCd=00065&siteStatus=active';

// Readings older than this are dead sensors still listed as "active".
const MAX_AGE_HOURS = 6;

interface UsgsSeries {
  sourceInfo?: {
    siteName?: string;
    siteCode?: Array<{ value?: string }>;
    geoLocation?: {
      geogLocation?: { latitude?: number; longitude?: number };
    };
  };
  values?: Array<{
    value?: Array<{ value?: string; dateTime?: string }>;
  }>;
}

export async function getUsgsGauges(): Promise<UsgsGauge[]> {
  try {
    const res = await fetch(USGS_URL, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const series: UsgsSeries[] = data?.value?.timeSeries ?? [];

    const cutoff = Date.now() - MAX_AGE_HOURS * 3600_000;
    const seen = new Set<string>();
    const out: UsgsGauge[] = [];

    for (const s of series) {
      const id = s.sourceInfo?.siteCode?.[0]?.value;
      const name = s.sourceInfo?.siteName;
      const geo = s.sourceInfo?.geoLocation?.geogLocation;
      const reading = s.values?.[0]?.value?.[0];
      if (!id || !name || !geo || !reading?.value || !reading.dateTime) continue;
      if (seen.has(id)) continue;

      const levelFt = parseFloat(reading.value);
      const readMs = Date.parse(reading.dateTime);
      if (!Number.isFinite(levelFt) || !Number.isFinite(readMs)) continue;
      if (readMs < cutoff) continue;
      if (typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
        continue;
      }

      seen.add(id);
      out.push({
        id,
        name,
        lat: geo.latitude,
        lng: geo.longitude,
        levelFt,
        readAt: new Date(readMs).toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}
