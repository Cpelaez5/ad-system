/**
 * xmlIslr.js — XML de la relación mensual de retenciones de ISLR para el portal del SENIAT.
 * Función pura. Estructura a confirmar por la contadora con una carga real.
 *
 * - Declaración ISO-8859-1: los bytes se generan con `codificarLatin1`.
 * - Número de factura y de control: solo dígitos; sin control se usa 'NA'.
 * - Fecha dd/mm/aaaa, montos con punto y 2 decimales, texto escapado.
 */
import { soloFecha } from './periodos.js'
import { limpiarTexto, monto2, rifSeniat, soloDigitos } from './comunes.js'

const CODIGO = (v) => limpiarTexto(v)

/** Escapa los caracteres especiales de XML y quita caracteres de control. */
export function escaparXml(texto) {
  return String(texto ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 'AAAA-MM-DD' → 'dd/mm/aaaa'. '' si no hay fecha. */
export function fechaDdMmAaaa(valor) {
  const f = soloFecha(valor)
  return f ? `${f.slice(8)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : ''
}

/** Texto → bytes ISO-8859-1 (Latin-1). Lo que no cabe en un byte se cambia por '?'. */
export function codificarLatin1(texto) {
  const s = String(texto ?? '')
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    bytes[i] = c <= 255 ? c : 63
  }
  return bytes
}

/** Un <DetalleRetencion> por retención. */
export function detalleXmlIslr(r) {
  return [
    '  <DetalleRetencion>',
    `    <RifRetenido>${escaparXml(rifSeniat(r.proveedor_rif) || '')}</RifRetenido>`,
    `    <NumeroFactura>${escaparXml(soloDigitos(r.factura_numero))}</NumeroFactura>`,
    `    <NumeroControl>${escaparXml(soloDigitos(r.factura_control) || 'NA')}</NumeroControl>`,
    `    <FechaOperacion>${fechaDdMmAaaa(r.factura_fecha || r.fecha_comprobante)}</FechaOperacion>`,
    `    <CodigoConcepto>${escaparXml(CODIGO(r.codigo_seniat))}</CodigoConcepto>`,
    `    <MontoOperacion>${monto2(r.base_imponible)}</MontoOperacion>`,
    `    <PorcentajeRetencion>${monto2(r.porcentaje_retencion)}</PorcentajeRetencion>`,
    '  </DetalleRetencion>',
  ].join('\n')
}

/**
 * @param {{cliente:{rif:string}, periodo:string, retenciones:Array}} p
 * @returns {string} XML (texto; conviértelo con `codificarLatin1` para guardarlo)
 */
export function construirXmlIslr({ cliente, periodo, retenciones = [] }) {
  const orden = [...retenciones].sort((a, b) => String(soloFecha(a.factura_fecha)).localeCompare(soloFecha(b.factura_fecha)))
  const partes = [
    '<?xml version="1.0" encoding="ISO-8859-1"?>',
    `<RelacionRetencionesISLR RifAgente="${escaparXml(rifSeniat(cliente?.rif) || '')}" Periodo="${escaparXml(periodo)}">`,
    ...orden.map(detalleXmlIslr),
    '</RelacionRetencionesISLR>',
  ]
  return partes.join('\n') + '\n'
}

/** Nombre del archivo: retenciones-islr-J123456789-202610.xml */
export function nombreArchivoXmlIslr(rif, periodo) {
  return `retenciones-islr-${rifSeniat(rif) || 'sin-rif'}-${periodo}.xml`
}
