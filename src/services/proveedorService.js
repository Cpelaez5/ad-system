/**
 * proveedorService.js
 * Servicio especializado para la gestión integral de Proveedores (CRUD, KPIs, Catálogos y Ficha 360).
 *
 * Arquitectura S.O.L.I.D., Resiliente y Multi-Tenant:
 * - Aislamiento Estricto y Privado por Cliente (client_id).
 * - Los proveedores de una empresa cliente son 100% privados y no se comparten con otros clientes.
 * - Catálogo Oficial SENIAT (Decreto 1808) para Conceptos de Retención de ISLR con fallback resiliente.
 * - Sincronización en caliente y Event Bus 'ad-proveedor-changed'.
 */

import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, getCurrentClientId } from '@/utils/tenantHelpers'

// Caché en memoria
let cachedConceptosIslr = null
let cachedMunicipios = null

// Catálogo oficial de conceptos ISLR según Decreto 1808 (SENIAT)
const DEFAULT_SENIAT_ISLR_CONCEPTS = [
  {
    id: 'c001-honorarios-nat',
    codigo: '001',
    nombre: 'Honorarios Profesionales a Personas Naturales Residentes',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 83.33,
    monto_minimo_ut: 0,
    aplica_persona: 'NATURAL'
  },
  {
    id: 'c002-honorarios-jur',
    codigo: '002',
    nombre: 'Honorarios Profesionales pagados a Personas Jurídicas Domiciliadas',
    porcentaje_base: 100,
    porcentaje_retencion: 5.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'JURIDICA'
  },
  {
    id: 'c003-serv-generales-jur',
    codigo: '003',
    nombre: 'Servicios Generales y Mantenimiento a Personas Jurídicas',
    porcentaje_base: 100,
    porcentaje_retencion: 2.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'JURIDICA'
  },
  {
    id: 'c004-serv-generales-nat',
    codigo: '004',
    nombre: 'Servicios Generales y Mantenimiento a Personas Naturales',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 83.33,
    monto_minimo_ut: 0,
    aplica_persona: 'NATURAL'
  },
  {
    id: 'c005-publicidad-jur',
    codigo: '005',
    nombre: 'Servicios de Publicidad y Propaganda a Personas Jurídicas',
    porcentaje_base: 100,
    porcentaje_retencion: 5.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'JURIDICA'
  },
  {
    id: 'c006-publicidad-nat',
    codigo: '006',
    nombre: 'Servicios de Publicidad y Propaganda a Personas Naturales',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 83.33,
    monto_minimo_ut: 0,
    aplica_persona: 'NATURAL'
  },
  {
    id: 'c007-comisiones-jur',
    codigo: '007',
    nombre: 'Comisiones Mercantiles a Personas Jurídicas',
    porcentaje_base: 100,
    porcentaje_retencion: 5.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'JURIDICA'
  },
  {
    id: 'c008-comisiones-nat',
    codigo: '008',
    nombre: 'Comisiones Mercantiles a Personas Naturales',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 83.33,
    monto_minimo_ut: 0,
    aplica_persona: 'NATURAL'
  },
  {
    id: 'c009-fletes-jur',
    codigo: '009',
    nombre: 'Fletes y Transporte de Carga a Personas Jurídicas',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'JURIDICA'
  },
  {
    id: 'c010-fletes-nat',
    codigo: '010',
    nombre: 'Fletes y Transporte de Carga a Personas Naturales',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 83.33,
    monto_minimo_ut: 0,
    aplica_persona: 'NATURAL'
  },
  {
    id: 'c011-arrendamiento-jur',
    codigo: '011',
    nombre: 'Arrendamiento de Bienes Inmuebles a Personas Jurídicas',
    porcentaje_base: 100,
    porcentaje_retencion: 5.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'JURIDICA'
  },
  {
    id: 'c012-arrendamiento-nat',
    codigo: '012',
    nombre: 'Arrendamiento de Bienes Inmuebles a Personas Naturales',
    porcentaje_base: 100,
    porcentaje_retencion: 3.00,
    sustraendo_ut: 83.33,
    monto_minimo_ut: 0,
    aplica_persona: 'NATURAL'
  },
  {
    id: 'c013-ejecucion-obras',
    codigo: '013',
    nombre: 'Ejecución de Obras y Construcción (Contratistas)',
    porcentaje_base: 100,
    porcentaje_retencion: 2.00,
    sustraendo_ut: 0,
    monto_minimo_ut: 0,
    aplica_persona: 'AMBOS'
  }
]

// Catálogo de municipios principales de Venezuela
const DEFAULT_VENEZUELA_MUNICIPIOS = [
  { id: 'm-libertador', nombre: 'Libertador (Distrito Capital)' },
  { id: 'm-chacao', nombre: 'Chacao (Miranda)' },
  { id: 'm-baruta', nombre: 'Baruta (Miranda)' },
  { id: 'm-sucre', nombre: 'Sucre (Miranda)' },
  { id: 'm-elhatillo', nombre: 'El Hatillo (Miranda)' },
  { id: 'm-valencia', nombre: 'Valencia (Carabobo)' },
  { id: 'm-maracaibo', nombre: 'Maracaibo (Zulia)' },
  { id: 'm-iribarren', nombre: 'Iribarren (Lara)' },
  { id: 'm-girardot', nombre: 'Girardot (Aragua)' },
  { id: 'm-simon-bolivar', nombre: 'Simón Bolívar (Anzoátegui)' }
]

class ProveedorService {
  /**
   * Resuelve el contexto de autenticación, organización y cliente activo con verificación en tiempo real.
   * @private
   */
  async _getEffectiveContext() {
    let orgId = getCurrentOrganizationId()
    let clientId = getCurrentClientId()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('id, role, organization_id, client_id')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          orgId = userProfile.organization_id || orgId
          if (userProfile.role === 'cliente') {
            clientId = userProfile.client_id || clientId
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ [ProveedorService] Error resolviendo perfil para client_id:', err)
    }

    return { orgId, clientId }
  }

  /**
   * Obtiene la lista de proveedores con aislamiento estricto por cliente.
   * Si el usuario autenticado es un cliente (empresa cliente), SOLO recibe los proveedores pertenecientes a su client_id.
   * @param {Object} filters
   * @returns {Promise<Array>} Lista de proveedores
   */
  async getProveedores(filters = {}) {
    try {
      const { orgId, clientId } = await this._getEffectiveContext()
      if (!orgId) return []

      // 1. Obtener catálogos en paralelo
      const [conceptosList, municipiosList] = await Promise.all([
        this.getISLRConcepts(),
        this.getMunicipios()
      ])

      const conceptosMap = new Map(conceptosList.map(c => [c.id, c]))
      const municipiosMap = new Map(municipiosList.map(m => [m.id, m]))

      // 2. Consulta a la tabla proveedores con aislamiento estricto
      let rawData = []
      try {
        let query = supabase
          .from('proveedores')
          .select('*')
          .eq('organization_id', orgId)
          .is('deleted_at', null)

        // Si es rol cliente, filtrar ESTRICTAMENTE por su client_id
        if (clientId) {
          query = query.eq('client_id', clientId)
        }

        const { data, error } = await query.order('nombre', { ascending: true })
        if (!error && Array.isArray(data)) {
          rawData = data
        } else if (error) {
          console.warn('⚠️ [ProveedorService] Consulta a proveedores falló:', error.message)
        }
      } catch (queryErr) {
        console.warn('⚠️ [ProveedorService] Error en consulta a proveedores:', queryErr)
      }

      // Filtrado estricto en memoria de respaldo:
      // Si hay clientId, NUNCA incluir proveedores de otros clientes ni proveedores sin client_id
      if (clientId) {
        rawData = rawData.filter(p => p.client_id === clientId)
      }

      let proveedores = (rawData || []).map(p => {
        const cIslr = p.islr_concept_id ? conceptosMap.get(p.islr_concept_id) : null
        const cMun = p.municipio_id ? municipiosMap.get(p.municipio_id) : null

        return {
          ...p,
          telefono: p.telefono || null,
          email: p.email || null,
          direccion: p.direccion || null,
          contacto_nombre: p.contacto_nombre || null,
          is_active: p.is_active !== false,
          islr_codigo: cIslr?.codigo || null,
          islr_nombre: cIslr?.nombre || null,
          islr_porcentaje: cIslr?.porcentaje_retencion || 0,
          islr_sustraendo_ut: cIslr?.sustraendo_ut || 0,
          municipio_nombre: cMun?.nombre || null,
          total_facturas: 0,
          total_compras: 0,
          total_retenido: 0,
          ultima_compra_fecha: null
        }
      })

      // 3. Sincronizar y descubrir proveedores desde facturas y retenciones históricas SOLO de este cliente
      proveedores = await this._syncFromInvoices(orgId, clientId, proveedores)

      // 4. Aplicar filtros en memoria
      if (filters.onlyActive !== false) {
        proveedores = proveedores.filter(p => p.is_active !== false)
      }
      if (filters.tipoPersona && filters.tipoPersona !== 'ALL') {
        proveedores = proveedores.filter(p => p.tipo_persona === filters.tipoPersona)
      }
      if (filters.search) {
        const s = filters.search.toLowerCase().trim()
        proveedores = proveedores.filter(p =>
          (p.nombre && p.nombre.toLowerCase().includes(s)) ||
          (p.rif && p.rif.toLowerCase().includes(s))
        )
      }

      return proveedores.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))

    } catch (error) {
      console.error('❌ [ProveedorService] Error en getProveedores:', error)
      return []
    }
  }

  /**
   * Sincroniza y descubre automáticamente proveedores creados en facturas de compras/gastos
   * Estrictamente aislados por client_id cuando aplica.
   * @private
   */
  async _syncFromInvoices(orgId, clientId, existingProveedores) {
    try {
      let invQuery = supabase
        .from('invoices')
        .select('id, client_id, issuer, financial, iva_retention, islr_retention, municipal_retention, issue_date')
        .eq('organization_id', orgId)
        .in('flow', ['COMPRA', 'GASTO'])
        .is('deleted_at', null)

      let retQuery = supabase
        .from('retenciones')
        .select('id, client_id, proveedor_id, proveedor_rif, proveedor_nombre, monto_retenido, base_imponible, factura_numero, factura_fecha, created_at')
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      // Si hay clientId, filtrar ESTRICTAMENTE las facturas y retenciones de este cliente
      if (clientId) {
        invQuery = invQuery.eq('client_id', clientId)
        retQuery = retQuery.eq('client_id', clientId)
      }

      const [{ data: purchaseInvoices, error: invError }, { data: retencionesList, error: retError }] = await Promise.all([
        invQuery,
        retQuery
      ])

      let invoices = (!invError && Array.isArray(purchaseInvoices)) ? purchaseInvoices : []
      let retenciones = (!retError && Array.isArray(retencionesList)) ? retencionesList : []

      if (clientId) {
        invoices = invoices.filter(i => i.client_id === clientId)
        retenciones = retenciones.filter(r => r.client_id === clientId)
      }

      if (invoices.length === 0 && retenciones.length === 0) {
        return existingProveedores
      }

      const cleanAlphanumeric = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const cleanName = (str) => String(str || '').toLowerCase().trim()

      const existingRifs = new Set(existingProveedores.map(p => cleanAlphanumeric(p.rif)).filter(Boolean))
      const existingNames = new Set(existingProveedores.map(p => cleanName(p.nombre)).filter(Boolean))

      const toAutoCreate = []

      // 1. Auto-descubrimiento de proveedores en facturas no registrados aún (con client_id)
      for (const inv of invoices) {
        const issuer = inv.issuer || {}
        const rawName = issuer.companyName || issuer.nombre || issuer.name
        const rawRif = issuer.rif

        if (!rawName || typeof rawName !== 'string' || !rawName.trim()) continue

        const name = rawName.trim()
        const rawRifClean = cleanAlphanumeric(rawRif)

        const hasRifMatch = rawRifClean && existingRifs.has(rawRifClean)
        const hasNameMatch = cleanName(name) && existingNames.has(cleanName(name))

        if (!hasRifMatch && !hasNameMatch) {
          const finalRif = rawRif?.trim() || `PROV-${Date.now().toString().slice(-6)}`
          const isNatural = finalRif.toUpperCase().startsWith('V') || finalRif.toUpperCase().startsWith('E')

          const newProvPayload = {
            organization_id: orgId,
            client_id: clientId || null,
            nombre: name,
            rif: finalRif,
            tipo_persona: isNatural ? 'NATURAL' : 'JURIDICA',
            telefono: issuer.phone || null,
            email: issuer.email || null,
            direccion: issuer.address || null,
            iva_retention_rate: 75,
            islr_concept_id: null,
            municipal_rate: 0,
            is_active: true
          }

          toAutoCreate.push(newProvPayload)

          if (rawRifClean) existingRifs.add(rawRifClean)
          existingNames.add(cleanName(name))
        }
      }

      // Persistir proveedores auto-descubiertos
      if (toAutoCreate.length > 0) {
        try {
          const { data: created } = await supabase
            .from('proveedores')
            .insert(toAutoCreate)
            .select()

          if (created && created.length > 0) {
            created.forEach(item => {
              existingProveedores.push({
                ...item,
                is_active: true,
                islr_codigo: null,
                islr_nombre: null,
                islr_porcentaje: 0,
                islr_sustraendo_ut: 0,
                municipio_nombre: null,
                total_facturas: 0,
                total_compras: 0,
                total_retenido: 0,
                ultima_compra_fecha: null
              })
            })
          }
        } catch (insertErr) {
          console.warn('⚠️ [ProveedorService] Error guardando proveedores descubiertos:', insertErr)
        }
      }

      // 2. Calcular acumulados de compras y retenciones vinculando facturas y retenciones
      return existingProveedores.map(p => {
        const pRifClean = cleanAlphanumeric(p.rif)
        const pNameClean = cleanName(p.nombre)

        // Matching de facturas
        const matchingInvoices = invoices.filter(inv => {
          const issuer = inv.issuer || {}
          const iRifClean = cleanAlphanumeric(issuer.rif)
          const iNameClean = cleanName(issuer.companyName || issuer.nombre || issuer.name)
          const iId = issuer.id || inv.proveedor_id

          return (iId && iId === p.id) ||
                 (pRifClean && iRifClean && pRifClean === iRifClean) ||
                 (pNameClean && iNameClean && pNameClean === iNameClean) ||
                 (pNameClean && iNameClean && (pNameClean.includes(iNameClean) || iNameClean.includes(pNameClean)))
        })

        // Matching de retenciones
        const matchingRetenciones = retenciones.filter(ret => {
          const rRifClean = cleanAlphanumeric(ret.proveedor_rif)
          const rNameClean = cleanName(ret.proveedor_nombre)
          const rId = ret.proveedor_id

          return (rId && rId === p.id) ||
                 (pRifClean && rRifClean && pRifClean === rRifClean) ||
                 (pNameClean && rNameClean && pNameClean === rNameClean)
        })

        // Totales de compras: suma de facturas o respaldo con base imponible de retenciones
        let totalCompras = matchingInvoices.reduce((acc, inv) => {
          const val = Number(inv.financial?.totalSales || inv.financial?.total || inv.financial?.totalAmount || inv.total_amount || 0)
          return acc + val
        }, 0)

        if (totalCompras === 0 && matchingRetenciones.length > 0) {
          totalCompras = matchingRetenciones.reduce((acc, r) => acc + Number(r.base_imponible || 0), 0)
        }

        // Totales de retenciones: prioridad tabla retenciones, fallback campos invoice
        let totalRetenido = matchingRetenciones.reduce((acc, r) => acc + Number(r.monto_retenido || 0), 0)
        if (totalRetenido === 0 && matchingInvoices.length > 0) {
          totalRetenido = matchingInvoices.reduce((acc, inv) => {
            return acc + Number(inv.iva_retention || 0) + Number(inv.islr_retention || 0) + Number(inv.municipal_retention || 0)
          }, 0)
        }

        const totalFacturas = matchingInvoices.length > 0 ? matchingInvoices.length : matchingRetenciones.length
        const sortedDates = matchingInvoices.map(i => i.issue_date).filter(Boolean).sort().reverse()
        const lastDate = sortedDates[0] || (matchingRetenciones[0]?.factura_fecha || null)

        return {
          ...p,
          total_facturas: totalFacturas,
          total_compras: totalCompras,
          total_retenido: totalRetenido,
          ultima_compra_fecha: lastDate
        }
      })

    } catch (err) {
      console.warn('⚠️ [ProveedorService] Error en _syncFromInvoices:', err)
      return existingProveedores
    }
  }

  /**
   * Obtiene la ficha 360 de un proveedor por su ID con aislamiento estricto por cliente.
   * @param {string} id - UUID del proveedor
   * @returns {Promise<Object|null>}
   */
  async getProveedorById(id) {
    try {
      const { orgId, clientId } = await this._getEffectiveContext()
      if (!orgId || !id) return null

      // Obtener datos básicos
      let provQuery = supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .eq('organization_id', orgId)

      if (clientId) {
        provQuery = provQuery.eq('client_id', clientId)
      }

      const { data: proveedor, error } = await provQuery.single()

      if (error || !proveedor) throw error

      // Historial de facturas asociadas (COMPRA)
      let invQuery = supabase
        .from('invoices')
        .select('id, invoice_number, control_number, issue_date, status, issuer, financial, iva_retention, islr_retention, municipal_retention')
        .eq('organization_id', orgId)
        .eq('flow', 'COMPRA')
        .is('deleted_at', null)
        .order('issue_date', { ascending: false })

      if (clientId) {
        invQuery = invQuery.eq('client_id', clientId)
      }

      // Historial de comprobantes de retención
      let retQuery = supabase
        .from('retenciones')
        .select('id, tipo, numero_comprobante, factura_numero, factura_fecha, base_imponible, porcentaje_retencion, monto_retenido, created_at')
        .eq('organization_id', orgId)
        .eq('proveedor_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (clientId) {
        retQuery = retQuery.eq('client_id', clientId)
      }

      const [{ data: allFacturas }, { data: retenciones }] = await Promise.all([
        invQuery,
        retQuery
      ])

      const cleanAlphanumeric = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const pRifClean = cleanAlphanumeric(proveedor.rif)

      const facturas = (allFacturas || []).filter(f => {
        const issuer = f.issuer || {}
        const iRifClean = cleanAlphanumeric(issuer.rif)
        return (issuer.id && issuer.id === proveedor.id) || (pRifClean && iRifClean && pRifClean === iRifClean)
      }).slice(0, 10)

      const totalCompras = (facturas || []).reduce((acc, f) => acc + Number(f.financial?.totalSales || 0), 0)
      const totalRetenido = (retenciones || []).reduce((acc, r) => acc + Number(r.monto_retenido || 0), 0)

      // Obtener conceptos ISLR y municipios para resolver nombres
      const [conceptosList, municipiosList] = await Promise.all([
        this.getISLRConcepts(),
        this.getMunicipios()
      ])

      const cIslr = proveedor.islr_concept_id ? conceptosList.find(c => c.id === proveedor.islr_concept_id) : null
      const cMun = proveedor.municipio_id ? municipiosList.find(m => m.id === proveedor.municipio_id) : null

      return {
        ...proveedor,
        concepto_islr: cIslr || null,
        municipio: cMun || null,
        facturasRecientes: facturas || [],
        retencionesRecientes: retenciones || [],
        metricas: {
          totalFacturas: facturas?.length || 0,
          totalCompras,
          totalRetenido,
          ultimaCompra: facturas?.[0]?.issue_date || null
        }
      }


    } catch (error) {
      console.error('❌ [ProveedorService] Error en getProveedorById:', error)
      return null
    }
  }

  /**
   * Crea un nuevo proveedor con client_id privado garantizado.
   * @param {Object} payload
   * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
   */
  async createProveedor(payload) {
    try {
      const { orgId, clientId } = await this._getEffectiveContext()
      if (!orgId) throw new Error('No hay una organización activa en la sesión.')

      let sanitized = this._sanitizePayload(payload, orgId, clientId)

      if (!sanitized.nombre) throw new Error('El Nombre o Razón Social es obligatorio.')
      if (!sanitized.rif) throw new Error('El RIF es obligatorio.')

      let { data, error } = await supabase
        .from('proveedores')
        .insert([sanitized])
        .select()
        .single()

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('idx_proveedores_org_rif')) {
          throw new Error(`Ya existe un proveedor registrado con el RIF ${sanitized.rif}.`)
        }
        throw error
      }

      this._dispatchChangeEvent('created', data)
      return { success: true, data }
    } catch (error) {
      console.error('❌ [ProveedorService] Error en createProveedor:', error)
      return { success: false, error: error.message || 'Error al registrar el proveedor.' }
    }
  }

  /**
   * Actualiza los datos de un proveedor existente con verificación de propiedad por client_id.
   * @param {string} id - UUID del proveedor
   * @param {Object} payload
   * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
   */
  async updateProveedor(id, payload) {
    try {
      const { orgId, clientId } = await this._getEffectiveContext()
      if (!orgId || !id) throw new Error('Parámetros inválidos.')

      let sanitized = this._sanitizePayload(payload, orgId, clientId)
      delete sanitized.id
      delete sanitized.organization_id
      sanitized.updated_at = new Date().toISOString()

      let updateQuery = supabase
        .from('proveedores')
        .update(sanitized)
        .eq('id', id)
        .eq('organization_id', orgId)

      if (clientId) {
        updateQuery = updateQuery.eq('client_id', clientId)
      }

      let { data, error } = await updateQuery.select().single()

      if (error) {
        if (error.code === '23505') {
          throw new Error(`El RIF ${sanitized.rif} ya pertenece a otro proveedor registrado.`)
        }
        throw error
      }

      this._dispatchChangeEvent('updated', data)
      return { success: true, data }
    } catch (error) {
      console.error('❌ [ProveedorService] Error en updateProveedor:', error)
      return { success: false, error: error.message || 'Error al actualizar el proveedor.' }
    }
  }

  /**
   * Elimina un proveedor asegurando pertenencia al cliente activo.
   * @param {string} id - UUID del proveedor
   * @param {string} [rif] - RIF del proveedor
   * @returns {Promise<{ success: boolean, softDeleted: boolean, error?: string }>}
   */
  async deleteProveedor(id, rif = '') {
    try {
      const { orgId, clientId } = await this._getEffectiveContext()
      if (!orgId || !id) throw new Error('Parámetros inválidos.')

      const hasHistory = await this.checkHasHistory(id, rif, clientId)

      if (hasHistory) {
        let softDeleteQuery = supabase
          .from('proveedores')
          .update({
            is_active: false,
            deleted_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('organization_id', orgId)

        if (clientId) {
          softDeleteQuery = softDeleteQuery.eq('client_id', clientId)
        }

        const { error } = await softDeleteQuery

        if (error) throw error

        this._dispatchChangeEvent('soft-deleted', { id })
        return { success: true, softDeleted: true, message: 'Proveedor archivado exitosamente para conservar su historial contable.' }
      } else {
        let deleteQuery = supabase
          .from('proveedores')
          .delete()
          .eq('id', id)
          .eq('organization_id', orgId)

        if (clientId) {
          deleteQuery = deleteQuery.eq('client_id', clientId)
        }

        const { error } = await deleteQuery

        if (error) throw error

        this._dispatchChangeEvent('deleted', { id })
        return { success: true, softDeleted: false, message: 'Proveedor eliminado permanentemente.' }
      }
    } catch (error) {
      console.error('❌ [ProveedorService] Error en deleteProveedor:', error)
      return { success: false, error: error.message || 'Error al eliminar el proveedor.' }
    }
  }

  /**
   * Comprueba si un proveedor tiene facturas o retenciones vinculadas en el sistema para este cliente.
   */
  async checkHasHistory(id, rif, clientId = null) {
    try {
      const orgId = getCurrentOrganizationId()
      if (!orgId) return false

      let invQuery = supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      if (clientId) {
        invQuery = invQuery.eq('client_id', clientId)
      }

      if (rif) {
        invQuery = invQuery.or(`issuer->>rif.eq.${rif},issuer->>id.eq.${id}`)
      } else {
        invQuery = invQuery.eq('issuer->>id', id)
      }

      const { count: invCount } = await invQuery
      if (invCount && invCount > 0) return true

      let retQuery = supabase
        .from('retenciones')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('proveedor_id', id)
        .is('deleted_at', null)

      if (clientId) {
        retQuery = retQuery.eq('client_id', clientId)
      }

      const { count: retCount } = await retQuery
      return Boolean(retCount && retCount > 0)
    } catch {
      return false
    }
  }

  /**
   * Consolida métricas KPI de la lista de proveedores.
   */
  getKPIs(proveedores = []) {
    const total = proveedores.length
    const juridicas = proveedores.filter(p => p.tipo_persona === 'JURIDICA').length
    const naturales = proveedores.filter(p => p.tipo_persona === 'NATURAL').length
    const conRetencionIva = proveedores.filter(p => Number(p.iva_retention_rate || 0) > 0).length
    const conRetencionIslr = proveedores.filter(p => Boolean(p.islr_concept_id)).length
    const conRetencionMunicipal = proveedores.filter(p => Number(p.municipal_rate || 0) > 0).length

    const totalComprasPeriodo = proveedores.reduce((sum, p) => sum + (Number(p.total_compras) || 0), 0)
    const totalRetenidoPeriodo = proveedores.reduce((sum, p) => sum + (Number(p.total_retenido) || 0), 0)

    return {
      total,
      totalProveedores: total,
      juridicas,
      totalJuridicas: juridicas,
      naturales,
      totalNaturales: naturales,
      conRetencionIva,
      conRetencionIVA: conRetencionIva,
      conRetencionIslr,
      conRetencionISLR: conRetencionIslr,
      conRetencionMunicipal,
      totalComprasPeriodo,
      totalComprasHistorico: totalComprasPeriodo,
      totalRetenidoPeriodo
    }
  }

  /**
   * Obtiene catálogo de conceptos ISLR con fallback garantizado a Decreto 1808 (SENIAT).
   * @param {'JURIDICA'|'NATURAL'|'ALL'|null} tipoPersona
   * @returns {Promise<Array>}
   */
  async getISLRConcepts(tipoPersona = null) {
    try {
      if (!cachedConceptosIslr || cachedConceptosIslr.length === 0) {
        let remoteData = null
        try {
          const { data, error } = await supabase
            .from('conceptos_islr')
            .select('*')
          
          if (!error && Array.isArray(data) && data.length > 0) {
            remoteData = data.map(item => ({
              id: item.id,
              codigo: item.codigo || (item.nombre?.match(/^\[(\d+)\]/)?.[1] || null),
              nombre: item.nombre,
              porcentaje_base: Number(item.porcentaje_base || 100),
              porcentaje_retencion: Number(item.porcentaje_retencion || 0),
              sustraendo_ut: Number(item.sustraendo_ut || 0),
              monto_minimo_ut: Number(item.monto_minimo_ut || 0),
              aplica_persona: item.aplica_persona || (item.nombre.toLowerCase().includes('natural') ? 'NATURAL' : (item.nombre.toLowerCase().includes('jurídic') || item.nombre.toLowerCase().includes('juridic') ? 'JURIDICA' : 'AMBOS')),
              is_active: item.is_active !== false
            }))
          }
        } catch (dbErr) {
          console.warn('⚠️ [ProveedorService] Consulta a conceptos_islr remota falló, usando catálogo oficial SENIAT:', dbErr.message)
        }

        cachedConceptosIslr = (remoteData && remoteData.length > 0) ? remoteData : DEFAULT_SENIAT_ISLR_CONCEPTS
      }

      if (!tipoPersona || tipoPersona === 'ALL') return cachedConceptosIslr

      // Filtrado inteligente por tipo de persona
      const filtered = cachedConceptosIslr.filter(c => {
        const applies = !c.aplica_persona || c.aplica_persona === 'AMBOS' || c.aplica_persona === tipoPersona
        const name = (c.nombre || '').toLowerCase()
        if (tipoPersona === 'NATURAL') {
          return applies || name.includes('natural')
        } else if (tipoPersona === 'JURIDICA') {
          return applies || name.includes('jurídic') || name.includes('juridic')
        }
        return true
      })

      return filtered.length > 0 ? filtered : cachedConceptosIslr
    } catch (error) {
      console.error('❌ [ProveedorService] Error en getISLRConcepts:', error)
      return DEFAULT_SENIAT_ISLR_CONCEPTS
    }
  }

  /**
   * Obtiene catálogo de municipios con fallback local garantizado.
   * @returns {Promise<Array>}
   */
  async getMunicipios() {
    try {
      if (!cachedMunicipios || cachedMunicipios.length === 0) {
        let remoteData = null
        try {
          const { data, error } = await supabase
            .from('municipios')
            .select('id, nombre')
            .order('nombre', { ascending: true })

          if (!error && Array.isArray(data) && data.length > 0) {
            remoteData = data
          }
        } catch (dbErr) {
          console.warn('⚠️ [ProveedorService] Error consultando municipios remotos:', dbErr.message)
        }

        cachedMunicipios = (remoteData && remoteData.length > 0) ? remoteData : DEFAULT_VENEZUELA_MUNICIPIOS
      }
      return cachedMunicipios
    } catch (error) {
      console.error('❌ [ProveedorService] Error en getMunicipios:', error)
      return DEFAULT_VENEZUELA_MUNICIPIOS
    }
  }

  /**
   * Valida si un string cumple el formato UUID estándar.
   * @private
   */
  _isValidUUID(str) {
    if (!str || typeof str !== 'string') return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim())
  }

  /**
   * Sanitiza el payload para inserción/actualización segura.
   * @private
   */
  _sanitizePayload(payload, orgId, clientId = null) {
    const data = {
      organization_id: orgId,
      nombre: (payload.nombre || '').trim(),
      rif: (payload.rif || '').toUpperCase().trim(),
      tipo_persona: payload.tipo_persona === 'NATURAL' ? 'NATURAL' : 'JURIDICA',
      telefono: (payload.telefono || '').trim() || null,
      email: (payload.email || '').toLowerCase().trim() || null,
      direccion: (payload.direccion || '').trim() || null,
      contacto_nombre: (payload.contacto_nombre || '').trim() || null,
      iva_retention_rate: payload.iva_retention_rate !== undefined ? Number(payload.iva_retention_rate) : 75,
      islr_concept_id: this._isValidUUID(payload.islr_concept_id) ? payload.islr_concept_id : null,
      municipal_rate: payload.municipal_rate !== undefined ? Number(payload.municipal_rate) : 0,
      licencia_actividad_economica: (payload.licencia_actividad_economica || '').trim() || null,
      municipio_id: this._isValidUUID(payload.municipio_id) ? payload.municipio_id : null,
      is_active: payload.is_active !== false
    }

    if (clientId && this._isValidUUID(clientId)) {
      data.client_id = clientId
    }

    return data
  }

  /**
   * Dispara evento de cambio global para sincronizar componentes.
   * @private
   */
  _dispatchChangeEvent(action, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ad-proveedor-changed', {
        detail: { action, ...detail }
      }))
    }
  }
}

export default new ProveedorService()
