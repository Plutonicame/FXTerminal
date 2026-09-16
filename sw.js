'use strict';

/**
 * Service worker minimal.
 * Rôle actuel : mettre en cache l'app shell (HTML/CSS/JS/manifest/icônes)
 * pour rendre l'appli installable et utilisable hors-ligne pour sa coquille.
 * Aucune logique de données métier ici (calendrier, discours, etc.) —
 * ce sera ajouté plus tard si besoin (ex. cache des réponses API).
 */

const CACHE_VERSION = 'fx-bias-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : cache d'abord pour l'app shell, avec repli réseau,
// et mise à jour silencieuse du cache quand le réseau répond.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
