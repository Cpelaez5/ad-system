import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'

const normalizar = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/**
 * Busca el municipio (de la lista `municipios`) que corresponde a un valor guardado
 * en el negocio o el proveedor: puede ser el id (uuid) o el nombre ("Chacao",
 * "Chacao - Miranda"). Si hay varios con el mismo nombre se desempata con el estado;
 * si sigue sin ser único devuelve null (mejor no filtrar que filtrar mal).
 */
export function resolverMunicipio(valor, municipios = [], { estado } = {}) {
  if (!valor || !municipios.length) return null
  const porId = municipios.find((m) => m.id === valor)
  if (porId) return porId
  const buscado = normalizar(valor)
  const buscadoBase = buscado.split(' - ')[0]
  let candidatos = municipios.filter((m) => {
    const n = normalizar(m.nombre)
    return n === buscado || n.split(' - ')[0] === buscadoBase
  })
  if (candidatos.length > 1 && estado) {
    const e = normalizar(estado)
    candidatos = candidatos.filter((m) => normalizar(m.nombre).split(' - ')[1] === e)
  }
  return candidatos.length === 1 ? candidatos[0] : null
}

/**
 * Concepto cuyo código coincide con la licencia de actividad económica del proveedor.
 * Devuelve null si no hay licencia o no hay coincidencia exacta (sin distinguir
 * mayúsculas ni espacios).
 */
export function sugerirConceptoPorLicencia(conceptos = [], licencia) {
  const lic = normalizar(licencia)
  if (!lic) return null
  return conceptos.find((c) => normalizar(c.codigo) === lic) || null
}

class MunicipalConceptsService {
  constructor() {
    this._municipios = null
  }

  /** Los 24 municipios (id, nombre), con caché en memoria. */
  async getMunicipios() {
    try {
      if (this._municipios) return { success: true, data: this._municipios }
      const { data, error } = await supabase
        .from('municipios')
        .select('id, nombre')
        .order('nombre', { ascending: true })
      if (error) throw error
      this._municipios = data || []
      return { success: true, data: this._municipios }
    } catch (error) {
      console.error('Error fetching municipios:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  /** Activos del catálogo común de AD System y de mi despacho. */
  async getConcepts({ municipioId } = {}) {
    try {
      const organizationId = getCurrentOrganizationId()
      const filtroOrg = organizationId
        ? `organization_id.is.null,organization_id.eq.${organizationId}`
        : 'organization_id.is.null'

      const { data, error } = await supabase
        .from('conceptos_municipales')
        .select('*')
        .or(filtroOrg)
        .eq('status', 'ACTIVO')
        .order('codigo', { ascending: true })

      if (error) throw error

      let lista = (data || []).map((c) => ({
        ...c,
        origen: c.organization_id ? 'despacho' : 'comun'
      }))

      if (municipioId) {
        lista = lista
          .filter((c) => c.municipio_id === municipioId || !c.municipio_id)
          .sort((a, b) => {
            const pa = a.municipio_id ? 0 : 1
            const pb = b.municipio_id ? 0 : 1
            return pa - pb || String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true })
          })
      }
      return { success: true, data: lista }
    } catch (error) {
      console.error('Error fetching municipal concepts:', error)
      return { success: false, error: error.message }
    }
  }

  _campos(c) {
    return {
      codigo: c.codigo,
      descripcion: c.descripcion,
      porcentaje: parseFloat(c.porcentaje),
      municipio_id: c.municipio_id || null,
      ordenanza: (c.ordenanza || '').trim() || null,
      vigente_desde: c.vigente_desde || null
    }
  }

  /** `comun: true` (solo super admin) crea en el catálogo de AD System (organization_id null). */
  async createConcept(conceptData, { comun = false } = {}) {
    try {
      let organizationId = null
      if (!comun) {
        organizationId = getCurrentOrganizationId()
        if (!organizationId) throw new Error('No hay organization_id disponible')
      }

      const payload = { organization_id: organizationId, ...this._campos(conceptData), status: 'ACTIVO' }

      const { data, error } = await supabase
        .from('conceptos_municipales')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error creating municipal concept:', error)
      return { success: false, error: error.message }
    }
  }

  _porDueno(query, comun) {
    if (comun) return query.is('organization_id', null)
    const organizationId = getCurrentOrganizationId()
    if (!organizationId) throw new Error('No hay organization_id disponible')
    return query.eq('organization_id', organizationId)
  }

  async updateConcept(id, conceptData, { comun = false } = {}) {
    try {
      const payload = { ...this._campos(conceptData), updated_at: new Date().toISOString() }
      const base = supabase.from('conceptos_municipales').update(payload).eq('id', id)
      const { data, error } = await this._porDueno(base, comun).select().single()
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error updating municipal concept:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteConcept(id, { comun = false } = {}) {
    try {
      // Soft delete
      const base = supabase
        .from('conceptos_municipales')
        .update({ status: 'INACTIVO', updated_at: new Date().toISOString() })
        .eq('id', id)
      const { data, error } = await this._porDueno(base, comun).select().single()
      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error deleting municipal concept:', error)
      return { success: false, error: error.message }
    }
  }
}

export const municipalConceptsService = new MunicipalConceptsService()
export default municipalConceptsService
