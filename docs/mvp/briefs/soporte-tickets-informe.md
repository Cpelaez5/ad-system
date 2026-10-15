# Soporte con tickets en el mismo chat: informe

Fases 1 y 2 completas; de la fase 3, solo las respuestas guardadas. Sin correos. Sin migraciones ni cambios en Edge Functions.

## Qué se hizo
- **Chat del cliente** (`SupportChat.vue` + `src/components/soporte/`): pestañas Asistente y Mis consultas; guías mientras escribe (`/ayuda/:slug`); IA; "Escribirle al equipo" siempre visible (tema con chips grandes + mensaje); hilo en tiempo real con "Equipo AD System"; punto rojo en el botón flotante y en la pestaña; `no_leidos_cliente = 0` al abrir; "Ya se resolvió" y 👍/👎. En modo humano la IA ya no responde en ese hilo (el hilo es solo con el equipo).
- **Sin créditos o fallo de la IA:** `chatService` propaga `SIN_CREDITOS`; la pantalla muestra el mensaje de la especificación, guías y "Escribirle al equipo". Plan sin IA y fallos genéricos tienen la misma salida.
- **Fase 2:** instrucción en el mensaje de sistema para terminar con `[[ESCALAR]]` (la UI la oculta), palabras clave en la pregunta y frases de "no sé". Ofrece "¿Se lo pasamos al equipo?". Lógica pura en `src/utils/soporte.js`.
- **Mensajes predefinidos viejos eliminados** de `chatService.js`.
- **Bandeja** `/admin/soporte` (super_admin; grupo Operación del menú y portada): filtros con conteos, orden por antigüedad, aviso de más de 24 h, hilo completo con IA y notas, contexto (negocio, cliente, plan, pantalla), responder, nota interna, estado, prioridad, asignarme, tiempo real, `no_leidos_equipo = 0` al abrir y respuestas guardadas.

## Decisiones y límites
- **Resumen del ticket:** la RLS no deja que el cliente inserte mensajes `system`, así que el resumen (tema, pantalla, últimas preguntas) va en `support_conversations.metadata.resumen` y la bandeja lo muestra al inicio del hilo como "Resumen del problema".
- **Respuestas guardadas:** viven en `localStorage` del navegador del admin (no se comparten entre admins). Pendiente: pasarlas a una tabla.
- **Conversación perezosa:** ya no se crea una fila al abrir el chat; se crea al primer mensaje o al escribir al equipo.
- **Contexto del negocio** en la bandeja: consultas separadas a `users`, `clients` (`company_name`), sin embeds. No muestra créditos de IA (no hay dato aún).
- **Teléfono:** el botón flotante no existe en móvil. El chat emite `ad-soporte-no-leidos` ({ cantidad }); `HojaMas.vue` aún no lo escucha para mostrar el punto en "Ayuda" (queda anotado).
- Un ticket nuevo desde "Escribirle al equipo" convierte la conversación actual en ticket; el asistente empieza una nueva.

## Verificación
- Vitest completo y `npm run build` en verde. Tests nuevos: `tests/utils/soporte.spec.js`, `tests/components/SupportChat.spec.js` (reescrito), `tests/services/chatService.spec.js`, `src/views/admin/__tests__/Soporte.test.js`; ajustados `menuPorRol.spec.js` y `PanelOperacion.test.js`.
- E2E `e2e/16-soporte.spec.js` (abre, ve "Escribirle al equipo", cancela). No se pudo correr con el runner (su `global-setup` inicia sesión de ambos roles); sus pasos se ejercieron en el script de capturas, sin enviar nada.
- Capturas en `docs/mvp/briefs/capturas/soporte-{asistente,escribir-equipo,mis-consultas}-{escritorio,movil}.png`. No se creó ningún ticket, mensaje ni cuenta.
