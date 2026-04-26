const CACHE_NAME = 'imoveis-ja-v1.0.3';
const ASSETS = [
    './index.html',
    './app.js',
    './manifest.json',
    './logo.png'
];

// Instalação
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Cache aberto');
            return cache.addAll(ASSETS).catch(err => console.error('Falha no cache:', err));
        })
    );
});

// Ativação
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

// Estratégia Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
    // Pular requisições de extensões ou APIs externas que podem falhar no cache
    if (!event.request.url.startsWith(registration.scope)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Silencioso, usa o cache se falhar
            });
            return cachedResponse || fetchPromise;
        })
    );
});
