import { describe, it, expect } from 'vitest'
import { homeDeRol, rutaSegura, resolverAcceso } from '@/router/accesoRutas'

describe('homeDeRol', () => {
  it('devuelve el inicio de cada rol', () => {
    expect(homeDeRol('cliente')).toBe('/cliente/inicio')
    expect(homeDeRol('super_admin')).toBe('/admin/inicio')
    expect(homeDeRol('admin')).toBe('/dashboard')
    expect(homeDeRol('contador')).toBe('/dashboard')
  })
  it('sin rol válido va al login', () => {
    expect(homeDeRol(undefined)).toBe('/login')
    expect(homeDeRol('hacker')).toBe('/login')
  })
})

describe('rutaSegura', () => {
  it('acepta rutas internas con query y hash', () => {
    expect(rutaSegura('/cliente/facturacion?tab=ventas')).toBe('/cliente/facturacion?tab=ventas')
    expect(rutaSegura('/dashboard#x')).toBe('/dashboard#x')
  })
  it('rechaza destinos externos o raros', () => {
    expect(rutaSegura('//evil.com')).toBeNull()
    expect(rutaSegura('/\\evil.com')).toBeNull()
    expect(rutaSegura('https://evil.com')).toBeNull()
    expect(rutaSegura('javascript:alert(1)')).toBeNull()
    expect(rutaSegura('dashboard')).toBeNull()
    expect(rutaSegura('')).toBeNull()
    expect(rutaSegura(undefined)).toBeNull()
    expect(rutaSegura(null)).toBeNull()
    expect(rutaSegura(123)).toBeNull()
    expect(rutaSegura('/a\nb')).toBeNull()
  })
  it('evita bucles hacia el login', () => {
    expect(rutaSegura('/login')).toBeNull()
    expect(rutaSegura('/login?redirect=/x')).toBeNull()
  })
  it('toma el primer valor si viene repetido', () => {
    expect(rutaSegura(['/dashboard', '//evil.com'])).toBe('/dashboard')
  })
})

describe('resolverAcceso', () => {
  const soloCliente = { fullPath: '/cliente/inicio', meta: { requiresAuth: true, roles: ['cliente'] } }
  const publica = { fullPath: '/pricing', meta: { requiresAuth: false } }
  const sinRoles = { fullPath: '/settings', meta: { requiresAuth: true } }

  it('las rutas públicas siempre pasan', () => {
    expect(resolverAcceso(publica, null).accion).toBe('permitir')
  })
  it('sin sesión en ruta privada va al login recordando el destino', () => {
    expect(resolverAcceso(soloCliente, null)).toEqual({ accion: 'login', redirect: '/cliente/inicio' })
  })
  it('rol no reconocido va al login', () => {
    expect(resolverAcceso(soloCliente, { role: 'otro' }).accion).toBe('login')
  })
  it('rol correcto pasa', () => {
    expect(resolverAcceso(soloCliente, { role: 'cliente' }).accion).toBe('permitir')
  })
  it('rol de otro tipo recibe 403', () => {
    expect(resolverAcceso(soloCliente, { role: 'contador' }).accion).toBe('prohibido')
    expect(resolverAcceso({ meta: { requiresAuth: true, roles: ['super_admin'] } }, { role: 'admin' }).accion).toBe('prohibido')
  })
  it('ruta privada sin lista de roles deja pasar a cualquier rol válido', () => {
    expect(resolverAcceso(sinRoles, { role: 'cliente' }).accion).toBe('permitir')
  })
})
