# Informe — Tarea A: consistencia de "Mis movimientos" (ola Fase 2b)

Fecha: 2026-10-13. Rama: `worktree-agent-a1569cbca251e4226` (worktree aislado).

## Resumen

Se aplicó el estándar de diseño (DialogoAdaptable, EncabezadoPagina, EstadoVacio,
AvisoAmable, lista móvil) a las 4 vistas de movimientos del cliente:
`Facturacion.vue`, `Compras.vue`, `Gastos.vue`, `Ventas.vue`. Se creó el
componente nuevo `FilaMovimiento` (catalogado). Se actualizó el E2E con un test
móvil, pero no pudo ejecutarse en este entorno (ver "E2E" más abajo).

## Commits

1. `6d2fae6` — `feat(ui): FilaMovimiento — tarjeta compacta para listas de movimientos en móvil`
   Componente nuevo en `src/components/ui/FilaMovimiento.vue` + test
   (`src/components/ui/__tests__/FilaMovimiento.test.js`) + catálogo
   (`docs/mvp/diseno/sistema-diseno.md` §5, `src/views/dev/CatalogoUI.vue`).
2. `4546c71` — `feat(ux): Compras/Gastos/Ventas — encabezado, estado vacío, lista móvil y errores llanos`
3. `f078de9` — `feat(ux): Facturacion — encabezado, estado vacío, lista móvil y diálogos adaptables`
4. `099f1f3` — `test(e2e): móvil — diálogo principal usable sin scroll (Cancelar visible)`

## Qué se hizo, punto por punto (brief de la tarea)

### 1. Diálogos (U8)

- **Facturacion.vue**: se reemplazaron por `DialogoAdaptable` los diálogos de
  confirmar eliminación, ver factura (detalle), opciones de exportación,
  exportar con filtro de fecha, y confirmación de retención municipal en otro
  municipio. Son 5 diálogos convertidos.
- **Compras/Gastos/Ventas.vue**: se reemplazó por `DialogoAdaptable` el diálogo
  de confirmar eliminación en las 3 vistas.
- **Decisión documentada — el diálogo de nueva/editar factura NO se convirtió
  a `DialogoAdaptable`** en ninguna de las 4 vistas. Motivo: `SimpleInvoiceForm.vue`,
  `ClientInvoiceForm.vue` e `InvoiceForm.vue` (el usado en Compras/Gastos/Ventas)
  ya traen su **propio** encabezado y pie de tarjeta fijos (`v-card-title`/
  `v-card-actions` con sus propios botones Cancelar/Guardar o Cerrar), con su
  propia lógica de `scrollable` + `fullscreen` en móvil. Envolver eso en
  `DialogoAdaptable` —que también dibuja su propio título + botón cerrar +
  pie de acciones— habría duplicado encabezados y botones de cierre, un peor
  resultado visual que el que había. El brief pide expresamente **no tocar el
  interior** de esos formularios (otro agente trabaja en paralelo en
  `SimpleInvoiceForm.vue`), así que en vez de reescribir su interior para que
  quepa dentro de `DialogoAdaptable`, se dejó el `v-dialog` tal cual y solo se
  alineó su transición al estándar (`dialog-bottom-transition` en xs, en vez
  de la transición por defecto), manteniendo `scrollable` + `fullscreen` que
  ya tenían (de hecho `fullscreen="$vuetify.display.smAndDown"` ya es más
  amplio que el xs-only de `DialogoAdaptable`). Esto se explica con un
  comentario en el propio código de cada vista.
- **`CasheaInstallmentsModal.vue`** (modal de cuotas Cashea, usado solo desde
  `Facturacion.vue`) tiene también su propio encabezado/pie a medida y no se
  tocó, por el mismo riesgo (duplicar chrome) más el costo de entender a fondo
  un flujo de pagos en cuotas sin tests dedicados. Queda como posible mejora
  futura si se quiere unificar su estética con `DialogoAdaptable`.

### 2. Encabezado

`EncabezadoPagina` reemplaza el `v-row` suelto con el botón de acción principal
en las 4 vistas (título + subtítulo en español llano + acción a ancho completo
en móvil vía `BotonAccion`/`v-btn :block`).

### 3. Estados vacíos

`EstadoVacio` en las 4 vistas, con copy que enseña qué tocar (ej. "Aún no
registras ventas... Toca «Nuevo Registro»..."). En `Facturacion.vue` el copy
cambia según la pestaña activa (ventas/compras/gastos/retenciones/papelera) vía
3 computed (`estadoVacioIcono/Titulo/Mensaje`); en retenciones y papelera no se
ofrece el botón "Nuevo Registro" (no aplica crear un registro desde ahí).

### 4. Lista en móvil

Se creó `src/components/ui/FilaMovimiento.vue` (+ test + catálogo) y se usa en
las 4 vistas: en `xs` se muestra una lista de tarjetas (quién, cuánto con
`formatMoney`, cuándo con `fechas.js`, estado con chip, toda la tarjeta
tocable y accesible por teclado) en vez de la `v-data-table`; en `sm` y
superior se mantiene la tabla sin cambios.

**Limitación conocida:** la lista móvil no pagina (la tabla de escritorio sí,
10 por página); con pocas decenas de movimientos no es un problema, pero con
cientos podría volverse larga. No estaba en el alcance pedido y no se
implementó paginación/virtualización para no ampliar el riesgo de esta tarea.

### 5. Errores (U7)

- `Compras/Gastos/Ventas.vue`: antes, un error al cargar la lista solo hacía
  `console.error` y dejaba una tabla vacía sin explicación. Ahora hay
  `loadError` + `AvisoAmable` con "Reintentar"; guardar/eliminar usan
  `AppSnackbar` (antes no existía snackbar en estas 3 vistas).
- `Facturacion.vue`: mismo patrón para la carga de la lista (ya tenía
  snackbar para otras acciones vía `showNotification`, se reutilizó); se
  añadió snackbar de éxito/error a eliminar/restaurar factura (antes solo
  `console.error`, sin avisar al usuario).

### 6. Entrada escalonada

Las listas móviles (`FilaMovimiento`) y los bloques superiores usan
`ad-move-entrada` + `animation-delay` escalonado (tokens
`src/components/ui/movimiento.js` / `--ad-move-*`), respetando
`prefers-reduced-motion` (ya resuelto globalmente).

### 7. E2E

Se agregó un tercer test a `e2e/08-facturacion.spec.js`: fuerza un viewport
angosto (390×844, para fijar el breakpoint xs sin depender de qué proyecto de
Playwright —desktop/mobile— ejecute el archivo), abre el diálogo principal,
comprueba que "Cancelar" está dentro del viewport sin necesitar scroll, lo
cierra sin guardar y verifica que no hubo errores de consola.

**No se pudo ejecutar la suite E2E en este entorno.** Diagnóstico (confirmado
con un script Playwright mínimo, no solo con la suite): el navegador headless
de este sandbox devuelve `net::ERR_NETWORK_ACCESS_DENIED` al intentar
`page.goto()` contra `http://127.0.0.1:*` — mientras que `curl` a la misma URL
responde 200 sin problema. Este es exactamente el problema ya documentado en
`playwright.config.js` ("la conexión del navegador al servidor local de Vite
falla... confirmado que no es un problema de la app ni del propio servidor").
Adicionalmente, el puerto por defecto de la suite (5174) estaba ocupado por un
proceso `vite preview` huérfano ajeno a este worktree (verificado por su
`CommandLine`, apuntaba al checkout principal, no a este worktree); no se
tocó ese proceso (el entorno bloqueó explícitamente terminarlo, por
precaución ante otros agentes concurrentes) — se usó temporalmente un
`playwright.config.local.js` + puerto 5199 solo para diagnosticar, y se borró
al terminar (no se commiteó). El test queda escrito y listo para que el
orquestador (u otro entorno sin esa restricción de red) lo corra.

## Verificación

- `TZ=America/Caracas npx vitest run`: **656/656 tests en verde** (79 archivos),
  incluye los 6 tests nuevos de `FilaMovimiento`.
- `npm run build` (`npx vite build`): **verde**, sin errores (solo el aviso ya
  existente de chunks >500kB, no relacionado con esta tarea).
- E2E (`npx playwright test e2e/08-facturacion.spec.js`): no ejecutable en
  este entorno (ver diagnóstico arriba). Revisión manual del código del test
  y de `DialogoAdaptable`/`SimpleInvoiceForm` da confianza razonable de que
  pasaría, pero queda sin confirmación automatizada.

## Archivos tocados

- `src/components/ui/FilaMovimiento.vue` (nuevo)
- `src/components/ui/__tests__/FilaMovimiento.test.js` (nuevo)
- `src/views/dev/CatalogoUI.vue`
- `docs/mvp/diseno/sistema-diseno.md`
- `src/views/cliente/Facturacion.vue`
- `src/views/cliente/Compras.vue`
- `src/views/cliente/Gastos.vue`
- `src/views/cliente/Ventas.vue`
- `e2e/08-facturacion.spec.js`

## Dudas / para el orquestador

1. **¿Correr el E2E en un entorno sin la restricción de red del sandbox?** El
   test nuevo está escrito pero sin confirmar en verde por la limitación
   descrita arriba.
2. **CasheaInstallmentsModal.vue y el diálogo de SimpleInvoiceForm/
   ClientInvoiceForm/InvoiceForm**: quedaron con `v-dialog` (no
   `DialogoAdaptable`) por la razón explicada en el punto 1. Si se quiere
   unificar del todo el look de estos diálogos con el resto del sistema de
   diseño, haría falta coordinarlo con el agente que toca `SimpleInvoiceForm`
   (quitarle su `sif-header`/`sif-footer` propios para que quepa dentro de
   `DialogoAdaptable`) — no es un cambio que se pueda hacer solo desde el
   lado del envoltorio sin tocar el interior del formulario.
3. **Paginación de la lista móvil**: no implementada (ver "Limitación
   conocida" arriba). Si en producción algún cliente llega a tener cientos de
   movimientos, convendría agregar paginación o scroll infinito a
   `FilaMovimiento` en xs.
