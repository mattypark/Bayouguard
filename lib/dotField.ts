/* The Texas dot field — one renderer for every place the dots appear: the
 * landing hero, the zoom when you enter, the frozen frame while /map loads,
 * and the intro that melts the dots into the real map.
 *
 * Geometry is a camera over a squashed equirectangular projection (longitude
 * scaled by cos of Texas's mid-latitude, so the state has its real shape).
 * The grid lives in degrees, not pixels, so zooming the camera spreads the
 * dots apart instead of re-tiling them — that is what makes the zoom read as
 * flying into the field. */

import { TEXAS_OUTLINE } from './geoDots';
import { TIER_COLOR } from './theme';
import type { Tier } from './types';

export type RGB = readonly [number, number, number];

const LATS = TEXAS_OUTLINE.map(([lat]) => lat);
const LNGS = TEXAS_OUTLINE.map(([, lng]) => lng);
export const TX_BOUNDS = {
  minLat: Math.min(...LATS),
  maxLat: Math.max(...LATS),
  minLng: Math.min(...LNGS),
  maxLng: Math.max(...LNGS),
};
export const TX_CENTER = {
  lat: (TX_BOUNDS.minLat + TX_BOUNDS.maxLat) / 2,
  lng: (TX_BOUNDS.minLng + TX_BOUNDS.maxLng) / 2,
};
export const LNG_SCALE = Math.cos((TX_CENTER.lat * Math.PI) / 180);

/** Grid pitch in screen px at the landing's fitted scale. */
export const GRID_PX = 7;

export function inTexas(lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = TEXAS_OUTLINE.length - 1; i < TEXAS_OUTLINE.length; j = i++) {
    const [yi, xi] = TEXAS_OUTLINE[i];
    const [yj, xj] = TEXAS_OUTLINE[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** (lat, lng) is drawn at (cx, cy); `scale` is px per degree of latitude. */
export interface Camera {
  lat: number;
  lng: number;
  scale: number;
  cx: number;
  cy: number;
}

export function project(cam: Camera, lat: number, lng: number): [number, number] {
  return [cam.cx + (lng - cam.lng) * LNG_SCALE * cam.scale, cam.cy - (lat - cam.lat) * cam.scale];
}

/** Texas fitted into a box (in page px), as on the landing. */
export function fitTexas(left: number, top: number, w: number, h: number, fill = 0.92): Camera {
  const spanX = (TX_BOUNDS.maxLng - TX_BOUNDS.minLng) * LNG_SCALE;
  const spanY = TX_BOUNDS.maxLat - TX_BOUNDS.minLat;
  return {
    ...TX_CENTER,
    scale: Math.min((w * fill) / spanX, (h * fill) / spanY),
    cx: left + w / 2,
    cy: top + h / 2,
  };
}

/** The camera scale that matches Leaflet at a zoom level (Web Mercator, 256px tiles). */
export function scaleForZoom(zoom: number): number {
  return (256 * 2 ** zoom) / (360 * LNG_SCALE);
}

export interface GridStep {
  lat: number;
  lng: number;
}

/** Grid pitch, in degrees, that lands GRID_PX apart at this scale. */
export function gridStepFor(scale: number): GridStep {
  return { lat: GRID_PX / scale, lng: GRID_PX / (LNG_SCALE * scale) };
}

/** Grid points inside Texas, flattened [lat, lng, …], aligned to the state's NW corner. */
export function buildGrid(step: GridStep): Float32Array {
  const out: number[] = [];
  for (let lat = TX_BOUNDS.maxLat; lat > TX_BOUNDS.minLat; lat -= step.lat) {
    for (let lng = TX_BOUNDS.minLng; lng < TX_BOUNDS.maxLng; lng += step.lng) {
      if (inTexas(lat, lng)) out.push(lat, lng);
    }
  }
  return Float32Array.from(out);
}

/** A gauge as the field draws it. */
export interface FieldDot {
  lat: number;
  lng: number;
  tier: Tier | null;
}

export const TIER_RGB = Object.fromEntries(
  Object.entries(TIER_COLOR).map(([k, v]) => [k, hexToRgb(v)]),
) as Record<Tier, RGB>;

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, k: number): RGB {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function rgba(c: RGB, alpha: number): string {
  return `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/**
 * The one way the frozen frame is drawn, shared by the end of the landing zoom,
 * /map's loading screen and the start of the map intro — so the three line up
 * pixel for pixel and the hand-offs are invisible.
 */
export function drawFrozenField(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  grid: Float32Array,
  dots: FieldDot[],
  ink: RGB,
  zoomRatio: number,
) {
  const grow = dotGrowth(zoomRatio);
  const gs = 2 * grow;
  ctx.fillStyle = rgba(ink, 0.13);
  for (let i = 0; i < grid.length; i += 2) {
    const [x, y] = project(cam, grid[i], grid[i + 1]);
    ctx.fillRect(x - gs / 2, y - gs / 2, gs, gs);
  }
  const ds = 2.4 * grow;
  ctx.fillStyle = rgba(ink, 0.82);
  for (const d of dots) {
    const [x, y] = project(cam, d.lat, d.lng);
    ctx.fillRect(x - ds / 2, y - ds / 2, ds, ds);
  }
}

/** Dots grow a little as the camera zooms, so they stay dots and not specks. */
export function dotGrowth(zoomRatio: number): number {
  return Math.min(2.6, Math.max(1, zoomRatio ** 0.28));
}

/* ── Landing → map hand-off ─────────────────────────────────────────────── */

export const HANDOFF_KEY = 'bayouguard_handoff';
const HANDOFF_TTL_MS = 20_000;

export interface Handoff {
  at: number;
  lat: number;
  lng: number;
  zoom: number;
  /** The landing's fitted scale, so the field keeps its pitch and dot size. */
  baseScale: number;
  dots: Array<[number, number, number]>; // lat, lng, tier index (-1 = none)
}

const TIERS: Tier[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function packDots(dots: FieldDot[]): Handoff['dots'] {
  return dots.map((d) => [+d.lat.toFixed(4), +d.lng.toFixed(4), d.tier ? TIERS.indexOf(d.tier) : -1]);
}

export function unpackDots(dots: Handoff['dots']): FieldDot[] {
  return dots.map(([lat, lng, t]) => ({ lat, lng, tier: t >= 0 ? TIERS[t] : null }));
}

export function writeHandoff(h: Omit<Handoff, 'at'>) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ ...h, at: Date.now() }));
  } catch {
    // Storage blocked: /map simply opens without the intro.
  }
}

/** The hand-off if one was written in the last few seconds. `consume` clears it. */
export function readHandoff(consume: boolean): Handoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    if (consume) sessionStorage.removeItem(HANDOFF_KEY);
    const h = JSON.parse(raw) as Handoff;
    const valid =
      Date.now() - h.at < HANDOFF_TTL_MS &&
      Number.isFinite(h.lat) &&
      Number.isFinite(h.lng) &&
      Number.isFinite(h.zoom) &&
      Number.isFinite(h.baseScale) &&
      Array.isArray(h.dots);
    return valid ? h : null;
  } catch {
    return null;
  }
}

/** The camera for the frozen frame: target at the viewport centre, at the map's zoom. */
export function handoffCamera(h: Handoff, w: number, h2: number): Camera {
  return { lat: h.lat, lng: h.lng, scale: scaleForZoom(h.zoom), cx: w / 2, cy: h2 / 2 };
}

/** The "here" marker on the target while the field zooms and the map loads: two rings rippling out. */
export function drawTargetPulse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  accent: RGB,
  strength: number,
) {
  if (strength <= 0) return;
  const PERIOD = 1400;
  for (let i = 0; i < 2; i++) {
    const k = ((t + i * (PERIOD / 2)) % PERIOD) / PERIOD;
    ctx.beginPath();
    ctx.arc(x, y, 8 + k * 34, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(accent, (1 - k) * 0.55 * strength);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = rgba(accent, strength);
  ctx.fill();
}

/** Ink and accent straight from the theme tokens, for canvases outside a component tree. */
export function themeColours(): { ink: RGB; accent: RGB; bg: RGB } {
  const s = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string): RGB => {
    const [r, g, b] = (s.getPropertyValue(name).trim() || fallback).split(/\s+/).map(Number);
    return [r, g, b];
  };
  return {
    ink: read('--ob-text-rgb', '27 24 20'),
    accent: read('--ob-accent-rgb', '26 92 255'),
    bg: read('--ob-bg-rgb', '251 246 239'),
  };
}

/** A full-viewport canvas sized at device pixel ratio. */
export function sizeToViewport(cv: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
