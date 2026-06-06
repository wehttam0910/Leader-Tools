// LeaderTools Service Worker
// Caches the app shell for offline use and satisfies PWA installability criteria.

const CACHE = 'leadertools-v2';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for API calls (Supabase), cache-first for the app shell
  const url = new URL(e.request.url);
  const isSupabase = url.hostname.includes('supabase.co');
  const isCDN = url.hostname.includes('jsdelivr') || url.hostname.includes('googleapis');

  if (isSupabase || isCDN) {
    // Always go to network for data calls
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
