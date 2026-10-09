'use client';

/* Canvas plumbing for the landing: DPR sizing, the pointer (for the lens),
 * theme colours that follow the light/dark toggle, and a rAF
 * loop that stops while the tab is hidden. The canvas only supplies its draw
 * function. */

import { useEffect, useRef, type RefObject } from 'react';
import type { RGB } from '@/lib/dotField';
import { fitCanvas, readThemeColours, type Pointer } from './lens';

export interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** ms since the loop started — frozen at 0 under reduced motion. */
  t: number;
  reduced: boolean;
  pointer: Pointer;
  ink: RGB;
  accent: RGB;
}

export function useDotCanvas(
  host: RefObject<HTMLDivElement>,
  canvas: RefObject<HTMLCanvasElement>,
  draw: (f: Frame) => void,
) {
  // Read through a ref so a parent re-render never tears the loop down.
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const el = host.current;
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!el || !cv || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let { w, h } = fitCanvas(el, cv, ctx);
    let colours = readThemeColours(el);
    const pointer: Pointer = { x: -9999, y: -9999, on: false };
    let raf = 0;
    let t = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!reduced) t += dt;
      ctx!.clearRect(0, 0, w, h);
      drawRef.current({ ctx: ctx!, w, h, t, reduced, pointer, ...colours });
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      // A finger on a phone is scrolling the page, not aiming a lens.
      if (e.pointerType === 'touch') return;
      const r = cv!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = true;
    }

    function onLeave() {
      pointer.on = false;
    }

    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    const ro = new ResizeObserver(() => {
      ({ w, h } = fitCanvas(el, cv, ctx));
    });
    ro.observe(el);

    // Repaint the dots when the theme flips.
    const mo = new MutationObserver(() => {
      colours = readThemeColours(el);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [host, canvas]);
}
