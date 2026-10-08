'use client';

/* Variant B — Texas as a dot matrix.
 *
 * Where the globe puts Texas in context, this gives it the whole stage: the
 * state filled with an even grid of faint squares, every gauge at its true
 * position in solid ink, and a slow band of "rain" sweeping across from the
 * Gulf that lifts the grid as it passes. Same lens as the globe — magnify and
 * reveal each gauge's flood tier. */

import { useMemo, useRef } from 'react';
import { TEXAS_OUTLINE } from '@/lib/geoDots';
import { TIER_COLOR } from '@/lib/theme';
import type { LandingDot } from '@/lib/landing';
import { useDotCanvas } from './useDotCanvas';
import { hexToRgb, lens, mix, rgba, type RGB } from './lens';

const GRID_PX = 7;
const RAIN_PERIOD = 9_000; // ms for the band to cross the state
const RAIN_WIDTH = 0.22; // fraction of the diagonal
// Texas already fills the stage, so the lens only needs to tease the Houston
// cluster apart — the globe's 4× tears the state's outline.
const MAGNIFY = 0.9;

const TIER_RGB = Object.fromEntries(
  Object.entries(TIER_COLOR).map(([k, v]) => [k, hexToRgb(v)]),
) as Record<keyof typeof TIER_COLOR, RGB>;

const LATS = TEXAS_OUTLINE.map(([lat]) => lat);
const LNGS = TEXAS_OUTLINE.map(([, lng]) => lng);
const BOUNDS = {
  minLat: Math.min(...LATS),
  maxLat: Math.max(...LATS),
  minLng: Math.min(...LNGS),
  maxLng: Math.max(...LNGS),
};
// Equirectangular, squashed by cos(mid-latitude) so Texas has its real shape.
const LNG_SCALE = Math.cos((((BOUNDS.minLat + BOUNDS.maxLat) / 2) * Math.PI) / 180);
const SPAN_X = (BOUNDS.maxLng - BOUNDS.minLng) * LNG_SCALE;
const SPAN_Y = BOUNDS.maxLat - BOUNDS.minLat;

function inTexas(lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = TEXAS_OUTLINE.length - 1; i < TEXAS_OUTLINE.length; j = i++) {
    const [yi, xi] = TEXAS_OUTLINE[i];
    const [yj, xj] = TEXAS_OUTLINE[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export default function TexasField({ dots }: { dots: LandingDot[] }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // The grid depends on the stage size, so it is rebuilt only when that changes.
  const grid = useRef<{ w: number; h: number; pts: Array<[number, number]> }>({ w: 0, h: 0, pts: [] });

  const gauges = useMemo(
    () => [...dots].sort((a, b) => Number(a.tier !== null) - Number(b.tier !== null)),
    [dots],
  );

  useDotCanvas(host, canvas, ({ ctx, w, h, t, pointer, ink, accent }) => {
    const scale = Math.min((w * 0.92) / SPAN_X, (h * 0.92) / SPAN_Y);
    const ox = (w - SPAN_X * scale) / 2;
    const oy = (h - SPAN_Y * scale) / 2;
    const toX = (lng: number) => ox + (lng - BOUNDS.minLng) * LNG_SCALE * scale;
    const toY = (lat: number) => oy + (BOUNDS.maxLat - lat) * scale;

    if (grid.current.w !== w || grid.current.h !== h) {
      const pts: Array<[number, number]> = [];
      for (let y = oy; y < oy + SPAN_Y * scale; y += GRID_PX) {
        for (let x = ox; x < ox + SPAN_X * scale; x += GRID_PX) {
          const lat = BOUNDS.maxLat - (y - oy) / scale;
          const lng = BOUNDS.minLng + (x - ox) / (LNG_SCALE * scale);
          if (inTexas(lat, lng)) pts.push([x, y]);
        }
      }
      grid.current = { w, h, pts };
    }

    // The rain band travels from the Gulf (bottom right) to the panhandle.
    const diag = w + h;
    const front = ((t % RAIN_PERIOD) / RAIN_PERIOD) * (diag * (1 + RAIN_WIDTH * 2)) - diag * RAIN_WIDTH;

    for (const [x, y] of grid.current.pts) {
      const along = w - x + (h - y);
      const band = Math.max(0, 1 - Math.abs(along - front) / (diag * RAIN_WIDTH));
      const rain = t > 0 ? band * band : 0;
      const l = lens(x, y, pointer, MAGNIFY);
      const size = 2 + l.e * 1.4 + rain * 0.6;
      ctx.fillStyle = rgba(mix(ink, accent, Math.max(l.e * 0.6, rain * 0.55)), 0.13 + rain * 0.22 + l.e * 0.3);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }

    for (const g of gauges) {
      const l = lens(toX(g.lng), toY(g.lat), pointer, MAGNIFY);
      const lit = g.tier ? TIER_RGB[g.tier] : accent;
      const size = 2.4 + l.e * 3.2;
      ctx.fillStyle = rgba(mix(ink, lit, Math.min(1, l.e * 1.6)), 0.82);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }
  });

  return (
    <div ref={host} className="landing-canvas" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
