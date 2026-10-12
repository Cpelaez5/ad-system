import { describe, it, expect, vi, beforeEach } from 'vitest'
import userService from '@/services/userService'
import { supabase } from '@/lib/supabaseClient'

// Mock de Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}))

describe('UserService - Invitación de Usuarios (inviteUser / resendInvitation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restaurar window.location.origin para tests
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      writable: true
    })
  })

  it('envía la invitación correctamente con los parámetros esperados', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true, message: 'Invitación enviada exitosamente' },
      error: null
    })

    const result = await userService.inviteUser({
      email: 'nuevo@adsystem.com',
      role: 'super_admin',
      firstName: 'Carlos',
      lastName: 'Pérez'
    })

    // Verificar que se llamó a la Edge Function correcta
    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-invite-user', {
      body: {
        email: 'nuevo@adsystem.com',
        role: 'super_admin',
        first_name: 'Carlos',
        last_name: 'Pérez',
        redirect_url: 'http://localhost:5173/auth/set-password'
      }
    })

    expect(result.success).toBe(true)
    expect(result.data.message).toContain('exitosamente')
  })

  it('construye redirect_url correctamente usando window.location.origin', async () => {
    // Simular producción
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://adsystemapp.com' },
      writable: true
    })

    supabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true },
      error: null
    })

    await userService.inviteUser({
      email: 'test@example.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User'
    })

    const callArgs = supabase.functions.invoke.mock.calls[0][1]
    expect(callArgs.body.redirect_url).toBe('https://adsystemapp.com/auth/set-password')
  })

  it('retorna error estructurado cuando la Edge Function rechaza con 403 (no es super_admin)', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: {
        code: 'FORBIDDEN',
        message: 'Requiere rol super_admin para invitar usuarios'
      },
      error: null
    })

    const result = await userService.inviteUser({
      email: 'nuevo@test.com',
      role: 'super_admin',
      firstName: 'Test',
      lastName: 'User'
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('super_admin')
  })

  it('retorna error estructurado cuando la Edge Function rechaza con 400 (campos faltantes)', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: {
        code: 'MISSING_FIELDS',
        message: 'Campos obligatorios: email, role, first_name, last_name, redirect_url'
      },
      error: null
    })

    const result = await userService.inviteUser({
      email: '',
      role: '',
      firstName: '',
      lastName: ''
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('obligatorios')
  })

  it('retorna error estructurado cuando la Edge Function rechaza redirect_url no permitida', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: {
        code: 'INVALID_REDIRECT',
        message: 'Origen de redirección no permitido: https://malicious.com'
      },
      error: null
    })

    const result = await userService.inviteUser({
      email: 'test@test.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User'
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('no permitido')
  })

  it('maneja errores de red / invocación correctamente', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch' }
    })

    const result = await userService.inviteUser({
      email: 'test@test.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User'
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to fetch')
  })

  it('maneja excepciones inesperadas sin romper', async () => {
    supabase.functions.invoke.mockRejectedValueOnce(new Error('Network error'))

    const result = await userService.inviteUser({
      email: 'test@test.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User'
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('Network error')
  })

  it('resendInvitation delega correctamente a inviteUser (idempotencia)', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true, message: 'Invitación enviada exitosamente' },
      error: null
    })

    const payload = {
      email: 'reenvio@test.com',
      role: 'contador',
      firstName: 'María',
      lastName: 'López'
    }

    const result = await userService.resendInvitation(payload)

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1)
    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-invite-user', {
      body: {
        email: 'reenvio@test.com',
        role: 'contador',
        first_name: 'María',
        last_name: 'López',
        redirect_url: 'http://localhost:5173/auth/set-password'
      }
    })
    expect(result.success).toBe(true)
  })

  it('maneja status 207 (usuario creado pero correo falló) como éxito parcial', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: {
        code: 'EMAIL_SEND_ERROR',
        message: 'El usuario fue registrado pero el correo de invitación no se pudo enviar.'
      },
      error: null
    })

    const result = await userService.inviteUser({
      email: 'test@test.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User'
    })

    // Aunque el usuario se creó, el servicio lo reporta como falla
    // ya que el correo no se envió y el admin debe reintentar
    expect(result.success).toBe(false)
    expect(result.message).toContain('correo de invitación no se pudo enviar')
  })
})
