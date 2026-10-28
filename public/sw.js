// BH Clothing service worker: makes the site installable and gives a friendly page when offline.
// Pages always come from the network first (so a new version shows straight away); built files, catalogue images and
// icons are kept for speed. The store database (Supabase) is never cached: prices, stock and accounts are always live.
const VERSION = "bh-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // database, fonts and other sites: straight to the network

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (/^\/(assets|catalog|icons|product-mockups)\//.test(url.pathname)) {
    event.respondWith(caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const fresh = fetch(request).then((response) => { if (response.ok) cache.put(request, response.clone()); return response; }).catch(() => cached);
      return cached || fresh;
    }));
  }
});
