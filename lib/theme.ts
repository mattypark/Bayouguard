/* Shared design constants. The canvas renderer can't read Tailwind classes, so
 * the source of truth for tier + accent colors lives here and is mirrored into
 * tailwind.config.js / globals.css for the DOM side. */

import type { Tier } from './types';

// Paper-and-ink surface palette (light is the default theme).
export const OB = {
  bg: '#fbf6ef',
  bg2: '#f4ede2',
  surface: '#ffffff',
  surface2: '#faf6f0',
  border: '#e9e0d3',
  text: '#1b1814',
  muted: '#686056',
  faint: '#968c80',
  accent: '#1a5cff', // bayou blue — the searched address and anything clickable
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
    bg: '#0f0f11',
    edge: '#5c5850',
    edgeAccent: '#6894ff',
    labelBg: 'rgba(15,15,17,0.84)',
    labelText: '#f2eee6',
    ink: 'rgba(255,255,255,0.85)',
    boundary: 'rgba(104,148,255,0.45)',
    city: 'rgba(222,214,200,0.95)',
    cityRing: 'rgba(160,150,135,0.3)',
    ring: '#ffffff',
  },
  light: {
    bg: '#fbf6ef',
    edge: '#b9ad9c',
    edgeAccent: '#1a5cff',
    labelBg: 'rgba(255,255,255,0.94)',
    labelText: '#1b1814',
    ink: 'rgba(255,255,255,0.9)',
    boundary: 'rgba(26,92,255,0.45)',
    city: 'rgba(52,46,38,0.95)',
    cityRing: 'rgba(120,105,85,0.35)',
    ring: '#1b1814',
  },
};

// Tier colors. Deep enough to hold on cream paper, bright enough on near-black.
export const TIER_COLOR: Record<Tier, string> = {
  LOW: '#12a067', // green
  MEDIUM: '#e0930c', // amber
  HIGH: '#e4432d', // red
  CRITICAL: '#8b3fe0', // violet
};

// Soft tint behind tier text on any surface (rgba so it layers over panels).
export const TIER_TINT: Record<Tier, string> = {
  LOW: 'rgba(18, 160, 103, 0.12)',
  MEDIUM: 'rgba(224, 147, 12, 0.13)',
  HIGH: 'rgba(228, 67, 45, 0.12)',
  CRITICAL: 'rgba(139, 63, 224, 0.12)',
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
