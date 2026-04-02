const CACHE = 'goes-star-v3';
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
  const url = e.request.url;

  /* Satellite imagery CDN — network-first, cache on success as fallback for hiccups */
  if (url.includes('cdn.star.nesdis.noaa.gov')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then(cached => cached || new Response('', {status: 503})))
    );
    return;
  }

  /* Live API calls (NWS, Nominatim) — pure network, no caching */
  if (url.includes('noaa.gov') || url.includes('weather.gov') ||
      url.includes('nominatim') || url.includes('googleapis') ||
      url.includes('rainviewer.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  /* Local app assets — cache-first */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
