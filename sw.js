const CACHE = "orbita-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./css/features.css",
  "./js/effects.js",
  "./js/app.js",
  "./js/features.js",
  "./manifest.json",
  "./icons/icon-192.svg",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return (
        cached ||
        fetch(e.request).then(function (res) {
          return res;
        })
      );
    })
  );
});
