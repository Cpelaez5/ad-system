# Auditoría de conexiones entre módulos (2026-10-14)

Rama `feat/ola-f2b`. Solo lectura de datos (SELECT + conteos, sin datos personales). Formulario activo: `SimpleInvoiceForm.vue`.
Tests que demuestran huecos: `tests/auditoria/conexiones-modulos.spec.js` (3 fallan a propósito).

## Resumen

| # | Pregunta | Estado | Una línea |
|---|----------|--------|-----------|
| 1 | Compra de mercancía -> Mi mercancía | ❌ roto | Toda compra con `expense_type='COMPRA'` se guarda por el RPC `registrar_compra_con_retenciones`, que no mueve stock; `registroService` no llama a `processInventoryMovements`. Último `IN_PURCHASE` en BD: 2026-05-25. |
| 2 | Venta -> inventario | ⚠️ parcial | `OUT_SALE` funciona y los servicios no descuentan; falla la reversión (papelera sobre ANULADA, restaurar, hard delete). |
| 3 | Proveedores conectados | ⚠️ parcial | Se crean y se enlazan por RIF/nombre, no por id (38 de 66 compras sin `issuer.id`); el listado crea proveedores al leer; totales con coincidencias por nombre parcial. |
| 4 | Clientes (de ventas) | ❌ falta | No hay tabla ni autocompletado; solo `invoices.client_info` (JSON) escrito a mano. Hay datos para migrar. |
| 5 | Retenciones | ⚠️ parcial | Cálculo, tabla `retenciones`, correlativo y PDF funcionan en la compra nueva; no se sincronizan al editar, anular, borrar ni restaurar. "Mis retenciones" de ventas: solo 3 columnas, sin tabla ni vista. |
| 6 | Kardex <-> factura | ⚠️ parcial | Muestra el número de factura, pero el chip no se puede abrir. |

## Datos de la BD (conteos)

- Compras de mercancía vivas: 28. De ellas 16 BORRADOR (10 con `IN_PURCHASE`, de antes del cambio), 3 EMITIDA, 7 PAGADA, 2 CRÉDITO.
- EMITIDA + CRÉDITO + PAGADA sin ningún movimiento: 3 + 2 + 5 = 10.
- Movimientos: 25 en total (19 `IN_PURCHASE`, 4 `OUT_SALE`, 1 `OUT_RETURN`, 1 `INITIAL`). Los 4 `OUT_SALE` sin `cost_price`.
- Ventas vivas: 52, con movimiento: 4.
- `retenciones`: 33 filas; 3 son de facturas en papelera o ANULADAS y siguen activas (`deleted_at` null).
- Compras: 66 en total, 38 sin `issuer.id`, 11 sin RIF.
- Proveedores: 34. 5 con RIF inventado `PROV-xxxxxx`, 19 con configuración por defecto (IVA 75%, sin ISLR), 1 RIF duplicado.
- Ventas: `client_info` con 52 filas, 37 RIF normalizados distintos, 41 nombres distintos, 6 sin RIF, 1 con `id`.
- Disparadores en `invoices`: solo `set_fecha_fiscal_default` y `updated_at`. Ninguno toca inventario ni retenciones.

## Detalle

### 1. Compra de mercancía -> inventario

- ❌ **Suma de stock.** `registroService.js:105-115` (`esCompraConRpc`) devuelve true para `flow=COMPRA` con `expense_type` COMPRA o GASTO. La rama RPC (`registroService.js:210-226`) llama a `retentionRpcService.registrarCompra` y termina. El RPC inserta la factura (con `items` tal cual) y las retenciones, y no toca `inventory_*`. `invoiceService.createInvoice` (que sí llama a `processInventoryMovements`, `invoiceService.js:483-487`) solo se usa para ventas y para gastos que no pasan por el RPC.
  - Escenario: el cliente compra 10 cables (producto existente), estado EMITIDA o PAGADA. `invoices` se crea, `inventory_movements` y `stock` no cambian. Test `una compra de mercancía EMITIDA`.
  - Lo que sí funciona: BORRADOR y luego EMITIDA por `updateInvoice` (`invoiceService.js:668-670`) aplica el inventario. Es el orden inverso al esperable: guardar directo como emitida es lo que falla.
- ⚠️ **Producto existente vs texto libre.**
  - Existente elegido (`SimpleInvoiceForm.vue:2956-2965`): trae `product_id`, costo = `cost_price`.
  - Texto libre (`:2942-2955`): `isInventory=true` y `product_id=null`. `processInventoryMovements` (`invoiceService.js:1430-1507`) lo autocrea, pero solo si pasa por ese método (no por el RPC).
  - Duplicado: busca por nombre con `getProducts({search})` (`:1436`), que usa `.or('name.ilike.%…%')` (`inventoryService.js:104-106`). Un nombre con coma o paréntesis rompe el filtro PostgREST, lanza error y el ítem se omite (`:1505 continue`). `limit: 5` ordenado por nombre puede dejar fuera la coincidencia exacta. Para quien no es cliente (`getCurrentClientId()` null, `inventoryService.js:92-97`), la búsqueda abarca productos de todos los clientes de la organización y puede reutilizar uno ajeno.
  - `client_id`: `createProduct` usa `getCurrentClientId()` (`inventoryService.js:209`). Con rol contador o admin queda null.
  - `sale_price`: `= unitPrice` (el costo) en `invoiceService.js:1472`, margen 0%. El camino OCR usa +30% (`SimpleInvoiceForm.vue:3267`). Dos criterios distintos.
  - `currency` del producto no se informa al autocrear.
- ❌ **OCR.** Los ítems traen `isInventory=true` (`SimpleInvoiceForm.vue:3199`, `:3286`). Un producto nuevo queda como `_productoPendiente` y `registroService.js:191-206` lo crea con `stock:0` y le asigna `product_id`. Luego va por el RPC, sin movimiento: el producto existe en Mi mercancía con stock 0. Si `createProduct` falla se registra un warning y el ítem queda como texto libre.
- ⚠️ **Borrador y luego emitida.** Entra al inventario (`invoiceService.js:668-670`). Pero `updateInvoice` no guarda de vuelta el `product_id` de los productos autocreados (solo `createInvoice` lo hace, `:490-515`). Después, editar o borrar esa compra no encuentra `product_id` y no revierte (la reversión no autocrea, `:1430`): fuga de stock. Además, las 10 compras BORRADOR con `IN_PURCHASE` antiguos suman doble si se emiten.
- ⚠️ **Edición de cantidades.** `updateInventoryForInvoiceEdit` (`:726-844`) compara solo ítems con `product_id`. Un ítem de texto libre agregado al editar no entra; un cambio de producto sí ajusta ambos lados. En compras creadas por RPC (que nunca sumaron), editar +2 suma 2 y borrar luego resta el total: stock negativo posible (`registerMovement` no valida; `inventoryService.js:399`).
- ❌ **Papelera / restaurar / borrado definitivo.**
  - `deleteInvoice` (`:847-887`) revierte siempre (`:872-874`), sin mirar el estado. Una compra BORRADOR (nunca sumó) mandada a papelera resta stock; una venta ANULADA (ya devuelta) vuelve a sumar. Test `enviar a papelera una compra BORRADOR`.
  - `restoreInvoice` (`:890-912`) solo pone `deleted_at=null`: el stock devuelto no se vuelve a mover. Test `restaurar … una venta`.
  - `hardDeleteInvoice` (`:915-976`): el `select` (`:923`) no trae `id` ni `status`, así que `reference_id` queda `undefined` y revierte aunque el estado fuera BORRADOR/ANULADA. Y falla por FK si la compra tiene filas en `retenciones` (`retenciones_invoice_id_fkey` sin cascade): "Error al eliminar permanentemente". `inventory_movements.reference_id` es `ON DELETE SET NULL`: el Kardex pierde la referencia.
- ⚠️ **Costo y moneda.** `cost_price: item.unitPrice` (`:1516`), sin conversión. En una compra en USD el precio unitario va en dólares; el producto es VES y `registerMovement` pisa `cost_price` con el último valor (`inventoryService.js:402-404`, no es costo promedio). Mezcla de monedas sin aviso.
- ⚠️ Condición de carrera: `registerMovement` lee `stock`, suma y escribe (`inventoryService.js:399-406`) en dos pasos, no atómico.

### 2. Venta -> inventario

- ✅ `createInvoice` -> `processInventoryMovements` -> `OUT_SALE` (`invoiceService.js:1414`, `:1520`) con `product_id`. Estados BORRADOR/ANULADA no mueven (`:1390-1395`).
- ✅ Servicios: `registerMovement` los salta (`inventoryService.js:366-368`) y el formulario no valida su stock (`stockVenta.js`, `SimpleInvoiceForm.vue:3451`). Sin movimiento en Kardex (coherente).
- ⚠️ Ítems de venta en texto libre no descuentan (correcto, sin autocreate) pero tampoco avisan.
- ⚠️ `OUT_SALE` se guarda sin `cost_price` (4 de 4 en BD): no hay costo de venta para el margen.
- ⚠️ Anulación por edición (VÁLIDA -> ANULADA, `:665-667`) revierte bien. Las demás reversiones (papelera, restaurar, hard delete) fallan como en el punto 1.
- ⚠️ La validación de stock solo corre en el cliente (`validate()`); `registerMovement` permite stock negativo.

### 3. Proveedores

- ✅/⚠️ **Creación.** Sin OCR, `ProveedorAutocomplete` no admite texto libre: solo elegir o "Nuevo" (abre `ProveedorModalForm`) y ahí se crea en `proveedores` con `client_id`. Con OCR sin match, el proveedor queda pendiente y se crea al guardar (`registroService.js:40-97`, con dedupe por RIF e índice único).
  - Si el usuario deja el proveedor vacío, `validate()` no lo exige y el RPC falla con "Proveedor % no encontrado" (`p_proveedor_id` null).
- ⚠️ **Vínculo factura–proveedor.** `invoices` no tiene `proveedor_id`; solo `issuer` JSON (`id`, `rif`, `companyName`). El `issuer.id` se llena al elegir proveedor (`SimpleInvoiceForm.vue:1939`); 38 de 66 compras no lo tienen (datos antiguos y gastos). El RPC sí guarda `proveedor_id` en `retenciones`, pero no en la factura.
- ⚠️ **Mis proveedores.**
  - `getProveedores` -> `_syncFromInvoices` (`proveedorService.js:304-484`) **escribe en una lectura**: auto-crea proveedores desde cualquier factura (`:350-418`), con RIF inventado `PROV-xxxxxx` si falta (`:365`), `iva_retention_rate: 75` por defecto y, para un usuario no cliente, `client_id` null. En BD hay 5 proveedores con RIF falso.
  - Totales/historial: `total_facturas`, `total_compras`, `total_retenido`, `ultima_compra_fecha` existen (`:466-477`), pero la coincidencia usa id, RIF normalizado, nombre exacto **o nombre parcial** (`:435`): "Ana" absorbe "Analytics C.A.". Cuenta BORRADOR y ANULADA, y suma `totalSales` sin convertir moneda.
  - La ficha (`getProveedorById`, `:491-577`) limita facturas a 10 (`:550`) y retenciones a 10 (`:532`) antes de sumar: `totalCompras` y `totalRetenido` son los de las últimas 10, no los totales.
  - RIF con otro formato: `cleanAlphanumeric` iguala `J-12345678-9` con `J123456789`, pero no `J-12345678` vs `J-12345678-9` ni ceros a la izquierda. Hay 1 RIF duplicado en BD.

### 4. Clientes (a quién le vende el negocio)

- ❌ No existe tabla. En VENTA el formulario escribe `formData.client.companyName` y `.rif` (`SimpleInvoiceForm.vue:1731-1750`, input de texto, sin autocompletado) y se guarda en `invoices.client_info` (`invoiceService.js:369`).
- Campos hoy en `client_info` (52 ventas): `companyName` 52, `address` 52, `rif` 52, `phone` 51, `email` 51, `taxpayerType` 51, `website` 47, `contactPerson` 4, `id` 1. Con RIF vacío: 6. 37 RIF normalizados distintos para 52 ventas y 41 nombres distintos: hay repetición real que un maestro de clientes consolidaría.
- En COMPRA `client_info` es el propio negocio (prefill de `clients`, `SimpleInvoiceForm.vue:2441-2463`), no un cliente de ventas.
- Autocompletado de clientes anteriores: no existe en el formulario activo. Origen para migrar: `SELECT DISTINCT` de `client_info` por RIF normalizado y `invoices.client_id`.
- Diseño sugerido: tabla `clientes_venta` con índice único `(client_id, rif_normalizado)`, `invoices.cliente_venta_id` nullable, migración que deduplica por RIF (y por nombre cuando no hay RIF). No agregar un segundo FK entre `users`/`organizations`/`clients` (ver memoria de embeds).

### 5. Retenciones

- ✅ **Cálculo y registro (compra nueva).** Banderas `es_contribuyente_especial`, `es_agente_retencion_municipal`, `retains_islr` (`SimpleInvoiceForm.vue:1876-1879`). El RPC calcula IVA/ISLR/municipal, inserta en `retenciones` y llena `invoices.iva_retention/islr_retention/municipal_retention/neto_a_pagar`. El correlativo sale de `generar_correlativo_retencion` o del número escrito por el usuario.
- ✅ **Conceptos ISLR del proveedor.** `COALESCE(p_islr_concept_id, proveedor.islr_concept_id)`, con mínimo en UT y sustraendo para persona natural. El formulario lo replica (`SimpleInvoiceForm.vue:2771-2790`).
- ✅ **Descarga.** `retention-pdf-service.js:342` (`fetchRetentionData`) lee `retenciones`, y hay botón de descarga en la pantalla de éxito (`SimpleInvoiceForm.vue:2394-2403`).
- ⚠️ **Borradores.** El RPC corre para cualquier estado: una compra BORRADOR ya crea `retenciones` y consume correlativos.
- ❌ **Edición.** `updateInvoice` (`invoiceService.js:598-621`) actualiza las 3 columnas de la factura desde `financial`, pero no toca `retenciones` ni correlativos. Cambiar base, proveedor o número deja el comprobante y el PDF desactualizados. Hay columnas `corregido_en`, `corregido_motivo` y `base_imponible_original` sin consumidor en `src/`.
- ❌ **Anular, papelera, borrar.** `deleteInvoice`, la anulación y `hardDeleteInvoice` no tocan `retenciones` (ningún código en `src/` actualiza `retenciones.deleted_at`; 3 filas siguen vivas de facturas anuladas o en papelera). El correlativo no se libera ni se marca anulado; `proveedorService` las sigue sumando (filtra solo `retenciones.deleted_at`) y el PDF se puede descargar. `hardDelete` falla por FK (ver punto 1).
- ⚠️ **Ventas ("Mis retenciones").** El formulario pide IVA/ISLR/municipal que aplicó el cliente (`SimpleInvoiceForm.vue:1264-1320`); `createInvoice` las guarda solo en `invoices.iva_retention/islr_retention/municipal_retention` (`invoiceService.js:371-373`) y el número de comprobante en `financial.*Number`. No hay tabla ni pantalla que las lea, y `fiscalService` no las consume (1 venta con retención en BD).
- ⚠️ **Moneda.** El RPC toma `taxableSales`/`taxDebit` del JSON tal cual. Si la compra es en USD y esos campos no vienen en bolívares, las retenciones salen en USD. El formulario exige tasa (`validate()` 4b), pero no verifiqué que `financial.*` se guarde en VES.

### 6. Mi mercancía <-> Mis movimientos

- ⚠️ `getProductMovements` y `getAllMovements` hacen el join `invoice:invoices!inventory_movements_reference_id_fkey(invoice_number)`, y `Inventario.vue:339-347` y `:405-413` muestran el chip con el número. Es un chip estático: sin `@click`, no abre la factura. Con borrado definitivo queda "N/A" (`SET NULL`). Los movimientos manuales (INITIAL, ajustes) no tienen referencia (esperable).
- ⚠️ `getAllMovements({limit:100})` sin paginación (`Inventario.vue:875`).

## Arreglos priorizados

### Crítico

1. **Compra de mercancía directa (EMITIDA/PAGADA/CRÉDITO) no entra al inventario.** En `registroService.guardarRegistro`, tras el RPC exitoso, cargar la factura creada y llamar a `invoiceService.processInventoryMovements(factura, false)` (persistiendo los `product_id` autocreados, igual que `createInvoice:489-515`). Mejor: extraer a `invoiceService.aplicarInventarioTrasCrear(factura)` y llamarlo desde ambas rutas. Archivos: `src/services/registroService.js`, `src/services/invoiceService.js`. Reparar las 10 compras vigentes sin movimiento con un script supervisado (puede haber ajustes manuales).
2. **Reversión sin mirar el estado (papelera/restaurar/hard delete).** `deleteInvoice`: revertir solo si el estado previo no es BORRADOR/ANULADA; `restoreInvoice`: reaplicar con `processInventoryMovements(data,false)` si el estado es válido; `hardDeleteInvoice`: incluir `id,status` en el `select` y usar la misma regla. Archivo: `src/services/invoiceService.js:847-976`. Tests: `tests/auditoria/conexiones-modulos.spec.js`.
3. **Retenciones huérfanas al anular/borrar/editar.** Función de BD `anular_retenciones_de_factura(invoice_id)` que marque `retenciones.deleted_at` y deje constancia del correlativo, llamada desde `deleteInvoice`, desde la anulación y desde `hardDelete` (que además debe resolver la FK). En `updateInvoice` de COMPRA con cambios de base/proveedor: RPC `actualizar_retenciones_compra` que recalcule y registre `corregido_*`. Archivos: nueva migración en `supabase/migrations/`, `src/services/invoiceService.js`, `src/services/registroService.js`.
4. **Producto autocreado desde texto libre.** Persistir `product_id` también en `updateInvoice` (transición BORRADOR->EMITIDA), escapar el término de búsqueda (`,`, `(`, `)`, `%`) o buscar por nombre normalizado, siempre acotado al `client_id` de la factura (no al del usuario). Archivos: `src/services/invoiceService.js:668-670,1436`, `src/services/inventoryService.js:84-117`.

### Importante

5. Margen del producto autocreado: no usar `sale_price = unitPrice`; unificar con el +30% del OCR o dejar vacío con aviso (`invoiceService.js:1472`).
6. Costo en moneda: convertir `unitPrice` a la moneda del producto con `financial.exchangeRate` antes de `cost_price` (`invoiceService.js:1516`, `:816`); considerar costo promedio.
7. `registerMovement` atómico: RPC `registrar_movimiento_inventario(...)` que inserte y actualice `stock` en una transacción, con opción de impedir stock negativo (`inventoryService.js:347-412`).
8. Vínculo proveedor: agregar `invoices.proveedor_id` (FK simple a `proveedores`), rellenarlo desde `issuer.id` o RIF normalizado, y que el RPC lo escriba. Exigir proveedor en `validate()` para COMPRA.
9. Sacar la escritura de `_syncFromInvoices`: no autocrear en una lectura; ofrecer "Revisar proveedores detectados" con confirmación y sin RIF inventado. Quitar el match por nombre parcial; filtrar BORRADOR/ANULADA; calcular totales en BD (vista o RPC) y por moneda. Corregir `getProveedorById` para sumar sobre todo (`proveedorService.js:304-484, 532, 550`). Limpiar los 5 RIF `PROV-%` y el RIF duplicado.
10. Módulo Clientes de venta (ver punto 4): tabla, autocompletado en `SimpleInvoiceForm` y migración desde `client_info`.
11. "Mis retenciones" de ventas: tabla propia (o `retenciones` con dirección) que alimente Fiscal 360 y el Libro de Ventas; hoy solo hay columnas en `invoices`.
12. Compras BORRADOR no deben generar `retenciones` ni consumir correlativos hasta emitirse (`registroService.js:105-115` y RPC).
13. Kardex: hacer clicable el chip de factura (abrir la factura en `Facturacion`) en `Inventario.vue:339-347,405-413`; paginar `getAllMovements`.

### Menor

14. Guardar `cost_price` en `OUT_SALE` (costo del producto en ese momento) para calcular margen.
15. Aviso cuando una línea de venta es de texto libre y no descuenta stock.
16. Validar en el servidor que no se venda más que el stock (hoy solo el cliente).
17. Mensaje claro cuando falta el proveedor (hoy llega el texto del RPC "Proveedor % no encontrado").
18. Verificar y documentar la moneda de `financial.taxableSales/taxDebit` que consume el RPC.
