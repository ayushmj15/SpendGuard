/* Offline-capable service worker for SpendGuard (Next.js App Router).
   Bump CACHE_VERSION to invalidate all caches on deploy/update. */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `spendguard-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `spendguard-static-${CACHE_VERSION}`;
const PAGE_CACHE = `spendguard-pages-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-icon.png",
  "/logo.svg",
];

/* Cache URLs: asset -> relative resource path (if any) */
const KNOWN_IMAGE_EXT = /\.(png|jpe?g|webp|svg|gif|avif|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      // Best-effort precache of the install shell; failures are non-fatal.
      return Promise.allSettled(
        SHELL_ASSETS.map((url) =>
          fetch(url).then((res) => {
            if (res.ok) cache.put(url, res.clone());
          }),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("spendguard-") && !key.includes(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok && request.method === "GET") {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last resort: serve the cached home page shell.
    const shell = await caches.match("/manifest.webmanifest");
    if (shell) {
      return new Response(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><div style='font-family:system-ui;padding:24px;text-align:center'><h1>You're offline</h1><p>Reconnect to keep using SpendGuard.</p></div>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cached || networkPromise || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Navigation / document requests: network-first (works offline via cache).
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const path = new URL(request.url).pathname;

  // Service worker itself: never cache.
  if (path === "/sw.js") {
    event.respondWith(fetch(request));
    return;
  }

  // Hashed, immutable build assets + static/media: cache-first (SWR).
  if (path.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Public assets (icons, images, fonts): cache-first (SWR).
  if (KNOWN_IMAGE_EXT.test(path) || path.startsWith("/logo")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else (API, data, other GET): network-first, no caching of bodies
  // we didn't opt into, but fall back to cache if available.
  event.respondWith(networkFirst(request));
});
