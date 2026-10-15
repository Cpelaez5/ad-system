# Informe: Usuarios y Configuración IA (super_admin) rehechas

Fecha: 2026-10-15. Patrón cliente: EncabezadoPagina, PanelSiguientePaso, FiltroChips, SeccionLista, DialogoAdaptable, EstadoVacio. Colores solo con tokens del tema (claro y oscuro). Sin cambios en router, menú, migraciones ni Edge Functions.

## Usuarios (`src/views/admin/Usuarios.vue` + `src/components/admin/usuarios/`)
Subcomponentes: `FilaUsuario`, `DialogoUsuario`, `DialogoDetalleUsuario`, `DialogoPlanUsuario`, `DialogoBorrarUsuario`, `usuariosUtil.js`.

### Acciones conservadas
1. Invitar usuario (Edge Function `admin-invite-user`) con correo, nombre, apellido y rol; el diálogo queda abierto si falla.
2. Editar nombre, rol y estado activo (usuario y correo de solo lectura).
3. Activar o desactivar (interruptor "Usuario activo" al editar).
4. Reenviar invitación a pendientes (ya sin `confirm()`: el botón dice qué hace).
5. Ver detalles: datos, empresa, plan, fechas, rol y permisos.
6. Plan y prueba (`users.plan_id`, `users.trial_end`): "Prueba gratuita" más los planes de `plansService`.
7. Borrar en cascada (`delete_user_cascade`), solo super admin y nunca a un super_admin. NUEVO: hay que escribir el correo de la cuenta para habilitar el botón.
8. Búsqueda por nombre, usuario o correo.
9. Filtro por rol y por estado (FiltroChips con conteos); nuevo "Quitar filtros".
10. Organización (detalle y borrado), plan, fin de prueba y último acceso (en la fila).
11. Permisos por rol: el admin no puede asignar `super_admin`; `users.create` y `users.update` controlan Invitar, Editar, Plan y Reenviar; borrar solo super_admin.

Mejoras: panel "siguiente paso" (invitaciones pendientes), esqueleto de carga, error con Reintentar, estado vacío, avisos por el snackbar global en lugar de `alert()`.

### Hallazgo corregido
`userService.updateUser` no existía: editar un usuario fallaba. Se agregó (`first_name`, `last_name`, `role`, `is_active` sobre `users`). Depende de que las políticas RLS permitan al admin y al super_admin actualizar `users`.

## Configuración IA (`src/views/admin/AiSettings.vue` + `src/components/admin/ia/`)
Subcomponentes: `FilaPerfilIa`, `DialogoPerfilIa`, `iaUtil.js`.

### Acciones conservadas
1. Crear perfil (el primero queda en uso).
2. Editar (la llave en blanco conserva la actual).
3. Activar otro perfil (apaga todos y enciende uno).
4. Eliminar un perfil que no está en uso (ahora con diálogo de confirmación).
5. Estado de conexión del perfil en uso, deducido del último registro de uso.
6. Uso reciente (30 llamadas, con actualizar).
7. Laboratorio de pruebas (OCR y chat).
8. Proveedores Gemini y DeepSeek.

Nuevo: botón "Uso de IA" (`/admin/uso-ia`). La llave solo se ve como ••••1234 y la consulta ya no trae `encrypted_api_key` al navegador. Panel que avisa de llave rechazada, cuota agotada o falta de perfil.

Pendiente heredado: la llave se guarda en `encrypted_api_key` sin cifrar desde el cliente (cifrar en Edge Function o RPC; requiere backend).

## Verificación
Tests de componentes con servicios simulados (`Usuarios.test.js`, `AiSettings.test.js`; no existían tests previos de estas pantallas). Suite completa y build en verde. Íconos verificados contra `materialdesignicons.css`; detector impeccable sin hallazgos. Sin capturas: no hay sesión de super admin.
