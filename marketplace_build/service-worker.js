const CACHE_NAME = "palan-hype-cache-v6";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./admin.html",
  "./user.html",
  "./artist.html",
  "./telegram-login.html",
  "./vedushie.html",
  "./dj.html",
  "./music.html",
  "./agent.html",
  "./zayavka.html",
  "./add-host.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./marketplace.css",
  "./marketplace-core.js",
  "./auth-config.js",
  "./auth-bridge.js",
  "./category-template.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(FILES_TO_CACHE);
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve();
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isAppAsset(request) {
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return false;
  return /(\.html|\.css|\.js|manifest\.json)$/i.test(url.pathname) || url.pathname.endsWith("/");
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  if (isAppAsset(event.request)) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(function (response) {
    return response || fetch(event.request);
  }));
});
