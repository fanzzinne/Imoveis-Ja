const CACHE_NAME = 'imoveis-ja-v' + Date.now(); // Força nome único em cada deploy

// Instalação: Cacheia apenas o essencial inicial
self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('SW: Instalando e pulando espera');
});

// Ativação: LIMPEZA AGRESSIVA de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('SW: Deletando cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia: REDE PRIMEIRO (Network First)
// Garante que o usuário sempre veja os dados mais novos da planilha e do código.
// O cache serve apenas como backup se a internet cair.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede responder, atualizamos o cache com a versão nova
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // Se a internet falhar, tenta o cache
        return caches.match(event.request);
      })
  );
});
