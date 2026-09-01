/* Service Worker: App-Dateien cache-first.

   Pal-Icons und Habitat-Karten liegen auf fremden Hosts und werden hier
   bewusst NICHT abgefangen. Grund ist Vorsicht, kein beobachteter Fehler:
   <img>-Anfragen an fremde Origins liefern "opaque responses" (status 0),
   und Chrome rechnet jeden solchen Cache-Eintrag mit einem Padding von
   mehreren MB aufs Speicherkontingent an. Bei knapp 300 Icons waere die
   Quota schnell erreicht. Den normalen HTTP-Cache des Browsers nutzen die
   Bilder weiterhin.
   Folge: die App laeuft offline, die Bilder brauchen beim ersten Ansehen
   aber eine Verbindung. Falls das im Alltag stoert, ist der naechste Schritt,
   die Icons im Generator herunterzuladen und lokal auszuliefern.

   WICHTIG bei Updates: CACHE_NAME hochzaehlen, sonst liefert der Cache
   die alte Version aus. */
const CACHE_NAME = 'palworld-v1';

const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './paldex.js',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Fremde Origins (Bilder) gar nicht erst abfangen - siehe Kommentar oben.
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
