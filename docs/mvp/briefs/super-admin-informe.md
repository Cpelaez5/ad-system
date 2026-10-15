# Informe: primeras herramientas del panel del super admin

Fecha: 2026-10-15. Rama del worktree `worktree-agent-a7272779b7ccb8ba5`.

## Qué se construyó
Rutas bajo `/admin/...`, solo `super_admin` (mismo guard por `meta.roles` que `/admin/ai-settings`). Menú: grupo "Operación" en el bloque super_admin de `menuPorRol.js`.

| Ruta | Pantalla | Lo esencial |
|---|---|---|
| `/admin/operacion` | `OperacionPortada.vue` | Siguiente paso + 3 tarjetas con enlace (por verificar, errores de IA 7 días, días sin tasa) y lista estática de lo que sigue pendiente |
| `/admin/catalogo` | `CatalogoGlobal.vue` | Proveedores / Productos; filtros Por verificar (por confirmaciones) · Verificados · Todos; buscador; Verificar / quitar verificación, Editar, Eliminar con confirmación, Subir foto de estudio, Agregar (`fuente: 'equipo'`, validando RIF J/G/C + 9 dígitos y código de barras), Importar Excel (upsert por código, `fuente: 'importado'`) |
| `/admin/uso-ia` | `UsoIa.vue` | Período 7/30/90 días, cifras, gráfico por día (`GraficoBarras` con la nueva prop `formato="entero"`), tabla por modelo, top de errores con último mensaje; solo cuenta usuarios distintos |
| `/admin/tasas` | `TasasGlobales.vue` | Últimos 60 días hábiles x 5 monedas con fuente, huecos marcados y "Faltan N días", diálogo "Corregir o agregar tasa" con confirmación (upsert `MANUAL-SUPERADMIN`) |

Lógica pura con tests: `src/utils/catalogoAdmin.js`, `usoIa.js`, `tasasAdmin.js`. Acceso a datos: `src/services/superAdminService.js`.

## Decisiones y notas
- **"Generar con IA" queda en "Próximamente"** (botón deshabilitado en el menú de cada producto). La función `producto-ia` acción `mejorar` exige una ruta del bucket privado `productos` con el formato `<organización>/<cliente>/…` y verifica que pertenezca a la empresa de quien llama; no sirve para el catálogo sin cambiar la Edge Function (prohibido aquí). Anotado en `super-admin-pendientes.md`.
- **Privacidad:** nada lee `catalogo_aportes`; solo se muestra el número de confirmaciones. El uso de IA no trae correos ni nombres; `user_id` solo se cuenta.
- **Importar Excel** reutiliza `detectarEncabezados`, `sugerirMapeo`, `filasDesdeMatriz`, `parseUnidad` y `leerArchivo`. Si un código ya existe, un dato vacío del Excel no borra el que había (`fusionarSemilla`); no pisa `foto_path`, `verificado` ni `confirmaciones`.
- **Uso de IA:** se pagina de 1.000 en 1.000 (límite de PostgREST) hasta 10.000 filas; si se alcanza, aviso en pantalla. Error = `status` distinto de `success` (incluye nulo).
- **Huecos de tasas:** día hábil pasado sin ninguna tasa. Hoy sin tasa todavía no cuenta. Los feriados aparecen como huecos (el texto lo aclara).
- Dependencia de `exchange_rates` solo-lectura (migración `20261015140000`): ya está en esta rama. No se hicieron migraciones ni cambios en Edge Functions.
- Cambios compartidos mínimos: 4 rutas y 4 imports en `src/router/index.js`, un grupo en `menuPorRol.js` y su test, y la prop `formato` de `GraficoBarras.vue` (por defecto `moneda`, sin cambio para los demás).

## Pruebas
- Vitest: utilidades (`catalogoAdmin`, `usoIa`, `tasasAdmin`) y componentes (`src/views/admin/__tests__/PanelOperacion.test.js`, servicio simulado: ningún test toca la BD).
- E2E `e2e/15-admin-operacion.spec.js`: un cliente que entra a las 4 rutas es redirigido a `/cliente/inicio`. No se ejecutó contra la BD real en este entorno. No hay sesión de super admin en `e2e/.auth`; no se crearon cuentas.
- El test de íconos MDI no corre en el worktree (sin `node_modules`); los íconos usados se verificaron a mano contra `materialdesignicons.css`.

## Capturas
Omitidas: no hay sesión de super admin y montar las vistas con datos falsos exigía una ruta de vista previa. Quedan cubiertas por los tests de componentes.

## Pendiente
Fusionar duplicados, generar fotos con IA para el catálogo, editor de categorías, uso de IA por negocio. Ver `docs/mvp/super-admin-pendientes.md`.
