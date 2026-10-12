# 📝 SimpleInvoiceForm — Contexto de Implementación

> Última actualización: Marzo 2026  
> Estado: 🟡 EN DESARROLLO (Paso 1 del roadmap de mejoras)

---

## ¿Por qué existe este componente?

El formulario original de facturación (`ClientInvoiceForm.vue`) es un **multi-step wizard de 4 pasos** que resulta complejo para usuarios sin experiencia en sistemas contables. El cliente solicitó simplificarlo a **una sola pantalla** sin perder ninguna funcionalidad.

**Componente NUEVO** (no modifica el existente):
- `src/components/forms/client/SimpleInvoiceForm.vue` ← **el nuevo** (pantalla única)
- `src/components/forms/client/ClientInvoiceForm.vue` ← **el original** (se mantiene sin tocar como fallback)

---

## Decisiones de Diseño

| Aspecto | Decisión |
|---------|----------|
| **Audiencia** | Solo rol `cliente` en esta fase |
| **Layout** | Una sola pantalla vertical, secciones claramente delimitadas |
| **OCR** | Se mantiene con mejora de feedback visual de progreso por etapas |
| **Lenguaje** | Cero términos técnicos. "¿Es una venta o una compra?" en vez de "Tipo de flujo" |
| **Validación** | Inline (en el momento), no al final |
| **Errores** | El formulario NUNCA cierra ni pierde datos si falla el guardado |
| **Pre-llenado** | Los datos del usuario (empresa, RIF) se auto-llenan al abrir el formulario |
| **Inventario** | `isInventory` es transparente para el usuario, se calcula automáticamente |

---

## Secciones del Formulario (de arriba a abajo)

```
1. [Tipo]     ¿Es una venta o una compra?   (VENTA | COMPRA | GASTO)
2. [OCR]      Escanear documento con IA      (panel colapsable, siempre visible)
3. [Doc]      Datos del documento            (Número, Fecha, Tipo doc)
4. [Empresa]  ¿A quién?                      (Nombre empresa, RIF)
5. [Items]    Productos / servicios           (tabla dinámica)
6. [Totales]  Subtotal, IVA, Total           (calculado automático)
7. [Notas]    Observaciones                  (opcional, colapsable)
8. [Acciones] [Cancelar]  [💾 Guardar]       (sticky footer)
```

---

## Comportamiento del OCR (mejorado)

Al subir un archivo (PDF/imagen), el OCR muestra un **panel de progreso por etapas**:

```
🤖 Leyendo tu documento...
✅ Número de factura encontrado: FAC-001
✅ Empresa: ACME Corp
⚠️  Fecha: no detectada (por favor revísala)
✅ 3 productos detectados
[Aplicar datos]  [Revisar manualmente]
```

- Los datos se pre-llenan **sin sobreescribir** lo que el usuario ya haya escrito  
- Si el OCR falla, el formulario sigue funcionando normalmente (no bloquea)

---

## Items / Productos

- En VENTA: muestra `ProductAutocomplete.vue` (búsqueda en inventario con semáforo de stock)
- En COMPRA: muestra campo de texto libre + buscador (puede ser texto libre o producto existente)
- `isInventory` se calcula automáticamente según el tipo de factura. El usuario nunca lo ve.
- Si se escribe un texto libre en una COMPRA, el sistema auto-crea el producto en `inventory_products`
  con `code` = `AUTO-{AÑO}-{secuencial}` pero muestra un pequeño badge "Código generado automáticamente — puedes editarlo"

---

## Servicios involucrados (no cambiar)

| Servicio | Uso |
|----------|-----|
| `invoiceService.createInvoice()` | Guardar la factura |
| `invoiceService.processInventoryMovements()` | Mover stock (se llama internamente después de guardar) |
| `inventoryService.createProduct()` | Auto-crear producto desde texto libre |
| `bcvService.getRateForDate()` | Obtener tasa de cambio por fecha |
| `fileService` (o equivalente) | Subir adjuntos a Storage |

---

## Archivos a Crear/Modificar

| Archivo | Acción | Motivo |
|---------|--------|--------|
| `src/components/forms/client/SimpleInvoiceForm.vue` | **CREAR** | El nuevo formulario |
| `src/views/cliente/Facturacion.vue` | **MODIFICAR** | Reemplazar `ClientInvoiceForm` por `SimpleInvoiceForm` en el diálogo de nueva factura |

> ⚠️ NO modificar `ClientInvoiceForm.vue`. Se mantiene intacto como fallback.

---

## Principios no negociables durante la implementación

1. **Transaccionalidad**: Si el guardado falla, hacer rollback y mostrar error sin cerrar el formulario
2. **Consistencia**: `isInventory`, `client_id`, `organization_id` siempre correctos en cada ítem
3. **Intuitividad**: Si el usuario ya está en el step de productos y cambia el tipo de factura (VENTA→COMPRA), los ítems se re-sincronizan automáticamente con `syncItemsInventoryMode()`
4. **No preguntar lo que ya sabe**: datos del usuario pre-llenados al abrir
5. **Feedback siempre visible**: spinner + mensaje en cada acción asíncrona

---

## Estado actual del componente original (ClientInvoiceForm.vue)

- ✅ Funciona correctamente
- ✅ `handleFlowChange()` + `syncItemsInventoryMode()` garantizan consistencia de `isInventory`
- ✅ `ProductAutocomplete.vue` integrado con semáforo de stock
- ✅ OCR funcional (FileUploadZone + handleExtractedData)
- ✅ Auto-creación de productos desde texto libre en compras
- 🟡 **No modificar** — sirve como referencia para el nuevo componente
