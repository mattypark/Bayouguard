/* 6-hour flood outlook.
 *
 * The unique BayouGuard signal: instead of only reporting where the water IS,
 * project where it's HEADING by combining three live inputs —
 *   1. headroom  — feet left before the nearest gauge floods
 *   2. trend     — that gauge's live rate of change (ft/hr from HCFWS)
 *   3. rain      — forecast precipitation at the address (next 6h, Open-Meteo)
 *
 * Pure function, deterministic, unit-testable. Thresholds are conservative:
 * this must never read calmer than the official picture. */

import type { Outlook, RainForecast } from './types';
import { classifyTrend } from './trend';

// Rain that meaningfully moves Houston bayous (inches over 6h).
const RAIN_WATCH_IN = 0.5;
const RAIN_WARNING_IN = 1.5;

export function buildOutlook(
  bufferFt: number,
  trendFtHr: number,
  rain: RainForecast | null,
): Outlook {
  const trend = classifyTrend(trendFtHr);
  const rain6 = rain?.totalNext6h ?? 0;
  // Naive linear projection of the gauge over 6 hours at the current rate.
  const projectedRise = trendFtHr * 6; // positive = level gain
  const projectedBuffer = bufferFt - Math.max(0, projectedRise);
  const base = { trend, trendFtHr, bufferFt, rain6 };

  // WARNING — projected to flood, or rising with little headroom, or heavy rain
  // on an already-tight gauge.
  if (
    projectedBuffer <= 0 ||
    (trend === 'rising' && bufferFt <= 3) ||
    (rain6 >= RAIN_WARNING_IN && bufferFt <= 5)
  ) {
    return { level: 'WARNING', kind: 'worsening', ...base };
  }

  // WATCH — rising anywhere, or enough incoming rain to matter.
  if (trend === 'rising' || rain6 >= RAIN_WATCH_IN) {
    return { level: 'WATCH', kind: trend === 'rising' ? 'rising' : 'rain', ...base };
  }

  // CLEAR — steady or falling, no meaningful rain.
  return { level: 'CLEAR', kind: trend === 'falling' ? 'receding' : 'steady', ...base };
}

/** Rain wording bucket shared by the outlook sentence. */
export function rainBucket(rain6: number): 'heavy' | 'light' | 'none' {
  if (rain6 >= RAIN_WATCH_IN) return 'heavy';
  if (rain6 > 0) return 'light';
  return 'none';
}
