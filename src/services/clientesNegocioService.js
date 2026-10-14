/**
 * clientesNegocioService.js
 * "Mis clientes": a quién le vende el negocio (tabla `clientes_negocio`).
 *
 * Reglas:
 * - NO hay FK entre `invoices` y `clientes_negocio` (ver incidente 2026-10-13):
 *   nunca se usan embeds de PostgREST. Se consulta cada tabla por separado y
 *   se une en JS por `invoices.cliente_negocio_id`.
 * - Montos en USD con la misma lógica de "Mis movimientos" (`aUSD`); "por
 *   cobrar" = ventas en estado CRÉDITO o VENCIDA (igual que `porCobrar`).
 *   ANULADAS y BORRADORES no cuentan como dinero real.
 * - Un cliente nuevo NUNCA se crea al escribirlo, solo al guardar la venta
 *   (`asegurarClienteDeVenta`). "Consumidor final" no crea nada.
 */

import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, getCurrentClientId } from '@/utils/tenantHelpers'
import { normalizarRif, tipoPersonaPorLetra } from '@/utils/rif.js'
import { montoFacturaEn } from '@/utils/monedas.js'
import { parseFechaLocal } from '@/utils/fechas.js'

const COLUMNAS = 'id, client_id, organization_id, tipo_persona, nombre, rif, telefono, correo, direccion, es_contribuyente_especial, notas, deleted_at, created_at, updated_at'
const COLUMNAS_VENTA = 'id, invoice_number, issue_date, due_date, status, financial, cliente_negocio_id'
const DIAS_FRECUENTE = 90
const COMPRAS_FRECUENTE = 3

export const TOTALES_VACIOS = Object.freeze({
  comprado90: 0,
  compradoAnio: 0,
  compras90: 0,
  porCobrar: 0,
  facturasPorCobrar: 0,
  deudaDesde: null,
  ultimaCompra: null,
  sinTasa: 0 // ventas que no se pudieron convertir a USD por falta de tasa
})

const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function esConsumidorFinal(nombre) {
  return sinAcentos(nombre) === 'consumidor final'
}

function cuenta(inv) {
  return inv.status !== 'ANULADA' && inv.status !== 'BORRADOR'
}

/**
 * Totales por cliente a partir de sus ventas (filas de `invoices`).
 * @param {Array} ventas filas con cliente_negocio_id, issue_date, status, financial
 * @param {number|object} tasas vigentes (número = dólar, u objeto { USD, EUR, ... });
 *   cada venta usa primero su propia tasa; sin ninguna, no suma y se cuenta en `sinTasa`
 * @param {Date} [ahora]
 * @returns {Object<string, typeof TOTALES_VACIOS>} por cliente_negocio_id
 */
export function calcularTotales(ventas, tasas, ahora = new Date()) {
  const porCliente = {}
  const limite90 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - DIAS_FRECUENTE)
  for (const inv of ventas || []) {
    const id = inv.cliente_negocio_id
    if (!id || !cuenta(inv)) continue
    const t = (porCliente[id] ||= { ...TOTALES_VACIOS })
    const conv = montoFacturaEn(inv, 'USD', tasas)
    if (conv.sinTasa) t.sinTasa += 1
    const usd = conv.monto
    const fecha = parseFechaLocal(inv.issue_date)
    if (fecha) {
      if (fecha.getFullYear() === ahora.getFullYear()) t.compradoAnio += usd
      if (fecha >= limite90) {
        t.comprado90 += usd
        t.compras90 += 1
      }
      if (!t.ultimaCompra || inv.issue_date > t.ultimaCompra) t.ultimaCompra = inv.issue_date
    }
    if (inv.status === 'CRÉDITO' || inv.status === 'VENCIDA') {
      t.porCobrar += usd
      t.facturasPorCobrar += 1
      if (inv.issue_date && (!t.deudaDesde || inv.issue_date < t.deudaDesde)) t.deudaDesde = inv.issue_date
    }
  }
  return porCliente
}

/** Frecuente = 3 o más compras en los últimos 90 días. */
export function esFrecuente(totales) {
  return (totales?.compras90 || 0) >= COMPRAS_FRECUENTE
}

/** "Sin datos fiscales" = no tiene un RIF válido. */
export function sinDatosFiscales(cliente) {
  return !normalizarRif(cliente?.rif)
}

/** Días enteros desde una fecha 'YYYY-MM-DD' hasta `ahora` (mínimo 0). */
export function diasDesde(fecha, ahora = new Date()) {
  const f = parseFechaLocal(fecha)
  if (!f) return 0
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  return Math.max(0, Math.round((hoy - f) / 86400000))
}

function limpiarPayload(p = {}) {
  const texto = (v) => (v == null ? null : (String(v).trim() || null))
  const rif = texto(p.rif)
  const rifN = normalizarRif(rif)
  const out = {
    nombre: texto(p.nombre),
    rif: rifN || rif,
    telefono: texto(p.telefono),
    correo: texto(p.correo),
    direccion: texto(p.direccion),
    notas: texto(p.notas),
    es_contribuyente_especial: !!p.es_contribuyente_especial,
    tipo_persona: p.tipo_persona || (rifN ? (tipoPersonaPorLetra(rifN) || 'natural') : 'natural')
  }
  out.tipo_persona = String(out.tipo_persona).toLowerCase() === 'juridica' ? 'juridica' : 'natural'
  return out
}

/** Filtra una lista de clientes por nombre (sin acentos) o RIF (con o sin guiones). */
export function filtrarClientes(lista, texto, limite = 8) {
  const t = sinAcentos(texto)
  if (!t) return (lista || []).slice(0, limite)
  const soloRif = t.replace(/[^a-z0-9]/g, '')
  return (lista || [])
    .filter((c) => sinAcentos(c.nombre).includes(t)
      || (soloRif.length >= 3 && String(c.rif || '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(soloRif)))
    .slice(0, limite)
}

const servicio = {
  /** Resuelve empresa (client_id) y organización activas. */
  async _contexto() {
    let orgId = getCurrentOrganizationId()
    let clientId = getCurrentClientId()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase
          .from('users').select('id, role, organization_id, client_id').eq('id', user.id).single()
        if (perfil) {
          orgId = perfil.organization_id || orgId
          if (perfil.role === 'cliente') clientId = perfil.client_id || clientId
        }
      }
    } catch (err) {
      console.warn('[clientesNegocioService] No se pudo resolver el perfil', err?.message)
    }
    return { orgId, clientId }
  },

  /** Clientes activos de la empresa, sin totales. Lanza si la consulta falla. */
  async _clientes({ orgId, clientId }) {
    let q = supabase.from('clientes_negocio').select(COLUMNAS)
      .eq('organization_id', orgId).is('deleted_at', null)
    if (clientId) q = q.eq('client_id', clientId)
    const { data, error } = await q.order('nombre', { ascending: true })
    if (error) throw error
    return data || []
  },

  /** Ventas con cliente enlazado (consulta aparte, sin embed). */
  async _ventas({ orgId, clientId }, clienteNegocioId = null) {
    let q = supabase.from('invoices').select(COLUMNAS_VENTA)
      .eq('organization_id', orgId).eq('flow', 'VENTA').is('deleted_at', null)
    if (clientId) q = q.eq('client_id', clientId)
    q = clienteNegocioId ? q.eq('cliente_negocio_id', clienteNegocioId) : q.not('cliente_negocio_id', 'is', null)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  /**
   * Lista de clientes con totales.
   * @param {{ tasa?: number, ahora?: Date }} [opciones]
   * @returns {Promise<Array>} cada cliente trae `totales`
   */
  async listar({ tasa = 0, tasas = tasa, ahora = new Date() } = {}) {
    const ctx = await this._contexto()
    if (!ctx.orgId) return []
    const [clientes, ventas] = await Promise.all([this._clientes(ctx), this._ventas(ctx)])
    const totales = calcularTotales(ventas, tasas, ahora)
    return clientes.map((c) => ({ ...c, totales: totales[c.id] || { ...TOTALES_VACIOS } }))
  },

  /**
   * Un cliente con sus totales y su historial de ventas (más recientes primero).
   * @returns {Promise<{ cliente, totales, ventas }|null>}
   */
  async obtener(id, { tasa = 0, tasas = tasa, ahora = new Date() } = {}) {
    const ctx = await this._contexto()
    if (!ctx.orgId || !id) return null
    let q = supabase.from('clientes_negocio').select(COLUMNAS).eq('id', id).eq('organization_id', ctx.orgId)
    if (ctx.clientId) q = q.eq('client_id', ctx.clientId)
    const { data, error } = await q.maybeSingle()
    if (error) throw error
    if (!data) return null
    const filas = await this._ventas(ctx, id)
    const totales = calcularTotales(filas, tasas, ahora)[id] || { ...TOTALES_VACIOS }
    const ventas = filas
      .map((v) => ({
        id: v.id,
        numero: v.invoice_number,
        fecha: v.issue_date,
        estado: v.status,
        moneda: v.financial?.currency || 'VES',
        monto: Number(v.financial?.totalSales) || 0,
        montoUSD: montoFacturaEn(v, 'USD', tasas).monto,
        sinTasa: montoFacturaEn(v, 'USD', tasas).sinTasa
      }))
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
    return { cliente: data, totales, ventas }
  },

  /** Crea un cliente. Nunca lanza: { success, data?, error? }. */
  async crear(payload) {
    try {
      const ctx = await this._contexto()
      if (!ctx.orgId || !ctx.clientId) throw new Error('No hay una empresa activa en la sesión.')
      const fila = limpiarPayload(payload)
      if (!fila.nombre) throw new Error('El nombre es obligatorio.')
      const { data, error } = await supabase.from('clientes_negocio')
        .insert([{ ...fila, organization_id: ctx.orgId, client_id: ctx.clientId }])
        .select(COLUMNAS).single()
      if (error) {
        if (error.code === '23505') throw new Error(`Ya tienes un cliente con el RIF ${fila.rif}.`)
        throw error
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo guardar el cliente.' }
    }
  },

  /** Actualiza un cliente. Nunca lanza. */
  async actualizar(id, payload) {
    try {
      const ctx = await this._contexto()
      if (!ctx.orgId || !id) throw new Error('Faltan datos para guardar.')
      const fila = { ...limpiarPayload(payload), updated_at: new Date().toISOString() }
      if (!fila.nombre) throw new Error('El nombre es obligatorio.')
      let q = supabase.from('clientes_negocio').update(fila).eq('id', id).eq('organization_id', ctx.orgId)
      if (ctx.clientId) q = q.eq('client_id', ctx.clientId)
      const { data, error } = await q.select(COLUMNAS).single()
      if (error) {
        if (error.code === '23505') throw new Error(`Ya tienes otro cliente con el RIF ${fila.rif}.`)
        throw error
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo guardar el cliente.' }
    }
  },

  /** Manda el cliente a la papelera (deleted_at). Sus ventas conservan el vínculo. */
  async papelera(id) {
    try {
      const ctx = await this._contexto()
      if (!ctx.orgId || !id) throw new Error('Faltan datos.')
      let q = supabase.from('clientes_negocio')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('organization_id', ctx.orgId)
      if (ctx.clientId) q = q.eq('client_id', ctx.clientId)
      const { error } = await q
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message || 'No se pudo mandar a la papelera.' }
    }
  },

  /** Un cliente por id, sin totales ni historial (para prellenar el formulario). */
  async obtenerBasico(id) {
    try {
      const ctx = await this._contexto()
      if (!ctx.orgId || !id) return null
      let q = supabase.from('clientes_negocio').select(COLUMNAS)
        .eq('id', id).eq('organization_id', ctx.orgId).is('deleted_at', null)
      if (ctx.clientId) q = q.eq('client_id', ctx.clientId)
      const { data, error } = await q.maybeSingle()
      if (error) throw error
      return data || null
    } catch (err) {
      console.warn('[clientesNegocioService] obtenerBasico falló', err?.message)
      return null
    }
  },

  /**
   * Búsqueda para el autocompletado: por nombre (sin acentos) o RIF (con o
   * sin guiones). Devuelve [] si falla (el formulario sigue sirviendo).
   */
  async buscar(texto, limite = 8) {
    try {
      const ctx = await this._contexto()
      if (!ctx.orgId) return []
      return filtrarClientes(await this._clientes(ctx), texto, limite)
    } catch (err) {
      console.warn('[clientesNegocioService] buscar falló', err?.message)
      return []
    }
  },

  /**
   * Resuelve el cliente de una VENTA justo antes de guardarla.
   * - Trae `cliente_negocio_id`: se usa tal cual.
   * - "Consumidor final" o sin nombre: no crea nada (id null).
   * - Cliente nuevo: se busca por RIF normalizado y, si no existe, se crea.
   * Nunca lanza.
   * @returns {Promise<{ success: boolean, id: string|null, creado?: boolean, message?: string }>}
   */
  async asegurarClienteDeVenta(formData) {
    if (formData?.cliente_negocio_id) return { success: true, id: formData.cliente_negocio_id, creado: false }
    const info = formData?.client || {}
    const nombre = String(info.companyName || '').trim()
    if (!nombre || esConsumidorFinal(nombre)) return { success: true, id: null, creado: false }

    try {
      const ctx = await this._contexto()
      if (!ctx.orgId || !ctx.clientId) return { success: true, id: null, creado: false }
      const rifN = normalizarRif(info.rif)

      const buscarPorRif = async () => {
        if (!rifN) return null
        const todos = await this._clientes(ctx)
        return todos.find((c) => normalizarRif(c.rif) === rifN) || null
      }

      // Si no podemos comprobar duplicados, no seguimos a crear uno.
      let existente
      try {
        existente = await buscarPorRif()
      } catch (err) {
        return { success: false, id: null, message: 'No pudimos comprobar si este cliente ya existe (revisa tu conexión). No se guardó nada; intenta de nuevo.' }
      }
      if (existente) return { success: true, id: existente.id, creado: false }

      const creado = await this.crear({
        nombre,
        rif: info.rif,
        telefono: info.phone,
        correo: info.email,
        direccion: info.address,
        es_contribuyente_especial: !!info.es_contribuyente_especial
      })
      if (creado.success) return { success: true, id: creado.data.id, creado: true }
      if (/ya tienes un cliente/i.test(creado.error || '')) {
        try {
          const tras = await buscarPorRif()
          if (tras) return { success: true, id: tras.id, creado: false }
        } catch { /* cae al error de abajo */ }
      }
      return { success: false, id: null, message: creado.error || 'No se pudo registrar el cliente nuevo.' }
    } catch (err) {
      return { success: false, id: null, message: 'No se pudo registrar el cliente nuevo. Intenta de nuevo.' }
    }
  }
}

export default servicio
