// TLV Radar service worker: lets the app open offline and load fast on repeat visits.
// Pages and data: network first, cached copy when offline. Built assets (hashed): cache first.
const CACHE = "tlv-radar-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // live APIs always go to the network

  const networkFirst = () =>
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? (req.mode === "navigate" ? caches.match("/") : undefined)));

  if (req.mode === "navigate" || url.pathname.startsWith("/data/")) {
    e.respondWith(networkFirst());
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit ?? networkFirst()));
  }
});
