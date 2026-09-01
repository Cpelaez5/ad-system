import { describe, it, expect, vi, beforeEach } from 'vitest'
import userService from '@/services/userService'
import { supabase } from '@/lib/supabaseClient'

// Mock de Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn()
  }
}))

describe('UserService - Eliminación en Cascada de Cuentas (deleteUserCascade)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama exitosamente a la función RPC delete_user_cascade con el UUID de usuario', async () => {
    const targetUserId = '4615196a-e4de-4905-8f10-be11edc35677'
    const mockRpcResponse = {
      success: true,
      message: 'Usuario y registros asociados eliminados con éxito.',
      deleted_user_id: targetUserId,
      deleted_client_id: '88b8167d-386a-42f7-a2a5-d3b59ee8cc5e',
      email: 'test@example.com'
    }

    supabase.rpc.mockResolvedValueOnce({ data: mockRpcResponse, error: null })

    const result = await userService.deleteUserCascade(targetUserId)

    expect(supabase.rpc).toHaveBeenCalledWith('delete_user_cascade', {
      target_user_id: targetUserId
    })
    expect(result.success).toBe(true)
    expect(result.message).toContain('eliminados con éxito')
  })

  it('retorna error estructurado si falta el target_user_id', async () => {
    const result = await userService.deleteUserCascade(null)

    expect(result.success).toBe(false)
    expect(result.error).toBe('ID de usuario no proporcionado.')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('retorna error estructurado si el usuario no tiene permisos de Super Admin (RPC rechaza)', async () => {
    const targetUserId = 'target-user-123'
    const mockRpcError = {
      message: 'Acceso denegado. Solo el Super Administrador puede eliminar cuentas en cascada.'
    }

    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockRpcError })

    const result = await userService.deleteUserCascade(targetUserId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Acceso denegado')
  })

  it('retorna error estructurado si la función RPC devuelve success: false', async () => {
    const targetUserId = 'target-user-123'
    const mockRpcData = {
      success: false,
      error: 'No puedes eliminar tu propia cuenta de Super Administrador.'
    }

    supabase.rpc.mockResolvedValueOnce({ data: mockRpcData, error: null })

    const result = await userService.deleteUserCascade(targetUserId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('No puedes eliminar tu propia cuenta de Super Administrador.')
  })
})
