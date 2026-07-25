const CACHE_NAME = 'product-preview-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/dataLoader.js',
    '/js/carousel.js',
    '/js/search.js',
    '/js/renderer.js',
    '/js/videoHandler.js',
    '/js/modal.js',
    '/manifest.json'
];

// 安装时缓存静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// 拦截请求：优先使用缓存，缓存没有则网络请求
self.addEventListener('fetch', event => {
    // 只缓存同源资源
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(networkResponse => {
                    // 只缓存成功的 GET 请求
                    if (event.request.method === 'GET' && networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }
                    return networkResponse;
                });
            })
    );
});