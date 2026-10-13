# Informe — Tarea B (ola Fase 2b): consistencia de "Mi negocio"

Agente: Claude (Sonnet 5), worktree `agent-a48500a70ddeac714`.

## Resumen

Se llevaron los diálogos, encabezados, estados vacíos y listas móviles de
Proveedores, Inventario, Mi área (ClienteMiArea), Facturación/Suscripción,
Archivo y los componentes `CasheaInstallmentsModal` / `InventoryAdjustmentDialog`
al estándar U8 de `docs/mvp/diseno/sistema-diseno.md`, usando los componentes
ya existentes de `src/components/ui/`. Se creó `FilaLista` (nuevo, genérico)
para listas en móvil que no son movimientos de dinero.

## Componente nuevo: `FilaLista`

`src/components/ui/FilaLista.vue` + `src/components/ui/__tests__/FilaLista.test.js`.
Props: `titulo`, `subtitulo`, `valor`, `valorSecundario`, `estado`,
`colorEstado`, `icono`, `colorIcono`, `clicable` (accesible por teclado,
emite `click`; un clic en el slot `acciones` no burbujea gracias a
`@click.stop`). Documentado en `sistema-diseno.md` §5, aclarando que no
duplica a `FilaMovimiento` (ese lo crea el agente A para
Facturación/Compras/Gastos/Ventas).

Usado en:
- `Inventario.vue` → lista de productos en xs (en vez de `v-data-table`).
- `FacturacionSuscripcion.vue` → lista de facturas del plan en xs.

`Proveedores.vue` **no** se migró a `FilaLista`: ya tenía una tarjeta móvil
propia más rica (avatar, chips fiscales, resumen financiero, botones de
contacto rápido) que cumple el mismo objetivo (tarjetas en vez de tabla en
xs); rehacerla con el componente genérico habría perdido esos datos o
requerido extender mucho `FilaLista` solo para un caso. Se documentó la
decisión aquí en vez de forzar el reemplazo.

## Diálogos convertidos a `DialogoAdaptable` (13 en total)

| Archivo | Diálogo(s) |
|---|---|
| `src/views/cliente/Proveedores.vue` | Confirmar eliminar proveedor |
| `src/views/cliente/ClienteMiArea.vue` | Cambiar contraseña |
| `src/views/cliente/Inventario.vue` | Nuevo/editar producto, Kardex de producto, confirmar eliminar, confirmar restaurar, exportar resumen |
| `src/views/cliente/FacturacionSuscripcion.vue` | Reportar/editar pago, detalle de reporte, confirmar eliminar reporte |
| `src/views/cliente/Archivo.vue` | Subir documentos |
| `src/components/forms/client/CasheaInstallmentsModal.vue` | Gestión de cuotas Cashea |
| `src/components/inventory/InventoryAdjustmentDialog.vue` | Asistente de inventario IA (wizard con `v-stepper` dentro del cuerpo) |

Todos quedaron con `scrollable` + pantalla completa en xs + acciones fijas
abajo (slot `acciones`) + `cargando` ligado al flag de guardado/borrado
correspondiente (se agregaron flags nuevos donde no existían:
`savingProduct`, `deletingProduct`, `restoringProduct`, `exportingSummary`
en Inventario).

**Nota de regresión conocida y aceptada:** `CasheaInstallmentsModal.vue`
tenía un encabezado con degradado de marca y un `@keydown.esc` propio; al
estandarizar con `DialogoAdaptable` se perdió ese estilo custom (ahora usa
título/ícono estándar, con el texto de factura+cliente como primera línea
del cuerpo) y el atajo de teclado Esc ya no cierra explícitamente el modal
(el diálogo sigue siendo `persistent`, igual que antes). Es un cambio
visual menor a favor de la consistencia; si se quiere recuperar el estilo
de marca, habría que extender `DialogoAdaptable` con un slot de encabezado
opcional (no se hizo para no tocar el componente compartido con otras
tareas de la ola).

## Encabezados (`EncabezadoPagina`)

Agregado en Proveedores, Inventario, Mi área, Facturación/Suscripción y
Archivo. `Proveedores.vue` no tenía ningún `<h1>` real (el contenedor del
título estaba vacío en el código — posible resto de un refactor anterior);
ahora muestra "Proveedores" con subtítulo.

`Planes.vue` no se tocó: `PricingSection.vue` (que renderiza dentro) ya
trae su propio encabezado editorial (h2 + subtítulo + selector de período),
equivalente en función a `EncabezadoPagina`; agregar otro encima habría
duplicado el título. Se documenta como decisión, no como pendiente.

## Estados vacíos (`EstadoVacio`)

Agregado en: Proveedores (lista filtrada vacía, con acción contextual
"Limpiar filtros" o "Registrar primer proveedor"), Inventario (pestaña
Productos), Facturación/Suscripción (pestañas Facturas y Mis Reportes),
Archivo (lista de documentos).

## Planes y precios

`src/components/common/PlanCard.vue` (usado por `PricingSection.vue`,
dentro de `Planes.vue`) **ya cumplía** el punto 4 del encargo antes de
empezar: precios con `formatMoney`, ribbon "⭐ Recomendado" en el plan
destacado y ribbon "Tu plan actual" + botón deshabilitado en el plan
vigente. No se tocó esa lógica. Se convirtió el banner superior de
"Plan Actual" de `Planes.vue` (antes `v-alert` a mano) a `AvisoAmable`.

## Checkout

Sin cambios: no tiene ningún `v-dialog`, ya usa estados de carga/éxito/error
dedicados y botones con `:loading`, y no usa `alert()`. Se respetó "no tocar
la lógica de pago" sin necesidad de tocar tampoco la presentación (ya estaba
en línea con U7).

## Errores (U7) y botones con carga

`Inventario.vue` tenía **tres `alert()` nativos** (exportar valorizado,
exportar kardex, exportar resumen horizontal) — prohibidos por
`00-REGLAS-COMUNES.md` §3. Se reemplazaron por `this.$root?.showSnackbar(...)`
en lenguaje llano, y se agregaron flags de carga a los botones de guardar
producto, eliminar, restaurar y exportar resumen (antes esos botones no
mostraban `:loading`).

## Cambio de BD propuesto

Ninguno. No se tocó esquema ni se requería.

## E2E: `e2e/11-mi-negocio.spec.js`

Creado con 4 tests (solo lectura, sin sufijo `.mobile`/`.desktop` → corre en
ambos proyectos de `playwright.config.js`):
1-3. Proveedores / Inventario / Mi área cargan sin errores de consola.
4. Abre el diálogo "Nuevo Proveedor" (siempre disponible, no depende de que
   existan proveedores cargados), comprueba que "Cancelar" es visible
   **sin necesitar scroll** (se compara el `boundingBox` del botón contra
   `page.viewportSize()`, replicando la regresión original que motivó
   `DialogoAdaptable`) y que cierra sin guardar; si además el entorno ya
   tiene al menos un proveedor cargado, también abre y cancela el diálogo
   de **eliminar** (el que convertí en esta tarea), verificando que la fila
   sigue ahí tras cancelar.

**No se pudo ejecutar la suite E2E en este entorno.** El servidor de preview
sí responde (`curl http://127.0.0.1:5174/login` → 200 OK), pero el
`global-setup.js` falla siempre al hacer login real vía Chromium
(`page.waitForURL` agota el timeout tras los 6 reintentos), igual para
`--dangerouslyDisableSandbox`. Es el mismo problema de red restringida del
sandbox ya documentado en `e2e/helpers/base.js` (comentarios sobre
`ERR_NETWORK_ACCESS_DENIED` intermitente) — aquí resultó sistemático, no
intermitente, probablemente por ser una copia de worktree sin el mismo
acceso de red que la copia principal. No es atribuible a los cambios de
esta tarea: no toqué `global-setup.js`, `playwright.config.js` ni el flujo
de login. Pido al orquestador (o a quien tenga una copia con red completa)
correr `npx playwright test e2e/11-mi-negocio.spec.js` para confirmar.

## Archivos tocados

- `src/components/ui/FilaLista.vue` (nuevo)
- `src/components/ui/__tests__/FilaLista.test.js` (nuevo)
- `docs/mvp/diseno/sistema-diseno.md` (catálogo, nueva fila `FilaLista`)
- `src/views/cliente/Proveedores.vue`
- `src/views/cliente/Inventario.vue`
- `src/views/cliente/ClienteMiArea.vue`
- `src/views/cliente/FacturacionSuscripcion.vue`
- `src/views/cliente/Archivo.vue`
- `src/views/cliente/Planes.vue`
- `src/components/forms/client/CasheaInstallmentsModal.vue`
- `src/components/inventory/InventoryAdjustmentDialog.vue`
- `e2e/11-mi-negocio.spec.js` (nuevo)

## Tests

- `TZ=America/Caracas npx vitest run` → 79 archivos / 655 tests, todos en
  verde (incluye los 5 tests nuevos de `FilaLista.test.js`).
- `npx vite build` → build en verde (solo advertencias preexistentes de
  tamaño de chunk, no relacionadas con esta tarea).
- E2E: escrito, no ejecutable en este entorno (ver sección anterior).

## Dudas para el orquestador

1. ¿Está bien dejar `Proveedores.vue` sin `FilaLista` (ya tenía tarjeta
   móvil propia más rica) o prefieres que la unifique de todas formas?
2. ¿Vale la pena agregar un slot de encabezado opcional a
   `DialogoAdaptable` para que `CasheaInstallmentsModal` recupere su
   estilo de marca (degradado + ícono Cashea), o se acepta el estándar?
3. Por favor confirma en un entorno con red completa que
   `e2e/11-mi-negocio.spec.js` pasa (no pude correrlo aquí).
