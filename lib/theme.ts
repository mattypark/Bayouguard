/* Shared design constants. The canvas renderer can't read Tailwind classes, so
 * the source of truth for tier + accent colors lives here and is mirrored into
 * tailwind.config.js / globals.css for the DOM side. */

import type { Tier } from './types';

// Clear Sky surfaces, mirrored from globals.css for code that can't read CSS
// variables (Leaflet icons, canvas).
export const OB = {
  light: {
    bg: '#F0F5FF',
    bg2: '#E2ECFF',
    surface: '#FFFFFF',
    border: '#CDD8ED',
    text: '#1A1A2E',
    muted: '#4A6FA5',
    accent: '#1A4480',
    water: '#00939A',
  },
  dark: {
    bg: '#0B1426',
    bg2: '#0F1B33',
    surface: '#14213D',
    border: '#26385C',
    text: '#E8EEF8',
    muted: '#9DB2D6',
    accent: '#6FA3FF',
    water: '#3CC8CF',
  },
} as const;

export type Mode = 'dark' | 'light';

/* Basemap tiles, all keyless Esri. CARTO's free basemaps now stamp "API KEY
 * REQUIRED" over every tile. Base and labels are separate layers so the
 * gauges sit between them and street names stay on top. */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
export const BASEMAP = {
  light: {
    base: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
  dark: {
    base: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  },
  satellite: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
  attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
  satelliteAttribution: '&copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics',
} as const;

/* Canvas-only palette (the canvas can't read CSS variables). One entry per
 * theme: clear/background, edges, node label chips, geographic reference. */
export const PALETTE: Record<
  Mode,
  {
    bg: string; // canvas background (for text haloes)
    edge: string;
    edgeAccent: string;
    labelBg: string;
    labelText: string;
    ink: string; // node specular highlight
    boundary: string; // metro outline stroke
    city: string; // city label text
    cityRing: string; // city extent ring
    ring: string; // selection ring
  }
> = {
  dark: {
    bg: '#0B1426',
    edge: '#3A5180',
    edgeAccent: '#3CC8CF',
    labelBg: 'rgba(20,33,61,0.92)',
    labelText: '#E8EEF8',
    ink: 'rgba(255,255,255,0.85)',
    boundary: 'rgba(111,163,255,0.45)',
    city: 'rgba(200,214,238,0.95)',
    cityRing: 'rgba(157,178,214,0.3)',
    ring: '#E8EEF8',
  },
  light: {
    bg: '#F0F5FF',
    edge: '#A9BCDD',
    edgeAccent: '#00939A',
    labelBg: 'rgba(255,255,255,0.96)',
    labelText: '#1A1A2E',
    ink: 'rgba(255,255,255,0.9)',
    boundary: 'rgba(26,68,128,0.4)',
    city: 'rgba(26,26,46,0.9)',
    cityRing: 'rgba(74,111,165,0.3)',
    ring: '#1A1A2E',
  },
};

/* Tier colours, two ways. DOM styles use the CSS-variable strings, which
 * follow the theme on their own. Leaflet paths and canvas need real colours,
 * so they take TIER_HEX[mode]. The light set is deep enough to hold contrast
 * on white; dark keeps the luminous set. */
export const TIER_HEX: Record<Mode, Record<Tier, string>> = {
  light: { LOW: '#1B5E20', MEDIUM: '#E65100', HIGH: '#B71C1C', CRITICAL: '#4A148C' },
  dark: { LOW: '#34D399', MEDIUM: '#F5B14C', HIGH: '#FF5D5D', CRITICAL: '#C084FC' },
};

const TIER_VAR: Record<Tier, string> = { LOW: 'low', MEDIUM: 'med', HIGH: 'high', CRITICAL: 'crit' };

/** Fills: dots, bars, arcs. */
export const TIER_COLOR = Object.fromEntries(
  Object.entries(TIER_VAR).map(([t, v]) => [t, `rgb(var(--tier-${v}-rgb))`]),
) as Record<Tier, string>;
/** Text in a tier colour — passes 4.5:1 on surfaces and tints in both themes. */
export const TIER_INK = Object.fromEntries(
  Object.entries(TIER_VAR).map(([t, v]) => [t, `var(--tier-${v}-ink)`]),
) as Record<Tier, string>;
/** Soft background behind tier text. */
export const TIER_TINT = Object.fromEntries(
  Object.entries(TIER_VAR).map(([t, v]) => [t, `var(--tier-${v}-tint)`]),
) as Record<Tier, string>;

// Pulse cadence per tier (seconds per beat). Higher risk = faster heartbeat.
export const TIER_PULSE: Record<Tier, number> = {
  LOW: 0, // calm, no pulse
  MEDIUM: 3.2,
  HIGH: 1.8,
  CRITICAL: 1.0,
};

// Visual ordering for sorting / severity comparisons.
export const TIER_RANK: Record<Tier, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};
