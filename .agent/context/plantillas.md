# 📋 Plantillas de Facturación

> Ubicación: `/examples/`

---

## Archivos Disponibles

### libro_compra MODELO.xls
Plantilla Excel para el libro de compras con formato fiscal venezolano.

**Uso**: Referencia para la estructura de exportación del módulo de compras.

---

### libro_venta MODELO.xls
Plantilla Excel para el libro de ventas con formato fiscal venezolano.

**Uso**: Referencia para la estructura de exportación del módulo de ventas.

---

## Integración con exportService.js

Estas plantillas definen la estructura que sigue `src/services/exportService.js` al generar reportes Excel.

```javascript
// El servicio exporta datos en formato compatible con estas plantillas
import { exportToExcel } from '@/services/exportService.js'

await exportToExcel({
  data: invoices,
  type: 'compras',  // o 'ventas'
  period: '2024-01'
})
```
