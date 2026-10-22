/* BayouGuard service worker. Hand-written and small on purpose:
 *  - pages: network first, cached copy when offline
 *  - hashed build assets and icons: cache first (they never change)
 *  - /api/flood: network first; the last good answer is kept, and served
 *    when offline with X-BayouGuard-Offline so the page can say how old it is
 * Bump VERSION to drop every old cache on the next visit. */

const VERSION = 'bayouguard-v1';
const SHELL = ['/map', '/shelters', '/about', '/manifest.webmanifest', '/icons/192', '/icons/512'];
const LAST_FLOOD = '/__bayouguard/last-flood';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/api/flood') {
    event.respondWith(floodNetworkFirst(req));
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === 'navigate') {
    event.respondWith(pageNetworkFirst(req, url));
  }
});

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function pageNetworkFirst(req, url) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(url.pathname, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(url.pathname)) ||
      (await cache.match('/map')) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

async function floodNetworkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(LAST_FLOOD, res.clone());
    return res;
  } catch {
    const hit = await cache.match(LAST_FLOOD);
    if (!hit) return Response.error();
    return new Response(await hit.text(), {
      headers: { 'Content-Type': 'application/json', 'X-BayouGuard-Offline': '1' },
    });
  }
}
