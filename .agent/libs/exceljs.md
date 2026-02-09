# 📊 ExcelJS - Cheat Sheet

> Crear y leer archivos Excel (.xlsx)

> 📖 README completo: [ExcelJS-readme.md](./ExcelJS-readme.md)

---

## Crear Workbook

```javascript
import ExcelJS from 'exceljs'

const workbook = new ExcelJS.Workbook()
workbook.creator = 'Sistema Contabilidad'
workbook.created = new Date()
```

---

## Agregar Hoja

```javascript
const sheet = workbook.addWorksheet('Facturas', {
  properties: { tabColor: { argb: 'FFA81C22' } }
})
```

---

## Definir Columnas

```javascript
sheet.columns = [
  { header: 'Número', key: 'invoice_number', width: 15 },
  { header: 'Cliente', key: 'client_name', width: 30 },
  { header: 'Monto', key: 'amount', width: 15 },
  { header: 'Fecha', key: 'date', width: 12 },
  { header: 'Estado', key: 'status', width: 12 }
]
```

---

## Agregar Filas

```javascript
// Una fila
sheet.addRow({
  invoice_number: 'F-2024-001',
  client_name: 'Empresa ABC',
  amount: 1500.00,
  date: new Date(),
  status: 'PAGADA'
})

// Múltiples filas
sheet.addRows(invoices.map(inv => ({
  invoice_number: inv.invoice_number,
  client_name: inv.client.company_name,
  amount: inv.total,
  date: inv.issue_date,
  status: inv.status
})))
```

---

## Estilos

```javascript
// Estilo de encabezados
sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
sheet.getRow(1).fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F355C' }  // Azul del proyecto
}
sheet.getRow(1).alignment = { horizontal: 'center' }

// Formato de moneda
sheet.getColumn('amount').numFmt = '"$"#,##0.00'

// Formato de fecha
sheet.getColumn('date').numFmt = 'dd/mm/yyyy'
```

---

## Descargar en Navegador

```javascript
async function downloadExcel(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
```

---

## Ejemplo Completo (exportService.js)

```javascript
import ExcelJS from 'exceljs'

export async function exportInvoicesToExcel(invoices, filename = 'facturas') {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Facturas')
  
  // Columnas
  sheet.columns = [
    { header: 'N° Factura', key: 'number', width: 15 },
    { header: 'Cliente', key: 'client', width: 30 },
    { header: 'RIF', key: 'rif', width: 15 },
    { header: 'Monto USD', key: 'amount_usd', width: 12 },
    { header: 'Monto Bs', key: 'amount_bs', width: 15 },
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Estado', key: 'status', width: 12 }
  ]
  
  // Datos
  invoices.forEach(inv => {
    sheet.addRow({
      number: inv.invoice_number,
      client: inv.client.company_name,
      rif: inv.client.rif,
      amount_usd: inv.total_usd,
      amount_bs: inv.total_bs,
      date: new Date(inv.issue_date),
      status: inv.status
    })
  })
  
  // Estilos header
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F355C' }
  }
  
  // Formatos
  sheet.getColumn('amount_usd').numFmt = '"$"#,##0.00'
  sheet.getColumn('amount_bs').numFmt = '#,##0.00" Bs"'
  sheet.getColumn('date').numFmt = 'dd/mm/yyyy'
  
  // Descargar
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## Leer Excel

```javascript
async function readExcel(file) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  
  const sheet = workbook.worksheets[0]
  const data = []
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Skip header
      data.push({
        number: row.getCell(1).value,
        client: row.getCell(2).value,
        amount: row.getCell(3).value
      })
    }
  })
  
  return data
}
```
