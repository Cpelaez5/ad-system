/* Service worker de AD System: solo avisos (push). Sin caché de archivos. */
const ICONO = '/logo/android-chrome-192x192.png';
const INSIGNIA = '/logo/favicon-32x32.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch (e) {
    datos = { titulo: 'AD System', cuerpo: event.data ? event.data.text() : '' };
  }
  const titulo = datos.titulo || 'AD System';
  const opciones = {
    body: datos.cuerpo || '',
    icon: ICONO,
    badge: INSIGNIA,
    tag: datos.tag || 'ad-system',
    renotify: true,
    data: { url: datos.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if (new URL(v.url).origin === self.location.origin) {
        try {
          await v.focus();
          if ('navigate' in v) await v.navigate(destino);
          return;
        } catch (e) { /* si falla, abre una ventana nueva */ }
      }
    }
    await self.clients.openWindow(destino);
  })());
});

// El navegador cambió la suscripción: se vuelve a crear con la misma clave y se avisa a la app
// (quien tenga sesión abierta la guarda; si no hay ventana, la app la sincroniza en el próximo inicio de sesión).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const opciones = (event.oldSubscription && event.oldSubscription.options) || { userVisibleOnly: true };
      const nueva = event.newSubscription || await self.registration.pushManager.subscribe(opciones);
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      ventanas.forEach((v) => v.postMessage({ tipo: 'push-resuscrita', suscripcion: nueva.toJSON() }));
    } catch (e) { /* sin acción: la app re-sincroniza al iniciar sesión */ }
  })());
});
