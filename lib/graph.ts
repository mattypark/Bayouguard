/* Watershed graph model + force simulation.
 *
 * The gauges carry no edges, so we derive a network by linking each gauge to its
 * k nearest neighbours (a k-NN graph). Node positions are *seeded* from real
 * geography (lng -> x, lat -> y) and then relaxed by a light force layout that
 * keeps a weak anchor back toward the geographic seed. The result reads as a
 * living Obsidian-style network that still echoes the real shape of Houston.
 *
 * Pure module — no DOM, no canvas. The renderer owns drawing + the rAF loop. */

import type { GaugePoint, Tier } from './types';

export type NodeKind = 'gauge' | 'address';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  tier: Tier;
  label: string;
  gauge?: GaugePoint;
  // World-space simulation state.
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Geographic anchor in world space (weak spring pulls the node back here).
  ax: number;
  ay: number;
  r: number; // base render radius (world units)
}

export interface GraphEdge {
  a: number; // node index
  b: number; // node index
  rest: number; // resting length (world units)
}

// Geographic projection used to seed the layout; exposed so overlays (city
// labels, region outline) can be drawn in the same world space as the nodes.
export interface GeoProjection {
  minLat: number;
  minLng: number;
  span: number;
  world: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  addressIndex: number | null; // index of the searched-address node, if any
  proj: GeoProjection | null;
}

// Project a lat/lng into the graph's world space (matches buildGraph's seeding).
export function projectGeo(
  proj: GeoProjection,
  lat: number,
  lng: number,
): { x: number; y: number } {
  return {
    x: ((lng - proj.minLng) / proj.span) * proj.world - proj.world / 2,
    y: -(((lat - proj.minLat) / proj.span) * proj.world - proj.world / 2),
  };
}

const WORLD = 900; // nominal world width/height the geo extent maps into
const K_NEAREST = 2;

function geoDistSq(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  // Cheap squared planar distance — fine for k-NN ranking at city scale.
  const dLat = aLat - bLat;
  const dLng = (aLng - bLng) * Math.cos((aLat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

function tierRadius(g: GaugePoint): number {
  // Bigger node = closer to flooding (less buffer headroom).
  const fillPct = g.flood > 0 ? Math.min(1, g.current / g.flood) : 0;
  return 3.2 + fillPct * 5.5;
}

/* Build a k-NN graph from the gauge set, seeded from geography. */
export function buildGraph(
  gauges: GaugePoint[],
  center?: { lat: number; lng: number } | null,
  address?: string,
): Graph {
  if (gauges.length === 0) {
    return { nodes: [], edges: [], addressIndex: null, proj: null };
  }

  // Geographic extent -> world box (preserve aspect so Houston isn't squashed).
  const lats = gauges.map((g) => g.lat);
  const lngs = gauges.map((g) => g.lng);
  if (center) {
    lats.push(center.lat);
    lngs.push(center.lng);
  }
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(1e-4, maxLat - minLat);
  const spanLng = Math.max(1e-4, maxLng - minLng);
  const span = Math.max(spanLat, spanLng);
  const proj: GeoProjection = { minLat, minLng, span, world: WORLD };

  const toWorld = (lat: number, lng: number): { x: number; y: number } =>
    projectGeo(proj, lat, lng);

  const nodes: GraphNode[] = gauges.map((g) => {
    const w = toWorld(g.lat, g.lng);
    return {
      id: `g${g.id}`,
      kind: 'gauge' as const,
      tier: g.tier,
      label: `Gauge ${g.id}`,
      gauge: g,
      x: w.x,
      y: w.y,
      vx: 0,
      vy: 0,
      ax: w.x,
      ay: w.y,
      r: tierRadius(g),
    };
  });

  // k-NN edges (undirected, de-duplicated).
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  const restFor = (i: number, j: number): number => {
    const dx = nodes[i].ax - nodes[j].ax;
    const dy = nodes[i].ay - nodes[j].ay;
    return Math.max(28, Math.hypot(dx, dy));
  };

  for (let i = 0; i < gauges.length; i++) {
    const ranked = [];
    for (let j = 0; j < gauges.length; j++) {
      if (i === j) continue;
      ranked.push({
        j,
        d: geoDistSq(gauges[i].lat, gauges[i].lng, gauges[j].lat, gauges[j].lng),
      });
    }
    ranked.sort((a, b) => a.d - b.d);
    for (let n = 0; n < Math.min(K_NEAREST, ranked.length); n++) {
      const j = ranked[n].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j, rest: restFor(i, j) });
    }
  }

  // Searched-address node linked to its nearest gauge.
  let addressIndex: number | null = null;
  if (center) {
    const w = toWorld(center.lat, center.lng);
    let nearest = 0;
    let best = Infinity;
    for (let j = 0; j < gauges.length; j++) {
      const d = geoDistSq(center.lat, center.lng, gauges[j].lat, gauges[j].lng);
      if (d < best) {
        best = d;
        nearest = j;
      }
    }
    addressIndex = nodes.length;
    nodes.push({
      id: 'address',
      kind: 'address',
      tier: gauges[nearest].tier,
      label: address ?? 'Your location',
      x: w.x,
      y: w.y,
      vx: 0,
      vy: 0,
      ax: w.x,
      ay: w.y,
      r: 7,
    });
    edges.push({ a: addressIndex, b: nearest, rest: restFor(addressIndex, nearest) });
  }

  return { nodes, edges, addressIndex, proj };
}

/* ── Force simulation ──────────────────────────────────────────────────────
 * Repulsion (all pairs) + edge springs + a weak anchor back to the geographic
 * seed. Runs in world units; `alpha` cools the motion over time. */
export class ForceSim {
  nodes: GraphNode[];
  edges: GraphEdge[];
  alpha = 1;

  // Tunables (world units).
  private repulsion = 1400;
  private springK = 0.04;
  private anchorK = 0.012;
  private damping = 0.82;
  private maxV = 18;

  constructor(graph: Graph) {
    this.nodes = graph.nodes;
    this.edges = graph.edges;
  }

  reheat(value = 0.9): void {
    this.alpha = Math.max(this.alpha, value);
  }

  step(): void {
    const n = this.nodes.length;
    if (n === 0) return;
    const a = this.alpha;

    // Pairwise repulsion (O(n^2); fine for a few hundred gauges).
    for (let i = 0; i < n; i++) {
      const ni = this.nodes[i];
      for (let j = i + 1; j < n; j++) {
        const nj = this.nodes[j];
        let dx = ni.x - nj.x;
        let dy = ni.y - nj.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          // Jitter coincident nodes apart deterministically.
          dx = (i - j) * 0.5 + 0.1;
          dy = (j - i) * 0.5 + 0.1;
          d2 = dx * dx + dy * dy;
        }
        const force = (this.repulsion * a) / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        ni.vx += fx;
        ni.vy += fy;
        nj.vx -= fx;
        nj.vy -= fy;
      }
    }

    // Edge springs.
    for (const e of this.edges) {
      const a1 = this.nodes[e.a];
      const b1 = this.nodes[e.b];
      const dx = b1.x - a1.x;
      const dy = b1.y - a1.y;
      const d = Math.hypot(dx, dy) || 1;
      const diff = (d - e.rest) * this.springK * a;
      const fx = (dx / d) * diff;
      const fy = (dy / d) * diff;
      a1.vx += fx;
      a1.vy += fy;
      b1.vx -= fx;
      b1.vy -= fy;
    }

    // Weak anchor to geographic seed + integrate.
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      node.vx += (node.ax - node.x) * this.anchorK * a;
      node.vy += (node.ay - node.y) * this.anchorK * a;
      node.vx *= this.damping;
      node.vy *= this.damping;
      // Clamp velocity for stability.
      node.vx = Math.max(-this.maxV, Math.min(this.maxV, node.vx));
      node.vy = Math.max(-this.maxV, Math.min(this.maxV, node.vy));
      node.x += node.vx;
      node.y += node.vy;
    }

    // Cool down, but never fully freeze — keeps a faint living drift.
    this.alpha = Math.max(0.03, this.alpha * 0.985);
  }
}
