# Notificaciones push

Avisos al teléfono o computador aunque la app esté cerrada (Web Push, todos los roles).

## Cómo funciona
1. Después de iniciar sesión, a los 4 segundos aparece una hoja amable (`SolicitudPush.vue`): "¿Te avisamos cuando pase algo importante?". Nunca se pide el permiso en frío. "Ahora no" no vuelve a preguntar por 7 días (`localStorage ad_push_pregunta`). Si el permiso está bloqueado no se insiste.
2. "Sí, avísame" pide el permiso, suscribe el dispositivo (clave pública VAPID) y guarda la fila en `push_suscripciones` (RLS: cada quien ve solo las suyas).
3. Configuración tiene "Avisos en este dispositivo" (`AvisosDispositivo.vue`): interruptor, estado y explicación si está bloqueado. En iPhone solo funciona con la app agregada a la pantalla de inicio; se explica con palabras simples.
4. Al cerrar sesión se borra la suscripción de ese dispositivo (otra persona en el mismo equipo no recibe los avisos).
5. Envío: `notificar()` inserta en `notificaciones` -> trigger -> Edge Function `despachar-notificacion` (web-push, clave privada de Vault `vapid_privada`). Suscripciones 404/410 se borran solas.
6. `public/sw.js` muestra la notificación y al tocarla abre o enfoca la app en la URL indicada.

## Avisos activos
- El equipo responde un ticket: avisa al dueño. URL `/cliente/inicio?soporte=<id>` (abre la consulta).
- Un negocio escribe en un ticket: avisa a los super admin. URL `/admin/soporte?c=<id>`.

## Pendientes (futuros avisos, no implementados)
- Vencimiento de papeles (RIF, patente, etc.) cerca de la fecha.
- Recordatorio de tasas manual, lunes a viernes, si no hay tasa del día.
- Declaraciones fiscales próximas a vencer.
- Resumen semanal para el contador.
