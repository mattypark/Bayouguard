'use client';

/* The map screen's data: the current FloodView, whether we're waiting on a
 * sleeping backend, and the search action. Only the newest request may write
 * the view, so a slow wake-up loop never clobbers a fresher search. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FloodView } from './types';
import { COLD_START_MS, WARM_MS, fetchUntilAwake, warmBackend } from './client';
import { useI18n } from './i18n';

export type WakeState = 'idle' | 'waking' | 'failed';
export type SearchNotice = 'notFound' | 'outOfArea' | 'unreachable' | null;

export function useFloodData(
  initial: FloodView,
  initialAddress?: string,
  initialCoords?: { lat: number; lng: number },
  /** Skip the gauge list (pages without a map). */
  lite = false,
) {
  const { lang } = useI18n();
  const [view, setView] = useState<FloodView>(initial);
  const [loading, setLoading] = useState(false);
  const [wake, setWake] = useState<WakeState>('idle');
  const [notice, setNotice] = useState<SearchNotice>(
    initial.notFound ? 'notFound' : initial.outOfArea ? 'outOfArea' : null,
  );

  const seq = useRef(0);
  const awake = useRef(!initial.pending && !initial.backendTimedOut && initial.dataSource !== 'demo');
  const coldDeadline = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  const run = useCallback(
    async (address: string | undefined, coords: { lat: number; lng: number } | undefined) => {
      const id = ++seq.current;
      const now = Date.now();
      const deadline = awake.current ? now + WARM_MS : Math.max(coldDeadline.current, now + WARM_MS);
      setLoading(true);
      setNotice(null);
      // Only say "waking up" if it's actually taking a while.
      const slow = awake.current
        ? 0
        : window.setTimeout(() => id === seq.current && setWake('waking'), 2500);
      try {
        const next = await fetchUntilAwake(address, coords, deadline, langRef.current, (interim) => {
          if (id !== seq.current) return;
          setView(interim);
          setWake('waking');
        }, lite);
        if (id !== seq.current) return null;
        setView(next);
        if (!next.backendTimedOut) awake.current = true;
        setWake(next.backendTimedOut ? 'failed' : 'idle');
        setNotice(next.notFound ? 'notFound' : next.outOfArea ? 'outOfArea' : null);
        return next;
      } catch {
        if (id !== seq.current) return null;
        setWake((w) => (w === 'waking' ? 'failed' : w));
        setNotice('unreachable');
        return null;
      } finally {
        window.clearTimeout(slow);
        if (id === seq.current) setLoading(false);
      }
    },
    [lite],
  );

  // On mount: start Render waking, and if the server render couldn't wait for
  // it, fetch the live view now.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    coldDeadline.current = Date.now() + COLD_START_MS;
    warmBackend();
    if (initial.pending || initial.backendTimedOut) {
      void run(initialAddress, initialCoords);
    }
  }, [initial.pending, initial.backendTimedOut, initialAddress, initialCoords, run]);

  return { view, loading, wake, notice, search: run };
}
