/* Службовий воркер Menuisier FR.
   - Зберігає файли застосунку, щоб він відкривався навіть без інтернету.
   - index.html і videos.config.js спершу беруться з мережі (щоб зміни з'являлися одразу),
     а без інтернету — зі збереженої копії.
   - Фото з Wikimedia і YouTube не кешуються: без інтернету замість фото показуються малюнки. */
const CACHE = 'menuisier-v1';
const SHELL = [
  './',
  './index.html',
  './videos.config.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Сторінка і список відео: спершу мережа, без інтернету — збережена копія
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/videos.config.js')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Іконки, маніфест і власні mp4: зі збереженої копії, якщо є
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && !/\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
