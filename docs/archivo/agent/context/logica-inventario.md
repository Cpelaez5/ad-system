# 📦 Lógica de Negocio: Relación Inventario - Facturación

## 🔄 Visión General
En este sistema contable (ERP), el módulo de Facturación (particularmente las secciones de Compras y Ventas) funciona como el **principal motor de movimiento** para el Inventario. El Inventario en sí mismo es un módulo de consulta y ajuste, no de transacciones regulares.

---

### 📥 1. Entrada de Mercancía (Flujo de Compras)
- **Evento**: El usuario registra una Factura de Compra, Nota de Entrega o Gasto asociado a inventario.
- **Condición para afectar inventario**: La factura debe tener `flow = 'COMPRA'` **y** `expense_type = 'COMPRA'`. Si el tipo de gasto es distinto (e.g., servicios), NO afecta inventario.
- **Comportamiento esperado**: Al detallar los ítems en el formulario de la factura, estos **ingresan** de forma automática al inventario.
- **Trazabilidad**: En la pestaña de Movimientos (Kardex) del Inventario, este ingreso queda registrado referenciando el número/ID de la factura de compra (`reference_id`).
- **Auto-creación de producto**: Si el ítem no tiene `product_id` (proviene de texto libre) pero tiene `isInventory: true`, el sistema puede crear el producto automáticamente en `inventory_products` antes de registrar el movimiento.

---

### 📤 2. Salida de Mercancía (Flujo de Ventas)
- **Evento**: El usuario registra una Factura de Venta.
- **Comportamiento esperado (UI/UX)**: En la carga de "Productos" de la factura, el input es un *Buscador Dinámico (Combobox)* implementado en `ProductAutocomplete.vue`.
- **Funcionalidad del Buscador**:
  - Busca en tiempo real en la base de datos de productos creados previamente (`inventory_products`).
  - Muestra en los resultados un **chip de Stock Disponible** para orientar al vendedor.
  - En modo VENTA, productos con `stock = 0` deben aparecer marcados como `SIN STOCK`.
- **Acción Transaccional**: Al confirmar y guardar la factura de venta, las cantidades seleccionadas se **descuentan automáticamente** del stock (`OUT_SALE`). El movimiento queda referenciado en el Kardex.

---

### 🔁 3. Anulación / Eliminación de Facturas
- Al **anular o eliminar** una factura confirmada, `invoiceService.processInventoryMovements(invoice, isReversal: true)` revierte el movimiento:
  - Compra anulada → `OUT_RETURN` (sale el stock que había entrado)
  - Venta anulada → `IN_RETURN` (regresa el stock que había salido)

---

## 🛡️ El Estado del Item: `isInventory`

Cada ítem en una factura tiene una propiedad `isInventory: boolean`:
- `true` → el ítem está vinculado al inventario y afectará el stock al guardar
- `false` → es un ítem de texto libre, solo afecta totales de factura, NO el inventario

**Regla recomendada**: Para facturas de tipo COMPRA (mercancía) o VENTA, el valor por defecto debe ser `isInventory: true` para garantizar que la integración sea automática. El usuario puede desactivarlo manualmente si esspecificamente no desea afectar inventario.

---

## 🤖 El Propósito de la IA (OCR) en ambos Módulos

Al establecer que las entradas reales provienen de Facturación, es crucial definir en qué contexto se usa la IA y el OCR:

### En el Módulo de Facturación (Compras)
- **Uso de la IA**: Analizar y extraer datos de facturas fiscales y notas de entrega formales de proveedores. Extrae totales, impuestos y líneas de detalle (productos), ingresando stock al sistema. **(Esta es la vía estándar operativa)**.

### En el Módulo de Inventario (Asistente de IA)
- **Uso de la IA**: Su propósito es el **control físico** y no la facturación.
  - **Toma Física (Auditoría)**: Un empleado toma fotos del estante o de una lista a mano (conteo físico). La IA detecta lo ingresado y permite hacer **Ajustes de Inventario** (diferencias entre sistema físico vs teórico). Esta funcionalidad vive en `InventoryAdjustmentDialog.vue`.
  - **Autoconsumo y Mermas**: Notas manuscritas o informales de productos dañados, vencidos, o de uso interno. Salen del stock sin generar una factura de venta.
  - **Onboarding / Carga Inicial**: Leer listas de productos de un sistema viejo para pre-registrarlos.

*Conclusión*: La integración de IA en el módulo de Inventario **SÍ es necesaria**, pero enfocada a **ajustes y auditorías físicas**, no a ingresos de proveedores que siempre vendrán de Facturación.

---

## 🛠️ Justificación de los Botones del Módulo de Inventario

1. **[Escanear Documento (IA)]**: Como se indicó arriba, se utiliza para leer listas de chequeo, fotos de hojas de conteo físico, o reportes de mermas.
2. **[+ Nuevo Producto]**:
   - *Importancia*: Pre-registrar el **maestro** de un artículo. Le permite al usuario definir código, nombre, costos y precio de venta de un artículo que planea vender o comprar, dejando el modelo listo para que sea **encontrado rápidamente** por el buscador dinámico en Facturación. No debe obligar a ingresar stock si solo es un pre-registro.
3. **[Exportar]**: Vital a nivel contable para generar los reportes de Valoración de Inventario requeridos para cierres de mes/año frente al fisco.
4. **[Importar (Potencial)]**: Solo para una carga inicial masiva mediante un `.xlsx` (Excel) el primer día de uso. Luego, todo llegaría por el módulo Compras. Usa las librerías ExcelJS/SheetJS ya instaladas.

---

## 🧑‍💻 Requerimientos Técnicos (Estado de Implementación)

| Requerimiento | Estado |
|---|---|
| `ProductAutocomplete.vue` en formularios de factura | ✅ Implementado |
| `invoiceService.processInventoryMovements()` | ✅ Implementado |
| `inventoryService.registerMovement()` | ✅ Implementado |
| `isInventory: true` por defecto en COMPRA/VENTA | ⚠️ Pendiente (actualmente `false`) |
| Auto-crear producto nuevo desde factura de compra | ⚠️ Pendiente |
| Número de factura legible en el Kardex | ⚠️ Pendiente |
| Deshabilitar productos sin stock en buscador VENTA | ⚠️ Pendiente |
| Botón Importar (carga masiva Excel) | ⏳ Opcional/Fase 3 |

*Documento actualizado: Marzo 2026.*
