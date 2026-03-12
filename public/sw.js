// IAprova Service Worker v7.0 - v167: Correção de redirect mode para navegação
const CACHE_NAME = 'iaprova-v167';
const STATIC_CACHE = 'iaprova-static-v167';
const DYNAMIC_CACHE = 'iaprova-dynamic-v167';

// Arquivos essenciais para cache offline
const STATIC_ASSETS = [
  '/static/app.js',
  '/static/style.css',
  '/manifest.json',
  '/icons/favicon.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 IAprova SW v7.0: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 IAprova SW: Cacheando arquivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('⚠️ Erro no cache:', err))
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ IAprova SW v7.0: Ativado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('🗑️ Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ✅ Ignorar requisições que não são GET
  if (request.method !== 'GET') {
    return;
  }
  
  // ✅ v167 CORREÇÃO CRÍTICA: NÃO interceptar requisições de navegação (páginas HTML)
  // Motivo: O servidor retorna 302 redirect (/ → /home ou /login).
  // Quando o SW responde com event.respondWith() usando uma resposta de redirect,
  // o navegador rejeita com: "a redirected response was used for a request whose
  // redirect mode is not 'follow'". Isso causa ERR_FAILED em algumas redes/navegadores.
  // Solução: Deixar o navegador lidar com navegação diretamente.
  if (request.mode === 'navigate') {
    return;
  }
  
  // ✅ Ignorar requisições de API (sempre buscar da rede)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Você está offline. Conecte-se à internet para acessar esta função.' }),
            { 
              status: 503, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        })
    );
    return;
  }
  
  // ✅ Ignorar URLs externas (CDN) — deixar o browser resolver
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // ✅ NETWORK FIRST para app.js e style.css (sempre buscar a versão mais recente)
  if (url.pathname === '/static/app.js' || url.pathname === '/static/style.css') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('// offline', { headers: { 'Content-Type': 'application/javascript' } });
          });
        })
    );
    return;
  }
  
  // Estratégia: Cache First para assets estáticos (ícones, imagens, etc.)
  if (url.pathname.startsWith('/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Qualquer outra requisição: Network First com fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // ✅ v167: NÃO cachear respostas de redirect (status 3xx)
        if (response.ok && !response.redirected) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Notificações push (preparado para futuro)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'Nova atualização no IAprova!',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'IAprova', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

console.log('📱 IAprova Service Worker v7.0 carregado!');
