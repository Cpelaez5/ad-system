# Soporte: guías, asistente IA y tickets con el equipo (un solo chat)

Fecha: 2026-10-15. Pedido del usuario:

> Habilitar un sistema de tickets a través del chat de soporte… yo tenía pensado que el cliente por defecto hable con la IA, y que la IA, dependiendo del requerimiento, pueda decidir si abrir un ticket, y que desde el mismo chat pueda responder un super admin, pero lo veo muy complejo… recuerda que existirá el caso de que el cliente no tenga créditos de IA y la IA no le responda.

## Recomendación: "primero se ayuda solo, después la IA, siempre una persona"
Es el estándar de Intercom, Zendesk o Crisp (*bot-first con traspaso a humano*). La idea del usuario es correcta; lo que la vuelve simple es **un solo chat con tres capas y una regla**: **hablar con el equipo siempre está disponible y no gasta créditos.**

| Capa | Qué es | Costo | Cuándo |
|---|---|---|---|
| 1. **Guías** | Mientras escribe, el chat muestra las guías de `/ayuda` que coinciden (búsqueda por palabras, `src/utils/ayudaBusqueda.js`). Reemplaza los mensajes predefinidos viejos, que están desactualizados. | Gratis | Siempre |
| 2. **Asistente IA** | Responde citando las guías y los datos del propio negocio. | 0,2 créditos por pregunta (`diseno/uso-ia-por-cliente.md`) | Si quedan créditos |
| 3. **Equipo AD System** (ticket) | Una persona responde **en el mismo chat**. | Gratis | Siempre |

### La IA no abre tickets sola: los **sugiere**
- Si la IA no sabe (no está en las guías ni en los datos), o la pregunta habla de **cobros, pagos de suscripción, un error del sistema o datos que no cuadran**, debajo de su respuesta aparece **"¿Se lo pasamos al equipo?"**.
- Un toque convierte la conversación en ticket. Así el cliente no se sorprende, no se abren tickets basura y la decisión sigue siendo fácil.
- **Sin créditos de IA:** el chat lo dice con calma ("Tu asistente con IA ya usó los créditos de este mes") y ofrece las guías y el botón **"Escribirle al equipo"**. Nunca deja al cliente sin respuesta.

### Cómo se ve para el cliente (pensado primero para el teléfono)
- El mismo botón de chat de siempre. Arriba, dos pestañas: **"Asistente"** y **"Mis consultas"** (sus tickets, con su estado).
- Al pasar al equipo:
  - elige un tema con chips grandes: Pagos y mi plan · Algo no funciona · Duda fiscal o contable · Otra;
  - recibe un **número de consulta** legible (#AD-0042);
  - ve la promesa "Te respondemos en menos de 24 horas hábiles".
- Las respuestas del equipo llegan **en el mismo hilo**, con el nombre "Equipo AD System", en tiempo real. Si no está conectado, le llega un **correo** con un enlace al chat.
- Hay un punto rojo con los no leídos en el botón del chat y en la pestaña "Mis consultas".
- Al final, "¿Quedó resuelto?" 👍/👎. El cliente también puede cerrarla él: "Ya se resolvió".

### Cómo se ve para el equipo (panel del super admin → Operación → **Soporte**)
- **Bandeja** con filtros por estado y conteos: Nuevas · En curso · Esperando al cliente · Resueltas. Se ordena por antigüedad, con aviso visual si pasan más de 24 h sin respuesta.
- **Al abrir una consulta:**
  - el hilo completo, incluido lo que respondió la IA, y el contexto: negocio, plan, pantalla desde la que escribió y créditos de IA;
  - un cuadro para responder;
  - cambiar el estado, asignarla a un miembro del equipo y una nota interna que el cliente no ve.
- **Respuestas guardadas** (plantillas) editables, para las preguntas repetidas.

## Datos (reutiliza lo que ya existe)
- `support_conversations` ya tiene `mode` (ai | human) y `status` (active | closed | waiting_agent). Se agregan, sin FK nuevas hacia users/organizations:
  - `ticket_numero` (serial legible);
  - `categoria` y `prioridad`;
  - `asignado_a` (uuid);
  - `estado_ticket` (nuevo | en_curso | esperando_cliente | resuelto);
  - `ultimo_mensaje_en`;
  - `no_leidos_cliente` y `no_leidos_equipo`;
  - `resuelto_en` y `calificacion`.
- `support_messages.role` ya admite `agent` y `system`. Se agrega `interno boolean` para las notas del equipo, que el cliente nunca lee: lo garantiza la RLS.
- **Tiempo real:** agregar `support_messages` a la publicación `supabase_realtime`. Hoy no hay ninguna tabla publicada.
- **Correo:** al responder el equipo, si el cliente no leyó en 10 minutos, se le avisa. Puede reutilizar el patrón de `avisos-vencimiento` (Resend).

## Fases
1. Capas 1 y 3: guías en el chat, "Escribirle al equipo", bandeja del super admin, respuesta en tiempo real y estados. Funciona aunque no haya créditos.
2. La IA sugiere escalar, con el resumen automático del problema adjunto al ticket.
3. Correo de aviso, respuestas guardadas, asignación y métricas (tiempo de primera respuesta, % resueltas, satisfacción).
