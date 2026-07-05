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
import { classifyTrend } from './hcfws';

// Rain that meaningfully moves Houston bayous (inches over 6h).
const RAIN_WATCH_IN = 0.5;
const RAIN_WARNING_IN = 1.5;

export function buildOutlook(
  bufferFt: number,
  trendFtHr: number,
  rain: RainForecast | null,
): Outlook {
  const trendState = classifyTrend(trendFtHr);
  const rain6 = rain?.totalNext6h ?? 0;
  // Naive linear projection of the gauge over 6 hours at the current rate.
  const projectedDrop = trendFtHr * 6; // positive = level gain
  const projectedBuffer = bufferFt - Math.max(0, projectedDrop);

  const rainNote =
    rain6 >= RAIN_WATCH_IN
      ? ` ${rain6.toFixed(2)}" of rain expected in the next 6 hours.`
      : rain6 > 0
        ? ` Light rain (${rain6.toFixed(2)}") possible.`
        : ' No significant rain in the forecast.';

  // WARNING — projected to flood, or rising with little headroom, or heavy rain
  // on an already-tight gauge.
  if (
    projectedBuffer <= 0 ||
    (trendState === 'rising' && bufferFt <= 3) ||
    (rain6 >= RAIN_WARNING_IN && bufferFt <= 5)
  ) {
    return {
      level: 'WARNING',
      headline: 'Conditions worsening',
      detail:
        `Nearest gauge is ${trendState === 'rising' ? `rising ${trendFtHr.toFixed(2)} ft/hr with` : 'holding'} ` +
        `${bufferFt.toFixed(1)} ft of headroom.${rainNote} Follow official guidance.`,
    };
  }

  // WATCH — rising anywhere, or enough incoming rain to matter.
  if (trendState === 'rising' || rain6 >= RAIN_WATCH_IN) {
    return {
      level: 'WATCH',
      headline:
        trendState === 'rising' ? 'Water rising — stay aware' : 'Rain incoming — stay aware',
      detail:
        trendState === 'rising'
          ? `Nearest gauge is rising ${trendFtHr.toFixed(2)} ft/hr with ${bufferFt.toFixed(1)} ft of headroom.${rainNote}`
          : `Levels are steady with ${bufferFt.toFixed(1)} ft of headroom.${rainNote}`,
    };
  }

  // CLEAR — steady or falling, no meaningful rain.
  return {
    level: 'CLEAR',
    headline:
      trendState === 'falling' ? 'Water receding' : 'Holding steady',
    detail:
      `Nearest gauge is ${
        trendState === 'falling'
          ? `falling ${Math.abs(trendFtHr).toFixed(2)} ft/hr`
          : 'steady'
      } with ${bufferFt.toFixed(1)} ft of headroom.${rainNote}`,
  };
}
