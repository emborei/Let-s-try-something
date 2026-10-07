/* ==========================================================================
   sw.js – Service Worker: die App läuft auch ohne Internet.
   Strategie:
     • App-Hülle (HTML/CSS/JS/Icons): zuerst aus dem Cache, im Hintergrund
       aktualisieren (stale-while-revalidate).
     • /api/*: nie cachen – Serverantworten (Zeitstempel!) müssen echt sein.
   ========================================================================== */

const VERSION = 'kneipencheck-v2.0.0';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/core/util.js',
  './js/core/db.js',
  './js/core/model.js',
  './js/core/logic.js',
  './js/core/server-time.js',
  './js/core/sync.js',
  './js/core/pdf-lite.js',
  './js/core/report.js',
  './js/ui/components.js',
  './js/ui/store.js',
  './js/ui/views/heute.js',
  './js/ui/views/liste.js',
  './js/ui/views/entry.js',
  './js/ui/views/bericht.js',
  './js/ui/views/verwalten.js',
  './js/ui/views/einrichten.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Einzeln hinzufügen, damit ein fehlendes Asset die Installation nicht blockiert
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Server-API niemals aus dem Cache bedienen
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== location.origin) return;   // fremde Zeitquellen nicht abfangen

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: false });

    if (cached) {
      // Im Hintergrund aktualisieren
      event.waitUntil(fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {}));
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (e) {
      // Offline und nicht im Cache: für Seiten die App-Hülle liefern
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      return new Response('Offline und nicht gespeichert.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  })());
});

// Erinnerung an offene Kontrollen, auch wenn die App im Hintergrund liegt
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'nag' && data.count > 0) {
    self.registration.showNotification('KneipenCheck: Kontrollen offen', {
      body: `${data.count} Kontrolle(n) fehlen noch – jetzt eintragen.`,
      icon: './icons/icon-192.png',
      badge: './icons/icon-96.png',
      tag: 'kneipencheck',
      renotify: true,
      data: { url: './index.html#/heute' },
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || './index.html#/heute';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  })());
});
