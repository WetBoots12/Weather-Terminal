const CACHE = 'goes-star-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  /* Network-first for NOAA/NWS API calls, cache-first for local assets */
  const url = e.request.url;
  const isExternal = url.includes('noaa.gov') || url.includes('weather.gov') ||
                     url.includes('nominatim') || url.includes('googleapis');
  if (isExternal) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
