'use strict';

/**
 * Service worker minimal.
 * Rôle actuel : mettre en cache l'app shell (HTML/CSS/JS/manifest/icônes)
 * pour rendre l'appli installable et utilisable hors-ligne pour sa coquille.
 * Aucune logique de données métier ici (calendrier, discours, etc.) —
 * ce sera ajouté plus tard si besoin (ex. cache des réponses API).
 */

const CACHE_VERSION = 'fx-terminal-shell-v8';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './auth.js',
  './supabase-config.js',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
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
// IMPORTANT : on ne touche JAMAIS aux requêtes vers d'autres origines
// (API Supabase, polices Google, CDN supabase-js, etc.) — seules nos
// propres pages/fichiers passent par le cache. Sinon un échec ponctuel
// (ex. 401 temporaire) resterait bloqué en cache indéfiniment.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

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
