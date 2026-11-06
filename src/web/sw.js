const CACHE_NAME = 'comixapi-pwa-cache-v0.15';

const ASSETS_TO_CACHE = [
  './?v='+CACHE_NAME,
  './index.html?v='+CACHE_NAME,
  './application.js?v='+CACHE_NAME,
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.8/handlebars.min.js',
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://bootswatch.com/5/flatly/bootstrap.min.css',

  './icons/icon-16x16.png',
  './icons/icon-32x32.png',
  './icons/icon-48x48.png',
  './icons/icon-64x64.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-192x192-maskable.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-512x512-maskable.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); 

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 現在の CACHE_NAME 以外の古いキャッシュを見つけて削除する
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除しました:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
});

