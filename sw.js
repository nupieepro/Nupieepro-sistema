/* ============================================================
   NUPIEEPRO — Service Worker v58
   Network-first com fallback para cache offline.
   ATENCAO: Versionar CACHE_NAME a cada deploy importante senao
   browsers continuam servindo assets antigos do cache do SW.
   ============================================================ */

const CACHE_NAME = 'nupieepro-v110';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './convite.html',
  './reset.html',
  './privacidade.html',
  './css/styles.css?v=110',
  './js/config.defaults.js',
  './js/app.js?v=110',
  './js/auth.js?v=110',
  './js/abj.js?v=110',
  './js/pages.js?v=110',
  './js/permissoes.js?v=110',
  './js/emails.js?v=110',
  './js/relatorio.js?v=110',
  './js/documentos.js?v=110',
  './js/validacao.js?v=110',
  './js/push.js?v=110',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png',
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
      .catch(async () => {
        // Rede falhou: tenta cache. Se não achar nada (ex: SW antigo pedindo
        // um asset versionado que já saiu do cache), NUNCA devolve undefined
        // pro respondWith — isso quebra com "Failed to convert value to
        // 'Response'" e trava o app inteiro. Cai pro shell (index.html) em
        // navegação, ou devolve uma resposta vazia como último recurso.
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      })
  );
});
