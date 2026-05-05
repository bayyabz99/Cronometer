// Service Worker Önbellek Adı
const CACHE_NAME = 'stopwatch-cache-v1';

// Önbelleğe alınacak dosyalar
const urlsToCache = [
    './', // index.html
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap',
    'icons/icon-192x192.png', // İkonlar
    'icons/icon-512x512.png'
];

// Yükleme (Install) Olayı
self.addEventListener('install', event => {
    // Önbelleğe alma işlemini bekle
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Önbellek Açıldı');
                return cache.addAll(urlsToCache);
            })
    );
});

// Aktifleşme (Activate) Olayı
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    // Eski önbellekleri temizle
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Eski önbellek temizleniyor:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Getirme (Fetch) Olayı
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Önbellekte varsa, önbellekten yanıt ver
                if (response) {
                    return response;
                }
                // Önbellekte yoksa, ağdan iste
                return fetch(event.request).catch(error => {
                    console.log('Ağdan yükleme başarısız oldu:', error);
                    // Ağ başarısız olursa alternatif bir geri dönüş yapabilirsiniz (örneğin çevrimdışı sayfası)
                });
            })
    );
});
