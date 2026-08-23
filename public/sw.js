const CACHE_NAME = 'fortia-hub-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon.png'
];

// Offline Fallback HTML
const OFFLINE_URL_RESPONSE = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mode Hors Ligne - FORTIA HUB</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #021231;
      color: #F8FAFC;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .card {
      background: #011D46;
      border: 1px solid rgba(214, 158, 37, 0.4);
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      background: #D69E25;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 28px;
      color: #021231;
    }
    h1 {
      font-size: 20px;
      color: #D69E25;
      margin: 0 0 12px;
    }
    p {
      font-size: 14px;
      color: #94A3B8;
      line-height: 1.5;
      margin: 0 0 20px;
    }
    button {
      background: #D69E25;
      color: #021231;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 800;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #FADF72;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">F</div>
    <h1>Mode Hors-Ligne (FORTIA HUB)</h1>
    <p>Vous êtes actuellement hors ligne. Vos contenus précédemment consultés restent accessibles. Reconnectez-vous à Internet pour charger les données récentes.</p>
    <button onclick="window.location.reload()">Réessayer la connexion</button>
  </div>
</body>
</html>
`;

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core PWA shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache version:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Smart Caching Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or browser extension URLs
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass API requests to ensure real-time backend communication
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // HTML Navigation Requests: Network First, Fallback to Cache, then Offline Page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/').then((rootResponse) => {
              if (rootResponse) return rootResponse;
              return new Response(OFFLINE_URL_RESPONSE, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            });
          });
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Images, Fonts, Icons): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignore network errors for static asset background updates
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for SKIP_WAITING from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
