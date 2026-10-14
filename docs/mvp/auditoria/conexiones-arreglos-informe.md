# Arreglos de conexiones entre módulos (2026-10-14)

Sobre la auditoría `conexiones-modulos-2026-10-14.md`. Sin migraciones ni escrituras en la BD.

## Hecho

1. **Compra de mercancía -> inventario** (`registroService.js`, rama RPC). Tras el RPC se vincula `invoices.proveedor_id` y, si `expense_type = COMPRA` y el estado no es BORRADOR ni ANULADA, se lee la factura por id y se llama a `invoiceService.aplicarInventarioDeFactura` (nuevo helper que ejecuta `processInventoryMovements` y guarda los `product_id` autocreados o reutilizados; `createInvoice` y `updateInvoice` lo reutilizan). Si falla, la compra queda guardada y el resultado trae `warning` (y `message`) con "La compra se guardó, pero no pudimos sumar al inventario: …". `Facturacion.vue` lo muestra. `processInventoryMovements` ahora marca `success:false` cuando `registerMovement` o `createProduct` devuelven un Error (antes lo daba por bueno).
2. **Reversiones** (`invoiceService.js`): papelera revierte solo con efecto (ni BORRADOR ni ANULADA); restaurar reaplica; `hardDeleteInvoice` trae `id` y `status`, y no borra si hay filas en `retenciones` (mensaje claro; también si la FK responde 23503); BORRADOR a EMITIDA/PAGADA aplica y guarda `product_id`; idempotencia: no se reaplica con efecto neto ya existente en `inventory_movements.reference_id`, ni se revierte lo que nunca se aplicó. La anulación de retenciones sigue siendo del trigger de la BD (no hay lógica en JS). `proveedor_id` también se escribe en `createInvoice`/`updateInvoice` de compras.
3. **Autocreación**: `getProducts` escapa el término (`patronBusquedaPostgrest`: comillas, `%`, `_`, `\`), la búsqueda va acotada al `client_id` de la factura, el producto nace con `client_id`, `tipo:'producto'` y `sale_price: 0`.
4. **Proveedores**: `_syncFromInvoices` ya no crea nada al leer (se eliminó, sin sugerencias); totales e historial por `proveedor_id` (o `issuer.id` antiguo) con respaldo por RIF normalizado solo si es null, sin coincidencia por nombre; excluye BORRADOR/ANULADA; la ficha suma todas las compras (solo el listado se limita a 10).
5. **Kardex**: el chip de factura (ambas tablas de `Inventario.vue`) navega a `/cliente/facturacion?ver=<id>`; `Facturacion.vue` lo lee al montar, abre el detalle y limpia el parámetro (aviso si no está, p. ej. en la papelera).
6. **Script** `scripts/reprocesar-compras-sin-inventario.sql`: dos SELECT (compras sin movimiento y líneas sin `product_id`) y la transacción comentada (termina en ROLLBACK a propósito).

## Ajustes a tests

- `inventoryService.test.js`: el `or()` ahora lleva el patrón entrecomillado (`name.ilike."%dell%",…`).
- Los 3 tests de `tests/auditoria/` pasan sin cambios (no hubo decisión que los contradijera).

## Notas

- `iconos.spec.js` falla solo en el worktree por falta de `node_modules/@mdi/font` (entorno, no código).
- El borrado definitivo de compras con retenciones queda bloqueado por decisión (documentos fiscales); la FK no se toca.
- Las 10 compras vigentes sin movimiento se reparan con el script supervisado (no ejecutado).
