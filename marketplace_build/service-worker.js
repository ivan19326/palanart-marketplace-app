const CACHE_NAME = "palan-hype-cache-v3";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./admin.html",
  "./user.html",
  "./artist.html",
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
  "./category-template.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(FILES_TO_CACHE);
  }));
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(function (response) {
    return response || fetch(event.request);
  }));
});
