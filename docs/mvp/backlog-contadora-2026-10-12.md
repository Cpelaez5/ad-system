# Novedades reportadas por la contadora al probar (2026-10-12)

Texto tal como llegó; el plan de acción está en `manuales/04-agente-fiscal-venezuela.md` (C1–C5).

1. El Libro de Compras suele exportarse según la fecha de emisión de las facturas, pero hay excepciones. Por ejemplo, si una factura emitida en agosto se registra durante la primera quincena de septiembre y su comprobante de retención de IVA se genera con fecha de septiembre, esa operación debe reflejarse en el Libro de Compras de septiembre, para que coincida con el período de imposición y la declaración. Se requiere un ítem adicional de fecha usado como referencia para el libro, que podría llamarse «Fecha Fiscal».
2. Formato de retención de ISLR: agregar un renglón antes del sustraendo con el monto total de la factura incluyendo el IVA.
3. Formato de retención de ISLR: cambiar «Cantidad Pagada» por «Monto Total Factura» (monto total de la factura), mantener «Impuesto Retenido» y cambiar «Total Retención» por «Neto a Pagar» (monto total de la factura menos la retención).
4. Inventario: al registrar la factura de venta se puede agregar la descripción del producto vendido, pero el producto no se registra en inventario. Debería registrarse automáticamente (en números negativos) o el sistema no debería permitir la venta si el producto no está disponible.
5. Ventas: al registrar la venta hay un renglón para el número de comprobante y el monto de IVA retenido por esa factura; ese monto no se refleja en el Libro de Ventas exportado.
6. Al cargar la factura de venta, la IA solo extrae número de factura y control, fecha, base imponible, IVA y total, pero no los productos vendidos. Mejorarla como se hizo en compras.
