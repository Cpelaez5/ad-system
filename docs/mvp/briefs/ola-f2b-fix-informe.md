# Informe — Corrección de la revisión independiente, ola F2b

Implementador: Claude (worktree `agent-ae5f7c7f31aef71c0`), partiendo de
`feat/ola-f2b` (1bbd0f3) con dos merges intermedios hasta el tope de la rama
al cerrar (incluye "Mis papeles" rediseñada, color secundario carbón,
`estadoPapel.js`, etc. del orquestador).

Verificación final: `TZ=America/Caracas npx vitest run` → **86 archivos / 736
tests en verde**. `npm run build` → verde.

---

## Críticos

**C1 — Facturación en móvil: faltan editar/borrar/restaurar/Cashea.**
Corregido. El diálogo de detalle (el único punto de entrada en móvil, porque
`FilaMovimiento` reemplaza la tabla en xs) ahora incluye Editar, Cuotas
Cashea (si aplica), Mover a papelera / Restaurar / Eliminar definitivamente
(según la pestaña), además de las Descargas que ya tenía. Tocar una fila en
Papelera también abre el detalle (antes no hacía nada). Botones con
`min-height: 44px`. `src/views/cliente/Facturacion.vue`.

**C2 — Proveedor nuevo del OCR: compra sin retenciones.**
Corregido. `calcularRetenciones()` ahora calcula con valores por defecto
(IVA 75%, tipo de persona por la letra del RIF, sin ISLR) cuando hay un
proveedor pendiente del OCR, igual que si ya existiera. `AvisoAmable` nueva
en el formulario. Test en `src/services/__tests__/registroService.test.js`
("crea el proveedor nuevo y lo enlaza antes de guardar la compra (vía RPC de
retenciones)"). `src/components/forms/client/SimpleInvoiceForm.vue`.

---

## Importantes

**I1 — Moneda equivocada en la lista móvil.** Corregido. Nuevo método
`getDisplayAmountYMoneda()` (misma lógica que `getFormattedDisplayAmount`
pero sin formatear a string) + prop `equivalente` nuevo en `FilaMovimiento`.

**I2 — `normalizarRif` sin validar el DV.** Corregido. Reescrito con el
algoritmo del SENIAT (pesos 4,3,2,7,6,5,4,3,2); letra siempre obligatoria
(ya no se adivina "J" con 9 dígitos); cuerpos de 6-8 dígitos se rellenan con
ceros a la izquierda. Se agrega `tipoPersonaPorLetra()`. 12 tests nuevos en
`src/utils/__tests__/rif.test.js` con RIF inventados y DV calculado de
verdad.

**I3 — `issuer.id` desactualizado / `_proveedorPendiente` se guarda.**
Corregido. `_ofrecerCrearProveedor` y el watcher de `proveedor` limpian
`issuer.id`; se limpia también al cambiar de flujo (Gasté↔Vendí);
`registroService.guardarRegistro` quita `_proveedorPendiente` del payload
SIEMPRE (antes solo en el camino feliz de COMPRA nueva), cubriendo también
VENTA y ediciones.

**I4 — Duplicados por una búsqueda que falla en silencio; sin índice único
real.** Corregido en el lado de la app (el índice único de BD ya existía
desde 1bbd0f3). `proveedorService.buscarPorRifNormalizado()` (SÍ lanza si
falla, a diferencia de `getProveedores`); si falla, no se crea nada. Un
choque 23505 con `proveedores_client_rif_unico` se trata como "ya existe":
se busca de nuevo y se usa (según el contexto del orquestador). Si la
factura falla justo después de crear el proveedor en el mismo intento, se
compensa (se borra) el proveedor recién creado. 4 tests nuevos cubren estos
casos.

**I5 — Asistente de inventario no se reinicia; "la X salta cierres
propios".** Corregido con un cambio sistémico: `DialogoAdaptable` ahora
emite `cerrar` cada vez que se cierra por CUALQUIER medio (X, backdrop, Esc),
no solo cuando la vista llama a su propio botón "Cancelar". Cableado en:
- `InventoryAdjustmentDialog`: `@cerrar="reset"` + guard contra doble
  submit de "Confirmar Consumo" (`:disabled="processing"` + chequeo en JS).
- `Facturacion.vue`: `exportDateDialog` limpia `pendingExportType/Flow`;
  `municipalConfirmDialog` resuelve la promesa pendiente con `false` (antes
  quedaba colgada para siempre si se cerraba con la X — fuga real).
- `FacturacionSuscripcion.vue`: el diálogo de pago llama a
  `closePaymentDialog()` (revoca el `objectURL`).
**No revisado exhaustivamente:** quedan ~8 usos más de `DialogoAdaptable`
(Archivo, ClienteMiArea, Proveedores, Inventario, CasheaInstallmentsModal)
sin auditar uno por uno — ninguno tenía un cierre-propio conocido pendiente
en el informe de revisión, así que no se tocaron por prudencia (el mecanismo
`@cerrar` ya está disponible si se necesita).

**I6 — Ítems de venta del OCR corrompen la base imponible.** Corregido.
Para VENTA, el match con inventario ya NO reemplaza el precio leído de la
factura por el `sale_price` del inventario (solo vincula `product_id`/nombre
para mostrar). Si el OCR ya trajo `financial.taxableAmount`, no se vuelve a
calcular la base desde la suma de ítems; si no coincide, se avisa (snackbar
de advertencia) en vez de corregir en silencio.

**I7 — El OCR crea productos de inventario aunque se cancele.** Corregido.
Los ítems sin match se marcan `_productoPendiente` (mismo patrón que el
proveedor pendiente) y el producto real se crea recién en
`registroService.guardarRegistro`, nunca al escanear.

**I8 — E2E no ejecutados; riesgos en los specs.** Corregidos los 3 hallazgos
que el orquestador verificó con una corrida real (2026-10-13):
`08-facturacion.spec.js`: el test del diálogo móvil se salta en desktop
(`test.skip(!isMobile)`); "carga la lista de facturas" verifica "Mis
movimientos" (visible en ambos proyectos) y, en mobile, la lista
`FilaMovimiento`. `11-mi-negocio.spec.js`: el botón "Cancelar" se acota a
`.v-overlay--active .v-card-actions`. Además se encontró y corrigió un bug
real durante la verificación: `ProveedorModalForm` desbordaba un viewport de
escritorio de 800px (el diálogo no fullscreen no tenía `max-height`, así que
`scrollable` no se activaba) — se agrega `max-height: 90vh`.
**No ejecuté la suite completa** (instrucción explícita: "no hace falta,
el orquestador los corre"); sí corrí los dos specs señalados varias veces.
Una corrida tardía mostró timeouts distintos (CSS sin cargar / "Nuevo
Proveedor" no clickeable) que atribuyo a la red restringida del sandbox
(documentada en `e2e/helpers/base.js`), no a un bug de la app — las capturas
de esas corridas mostraban una UI sin estilos en absoluto, consistente con
que el bundle de CSS no llegó a descargar.

**I9 — Falsos positivos de `sugerirCategoria`.** Corregido. Se quita el
patrón `pdv` suelto (PDV = punto de venta en Venezuela, no PDVSA); límites
de palabra (`\b`) en todos los patrones; las reglas corren solo sobre
nombre del proveedor + descripción de ítems, nunca sobre las notas (ahí
vivían los falsos positivos de "Teléfono:"). `_buscarCategoriaPorNombre`
ahora exige nombre EXACTO normalizado (antes aceptaba coincidencia
parcial). Solo se **prellena** con confianza alta (≥0.9, historial); con
confianza media (palabra clave o pista de la IA) se deja en
`categoriaSugerenciaPendiente` sin prellenar (la UI para el chip "¿Es «X»?"
quedó con el dato listo; **no alcancé a cablear el chip visual** en el
template — ver "Pendientes" abajo).

---

## Menores

- **Fechas con `new Date('YYYY-MM-DD')` en Plan y pagos** — corregido:
  `Planes.vue` (vencimiento de suscripción) y `FacturacionSuscripcion.vue`
  (`formatDate`) usan `src/utils/fechas.js`.
- **`animation-delay` con `prefers-reduced-motion`** — corregido:
  `animation-delay: 0s !important` agregado a la media query global; el
  escalón de `Facturacion.vue` usa `var(--ad-move-escalon-lista)` en vez de
  `50ms` fijo.
- **Estados vacíos con filtros activos** — corregido en Facturación,
  Inventario y Proveedores: "No hay resultados con estos filtros" + botón
  "Limpiar filtros" cuando hay búsqueda/filtro activo y el resultado es
  vacío (antes decían "Aún no registras..."/"Todavía no tienes..." con un
  CTA de crear, aunque sí hubiera datos). De paso: la búsqueda móvil de
  Inventario no filtraba la lista en absoluto (solo el buscador interno de
  la tabla de escritorio) — corregido también.
- **`ocrProveedorYCategoria.test.js` reimplementaba la lógica** —
  corregido: se extrajo `decidirMatchProveedor`/`construirProveedorPendiente`
  a `src/utils/matchProveedorOcr.js` (función pura real que el componente
  usa) y `resolverCategoriaPorNombre` a `sugerirCategoria.js`; el test ahora
  importa y prueba las funciones reales.
- **M1-M11 del informe de revisión**: M1 ✅, M2 parcial (ver Pendientes),
  M3 ✅ (fechas, formatMoney, doble-reporte en `pending_review`), M4 ✅
  (cubierto por el mecanismo `@cerrar` de I5), M5 ✅ (se borraron
  `Compras.vue`/`Gastos.vue`/`Ventas.vue` de cliente, código muerto
  confirmado — las rutas solo redirigen), M6 ✅, M7 ✅ (quien/unit con
  fallback, Enter en `FilaLista` ya no sube a la fila), M8 ✅, M9 ✅
  (`invoiceService.getHistorialCategoriasCompras`, consulta específica con
  `client_id` obligatorio), M10 ✅, M11 ✅ (doc corregida, `FilaLista`
  agregada a `CatalogoUI.vue`).

---

## Pendientes (no corregidos — motivo)

1. **I9, chip "¿Es «X»?" de confianza media**: el dato (`categoriaSugerenciaPendiente`)
   ya se calcula y guarda en `SimpleInvoiceForm.vue`, pero no llegué a
   agregar el chip clicable en el template (hay dos secciones del formulario
   —simple y detalle— que mostrarían el chip "Sugerido" actual; faltó
   tiempo para el segundo chip + su handler de aceptación). Riesgo de dejarlo
   así: con confianza media simplemente no se prellena nada (comportamiento
   seguro, solo le falta la UI de aceptar con un toque).
2. **M2, resto**: paginación/"Ver más" en la lista móvil de Facturación con
   muchas facturas, y montos retenidos/neto a pagar en la fila móvil de la
   pestaña Retenciones. Se corrigió solo la falta de skeleton mientras
   `loading` está activo.
3. **I7 (preexistente, fuera de mi alcance declarado)**: igual que los
   productos, el review nota que esto "no lo introdujo esta ola"; lo corregí
   igual por ser una instrucción C-adjacente directa del brief.
4. **Hallazgo nuevo (no estaba en la revisión)**: `new Date().toISOString().split('T')[0]`
   (el mismo anti-patrón de huso horario que motivó `src/utils/fechas.js`)
   aparece también en `ClientInvoiceForm.vue`, `InvoiceForm.vue` (legado),
   `bcvService.js`, `documentService.js`, `invoiceService.js`,
   `Fiscal360.vue`, `Contabilidad.vue` y
   `retentionCorrelatives.test.js`. Solo corregí la instancia que estaba
   **fallando de verdad** en este momento (`tests/components/SimpleInvoiceForm.spec.js`,
   flaky entre las 8pm y medianoche en Caracas); el resto queda para una
   limpieza aparte — tocar `ClientInvoiceForm.vue`/`InvoiceForm.vue` (legado,
   ver `docs/mvp/invoice-forms-decision.md`) y vistas de otros roles
   (contador) está fuera del alcance de este brief.
5. **Dialogo de ProveedorModalForm en escritorio (hallazgo nuevo, I8)**:
   arreglé el síntoma (overflow, `max-height: 90vh`) pero no audité si otros
   `v-dialog` no-`DialogoAdaptable` del proyecto tienen el mismo problema.

## Archivos relevantes

- `src/utils/rif.js`, `src/utils/matchProveedorOcr.js`, `src/utils/sugerirCategoria.js`
- `src/services/registroService.js`, `src/services/proveedorService.js`, `src/services/invoiceService.js`
- `src/components/forms/client/SimpleInvoiceForm.vue`
- `src/components/ui/DialogoAdaptable.vue`, `FilaMovimiento.vue`, `FilaLista.vue`
- `src/components/inventory/InventoryAdjustmentDialog.vue`
- `src/components/forms/ProveedorModalForm.vue`
- `src/views/cliente/Facturacion.vue`, `FacturacionSuscripcion.vue`, `Planes.vue`, `Inventario.vue`, `Proveedores.vue`
- `src/views/cliente/Compras.vue`, `Gastos.vue`, `Ventas.vue` (borrados), `src/router/index.js`
- `e2e/08-facturacion.spec.js`, `e2e/11-mi-negocio.spec.js`
- `docs/mvp/diseno/sistema-diseno.md`, `src/views/dev/CatalogoUI.vue`
