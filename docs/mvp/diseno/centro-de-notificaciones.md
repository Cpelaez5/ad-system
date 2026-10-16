# Centro de notificaciones: campanita, correo y preferencias por evento

Fecha: 2026-10-16. Pedido del usuario:

> No veo el ícono de la campanita en el header. La idea es que todas las notificaciones lleguen ahí, que todas lleguen también por correo, y que el usuario pueda configurar según el evento qué le llega al correo y qué no. **Super importante las notificaciones y correos sobre los tickets y el chat de soporte.**

## Regla central: un solo lugar para crear avisos

Todo aviso del sistema se crea con **una función SQL** `notificar(...)`, que inserta una fila en `notificaciones`. A partir de esa fila, un despachador decide los canales según las preferencias de cada persona:

```
evento (trigger / cron / app) ──► notificar(user_ids, tipo, titulo, cuerpo, url, datos)
                                       │  inserta en notificaciones (1 fila por persona)
                                       ▼
                     trigger AFTER INSERT ──► pg_net ──► Edge Function `despachar-notificacion`
                                                            ├─ campanita: siempre (es la fila misma, en tiempo real)
                                                            ├─ push: si preferencia push = sí (reusa la lógica de enviar-push)
                                                            └─ correo: si preferencia correo = sí (Resend)
```

- **La campanita siempre recibe todo.** Es la bandeja. Solo se puede apagar el correo y el push, no la campanita.
- Así, el próximo aviso que se agregue (SENIAT, tasas, pagos) solo llama a `notificar` y hereda campanita, push, correo y preferencias.

## Catálogo de eventos (v1)

| Tipo | Para | Cuándo | Correo por defecto | Push por defecto |
|---|---|---|---|---|
| `soporte_respuesta` | cliente | El equipo respondió su consulta (incluye capturas) | **Sí** | Sí |
| `soporte_estado` | cliente | Su consulta cambió de estado (resuelta, esperando tu respuesta) | **Sí** | Sí |
| `soporte_nueva` | super_admin | Un negocio abrió una consulta (ticket) | **Sí** | Sí |
| `soporte_mensaje_cliente` | super_admin | El cliente escribió en una consulta abierta | **Sí** | Sí |
| `papel_por_vencer` | cliente | Un papel vence en 30, 7 o 1 días, o venció | Sí | Sí |
| `pago_plan` | cliente | Factura del plan por vencer, o pago aprobado o rechazado | Sí | Sí |
| `pago_reportado` | super_admin | Un negocio reportó un pago | Sí | Sí |
| `tasa_recordatorio` | cliente con tasa manual | Lunes a viernes, si no actualizó la tasa | No | Sí |
| `seniat_pendiente` | cliente | Hay una quincena o un mes listo para declarar | Sí | Sí |
| `uso_ia` | cliente | Usó el 80 % o el 100 % de su asistente del mes | No | No |

- En v1 se conectan los eventos de **soporte**, que son la prioridad pedida, y `papel_por_vencer`.
- `papel_por_vencer` ya existe por correo en `avisos-vencimiento`. Ahora también llega a la campanita y respeta la preferencia.
- Los demás quedan en el catálogo y en la pantalla de preferencias, marcados como "Pronto" (sin interruptor activo), y anotados como pendientes.

### Soporte, en detalle (prioridad)

- **El equipo responde** → el cliente recibe "Te respondió el equipo de AD System · Consulta #AD-0042", con las primeras líneas de la respuesta y el botón **"Ver respuesta"**, que abre el chat en esa consulta (`?soporte=<id>`).
  - El correo dice cuántas capturas hay, pero no las adjunta: el archivo queda privado.
- **Nota interna** → nunca notifica al cliente.
- **Mensajes seguidos** → si el equipo manda 3 mensajes en 2 minutos, el **correo** se agrupa: se manda uno solo, 2 minutos después del primero, con todos los mensajes.
  - La campanita y el push sí reciben cada mensaje.
  - Mecanismo: el despachador retrasa el correo de `soporte_*` y, al enviarlo, junta los no enviados de la misma consulta.
- **Si el cliente ya lo leyó en el chat** dentro de esos 2 minutos, no se manda correo, porque ya lo vio. Se usa `no_leidos_cliente = 0`.
- **Para el super admin:** consulta nueva o mensaje del cliente → "Nueva consulta #AD-0042 · Pagos y mi plan · *Negocio X*", con el botón **"Responder"** (`/admin/soporte?c=<id>`).

## Datos

**`notificaciones`:**
- **Columnas:** `id`, `user_id` (uuid, **sin FK**; ver la regla de embeds), `tipo`, `titulo`, `cuerpo`, `url` (ruta interna que empieza con `/`), `datos` (jsonb), `agrupar` (texto, p. ej. `soporte:<conversation_id>`), `leida_en`, `push_enviado_en`, `correo_enviado_en`, `correo_omitido` (motivo), `created_at`.
- **RLS:** cada usuario lee y marca las suyas (`user_id = auth.uid()`), y borra las suyas. No hay insert directo: solo vía `notificar()`, que es SECURITY DEFINER y queda ejecutable solo por `service_role` y por los triggers internos.

**`preferencias_notificacion`:**
- **Columnas:** (`user_id`, `tipo`) como PK, `correo` boolean y `push` boolean, sin FK.
- Si no hay fila se usan los valores por defecto del catálogo. La tabla SQL `notificacion_tipos` (tipo, nombre, descripcion, para_rol, correo_def, push_def, activo) guarda el catálogo, así el super admin puede editar textos y valores por defecto más adelante.

**Retención:** las notificaciones leídas de más de 90 días se borran con un cron semanal.

## Campanita (todos los roles)

- **Dónde:** en `BarraSuperior`, en todos los tamaños, a la izquierda del menú de usuario.
- **Ícono:** `mdi-bell-outline`; con no leídas, `mdi-bell-badge-outline` más un número (máximo "9+"). El área táctil mide 44 px.
- **Teléfono:** abre una hoja a pantalla casi completa (DialogoAdaptable).
- **Escritorio:** abre un panel desplegable de 400 px con un alto máximo del 70 % de la pantalla.
- **Contenido:**
  - encabezado "Avisos" con un enlace "Marcar todo como leído";
  - grupos **Hoy**, **Esta semana** y **Antes**;
  - cada aviso muestra el ícono de su tipo (soporte, papel, pago…), el título en negrita si no está leído, el cuerpo en 2 líneas y la hora relativa ("hace 5 min"), más un punto granate si no está leído;
  - al tocar un aviso se marca como leído y se navega a su `url`;
  - al pie, "Elegir qué me llega por correo" lleva a Configuración → Avisos.
- **Estado vacío:** "No tienes avisos. Aquí te contaremos cuando el equipo te responda o se acerque un vencimiento."
- **Tiempo real:** suscripción a `notificaciones` filtrada por `user_id`.
  - Al llegar un aviso: sube el contador y suena el tono suave de `useSonidoMensaje`, que respeta el silencio.
  - Si el aviso es de soporte y el chat ya está abierto en esa consulta, se marca como leído solo.
- **Lectura sincronizada:** al abrir el chat en una consulta, sus avisos de soporte se marcan como leídos. La campanita y el chat no muestran no leídos distintos.

## Configuración → Avisos

Por cada evento de su rol, una fila con nombre y descripción, y dos interruptores: **Correo** y **En este teléfono o computador** (push). El interruptor de push se desactiva si este dispositivo no tiene permiso, con el texto "Actívalo arriba".

Arriba está la tarjeta actual "Avisos en este dispositivo" (`AvisosDispositivo`) y un botón **"Enviarme un correo de prueba"** para comprobar que llegan.

## Correo

- **Remitente:** el `RESEND_FROM_EMAIL` existente. Asunto = título.
- **Plantilla HTML** simple y accesible:
  - logo en texto "AD System" con la barra granate;
  - título, cuerpo y un botón "Ver en AD System" que apunta a `https://adsystemapp.com` + `url`;
  - pie: "Recibes este correo porque tienes activados los avisos de *{nombre del evento}*. Cámbialo en Configuración → Avisos" (enlace).
  - Funciona en modo oscuro de los clientes de correo: colores de texto explícitos y sin fondos blancos forzados.
- Si falta `RESEND_API_KEY`, el despachador marca `correo_omitido = 'sin_configuracion'` y no falla. Se agrega una línea en `super-admin-pendientes.md`.
