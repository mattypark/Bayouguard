'use client';

/* Counts a stat up from zero on arrival. Only plain integers ("1,097", "7")
 * count; anything with a unit ("0.00″", "5 min") is shown as is. The server
 * render is the final value, so no-JS readers and crawlers see the truth. */

import { useEffect, useState } from 'react';
import { easeOutCubic } from '@/lib/dotField';

const DURATION_MS = 1100;

export default function CountUp({ value, delayMs = 0 }: { value: string; delayMs?: number }) {
  const target = /^[\d,]+$/.test(value) ? Number(value.replace(/,/g, '')) : null;
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (target === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const start = performance.now() + delayMs;
    setShown('0');
    const tick = (now: number) => {
      const k = easeOutCubic(Math.max(0, Math.min(1, (now - start) / DURATION_MS)));
      setShown(Math.round(target * k).toLocaleString('en-US'));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs]);

  return <>{shown}</>;
}
