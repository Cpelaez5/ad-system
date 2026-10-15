/**
 * Pantalla Usuarios (admin y super_admin). Servicios simulados: ningún test
 * toca la BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

const ROLES = {
  super_admin: { name: 'Super Administrador', description: 'Todo', permissions: ['*'], icon: 'mdi-crown' },
  admin: { name: 'Contador Administrador', description: 'Administra', permissions: ['users.create', 'users.update'], icon: 'mdi-shield-crown' },
  cliente: { name: 'Cliente', description: 'Solo lo suyo', permissions: ['invoices.read'], icon: 'mdi-account' },
}

const servicio = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getRoles: vi.fn(),
  getCurrentUser: vi.fn(),
  getRolePermissions: vi.fn(() => ['invoices.read']),
  hasPermission: vi.fn(),
  updateUser: vi.fn(),
  inviteUser: vi.fn(),
  resendInvitation: vi.fn(),
  deleteUserCascade: vi.fn(),
}))
vi.mock('@/services/userService.js', () => ({ default: servicio }))
vi.mock('@/services/plansService.js', () => ({ default: { getPlans: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'pro', name: 'Pro', price_monthly: 20 }] }) } }))

const supa = vi.hoisted(() => {
  const eq = vi.fn()
  const select = vi.fn()
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { eq, select, update, from }
})
vi.mock('@/lib/supabaseClient', () => ({ supabase: { from: supa.from } }))

const mostrar = vi.hoisted(() => vi.fn())
vi.mock('@/store/notificacionStore', () => ({ useNotificacionStore: () => ({ mostrar }) }))

import Usuarios from '../Usuarios.vue'
import { filtrarUsuarios, iniciales, nombrePlan, rolesDisponibles, contarPorRol } from '@/components/admin/usuarios/usuariosUtil'

const stubs = {
  DialogoAdaptable: {
    props: ['modelValue', 'titulo'],
    template: '<div v-if="modelValue" class="dialogo"><h2>{{ titulo }}</h2><slot /><slot name="acciones" /></div>',
  },
  VMenu: { template: '<div class="menu"><slot name="activator" :props="{}" /><slot /></div>' },
}
const montar = () => mount(Usuarios, { global: { plugins: [createVuetify({ components, directives })], stubs } })

const ana = { id: 'u1', username: 'ana', email: 'ana@x.com', firstName: 'Ana', lastName: 'Pérez', role: 'cliente', isActive: true, plan_id: 'pro', trial_end: null, lastLogin: '2026-10-10T12:00:00Z', organization: { name: 'Panadería Ana' } }
const beto = { id: 'u2', username: 'beto', email: 'beto@x.com', firstName: 'Beto', lastName: 'Ruiz', role: 'admin', isActive: false, plan_id: 'free_trial', trial_end: null, lastLogin: null }
const root = { id: 'u3', username: 'root', email: 'root@x.com', firstName: 'Root', lastName: 'Admin', role: 'super_admin', isActive: true, plan_id: null }

function sesion(role) {
  localStorage.setItem('currentUser', JSON.stringify({ id: 'yo', role }))
  servicio.hasPermission.mockImplementation((r, p) => (r === 'super_admin' ? true : r === 'admin' && ['users.create', 'users.update'].includes(p)))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  servicio.getUsers.mockResolvedValue([ana, beto, root])
  servicio.getRoles.mockReturnValue(ROLES)
  servicio.getRolePermissions.mockReturnValue(['invoices.read'])
  supa.eq.mockResolvedValue({ data: [], error: null })
  sesion('super_admin')
})

describe('usuariosUtil', () => {
  it('iniciales, plan, roles y filtros', () => {
    expect(iniciales(ana)).toBe('AP')
    expect(iniciales({ email: 'zed@x.com' })).toBe('ZE')
    expect(nombrePlan('free_trial')).toBe('Prueba gratuita')
    expect(nombrePlan('basic')).toBe('Básico')
    expect(nombrePlan('pro', [{ id: 'pro', name: 'Pro' }])).toBe('Pro')
    expect(Object.keys(rolesDisponibles(ROLES, false))).not.toContain('super_admin')
    expect(Object.keys(rolesDisponibles(ROLES, true))).toContain('super_admin')
    expect(contarPorRol([ana, beto, root])).toEqual({ cliente: 1, admin: 1, super_admin: 1 })
    const todos = [ana, beto, root]
    expect(filtrarUsuarios(todos, { texto: 'PÉREZ' })).toEqual([ana])
    expect(filtrarUsuarios(todos, { texto: 'beto@' })).toEqual([beto])
    expect(filtrarUsuarios(todos, { rol: 'admin' })).toEqual([beto])
    expect(filtrarUsuarios(todos, { estado: 'pendientes' })).toEqual([beto])
    expect(filtrarUsuarios(todos, { estado: 'activos' })).toEqual([ana, root])
  })
})

describe('Usuarios', () => {
  it('lista las personas con avatar de iniciales, rol y estado', async () => {
    const w = montar()
    await flushPromises()
    const filas = w.findAll('[data-testid="fila-usuario"]')
    expect(filas).toHaveLength(3)
    expect(filas[0].text()).toContain('Ana Pérez')
    expect(filas[0].text()).toContain('AP')
    expect(filas[0].text()).toContain('Cliente')
    expect(filas[0].text()).toContain('Activo')
    expect(filas[1].text()).toContain('Invitación pendiente')
  })

  it('el panel avisa de invitaciones pendientes y filtra al pulsarlo', async () => {
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('1 persona no ha activado su cuenta')
    await w.get('.panel-paso__boton').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="fila-usuario"]')).toHaveLength(1)
    expect(w.text()).toContain('Beto Ruiz')
  })

  it('filtra por rol con chips y por búsqueda, y permite quitar filtros', async () => {
    const w = montar()
    await flushPromises()
    const chipAdmin = w.findAll('.v-chip').find((c) => c.text().startsWith('Contador Administrador'))
    expect(chipAdmin.text()).toContain('· 1')
    await chipAdmin.trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="fila-usuario"]')).toHaveLength(1)
    await w.get('[data-testid="buscar"] input').setValue('zzz')
    await flushPromises()
    expect(w.get('[data-testid="sin-resultados"]').text()).toContain('Nadie coincide')
    await w.get('[data-testid="sin-resultados"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="fila-usuario"]')).toHaveLength(3)
  })

  it('invitar: abre el diálogo y llama a inviteUser con los datos', async () => {
    servicio.inviteUser.mockResolvedValue({ success: true })
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="invitar"]').trigger('click')
    expect(w.get('.dialogo h2').text()).toBe('Invitar usuario')
    await w.get('[data-testid="campo-correo"] input').setValue('nuevo@x.com')
    await w.get('[data-testid="campo-nombre"] input').setValue('Nuevo')
    await w.get('[data-testid="campo-apellido"] input').setValue('Usuario')
    await w.findAll('[data-testid="campo-rol"] input[type="radio"]')[1].setValue(true)
    await w.get('[data-testid="guardar"]').trigger('click')
    await w.get('#form-usuario').trigger('submit')
    await flushPromises()
    expect(servicio.inviteUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'nuevo@x.com', firstName: 'Nuevo', lastName: 'Usuario', role: 'admin' }))
    expect(mostrar).toHaveBeenCalledWith('Invitación enviada a nuevo@x.com', 'success')
  })

  it('el admin no puede asignar el rol super_admin ni borrar en cascada', async () => {
    sesion('admin')
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="invitar"]').trigger('click')
    expect(w.findAll('[data-testid="campo-rol"] input[type="radio"]')).toHaveLength(2)
    expect(w.find('[data-testid="menu-borrar"]').exists()).toBe(false)
  })

  it('un usuario sin permisos de edición no ve invitar ni editar', async () => {
    sesion('cliente')
    const w = montar()
    await flushPromises()
    expect(w.find('[data-testid="invitar"]').exists()).toBe(false)
    expect(w.find('[data-testid="menu-editar"]').exists()).toBe(false)
    expect(w.find('[data-testid="menu-plan"]').exists()).toBe(false)
  })

  it('editar rol y estado llama a updateUser', async () => {
    servicio.updateUser.mockResolvedValue({ success: true })
    const w = montar()
    await flushPromises()
    await w.findAll('[data-testid="menu-editar"]')[0].trigger('click')
    expect(w.get('.dialogo h2').text()).toBe('Editar usuario')
    await w.get('#form-usuario').trigger('submit')
    await flushPromises()
    expect(servicio.updateUser).toHaveBeenCalledWith('u1', expect.objectContaining({ role: 'cliente', isActive: true }))
    expect(mostrar).toHaveBeenCalledWith('Usuario actualizado', 'success')
  })

  it('reenviar invitación solo en pendientes', async () => {
    servicio.resendInvitation.mockResolvedValue({ success: true })
    const w = montar()
    await flushPromises()
    const botones = w.findAll('[data-testid="reenviar"]')
    expect(botones).toHaveLength(1)
    await botones[0].trigger('click')
    await flushPromises()
    expect(servicio.resendInvitation).toHaveBeenCalledWith({ email: 'beto@x.com', role: 'admin', firstName: 'Beto', lastName: 'Ruiz' })
  })

  it('plan y prueba actualiza la tabla users', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('[data-testid="menu-plan"]')[0].trigger('click')
    await w.get('[data-testid="guardar-plan"]').trigger('click')
    await flushPromises()
    expect(supa.from).toHaveBeenCalledWith('users')
    expect(supa.update).toHaveBeenCalledWith({ plan_id: 'pro', trial_end: null })
    expect(supa.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('borrar en cascada exige escribir el correo y solo existe para el super admin', async () => {
    servicio.deleteUserCascade.mockResolvedValue({ success: true, message: 'Listo' })
    const w = montar()
    await flushPromises()
    const borrar = w.findAll('[data-testid="menu-borrar"]')
    expect(borrar).toHaveLength(2) // no aparece para el super_admin
    await borrar[0].trigger('click')
    const boton = w.get('[data-testid="borrar"]')
    expect(boton.attributes('disabled')).toBeDefined()
    await boton.trigger('click')
    expect(servicio.deleteUserCascade).not.toHaveBeenCalled()
    await w.get('[data-testid="confirmar-correo"] input').setValue('otro@x.com')
    expect(w.get('[data-testid="borrar"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="confirmar-correo"] input').setValue(' ANA@x.com ')
    expect(w.get('[data-testid="borrar"]').attributes('disabled')).toBeUndefined()
    await w.get('[data-testid="borrar"]').trigger('click')
    await flushPromises()
    expect(servicio.deleteUserCascade).toHaveBeenCalledWith('u1')
    expect(mostrar).toHaveBeenCalledWith('Listo', 'success')
  })

  it('ver detalles muestra permisos del rol', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('[data-testid="menu-ver"]')[0].trigger('click')
    expect(w.get('.dialogo h2').text()).toBe('Ana Pérez')
    expect(w.get('[data-testid="permisos"]').text()).toContain('Invoices Read')
    expect(w.text()).toContain('Panadería Ana')
  })

  it('muestra error con Reintentar si la carga falla', async () => {
    servicio.getUsers.mockRejectedValueOnce(new Error('red'))
    const w = montar()
    await flushPromises()
    expect(w.find('[data-testid="error-carga"]').exists()).toBe(true)
    await w.get('[data-testid="error-carga"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="fila-usuario"]')).toHaveLength(3)
  })

  it('estado vacío invita a la primera persona', async () => {
    servicio.getUsers.mockResolvedValue([])
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('Todavía no hay usuarios')
  })
})
