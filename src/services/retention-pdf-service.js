/**
 * retention-pdf-service.js
 * Servicio especializado para generar Comprobantes de Retención oficiales en PDF (IVA e ISLR).
 *
 * Cumple con la normativa tributaria del SENIAT (Venezuela):
 * - Retención de I.V.A.: Ley de IVA Art. 11 y Providencia Administrativa de Retenciones de IVA.
 * - Retención de I.S.L.R.: Decreto 1.808 (G.O. N° 36.203 en materia de retenciones de ISLR).
 *
 * Principios S.O.L.I.D.:
 * - S (Single Responsibility): Dedicado exclusivamente al maquetado y renderizado de comprobantes de retención.
 * - O (Open/Closed): Estructura modular extensible a otros tipos de retenciones (ej: Municipal).
 * - D (Dependency Inversion): Utiliza jsPDF, seal-service y supabase para datos reales.
 */

import { jsPDF } from 'jspdf'
import sealService from '@/services/seal-service.js'
import { normalizarAjustes, cajaImagen } from '@/utils/ajustesSello.js'
import { supabase } from '@/lib/supabaseClient'
import venezuelaLocationsService from '@/services/venezuelaLocationsService.js'
import systemLogo from '/ADSystem/logo.png'
import watermarkLogo from '/ADSystem/png/svg_logo_ADADAD_3000x3000.png'
import { formatFechaCorta, parseFechaLocal } from '@/utils/fechas'
import { normalizarRif } from '@/utils/rif'
import { parseMontoVenezolano } from '@/utils/formatMoney'

// ══════════════════════════════════════════════════════
// Constantes de diseño corporativo AD SYSTEM
// ══════════════════════════════════════════════════════
const COLORS = {
  primary: [142, 24, 24],     // #8E1818 - Granate AD System
  secondary: [42, 42, 46],    // #2A2A2E - Carbón AD System (antes azul de AD Business Group)
  accent: [142, 24, 24],     // #8E1818 - Granate (antes dorado de AD Business Group)
  black: [30, 30, 30],
  darkGrey: [70, 70, 70],
  grey: [120, 120, 120],
  lightGrey: [220, 220, 220],
  tableHeaderBg: [240, 242, 245],
  tableBorder: [180, 185, 195],
  boxBorder: [120, 125, 135],
  totalBg: [245, 247, 250],
  highlightRed: [180, 20, 25]
}

/** Helper para convertir imagen a base64 DataURL */
function getBase64ImageFromURL(url) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null)
    if (typeof url === 'string' && url.startsWith('data:image/')) {
      const img = new Image()
      img.onload = () => resolve({ dataURL: url, width: img.width, height: img.height })
      img.onerror = () => resolve(null)
      img.src = url
      return
    }
    const img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const dataURL = canvas.toDataURL('image/png')
        resolve({ dataURL, width: canvas.width, height: canvas.height })
      } catch (err) {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Formateador de moneda venezolano con separadores estándar */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '0,00'
  const num = typeof value === 'number' ? value : parseMontoVenezolano(value)
  if (!Number.isFinite(num)) return '0,00'
  // Sin depender del idioma del navegador: 1.234.567,89 siempre
  const [entero, decimal] = Math.abs(num).toFixed(decimals).split('.')
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const esCero = Number(Math.abs(num).toFixed(decimals)) === 0
  return `${num < 0 && !esCero ? '-' : ''}${miles}${decimal ? `,${decimal}` : ''}`
}

/** Formateador de fechas DD/MM/YYYY */
function formatDate(dateStr) {
  if (!dateStr) return ''
  // Fecha local: new Date('YYYY-MM-DD') imprimía el día anterior en Venezuela (UTC-4)
  return formatFechaCorta(dateStr) || String(dateStr)
}

/** Extrae año y mes de una fecha (en hora local: '2026-10-01' es octubre, no septiembre) */
export function getYearMonth(dateStr) {
  const d = parseFechaLocal(dateStr) || new Date()
  const year = d.getFullYear()
  const monthNum = d.getMonth() + 1
  const month = String(monthNum).padStart(2, '0')
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return {
    year: String(year),
    month: month,
    monthName: monthNames[monthNum - 1] || 'Mes',
    periodCode: `${year}${month}`
  }
}

/** Trunca texto a un ancho máximo para evitar desbordamiento */
function truncateText(doc, text, maxWidth) {
  if (!text) return ''
  const str = String(text)
  // Verificar si el texto cabe
  const textWidth = doc.getTextWidth(str)
  if (textWidth <= maxWidth) return str
  // Truncar con puntos suspensivos
  let truncated = str
  while (doc.getTextWidth(truncated + '…') > maxWidth && truncated.length > 1) {
    truncated = truncated.substring(0, truncated.length - 1)
  }
  return truncated + '…'
}

/** Dibuja un rectángulo con bordes definidos */
/**
 * Estampa sello y/o firma sobre la línea de firma del agente de retención.
 * - Imagen combinada (sello + firma en una sola): se usa tal cual.
 * - Si no: el sello a la izquierda, montado sobre la línea, y la firma a la derecha.
 *   Antes solo se estampaba UNA imagen aunque el negocio tuviera las dos.
 * La vista previa de Mi negocio (VistaPreviaSelloFirma.vue) usa estas mismas medidas.
 */
// Largo de la línea de firma (mm). El tamaño y la posición del sello y la firma
// viven en src/utils/ajustesSello.js (BASE + ajustes del cliente).
export const MEDIDAS_SELLO_FIRMA = {
  linea: { ancho: 75 },
}

export async function estamparSelloYFirma(doc, config, x, lineY, width) {
  // Tamaño y posición: medidas base + ajustes del cliente (src/utils/ajustesSello.js),
  // las mismas que usa la vista previa de Mi negocio.
  const ajustes = normalizarAjustes(config?.ajustes)
  const poner = async (url, tipo) => {
    if (!url) return
    try {
      const img = await getBase64ImageFromURL(url)
      if (!img?.dataURL) return
      const c = cajaImagen(tipo, ajustes[tipo], width, img.width / img.height)
      doc.addImage(img.dataURL, 'PNG', x + c.x, lineY + c.y, c.ancho, c.alto)
    } catch (err) {
      console.warn('No se pudo estampar la imagen de sello o firma', err)
    }
  }
  if (config?.combinedUrl) {
    await poner(config.combinedUrl, 'sello')
    return
  }
  await poner(config?.sealUrl, 'sello')
  await poner(config?.signatureUrl, 'firma')
}

function drawBox(doc, x, y, width, height, fillColor = null, strokeColor = COLORS.boxBorder, lineWidth = 0.3) {
  doc.setLineWidth(lineWidth)
  doc.setDrawColor(...strokeColor)
  if (fillColor) {
    doc.setFillColor(...fillColor)
    doc.rect(x, y, width, height, 'FD')
  } else {
    doc.rect(x, y, width, height, 'S')
  }
}

/** Dibuja la marca de agua corporativa AD SYSTEM en el centro del documento */
async function drawWatermark(doc, pageWidth, pageHeight) {
  try {
    const wmImg = await getBase64ImageFromURL(watermarkLogo) || await getBase64ImageFromURL(systemLogo)
    if (wmImg && wmImg.dataURL) {
      const wmSize = 90
      const wmX = (pageWidth - wmSize) / 2
      const wmY = (pageHeight - wmSize) / 2

      try {
        if (doc.GState) {
          doc.saveGraphicsState()
          doc.setGState(new doc.GState({ opacity: 0.06 }))
          doc.addImage(wmImg.dataURL, 'PNG', wmX, wmY, wmSize, wmSize)
          doc.restoreGraphicsState()
          return
        }
      } catch (gErr) {
        // Fallback si no soporta GState
      }
    }
  } catch (e) {
    console.warn('Could not draw watermark', e)
  }
}

/** Dibuja la franja superior de marca AD System: carbón y granate */
function drawCorporateHeaderBand(doc, pageWidth) {
  doc.setFillColor(...COLORS.secondary)
  doc.rect(0, 0, pageWidth, 3.5, 'F')
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 3.5, pageWidth, 1.8, 'F')
}

/** Logo oficial arriba a la izquierda, con su proporción real (no se estira). Devuelve el ancho usado. */
async function drawLogoCabecera(doc, x, y, alto = 10) {
  try {
    const logoInfo = await getBase64ImageFromURL(systemLogo)
    if (logoInfo && logoInfo.dataURL) {
      const ancho = alto * (logoInfo.width / logoInfo.height)
      doc.addImage(logoInfo.dataURL, 'PNG', x, y, ancho, alto)
      return ancho
    }
  } catch (e) {
    // sin logo: el documento sigue siendo válido
  }
  return 0
}

/**
 * Fila "nombre o razón social + RIF" de una de las partes. El nombre se ajusta a varias líneas
 * (antes se cortaba a 70 letras: "…CONSUMO MASIVO, C." sin la "A."). Devuelve la altura usada.
 */
function drawFilaParte(doc, x, y, col1Width, col2Width, etiquetaNombre, nombre, etiquetaRif, rif) {
  const texto = String(nombre || 'NO REGISTRADO').toUpperCase().replace(/\s+/g, ' ').trim()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  const lineas = doc.splitTextToSize(texto, col1Width - 6).slice(0, 3)
  const alto = Math.max(11.5, 6 + lineas.length * 4.2)

  drawBox(doc, x, y, col1Width, alto)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.darkGrey)
  doc.text(etiquetaNombre, x + 3, y + 4)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.secondary)
  lineas.forEach((l, i) => doc.text(l, x + 3, y + 8.6 + i * 4.2))

  drawBox(doc, x + col1Width, y, col2Width, alto)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.darkGrey)
  doc.text(etiquetaRif, x + col1Width + 3, y + 4)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(formatearRif(rif) || 'NO REGISTRADO', x + col1Width + 3, y + 8.6)
  return alto
}

/** RIF como L-NNNNNNNN-N cuando es válido; si no, tal como viene (en mayúsculas). */
function formatearRif(rif) {
  const crudo = String(rif || '').trim()
  if (!crudo) return ''
  return normalizarRif(crudo) || crudo.toUpperCase()
}

/**
 * Dibuja una caja de dirección fiscal con auto-envoltura y altura dinámica (1 o 2 líneas).
 * Evita desbordes de texto y solapamientos con las siguientes filas o tablas.
 * @returns {number} Altura ocupada por la caja en mm
 */
function drawAddressBox(doc, x, y, width, label, addressText) {
  const rawText = String(addressText || 'DIRECCIÓN FISCAL NO REGISTRADA')
  // Normalizar saltos de línea a coma y espacio para mantener fluidez visual
  const clean = rawText
    .replace(/[\r\n]+/g, ', ')
    .replace(/\s*,\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const lines = doc.splitTextToSize(clean, width - 6).slice(0, 3)
  const boxHeight = 7.5 + lines.length * 4.1

  drawBox(doc, x, y, width, boxHeight)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.darkGrey)
  doc.text(label, x + 3, y + 4)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.black)
  lines.forEach((l, i) => doc.text(l, x + 3, y + 8.3 + i * 4.1))

  return boxHeight
}

/** Resuelve la información del Agente y Sujeto según el flujo (COMPRA o VENTA) */
async function resolveParties(invoice, companyInfo = {}, retData = null) {
  const tenantName = companyInfo?.name || companyInfo?.companyName || invoice.organization?.name || 'EMPRESA AGENTE'
  const tenantRif = companyInfo?.rif || invoice.organization?.rif || ''
  const tenantDir = companyInfo?.address || companyInfo?.direccion || invoice.organization?.address || 'DIRECCIÓN FISCAL NO REGISTRADA'
  const tenantPhone = companyInfo?.phone || invoice.organization?.phone || ''
  const tenantLicencia = companyInfo?.licencia_actividad_economica || companyInfo?.licencia || invoice.client?.licencia_actividad_economica || ''
  const rawTenantMun = companyInfo?.municipio || companyInfo?.municipio_id || invoice.client?.municipio_id || invoice.client?.municipio || ''
  const tenantMunicipio = venezuelaLocationsService.getCleanMunicipalityName(rawTenantMun)

  let agente = {}
  let sujeto = {}

  if (invoice.flow === 'COMPRA') {
    // COMPRA: El usuario/tenant es el Agente que retiene; el Proveedor es el Sujeto Retenido
    agente = {
      name: tenantName,
      rif: tenantRif,
      address: tenantDir,
      phone: tenantPhone,
      licencia: tenantLicencia,
      municipio: tenantMunicipio
    }
    const rawSujetoMun = invoice.issuer?.municipio_id || invoice.issuer?.municipio || retData?.municipio_id || ''
    sujeto = {
      name: invoice.issuer?.razon_social || invoice.issuer?.nombre || invoice.issuer?.companyName || retData?.proveedor_nombre || 'PROVEEDOR NO REGISTRADO',
      rif: invoice.issuer?.rif || retData?.proveedor_rif || '',
      address: invoice.issuer?.direccion || invoice.issuer?.address || 'DIRECCIÓN FISCAL NO REGISTRADA',
      phone: invoice.issuer?.telefono || invoice.issuer?.phone || '',
      licencia: invoice.issuer?.licencia_actividad_economica || invoice.issuer?.licencia || retData?.licencia_actividad || '',
      municipio: venezuelaLocationsService.getCleanMunicipalityName(rawSujetoMun)
    }

    // Consultar tabla 'proveedores' para reflejar siempre los datos fiscales más recientes (dirección, licencia, municipio)
    try {
      const provId = invoice.issuer?.id || invoice.issuer_id || invoice.provider_id
      const provRif = sujeto.rif && sujeto.rif !== '' ? sujeto.rif : (invoice.issuer?.rif || retData?.proveedor_rif)
      
      let provData = null
      if (provId) {
        const { data } = await supabase.from('proveedores').select('*').eq('id', provId).maybeSingle()
        provData = data
      }
      if (!provData && provRif) {
        const { data } = await supabase.from('proveedores').select('*').eq('rif', provRif).maybeSingle()
        provData = data
      }

      if (provData) {
        if (!sujeto.name || sujeto.name === 'PROVEEDOR NO REGISTRADO') sujeto.name = provData.nombre || provData.razon_social || sujeto.name
        if (!sujeto.rif || sujeto.rif === '') sujeto.rif = provData.rif || sujeto.rif
        if (provData.direccion || provData.address) sujeto.address = provData.direccion || provData.address
        if (provData.telefono || provData.phone) sujeto.phone = provData.telefono || provData.phone
        if (provData.licencia_actividad_economica || provData.licencia) sujeto.licencia = provData.licencia_actividad_economica || provData.licencia
        if (provData.municipio_id || provData.municipio) {
          sujeto.municipio = venezuelaLocationsService.getCleanMunicipalityName(provData.municipio_id || provData.municipio)
        }
      }
    } catch (e) {
      console.warn('Error fetching proveedor data fallback in resolveParties:', e)
    }
  } else {
    // VENTA: El Cliente es el Agente que retiene; el usuario/tenant es el Sujeto Retenido
    const rawClienteMun = invoice.client?.municipio_id || invoice.client?.municipio || ''
    agente = {
      name: invoice.client?.razon_social || invoice.client?.nombre || invoice.client?.companyName || 'CLIENTE AGENTE',
      rif: invoice.client?.rif || '',
      address: invoice.client?.direccion || invoice.client?.address || 'DIRECCIÓN FISCAL NO REGISTRADA',
      phone: invoice.client?.telefono || invoice.client?.phone || '',
      licencia: invoice.client?.licencia_actividad_economica || '',
      municipio: venezuelaLocationsService.getCleanMunicipalityName(rawClienteMun)
    }
    sujeto = {
      name: tenantName,
      rif: tenantRif,
      address: tenantDir,
      phone: tenantPhone,
      licencia: tenantLicencia,
      municipio: tenantMunicipio
    }

    // Fallback: Si faltan datos del cliente en VENTA, consultar tabla 'clients'
    const needsClientLookup = (!agente.address || agente.address === 'DIRECCIÓN FISCAL NO REGISTRADA' || !agente.licencia)
    if (needsClientLookup) {
      try {
        const cliId = invoice.client_id || invoice.client?.id
        if (cliId) {
          const { data: cliData } = await supabase.from('clients').select('*').eq('id', cliId).maybeSingle()
          if (cliData) {
            if (!agente.name || agente.name === 'CLIENTE AGENTE') agente.name = cliData.company_name || cliData.name || agente.name
            if (!agente.rif || agente.rif === '') agente.rif = cliData.rif || agente.rif
            if (!agente.address || agente.address === 'DIRECCIÓN FISCAL NO REGISTRADA') agente.address = cliData.address || 'DIRECCIÓN FISCAL NO REGISTRADA'
            if (!agente.phone) agente.phone = cliData.phone || ''
            if (!agente.licencia) agente.licencia = cliData.licencia_actividad_economica || ''
            if (agente.municipio === 'NO REGISTRADO' && (cliData.municipio_id || cliData.municipio)) {
              agente.municipio = venezuelaLocationsService.getCleanMunicipalityName(cliData.municipio_id || cliData.municipio)
            }
          }
        }
      } catch (e) {
        console.warn('Error fetching client data fallback in resolveParties:', e)
      }
    }
  }

  return { agente, sujeto }
}

/**
 * Consulta la tabla `retenciones` para obtener los datos fiscales reales
 * de una factura (comprobante, alícuota, sustraendo, código, etc.)
 * @param {string} invoiceId - UUID de la factura
 * @param {string} tipo - 'IVA' | 'ISLR' | 'MUNICIPAL'
 * @returns {Object|null} - Datos reales de la retención o null
 */
async function fetchRetentionData(invoiceId, tipo) {
  if (!invoiceId) return null
  try {
    const { data, error } = await supabase
      .from('retenciones')
      .select(`
        id,
        numero_comprobante,
        fecha_comprobante,
        porcentaje_retencion,
        base_imponible,
        monto_retenido,
        monto_iva,
        sustraendo_ut,
        valor_ut,
        proveedor_tipo_persona,
        proveedor_nombre,
        proveedor_rif,
        factura_numero,
        factura_control,
        factura_fecha,
        licencia_actividad,
        municipio_id,
        concepto_islr_id,
        concepto_islr_nombre,
        concepto_islr:concepto_islr_id (
          id,
          codigo,
          nombre,
          porcentaje_base,
          porcentaje_retencion,
          sustraendo_ut,
          aplica_persona
        )
      `)
      .eq('invoice_id', invoiceId)
      .eq('tipo', tipo)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.warn(`Error consultando retenciones (${tipo}):`, error.message)
      return null
    }
    return data
  } catch (e) {
    console.warn('Error en fetchRetentionData:', e)
    return null
  }
}

/** Dibuja la tabla de datos con columnas y filas, renderizando cada celda con auto-escalado y sin truncamiento innecesario */
function drawTableRow(doc, columns, rowData, x, y, rowHeight, options = {}) {
  const { fontSize = 6, fontStyle = 'bold', highlightLastCol = false } = options
  let curX = x

  columns.forEach((col, idx) => {
    // Línea vertical de la celda
    doc.line(curX, y, curX, y + rowHeight)
    
    const val = String(rowData[idx] || '')
    const textY = y + (rowHeight / 2) + 1.5

    // Color especial para última columna (monto retenido)
    if (highlightLastCol && idx === columns.length - 1) {
      doc.setTextColor(...COLORS.highlightRed)
    } else {
      doc.setTextColor(...COLORS.black)
    }

    doc.setFont('helvetica', fontStyle)
    let currentFontSize = fontSize
    doc.setFontSize(currentFontSize)

    const maxTextWidth = col.width - 2
    let textWidth = doc.getTextWidth(val)

    // Si el texto es largo, reducir la fuente (hasta 6 pt) para que se lea completo
    while (textWidth > maxTextWidth && currentFontSize > 6) {
      currentFontSize -= 0.3
      doc.setFontSize(currentFontSize)
      textWidth = doc.getTextWidth(val)
    }

    // Solo si aún con 6 pt sobrepasa el ancho, truncar con seguridad
    const displayVal = textWidth > maxTextWidth ? truncateText(doc, val, maxTextWidth) : val

    if (col.align === 'center') {
      doc.text(displayVal, curX + (col.width / 2), textY, { align: 'center' })
    } else if (col.align === 'right') {
      doc.text(displayVal, curX + col.width - 1.5, textY, { align: 'right' })
    } else {
      doc.text(displayVal, curX + 1.5, textY)
    }
    curX += col.width
  })
}

class RetentionPdfService {
  // ════════════════════════════════════════════════════════════════════════
  // 1. COMPROBANTE DE RETENCIÓN DE I.V.A. (Oficial SENIAT)
  // ════════════════════════════════════════════════════════════════════════
  async generarComprobanteIVA(invoice, companyInfo = {}) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()   // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight() // 210 mm
    const margin = 10
    const contentWidth = pageWidth - (margin * 2)

    // Consultar datos reales de la retención IVA
    const retData = await fetchRetentionData(invoice.id, 'IVA')

    // 1. Marca de agua
    await drawWatermark(doc, pageWidth, pageHeight)

    // 2. Franja superior institucional
    drawCorporateHeaderBand(doc, pageWidth)

    let y = 15

    // 3. Logo oficial (proporción real) y título
    await drawLogoCabecera(doc, margin, 8.5, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...COLORS.secondary)
    doc.text('COMPROBANTE DE RETENCIÓN DE I.V.A.', pageWidth / 2, y, { align: 'center' })
    y += 5.5

    // Texto legal reglamentario
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLORS.darkGrey)
    const legalText = 'Ley de IVA Art. 11. "La Administración Tributaria podrá designar como responsables del pago del impuesto, en calidad de agentes de retención, a quienes por sus funciones públicas o por razón de sus actividades privadas intervengan en operaciones gravadas con el impuesto establecido en este Decreto con Rango, Valor y Fuerza de Ley"'
    const splitLegal = doc.splitTextToSize(legalText, contentWidth - 20)
    doc.text(splitLegal, pageWidth / 2, y + 2, { align: 'center' })
    y += splitLegal.length * 3.3 + 3

    // 6. Cajas de Número de Comprobante, Fecha y Período Fiscal
    const retentionDate = retData?.fecha_comprobante || invoice.retention_date || invoice.retentionDate || invoice.issueDate
    const numComprobante = retData?.numero_comprobante 
      || invoice.financial?.ivaRetentionNumber 
      || invoice.financial?.iva_retention_number 
      || invoice.iva_retention_number 
      || invoice.retention_number 
      || (() => {
      const { periodCode } = getYearMonth(retentionDate)
      const rawNum = invoice.invoiceNumber ? String(invoice.invoiceNumber).replace(/\D/g, '') : '1'
      return `${periodCode}${rawNum.padStart(8, '0')}`
    })()

    const { year, month } = getYearMonth(retentionDate)
    const formattedRetentionDate = formatDate(retentionDate)
    const formattedFactDate = formatDate(retData?.factura_fecha || invoice.issueDate)

    const boxY = y
    const compBoxWidth = 130
    const compBoxHeight = 12.5
    const rightBoxWidth = (contentWidth - compBoxWidth - 6) / 2

    // Caja 1: No. Comprobante
    drawBox(doc, margin, boxY, compBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.black)
    doc.text('No. DE COMPROBANTE:', margin + 3, boxY + 8.2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...COLORS.primary)
    doc.text(numComprobante, margin + 52, boxY + 8.2)

    // Caja 2: Fecha
    const fechaX = margin + compBoxWidth + 3
    drawBox(doc, fechaX, boxY, rightBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('FECHA', fechaX + (rightBoxWidth / 2), boxY + 4.6, { align: 'center' })
    doc.setFontSize(9.5)
    doc.setTextColor(...COLORS.secondary)
    doc.text(formattedRetentionDate, fechaX + (rightBoxWidth / 2), boxY + 9.6, { align: 'center' })

    // Caja 3: Período Fiscal
    const periodX = fechaX + rightBoxWidth + 3
    drawBox(doc, periodX, boxY, rightBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('PERIODO FISCAL', periodX + (rightBoxWidth / 2), boxY + 4.6, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`AÑO: ${year}   MES: ${month}`, periodX + (rightBoxWidth / 2), boxY + 9.6, { align: 'center' })

    y += compBoxHeight + 3

    // 7. Cajas de Identificación de Agente y Sujeto
    const { agente, sujeto } = await resolveParties(invoice, companyInfo, retData)

    const col1Width = contentWidth * 0.65
    const col2Width = contentWidth * 0.35
    const partyRowHeight = 11.5

    // Agente - Nombre
    y += drawFilaParte(doc, margin, y, col1Width, col2Width, 'NOMBRE O RAZON SOCIAL DEL AGENTE DE RETENCION:', agente.name, 'REGISTRO DE INFORMACION FISCAL (RIF):', agente.rif)

    // Fila 2: Dirección Fiscal del Agente
    const agenteDirHeight = drawAddressBox(doc, margin, y, contentWidth, 'DIRECCION FISCAL DEL AGENTE DE RETENCION:', agente.address)
    y += agenteDirHeight + 2

    // Fila 3: Sujeto Retenido (Proveedor / Beneficiario)
    y += drawFilaParte(doc, margin, y, col1Width, col2Width, 'NOMBRE O RAZON SOCIAL DEL SUJETO A RETENCION:', sujeto.name, 'REGISTRO DE INFORMACION FISCAL (RIF):', sujeto.rif)

    // Fila 4: Dirección Fiscal del Sujeto Retenido
    const sujetoDirHeight = drawAddressBox(doc, margin, y, contentWidth, 'DIRECCION FISCAL DEL SUJETO A RETENCION:', sujeto.address)
    y += sujetoDirHeight + 2

    // 8. Tabla de Operaciones de IVA (14 Columnas) — anchos optimizados
    const columns = [
      { id: 'op', label: 'Op.', width: 7, align: 'center' },
      { id: 'date', label: 'Fecha\nDocumento', width: 18, align: 'center' },
      { id: 'invoiceNum', label: 'N° de Factura', width: 32, align: 'center' },
      { id: 'controlNum', label: 'N° Control Factura', width: 32, align: 'center' },
      { id: 'nd', label: 'N° Nota\nDébito', width: 13, align: 'center' },
      { id: 'nc', label: 'N° Nota\nCrédito', width: 13, align: 'center' },
      { id: 'opType', label: 'Tipo\nTrans.', width: 13, align: 'center' },
      { id: 'affected', label: 'Fact.\nAfectada', width: 14, align: 'center' },
      { id: 'total', label: 'Total\nFactura', width: 27, align: 'right' },
      { id: 'exempt', label: 'Sin Der.\nC.F.', width: 20, align: 'right' },
      { id: 'base', label: 'Base\nImponible', width: 27, align: 'right' },
      { id: 'aliquot', label: '%\nAlic.', width: 10, align: 'center' },
      { id: 'taxAmount', label: 'Imp.\nCausado', width: 25, align: 'right' },
      { id: 'retAmount', label: 'Imp. Retenido', width: 26, align: 'right' }
    ]

    // Dibujar Headers de la tabla
    const tableHeaderY = y
    const tableHeaderHeight = 11
    let curX = margin

    doc.setFillColor(...COLORS.tableHeaderBg)
    doc.rect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 'F')
    doc.setLineWidth(0.3)
    doc.setDrawColor(...COLORS.tableBorder)
    doc.rect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 'S')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)

    columns.forEach(col => {
      doc.line(curX, tableHeaderY, curX, tableHeaderY + tableHeaderHeight)
      
      const lines = col.label.split('\n')
      const textY = lines.length > 1 ? tableHeaderY + 4.7 : tableHeaderY + 6.6
      lines.forEach((line, lIdx) => {
        const lineY = textY + (lIdx * 3.5)
        if (col.align === 'center') {
          doc.text(line, curX + (col.width / 2), lineY, { align: 'center' })
        } else if (col.align === 'right') {
          doc.text(line, curX + col.width - 1.5, lineY, { align: 'right' })
        } else {
          doc.text(line, curX + 1.5, lineY)
        }
      })
      curX += col.width
    })

    y += tableHeaderHeight

    // Datos Financieros — priorizar datos reales de retención
    const fin = invoice.financial || {}
    const base = retData ? parseFloat(retData.base_imponible || 0) : parseFloat(fin.taxableSales || 0)
    const exento = parseFloat(fin.exemptSales || fin.nonTaxableSales || 0)
    const total = parseFloat(fin.totalSales || (base + exento + parseFloat(fin.taxDebit || 0)))
    const impuestoCausado = retData ? parseFloat(retData.monto_iva || 0) : parseFloat(fin.taxDebit || fin.tax_amount || 0)
    const impuestoRetenido = retData ? parseFloat(retData.monto_retenido || 0) : parseFloat(invoice.retenciones?.iva || fin.ivaRetention || 0)
    const alicuota = base > 0 && impuestoCausado > 0 ? Math.round((impuestoCausado / base) * 100) : 16

    const factNum = retData?.factura_numero || invoice.invoiceNumber || '000001'
    const factControl = retData?.factura_control || invoice.controlNumber || '00-000001'

    const rowData = [
      '1',
      formattedFactDate,
      factNum,
      factControl,
      '',
      '',
      '01-Reg',
      '',
      formatNumber(total),
      formatNumber(exento),
      formatNumber(base),
      `${alicuota}`,
      formatNumber(impuestoCausado),
      formatNumber(impuestoRetenido)
    ]

    // Dibujar Fila de Datos
    const dataRowHeight = 9
    doc.setLineWidth(0.2)
    doc.setDrawColor(...COLORS.tableBorder)
    doc.rect(margin, y, contentWidth, dataRowHeight, 'S')
    drawTableRow(doc, columns, rowData, margin, y, dataRowHeight, { fontSize: 9, highlightLastCol: true })

    y += dataRowHeight

    // Filas vacías adicionales de presentación reglamentaria
    for (let r = 0; r < 3; r++) {
      curX = margin
      doc.rect(margin, y, contentWidth, 6, 'S')
      columns.forEach(col => {
        doc.line(curX, y, curX, y + 6)
        curX += col.width
      })
      y += 6
    }

    // Fila de TOTALES
    const totalRowHeight = 9
    doc.setFillColor(...COLORS.totalBg)
    doc.rect(margin, y, contentWidth, totalRowHeight, 'F')
    doc.setLineWidth(0.3)
    doc.setDrawColor(...COLORS.boxBorder)
    doc.rect(margin, y, contentWidth, totalRowHeight, 'S')

    // Texto TOTALES en columnas de la izquierda
    const leftColsWidth = columns.slice(0, 8).reduce((acc, c) => acc + c.width, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLORS.black)
    doc.text('TOTALES', margin + leftColsWidth - 4, y + 6, { align: 'right' })

    // Montos totales por columna
    let totalX = margin + leftColsWidth
    const totalsValues = [
      formatNumber(total),
      formatNumber(exento),
      formatNumber(base),
      '',
      formatNumber(impuestoCausado),
      formatNumber(impuestoRetenido)
    ]

    columns.slice(8).forEach((col, idx) => {
      doc.line(totalX, y, totalX, y + totalRowHeight)
      const val = totalsValues[idx]
      if (val) {
        if (idx === 5) {
          doc.setTextColor(...COLORS.highlightRed)
        } else {
          doc.setTextColor(...COLORS.black)
        }
        doc.setFontSize(9)
        doc.text(val, totalX + col.width - 1.5, y + 6, { align: 'right' })
      }
      totalX += col.width
    })

    y += totalRowHeight + 6

    // 9. Resumen Financiero Lateral Derecho
    const summaryX = pageWidth - margin - 80
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    
    const summaryLines = [
      { label: 'Total Factura:', val: formatNumber(total) },
      { label: 'Base Imponible Factura:', val: formatNumber(base) },
      { label: 'IVA Factura:', val: formatNumber(impuestoCausado) },
      { label: 'IVA Retenido:', val: formatNumber(impuestoRetenido), isRed: true },
      { label: 'Total a Pagar:', val: formatNumber(total - impuestoRetenido), isBold: true }
    ]

    summaryLines.forEach((sLine, sIdx) => {
      const lineY = y + (sIdx * 5.6)
      doc.setFont('helvetica', sLine.isBold ? 'bold' : 'normal')
      doc.setTextColor(...COLORS.black)
      doc.text(sLine.label, summaryX, lineY)
      if (sLine.isRed) doc.setTextColor(...COLORS.highlightRed)
      doc.setFont('helvetica', 'bold')
      doc.text(sLine.val, pageWidth - margin - 3, lineY, { align: 'right' })
    })

    // 10. Área de Sello y Firmas
    const signAreaY = pageHeight - 27
    const signWidth = 75

    // Sello Digital del Agente si está configurado (aislado por cliente)
    const effectiveClientId = retData?.client_id || invoice?.clientId || invoice?.client_id || null
    const sealConfig = await sealService.getSealConfig(effectiveClientId)
    await estamparSelloYFirma(doc, sealConfig, margin + 5, signAreaY, signWidth)

    // Línea de firma Agente
    doc.setLineWidth(0.4)
    doc.setDrawColor(...COLORS.black)
    doc.line(margin + 5, signAreaY, margin + 5 + signWidth, signAreaY)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('Firma y Sello del Agente de Retención', margin + 5 + (signWidth / 2), signAreaY + 4, { align: 'center' })

    // Línea de firma Sujeto Retenido
    const rightSignX = pageWidth - margin - signWidth - 5
    doc.line(rightSignX, signAreaY, rightSignX + signWidth, signAreaY)
    doc.text('Firma y Sello del Sujeto a Retención', rightSignX + (signWidth / 2), signAreaY + 4, { align: 'center' })

    // 11. Footer Institucional
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.grey)
    doc.text('AD System • Comprobante Fiscal Digital emitido según Providencia Administrativa SENIAT vigente', pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Descargar PDF
    const filename = `Comprobante_Retencion_IVA_${invoice.invoiceNumber || 'Borrador'}.pdf`
    doc.save(filename)
    return { success: true, filename }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. COMPROBANTE DE RETENCIÓN DE I.S.L.R. (Oficial SENIAT - Decreto 1.808)
  // ════════════════════════════════════════════════════════════════════════
  async generarComprobanteISLR(invoice, companyInfo = {}) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()   // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight() // 210 mm
    const margin = 10
    const contentWidth = pageWidth - (margin * 2)

    // Consultar datos reales de la retención ISLR
    const retData = await fetchRetentionData(invoice.id, 'ISLR')

    // 1. Marca de agua
    await drawWatermark(doc, pageWidth, pageHeight)

    // 2. Franja superior institucional
    drawCorporateHeaderBand(doc, pageWidth)

    let y = 15

    // 3. Logo oficial (proporción real) y título
    await drawLogoCabecera(doc, margin, 8.5, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...COLORS.secondary)
    doc.text('COMPROBANTE DE RETENCIÓN DE I.S.L.R.', pageWidth / 2, y, { align: 'center' })
    y += 5.5

    // Subtítulo legal
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLORS.darkGrey)
    doc.text('(Excepto sueldos, salarios y demás remuneraciones similares a personas naturales residentes / Decreto 1.808)', pageWidth / 2, y, { align: 'center' })
    y += 7

    // 5. Metadatos de Comprobante (Cajas superiores)
    const retentionDate = retData?.fecha_comprobante || invoice.retention_date || invoice.retentionDate || invoice.issueDate
    const numComprobante = retData?.numero_comprobante 
      || invoice.financial?.islrRetentionNumber 
      || invoice.financial?.islr_retention_number 
      || invoice.islr_retention_number 
      || invoice.retention_number 
      || (() => {
      const { periodCode } = getYearMonth(retentionDate)
      const rawNum = invoice.invoiceNumber ? String(invoice.invoiceNumber).replace(/\D/g, '') : '1'
      return `ISLR-${periodCode}-${rawNum.padStart(6, '0')}`
    })()

    const { year, month } = getYearMonth(retentionDate)
    const formattedRetentionDate = formatDate(retentionDate)
    const formattedFactDate = formatDate(retData?.factura_fecha || invoice.issueDate)

    const boxY = y
    const compBoxWidth = 130
    const compBoxHeight = 12.5
    const rightBoxWidth = (contentWidth - compBoxWidth - 6) / 2

    // Caja 1: Número de Comprobante
    drawBox(doc, margin, boxY, compBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.black)
    doc.text('NÚMERO DE COMPROBANTE:', margin + 3, boxY + 8.2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...COLORS.primary)
    doc.text(numComprobante, margin + 68, boxY + 8.2)

    // Caja 2: Fecha del Comprobante
    const fechaX = margin + compBoxWidth + 3
    drawBox(doc, fechaX, boxY, rightBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('FECHA COMPROBANTE', fechaX + (rightBoxWidth / 2), boxY + 4.6, { align: 'center' })
    doc.setFontSize(9.5)
    doc.setTextColor(...COLORS.secondary)
    doc.text(formattedRetentionDate, fechaX + (rightBoxWidth / 2), boxY + 9.6, { align: 'center' })

    // Caja 3: Período Fiscal
    const periodX = fechaX + rightBoxWidth + 3
    drawBox(doc, periodX, boxY, rightBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('PERIODO FISCAL', periodX + (rightBoxWidth / 2), boxY + 4.6, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`AÑO: ${year}   MES: ${month}`, periodX + (rightBoxWidth / 2), boxY + 9.6, { align: 'center' })

    y += compBoxHeight + 3.5

    // 6. Cajas de Identificación de Agente y Sujeto
    const { agente, sujeto } = await resolveParties(invoice, companyInfo, retData)
    const col1Width = contentWidth * 0.65
    const col2Width = contentWidth * 0.35
    const partyRowHeight = 11.5

    // Agente - Nombre
    y += drawFilaParte(doc, margin, y, col1Width, col2Width, 'NOMBRE O RAZON SOCIAL DEL AGENTE DE RETENCION:', agente.name, 'N° DE R.I.F.:', agente.rif)

    // Agente - Dirección
    const agenteDirHeight = drawAddressBox(doc, margin, y, contentWidth, 'DIRECCION FISCAL DEL AGENTE DE RETENCION:', agente.address)
    y += agenteDirHeight + 2

    // Sujeto Retenido - Nombre
    y += drawFilaParte(doc, margin, y, col1Width, col2Width, 'NOMBRE O RAZON SOCIAL DEL SUJETO RETENIDO / BENEFICIARIO:', sujeto.name, 'N° DE R.I.F.:', sujeto.rif)

    // Sujeto Retenido - Dirección
    const sujetoDirHeight = drawAddressBox(doc, margin, y, contentWidth, 'DIRECCION FISCAL DEL PROVEEDOR / BENEFICIARIO:', sujeto.address)
    y += sujetoDirHeight + 3

    // 7. Tabla de Operaciones de ISLR (11 Columnas) — anchos rebalanceados y optimizados
    const islrColumns = [
      { id: 'op', label: 'Op.', width: 8, align: 'center' },
      { id: 'date', label: 'Fecha de\nFactura', width: 20, align: 'center' },
      { id: 'invoiceNum', label: 'Número de Factura', width: 50, align: 'center' },
      { id: 'controlNum', label: 'Número Control de Factura', width: 50, align: 'center' },
      { id: 'nc', label: 'N° Nota\nCrédito', width: 18, align: 'center' },
      { id: 'opType', label: 'Tipo\nTrans.', width: 14, align: 'center' },
      { id: 'sustraendo', label: 'Sustraendo\n(Bs)', width: 22, align: 'right' },
      { id: 'base', label: 'Base\nImponible', width: 30, align: 'right' },
      { id: 'aliquot', label: '%\nAlic.', width: 12, align: 'center' },
      { id: 'code', label: 'Cód.\nRet.', width: 15, align: 'center' },
      { id: 'retAmount', label: 'Impuesto Retenido', width: 38, align: 'right' }
    ]

    // Dibujar Headers de la tabla
    const tableHeaderY = y
    const tableHeaderHeight = 11
    let curX2 = margin

    doc.setFillColor(...COLORS.tableHeaderBg)
    doc.rect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 'F')
    doc.setLineWidth(0.3)
    doc.setDrawColor(...COLORS.tableBorder)
    doc.rect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 'S')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)

    islrColumns.forEach(col => {
      doc.line(curX2, tableHeaderY, curX2, tableHeaderY + tableHeaderHeight)
      const lines = col.label.split('\n')
      const textY = lines.length > 1 ? tableHeaderY + 4.7 : tableHeaderY + 6.6
      lines.forEach((line, lIdx) => {
        const lineY = textY + (lIdx * 3.5)
        if (col.align === 'center') {
          doc.text(line, curX2 + (col.width / 2), lineY, { align: 'center' })
        } else if (col.align === 'right') {
          doc.text(line, curX2 + col.width - 1.5, lineY, { align: 'right' })
        } else {
          doc.text(line, curX2 + 1.5, lineY)
        }
      })
      curX2 += col.width
    })

    y += tableHeaderHeight

    // Datos Financieros ISLR — priorizar datos reales de retención
    const fin2 = invoice.financial || {}
    const base2 = retData ? parseFloat(retData.base_imponible || 0) : parseFloat(fin2.taxableSales || 0)
    const retencionISLR = retData ? parseFloat(retData.monto_retenido || 0) : parseFloat(invoice.retenciones?.islr || fin2.islrRetention || 0)

    // Alícuota: usar dato real del registro de retención
    const alicuotaISLR = retData
      ? parseFloat(retData.porcentaje_retencion || 0)
      : (base2 > 0 && retencionISLR > 0 ? Number(((retencionISLR / base2) * 100).toFixed(1)) : 2)

    // Código de retención: usar dato real del concepto ISLR vinculado
    const codigoRetencion = retData?.concepto_islr?.codigo
      || retData?.concepto_islr_nombre?.match(/\d{3}/)?.[0]
      || invoice.islr_concept_code
      || (alicuotaISLR >= 5 ? '053' : (alicuotaISLR >= 3 ? '054' : '055'))

    // Sustraendo: calcular valor real en Bs (sustraendo_ut * valor_ut)
    const sustraendoUT = retData ? parseFloat(retData.sustraendo_ut || 0) : 0
    const valorUT = retData ? parseFloat(retData.valor_ut || 0) : 0
    const sustraendoBs = sustraendoUT > 0 && valorUT > 0 ? sustraendoUT * valorUT : 0

    const factNum2 = retData?.factura_numero || invoice.invoiceNumber || '000001'
    const factControl2 = retData?.factura_control || invoice.controlNumber || '00-000001'

    const islrRowData = [
      '1',
      formattedFactDate,
      factNum2,
      factControl2,
      '',
      '01-Reg',
      formatNumber(sustraendoBs),
      formatNumber(base2),
      `${alicuotaISLR}%`,
      codigoRetencion,
      formatNumber(retencionISLR)
    ]

    // Dibujar Fila de Datos
    const dataRowHeight = 9
    doc.setLineWidth(0.2)
    doc.setDrawColor(...COLORS.tableBorder)
    doc.rect(margin, y, contentWidth, dataRowHeight, 'S')
    drawTableRow(doc, islrColumns, islrRowData, margin, y, dataRowHeight, { fontSize: 9, highlightLastCol: true })

    y += dataRowHeight

    // Filas vacías adicionales
    for (let r = 0; r < 3; r++) {
      let curXEmpty = margin
      doc.rect(margin, y, contentWidth, 6, 'S')
      islrColumns.forEach(col => {
        doc.line(curXEmpty, y, curXEmpty, y + 6)
        curXEmpty += col.width
      })
      y += 6
    }

    // Fila de TOTALES
    const totalRowHeight = 9
    doc.setFillColor(...COLORS.totalBg)
    doc.rect(margin, y, contentWidth, totalRowHeight, 'F')
    doc.setLineWidth(0.3)
    doc.setDrawColor(...COLORS.boxBorder)
    doc.rect(margin, y, contentWidth, totalRowHeight, 'S')

    const islrLeftColsWidth = islrColumns.slice(0, 6).reduce((acc, c) => acc + c.width, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLORS.black)
    doc.text('TOTALES', margin + islrLeftColsWidth - 4, y + 6, { align: 'right' })

    let islrTotalX = margin + islrLeftColsWidth
    const islrTotalsValues = [
      formatNumber(sustraendoBs),
      formatNumber(base2),
      '',
      '',
      formatNumber(retencionISLR)
    ]

    islrColumns.slice(6).forEach((col, idx) => {
      doc.line(islrTotalX, y, islrTotalX, y + totalRowHeight)
      const val = islrTotalsValues[idx]
      if (val) {
        if (idx === 4) {
          doc.setTextColor(...COLORS.highlightRed)
        } else {
          doc.setTextColor(...COLORS.black)
        }
        doc.setFontSize(9)
        doc.text(val, islrTotalX + col.width - 1.5, y + 6, { align: 'right' })
      }
      islrTotalX += col.width
    })

    y += totalRowHeight + 6

    // 8. Resumen Financiero
    const total2 = parseFloat(fin2.totalSales || base2)
    const islrSummaryX = pageWidth - margin - 85
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)

    // Mostrar info del concepto ISLR si está disponible
    const conceptoNombre = retData?.concepto_islr_nombre || retData?.concepto_islr?.nombre || ''
    if (conceptoNombre) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.darkGrey)
      doc.text(`Concepto: ${conceptoNombre}`, margin, y)
      y += 4
    }
    
    // C2 (2026-10-13): renglón con el monto total de la factura CON IVA antes del
    // sustraendo; "Cantidad Pagada" -> "Monto Total Factura"; se mantiene "Impuesto
    // Retenido"; "Total Retención" -> "Neto a Pagar" (= total factura - retención ISLR).
    // Pedido de la contadora: docs/mvp/backlog-contadora-2026-10-12.md puntos 2 y 3.
    const islrSummaryLines = [
      { label: 'Monto Total Factura:', val: formatNumber(total2) },
      { label: 'Impuesto Retenido (ISLR):', val: formatNumber(retencionISLR), isRed: true },
      { label: 'Sustraendo (Bs):', val: formatNumber(sustraendoBs) },
      { label: 'Neto a Pagar:', val: formatNumber(total2 - retencionISLR), isBold: true }
    ]

    islrSummaryLines.forEach((sLine, sIdx) => {
      const lineY = y + (sIdx * 5.6)
      doc.setFont('helvetica', sLine.isBold ? 'bold' : 'normal')
      doc.setTextColor(...COLORS.black)
      doc.text(sLine.label, islrSummaryX, lineY)
      if (sLine.isRed) doc.setTextColor(...COLORS.highlightRed)
      doc.setFont('helvetica', 'bold')
      doc.text(sLine.val, pageWidth - margin - 3, lineY, { align: 'right' })
    })

    // 9. Sello Digital y Firmas (aislado por cliente)
    const signAreaY = pageHeight - 27
    const signWidth = 75

    const effectiveClientId = retData?.client_id || invoice?.clientId || invoice?.client_id || null
    const sealConfig = await sealService.getSealConfig(effectiveClientId)
    await estamparSelloYFirma(doc, sealConfig, margin + 5, signAreaY, signWidth)

    // Línea de firma Agente
    doc.setLineWidth(0.4)
    doc.setDrawColor(...COLORS.black)
    doc.line(margin + 5, signAreaY, margin + 5 + signWidth, signAreaY)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('Firma y Sello del Agente de Retención', margin + 5 + (signWidth / 2), signAreaY + 4, { align: 'center' })

    // Línea de firma Sujeto Retenido
    const rightSignX = pageWidth - margin - signWidth - 5
    doc.line(rightSignX, signAreaY, rightSignX + signWidth, signAreaY)
    doc.text('Firma y Sello del Sujeto Retenido / Beneficiario', rightSignX + (signWidth / 2), signAreaY + 4, { align: 'center' })

    // 10. Footer Institucional
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.grey)
    doc.text('AD System • Comprobante Fiscal de ISLR emitido según Decreto 1.808 G.O. N° 36.203', pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Descargar PDF
    const filename = `Comprobante_Retencion_ISLR_${invoice.invoiceNumber || 'Borrador'}.pdf`
    doc.save(filename)
    return { success: true, filename }
  }
  // ==========================================
  // 3. COMPROBANTE DE RETENCION MUNICIPAL
  // ==========================================
  async generarComprobanteMunicipal(invoice, companyInfo = {}, options = {}) {
    // 1. Municipio del tenant
    const tenantMunicipio = companyInfo?.municipio || companyInfo?.municipio_id || invoice.client?.municipio_id || invoice.client?.municipio || ''

    // 2. Municipio del emisor (consultando proveedor activo si existe para tener el dato actualizado)
    let issuerMunicipio = invoice.issuer?.municipio_id || invoice.issuer?.municipio || ''
    const provId = invoice.issuer?.id || invoice.issuer_id || invoice.provider_id
    const provRif = invoice.issuer?.rif

    if (provId || provRif) {
      try {
        let provQuery = supabase.from('proveedores').select('municipio_id, estado')
        if (provId) {
          provQuery = provQuery.eq('id', provId)
        } else {
          provQuery = provQuery.eq('rif', provRif)
        }
        const { data: provData } = await provQuery.maybeSingle()
        if (provData?.municipio_id) {
          issuerMunicipio = provData.municipio_id
        }
      } catch (e) {
        console.warn('No se pudo consultar municipio actualizado del proveedor:', e)
      }
    }

    // C7 (2026-10-13): antes se bloqueaba sin excepción. Ahora, si los municipios
    // difieren, se advierte con MUNICIPAL_MISMATCH (el llamador debe mostrar la
    // advertencia y pedir confirmación al usuario); solo si options.confirmMismatch
    // viene en true (el usuario ya confirmó) se permite continuar generando el PDF.
    // Pedido de la contadora, ver W5 en docs/mvp/backlog-cliente-whatsapp.md.
    if (!venezuelaLocationsService.areSameMunicipality(tenantMunicipio, issuerMunicipio) && !options.confirmMismatch) {
      const tenantNombre = venezuelaLocationsService.getCleanMunicipalityName(tenantMunicipio)
      const issuerNombre = venezuelaLocationsService.getCleanMunicipalityName(issuerMunicipio)
      throw {
        code: 'MUNICIPAL_MISMATCH',
        message: `Tu proveedor está en ${issuerNombre} y tu empresa en ${tenantNombre}. Normalmente no corresponde retener impuesto municipal en este caso. ¿Continuar igual?`
      }
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()   // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight() // 210 mm
    const margin = 10
    const contentWidth = pageWidth - (margin * 2)

    // Consultar datos reales de la retención municipal
    const retData = await fetchRetentionData(invoice.id, 'MUNICIPAL')

    // 1. Marca de agua
    await drawWatermark(doc, pageWidth, pageHeight)

    // 2. Franja superior institucional
    drawCorporateHeaderBand(doc, pageWidth)

    let y = 15

    // 3. Logo oficial (proporción real) y título
    await drawLogoCabecera(doc, margin, 8.5, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...COLORS.secondary)
    doc.text('COMPROBANTE DE RETENCIÓN DEL IMPUESTO MUNICIPAL', pageWidth / 2, y, { align: 'center' })
    y += 5.5

    // Subtítulo legal
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLORS.darkGrey)
    doc.text('(Excepto sueldos, salarios y demás remuneraciones similares a personas naturales residentes / Ordenanzas Municipales)', pageWidth / 2, y, { align: 'center' })
    y += 7

    // 5. Metadatos de Comprobante (Cajas superiores)
    const retentionDate = retData?.fecha_comprobante || invoice.retention_date || invoice.retentionDate || invoice.issueDate
    const numComprobante = retData?.numero_comprobante 
      || invoice.financial?.municipalRetentionNumber 
      || invoice.financial?.municipal_retention_number 
      || invoice.municipal_retention_number 
      || invoice.retention_number 
      || (() => {
      const { periodCode } = getYearMonth(retentionDate)
      const rawNum = invoice.invoiceNumber ? String(invoice.invoiceNumber).replace(/\D/g, '') : '1'
      return `MUN-${periodCode}-${rawNum.padStart(6, '0')}`
    })()

    const { year, month } = getYearMonth(retentionDate)
    const formattedRetentionDate = formatDate(retentionDate)
    const formattedFactDate = formatDate(retData?.factura_fecha || invoice.issueDate)

    const boxY = y
    const compBoxWidth = 130
    const compBoxHeight = 12.5
    const rightBoxWidth = (contentWidth - compBoxWidth - 6) / 2

    // Caja 1: Número de Comprobante
    drawBox(doc, margin, boxY, compBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.black)
    doc.text('NÚMERO DE COMPROBANTE:', margin + 3, boxY + 8.2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...COLORS.primary)
    doc.text(numComprobante, margin + 68, boxY + 8.2)

    // Caja 2: Fecha del Comprobante
    const fechaX = margin + compBoxWidth + 3
    drawBox(doc, fechaX, boxY, rightBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('FECHA COMPROBANTE', fechaX + (rightBoxWidth / 2), boxY + 4.6, { align: 'center' })
    doc.setFontSize(9.5)
    doc.setTextColor(...COLORS.secondary)
    doc.text(formattedRetentionDate, fechaX + (rightBoxWidth / 2), boxY + 9.6, { align: 'center' })

    // Caja 3: Período Fiscal
    const periodX = fechaX + rightBoxWidth + 3
    drawBox(doc, periodX, boxY, rightBoxWidth, compBoxHeight, COLORS.tableHeaderBg)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('PERIODO FISCAL', periodX + (rightBoxWidth / 2), boxY + 4.6, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`AÑO: ${year}   MES: ${month}`, periodX + (rightBoxWidth / 2), boxY + 9.6, { align: 'center' })

    y += compBoxHeight + 3.5

    // 6. Cajas de Identificación de Agente y Sujeto
    const { agente, sujeto } = await resolveParties(invoice, companyInfo, retData)
    const col1Width = contentWidth * 0.65
    const col2Width = contentWidth * 0.35
    const partyRowHeight = 11.5

    // ── AGENTE DE RETENCIÓN ──
    // Fila 1: Agente - Nombre y RIF
    y += drawFilaParte(doc, margin, y, col1Width, col2Width, 'NOMBRE O RAZON SOCIAL DEL AGENTE DE RETENCION:', agente.name, 'N° DE R.I.F.:', agente.rif)

    // Fila 2: Agente - Dirección Fiscal
    const agenteDirHeight = drawAddressBox(doc, margin, y, contentWidth, 'DIRECCION FISCAL DEL AGENTE DE RETENCION:', agente.address)
    y += agenteDirHeight

    // Fila 3: Agente - Licencia y Municipio
    drawBox(doc, margin, y, col1Width, partyRowHeight - 1.5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.darkGrey)
    doc.text('LICENCIA DE ACTIVIDAD ECONÓMICA DEL AGENTE:', margin + 3, y + 4)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text(String(agente.licencia || 'NO REGISTRADA').toUpperCase(), margin + 3, y + 8.2)

    drawBox(doc, margin + col1Width, y, col2Width, partyRowHeight - 1.5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.darkGrey)
    doc.text('MUNICIPIO DEL AGENTE:', margin + col1Width + 3, y + 4)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text(String(agente.municipio || 'NO REGISTRADO').toUpperCase(), margin + col1Width + 3, y + 8.2)

    y += partyRowHeight - 1.5 + 2

    // ── SUJETO RETENIDO ──
    // Fila 4: Sujeto Retenido - Nombre y RIF
    y += drawFilaParte(doc, margin, y, col1Width, col2Width, 'NOMBRE O RAZON SOCIAL DEL SUJETO RETENIDO / BENEFICIARIO:', sujeto.name, 'N° DE R.I.F.:', sujeto.rif)

    // Fila 5: Sujeto Retenido - Dirección
    const sujetoDirHeight = drawAddressBox(doc, margin, y, contentWidth, 'DIRECCION FISCAL DEL SUJETO RETENIDO / BENEFICIARIO:', sujeto.address)
    y += sujetoDirHeight

    // Fila 6: Sujeto Retenido - Licencia y Municipio
    drawBox(doc, margin, y, col1Width, partyRowHeight - 1.5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.darkGrey)
    doc.text('LICENCIA DE ACTIVIDAD ECONÓMICA DEL SUJETO:', margin + 3, y + 4)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    const sujetoLicencia = sujeto.licencia || retData?.licencia_actividad || 'NO REGISTRADA'
    doc.text(String(sujetoLicencia).toUpperCase(), margin + 3, y + 8.2)

    drawBox(doc, margin + col1Width, y, col2Width, partyRowHeight - 1.5)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.darkGrey)
    doc.text('MUNICIPIO DEL SUJETO:', margin + col1Width + 3, y + 4)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    const sujetoMunicipio = sujeto.municipio && sujeto.municipio !== 'NO REGISTRADO'
      ? sujeto.municipio
      : venezuelaLocationsService.getCleanMunicipalityName(retData?.municipio_id || sujeto.municipio)
    doc.text(String(sujetoMunicipio || 'NO REGISTRADO').toUpperCase(), margin + col1Width + 3, y + 8.2)
    
    y += partyRowHeight - 1.5 + 3

    // 7. Tabla de Operaciones de Retención Municipal (10 Columnas) — suma exactamente contentWidth = 277mm
    const munColumns = [
      { id: 'op', label: 'Op.', width: 7, align: 'center' },
      { id: 'date', label: 'Fecha de\nFactura', width: 20, align: 'center' },
      { id: 'invoiceNum', label: 'Número de Factura', width: 40, align: 'center' },
      { id: 'controlNum', label: 'Número Control Factura', width: 40, align: 'center' },
      { id: 'nc', label: 'N° Nota\nCrédito', width: 16, align: 'center' },
      { id: 'opType', label: 'Tipo\nTrans.', width: 14, align: 'center' },
      { id: 'totalSales', label: 'Total Factura\n(con IVA)', width: 35, align: 'right' },
      { id: 'base', label: 'Base Imponible\nAct. Económica', width: 38, align: 'right' },
      { id: 'aliquot', label: '%\nAlic.', width: 17, align: 'center' },
      { id: 'retAmount', label: 'Impuesto Municipal\nRetenido (Bs)', width: 50, align: 'right' }
    ]

    // Dibujar Headers de la tabla
    const tableHeaderY = y
    const tableHeaderHeight = 11
    let curX2 = margin

    doc.setFillColor(...COLORS.tableHeaderBg)
    doc.rect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 'F')
    doc.setLineWidth(0.3)
    doc.setDrawColor(...COLORS.tableBorder)
    doc.rect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 'S')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)

    munColumns.forEach(col => {
      doc.line(curX2, tableHeaderY, curX2, tableHeaderY + tableHeaderHeight)
      const lines = col.label.split('\n')
      const textY = lines.length > 1 ? tableHeaderY + 4.7 : tableHeaderY + 6.6
      lines.forEach((line, lIdx) => {
        const lineY = textY + (lIdx * 3.5)
        if (col.align === 'center') {
          doc.text(line, curX2 + (col.width / 2), lineY, { align: 'center' })
        } else if (col.align === 'right') {
          doc.text(line, curX2 + col.width - 1.5, lineY, { align: 'right' })
        } else {
          doc.text(line, curX2 + 1.5, lineY)
        }
      })
      curX2 += col.width
    })

    y += tableHeaderHeight

    // Datos Financieros de Retención Municipal
    const finMun = invoice.financial || {}
    const baseMun = retData ? parseFloat(retData.base_imponible || 0) : parseFloat(finMun.taxableSales || 0)
    const retencionMun = retData ? parseFloat(retData.monto_retenido || 0) : parseFloat(invoice.retenciones?.municipal || finMun.municipalRetention || 0)
    const alicuotaMun = retData ? parseFloat(retData.porcentaje_retencion || 0) : (baseMun > 0 && retencionMun > 0 ? Number(((retencionMun / baseMun) * 100).toFixed(2)) : 0)
    const totalFacturaMun = parseFloat(finMun.totalSales || (baseMun + (finMun.taxDebit || 0)))

    const factNum2 = retData?.factura_numero || invoice.invoiceNumber || '000001'
    const factControl2 = retData?.factura_control || invoice.controlNumber || '00-000001'

    const munRowData = [
      '1',
      formattedFactDate,
      factNum2,
      factControl2,
      '',
      '01-Reg',
      formatNumber(totalFacturaMun),
      formatNumber(baseMun),
      `${alicuotaMun}%`,
      formatNumber(retencionMun)
    ]

    // Dibujar Fila de Datos
    const dataRowHeight = 9
    doc.setLineWidth(0.2)
    doc.setDrawColor(...COLORS.tableBorder)
    doc.rect(margin, y, contentWidth, dataRowHeight, 'S')
    drawTableRow(doc, munColumns, munRowData, margin, y, dataRowHeight, { fontSize: 9, highlightLastCol: true })

    y += dataRowHeight

    // Filas vacías adicionales para estética de formulario
    for (let r = 0; r < 2; r++) {
      let curXEmpty = margin
      doc.rect(margin, y, contentWidth, 6, 'S')
      munColumns.forEach(col => {
        doc.line(curXEmpty, y, curXEmpty, y + 6)
        curXEmpty += col.width
      })
      y += 6
    }

    // Fila de TOTALES
    const totalRowHeight = 9
    doc.setFillColor(...COLORS.totalBg)
    doc.rect(margin, y, contentWidth, totalRowHeight, 'F')
    doc.setLineWidth(0.3)
    doc.setDrawColor(...COLORS.boxBorder)
    doc.rect(margin, y, contentWidth, totalRowHeight, 'S')

    const munLeftColsWidth = munColumns.slice(0, 6).reduce((acc, c) => acc + c.width, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...COLORS.black)
    doc.text('TOTALES', margin + munLeftColsWidth - 4, y + 6, { align: 'right' })

    let munTotalX = margin + munLeftColsWidth
    const munTotalsValues = [
      formatNumber(totalFacturaMun),
      formatNumber(baseMun),
      '',
      formatNumber(retencionMun)
    ]

    munColumns.slice(6).forEach((col, idx) => {
      doc.line(munTotalX, y, munTotalX, y + totalRowHeight)
      const val = munTotalsValues[idx]
      if (val) {
        if (idx === 3) {
          doc.setTextColor(...COLORS.highlightRed)
        } else {
          doc.setTextColor(...COLORS.black)
        }
        doc.setFontSize(9)
        doc.text(val, munTotalX + col.width - 1.5, y + 6, { align: 'right' })
      }
      munTotalX += col.width
    })

    y += totalRowHeight + 6

    // 8. Resumen Financiero
    const munSummaryX = pageWidth - margin - 95
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)

    const munSummaryLines = [
      { label: 'Total Factura (con IVA):', val: formatNumber(totalFacturaMun) },
      { label: 'Base Imponible Act. Económica:', val: formatNumber(baseMun) },
      { label: 'Alícuota Aplicada (%):', val: `${alicuotaMun}%` },
      { label: 'Impuesto Municipal Retenido:', val: formatNumber(retencionMun), isRed: true, isBold: true },
      { label: 'Total Neto a Pagar:', val: formatNumber(totalFacturaMun - retencionMun), isBold: true }
    ]

    munSummaryLines.forEach((sLine, sIdx) => {
      const lineY = y + (sIdx * 5.6)
      doc.setFont('helvetica', sLine.isBold ? 'bold' : 'normal')
      doc.setTextColor(...COLORS.black)
      doc.text(sLine.label, munSummaryX, lineY)
      if (sLine.isRed) doc.setTextColor(...COLORS.highlightRed)
      doc.setFont('helvetica', 'bold')
      doc.text(sLine.val, pageWidth - margin - 3, lineY, { align: 'right' })
    })

    // 9. Sello Digital y Firmas (aislado por cliente)
    const signAreaY = pageHeight - 21
    const signWidth = 75

    const effectiveClientId = retData?.client_id || invoice?.clientId || invoice?.client_id || null
    const sealConfig = await sealService.getSealConfig(effectiveClientId)
    await estamparSelloYFirma(doc, sealConfig, margin + 5, signAreaY, signWidth)

    // Línea de firma Agente
    doc.setLineWidth(0.4)
    doc.setDrawColor(...COLORS.black)
    doc.line(margin + 5, signAreaY, margin + 5 + signWidth, signAreaY)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.black)
    doc.text('Firma y Sello del Agente de Retención', margin + 5 + (signWidth / 2), signAreaY + 4, { align: 'center' })

    // Línea de firma Sujeto Retenido
    const rightSignX = pageWidth - margin - signWidth - 5
    doc.line(rightSignX, signAreaY, rightSignX + signWidth, signAreaY)
    doc.text('Firma y Sello del Sujeto Retenido / Beneficiario', rightSignX + (signWidth / 2), signAreaY + 4, { align: 'center' })

    // 10. Footer Institucional
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.grey)
    doc.text('AD System • Comprobante Fiscal de Retención del Impuesto sobre Actividades Económicas emitido según Ordenanza Municipal', pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Descargar PDF
    const filename = `Comprobante_Retencion_MUNICIPAL_${invoice.invoiceNumber || 'Borrador'}.pdf`
    doc.save(filename)
    return { success: true, filename }
  }
  /**
   * PDF de EJEMPLO (datos ficticios, marca de agua) para ver cómo quedan el sello y la firma.
   * @param {{ sealUrl?: string, signatureUrl?: string }} config  imágenes a estampar (según lo que elija la persona)
   */
  async descargarEjemploSelloFirma(config) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10
    drawCorporateHeaderBand(doc, pageWidth)
    await drawLogoCabecera(doc, margin, 9, 10)
    doc.setTextColor(...COLORS.black)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('COMPROBANTE DE RETENCIÓN DEL IVA — EJEMPLO', pageWidth / 2, 34, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Documento de muestra para ver cómo quedan tu sello y tu firma. No tiene validez fiscal.', pageWidth / 2, 41, { align: 'center' })
    for (let i = 0; i < 6; i++) drawBox(doc, margin, 52 + i * 14, pageWidth - margin * 2, 10, i === 0 ? COLORS.tableHeaderBg : null)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(48)
    doc.setTextColor(220, 220, 220)
    doc.text('EJEMPLO', pageWidth / 2, pageHeight / 2 + 20, { align: 'center', angle: 30 })
    doc.setTextColor(...COLORS.black)
    const signAreaY = pageHeight - 35
    const signWidth = MEDIDAS_SELLO_FIRMA.linea.ancho
    await estamparSelloYFirma(doc, config, margin + 5, signAreaY, signWidth)
    doc.setLineWidth(0.4)
    doc.setDrawColor(...COLORS.black)
    doc.line(margin + 5, signAreaY, margin + 5 + signWidth, signAreaY)
    doc.setFontSize(8.5)
    doc.text('Firma y Sello del Agente de Retención', margin + 5 + (signWidth / 2), signAreaY + 4, { align: 'center' })
    const rightSignX = pageWidth - margin - signWidth - 5
    doc.line(rightSignX, signAreaY, rightSignX + signWidth, signAreaY)
    doc.text('Firma y Sello del Sujeto a Retención', rightSignX + (signWidth / 2), signAreaY + 4, { align: 'center' })
    doc.save('Ejemplo_sello_y_firma.pdf')
    return { success: true }
  }
}

export default new RetentionPdfService()
