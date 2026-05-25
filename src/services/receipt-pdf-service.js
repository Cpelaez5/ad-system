/**
 * receipt-pdf-service.js
 * Servicio dedicado para generar recibos PDF individuales de facturas.
 * 
 * Principio S.O.L.I.D. aplicado:
 * - Single Responsibility: Solo genera PDFs de recibos, no toca invoiceService ni exportService.
 * - Open/Closed: Extensible para nuevos tipos de documento sin modificar la lógica base.
 * 
 * Usa jsPDF (ya instalado en el proyecto) con el mismo patrón probado de Fiscal360.vue.
 */

import { jsPDF } from 'jspdf'
import systemLogo from '@/assets/icon.png'

// ══════════════════════════════════════════════════════
// Constantes de diseño corporativo
// ══════════════════════════════════════════════════════
const COLORS = {
  primary:   [168, 28, 34],     // #A81C22 - Rojo corporativo
  secondary: [31, 53, 92],      // #1F355C - Azul oscuro
  accent:    [224, 176, 79],    // #E0B04F - Dorado
  grey:      [120, 120, 120],
  lightGrey: [200, 200, 200],
  white:     [255, 255, 255],
  black:     [40, 40, 40],
  tableHead: [31, 53, 92],      // Fondo del header de la tabla
  tableAlt:  [245, 247, 250],   // Fila alterna
  success:   [46, 125, 50],
  warning:   [230, 120, 0],
  error:     [198, 40, 40]
}

const MARGIN = 15
const LINE_HEIGHT = 6

// ══════════════════════════════════════════════════════
// Helpers internos
// ══════════════════════════════════════════════════════

/**
 * Convierte una imagen importada como módulo a base64 para jsPDF.
 * Mismo patrón usado en Fiscal360.vue.
 */
function getBase64ImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const dataURL = canvas.toDataURL('image/png')
      resolve({ dataURL, width: img.width, height: img.height })
    }
    img.onerror = error => reject(error)
    img.src = url
  })
}

/** Verifica si queda espacio en la página; si no, agrega una nueva */
function checkPage(doc, y, threshold = 270) {
  if (y > threshold) {
    doc.addPage()
    return 20
  }
  return y
}

/** Formatea un número como moneda */
function fmtCurrency(value, currency = 'VES') {
  const num = parseFloat(value) || 0
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'Bs.'
  return `${symbol} ${num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Formatea una fecha ISO a formato legible */
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Obtiene la etiqueta legible del tipo de documento según el flujo */
function getDocLabel(invoice) {
  const type = invoice.documentType || 'FACTURA'
  const flow = invoice.flow || 'VENTA'

  const labels = {
    'FACTURA':          flow === 'VENTA' ? 'Factura de Venta' : 'Factura de Compra',
    'RECIBO':           'Nota de Entrega',
    'NOTA DE CRÉDITO':  'Nota de Crédito',
    'NOTA DE DÉBITO':   'Nota de Débito',
    'NOTA_CREDITO':     'Nota de Crédito',
    'NOTA_DEBITO':      'Nota de Débito'
  }
  return labels[type] || type
}

/** Obtiene el color asociado al estado de la factura */
function getStatusColor(status) {
  const map = {
    'PAGADA':   COLORS.success,
    'EMITIDA':  COLORS.secondary,
    'ENVIADA':  COLORS.accent,
    'BORRADOR': COLORS.grey,
    'VENCIDA':  COLORS.warning,
    'ANULADA':  COLORS.error
  }
  return map[status] || COLORS.grey
}

// ══════════════════════════════════════════════════════
// Secciones del recibo (cada una retorna la nueva posición Y)
// ══════════════════════════════════════════════════════

/** Dibuja el encabezado con logo y nombre del sistema */
async function drawHeader(doc, pageWidth) {
  let y = 15

  // Logo
  try {
    const logoInfo = await getBase64ImageFromURL(systemLogo)
    const pdfHeight = 14
    const ratio = logoInfo.width / logoInfo.height
    const pdfWidth = pdfHeight * ratio
    doc.addImage(logoInfo.dataURL, 'PNG', MARGIN, y - 4, pdfWidth, pdfHeight)

    // Nombre del sistema al lado del logo
    doc.setFontSize(16)
    doc.setTextColor(...COLORS.secondary)
    doc.setFont('helvetica', 'bold')
    doc.text('AD System', MARGIN + pdfWidth + 4, y + 3)

    doc.setFontSize(8)
    doc.setTextColor(...COLORS.grey)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Gestion Contable', MARGIN + pdfWidth + 4, y + 8)
  } catch (e) {
    // Fallback sin logo
    doc.setFontSize(16)
    doc.setTextColor(...COLORS.secondary)
    doc.setFont('helvetica', 'bold')
    doc.text('AD System', MARGIN, y + 3)
  }

  // Línea decorativa
  y += 18
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)

  return y + 4
}

/** Dibuja el bloque de tipo de documento, número y estado */
function drawDocumentTitle(doc, invoice, pageWidth, y) {
  const label = getDocLabel(invoice)
  const number = invoice.invoiceNumber || '—'
  const control = invoice.controlNumber
  const status = invoice.status || 'BORRADOR'

  // Tipo de documento (centrado, grande)
  doc.setFontSize(14)
  doc.setTextColor(...COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text(label.toUpperCase(), pageWidth / 2, y, { align: 'center' })

  y += 7
  // Número de factura
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'normal')
  doc.text(`N. ${number}`, pageWidth / 2, y, { align: 'center' })

  // Número de control (si existe)
  if (control) {
    y += 5
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.grey)
    doc.text(`Control: ${control}`, pageWidth / 2, y, { align: 'center' })
  }

  // Estado con rectángulo de color
  y += 7
  const statusColor = getStatusColor(status)
  const statusText = status
  const textWidth = doc.getTextWidth(statusText) + 8
  const xCenter = (pageWidth / 2) - (textWidth / 2)

  doc.setFillColor(...statusColor)
  doc.roundedRect(xCenter, y - 4, textWidth, 6, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text(statusText, pageWidth / 2, y, { align: 'center' })

  return y + 8
}

/** Dibuja los bloques de Emisor y Receptor lado a lado */
function drawParties(doc, invoice, pageWidth, y) {
  const colWidth = (pageWidth - MARGIN * 2 - 10) / 2
  const leftX = MARGIN
  const rightX = MARGIN + colWidth + 10
  const isVenta = invoice.flow === 'VENTA'

  // Etiquetas
  const leftLabel = isVenta ? 'EMISOR' : 'PROVEEDOR'
  const rightLabel = isVenta ? 'CLIENTE / RECEPTOR' : 'RECEPTOR'

  // Datos
  const leftData = invoice.issuer || {}
  const rightData = invoice.client || {}

  // Dibujar cada columna
  const drawPartyColumn = (x, label, data, startY) => {
    let cy = startY

    // Etiqueta
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.primary)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x, cy)
    cy += 1

    // Línea bajo la etiqueta
    doc.setDrawColor(...COLORS.primary)
    doc.setLineWidth(0.3)
    doc.line(x, cy, x + colWidth, cy)
    cy += 5

    // Nombre de empresa
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.black)
    doc.setFont('helvetica', 'bold')
    const companyName = data.companyName || '—'
    doc.text(companyName, x, cy)
    cy += 5

    // RIF
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.grey)
    if (data.rif) {
      doc.text(`RIF: ${data.rif}`, x, cy)
      cy += 4
    }

    // Dirección
    if (data.address) {
      const lines = doc.splitTextToSize(data.address, colWidth)
      doc.setFontSize(8)
      lines.forEach(line => {
        doc.text(line, x, cy)
        cy += 3.5
      })
    }

    // Teléfono
    if (data.phone) {
      doc.setFontSize(8)
      doc.text(`Tlf: ${data.phone}`, x, cy)
      cy += 3.5
    }

    // Email
    if (data.email) {
      doc.setFontSize(8)
      doc.text(data.email, x, cy)
      cy += 3.5
    }

    return cy
  }

  const leftEndY = drawPartyColumn(leftX, leftLabel, leftData, y)
  const rightEndY = drawPartyColumn(rightX, rightLabel, rightData, y)

  return Math.max(leftEndY, rightEndY) + 4
}

/** Dibuja la fila de fechas y moneda */
function drawDates(doc, invoice, pageWidth, y) {
  const currency = invoice.financial?.currency || 'VES'

  // Fondo sutil
  doc.setFillColor(...COLORS.tableAlt)
  doc.rect(MARGIN, y - 4, pageWidth - MARGIN * 2, 12, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.black)

  const thirdWidth = (pageWidth - MARGIN * 2) / 3

  // Fecha emisión
  doc.setFont('helvetica', 'bold')
  doc.text('Emision:', MARGIN + 3, y + 1)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtDate(invoice.issueDate), MARGIN + 22, y + 1)

  // Fecha vencimiento
  doc.setFont('helvetica', 'bold')
  doc.text('Vencimiento:', MARGIN + thirdWidth + 3, y + 1)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtDate(invoice.dueDate), MARGIN + thirdWidth + 28, y + 1)

  // Moneda
  doc.setFont('helvetica', 'bold')
  doc.text('Moneda:', MARGIN + thirdWidth * 2 + 3, y + 1)
  doc.setFont('helvetica', 'normal')
  doc.text(currency, MARGIN + thirdWidth * 2 + 20, y + 1)

  return y + 14
}

/** Dibuja la tabla de ítems/conceptos */
function drawItemsTable(doc, invoice, pageWidth, y) {
  const items = invoice.items || []
  if (items.length === 0) return y

  const currency = invoice.financial?.currency || 'VES'
  const tableWidth = pageWidth - MARGIN * 2

  // Anchos de columna
  const colWidths = {
    num:   12,
    desc:  tableWidth - 12 - 20 - 30 - 30,
    qty:   20,
    price: 30,
    total: 30
  }

  // Header de tabla
  doc.setFillColor(...COLORS.tableHead)
  doc.rect(MARGIN, y, tableWidth, 8, 'F')

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')

  let xPos = MARGIN + 2
  doc.text('#', xPos, y + 5.5)
  xPos += colWidths.num
  doc.text('Descripcion', xPos, y + 5.5)
  xPos += colWidths.desc
  doc.text('Cant.', xPos, y + 5.5)
  xPos += colWidths.qty
  doc.text('P. Unit.', xPos, y + 5.5)
  xPos += colWidths.price
  doc.text('Total', xPos, y + 5.5)

  y += 10

  // Filas de ítems
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  items.forEach((item, idx) => {
    y = checkPage(doc, y, 260)

    // Fondo alterno
    if (idx % 2 === 1) {
      doc.setFillColor(...COLORS.tableAlt)
      doc.rect(MARGIN, y - 4, tableWidth, 7, 'F')
    }

    doc.setTextColor(...COLORS.black)
    xPos = MARGIN + 2
    doc.text(`${idx + 1}`, xPos, y)
    xPos += colWidths.num

    // Descripción (con truncamiento si es muy larga)
    const descLines = doc.splitTextToSize(item.description || '—', colWidths.desc - 4)
    doc.text(descLines[0], xPos, y)
    xPos += colWidths.desc

    const qty = parseFloat(item.quantity) || 0
    doc.text(qty.toString(), xPos, y)
    xPos += colWidths.qty

    const unitPrice = parseFloat(item.unitPrice) || 0
    doc.text(fmtCurrency(unitPrice, currency), xPos, y)
    xPos += colWidths.price

    const total = parseFloat(item.total) || 0
    doc.setFont('helvetica', 'bold')
    doc.text(fmtCurrency(total, currency), xPos, y)
    doc.setFont('helvetica', 'normal')

    // Si hay más líneas de descripción, agregarlas debajo
    if (descLines.length > 1) {
      for (let i = 1; i < descLines.length; i++) {
        y += 4
        doc.setTextColor(...COLORS.grey)
        doc.text(descLines[i], MARGIN + 2 + colWidths.num, y)
      }
    }

    y += 7
  })

  // Línea inferior de la tabla
  doc.setDrawColor(...COLORS.lightGrey)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 3, pageWidth - MARGIN, y - 3)

  return y
}

/** Dibuja el resumen financiero (totales, impuestos, retenciones) */
function drawFinancialSummary(doc, invoice, pageWidth, y) {
  const fin = invoice.financial || {}
  const currency = fin.currency || 'VES'
  const rightCol = pageWidth - MARGIN
  const labelX = rightCol - 80

  y = checkPage(doc, y, 240)

  // Helper para cada línea del resumen
  const addLine = (label, value, isBold = false, color = COLORS.black) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(label, labelX, y)
    doc.text(fmtCurrency(value, currency), rightCol, y, { align: 'right' })
    y += LINE_HEIGHT
  }

  y += 2

  // Base imponible
  if (fin.taxableSales != null) {
    addLine('Base Imponible:', fin.taxableSales)
  }

  // Ventas no gravadas
  if (fin.nonTaxableSales != null && parseFloat(fin.nonTaxableSales) > 0) {
    addLine('Ventas Exentas:', fin.nonTaxableSales)
  }

  // IVA / Débito fiscal
  if (fin.taxDebit != null && parseFloat(fin.taxDebit) > 0) {
    addLine('IVA (Debito Fiscal):', fin.taxDebit)
  }

  // Retención IVA
  if (fin.ivaRetention != null && parseFloat(fin.ivaRetention) > 0) {
    addLine('Retencion IVA:', `-${parseFloat(fin.ivaRetention)}`, false, COLORS.error)
  }

  // Retención ISLR
  if (fin.islrRetention != null && parseFloat(fin.islrRetention) > 0) {
    addLine('Retencion ISLR:', `-${parseFloat(fin.islrRetention)}`, false, COLORS.error)
  }

  // Retención Municipal
  if (fin.municipalRetention != null && parseFloat(fin.municipalRetention) > 0) {
    addLine('Retencion Municipal:', `-${parseFloat(fin.municipalRetention)}`, false, COLORS.error)
  }

  // IGTF
  if (fin.igtf != null && parseFloat(fin.igtf) > 0) {
    addLine('IGTF:', fin.igtf)
  }

  // Línea separadora antes del total
  y += 1
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.6)
  doc.line(labelX, y, rightCol, y)
  y += 6

  // TOTAL con fondo destacado
  const totalVal = fin.totalSales || 0
  doc.setFillColor(...COLORS.secondary)
  doc.roundedRect(labelX - 2, y - 5, rightCol - labelX + 2, 10, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', labelX + 2, y + 1)
  doc.text(fmtCurrency(totalVal, currency), rightCol - 2, y + 1, { align: 'right' })

  return y + 12
}

/** Dibuja la sección de notas (si existen) */
function drawNotes(doc, invoice, pageWidth, y) {
  if (!invoice.notes) return y

  y = checkPage(doc, y, 250)

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('OBSERVACIONES', MARGIN, y)
  y += 1

  doc.setDrawColor(...COLORS.lightGrey)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  y += 4

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.grey)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(invoice.notes, pageWidth - MARGIN * 2)
  lines.forEach(line => {
    y = checkPage(doc, y, 275)
    doc.text(line, MARGIN, y)
    y += 3.5
  })

  return y + 3
}

/** Dibuja el pie de página con la fecha de generación */
function drawFooter(doc, pageWidth) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const y = pageHeight - 10

  doc.setDrawColor(...COLORS.lightGrey)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 3, pageWidth - MARGIN, y - 3)

  doc.setFontSize(7)
  doc.setTextColor(...COLORS.grey)
  doc.setFont('helvetica', 'normal')

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  doc.text(`Generado por AD System el ${dateStr}`, MARGIN, y)
  doc.text('www.ad-businessgroup.netlify.app', pageWidth - MARGIN, y, { align: 'right' })
}

// ══════════════════════════════════════════════════════
// Función principal exportada
// ══════════════════════════════════════════════════════

/**
 * Genera y descarga un recibo PDF para una factura individual.
 * @param {Object} invoice - Objeto de factura ya transformado al formato frontend
 *   (con invoiceNumber, issuer, client, financial, items, etc.)
 */
export async function generateReceiptPdf(invoice) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // 1. Encabezado con logo
  let y = await drawHeader(doc, pageWidth)

  // 2. Título del documento (tipo, número, estado)
  y = drawDocumentTitle(doc, invoice, pageWidth, y)

  // 3. Emisor y Receptor
  y = drawParties(doc, invoice, pageWidth, y)

  // 4. Fechas y moneda
  y = drawDates(doc, invoice, pageWidth, y)

  // 5. Tabla de ítems
  y = drawItemsTable(doc, invoice, pageWidth, y)

  // 6. Resumen financiero
  y = drawFinancialSummary(doc, invoice, pageWidth, y)

  // 7. Notas
  y = drawNotes(doc, invoice, pageWidth, y)

  // 8. Pie de página (en todas las páginas)
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, pageWidth)
  }

  // Descargar el PDF
  const fileName = `Recibo_${invoice.invoiceNumber || 'sin-numero'}_${fmtDate(invoice.issueDate).replace(/\//g, '-')}.pdf`
  doc.save(fileName)
}
