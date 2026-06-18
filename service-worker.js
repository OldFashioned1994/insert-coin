/* ============================================================================
   INSERT COIN — service-worker.js
   Hace que la app sea "instalable" (PWA) y cargue rápido guardando una copia
   de los archivos. OJO: solo cachea los archivos propios; el tráfico de
   Firebase (el tiempo real) siempre va por red, nunca se cachea.

   ¿Cambiaste archivos y no ves la novedad? Subí el número de versión de abajo
   (v1 → v2). Eso obliga al celu a renovar la copia guardada.
   ============================================================================ */

const CACHE = "insert-coin-v14";

// Archivos propios de la app (la "cáscara").
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/base.css",
  "./css/hub.css",
  "./js/firebase-config.js",
  "./js/firebase.js",
  "./js/audio.js",
  "./js/player.js",
  "./js/room.js",
  "./js/chat.js",
  "./js/scoreboard.js",
  "./js/game-registry.js",
  "./js/hub.js",
  "./js/games/trivia/trivia.css",
  "./js/games/trivia/trivia.js",
  "./js/games/trivia/preguntas.js",
  "./assets/portada.jpg",
  "./assets/lobby.jpg",
  "./assets/pasillo.jpg",
  "./assets/snacks.jpg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/avatars/jason.png",
  "./assets/avatars/alien.png",
  "./assets/avatars/chucky.png",
  "./assets/avatars/pennywise.png",
  "./assets/avatars/freddy.png",
  "./assets/avatars/pinhead.png",
  "./assets/avatars/ghostface.png",
  "./assets/avatars/myers.png",
  "./assets/avatars/leatherface.png",
  "./assets/avatars/zombie.png",
  "./assets/avatars/jigsaw.png",
  "./assets/avatars/samara.png"
];

// Instalación: guardo una copia de los archivos (best-effort, sin romper si falla alguno).
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

// Activación: borro versiones viejas del caché.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Búsquedas: solo intervengo en MIS archivos (mismo origen y método GET).
// Lo de Firebase, Google Fonts y demás va siempre por red.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // recursos externos: red directa

  e.respondWith(
    caches.match(req).then((cacheado) =>
      cacheado ||
      fetch(req).then((resp) => {
        // Guardo una copia para la próxima (si salió bien).
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return resp;
      }).catch(() =>
        // Sin conexión y sin copia: si pedían una página, devuelvo el index.
        req.mode === "navigate" ? caches.match("./index.html") : undefined
      )
    )
  );
});
