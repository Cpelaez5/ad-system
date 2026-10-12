import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SetPassword from '@/views/auth/SetPassword.vue'

/**
 * Tests para SetPassword.vue
 * 
 * Verifica:
 * 1. Estado inicial (cargandoVerificacion)
 * 2. Transición a formulario activo tras onAuthStateChange
 * 3. Activación del banner de expiración tras timeout sin sesión
 * 4. Validación de fortaleza de contraseña
 * 5. Que la actualización de clave NO escribe en localStorage
 * 6. Cleanup de subscriptions en beforeUnmount
 */

// Mock de supabase para dynamic import
const mockUnsubscribe = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUpdateUser = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      updateUser: (...args) => mockUpdateUser(...args)
    },
    from: () => ({
      update: (data) => {
        mockUpdate(data)
        return {
          eq: (field, value) => {
            mockEq(field, value)
            return Promise.resolve({ error: null })
          }
        }
      }
    })
  }
}))

describe('SetPassword.vue — Lógica de Activación de Cuenta por Invitación', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    })
    mockUpdateUser.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- ESTADO INICIAL ---

  it('inicia en estado de cargando verificación (cargandoVerificacion = true)', () => {
    const data = SetPassword.data()
    expect(data.cargandoVerificacion).toBe(true)
    expect(data.linkExpired).toBe(false)
    expect(data.sessionUser).toBeNull()
    expect(data.password).toBe('')
    expect(data.confirmPassword).toBe('')
  })

  // --- TIMEOUT DE EXPIRACIÓN ---

  it('activa linkExpired = true tras 3 segundos sin sesión detectada', async () => {
    const vm = {
      ...SetPassword.data(),
      $router: { push: vi.fn() }
    }

    // Simular mounted()
    await SetPassword.mounted.call(vm)

    // Antes de los 3 segundos
    expect(vm.linkExpired).toBe(false)
    expect(vm.cargandoVerificacion).toBe(true)

    // Avanzar 3 segundos
    vi.advanceTimersByTime(3000)

    // Ahora debe mostrar expirado
    expect(vm.linkExpired).toBe(true)
    expect(vm.cargandoVerificacion).toBe(false)
  })

  // --- DETECCIÓN DE SESIÓN VIA onAuthStateChange ---

  it('muestra el formulario cuando onAuthStateChange detecta sesión válida', async () => {
    let capturedCallback = null
    mockOnAuthStateChange.mockImplementation((callback) => {
      capturedCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const vm = {
      ...SetPassword.data(),
      $router: { push: vi.fn() }
    }

    await SetPassword.mounted.call(vm)

    // Simular que Supabase detecta la sesión
    const mockSession = {
      user: {
        id: 'user-abc-123',
        email: 'nuevoadmin@adsystem.com',
        user_metadata: {
          first_name: 'Carlos',
          last_name: 'Pérez',
          role: 'super_admin'
        }
      }
    }

    await capturedCallback('SIGNED_IN', mockSession)

    expect(vm.sessionUser).toEqual(mockSession.user)
    expect(vm.userName).toBe('Carlos')
    expect(vm.userRole).toBe('super_admin')
    expect(vm.linkExpired).toBe(false)
    expect(vm.cargandoVerificacion).toBe(false)
  })

  it('cancela el timeout de expiración cuando se detecta sesión antes de los 3s', async () => {
    let capturedCallback = null
    mockOnAuthStateChange.mockImplementation((callback) => {
      capturedCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const vm = {
      ...SetPassword.data(),
      $router: { push: vi.fn() }
    }

    await SetPassword.mounted.call(vm)

    // Sesión detectada a los 1.5s
    vi.advanceTimersByTime(1500)
    await capturedCallback('SIGNED_IN', {
      user: {
        id: 'u1',
        email: 'test@test.com',
        user_metadata: { first_name: 'Test', role: 'admin' }
      }
    })

    // Avanzar más allá de los 3s — NO debe activar linkExpired
    vi.advanceTimersByTime(5000)
    expect(vm.linkExpired).toBe(false)
    expect(vm.sessionUser).not.toBeNull()
  })

  it('usa email como fallback para userName si first_name no existe en metadata', async () => {
    let capturedCallback = null
    mockOnAuthStateChange.mockImplementation((callback) => {
      capturedCallback = callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const vm = {
      ...SetPassword.data(),
      $router: { push: vi.fn() }
    }

    await SetPassword.mounted.call(vm)

    await capturedCallback('SIGNED_IN', {
      user: {
        id: 'u2',
        email: 'usuario@empresa.com',
        user_metadata: {} // Sin first_name
      }
    })

    expect(vm.userName).toBe('usuario')
  })

  // --- COMPUTED: VALIDACIÓN DE CONTRASEÑA ---

  it('passwordError retorna string vacío cuando las contraseñas coinciden', () => {
    const vm = { password: 'mipassword123', confirmPassword: 'mipassword123' }
    const result = SetPassword.computed.passwordError.call(vm)
    expect(result).toBe('')
  })

  it('passwordError retorna mensaje cuando las contraseñas no coinciden', () => {
    const vm = { password: 'mipassword123', confirmPassword: 'otra' }
    const result = SetPassword.computed.passwordError.call(vm)
    expect(result).toBe('Las contraseñas no coinciden')
  })

  it('isPasswordValid requiere mínimo 8 caracteres Y coincidencia', () => {
    // Muy corta
    expect(SetPassword.computed.isPasswordValid.call({ password: '1234567', confirmPassword: '1234567' })).toBe(false)
    // No coincide
    expect(SetPassword.computed.isPasswordValid.call({ password: '12345678', confirmPassword: '87654321' })).toBe(false)
    // Válida
    expect(SetPassword.computed.isPasswordValid.call({ password: '12345678', confirmPassword: '12345678' })).toBe(true)
  })

  // --- COMPUTED: FORTALEZA DE CONTRASEÑA ---

  it('passwordStrength calcula score correcto según complejidad', () => {
    // Sin contraseña
    expect(SetPassword.computed.passwordStrength.call({ password: '' }).level).toBe(0)
    // Solo minúsculas largas (1 punto: length >= 8)
    expect(SetPassword.computed.passwordStrength.call({ password: 'abcdefgh' }).level).toBe(1)
    expect(SetPassword.computed.passwordStrength.call({ password: 'abcdefgh' }).label).toBe('Débil')
    // Minúsculas + mayúscula (2 puntos)
    expect(SetPassword.computed.passwordStrength.call({ password: 'Abcdefgh' }).level).toBe(2)
    expect(SetPassword.computed.passwordStrength.call({ password: 'Abcdefgh' }).label).toBe('Regular')
    // + número (3 puntos)
    expect(SetPassword.computed.passwordStrength.call({ password: 'Abcdefg1' }).level).toBe(3)
    expect(SetPassword.computed.passwordStrength.call({ password: 'Abcdefg1' }).label).toBe('Buena')
    // + símbolo (4 puntos)
    expect(SetPassword.computed.passwordStrength.call({ password: 'Abcdef1!' }).level).toBe(4)
    expect(SetPassword.computed.passwordStrength.call({ password: 'Abcdef1!' }).label).toBe('Fuerte')
  })

  // --- COMPUTED: FORMATO DE ROL ---

  it('userRoleFormat mapea super_admin a Super Administrador', () => {
    expect(SetPassword.computed.userRoleFormat.call({ userRole: 'super_admin' })).toBe('Super Administrador')
    expect(SetPassword.computed.userRoleFormat.call({ userRole: 'admin' })).toBe('Admin')
    expect(SetPassword.computed.userRoleFormat.call({ userRole: '' })).toBe('')
  })

  // --- SEGURIDAD: NO ESCRIBE EN localStorage ---

  it('savePassword NO escribe tokens en localStorage', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')

    const vm = {
      ...SetPassword.data(),
      password: 'MiPassword1!',
      confirmPassword: 'MiPassword1!',
      sessionUser: { id: 'user-test-123' },
      $router: { push: vi.fn() }
    }

    // Hacer que isPasswordValid devuelva true
    Object.defineProperty(vm, 'isPasswordValid', { get: () => true })

    await SetPassword.methods.savePassword.call(vm)

    expect(localStorageSpy).not.toHaveBeenCalled()
    expect(vm.$router.push).toHaveBeenCalledWith('/dashboard')

    localStorageSpy.mockRestore()
  })

  // --- CLEANUP ---

  it('beforeUnmount limpia timeout y unsubscribe de auth', () => {
    const mockClearTimeout = vi.spyOn(global, 'clearTimeout')

    const vm = {
      authTimeout: 12345,
      authSubscription: { unsubscribe: mockUnsubscribe }
    }

    SetPassword.beforeUnmount.call(vm)

    expect(mockClearTimeout).toHaveBeenCalledWith(12345)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)

    mockClearTimeout.mockRestore()
  })

  it('beforeUnmount no falla si timeout/subscription son null', () => {
    const vm = {
      authTimeout: null,
      authSubscription: null
    }

    // No debe lanzar excepción
    expect(() => SetPassword.beforeUnmount.call(vm)).not.toThrow()
  })
})
