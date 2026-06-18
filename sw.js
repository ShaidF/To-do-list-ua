const CACHE = "orbita-v6";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k.indexOf("orbita-") === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        return res;
      })
      .catch(function () {
        return caches.match(e.request);
      })
  );
});
