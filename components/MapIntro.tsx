'use client';

/* The last leg of the way in: the dots become the map.
 *
 * Starts on the exact frame the landing zoom ended on (and /map's loading
 * screen held). Once the real map is laid out with tiles under it, every gauge
 * dot slides from its dot-field position to its true map position, takes its
 * tier colour, and rounds and grows into the marker the map draws there; the
 * grid thins out and the paper fades, uncovering the tiles. Then the overlay
 * steps aside and the real markers are underneath, in the same places. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import {
  buildGrid,
  clamp01,
  drawFrozenField,
  drawTargetPulse,
  dotGrowth,
  easeInOutCubic,
  gridStepFor,
  handoffCamera,
  hexToRgb,
  mix,
  project,
  rgba,
  scaleForZoom,
  sizeToViewport,
  themeColours,
  TIER_RGB,
  unpackDots,
  type Handoff,
} from '@/lib/dotField';
import type { Mode } from '@/lib/theme';

const MORPH_MS = 1100;
const FADE_OUT_MS = 220;

// Must match FloodMap's markers so the swap is invisible.
const GAUGE_RADIUS = 6;
const USGS_RADIUS = 3;
const USGS_COLOR: Record<Mode, string> = { light: '#8c8274', dark: '#9a9286' };
const KEYLINE: Record<Mode, string> = { light: '#ffffff', dark: '#0f0f11' };

export default function MapIntro({
  handoff,
  map,
  mode,
  onDone,
}: {
  handoff: Handoff;
  /** The live map once it has tiles; null while it's still loading. */
  map: L.Map | null;
  mode: Mode;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef(map);
  mapRef.current = map;
  const done = useRef(onDone);
  done.current = onDone;
  const [fading, setFading] = useState(false);

  useLayoutEffect(() => {
    const cv = canvas.current;
    const ctx = cv && sizeToViewport(cv);
    if (!cv || !ctx) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      done.current();
      return;
    }

    const { ink, accent, bg } = themeColours();
    const grid = buildGrid(gridStepFor(handoff.baseScale));
    const dots = unpackDots(handoff.dots);
    const ratio = scaleForZoom(handoff.zoom) / handoff.baseScale;
    const grow = dotGrowth(ratio);
    const usgs = hexToRgb(USGS_COLOR[mode]);
    const keyline = KEYLINE[mode];
    const start = performance.now();
    let morphStart = 0;
    let raf = 0;
    let finished = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cam = handoffCamera(handoff, w, h);
      const live = mapRef.current;
      if (live && !morphStart) morphStart = now;

      ctx.clearRect(0, 0, w, h);

      // Holding: the frozen frame on paper, the target still pulsing.
      if (!morphStart) {
        ctx.fillStyle = rgba(bg, 1);
        ctx.fillRect(0, 0, w, h);
        drawFrozenField(ctx, cam, grid, dots, ink, ratio);
        drawTargetPulse(ctx, cam.cx, cam.cy, now - start + 1700, accent, 1);
        return;
      }

      const k = easeInOutCubic(clamp01((now - morphStart) / MORPH_MS));

      ctx.fillStyle = rgba(bg, 1 - k);
      ctx.fillRect(0, 0, w, h);

      // The grid thins out and shrinks away.
      const gs = 2 * grow * (1 - k * 0.6);
      ctx.fillStyle = rgba(ink, 0.13 * (1 - k));
      for (let i = 0; i < grid.length; i += 2) {
        const [x, y] = project(cam, grid[i], grid[i + 1]);
        if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
        ctx.fillRect(x - gs / 2, y - gs / 2, gs, gs);
      }

      drawTargetPulse(ctx, cam.cx, cam.cy, now - start + 1700, accent, 1 - k);

      // Gauges: square ink dots become round, tier-coloured markers, at the
      // map's own pixel positions.
      const ds = 2.4 * grow;
      for (const d of dots) {
        const [x0, y0] = project(cam, d.lat, d.lng);
        const p1 = live!.latLngToContainerPoint([d.lat, d.lng]);
        if ((x0 < -20 || y0 < -20 || x0 > w + 20 || y0 > h + 20) && (p1.x < -20 || p1.y < -20 || p1.x > w + 20 || p1.y > h + 20)) {
          continue;
        }
        const x = x0 + (p1.x - x0) * k;
        const y = y0 + (p1.y - y0) * k;
        const r1 = d.tier ? GAUGE_RADIUS : USGS_RADIUS;
        const size = ds + (r1 * 2 - ds) * k;
        const colour = mix(ink, d.tier ? TIER_RGB[d.tier] : usgs, k);
        ctx.beginPath();
        ctx.roundRect(x - size / 2, y - size / 2, size, size, (size / 2) * k);
        ctx.fillStyle = rgba(colour, d.tier ? 0.82 + 0.08 * k : 0.82 - 0.27 * k);
        ctx.fill();
        if (d.tier && k > 0.5) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = keyline;
          ctx.globalAlpha = (k - 0.5) * 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      if (k >= 1 && !finished) {
        finished = true;
        setFading(true);
        window.setTimeout(() => done.current(), FADE_OUT_MS);
      }
    };
    // Draw synchronously so the first frame lands before the browser paints;
    // frame() schedules the rest.
    frame(start);
    return () => cancelAnimationFrame(raf);
  }, [handoff, mode]);

  // A resize mid-intro would leave the canvas the wrong size; just finish.
  useEffect(() => {
    const onResize = () => done.current();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] transition-opacity ease-out"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${FADE_OUT_MS}ms` }}
    />
  );
}
