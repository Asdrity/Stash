// Stash service worker. При каждом релизе меняйте CACHE (версия приложения).
const CACHE = 'stash-v0.4.0';
const ASSETS = [
  "./",
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './js/app.js',
  './js/i18n.js',
  './js/currencies.js',
  './js/locales/en.js',
  './js/locales/zh.js',
  './js/locales/hi.js',
  './js/locales/es.js',
  './js/locales/fr.js',
  './js/locales/ar.js',
  './js/locales/bn.js',
  './js/locales/pt.js',
  './js/locales/ru.js',
  './js/locales/ur.js',
  './js/locales/id.js',
  './js/locales/de.js',
  './js/locales/ja.js',
  './js/locales/mr.js',
  './js/locales/te.js',
  './js/locales/tr.js',
  './js/locales/ta.js',
  './js/locales/vi.js',
  './js/locales/ko.js',
  './js/locales/it.js',
  './js/locales/th.js',
  './js/locales/fa.js',
  './js/locales/pl.js',
  './js/locales/uk.js',
  './js/locales/nl.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/app-sky.png',
  './icons/app-graphite.png',
  './icons/app-mint.png',
  './icons/app-sunset.png',
  './icons/app-violet.png',
  './icons/app-light.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала сеть (чтобы обновления приходили сразу), если офлайн — из кэша
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
