/* Service Worker.

   Strategie: NETWORK-FIRST fuer eigene Dateien, Cache nur als Rueckfall.

   Vorher war es cache-first. Das hat dazu gefuehrt, dass ein Geraet, das die
   App einmal geladen hatte, Updates NIE mehr gesehen hat - auch nicht nach
   Neustarts. Cache-first liefert die alte Datei aus, ohne ueberhaupt
   nachzufragen, und solange sich sw.js selbst nicht aendert, faellt das nicht
   auf. Man muesste bei jedem Deploy daran denken, CACHE_NAME hochzuzaehlen;
   genau das ist einmal vergessen worden.

   Network-first kostet praktisch nichts: GitHub Pages liefert ETags, ein
   unveraendertes paldex.js kommt also als 304 ohne Inhalt zurueck. Offline
   greift weiterhin der Cache, die App laeuft also vollstaendig ohne Netz.

   Pal-Icons und Habitat-Karten liegen auf fremden Hosts und werden bewusst
   nicht abgefangen: <img>-Anfragen an fremde Origins liefern "opaque
   responses", die Chrome mit mehreren MB Padding aufs Speicherkontingent
   anrechnet - bei knapp 300 Icons waere die Quota schnell erreicht. Die
   Bilder nutzen den normalen HTTP-Cache des Browsers. */

const CACHE_NAME = 'palworld-v2';

const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './paldex.js',
  './guide.js',
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
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Frische Antwort gleich in den Cache legen, damit Offline aktuell bleibt
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))   // offline: das Letzte, was wir haben
  );
});
