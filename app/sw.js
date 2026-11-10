const CACHE = 'goes-star-v6';
const ASSETS = [
  './index.html',
  './guide.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './vendor/three.min.js',
  './vendor/leaflet.js',
  './vendor/leaflet.css',
  './vendor/satellite.min.js',
  './vendor/fonts/jetbrains-mono-400.woff2',
  './vendor/fonts/jetbrains-mono-700.woff2'
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
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Satellite imagery "latest" stills — network-first, cached copy as fallback for hiccups */
  if (url.hostname === 'cdn.star.nesdis.noaa.gov' && !/\/\d{11}_/.test(url.pathname)) {
    e.respondWith(
      fetch(req, {cache: 'no-cache'}).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || new Response('', {status: 503})))
    );
    return;
  }

  /* Everything else cross-origin (APIs, map tiles, timestamped frames) goes straight to the network */
  if (url.origin !== self.location.origin) return;

  /* App page — network-first so updates show up immediately; cached copy when offline */
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', clone)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Bundled libraries, fonts, icons — cache-first */
  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
