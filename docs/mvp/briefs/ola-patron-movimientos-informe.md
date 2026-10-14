# Informe: Mis movimientos con el patrón del cliente

## Hecho
- Se quitaron las 4 tarjetas de colores. Ahora hay una frase del mes ("Este mes vendiste $X y gastaste $Y") y 3 cifras en línea: Vendí, Gasté, Retenciones.
- Las pestañas pasaron a `FiltroChips` con su cantidad (Todas, Ventas, Compras, Gastos, Mis retenciones, Papelera).
- "Tu siguiente paso" (`PanelSiguientePaso`) con datos reales. Prioridad: borradores, ventas por cobrar (CRÉDITO o VENCIDA), comprobantes de retención. Si no hay nada: "Tus movimientos están al día".
- "Nuevo registro" es el botón principal. Exportar (libros SENIAT y Excel) está en el menú ⋮.
- Filtros plegables ("Buscar y filtrar"). Estado y moneda pasaron de `v-select` a `FiltroChips`.
- Escritorio: tabla con chips sobrios (sin azul, índigo ni púrpura) y fechas con `formatFechaCorta`. Teléfono: `FilaMovimiento`; todas las acciones (editar, descargas, Cashea, papelera, restaurar, eliminar definitivo) siguen en el diálogo de detalle (C1).
- Cálculos puros en `src/utils/resumenMovimientos.js`, con tests. No se tocaron `SimpleInvoiceForm` ni `ClientInvoiceForm`.
- E2E `08-facturacion.spec.js` actualizado ("Nuevo registro", título "Tus movimientos").

## Decisiones y dudas
- Las cifras van en USD. Las facturas en VES se dividen entre la tasa BCV; si no hay tasa, se omiten. EUR no se convierte (no hay tasa).
- "Por cobrar" solo cuenta CRÉDITO y VENCIDA. EMITIDA no se incluye porque puede ser una venta ya cobrada.
- Las retenciones por descargar no tienen registro de descarga en la BD; el paso cuenta facturas de compra con retención.
- El toggle USD/VES de las tarjetas quedó sin interfaz (la lógica sigue; la moneda de cada factura se respeta).
- La cuenta de prueba no tiene movimientos de octubre 2026, así que las cifras salen en $0,00 (el cálculo está cubierto por tests).
- Futuro: totales en vivo junto al formulario y chip "Ajuste de tasa".
