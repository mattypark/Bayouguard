/* Shared design constants. The canvas renderer can't read Tailwind classes, so
 * the source of truth for tier + accent colors lives here and is mirrored into
 * tailwind.config.js / globals.css for the DOM side. */

import type { Tier } from './types';

// Obsidian-dark surface palette.
export const OB = {
  bg: '#0a0c10',
  bg2: '#0e1117',
  surface: '#151922',
  surface2: '#1c212c',
  border: '#262d3a',
  text: '#e6edf3',
  muted: '#8b97a7',
  faint: '#5a6473',
  accent: '#4cc2ff', // water-cyan, used for the searched address + UI focus
} as const;

export type Mode = 'dark' | 'light';

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
    bg: '#0a0c10',
    edge: '#5a6473',
    edgeAccent: '#4cc2ff',
    labelBg: 'rgba(10,12,16,0.82)',
    labelText: '#e6edf3',
    ink: 'rgba(255,255,255,0.85)',
    boundary: 'rgba(76,194,255,0.45)',
    city: 'rgba(184,200,220,0.95)',
    cityRing: 'rgba(120,140,170,0.32)',
    ring: '#ffffff',
  },
  light: {
    bg: '#f0f3f9',
    edge: '#9aa7bd',
    edgeAccent: '#1482d2',
    labelBg: 'rgba(255,255,255,0.92)',
    labelText: '#1a2230',
    ink: 'rgba(255,255,255,0.9)',
    boundary: 'rgba(20,120,200,0.5)',
    city: 'rgba(36,50,72,0.95)',
    cityRing: 'rgba(60,90,130,0.4)',
    ring: '#1a2230',
  },
};

// Luminous tier colors tuned for a near-black canvas.
export const TIER_COLOR: Record<Tier, string> = {
  LOW: '#34d399', // emerald
  MEDIUM: '#f5b14c', // amber
  HIGH: '#ff5d5d', // red
  CRITICAL: '#c084fc', // violet
};

// Soft tint behind tier text on dark surfaces (rgba so it layers over panels).
export const TIER_TINT: Record<Tier, string> = {
  LOW: 'rgba(52, 211, 153, 0.12)',
  MEDIUM: 'rgba(245, 177, 76, 0.12)',
  HIGH: 'rgba(255, 93, 93, 0.12)',
  CRITICAL: 'rgba(192, 132, 252, 0.14)',
};

// Pulse cadence per tier (seconds per beat). Higher risk = faster heartbeat.
export const TIER_PULSE: Record<Tier, number> = {
  LOW: 0, // calm, no pulse
  MEDIUM: 3.2,
  HIGH: 1.8,
  CRITICAL: 1.0,
};

export const TIER_LABEL: Record<Tier, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Visual ordering for sorting / severity comparisons.
export const TIER_RANK: Record<Tier, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};
