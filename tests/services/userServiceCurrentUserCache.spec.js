import { describe, it, expect, vi, beforeEach } from 'vitest'
import userService from '@/services/userService'
import { supabase } from '@/lib/supabaseClient'

// Mock de Supabase: solo lo necesario para ejercitar getCurrentUser()/logout()
// sin tocar la red real. Sigue el mismo patrón que tests/services/userCascadeDelete.spec.js.
const maybeSingleUsersMock = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'ana@test.com' } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: maybeSingleUsersMock
            })
          })
        }
      }
      // No se espera consulta a 'clients' en este test (client_id es null)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      }
    })
  }
}))

const PROFILE_ROW = {
  id: 'user-1',
  username: 'ana',
  email: 'ana@test.com',
  first_name: 'Ana',
  last_name: 'Pérez',
  role: 'cliente',
  is_active: true,
  avatar_url: null,
  last_login: null,
  organizations: { id: 'org-1' },
  organization_id: 'org-1',
  client_id: null,
  clients: null,
  plan_id: 'free_trial',
  trial_end: null
}

describe('userService - caché en memoria del usuario actual', () => {
  beforeEach(async () => {
    // Cada test parte de caché limpia: la caché en memoria de userService es
    // un singleton de módulo que sobrevive entre tests de este mismo archivo.
    await userService.logout()
    localStorage.clear()
    maybeSingleUsersMock.mockReset()
    maybeSingleUsersMock.mockResolvedValue({ data: PROFILE_ROW, error: null })
    supabase.from.mockClear()
  })

  it('una navegación con dos lecturas de getCurrentUser() solo consulta Supabase una vez', async () => {
    const first = await userService.getCurrentUser()
    const second = await userService.getCurrentUser()

    expect(first.id).toBe('user-1')
    expect(second).toBe(first) // misma referencia: vino de la caché en memoria
    expect(maybeSingleUsersMock).toHaveBeenCalledTimes(1)
  })

  it('logout() invalida la caché en memoria: la siguiente consulta vuelve a pedir el usuario', async () => {
    await userService.getCurrentUser()
    expect(maybeSingleUsersMock).toHaveBeenCalledTimes(1)

    await userService.logout()

    await userService.getCurrentUser()
    expect(maybeSingleUsersMock).toHaveBeenCalledTimes(2)
  })
})
