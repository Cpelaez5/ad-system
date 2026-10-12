# 📊 SheetJS (xlsx) - Cheat Sheet

> Leer y escribir archivos Excel (.xlsx, .xls, .csv)

---

## Importación

```javascript
import * as XLSX from 'xlsx'
// o
import { utils, writeFileXLSX, read } from 'xlsx'
```

---

## Exportar Tabla HTML a Excel

```javascript
// Obtener tabla del DOM
const table = document.getElementById('invoices-table')

// Crear workbook desde tabla
const wb = XLSX.utils.table_to_book(table)

// Descargar
XLSX.writeFile(wb, 'facturas.xlsx')
```

---

## Exportar Array de Objetos

```javascript
const invoices = [
  { numero: 'F-001', cliente: 'Empresa A', monto: 1500 },
  { numero: 'F-002', cliente: 'Empresa B', monto: 2300 }
]

// Crear worksheet desde JSON
const ws = XLSX.utils.json_to_sheet(invoices)

// Crear workbook y agregar worksheet
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Facturas')

// Descargar
XLSX.writeFile(wb, 'facturas.xlsx')
```

---

## Leer Archivo Excel

```javascript
async function readExcelFile(file) {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  
  // Obtener primera hoja
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Convertir a JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet)
  
  return jsonData
}
```

---

## Con Vue (Input File)

```vue
<template>
  <input type="file" accept=".xlsx,.xls" @change="handleFile" />
</template>

<script>
import * as XLSX from 'xlsx'

export default {
  methods: {
    async handleFile(event) {
      const file = event.target.files[0]
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      this.importedData = XLSX.utils.sheet_to_json(sheet)
    }
  }
}
</script>
```

---

## Personalizar Columnas

```javascript
const ws = XLSX.utils.json_to_sheet(invoices, {
  header: ['numero', 'cliente', 'monto', 'fecha'],
  skipHeader: false // true para omitir fila de headers
})

// Renombrar headers
ws['A1'].v = 'N° Factura'
ws['B1'].v = 'Cliente'
ws['C1'].v = 'Monto ($)'
ws['D1'].v = 'Fecha'

// Ancho de columnas
ws['!cols'] = [
  { wch: 15 },  // Columna A
  { wch: 30 },  // Columna B
  { wch: 12 },  // Columna C
  { wch: 12 }   // Columna D
]
```

---

## Formatos de Exportación

```javascript
// Excel moderno
XLSX.writeFile(wb, 'archivo.xlsx')

// Excel antiguo
XLSX.writeFile(wb, 'archivo.xls', { bookType: 'xls' })

// CSV
XLSX.writeFile(wb, 'archivo.csv', { bookType: 'csv' })
```

---

## ⚠️ SheetJS vs ExcelJS

| Característica | SheetJS | ExcelJS |
|---------------|---------|---------|
| Estilos (colores, fuentes) | ❌ Limitado | ✅ Completo |
| Leer archivos | ✅ Excelente | ✅ Bueno |
| Tamaño bundle | 🟢 Más pequeño | 🟡 Más grande |
| Uso recomendado | Lectura/Exportación simple | Reportes con formato |

**En este proyecto:** ExcelJS para reportes con formato, SheetJS para importar datos.
