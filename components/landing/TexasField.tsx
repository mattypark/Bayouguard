'use client';

/* The landing hero — Texas as a dot matrix.
 *
 * The state fills the stage with an even grid of faint squares, every gauge
 * sits at its true position in solid ink, and a slow band of "rain" sweeps in
 * from the Gulf, lifting the grid as it passes. On first paint the field
 * assembles outward from Houston. The lens magnifies and reveals each gauge's
 * flood tier; statewide gauges, which have no flood stage, light up in the
 * accent. (Picked over a dotted globe in the A/B, 2026-10-08.) */

import { useMemo, useRef } from 'react';
import {
  buildGrid,
  clamp01,
  easeOutCubic,
  fitTexas,
  gridStepFor,
  mix,
  project,
  rgba,
  TIER_RGB,
  type FieldDot,
} from '@/lib/dotField';
import { useDotCanvas } from './useDotCanvas';
import { lens } from './lens';

const RAIN_PERIOD = 9_000; // ms for the band to cross the state
const RAIN_WIDTH = 0.22; // fraction of the diagonal
// The assemble: each dot waits in proportion to its distance from Houston.
const HOUSTON = { lat: 29.76, lng: -95.37 };
const ASSEMBLE_MS_PER_PX = 1.5;
const ASSEMBLE_FADE_MS = 520;
const GAUGES_AFTER_MS = 260;

export default function TexasField({ dots, hidden = false }: { dots: FieldDot[]; hidden?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // The grid is in degrees, rebuilt only when the fitted scale changes.
  const grid = useRef<{ scale: number; pts: Float32Array }>({ scale: 0, pts: new Float32Array() });

  const gauges = useMemo(
    () => [...dots].sort((a, b) => Number(a.tier !== null) - Number(b.tier !== null)),
    [dots],
  );

  useDotCanvas(host, canvas, ({ ctx, w, h, t, reduced, pointer, ink, accent }) => {
    const cam = fitTexas(0, 0, w, h);
    if (Math.abs(grid.current.scale - cam.scale) > 0.01) {
      grid.current = { scale: cam.scale, pts: buildGrid(gridStepFor(cam.scale)) };
    }
    const [hx, hy] = project(cam, HOUSTON.lat, HOUSTON.lng);
    const appear = (x: number, y: number, after = 0) =>
      reduced ? 1 : easeOutCubic(clamp01((t - after - Math.hypot(x - hx, y - hy) * ASSEMBLE_MS_PER_PX) / ASSEMBLE_FADE_MS));

    // The rain band travels from the Gulf (bottom right) to the panhandle.
    const diag = w + h;
    const front = ((t % RAIN_PERIOD) / RAIN_PERIOD) * (diag * (1 + RAIN_WIDTH * 2)) - diag * RAIN_WIDTH;

    const pts = grid.current.pts;
    for (let i = 0; i < pts.length; i += 2) {
      const [x, y] = project(cam, pts[i], pts[i + 1]);
      const a = appear(x, y);
      if (a <= 0) continue;
      const along = w - x + (h - y);
      const band = Math.max(0, 1 - Math.abs(along - front) / (diag * RAIN_WIDTH));
      const rain = t > 0 ? band * band : 0;
      const l = lens(x, y, pointer);
      const size = (2 + l.e * 1.4 + rain * 0.6) * a;
      ctx.fillStyle = rgba(mix(ink, accent, Math.max(l.e * 0.6, rain * 0.55)), (0.13 + rain * 0.22 + l.e * 0.3) * a);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }

    for (const g of gauges) {
      const [x, y] = project(cam, g.lat, g.lng);
      const a = appear(x, y, GAUGES_AFTER_MS);
      if (a <= 0) continue;
      const l = lens(x, y, pointer);
      const lit = g.tier ? TIER_RGB[g.tier] : accent;
      // Overshoot a touch on arrival so each gauge lands with a little pop.
      const pop = a < 1 ? 1 + Math.sin(a * Math.PI) * 0.6 : 1;
      const size = (2.4 + l.e * 3.2) * a * pop;
      ctx.fillStyle = rgba(mix(ink, lit, Math.min(1, l.e * 1.6)), 0.82 * a);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }
  });

  return (
    <div
      ref={host}
      className="landing-canvas"
      aria-hidden="true"
      // Hidden, not unmounted, while the zoom overlay draws: the overlay starts
      // from this exact frame, so swapping must not shift the layout.
      style={hidden ? { visibility: 'hidden' } : undefined}
    >
      <canvas ref={canvas} />
    </div>
  );
}
