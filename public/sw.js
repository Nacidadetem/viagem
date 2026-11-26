/* Service worker do app Ignez Andreazza
 * - guarda os arquivos estáticos para abrir mais rápido
 * - mostra uma página offline quando não há internet
 * - recebe notificações push (usado a partir do módulo de Comunicados)
 */
const VERSAO = "ia-v1";
const ESTATICOS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: sempre da rede (dados mudam); offline → página de aviso
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }
  // Arquivos do Next com hash no nome: cache primeiro
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
          return res;
        }),
      ),
    );
  }
});

self.addEventListener("push", (e) => {
  let dados = {};
  try { dados = e.data ? e.data.json() : {}; } catch { dados = { corpo: e.data && e.data.text() }; }
  const titulo = dados.titulo || "Condomínio Ignez Andreazza";
  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url: dados.url || "/inicio" },
      lang: "pt-BR",
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || "/inicio";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ("focus" in c) { c.navigate(destino); return c.focus(); }
      return self.clients.openWindow(destino);
    }),
  );
});
