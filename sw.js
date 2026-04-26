/* ============================================================
   NUPIEEPRO — Service Worker v9
   Network-first com fallback para cache offline
   ============================================================ */

const CACHE_NAME = 'nupieepro-v11';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './convite.html',
  './reset.html',
  './operacoes-site-inscricoes.html',
  './css/styles.css',
  './js/config.defaults.js',
  './js/app.js',
  './js/auth.js',
  './js/abj.js',
  './manifest.json',
  './assets/icon.png',
];

// Install — pré-carrega shell do app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS).catch((err) => console.warn('[SW] Cache addAll parcial:', err))
    )
  );
  self.skipWaiting();
});

// Activate — remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Supabase sempre pela rede (auth + dados em tempo real)
  if (url.includes('supabase.co') || url.includes('googleapis.com')) return;

  // GET only
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
