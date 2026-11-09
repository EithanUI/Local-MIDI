const CACHE_NAME = "art-midi-v5";
const APP_SHELL = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
].map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          const isAppCache = cacheName.startsWith("localmidi-") || cacheName.startsWith("art-midi-");
          return isAppCache && cacheName !== CACHE_NAME ? caches.delete(cacheName) : Promise.resolve(false);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isAppNavigation = request.mode === "navigate" &&
    url.href.startsWith(self.registration.scope);
  const isAppAsset = APP_SHELL.includes(url.href);
  if (!isAppNavigation && !isAppAsset) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request, { cache: "no-cache" });
        if (response.ok && isAppAsset) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        if (isAppNavigation) {
          const appShell = await caches.match(new URL("./index.html", self.registration.scope).href);
          if (appShell) return appShell;
        }
        throw error;
      }
    })(),
  );
});
