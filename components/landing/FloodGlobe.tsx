'use client';

/* Variant A — every gauge in Texas, on one living globe.
 *
 * The YCGlobe reference rebuilt for water: a faint even shell of dots, the
 * continents a step darker, and every river and bayou gauge as solid ink. The
 * globe sways around Texas rather than spinning, so the data never turns away
 * from you; drag to turn it yourself. The lens magnifies and reveals each
 * gauge's flood tier (statewide gauges have no flood stage and light up in
 * the accent instead).
 *
 * Plain 2D canvas, orthographic, no WebGL: a few thousand squares a frame. */

import { useMemo, useRef } from 'react';
import { LAND_DOTS } from '@/lib/geoDots';
import { TIER_COLOR } from '@/lib/theme';
import type { LandingDot } from '@/lib/landing';
import { useDotCanvas } from './useDotCanvas';
import { hexToRgb, lens, mix, rgba, type RGB } from './lens';

const DEG = Math.PI / 180;
const SHELL_DOTS = 2600;
// Texas sits a little above centre with this tilt, leaving North America in view.
const CENTER_LNG = -98.5;
const TILT = 24 * DEG;
const SWAY = 50 * DEG; // each side of Texas
const SWAY_PERIOD = 70_000; // ms for one full sway
const DRAG_DEG_PER_PX = 0.35;

const TIER_RGB = Object.fromEntries(
  Object.entries(TIER_COLOR).map(([k, v]) => [k, hexToRgb(v)]),
) as Record<keyof typeof TIER_COLOR, RGB>;

/** Precomputed trig so a frame only pays for the rotation. */
interface Geo {
  lng: number;
  sinLat: number;
  cosLat: number;
}

function geo(lat: number, lng: number): Geo {
  return { lng: lng * DEG, sinLat: Math.sin(lat * DEG), cosLat: Math.cos(lat * DEG) };
}

function shell(): Geo[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: SHELL_DOTS }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / SHELL_DOTS;
    return geo(Math.asin(y) / DEG, ((i * golden) / DEG) % 360);
  });
}

export default function FloodGlobe({ dots }: { dots: LandingDot[] }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const layers = useMemo(() => {
    const land: Geo[] = [];
    for (let i = 0; i < LAND_DOTS.length; i += 2) land.push(geo(LAND_DOTS[i], LAND_DOTS[i + 1]));
    // Tiered gauges last, so Harris County draws over the statewide layer.
    const gauges = [...dots]
      .sort((a, b) => Number(a.tier !== null) - Number(b.tier !== null))
      .map((d) => ({ ...geo(d.lat, d.lng), tier: d.tier }));
    return { shell: shell(), land, gauges };
  }, [dots]);

  useDotCanvas(host, canvas, ({ ctx, w, h, t, pointer, drag, ink, accent }) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.46;

    const lng0 =
      CENTER_LNG * DEG + Math.sin((t / SWAY_PERIOD) * Math.PI * 2) * SWAY - drag.x * DRAG_DEG_PER_PX * DEG;
    const tilt = Math.max(-10 * DEG, Math.min(60 * DEG, TILT + drag.y * DRAG_DEG_PER_PX * DEG));
    const sinT = Math.sin(tilt);
    const cosT = Math.cos(tilt);

    // Orthographic projection about (lng0, tilt). Returns z < 0 for the far side.
    const project = (g: Geo) => {
      const d = g.lng - lng0;
      const cosD = Math.cos(d);
      return {
        x: cx + g.cosLat * Math.sin(d) * r,
        y: cy - (cosT * g.sinLat - sinT * g.cosLat * cosD) * r,
        z: sinT * g.sinLat + cosT * g.cosLat * cosD,
      };
    };

    // Shell: the faint even texture that makes the sphere read as a sphere.
    for (const g of layers.shell) {
      const p = project(g);
      if (p.z < 0) continue;
      const l = lens(p.x, p.y, pointer);
      const size = 1.6 + l.e * 1.2;
      ctx.fillStyle = rgba(mix(ink, accent, l.e * 0.6), 0.1 + p.z * 0.1 + l.e * 0.25);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }

    // Land: a step darker, fading toward the rim.
    for (const g of layers.land) {
      const p = project(g);
      if (p.z < 0) continue;
      const l = lens(p.x, p.y, pointer);
      const size = 2.2 + l.e * 1.4;
      ctx.fillStyle = rgba(mix(ink, accent, l.e * 0.45), 0.16 + p.z * 0.34 + l.e * 0.3);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }

    // Gauges: solid ink; the lens shows what each one is saying.
    for (const g of layers.gauges) {
      const p = project(g);
      if (p.z < 0.02) continue;
      const l = lens(p.x, p.y, pointer);
      const lit = g.tier ? TIER_RGB[g.tier] : accent;
      const size = 2.1 + l.e * 3.2;
      ctx.fillStyle = rgba(mix(ink, lit, Math.min(1, l.e * 1.6)), 0.55 + p.z * 0.4);
      ctx.fillRect(l.x - size / 2, l.y - size / 2, size, size);
    }
  });

  return (
    <div ref={host} className="landing-canvas" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
