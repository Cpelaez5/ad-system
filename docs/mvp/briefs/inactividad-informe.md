# Informe: bloqueo de sesión por inactividad

Especificación: `docs/mvp/diseno/sesion-inactividad.md`.

## Qué se hizo
- `src/composables/useInactividad.js`: `crearControlInactividad` (lógica pura), `useInactividad` (envoltorio Vue), `marcarActividad()` exportada, `umbralDesdeUrl`.
  - Umbral 20 min, aviso 60 s antes (nunca más de la mitad del umbral).
  - Eventos con throttle de 1 s: mousemove, keydown, pointerdown, touchstart, scroll, wheel, y visibilitychange al volver.
  - Claves `ad_ultima_actividad` y `ad_sesion_bloqueada` en localStorage, más `BroadcastChannel` si existe. Si una pestaña se bloquea, se bloquean todas; al desbloquear una, se desbloquean todas.
  - El bloqueo persiste al recargar. Se guarda el correo del dueño: un bloqueo de otra cuenta no se hereda.
- `src/components/layout/BloqueoInactividad.vue`: aviso previo con cuenta atrás y "Sigo aquí"; diálogo persistente (sin Esc ni clic afuera) sobre velo opaco con desenfoque; contraseña con mostrar/ocultar; Enter envía; foco al campo.
  - Verifica con `signInWithPassword({ email: <correo actual>, password })`. Si la sesión devuelta es de otro correo, no desbloquea.
  - 5 intentos equivocados cierran la sesión (el contador sobrevive a recargar, en sessionStorage). Los errores de red y el límite de intentos de Supabase (429) no cuentan como intento.
  - Desbloquear solo quita el velo: no recarga ni navega.
  - "No soy yo" emite `cerrar-sesion`, que en `AppShell` llama al mismo `logout()` del menú (`userService.logout`).
- `AppShell.vue`: se monta una sola vez, solo si hay `currentUser.email`. No se activa en páginas públicas.

## Probar a mano sin esperar 20 min
Solo en desarrollo (`import.meta.env.DEV`): añade `?inactividad=10` (segundos) a la URL, por ejemplo `/cliente/inicio?inactividad=10`. En el build de producción el parámetro se ignora.

## Tests
- `tests/components/useInactividad.spec.js`: umbral, aviso, actividad que reinicia, throttle, sincronía entre pestañas simulada, persistencia y limpieza, parámetro de URL.
- `tests/components/BloqueoInactividad.spec.js`: desbloqueo correcto e incorrecto con supabase simulado, 5 intentos, correo distinto, error de red, cerrar sesión.
- `e2e/16-inactividad.spec.js`: se salta salvo con `E2E_DEV_SERVER=1` y `E2E_BASE_URL` apuntando a un `vite dev`. No se ejecutó con Playwright test: el escenario (aviso, bloqueo, "Cerrar sesión" visible) se verificó con las capturas en el dev server.

## Capturas
`docs/mvp/briefs/capturas/inactividad-{aviso,bloqueo}-{escritorio,movil}-{claro,oscuro}.png`.

## Notas y pendientes
- Las tareas largas pueden llamar a `marcarActividad()`. No se enganchó en el chat de IA ni en las subidas para no tocar archivos ajenos. Pendiente: llamarla al subir archivos y mientras se espera a la IA.
- En las capturas de dev los íconos MDI salen como cuadros vacíos (la fuente no cargó en ese entorno). Los íconos usados (`mdi-lock-outline`, `mdi-eye-outline`, `mdi-eye-off-outline`) existen en `materialdesignicons.css`.
- En móvil, el banner de cookies queda debajo del aviso previo. No se tocó.
- Si en el futuro se entra con Google, falta "Volver a entrar con Google".
- El umbral configurable por el super admin queda como prop `umbralMs`, sin pantalla.
