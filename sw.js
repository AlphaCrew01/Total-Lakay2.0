// sw.js - Service Worker pour Total Lakay

const CACHE_NAME = 'total-lakay-v7';
const urlsToCache = [
  './',
  'index.html',
  'app.js',
  'style.css',
  'logo.jpeg',
  'manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activé');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie: Cache First, puis Network
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Firebase
  if (event.request.url.includes('firestore') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('firebase')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourne le cache si trouvé
        if (response) {
          return response;
        }
        // Sinon, fait la requête réseau et met en cache
        return fetch(event.request)
          .then(response => {
            // Vérifie que la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone la réponse pour la mettre en cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Retourne une page hors-ligne si disponible
            if (event.request.mode === 'navigate') {
              return caches.match('index.html');
            }
          });
      })
  );
});
