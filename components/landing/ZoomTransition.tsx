'use client';

/* The way in. When you press Enter the map (or check an address), the dot
 * field leaves its stage and flies into one place in Texas: the camera stays
 * pinned to the target while the target glides to the middle of the screen
 * and the scale grows to exactly the zoom the map will open at. The last
 * frame is the frozen frame /map's loading screen and intro start from. */

import { useEffect, useRef } from 'react';
import {
  buildGrid,
  clamp01,
  drawFrozenField,
  drawTargetPulse,
  easeInOutCubic,
  gridStepFor,
  project,
  scaleForZoom,
  sizeToViewport,
  themeColours,
  type Camera,
  type FieldDot,
} from '@/lib/dotField';

const DURATION_MS = 1700;

export default function ZoomTransition({
  from,
  target,
  zoom,
  dots,
  onDone,
}: {
  /** The landing's camera, in viewport px. */
  from: Camera;
  target: { lat: number; lng: number };
  zoom: number;
  dots: FieldDot[];
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv && sizeToViewport(cv);
    if (!cv || !ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done.current();
      return;
    }

    const { ink, accent } = themeColours();
    const grid = buildGrid(gridStepFor(from.scale));
    const s0 = from.scale;
    const s1 = scaleForZoom(zoom);
    const [x0, y0] = project(from, target.lat, target.lng);
    const x1 = window.innerWidth / 2;
    const y1 = window.innerHeight / 2;

    let raf = 0;
    let finished = false;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = now - start;
      const k = easeInOutCubic(clamp01(elapsed / DURATION_MS));
      // Pinned to the target: it glides to centre while the scale grows
      // geometrically, so every doubling of zoom takes the same time.
      const cam: Camera = {
        lat: target.lat,
        lng: target.lng,
        scale: s0 * (s1 / s0) ** k,
        cx: x0 + (x1 - x0) * k,
        cy: y0 + (y1 - y0) * k,
      };
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      drawFrozenField(ctx, cam, grid, dots, ink, cam.scale / s0);
      drawTargetPulse(ctx, cam.cx, cam.cy, elapsed, accent, clamp01((k - 0.55) / 0.3));

      if (elapsed >= DURATION_MS) {
        if (!finished) {
          finished = true;
          done.current();
        }
        // Keep the pulse alive until the route swaps this page out.
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [from, target, zoom, dots]);

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[100]" aria-hidden="true" />;
}
