'use client';

/* The zoomed-in dot frame the landing ended on, held still (bar the target's
 * pulse) — /map's loading screen and the first frames of the map intro. If
 * there is no hand-off, it renders nothing and the caller falls back. */

import { useLayoutEffect, useRef } from 'react';
import {
  buildGrid,
  drawFrozenField,
  drawTargetPulse,
  gridStepFor,
  handoffCamera,
  scaleForZoom,
  sizeToViewport,
  themeColours,
  unpackDots,
  type Handoff,
} from '@/lib/dotField';

export default function FrozenField({ handoff, pulse = true }: { handoff: Handoff; pulse?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  // Layout effect: the first frame must be on screen before the browser paints,
  // or the hand-off from the previous screen blinks.
  useLayoutEffect(() => {
    const cv = canvas.current;
    const ctx = cv && sizeToViewport(cv);
    if (!cv || !ctx) return;
    const { ink, accent } = themeColours();
    const grid = buildGrid(gridStepFor(handoff.baseScale));
    const dots = unpackDots(handoff.dots);
    const ratio = scaleForZoom(handoff.zoom) / handoff.baseScale;
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const cam = handoffCamera(handoff, window.innerWidth, window.innerHeight);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      drawFrozenField(ctx, cam, grid, dots, ink, ratio);
      if (pulse) drawTargetPulse(ctx, cam.cx, cam.cy, now - start + 1700, accent, 1);
      raf = requestAnimationFrame(frame);
    };
    frame(start);
    return () => cancelAnimationFrame(raf);
  }, [handoff, pulse]);

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0" aria-hidden="true" />;
}
