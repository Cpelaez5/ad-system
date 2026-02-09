---
description: Exportar datos a Excel o PDF
---

## Contexto

El servicio `src/services/exportService.js` maneja todas las exportaciones.
Las plantillas de referencia están en `/examples/` (libros de compra/venta).

## Exportar a Excel

### Usando ExcelJS (con estilos)
```javascript
import { exportToExcel } from '@/services/exportService'

// Exportar facturas
await exportToExcel({
  data: invoices,
  filename: 'facturas_enero_2026',
  columns: [
    { header: 'N° Factura', key: 'invoice_number' },
    { header: 'Cliente', key: 'client_name' },
    { header: 'Monto', key: 'total' }
  ]
})
```

### Usando SheetJS (simple)
```javascript
import * as XLSX from 'xlsx'

const ws = XLSX.utils.json_to_sheet(data)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Datos')
XLSX.writeFile(wb, 'archivo.xlsx')
```

## Exportar a PDF

### Usando jsPDF
```javascript
import jsPDF from 'jspdf'

const doc = new jsPDF()
doc.text('Reporte de Facturas', 20, 20)
// ... agregar contenido
doc.save('reporte.pdf')
```

### Usando html2pdf (desde HTML)
```javascript
import html2pdf from 'html2pdf.js'

const element = document.getElementById('contenido-a-exportar')
html2pdf().from(element).save('documento.pdf')
```

## Libros Fiscales (Venezuela)

Referencia: `/examples/libro_compra MODELO.xls` y `/examples/libro_venta MODELO.xls`

El servicio ya tiene funciones para generar estos formatos:
- `exportLibroCompras(invoices, periodo)`
- `exportLibroVentas(invoices, periodo)`
