const CACHE_NAME = 'imoveis-ja-v' + new Date().getTime(); // Versão baseada em timestamp para forçar atualização
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação e Cache Automático
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força a ativação imediata do novo Service Worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Fazendo cache de novos arquivos');
      return cache.addAll(ASSETS);
    })
  );
});

// Limpeza de Cache Antigo e Ativação de Nova Versão
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('PWA: Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Garante que o SW controle todas as abas imediatamente
  );
});

// Estratégia de Fetch (Rede primeiro, fallback para Cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
