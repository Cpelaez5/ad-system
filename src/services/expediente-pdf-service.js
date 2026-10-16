/**
 * expediente-pdf-service.js
 * "Mis papeles" en PDF (expediente fiscal): estado de cada documento por categoría y período.
 * Antes vivía dentro de Fiscal360.vue; se movió aquí para poder probarlo y revisarlo a ojo
 * (scripts/muestras-documentos.mjs). Colores: solo marca AD System (granate y carbón).
 */
import { jsPDF } from 'jspdf'
import systemLogo from '/ADSystem/png/logo.png'
import { FISCAL_TYPES } from '@/constants/fiscalDocuments'
import { parseFechaLocal, formatFechaCorta } from '@/utils/fechas'

const GRANATE = [142, 24, 24] // #8E1818
const CARBON = [42, 42, 46] // #2A2A2E
const TEXTO = [42, 42, 46]
const TEXTO_SUAVE = [90, 90, 96] // contraste suficiente sobre blanco
const MARGEN = 15

/** Estados: colores con contraste suficiente sobre su propio fondo. */
const ESTADOS = {
  PRESENTADO: { fondo: [226, 241, 227], texto: [27, 94, 32] },
  'EN TRÁMITE': { fondo: [255, 236, 204], texto: [140, 70, 0] },
  'NO PRESENTADO': { fondo: [252, 224, 224], texto: [142, 24, 24] },
  'NO APLICA': { fondo: [232, 232, 234], texto: [70, 70, 76] },
  '—': { fondo: [232, 232, 234], texto: [70, 70, 76] },
}

const CATEGORIAS = {
  LEGAL: 'Legal',
  LIBROS: 'Libros Contables',
  MUNICIPAL: 'Municipal',
  SENIAT: 'SENIAT',
  NOMINA: 'Nómina y Parafiscales',
  OTROS: 'Otros',
}

const FRECUENCIAS = {
  PERMANENT: 'Permanente',
  VIGENTE: 'Vigente (variable)',
  ANNUAL: 'Anual',
  SEMESTRAL: 'Semestral',
  QUARTERLY: 'Trimestral',
  MONTHLY: 'Mensual',
  QUINCENAL: 'Quincenal',
  AdHoc: 'Eventual',
}

function cargarLogo(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = () => {
      const lienzo = document.createElement('canvas')
      lienzo.width = img.naturalWidth || img.width
      lienzo.height = img.naturalHeight || img.height
      lienzo.getContext('2d').drawImage(img, 0, 0)
      resolve({ dataURL: lienzo.toDataURL('image/png'), width: lienzo.width, height: lienzo.height })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Períodos de un tipo de documento (misma lógica que FiscalPeriodTracker).
 * Devuelve [{ label, doc, isFuture, statusLabel }].
 * @param {Date} [ahora] solo para pruebas.
 */
export function periodosParaPdf(type, catDocs, year, ahora = new Date()) {
  const currentYear = ahora.getFullYear()
  const currentMonth = ahora.getMonth()
  const currentDay = ahora.getDate()
  const freq = type.frequency
  const docsOfType = catDocs.filter((d) => d.doc_type === type.id)
  const fechaDe = (d) => parseFechaLocal(d.emission_date) || new Date(0)

  const bestDoc = (candidates) => candidates.find((d) => d.status !== 'VENCIDO') || candidates[0] || null

  const buildRow = (label, doc, isFuture) => {
    let statusLabel
    if (doc) {
      const s = doc.status
      if (s === 'TRAMITE') statusLabel = 'EN TRÁMITE'
      else if (s === 'NO_APLICA') statusLabel = 'NO APLICA'
      // VIGENTE, PRESENTADO o VENCIDO → fue presentado (mismo criterio que la pantalla)
      else statusLabel = 'PRESENTADO'
    } else {
      statusLabel = isFuture ? '—' : 'NO PRESENTADO'
    }
    return { label, doc, isFuture, statusLabel }
  }

  if (freq === 'MONTHLY') {
    const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return Array.from({ length: 12 }, (_, i) => {
      const cands = docsOfType.filter((d) => {
        const dt = fechaDe(d)
        return dt.getFullYear() === year && dt.getMonth() === i
      })
      const isFuture = year > currentYear || (year === currentYear && i >= currentMonth)
      return buildRow(`${names[i]} ${year}`, bestDoc(cands), isFuture)
    })
  }

  if (freq === 'QUINCENAL') {
    const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const rows = []
    for (let m = 0; m < 12; m++) {
      for (let q = 1; q <= 2; q++) {
        const cands = docsOfType.filter((d) => {
          const dt = fechaDe(d)
          if (dt.getFullYear() !== year || dt.getMonth() !== m) return false
          return q === 1 ? dt.getDate() <= 15 : dt.getDate() > 15
        })
        const curQ = currentDay <= 15 ? 1 : 2
        const isPast = year < currentYear
          || (year === currentYear && m < currentMonth)
          || (year === currentYear && m === currentMonth && q < curQ)
        rows.push(buildRow(`${q}ª Quincena ${names[m]} ${year}`, bestDoc(cands), !isPast))
      }
    }
    return rows
  }

  if (freq === 'QUARTERLY') {
    const labels = ['1er Trimestre', '2do Trimestre', '3er Trimestre', '4to Trimestre']
    return Array.from({ length: 4 }, (_, i) => {
      const cands = docsOfType.filter((d) => {
        const dt = fechaDe(d)
        return dt.getFullYear() === year && Math.floor(dt.getMonth() / 3) === i
      })
      const curQ = Math.floor(currentMonth / 3)
      const isFuture = year > currentYear || (year === currentYear && i >= curQ)
      return buildRow(`${labels[i]} ${year}`, bestDoc(cands), isFuture)
    })
  }

  if (freq === 'SEMESTRAL') {
    return Array.from({ length: 2 }, (_, i) => {
      const cands = docsOfType.filter((d) => {
        const dt = fechaDe(d)
        return dt.getFullYear() === year && Math.floor(dt.getMonth() / 6) === i
      })
      const curSem = Math.floor(currentMonth / 6)
      const isFuture = year > currentYear || (year === currentYear && i > curSem)
      return buildRow(`${i === 0 ? '1er' : '2do'} Semestre ${year}`, bestDoc(cands), isFuture)
    })
  }

  if (freq === 'ANNUAL') {
    const cands = docsOfType.filter((d) => fechaDe(d).getFullYear() === year)
    const isFuture = year >= currentYear
    return [buildRow(`Año ${year}`, bestDoc(cands), isFuture)]
  }

  // Permanentes / eventuales: todos los documentos que existan de este tipo
  if (docsOfType.length === 0) return []
  return docsOfType.map((d) => buildRow(d.name || type.label, d, false))
}

/** Encabezado de categoría (banda carbón, avance en blanco). */
function dibujarCategoria(doc, anchoPagina, nombre, avance, y) {
  doc.setFillColor(...CARBON)
  doc.roundedRect(MARGEN, y - 6.5, anchoPagina - MARGEN * 2, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(nombre, MARGEN + 5, y)
  if (avance) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${avance.covered}/${avance.total} — ${avance.rate}%`, anchoPagina - MARGEN - 5, y, { align: 'right' })
  }
  return y + 9
}

/** Subtítulo de un tipo de documento, con su frecuencia a la derecha. */
function dibujarTipo(doc, anchoPagina, etiqueta, frecuencia, y) {
  doc.setFillColor(...GRANATE)
  doc.rect(MARGEN, y - 4, 1.8, 5.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...TEXTO)
  doc.text(etiqueta, MARGEN + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXTO_SUAVE)
  doc.text(frecuencia, anchoPagina - MARGEN, y, { align: 'right' })
  return y + 6
}

/** Fila de período: etiqueta a la izquierda (se ajusta al ancho), estado como etiqueta de color. */
function dibujarPeriodo(doc, anchoPagina, etiqueta, estado, y, alterna) {
  const alto = 6.5
  const colorEstado = ESTADOS[estado] || ESTADOS['NO PRESENTADO']
  if (alterna) {
    doc.setFillColor(246, 246, 247)
    doc.rect(MARGEN, y - 4.6, anchoPagina - MARGEN * 2, alto, 'F')
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...TEXTO)
  const anchoEtiqueta = anchoPagina - MARGEN * 2 - 50
  let texto = String(etiqueta || '')
  while (doc.getTextWidth(texto) > anchoEtiqueta && texto.length > 4) texto = texto.slice(0, -2)
  if (texto !== String(etiqueta || '')) texto = `${texto.trimEnd()}…`
  doc.text(texto, MARGEN + 4, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  const ancho = Math.max(doc.getTextWidth(estado) + 6, 24)
  const x = anchoPagina - MARGEN - ancho - 1
  doc.setFillColor(...colorEstado.fondo)
  doc.roundedRect(x, y - 4.1, ancho, 5.6, 1.4, 1.4, 'F')
  doc.setTextColor(...colorEstado.texto)
  doc.text(estado, x + ancho / 2, y, { align: 'center' })
  return y + alto
}

function nuevaPaginaSiHaceFalta(doc, y, limite = 268) {
  if (y > limite) {
    doc.addPage()
    return 22
  }
  return y
}

const ESTADO_DE_DOC = { VIGENTE: 'PRESENTADO', PRESENTADO: 'PRESENTADO', TRAMITE: 'EN TRÁMITE', NO_APLICA: 'NO APLICA' }

/**
 * Arma el PDF del expediente fiscal y lo descarga.
 * @param {{ docs: Array, selectedYear: number, progressRate: number, complianceDetail: Object,
 *   clientName: string, clientRif?: string, ahora?: Date }} p
 * @returns {Promise<{ filename: string, doc: any }>}
 */
export async function generarExpedientePdf({ docs = [], selectedYear, progressRate = 0, complianceDetail = {}, clientName = '', clientRif = '', ahora = new Date() }) {
  const doc = new jsPDF()
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const centro = ancho / 2

  // Franja de marca: carbón + granate
  doc.setFillColor(...CARBON)
  doc.rect(0, 0, ancho, 4, 'F')
  doc.setFillColor(...GRANATE)
  doc.rect(0, 4, ancho, 2, 'F')

  // Logo (proporción real, sin estirar)
  const logo = await cargarLogo(systemLogo)
  if (logo) {
    const h = 11
    const w = h * (logo.width / logo.height)
    doc.addImage(logo.dataURL, 'PNG', centro - w / 2, 11, w, h)
  }

  let y = 32
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...CARBON)
  doc.text('Expediente fiscal — Mis papeles', centro, y, { align: 'center' })

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...TEXTO)
  const nombreLineas = doc.splitTextToSize(String(clientName || 'Mi negocio'), ancho - MARGEN * 2)
  doc.text(nombreLineas, centro, y, { align: 'center' })
  y += nombreLineas.length * 5.5

  if (clientRif) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.text(`RIF/CI: ${clientRif}`, centro, y, { align: 'center' })
    y += 6
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...TEXTO_SUAVE)
  const hora = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Año ${selectedYear}  ·  Generado el ${formatFechaCorta(ahora)} a las ${hora}`, centro, y, { align: 'center' })

  y += 5
  doc.setDrawColor(...GRANATE)
  doc.setLineWidth(0.8)
  doc.line(MARGEN, y, ancho - MARGEN, y)
  doc.setLineWidth(0.2)

  // Avance general
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...CARBON)
  doc.text(`Avance general: ${progressRate}%`, MARGEN, y)
  y += 5
  doc.setFillColor(228, 228, 230)
  doc.roundedRect(MARGEN, y, 90, 6, 3, 3, 'F')
  const llenado = 90 * (Math.max(0, Math.min(100, progressRate)) / 100)
  if (llenado > 0) {
    doc.setFillColor(...GRANATE)
    doc.roundedRect(MARGEN, y, Math.max(llenado, 6), 6, 3, 3, 'F')
  }

  // Leyenda de estados
  y += 15
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  let lx = MARGEN
  for (const etiqueta of ['PRESENTADO', 'EN TRÁMITE', 'NO PRESENTADO', 'NO APLICA']) {
    const c = ESTADOS[etiqueta]
    const w = doc.getTextWidth(etiqueta) + 8
    doc.setFillColor(...c.fondo)
    doc.roundedRect(lx, y - 4.1, w, 5.6, 1.4, 1.4, 'F')
    doc.setTextColor(...c.texto)
    doc.text(etiqueta, lx + w / 2, y, { align: 'center' })
    lx += w + 4
  }
  y += 8
  doc.setDrawColor(200)
  doc.line(MARGEN, y, ancho - MARGEN, y)
  y += 9

  // Categoría → tipo → períodos
  for (const cat of Object.keys(CATEGORIAS)) {
    const docsCat = docs.filter((d) => d.category === cat)
    const tipos = FISCAL_TYPES[cat] || []
    if (tipos.length === 0 && docsCat.length === 0) continue
    if (cat === 'OTROS' && docsCat.length === 0) continue

    y = nuevaPaginaSiHaceFalta(doc, y, 250)
    y = dibujarCategoria(doc, ancho, CATEGORIAS[cat], complianceDetail[cat], y)
    y += 3

    let fila = 0
    for (const tipo of tipos) {
      const periodos = periodosParaPdf(tipo, docsCat, selectedYear, ahora)
      const subidos = periodos.filter((r) => r.doc)
      if (tipo.id === 'OTRO' && subidos.length === 0) continue

      y = nuevaPaginaSiHaceFalta(doc, y, 255)
      y = dibujarTipo(doc, ancho, tipo.label, FRECUENCIAS[tipo.frequency] || tipo.frequency, y)
      y += 3

      if (tipo.flexible) {
        const lista = docsCat
          .filter((d) => d.doc_type === tipo.id)
          .sort((a, b) => (parseFechaLocal(b.emission_date) || 0) - (parseFechaLocal(a.emission_date) || 0))
        if (lista.length === 0) {
          y = nuevaPaginaSiHaceFalta(doc, y)
          y = dibujarPeriodo(doc, ancho, 'Sin documentos cargados', 'NO PRESENTADO', y, fila++ % 2 === 1)
        } else {
          for (const d of lista) {
            const etiqueta = d.name || formatFechaCorta(d.emission_date) || 'Sin fecha'
            y = nuevaPaginaSiHaceFalta(doc, y)
            y = dibujarPeriodo(doc, ancho, etiqueta, ESTADO_DE_DOC[d.status] || 'NO PRESENTADO', y, fila++ % 2 === 1)
          }
        }
      } else if (subidos.length === 0) {
        y = nuevaPaginaSiHaceFalta(doc, y)
        y = dibujarPeriodo(doc, ancho, 'Sin registro cargado', 'NO PRESENTADO', y, fila++ % 2 === 1)
      } else {
        for (const r of subidos) {
          y = nuevaPaginaSiHaceFalta(doc, y)
          y = dibujarPeriodo(doc, ancho, r.label, r.statusLabel, y, fila++ % 2 === 1)
        }
      }
      y += 4
    }
    y += 6
  }

  // Pie de cada página: línea granate, nombre del sistema y número de página
  const paginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setDrawColor(...GRANATE)
    doc.setLineWidth(0.5)
    doc.line(MARGEN, alto - 15, ancho - MARGEN, alto - 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...TEXTO_SUAVE)
    doc.text('AD System', MARGEN, alto - 10)
    doc.text(`Página ${i} de ${paginas}`, ancho - MARGEN, alto - 10, { align: 'right' })
  }

  const filename = `Expediente_Fiscal_${formatFechaCorta(ahora).replace(/\//g, '-')}.pdf`
  doc.save(filename)
  return { filename, doc }
}
