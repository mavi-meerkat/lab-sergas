// Service worker de LAB SERGAS: la app funciona sin conexión.
const VERSION = "v9";
const SHELL = "shell-" + VERSION;
const AUDIO = "audio-v1";
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const PRECACHE = [
  "./", "index.html", "manifest.webmanifest", "css/app.css", "icons/icon.svg", "icons/icon-192.png",
  "js/app.js", "js/ctx.js", "js/ui.js", "js/util.js", "js/content.js", "js/store.js", "js/engine.js", "js/sim.js",
  "js/pregunta.js", "js/v-inicio.js", "js/v-leccion.js", "js/v-repaso.js", "js/v-examenes.js", "js/v-validar.js", "js/v-entrena.js", "js/imagenes.js", "js/cifras.js", "js/u-unidad.js", "js/u-arte.js", "js/u-guion.js", "js/u-voz.js",
  "js/firebase-config.js",
  FB + "firebase-app.js", FB + "firebase-auth.js", FB + "firebase-firestore.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("shell-") && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function audio(req) {
  const url = req.url.split("?")[0];
  const cache = await caches.open(AUDIO);
  const hit = await cache.match(url);
  if (hit) return hit;
  const r = await fetch(url, { mode: "cors", credentials: "omit" });
  if (r.ok && r.status === 200) cache.put(url, r.clone());
  return r;
}
async function shell(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true });
  const red = fetch(req).then((r) => {
    if (r.ok && r.status === 200) cache.put(req, r.clone());
    return r;
  }).catch(() => null);
  return hit || (await red) || (await cache.match("index.html")) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith("/indice.json")) return; // índice de voces: siempre de la red
    if (url.pathname.includes("/audio/")) return e.respondWith(audio(req));
    if (url.pathname.endsWith("content.json") || url.pathname.endsWith("content.enc")) return; // siempre de la red
    return e.respondWith(shell(req));
  }
  if (req.url.startsWith(FB)) return e.respondWith(shell(req));
});
