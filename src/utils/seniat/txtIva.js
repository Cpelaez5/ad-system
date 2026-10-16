/**
 * txtIva.js — TXT de retenciones de IVA para el portal del SENIAT (contribuyentes especiales).
 * Función pura. Formato a confirmar por la contadora con una carga real
 * (docs/mvp/diseno/seniat-del-mes.md).
 *
 * Una línea por comprobante, 16 campos separados por tabulador, sin encabezado,
 * fin de línea '\r\n'. Montos con punto y 2 decimales; en notas de crédito, en negativo.
 */
import { periodoDeFecha, soloFecha } from './periodos.js'
import {
  alicuotaIva, codigoTipoDocumento, comprobante14, esNotaCredito, limpiarTexto, monto2, num, rifSeniat, sinAcentos, soloDigitos,
} from './comunes.js'

const FIN_DE_LINEA = '\r\n'

/** Campo de texto seguro: sin tabuladores ni saltos, sin acentos, sin espacios sobrantes. */
const campo = (v) => sinAcentos(limpiarTexto(v)).replace(/[\t\r\n]/g, ' ')

/** Línea del TXT para una retención de IVA (ya revisada). */
export function lineaTxtIva(cliente, r) {
  const signo = esNotaCredito(r.document_type) ? -1 : 1
  const firmado = (v) => monto2(signo * Math.abs(num(v)))
  const afectado = soloDigitos(r.doc_afectado)

  const campos = [
    rifSeniat(cliente?.rif) || '',
    periodoDeFecha(r.fecha_comprobante),
    soloFecha(r.factura_fecha),
    'C',
    codigoTipoDocumento(r.document_type),
    rifSeniat(r.proveedor_rif) || '',
    campo(r.factura_numero),
    campo(r.factura_control).replace(/\s/g, ''),
    firmado(r.total),
    firmado(r.base_imponible),
    firmado(r.monto_retenido),
    afectado || '0',
    comprobante14(r.numero_comprobante) || soloDigitos(r.numero_comprobante),
    firmado(r.exento),
    `${alicuotaIva(r.monto_iva, r.base_imponible)}.00`,
    '0',
  ]
  return campos.join('\t')
}

/**
 * @param {{cliente:{rif:string}, retenciones:Array}} p
 * @returns {string} contenido del TXT ('' si no hay retenciones)
 */
export function construirTxtIva({ cliente, retenciones = [] }) {
  const orden = [...retenciones].sort((a, b) =>
    String(soloFecha(a.fecha_comprobante)).localeCompare(soloFecha(b.fecha_comprobante))
    || String(a.numero_comprobante || '').localeCompare(String(b.numero_comprobante || '')))
  return orden.map((r) => lineaTxtIva(cliente, r) + FIN_DE_LINEA).join('')
}

/** Nombre del archivo: retenciones-iva-J123456789-202610-q1.txt */
export function nombreArchivoTxtIva(rif, periodo, quincena) {
  return `retenciones-iva-${rifSeniat(rif) || 'sin-rif'}-${periodo}-q${quincena}.txt`
}
