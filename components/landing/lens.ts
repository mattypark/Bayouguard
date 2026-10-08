/* The lens shared by both landing canvases.
 *
 * Taken from the YCGlobe reference (vclense.ch/ycglobe), measured in
 * allaimodels/docs/DESIGN-REFS.md: inside a radius around the cursor each dot
 * lerps from ink toward a colour, gains alpha and gains a size step, weighted by
 * a smooth falloff — so it reads as liquid over moving points, not a spotlight.
 *
 * One change for this data: the lens also magnifies. Every Harris County gauge
 * sits inside a few pixels on a whole-Earth globe, so a lens that only
 * recoloured would light up a blob. A fisheye pushes the dots apart under the
 * cursor and the bayous become legible. */

export type RGB = readonly [number, number, number];

export const LENS_RADIUS = 170;
/** Fisheye strength: 3 means 4× magnification at the very centre. */
export const MAGNIFY_GLOBE = 3;

export interface Pointer {
  x: number;
  y: number;
  on: boolean;
}

export interface Lensed {
  x: number;
  y: number;
  /** 0 outside the lens, 1 at its centre — cubic falloff. */
  e: number;
}

/** Where a dot drawn at (sx, sy) lands under the lens, and how strongly it is lit. */
export function lens(
  sx: number,
  sy: number,
  p: Pointer,
  magnify = MAGNIFY_GLOBE,
  radius = LENS_RADIUS,
): Lensed {
  if (!p.on) return { x: sx, y: sy, e: 0 };
  const dx = sx - p.x;
  const dy = sy - p.y;
  const d = Math.hypot(dx, dy);
  if (d >= radius) return { x: sx, y: sy, e: 0 };

  const t = d / radius;
  // Sarkar–Brown fisheye: continuous at the rim, (magnify + 1)× at the centre.
  const tm = ((magnify + 1) * t) / (magnify * t + 1);
  const scale = t > 0.0001 ? tm / t : magnify + 1;
  const k = 1 - t;
  return { x: p.x + dx * scale, y: p.y + dy * scale, e: k * k * k };
}

export function mix(a: RGB, b: RGB, k: number): RGB {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function rgba(c: RGB, alpha: number): string {
  return `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${alpha.toFixed(3)})`;
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Ink and accent from the live theme — the canvas cannot read Tailwind classes. */
export function readThemeColours(host: HTMLElement): { ink: RGB; accent: RGB } {
  const styles = getComputedStyle(host);
  const ink = (styles.color.match(/\d+/g) ?? ['27', '24', '20']).slice(0, 3).map(Number);
  const accent = (styles.getPropertyValue('--ob-accent-rgb').trim() || '26 92 255')
    .split(/\s+/)
    .map(Number);
  return { ink: [ink[0], ink[1], ink[2]], accent: [accent[0], accent[1], accent[2]] };
}

/**
 * Sizes a canvas to its host at device pixel ratio. clientWidth, not a bounding
 * rect: the hero entrance scales the host, and a rect reports the transformed box.
 */
export function fitCanvas(host: HTMLElement, cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, host.clientWidth);
  const h = Math.max(1, host.clientHeight);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
