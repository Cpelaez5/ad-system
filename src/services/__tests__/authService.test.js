/**
 * Tests unitarios del módulo de Autenticación (userService.js)
 *
 * Cubre:
 * - Login (Manejo de credenciales, normalización de email)
 * - Manejo de sesión y fallback de perfil de usuario
 * - Autocreación de perfil en bases de datos con RLS (multi-tenant)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Mocks globales
// ─────────────────────────────────────────────────────────────
vi.mock('@/lib/supabaseClient', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
  }
  
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn()
      },
      from: vi.fn(() => chain)
    }
  }
})

vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: vi.fn(),
  setCurrentOrganizationId: vi.fn(),
  clearCurrentOrganizationId: vi.fn(),
  queryWithTenant: vi.fn(),
  insertWithTenant: vi.fn(),
  updateWithTenant: vi.fn(),
  deleteWithTenant: vi.fn()
}))

vi.mock('@/services/user-settings-service.js', () => ({
  default: {
    loadSettings: vi.fn()
  }
}))

vi.mock('@/services/seal-service.js', () => ({
  default: {
    syncSealToLocalStorage: vi.fn()
  }
}))

import { supabase } from '@/lib/supabaseClient'
import { insertWithTenant } from '@/utils/tenantHelpers'
import userService from '@/services/userService'

describe('UserService - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Login
  // ═════════════════════════════════════════════════════════════
  describe('login', () => {
    it('devuelve error si faltan credenciales', async () => {
      const res = await userService.login({})
      expect(res.success).toBe(false)
      expect(res.message).toBe('Email/usuario y contraseña son requeridos')
    })

    it('normaliza emails que no tienen dominio agregando @sistema.local', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid credentials' } 
      })

      await userService.login({ email: 'admin', password: '123' })

      // Verifica que signInWithPassword fue llamado con email normalizado
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@sistema.local',
        password: '123'
      })
    })

    it('retorna error estructurado si supabase.auth.signInWithPassword falla', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({ 
        data: null, 
        error: { message: 'Contraseña incorrecta' } 
      })

      const res = await userService.login({ email: 'test@mail.com', password: 'wrong' })
      expect(res.success).toBe(false)
      expect(res.message).toBe('Contraseña incorrecta')
    })

    it('Si auth tiene éxito pero el perfil no existe, auto-crea el perfil vía insertWithTenant', async () => {
      // 1. Mock de auth exitoso
      supabase.auth.signInWithPassword.mockResolvedValue({ 
        data: { 
          user: { 
            id: 'u-1', 
            email: 'test@mail.com', 
            user_metadata: { role: 'admin', first_name: 'John' } 
          } 
        }, 
        error: null 
      })

      // 2. Mock de obtener perfil -> falla (retorna null) para simular que no existe
      // Supabase chain está mockeado globalmente. Forzamos maybeSingle a null.
      const fromMock = supabase.from()
      fromMock.maybeSingle.mockResolvedValue({ data: null, error: null })

      // 3. Mock de inserción del perfil con tenant helpers
      insertWithTenant.mockResolvedValue({
        data: [{ id: 'u-1', email: 'test@mail.com', role: 'admin' }],
        error: null
      })

      // Reducimos delay interno para que el test no se demore 3x500ms
      // El reintento de "obtener perfil" esperará 500ms * 3 veces en el código real (1.5 segundos).
      // Vitest ejecutará esto en tiempo real. 
      const start = Date.now()
      const res = await userService.login({ email: 'test@mail.com', password: 'password' })
      
      expect(res.success).toBe(true)
      expect(insertWithTenant).toHaveBeenCalled() // Se intentó crear el perfil
      
      const insertCall = insertWithTenant.mock.calls[0]
      expect(insertCall[0]).toBe('users')
      expect(insertCall[1].id).toBe('u-1')
      expect(insertCall[1].first_name).toBe('John')
      expect(insertCall[1].role).toBe('admin')
    }, 10000) // Timeout aumentado porque hay sleeps de 500ms x 3 = 1.5s en el while loop
  })
})
