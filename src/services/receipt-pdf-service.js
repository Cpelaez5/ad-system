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
  bgLight:   [248, 249, 252],   // Fondo sutil para secciones
  white:     [255, 255, 255],
  black:     [40, 40, 40],
  tableHead: [31, 53, 92],      // Fondo del header de la tabla
  tableAlt:  [245, 247, 250],   // Fila alterna
  tableBorder: [220, 225, 230], // Bordes sutiles de tabla
  success:   [46, 125, 50],
  warning:   [230, 120, 0],
  error:     [198, 40, 40]
}

const MARGIN = 18
const LINE_HEIGHT = 6.5

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
function checkPage(doc, y, threshold = 268) {
  if (y > threshold) {
    doc.addPage()
    return 25
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

/** Dibuja una línea horizontal decorativa fina */
function drawDivider(doc, pageWidth, y, color = COLORS.lightGrey, lineWidth = 0.3) {
  doc.setDrawColor(...color)
  doc.setLineWidth(lineWidth)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
}

// ══════════════════════════════════════════════════════
// Secciones del recibo (cada una retorna la nueva posición Y)
// ══════════════════════════════════════════════════════

/** Dibuja el encabezado con logo y nombre del sistema */
async function drawHeader(doc, pageWidth) {
  let y = 18

  // Logo
  try {
    const logoInfo = await getBase64ImageFromURL(systemLogo)
    const pdfHeight = 16
    const ratio = logoInfo.width / logoInfo.height
    const pdfWidth = pdfHeight * ratio
    doc.addImage(logoInfo.dataURL, 'PNG', MARGIN, y - 6, pdfWidth, pdfHeight)

    // Nombre del sistema al lado del logo
    doc.setFontSize(18)
    doc.setTextColor(...COLORS.secondary)
    doc.setFont('helvetica', 'bold')
    doc.text('AD System', MARGIN + pdfWidth + 5, y + 1)

    doc.setFontSize(8)
    doc.setTextColor(...COLORS.grey)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Gestion Contable', MARGIN + pdfWidth + 5, y + 6)
  } catch (e) {
    // Fallback sin logo
    doc.setFontSize(18)
    doc.setTextColor(...COLORS.secondary)
    doc.setFont('helvetica', 'bold')
    doc.text('AD System', MARGIN, y + 1)
  }

  // Línea decorativa gruesa con gradiente simulado (doble línea)
  y += 16
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(1.2)
  doc.line(MARGIN, y, pageWidth - MARGIN, y)
  doc.setDrawColor(...COLORS.accent)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y + 1.8, pageWidth - MARGIN, y + 1.8)

  return y + 10
}

/** Dibuja el bloque de tipo de documento, número y estado */
function drawDocumentTitle(doc, invoice, pageWidth, y) {
  const number = invoice.invoiceNumber || '—'
  const control = invoice.controlNumber
  const status = invoice.status || 'BORRADOR'
  const contentWidth = pageWidth - MARGIN * 2

  // Fondo sutil para el bloque del título
  doc.setFillColor(...COLORS.bgLight)
  const blockHeight = control ? 32 : 28
  doc.roundedRect(MARGIN, y - 6, contentWidth, blockHeight, 3, 3, 'F')

  // Título: siempre "RECIBO" (sistema no homologado)
  doc.setFontSize(16)
  doc.setTextColor(...COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBO', pageWidth / 2, y + 2, { align: 'center' })

  // Número
  y += 10
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'normal')
  doc.text(`N.  ${number}`, pageWidth / 2, y, { align: 'center' })

  // Número de control (si existe)
  if (control) {
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.grey)
    doc.text(`Control: ${control}`, pageWidth / 2, y, { align: 'center' })
  }

  // Estado con chip/badge de color
  y += 9
  const statusColor = getStatusColor(status)
  const statusText = status
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const textWidth = doc.getTextWidth(statusText) + 12
  const xCenter = (pageWidth / 2) - (textWidth / 2)

  doc.setFillColor(...statusColor)
  doc.roundedRect(xCenter, y - 4.5, textWidth, 7, 2, 2, 'F')
  doc.setTextColor(...COLORS.white)
  doc.text(statusText, pageWidth / 2, y, { align: 'center' })

  return y + 12
}

/** Dibuja los bloques de Emisor y Receptor lado a lado */
function drawParties(doc, invoice, pageWidth, y) {
  const contentWidth = pageWidth - MARGIN * 2
  const gap = 12
  const colWidth = (contentWidth - gap) / 2
  const leftX = MARGIN
  const rightX = MARGIN + colWidth + gap
  const isVenta = invoice.flow === 'VENTA'

  // Etiquetas según flujo
  const leftLabel = isVenta ? 'EMISOR' : 'PROVEEDOR'
  const rightLabel = isVenta ? 'CLIENTE / RECEPTOR' : 'RECEPTOR'

  // Datos
  const leftData = invoice.issuer || {}
  const rightData = invoice.client || {}

  // Dibujar cada columna con mejor espaciado
  const drawPartyColumn = (x, label, data, startY) => {
    let cy = startY

    // Etiqueta con icono visual (rectángulo decorativo)
    doc.setFillColor(...COLORS.primary)
    doc.rect(x, cy - 3, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.primary)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x + 5, cy)
    cy += 2

    // Línea bajo la etiqueta
    doc.setDrawColor(...COLORS.primary)
    doc.setLineWidth(0.4)
    doc.line(x, cy, x + colWidth, cy)
    cy += 7

    // Nombre de empresa
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.black)
    doc.setFont('helvetica', 'bold')
    const companyName = data.companyName || '—'
    const nameLines = doc.splitTextToSize(companyName, colWidth)
    nameLines.forEach(line => {
      doc.text(line, x, cy)
      cy += 4.5
    })
    cy += 1

    // RIF
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    if (data.rif) {
      doc.text(`RIF: ${data.rif}`, x, cy)
      cy += 5
    }

    // Dirección
    if (data.address) {
      const lines = doc.splitTextToSize(data.address, colWidth)
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.grey)
      lines.forEach(line => {
        doc.text(line, x, cy)
        cy += 4
      })
      cy += 1
    }

    // Teléfono
    if (data.phone) {
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.grey)
      doc.text(`Tlf: ${data.phone}`, x, cy)
      cy += 4
    }

    // Email
    if (data.email) {
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.grey)
      doc.text(data.email, x, cy)
      cy += 4
    }

    return cy
  }

  const leftEndY = drawPartyColumn(leftX, leftLabel, leftData, y)
  const rightEndY = drawPartyColumn(rightX, rightLabel, rightData, y)

  return Math.max(leftEndY, rightEndY) + 6
}

/** Dibuja la fila de fechas y moneda con mejor presentación */
function drawDates(doc, invoice, pageWidth, y) {
  const currency = invoice.financial?.currency || 'VES'
  const contentWidth = pageWidth - MARGIN * 2

  // Fondo con bordes redondeados
  doc.setFillColor(...COLORS.tableAlt)
  doc.roundedRect(MARGIN, y - 5, contentWidth, 14, 2, 2, 'F')

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.black)

  const thirdWidth = contentWidth / 3

  // Fecha emisión
  doc.setFont('helvetica', 'bold')
  doc.text('Emision:', MARGIN + 5, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtDate(invoice.issueDate), MARGIN + 25, y + 2)

  // Fecha vencimiento
  doc.setFont('helvetica', 'bold')
  doc.text('Vencimiento:', MARGIN + thirdWidth + 5, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtDate(invoice.dueDate), MARGIN + thirdWidth + 32, y + 2)

  // Moneda (nombre legible)
  const currencyLabels = { VES: 'Bolivares (VES)', USD: 'Dolar (USD)', EUR: 'Euro (EUR)' }
  doc.setFont('helvetica', 'bold')
  doc.text('Moneda:', MARGIN + thirdWidth * 2 + 5, y + 2)
  doc.setFont('helvetica', 'normal')
  doc.text(currencyLabels[currency] || currency, MARGIN + thirdWidth * 2 + 23, y + 2)

  return y + 18
}

/** Dibuja la tabla de ítems/conceptos con mejor espaciado */
function drawItemsTable(doc, invoice, pageWidth, y) {
  const items = invoice.items || []
  if (items.length === 0) return y

  const currency = invoice.financial?.currency || 'VES'
  const tableWidth = pageWidth - MARGIN * 2

  // Título de sección
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLE DE CONCEPTOS', MARGIN, y)
  y += 6

  // Anchos de columna (proporcionales al ancho disponible)
  const colWidths = {
    num:   14,
    desc:  tableWidth - 14 - 22 - 34 - 34,
    qty:   22,
    price: 34,
    total: 34
  }

  // Header de tabla con bordes redondeados
  doc.setFillColor(...COLORS.tableHead)
  doc.roundedRect(MARGIN, y, tableWidth, 9, 1.5, 1.5, 'F')

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')

  let xPos = MARGIN + 4
  doc.text('#', xPos, y + 6)
  xPos += colWidths.num
  doc.text('Descripcion', xPos, y + 6)
  xPos += colWidths.desc
  doc.text('Cant.', xPos, y + 6)
  xPos += colWidths.qty
  doc.text('P. Unit.', xPos, y + 6)
  xPos += colWidths.price
  doc.text('Total', xPos, y + 6)

  y += 12

  // Filas de ítems con mejor espaciado vertical
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')

  const rowHeight = 8

  items.forEach((item, idx) => {
    y = checkPage(doc, y, 255)

    // Fondo alterno
    if (idx % 2 === 0) {
      doc.setFillColor(...COLORS.tableAlt)
      doc.rect(MARGIN, y - 5, tableWidth, rowHeight, 'F')
    }

    doc.setTextColor(...COLORS.black)
    xPos = MARGIN + 4
    doc.text(`${idx + 1}`, xPos, y)
    xPos += colWidths.num

    // Descripción (con wrap si es muy larga)
    const descLines = doc.splitTextToSize(item.description || '—', colWidths.desc - 6)
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
        y += 4.5
        doc.setTextColor(...COLORS.grey)
        doc.text(descLines[i], MARGIN + 4 + colWidths.num, y)
      }
    }

    y += rowHeight
  })

  // Línea inferior de la tabla
  drawDivider(doc, pageWidth, y - 3, COLORS.tableBorder, 0.4)

  return y + 4
}

/** Dibuja el resumen financiero (totales, impuestos, retenciones) */
function drawFinancialSummary(doc, invoice, pageWidth, y) {
  const fin = invoice.financial || {}
  const currency = fin.currency || 'VES'
  const rightCol = pageWidth - MARGIN
  const summaryWidth = 90
  const labelX = rightCol - summaryWidth

  y = checkPage(doc, y, 235)

  // Fondo sutil para el bloque de totales
  doc.setFillColor(...COLORS.bgLight)
  doc.roundedRect(labelX - 4, y - 4, summaryWidth + 4, 8, 0, 0, 'F')

  // Título de sección
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('RESUMEN FINANCIERO', labelX, y)
  y += 3

  drawDivider(doc, pageWidth, y, COLORS.secondary, 0.3)
  y += 7

  // Helper para cada línea del resumen con mejor espaciado
  const addLine = (label, value, isBold = false, color = COLORS.black) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    doc.text(label, labelX, y)
    doc.text(fmtCurrency(value, currency), rightCol, y, { align: 'right' })
    y += LINE_HEIGHT
  }

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
  y += 2
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.8)
  doc.line(labelX, y, rightCol, y)
  y += 8

  // TOTAL con fondo destacado y más prominente
  const totalVal = fin.totalSales || 0
  doc.setFillColor(...COLORS.secondary)
  doc.roundedRect(labelX - 4, y - 6, summaryWidth + 4, 12, 2.5, 2.5, 'F')
  doc.setFontSize(12)
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', labelX + 2, y + 1)
  doc.text(fmtCurrency(totalVal, currency), rightCol - 3, y + 1, { align: 'right' })

  return y + 18
}

/** Dibuja el detalle del pago a crédito (Cashea) */
function drawCreditDetails(doc, invoice, pageWidth, y) {
  if (invoice.financial?.paymentMethod !== 'CASHEA' || !invoice.financial?.credit) return y

  const credit = invoice.financial.credit
  const currency = invoice.financial.currency || 'VES'
  
  y = checkPage(doc, y, 220)

  // Título de la sección
  doc.setFillColor(...COLORS.primary)
  doc.rect(MARGIN, y - 3, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('DETALLE DE PAGO CASHEA (CRÉDITO)', MARGIN + 5, y)
  y += 3

  drawDivider(doc, pageWidth, y, COLORS.lightGrey, 0.2)
  y += 6

  // Info inicial
  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'normal')
  
  doc.text('Inicial Pagada:', MARGIN, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.success)
  doc.text(`${fmtCurrency(credit.initialAmount, currency)} (${credit.initialPercentage}%)`, MARGIN + 25, y)
  
  y += 8
  
  // Tabla de cuotas
  const items = credit.installments || []
  if (items.length > 0) {
    const tableWidth = pageWidth - MARGIN * 2
    
    doc.setFillColor(...COLORS.tableAlt)
    doc.roundedRect(MARGIN, y - 5, tableWidth, 7, 1.5, 1.5, 'F')
    
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.secondary)
    doc.setFont('helvetica', 'bold')
    
    doc.text('Fecha de Pago', MARGIN + 5, y)
    doc.text('Monto', MARGIN + tableWidth / 2, y, { align: 'center' })
    doc.text('Estado', MARGIN + tableWidth - 5, y, { align: 'right' })
    
    y += 6
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    
    items.forEach((inst, idx) => {
      y = checkPage(doc, y, 260)
      doc.setTextColor(...COLORS.black)
      
      doc.text(fmtDate(inst.date), MARGIN + 5, y)
      doc.text(fmtCurrency(inst.amount, currency), MARGIN + tableWidth / 2, y, { align: 'center' })
      
      const statusColor = inst.status === 'PAGADA' ? COLORS.success : COLORS.warning
      doc.setTextColor(...statusColor)
      doc.setFont('helvetica', 'bold')
      doc.text(inst.status === 'PAGADA' ? 'Pagada' : 'Por Cobrar', MARGIN + tableWidth - 5, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      
      y += 5
    })
  }

  return y + 4
}

/** Dibuja la sección de notas (si existen) */
function drawNotes(doc, invoice, pageWidth, y) {
  if (!invoice.notes) return y

  y = checkPage(doc, y, 248)

  // Título con icono decorativo
  doc.setFillColor(...COLORS.accent)
  doc.rect(MARGIN, y - 3, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('OBSERVACIONES', MARGIN + 5, y)
  y += 3

  drawDivider(doc, pageWidth, y, COLORS.lightGrey, 0.2)
  y += 6

  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(invoice.notes, pageWidth - MARGIN * 2)
  lines.forEach(line => {
    y = checkPage(doc, y, 275)
    doc.text(line, MARGIN, y)
    y += 4
  })

  return y + 4
}

/** Dibuja el pie de página con la fecha de generación */
function drawFooter(doc, pageWidth, pageNum, totalPages) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const y = pageHeight - 12

  // Línea decorativa (doble, como el header)
  doc.setDrawColor(...COLORS.lightGrey)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 4, pageWidth - MARGIN, y - 4)

  doc.setFontSize(7)
  doc.setTextColor(...COLORS.grey)
  doc.setFont('helvetica', 'normal')

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  doc.text(`Generado por AD System  |  ${dateStr}`, MARGIN, y)

  // Número de página + URL
  const rightText = totalPages > 1
    ? `Pag. ${pageNum}/${totalPages}  |  ad-businessgroup.netlify.app`
    : 'ad-businessgroup.netlify.app'
  doc.text(rightText, pageWidth - MARGIN, y, { align: 'right' })
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

  // 2. Título del documento (siempre "RECIBO", número, estado)
  y = drawDocumentTitle(doc, invoice, pageWidth, y)

  // 3. Emisor y Receptor
  y = drawParties(doc, invoice, pageWidth, y)

  // 4. Fechas y moneda
  y = drawDates(doc, invoice, pageWidth, y)

  // 5. Tabla de ítems
  y = drawItemsTable(doc, invoice, pageWidth, y)

  // 6. Resumen financiero
  y = drawFinancialSummary(doc, invoice, pageWidth, y)

  // 6.5 Detalle de crédito (Cashea)
  y = drawCreditDetails(doc, invoice, pageWidth, y)

  // 7. Notas
  y = drawNotes(doc, invoice, pageWidth, y)

  // 8. Pie de página (en todas las páginas con numeración)
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, pageWidth, i, totalPages)
  }

  // Descargar el PDF
  const fileName = `Recibo_${invoice.invoiceNumber || 'sin-numero'}_${fmtDate(invoice.issueDate).replace(/\//g, '-')}.pdf`
  doc.save(fileName)
}
