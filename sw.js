// The app used to live at / with this worker. It now lives at /app/ with its own worker (app/sw.js).
// This replacement removes the old worker and its caches from devices that still have it.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('space-words-') && k !== 'space-words-fonts').map((k) => caches.delete(k)));
    await self.registration.unregister();
  })());
});
