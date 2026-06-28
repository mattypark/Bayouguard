'use client';

/* The watershed graph: a force-directed, Obsidian-style node network of every
 * flood gauge in the Harris County system, rendered on a single canvas.
 *
 *   • nodes  = gauges, coloured + sized by how close they are to flooding
 *   • edges  = k-nearest-neighbour links (the derived "bayou network")
 *   • the searched address joins as a cyan node wired to its nearest gauge
 *   • a faint regional outline + city labels give the cloud a sense of place
 *
 * Pan with drag, zoom with the wheel, click a node to inspect it. The layout is
 * seeded from real geography, so the network keeps the shape of Houston. */

import { useEffect, useRef } from 'react';
import { buildGraph, ForceSim, projectGeo, type Graph } from '@/lib/graph';
import { TIER_COLOR, TIER_PULSE, PALETTE, type Mode } from '@/lib/theme';
import { HOUSTON_CITIES, HOUSTON_OUTLINE } from '@/lib/geoFeatures';
import type { GaugePoint } from '@/lib/types';

export interface GraphSelection {
  id: string;
  kind: 'gauge' | 'address';
  gauge?: GaugePoint;
}

interface Props {
  gauges: GaugePoint[];
  center: { lat: number; lng: number } | null;
  address?: string;
  mode: Mode;
  active: boolean; // false when another view (e.g. the map) is on top
  selectedId: string | null;
  onSelect: (sel: GraphSelection | null) => void;
}

interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface WorldPoint {
  x: number;
  y: number;
}

const MAX_DPR = 2;
const MIN_SCALE = 0.12;
const MAX_SCALE = 6;

// Pre-rendered soft radial glow sprite, cached per colour.
function makeGlow(color: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grd.addColorStop(0, color);
  grd.addColorStop(0.4, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

export default function WatershedGraph({
  gauges,
  center,
  address,
  mode,
  active,
  selectedId,
  onSelect,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable engine state held in refs so the rAF loop never re-subscribes.
  const graphRef = useRef<Graph>({ nodes: [], edges: [], addressIndex: null, proj: null });
  const simRef = useRef<ForceSim | null>(null);
  const camRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const glowCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const hoverRef = useRef<number | null>(null);
  const selectedRef = useRef<string | null>(selectedId);
  const userMovedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const modeRef = useRef<Mode>(mode);
  const reducedRef = useRef(false);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  // Projected geographic overlays (world space), recomputed on rebuild.
  const cityRef = useRef<Array<WorldPoint & { name: string }>>([]);
  const outlineRef = useRef<WorldPoint[]>([]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    modeRef.current = mode;
    // Evict glow sprites so theme-specific colours (e.g. the accent node) refresh.
    glowCache.current.clear();
  }, [mode]);

  const glowFor = (color: string): HTMLCanvasElement => {
    let g = glowCache.current.get(color);
    if (!g) {
      g = makeGlow(color, 64);
      glowCache.current.set(color, g);
    }
    return g;
  };

  // Fit the camera over the *stable* anchor positions + geographic overlays, so
  // the framing doesn't chase the settling simulation.
  const fitCamera = () => {
    const { nodes } = graphRef.current;
    const { w, h } = sizeRef.current;
    if (nodes.length === 0 || w === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const include = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const n of nodes) include(n.ax, n.ay);
    for (const p of outlineRef.current) include(p.x, p.y);

    const pad = 64;
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const scale = Math.min((w - pad) / bw, (h - pad) / bh);
    camRef.current = {
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)),
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
  };

  // (Re)build the graph + projected overlays whenever the data changes.
  useEffect(() => {
    const graph = buildGraph(gauges, center, address);
    graphRef.current = graph;
    simRef.current = new ForceSim(graph);
    simRef.current.reheat(1);
    userMovedRef.current = false;

    if (graph.proj) {
      cityRef.current = HOUSTON_CITIES.map((c) => ({
        name: c.name,
        ...projectGeo(graph.proj!, c.lat, c.lng),
      }));
      outlineRef.current = HOUSTON_OUTLINE.map(([lat, lng]) =>
        projectGeo(graph.proj!, lat, lng),
      );
    } else {
      cityRef.current = [];
      outlineRef.current = [];
    }

    for (let i = 0; i < 60; i++) simRef.current.step();
    fitCamera();
  }, [gauges, center, address]);

  // Canvas setup + render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const rect = wrap.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!userMovedRef.current) fitCamera();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const worldToScreen = (wx: number, wy: number) => {
      const { w, h } = sizeRef.current;
      const cam = camRef.current;
      return {
        x: (wx - cam.x) * cam.scale + w / 2,
        y: (wy - cam.y) * cam.scale + h / 2,
      };
    };

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mql.matches;
    const onMQ = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
    };
    mql.addEventListener('change', onMQ);

    const render = (t: number) => {
      // Skip all work while hidden behind another view — keeps the loop alive
      // (cheap) but off the CPU/GPU.
      if (!activeRef.current) {
        raf = requestAnimationFrame(render);
        return;
      }
      const sim = simRef.current;
      const { w, h } = sizeRef.current;
      const cam = camRef.current;
      const pal = PALETTE[modeRef.current];
      const reduced = reducedRef.current;
      // Stop integrating once the layout has cooled; pulses still animate. This
      // keeps the O(n^2) force step off the CPU when nothing is moving.
      if (sim && sim.alpha > 0.05) sim.step();
      const { nodes, edges } = graphRef.current;

      ctx.clearRect(0, 0, w, h);

      // ── regional outline ─────────────────────────────────────────────────
      const outline = outlineRef.current;
      if (outline.length > 2) {
        ctx.beginPath();
        for (let i = 0; i < outline.length; i++) {
          const p = worldToScreen(outline[i].x, outline[i].y);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = pal.boundary;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── edges ──────────────────────────────────────────────────────────
      const sel = selectedRef.current;
      const hover = hoverRef.current;
      ctx.lineCap = 'round';
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const pa = worldToScreen(a.x, a.y);
        const pb = worldToScreen(b.x, b.y);
        const touchesSel = sel != null && (a.id === sel || b.id === sel);
        const touchesHover = hover != null && (e.a === hover || e.b === hover);
        const hot = touchesSel || touchesHover;
        const col =
          a.kind === 'address' || b.kind === 'address' ? pal.edgeAccent : pal.edge;
        ctx.strokeStyle = col;
        ctx.globalAlpha = hot ? 0.24 : 0.07;
        ctx.lineWidth = hot ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.globalAlpha = hot ? 0.85 : 0.3;
        ctx.lineWidth = hot ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── nodes ──────────────────────────────────────────────────────────
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const p = worldToScreen(node.x, node.y);
        const isAddr = node.kind === 'address';
        const color = isAddr ? pal.edgeAccent : TIER_COLOR[node.tier];
        const isSel = sel === node.id;
        const isHover = hover === i;

        const period = isAddr ? 2.4 : TIER_PULSE[node.tier];
        let pulse = 0;
        if (!reduced && period > 0) {
          const phase = (i * 0.7) % (Math.PI * 2);
          pulse = (Math.sin((t / 1000) * ((Math.PI * 2) / period) + phase) + 1) / 2;
        }

        const baseR = node.r * cam.scale;
        const r = Math.max(2, baseR + pulse * baseR * 0.35);

        const glow = glowFor(color);
        const glowR = r * (isAddr ? 7 : 5) * (1 + pulse * 0.25);
        ctx.globalAlpha = (isAddr ? 0.5 : 0.32) + pulse * 0.18 + (isSel ? 0.2 : 0);
        ctx.drawImage(glow, p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = pal.ink;
        ctx.globalAlpha = 0.5;
        ctx.arc(p.x - r * 0.25, p.y - r * 0.25, r * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (isSel || isHover) {
          ctx.beginPath();
          ctx.strokeStyle = isSel ? pal.ring : color;
          ctx.lineWidth = isSel ? 2 : 1.5;
          ctx.globalAlpha = isSel ? 0.95 : 0.7;
          ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        if (isAddr || isSel || isHover) {
          const text = node.label;
          ctx.font = '600 12px var(--font-jbmono), ui-monospace, monospace';
          const tw = ctx.measureText(text).width;
          const lx = p.x + r + 8;
          const ly = p.y;
          ctx.fillStyle = pal.labelBg;
          const padX = 6;
          const lh = 18;
          roundRect(ctx, lx - padX, ly - lh / 2, tw + padX * 2, lh, 5);
          ctx.fill();
          ctx.fillStyle = pal.labelText;
          ctx.textBaseline = 'middle';
          ctx.fillText(text, lx, ly + 1);
        }
      }

      // ── city overlays (on top of the network, with text haloes) ──────────
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const c of cityRef.current) {
        const p = worldToScreen(c.x, c.y);
        if (p.x < -80 || p.x > w + 80 || p.y < -30 || p.y > h + 30) continue;
        const major = c.name === c.name.toUpperCase();
        // approximate city extent ring
        const ringR = Math.max(7, (major ? 34 : 20) * cam.scale);
        ctx.beginPath();
        ctx.strokeStyle = pal.cityRing;
        ctx.lineWidth = 1;
        ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
        // center tick
        ctx.beginPath();
        ctx.fillStyle = pal.city;
        ctx.arc(p.x, p.y, major ? 2.2 : 1.4, 0, Math.PI * 2);
        ctx.fill();
        // haloed label so it stays legible over the node glow
        const fontPx = major ? 11 : 9.5;
        ctx.font = `${major ? '700' : '500'} ${fontPx}px var(--font-jbmono), ui-monospace, monospace`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = pal.bg;
        ctx.strokeText(c.name, p.x + 7, p.y);
        ctx.fillStyle = pal.city;
        ctx.fillText(c.name, p.x + 7, p.y);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    // ── interaction ────────────────────────────────────────────────────────
    let dragging = false;
    let didDrag = false;
    let lastX = 0;
    let lastY = 0;

    const screenToWorld = (sx: number, sy: number) => {
      const { w, h } = sizeRef.current;
      const cam = camRef.current;
      return {
        x: (sx - w / 2) / cam.scale + cam.x,
        y: (sy - h / 2) / cam.scale + cam.y,
      };
    };

    const pickNode = (sx: number, sy: number): number | null => {
      const { nodes } = graphRef.current;
      const cam = camRef.current;
      const wp = screenToWorld(sx, sy);
      let best: number | null = null;
      let bestD = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dx = n.x - wp.x;
        const dy = n.y - wp.y;
        const d = Math.hypot(dx, dy);
        const hitR = n.r + 10 / cam.scale;
        if (d < hitR && d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    const relative = (e: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      didDrag = false;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = relative(e);
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) didDrag = true;
        lastX = e.clientX;
        lastY = e.clientY;
        const cam = camRef.current;
        cam.x -= dx / cam.scale;
        cam.y -= dy / cam.scale;
        userMovedRef.current = true;
        return;
      }
      const hit = pickNode(x, y);
      hoverRef.current = hit;
      canvas.style.cursor = hit != null ? 'pointer' : 'grab';
    };
    const onUp = (e: PointerEvent) => {
      const { x, y } = relative(e);
      if (!didDrag) {
        const hit = pickNode(x, y);
        if (hit != null) {
          const n = graphRef.current.nodes[hit];
          onSelectRef.current({ id: n.id, kind: n.kind, gauge: n.gauge });
        } else {
          onSelectRef.current(null);
        }
      }
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = relative(e);
      const cam = camRef.current;
      const before = screenToWorld(x, y);
      const factor = Math.exp(-e.deltaY * 0.0015);
      cam.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cam.scale * factor));
      const after = screenToWorld(x, y);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
      userMovedRef.current = true;
    };

    // Keyboard access: cycle nodes with arrows, Enter/Space to inspect, Esc to clear.
    const onKey = (e: KeyboardEvent) => {
      const { nodes } = graphRef.current;
      if (nodes.length === 0) return;
      let idx = hoverRef.current ?? -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        idx = (idx + 1) % nodes.length;
        hoverRef.current = idx;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = idx <= 0 ? nodes.length - 1 : idx - 1;
        hoverRef.current = idx;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (idx >= 0) {
          const n = nodes[idx];
          onSelectRef.current({ id: n.id, kind: n.kind, gauge: n.gauge });
        }
      } else if (e.key === 'Escape') {
        onSelectRef.current(null);
      }
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mql.removeEventListener('change', onMQ);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none select-none">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label="Houston watershed flood network. Drag to pan, scroll to zoom, arrow keys to cycle gauges, Enter to inspect."
        className="block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-ob-accent/60"
      />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
