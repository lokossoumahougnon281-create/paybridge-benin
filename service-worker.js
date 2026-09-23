/**
 * PayBridge Bénin - PWA Service Worker (service-worker.js)
 * Stratégie de mise en cache pour fonctionnement rapide et résilient hors-ligne
 */

const CACHE_NAME = 'paybridge-v1-static';

const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/components.css',
    '/css/operators.css',
    '/js/app.js',
    '/js/config.js',
    '/js/transfer.js',
    '/js/auth.js',
    '/js/admin.js',
    '/js/history.js',
    '/js/smsNotifications.js',
    '/js/calculator.js',
    '/icons/icon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Installation : Mise en cache des ressources critiques
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Préchauffage du cache statique PayBridge');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation : Nettoyage des anciennes versions de caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interception des requêtes réseau (Fetch Strategy)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Requêtes API (/api/v1/...) : Réseau en priorité, avec fallback JSON offline
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({
                        success: false,
                        offline: true,
                        message: 'Vous êtes actuellement hors-ligne. Veuillez vérifier votre connexion Internet.'
                    }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    }
                );
            })
        );
        return;
    }

    // 2. Navigation vers des pages HTML : Network-First avec fallback vers index.html en cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match('/index.html') || caches.match('/');
            })
        );
        return;
    }

    // 3. Fichiers Statiques (CSS, JS, Fonts, Images) : Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // En cas d'erreur réseau, cachedResponse sera retourné
            });

            return cachedResponse || fetchPromise;
        })
    );
});
