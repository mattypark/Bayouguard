'use client';

/* Animated wind-flow particle layer for the Leaflet map.
 *
 * Draws a full-viewport canvas over the tile panes (below the chrome) and
 * advects a few hundred particles along the bilinear-interpolated wind field
 * from /api/wind. Trails show direction of travel — where the weather is
 * HEADING (the field already converts meteorological "from" to "toward").
 * Particles live in lat/lng space so pan/zoom stays correct; the canvas is
 * cleared on map movement and repopulates immediately. */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { inTexas } from '@/lib/dotField';
import type { WindField } from '@/lib/wind';

const PARTICLE_COUNT = 550;
const MAX_AGE = 140; // frames before a particle respawns
const SPEED = 0.0025; // degrees per frame per (m/s) at REF_ZOOM — tuned visually
// Speed is in degrees, so a fixed value streaks across the whole screen once
// you zoom in. Scaling it by zoom keeps every trail the same length in pixels.
const REF_ZOOM = 7;
const SPAWN_TRIES = 8;
const TRAIL_FADE = 0.93; // per-frame alpha multiplier on existing trails

interface Particle {
  lat: number;
  lng: number;
  age: number;
}

function bilinear(field: WindField, lat: number, lng: number): [number, number] {
  const { lats, lngs, u, v } = field;
  if (lat < lats[0] || lat > lats[lats.length - 1]) return [0, 0];
  if (lng < lngs[0] || lng > lngs[lngs.length - 1]) return [0, 0];

  let i = 0;
  while (i < lats.length - 2 && lats[i + 1] < lat) i++;
  let j = 0;
  while (j < lngs.length - 2 && lngs[j + 1] < lng) j++;

  const ty = (lat - lats[i]) / (lats[i + 1] - lats[i]);
  const tx = (lng - lngs[j]) / (lngs[j + 1] - lngs[j]);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return [
    lerp(lerp(u[i][j], u[i][j + 1], tx), lerp(u[i + 1][j], u[i + 1][j + 1], tx), ty),
    lerp(lerp(v[i][j], v[i][j + 1], tx), lerp(v[i + 1][j], v[i + 1][j + 1], tx), ty),
  ];
}

export default function WindLayer({ color }: { color: string }) {
  const map = useMap();
  const fieldRef = useRef<WindField | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const container = map.getContainer();
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:450;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      container.removeChild(canvas);
      return;
    }

    let raf = 0;
    let stopped = false;
    const particles: Particle[] = [];

    // Wind only blows over Texas — the rest of the map is masked paper.
    const spawn = (): Particle => {
      const b = map.getBounds().pad(0.05);
      let lat = 0;
      let lng = 0;
      for (let i = 0; i < SPAWN_TRIES; i++) {
        lat = b.getSouth() + Math.random() * (b.getNorth() - b.getSouth());
        lng = b.getWest() + Math.random() * (b.getEast() - b.getWest());
        if (inTexas(lat, lng)) break;
      }
      return { lat, lng, age: Math.floor(Math.random() * MAX_AGE) };
    };

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    const reset = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.length = 0;
    };
    resize();

    fetch('/api/wind')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WindField | null) => {
        fieldRef.current = data;
      })
      .catch(() => {
        fieldRef.current = null;
      });

    const frame = () => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);
      const field = fieldRef.current;
      if (!field) return;

      while (particles.length < PARTICLE_COUNT) particles.push(spawn());

      // Fade previous trails instead of clearing — this is what draws the
      // streaks. destination-in keeps the canvas transparent over the map.
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.4;

      const bounds = map.getBounds().pad(0.08);
      const step = SPEED * 2 ** (REF_ZOOM - map.getZoom());
      for (let k = 0; k < particles.length; k++) {
        const p = particles[k];
        const [uu, vv] = bilinear(field, p.lat, p.lng);
        const speed = Math.hypot(uu, vv);
        p.age++;
        if (
          p.age > MAX_AGE ||
          speed < 0.05 ||
          !bounds.contains([p.lat, p.lng]) ||
          !inTexas(p.lat, p.lng)
        ) {
          particles[k] = spawn();
          continue;
        }

        const from = map.latLngToContainerPoint([p.lat, p.lng]);
        p.lat += vv * step;
        p.lng += (uu * step) / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180));
        const to = map.latLngToContainerPoint([p.lat, p.lng]);

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    map.on('move zoom', reset);
    map.on('resize', resize);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      map.off('move zoom', reset);
      map.off('resize', resize);
      container.removeChild(canvas);
    };
  }, [map, color]);

  return null;
}
