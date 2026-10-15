# Sesión: pedir la contraseña tras un tiempo sin actividad

Fecha: 2026-10-15. Pedido del usuario: "durante la sesión, si no hay actividad durante un tiempo determinado, aparezca un diálogo y pida volver a colocar la contraseña, para poder extender la sesión, para todos los tipos de usuario".

## Comportamiento
- **Inactividad:** no hay mouse, teclado, toque, scroll ni foco en la pestaña. El tiempo es configurable y por defecto **20 minutos**, igual para todos los roles. Más adelante podrá cambiarlo el super admin.
- **Aviso previo:** 1 minuto antes aparece un aviso discreto: "Por tu seguridad, cerraremos con candado en 60 s · Sigo aquí". Cualquier actividad lo cancela.
- **Pantalla bloqueada:** la app queda detrás de un velo opaco con desenfoque, para que **no se vean los datos**. Encima aparece un diálogo que **no se puede cerrar** sin decidir:
  - nombre y correo del usuario (solo lectura);
  - el campo **Contraseña** con mostrar u ocultar, y el botón **"Continuar"**;
  - el enlace **"No soy yo · Cerrar sesión"**.
- **Verificación:** con `supabase.auth.signInWithPassword` usando el **mismo correo**. Al acertar se renueva la sesión y se sigue exactamente donde estaba: los formularios abiertos **no se pierden**.
- **Intentos:** después de 5 contraseñas equivocadas se cierra la sesión.
- **Varias pestañas:** la última actividad y el estado de bloqueo se comparten (`localStorage` + `BroadcastChannel`). Si una pestaña se usa, las otras no se bloquean; si se bloquea una, se bloquean todas, y al desbloquear una se desbloquean todas.
- **Tareas largas:** mientras se sube un archivo o se espera a la IA no se bloquea. Esas acciones marcan actividad.
- **Si la sesión de Supabase venció** mientras estaba bloqueada, el mismo diálogo la renueva al ingresar la contraseña.
- **Fuera de alcance:** las páginas públicas (login, landing, ayuda) y los usuarios sin contraseña (si en el futuro se entra con Google, se mostrará "Volver a entrar con Google").

## Implementación
- `src/composables/useInactividad.js`: temporizador, eventos y sincronización entre pestañas; lógica pura con tests usando tiempo simulado.
- `src/components/layout/BloqueoInactividad.vue`: el aviso previo y el diálogo de bloqueo. Se monta una sola vez en `AppShell.vue` (todas las pantallas con sesión y todos los roles).
- Accesible: el foco va al campo de contraseña, Enter envía, y el texto se anuncia a los lectores de pantalla.
