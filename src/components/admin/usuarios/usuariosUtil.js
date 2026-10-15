/**
 * Utilidades puras de la pantalla Usuarios (sin Vue ni servicios): iniciales,
 * nombre, filtros, conteos y textos de plan/estado.
 */
import { formatFechaLocal } from '@/utils/fechas'

export function nombreCompleto(u) {
  return [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.username || u?.email || 'Sin nombre'
}

export function iniciales(u) {
  const f = (u?.firstName || '').trim()[0] || ''
  const l = (u?.lastName || '').trim()[0] || ''
  const base = (f + l) || (u?.username || u?.email || '?').trim().slice(0, 2)
  return base.toUpperCase()
}

/** Estado en palabras. isActive=false significa que aún no creó su contraseña. */
export function textoEstado(u) {
  return u?.isActive ? 'Activo' : 'Invitación pendiente'
}

export function fechaCorta(valor, vacio = 'Nunca') {
  return formatFechaLocal(valor, { day: '2-digit', month: 'short', year: 'numeric' }) || vacio
}

export function fechaHora(valor, vacio = 'Nunca') {
  return formatFechaLocal(valor, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || vacio
}

const PLANES_ANTIGUOS = { basic: 'Básico', pro: 'Profesional', enterprise: 'Empresarial' }

export function nombrePlan(planId, planes = []) {
  if (planId === 'free_trial') return 'Prueba gratuita'
  const plan = planes.find((p) => p.id === planId)
  if (plan) return plan.name
  return PLANES_ANTIGUOS[planId] || planId || 'Sin plan'
}

/** Quita super_admin de los roles si quien mira no es super admin. */
export function rolesDisponibles(roles, esSuperAdmin) {
  if (esSuperAdmin) return roles
  const copia = { ...roles }
  delete copia.super_admin
  return copia
}

/** Filtra por texto, rol ('todos' = sin filtro) y estado ('todos' | 'activos' | 'pendientes'). */
export function filtrarUsuarios(usuarios, { texto = '', rol = 'todos', estado = 'todos' } = {}) {
  const q = texto.trim().toLowerCase()
  return usuarios.filter((u) => {
    if (rol !== 'todos' && u.role !== rol) return false
    if (estado === 'activos' && !u.isActive) return false
    if (estado === 'pendientes' && u.isActive) return false
    if (!q) return true
    return [u.username, u.firstName, u.lastName, u.email].some((c) => (c || '').toLowerCase().includes(q))
  })
}

export function contarPorRol(usuarios) {
  const r = {}
  for (const u of usuarios) r[u.role] = (r[u.role] || 0) + 1
  return r
}

export function formatearPermiso(permiso) {
  return permiso.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}
