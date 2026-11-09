// TERRA — Service Worker (hors connexion complet). Cache versionné : changer VERSION à chaque livraison.
const VERSION = '0.6.0'; // identique à APP_VERSION dans index.html
const CACHE = `terra-v${VERSION}`;

// Tous les chemins sont relatifs au Service Worker : compatible GitHub Pages en sous-répertoire.
// Depuis la v0.5.1, le module de conseil est embarqué dans index.html : plus de liste de modules à précacher.
// Indispensable : si l'un de ces fichiers manque, l'installation échoue (et c'est voulu : pas d'application à moitié hors connexion).
const CORE = [
  './',
  './index.html',
  './manifest.json'
];
// Icônes : mises en cache au mieux, leur absence ne bloque pas l'installation.
const ICONS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE).then(() => Promise.all(ICONS.map((u) => c.add(u).catch(() => null)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('terra-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // les liens externes passent par le réseau

  // Navigation : toujours l'application (routes par #hash), même sans connexion
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(new URL('./index.html', self.location).href).then((hit) => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
