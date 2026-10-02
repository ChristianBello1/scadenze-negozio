// Service worker: permette di installare l'app e di aprirla anche senza rete.
const CACHE = "scadenze-murhaehg";
const BASE = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "chunks/chunk-IHRIUEAN.js", "chunks/data-firebase-TFNDJUSP.js", "chunks/esm-GH2I3F62.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

// Prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
