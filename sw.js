
// TERRA — Service Worker (hors connexion complet).
// Cache versionné : changer VERSION à chaque livraison.
const VERSION = '0.6.1';
const CACHE = `terra-v${VERSION}`;

// Fichiers indispensables au fonctionnement hors connexion.
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

// Icônes facultatives : leur absence ne bloque pas l'installation.
const ICONS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE)
        .then(() => Promise.all(
          ICONS.map((u) => c.add(u).catch(() => null))
        ))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('terra-') && k !== CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Les requêtes externes passent par le réseau.
  if (url.origin !== self.location.origin) return;

  // Navigation : ouvrir l'application même hors connexion.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(new URL('./index.html', self.location).href)
        .then((hit) => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true })
      .then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
  );
});
