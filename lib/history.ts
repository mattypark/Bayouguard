/* Per-gauge water-level history from HCFWS.
 *
 * The map feed only carries the CURRENT reading; the ~48h time series lives
 * embedded in each gauge's detail page (`/GageDetail/Index/{siteId}`) inside a
 * hidden `streamElevationModeljson` div. This module fetches that page
 * server-side (Referer required, no CORS) and extracts a clean, downsampled
 * series the inspector can draw as a sparkline. */

export interface HistoryPoint {
  t: string; // ISO timestamp
  level: number; // ft
}

export interface GaugeHistory {
  points: HistoryPoint[]; // ascending by time
  floodLevel: number | null; // flood stage (ft) if the page reports one
}

const DETAIL_URL = 'https://www.harriscountyfws.org/GageDetail/Index/';
const MAX_POINTS = 72; // ~40min resolution over 48h; plenty for a sparkline

interface GridRow {
  SensorId?: number;
  DataTime?: string;
  DataValue?: number;
}

interface ElevationModel {
  HasData?: boolean;
  CumulativeGridData?: GridRow[];
  CurrentLevel?: number;
  FLLevelIndicator?: number;
  TOB?: number;
}

/* The grid mixes readings from multiple sensors at the site. Keep the sensor
 * whose latest value matches the gauge's reported CurrentLevel; if none
 * matches, keep whichever sensor has the most readings. */
function pickSeries(rows: GridRow[], currentLevel: number | undefined): GridRow[] {
  const bySensor = new Map<number, GridRow[]>();
  for (const r of rows) {
    if (
      typeof r.SensorId !== 'number' ||
      typeof r.DataValue !== 'number' ||
      !r.DataTime
    ) {
      continue;
    }
    const list = bySensor.get(r.SensorId) ?? [];
    list.push(r);
    bySensor.set(r.SensorId, list);
  }

  let best: GridRow[] = [];
  for (const list of bySensor.values()) {
    list.sort((a, b) => (a.DataTime! < b.DataTime! ? -1 : 1));
    const latest = list[list.length - 1]?.DataValue;
    const matchesCurrent =
      typeof currentLevel === 'number' &&
      typeof latest === 'number' &&
      Math.abs(latest - currentLevel) < 0.005;
    if (matchesCurrent) return list;
    if (list.length > best.length) best = list;
  }
  return best;
}

/* Even thinning to at most MAX_POINTS, always keeping the last reading. */
function downsample(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length <= MAX_POINTS) return points;
  const step = (points.length - 1) / (MAX_POINTS - 1);
  const out: HistoryPoint[] = [];
  for (let i = 0; i < MAX_POINTS; i++) {
    out.push(points[Math.round(i * step)]);
  }
  return out;
}

/* Fetch + parse one gauge's history. Returns null on any failure — the
 * sparkline is additive UI, never load-bearing. */
export async function getGaugeHistory(siteId: number): Promise<GaugeHistory | null> {
  try {
    const res = await fetch(`${DETAIL_URL}${siteId}`, {
      headers: { Referer: 'https://www.harriscountyfws.org/' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/streamElevationModeljson">(.*?)<\/div>/s);
    if (!match) return null;

    const decoded = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
    const model: ElevationModel = JSON.parse(decoded);
    if (!model?.HasData || !Array.isArray(model.CumulativeGridData)) return null;

    const series = pickSeries(model.CumulativeGridData, model.CurrentLevel);
    if (series.length < 2) return null;

    const points = downsample(
      series.map((r) => ({ t: r.DataTime!, level: r.DataValue! })),
    );

    const flood =
      typeof model.FLLevelIndicator === 'number' && model.FLLevelIndicator !== 999
        ? model.FLLevelIndicator
        : typeof model.TOB === 'number' && model.TOB !== 999
          ? model.TOB
          : null;

    return { points, floodLevel: flood };
  } catch {
    return null;
  }
}
