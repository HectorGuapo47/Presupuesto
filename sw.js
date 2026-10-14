// Service worker: guarda la app para que abra sin internet.
// Estrategia: primero internet (siempre la versión más nueva); si no hay conexión, usa lo guardado.
var CACHE = 'presupuesto-v5';
var FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // cache: 'reload' evita que se guarde una copia vieja que tenga el navegador
      return Promise.all(FILES.map(function (url) {
        return fetch(url, { cache: 'reload' }).then(function (res) {
          if (res && res.ok) return cache.put(url, res);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      var net = fetch(req.url, { cache: 'reload' }).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
      var timeout = new Promise(function (resolve, reject) { setTimeout(reject, 4000); });
      return Promise.race([net, timeout]).catch(function () {
        return cache.match(req).then(function (hit) { return hit || cache.match('./index.html'); });
      });
    })
  );
});
