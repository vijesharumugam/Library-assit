const CACHE_NAME = 'library-app-v2';
const STATIC_CACHE = 'library-static-v2';
const API_CACHE = 'library-api-v2';

// Essential files that should be cached immediately
const urlsToCache = [
  '/',
  '/auth',
  '/manifest.json'
];

// API endpoints that can be cached for short periods
const API_CACHE_PATTERNS = [
  '/api/user',
  '/api/books',
  '/api/books/available'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache.map(url => new Request(url, {
          credentials: 'same-origin'
        })));
      }),
      caches.open(STATIC_CACHE),
      caches.open(API_CACHE)
    ]).catch((error) => {
      console.log('Failed to initialize caches:', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  const expectedCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to different origins
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }

  // Handle navigation requests with network-first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigation(event.request));
    return;
  }
});

// Network-first strategy for API requests
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isCacheableAPI = API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern));
  
  try {
    const response = await fetch(request);
    
    // Cache successful API responses for cacheable endpoints
    if (response.ok && isCacheableAPI) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cache for cacheable APIs
    if (isCacheableAPI) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    }
    throw error;
  }
}

// Cache-first strategy for static assets
async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    throw error;
  }
}

// Network-first strategy for navigation
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Fallback to root for navigation requests
    return caches.match('/');
  }
}

// Check if the request is for a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname.startsWith('/assets/') || 
         pathname.includes('@vite') ||
         pathname.includes('node_modules');
}

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    // Here you could sync any pending data when connection is restored
  }
});

// Push notification support (for future features)
self.addEventListener('push', (event) => {
  console.log('Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New library notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Library Management', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});