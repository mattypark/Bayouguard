/* Point-in-Texas test against the state outline (used to keep the wind
 * particles inside the border). */

import { TEXAS_OUTLINE } from './geoDots';

export function inTexas(lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = TEXAS_OUTLINE.length - 1; i < TEXAS_OUTLINE.length; j = i++) {
    const [yi, xi] = TEXAS_OUTLINE[i];
    const [yj, xj] = TEXAS_OUTLINE[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
