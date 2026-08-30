/* ============================================================
   NUPIEEPRO — Service Worker v57
   Network-first com fallback para cache offline.
   ATENCAO: Versionar CACHE_NAME a cada deploy importante senao
   browsers continuam servindo assets antigos do cache do SW.
   ============================================================ */

const CACHE_NAME = 'nupieepro-v86';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './convite.html',
  './reset.html',
  './css/styles.css?v=86',
  './js/config.defaults.js',
  './js/app.js?v=86',
  './js/auth.js?v=86',
  './js/abj.js?v=86',
  './js/pages.js?v=86',
  './js/permissoes.js?v=86',
  './js/emails.js?v=86',
  './js/relatorio.js?v=86',
  './js/documentos.js?v=86',
  './js/validacao.js?v=86',
  './js/push.js?v=86',
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
