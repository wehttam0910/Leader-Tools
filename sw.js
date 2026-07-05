// LeaderTools Service Worker
// Strategy: network-first for HTML (always get latest on deploy),
// cache-first for static assets (fonts, icons, etc.)

const CACHE = 'leadertools-v78';

self.addEventListener('install', e => {
  // Don't cache index.html — always fetch fresh from network
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove ALL old caches on activate
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ignore non-http requests (chrome-extension://, etc.)
  if(!e.request.url.startsWith('http')) return;
  const url = new URL(e.request.url);

  // Always network-first for:
  // - HTML documents (index.html, navigation requests)
  // - Supabase API calls
  // - Anything on the same origin that could be updated
  const isHTML = e.request.mode === 'navigate' ||
    e.request.headers.get('accept')?.includes('text/html');
  const isSupabase = url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io');
  const isAPI = url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/rest') ||
    url.pathname.startsWith('/realtime');

  if (isHTML || isSupabase || isAPI) {
    // Network only — never serve stale HTML
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request) // offline fallback only
      )
    );
    return;
  }

  // Cache-first for true static assets (icons, fonts from CDN)
  const isStatic = url.hostname !== location.hostname ||
    /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname);

  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network first, no caching
  e.respondWith(fetch(e.request));
});
