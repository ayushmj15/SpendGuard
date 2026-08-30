/* Minimal service worker so the app meets browser installability
   criteria (Chrome/Edge/Android fire beforeinstallprompt only when a
   service worker is registered). Requests pass through untouched. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response("", { status: 503, statusText: "Offline" });
      }),
    );
    return;
  }
  event.respondWith(fetch(event.request));
});
