'use client';

/* The plumbing both landing canvases share: DPR sizing, the pointer (lens on
 * hover, drag on press), theme colours that follow the light/dark toggle, and
 * a rAF loop that stops while the tab is hidden. Each canvas only supplies
 * its draw function. */

import { useEffect, useRef, type RefObject } from 'react';
import { fitCanvas, readThemeColours, type Pointer, type RGB } from './lens';

export interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** ms since the loop started — frozen at 0 under reduced motion. */
  t: number;
  pointer: Pointer;
  /** Accumulated drag in px since mount. */
  drag: { x: number; y: number };
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
    const drag = { x: 0, y: 0 };
    let pressed: { x: number; y: number } | null = null;
    let raf = 0;
    let t = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!reduced) t += dt;
      ctx!.clearRect(0, 0, w, h);
      drawRef.current({ ctx: ctx!, w, h, t, pointer, drag, ...colours });
      raf = requestAnimationFrame(frame);
    }

    function local(e: PointerEvent) {
      const r = cv!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onDown(e: PointerEvent) {
      pressed = local(e);
      el!.setPointerCapture(e.pointerId);
    }

    function onMove(e: PointerEvent) {
      const p = local(e);
      if (pressed) {
        drag.x += p.x - pressed.x;
        drag.y += p.y - pressed.y;
        pressed = p;
      }
      // Touch drags the globe; only a real pointer gets the lens.
      if (e.pointerType === 'touch') return;
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.on = true;
    }

    function onUp(e: PointerEvent) {
      pressed = null;
      if (el!.hasPointerCapture(e.pointerId)) el!.releasePointerCapture(e.pointerId);
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

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [host, canvas]);
}
