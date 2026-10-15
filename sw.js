/* Service worker : permet d'ouvrir l'application sans internet.
   Les données des clients ne passent jamais par ici : elles restent dans le navigateur. */
const VERSION = "sf-fidelite-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Réponse immédiate depuis le cache, puis mise à jour en arrière-plan quand internet est là */
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, {ignoreSearch: true});
    const refresh = fetch(req).then(res => {
      if(res && res.ok) cache.put(req, res.clone());
      return res;
    });
    if(cached){ e.waitUntil(refresh.catch(() => {})); return cached; }
    try{ return await refresh; }
    catch(err){
      if(req.mode === "navigate"){
        const home = await cache.match("index.html");
        if(home) return home;
      }
      throw err;
    }
  })());
});
