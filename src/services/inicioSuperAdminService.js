/**
 * inicioSuperAdminService.js — lecturas (solo SELECT) del Inicio del super
 * admin. Sin datos personales: de los usuarios solo se piden plan, fin de
 * prueba y fecha de alta. Devuelve { data, error }; no lanza.
 */
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'
import { contarPorVerificar, contarErroresIa7Dias, filasTasas } from '@/services/superAdminService'
import { construirTablaTasas, huecosDeTasas } from '@/utils/tasasAdmin.js'

/** Empresas = usuarios con rol `cliente`. */
async function empresas() {
  const { data, error } = await supabase.from('users').select('plan_id, trial_end, created_at').eq('role', 'cliente').limit(5000)
  if (error) throw error
  return data || []
}

/** Facturas pagadas desde `desde` (ISO). */
async function facturasPagadas(desde) {
  const { data, error } = await supabase.from('system_invoices').select('amount, currency, paid_at').eq('status', 'paid').gte('paid_at', desde).limit(5000)
  if (error) throw error
  return data || []
}

async function contarPagosPendientes() {
  const { count, error } = await supabase.from('payment_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending_review')
  if (error) throw error
  return count || 0
}

const seguro = async (fn, porDefecto, errores, mensaje) => {
  try { return await fn() } catch (err) {
    logger.warn('[inicioSuperAdminService]', mensaje, err?.message)
    errores.push(mensaje)
    return porDefecto
  }
}

/** Todo lo que necesita el Inicio, en paralelo; si una parte falla, el resto se muestra. */
export async function cargarInicio(ahora = new Date()) {
  const errores = []
  const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString()
  const [usuarios, facturas, pagosPendientes, verificar, ia, tasas] = await Promise.all([
    seguro(empresas, [], errores, 'No pudimos cargar las empresas.'),
    seguro(() => facturasPagadas(desde), [], errores, 'No pudimos cargar los ingresos.'),
    seguro(contarPagosPendientes, 0, errores, 'No pudimos contar los pagos por aprobar.'),
    contarPorVerificar(),
    contarErroresIa7Dias(),
    filasTasas(),
  ])
  for (const r of [verificar, ia, tasas]) if (r.error) errores.push(r.error)
  return {
    data: {
      usuarios,
      facturasPagadas: facturas,
      pagosPendientes,
      porVerificar: verificar.data.proveedores + verificar.data.productos,
      erroresIa: ia.data,
      diasSinTasa: huecosDeTasas(construirTablaTasas(tasas.data)).length,
    },
    error: errores.length ? errores.join(' ') : null,
  }
}
