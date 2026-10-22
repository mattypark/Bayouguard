'use client';

/* Registers public/sw.js in production builds only — in development it
 * would serve stale pages over fresh edits. */

import { useEffect } from 'react';

export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
