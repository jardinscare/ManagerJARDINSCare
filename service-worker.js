// =============================================
// SERVICE WORKER - managerJARDINSCare PWA
// Versão 3 — 11/11/2026 (Ciclo 5.5+ — correção de cache do HTML)
// ⚠️ A CADA PUBLICAÇÃO, INCREMENTE O CACHE_NAME
// =============================================

const CACHE_NAME = 'jardinscare-cache-v3';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png',
    './css/styles.css',
    './js/config.js',
    './js/utils.js',
    './js/utilsFinance.js',
    './js/supabase-api.js',
    './js/supabase-realtime.js',
    './js/app.js',
    './js/dashboard.js',
    './js/assistidos.js',
    './js/leads.js',
    './js/metricas-comerciais.js',
    './js/despesas.js',
    './js/receitas.js',
    './js/resultados.js',
    './js/fluxo-caixa.js',
    './js/modals.js',
    './js/aniversariantes.js',
    './js/charts.js',
    './js/inteligencia-negocio.js'
];

// Recursos externos que não devem ser cacheados (CDN, APIs)
const externalResources = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com',
    'https://i.ibb.co',
    'https://lqwljnzpenxdmdtujuak.supabase.co'
];

// Verifica se a URL é um recurso externo que não deve ser armazenado em cache
function isExternalResource(url) {
    return externalResources.some(resource => url.includes(resource));
}

// Verifica se a requisição é do HTML principal (index.html ou navegação raiz)
function isHtmlPrincipal(request, url) {
    if (request.mode === 'navigate') return true;
    if (url.endsWith('/')) return true;
    if (url.includes('index.html')) return true;
    return false;
}

// =============================================
// INSTALAÇÃO DO SERVICE WORKER
// =============================================
self.addEventListener('install', event => {
    console.log('[Service Worker] Instalando versão:', CACHE_NAME);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Cache aberto:', CACHE_NAME);
                return cache.addAll(urlsToCache)
                    .catch(err => {
                        console.warn('[Service Worker] Erro ao cachear alguns recursos:', err);
                        // Tenta cachear individualmente para não falhar tudo
                        return Promise.all(
                            urlsToCache.map(url =>
                                cache.add(url).catch(e => console.warn('[SW] Falha ao cachear:', url, e.message))
                            )
                        );
                    });
            })
    );

    // Força o service worker a ativar imediatamente
    self.skipWaiting();
});

// =============================================
// ATIVAÇÃO DO SERVICE WORKER
// =============================================
self.addEventListener('activate', event => {
    console.log('[Service Worker] Ativando versão:', CACHE_NAME);

    // Remove caches antigos
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Removendo cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // Toma controle de todas as abas abertas imediatamente
            return self.clients.claim();
        })
    );
});

// =============================================
// INTERCEPTAÇÃO DE REQUISIÇÕES (FETCH)
// =============================================
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Para recursos externos (APIs, CDNs), tenta rede primeiro, depois cache
    if (isExternalResource(url)) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return response;
                })
                .catch(error => {
                    console.warn('[Service Worker] Falha ao acessar rede para:', url, error);
                    return caches.match(event.request);
                })
        );
        return;
    }

    // 🆕 HTML principal (index.html e navegação raiz)
    // NÃO cacheia o HTML — sempre busca da rede primeiro
    // Fallback para cache apenas se a rede falhar (offline)
    if (isHtmlPrincipal(event.request, url)) {
        event.respondWith(
            fetch(event.request)
                .catch(error => {
                    console.log('[Service Worker] Rede falhou para HTML, tentando cache:', url);
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Se não houver cache, tenta o index.html cacheado como último recurso
                        return caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Para demais recursos locais: estratégia "Network First, then Cache"
    // (prioriza versão nova; fallback para cache se offline)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(error => {
                console.log('[Service Worker] Rede falhou, tentando cache:', event.request.url);
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    console.error('[Service Worker] Recurso não encontrado no cache:', event.request.url);
                });
            })
    );
});

// =============================================
// SINCRONIZAÇÃO EM BACKGROUND (OPCIONAL)
// =============================================
self.addEventListener('sync', event => {
    console.log('[Service Worker] Sincronização em background:', event.tag);
    if (event.tag === 'sync-dados') {
        event.waitUntil(sincronizarDados());
    }
});

function sincronizarDados() {
    console.log('[Service Worker] Sincronizando dados...');
    return Promise.resolve();
}

// =============================================
// NOTIFICAÇÕES PUSH (OPCIONAL)
// =============================================
self.addEventListener('push', event => {
    console.log('[Service Worker] Notificação push recebida:', event);

    const titulo = 'JARDINSCare';
    const opcoes = {
        body: 'Novas atualizações disponíveis!',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: './'
        }
    };

    event.waitUntil(
        self.registration.showNotification(titulo, opcoes)
    );
});

self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Clique na notificação:', event);
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url || './')
    );
});

// =============================================
// MENSAGEM DO CLIENTE (força atualização)
// =============================================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] Recebido pedido de SKIP_WAITING');
        self.skipWaiting();
    }
});

console.log('[Service Worker] Service Worker carregado - versão:', CACHE_NAME);
