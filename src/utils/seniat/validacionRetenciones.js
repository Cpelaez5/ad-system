/**
 * validacionRetenciones.js — revisión previa de las retenciones de un período,
 * con las reglas del portal del SENIAT, en lenguaje llano. Función pura.
 *
 * Cada problema: { codigo, mensaje, arreglo: { tipo: 'negocio'|'proveedor'|'registro'|'equipo', id }, retencionId }
 *  - negocio   → Mi negocio (id null)
 *  - proveedor → editar el proveedor (id = proveedor_id)
 *  - registro  → editar la factura/registro (id = invoice_id)
 *  - equipo    → lo arregla el equipo (id = concepto de ISLR) y se avisa solo
 * Normalizaciones silenciosas: [{ mensaje, retencionId }] ("Arreglamos esto por ti").
 */
import { fechaEnPeriodo, soloFecha } from './periodos.js'
import { rifSeniat, soloDigitos, limpiarTexto, comprobante14, num } from './comunes.js'

export const TOLERANCIA_MONTO = 0.011 // "más de 1 céntimo" (con margen por redondeo de coma flotante)

const ddmm = (f) => {
  const s = soloFecha(f)
  return s ? `${s.slice(8)}/${s.slice(5, 7)}` : ''
}

const nombreProv = (r) => limpiarTexto(r.proveedor_nombre) || 'un proveedor'

/** Cómo llamar a la factura en un mensaje: "la factura 123" o "la factura del 05/10 de X". */
function referenciaFactura(r) {
  const n = limpiarTexto(r.factura_numero)
  return n ? `la factura ${n}` : `la factura del ${ddmm(r.factura_fecha) || 'sin fecha'} de ${nombreProv(r)}`
}

/** Monto que debió retenerse según el tipo; null si no se puede comprobar. */
export function montoEsperado(r) {
  const pct = num(r.porcentaje_retencion)
  if (pct <= 0) return null
  if (r.tipo === 'IVA') {
    const iva = num(r.monto_iva)
    return iva > 0 ? { principal: (iva * pct) / 100, alterno: null } : null
  }
  const base = num(r.base_imponible)
  if (base <= 0) return null
  const bruto = (base * pct) / 100
  const sustraendo = num(r.sustraendo_ut) * num(r.valor_ut)
  return { principal: Math.max(0, bruto - sustraendo), alterno: sustraendo > 0 ? bruto : null }
}

export function montoCuadra(r) {
  const e = montoEsperado(r)
  if (!e) return true
  const real = num(r.monto_retenido)
  if (Math.abs(real - e.principal) <= TOLERANCIA_MONTO) return true
  return e.alterno !== null && Math.abs(real - e.alterno) <= TOLERANCIA_MONTO
}

/**
 * @param {object} p
 * @param {'IVA'|'ISLR'} p.tipo
 * @param {{rif?:string}} p.cliente            el negocio (agente de retención)
 * @param {Array} p.retenciones                forma de comunes.js
 * @param {string} p.periodo                   AAAAMM
 * @param {1|2|null} [p.quincena]              solo IVA
 * @returns {{ incluidas: Array, excluidas: Array, problemas: Array, normalizaciones: Array }}
 */
export function revisarRetenciones({ tipo, cliente, retenciones = [], periodo, quincena = null }) {
  const problemas = []
  const normalizaciones = []
  const incluidas = []
  const excluidas = []

  const delTipo = retenciones.filter((r) => String(r.tipo || tipo).toUpperCase() === tipo)
  for (const r of delTipo) {
    if (fechaEnPeriodo(r.fecha_comprobante, periodo, quincena)) incluidas.push(r)
    else excluidas.push(r)
  }

  // RIF del negocio (una sola vez)
  const rifNegocio = rifSeniat(cliente?.rif)
  if (!rifNegocio) {
    problemas.push({ codigo: 'RIF_NEGOCIO', mensaje: 'Falta el RIF de tu negocio o está incompleto.', arreglo: { tipo: 'negocio', id: null }, retencionId: null })
  } else if (limpiarTexto(cliente?.rif) !== rifNegocio) {
    normalizaciones.push({ mensaje: `Quitamos los guiones del RIF de tu negocio (${rifNegocio}).`, retencionId: null })
  }

  const rifsAvisados = new Set()
  const conceptosAvisados = new Set()
  const rifsNormalizados = new Set()

  for (const r of incluidas) {
    const rid = r.id ?? null
    const registro = { tipo: 'registro', id: r.invoice_id ?? null }

    // RIF del proveedor
    const rifProv = rifSeniat(r.proveedor_rif)
    const claveProv = r.proveedor_id || limpiarTexto(r.proveedor_rif) || nombreProv(r)
    if (!rifProv) {
      if (!rifsAvisados.has(claveProv)) {
        rifsAvisados.add(claveProv)
        const rifTexto = limpiarTexto(r.proveedor_rif)
        problemas.push({
          codigo: 'RIF_PROVEEDOR',
          mensaje: `El RIF de ${nombreProv(r)} no está completo${rifTexto ? ` (${rifTexto})` : ''}.`,
          arreglo: r.proveedor_id ? { tipo: 'proveedor', id: r.proveedor_id } : registro,
          retencionId: rid,
        })
      }
    } else if (limpiarTexto(r.proveedor_rif) !== rifProv && !rifsNormalizados.has(claveProv)) {
      rifsNormalizados.add(claveProv)
      normalizaciones.push({ mensaje: `Quitamos los guiones del RIF de ${nombreProv(r)} (${rifProv}).`, retencionId: rid })
    }

    // Número de factura
    const numeroFactura = limpiarTexto(r.factura_numero)
    const digitosFactura = soloDigitos(numeroFactura)
    if (!numeroFactura || (tipo === 'ISLR' && !digitosFactura)) {
      problemas.push({
        codigo: 'FACTURA_SIN_NUMERO',
        mensaje: `A la factura del ${ddmm(r.factura_fecha) || 'sin fecha'} de ${nombreProv(r)} le falta el número.`,
        arreglo: registro,
        retencionId: rid,
      })
    } else if (tipo === 'ISLR' && digitosFactura !== numeroFactura) {
      normalizaciones.push({ mensaje: `En la factura ${numeroFactura} dejamos solo los números (${digitosFactura}).`, retencionId: rid })
    } else if (numeroFactura !== String(r.factura_numero)) {
      normalizaciones.push({ mensaje: `Quitamos espacios sobrantes del número de la factura ${numeroFactura}.`, retencionId: rid })
    }

    // Fecha de la factura
    if (!soloFecha(r.factura_fecha)) {
      problemas.push({
        codigo: 'FACTURA_SIN_FECHA',
        mensaje: `A ${referenciaFactura(r)} le falta la fecha.`,
        arreglo: registro,
        retencionId: rid,
      })
    }

    if (tipo === 'IVA') {
      // Número de control (obligatorio en el TXT de IVA)
      if (!soloDigitos(r.factura_control)) {
        problemas.push({
          codigo: 'SIN_CONTROL',
          mensaje: `A ${referenciaFactura(r)} de ${nombreProv(r)} le falta el número de control.`,
          arreglo: registro,
          retencionId: rid,
        })
      }
      // Número del comprobante: 14 dígitos (AAAAMM + 8)
      const crudo = limpiarTexto(r.numero_comprobante)
      const c14 = comprobante14(crudo)
      if (!crudo) {
        problemas.push({ codigo: 'COMPROBANTE', mensaje: `El comprobante de ${referenciaFactura(r)} no tiene número.`, arreglo: registro, retencionId: rid })
      } else if (!c14) {
        problemas.push({ codigo: 'COMPROBANTE', mensaje: `El número del comprobante de ${referenciaFactura(r)} (${crudo}) debería tener 14 números.`, arreglo: registro, retencionId: rid })
      } else if (c14 !== crudo) {
        normalizaciones.push({ mensaje: `Quitamos los guiones del comprobante de ${referenciaFactura(r)}.`, retencionId: rid })
      }
    }

    if (tipo === 'ISLR') {
      // Código oficial del concepto
      if (!limpiarTexto(r.codigo_seniat)) {
        const clave = r.concepto_islr_id || limpiarTexto(r.concepto_islr_nombre)
        if (!conceptosAvisados.has(clave)) {
          conceptosAvisados.add(clave)
          const nombreConcepto = limpiarTexto(r.concepto_islr_nombre) || 'este concepto'
          problemas.push({
            codigo: 'CONCEPTO_SIN_CODIGO',
            mensaje: `No sabemos qué código del SENIAT usar para ${nombreConcepto}. Ya le avisamos al equipo.`,
            arreglo: { tipo: 'equipo', id: r.concepto_islr_id ?? null },
            retencionId: rid,
          })
        }
      }
    }

    // Monto retenido contra base × porcentaje
    if (!montoCuadra(r)) {
      problemas.push({
        codigo: 'MONTO_NO_CUADRA',
        mensaje: `El monto retenido de ${referenciaFactura(r)} no cuadra con el porcentaje.`,
        arreglo: registro,
        retencionId: rid,
      })
    }
  }

  return { incluidas, excluidas, problemas, normalizaciones }
}

/** Texto que explica lo que no se incluyó (fecha fuera del período). '' si no hay. */
export function textoExcluidas(excluidas = []) {
  const n = excluidas.length
  if (!n) return ''
  return n === 1
    ? 'Hay 1 comprobante con fecha de otro período; no se incluyó aquí.'
    : `Hay ${n} comprobantes con fecha de otro período; no se incluyeron aquí.`
}
