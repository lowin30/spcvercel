const CACHE_NAME = 'spc-cache-v3';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  '/',
  '/login',
  '/dashboard/esperando-rol',
  '/dashboard/herramientas/calculadora',
  OFFLINE_URL,
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : undefined));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/_next/static/') || request.destination === 'image' || url.pathname.startsWith('/icons/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const resp = await fetch(request);
        cache.put(request, resp.clone());
        return resp;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const resp = await fetch(request);
      return resp;
    } catch (err) {
      if (request.mode === 'navigate') {
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match(OFFLINE_URL);
        return offlinePage || Response.error();
      }
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      return cached || Response.error();
    }
  })());
});
