# Tarea A — Consistencia de "Mis movimientos" (Facturación, Compras, Gastos, Ventas)

Vistas: `src/views/cliente/Facturacion.vue`, `Compras.vue`, `Gastos.vue`, `Ventas.vue` (y componentes que solo ellas usan, excepto los formularios de factura).

1. **Diálogos (U8):** reemplaza cada `v-dialog` de estas vistas por `DialogoAdaptable` (o `HojaInferior` si es un menú corto de opciones). Botones de acción en el slot `acciones`. Si un diálogo envuelve `SimpleInvoiceForm`/`ClientInvoiceForm`, cambia solo el envoltorio; **no modifiques el interior de esos formularios** (otro agente trabaja en SimpleInvoiceForm).
2. **Encabezado:** `EncabezadoPagina` con título y subtítulo en llano y la acción principal en su slot (en móvil a ancho completo).
3. **Estados vacíos** con `EstadoVacio` que enseñan qué hacer ("Aún no registras ventas. Toca **Vendí** y tómale foto a tu factura").
4. **Lista en móvil:** si hoy hay `v-data-table` ilegible en el teléfono, en xs muestra tarjetas/lista con un componente ui reutilizable `FilaMovimiento` (quién, cuánto con formatMoney, cuándo con fechas.js, estado con chip, toque abre el detalle). En escritorio se queda la tabla.
5. **Errores (U7):** catches con snackbar llano + Reintentar.
6. Entrada escalonada sutil de la lista (tokens de movimiento).
7. Actualiza `e2e/08-facturacion.spec.js` con un test móvil que abra el diálogo principal, verifique que "Cancelar" es visible sin hacer scroll y lo cierre (sin guardar).

Informe: `docs/mvp/briefs/ola-f2b-A-informe.md`.
