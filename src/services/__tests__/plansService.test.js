/**
 * Tests unitarios del módulo de Planes (plansService.js)
 *
 * Cubre:
 * - Obtención de planes disponibles
 * - Lógica compleja de obtención de suscripción actual (getCurrentSubscription) 
 *   incluyendo fallbacks a la tabla users y mapeos legacy.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

import { supabase } from '@/lib/supabaseClient'
import plansService from '@/services/plansService'

// Helper para mockear cadena
const mockSupabaseChain = (finalResult) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult)
  }
  return chain
}

describe('PlansService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Obtención de planes
  // ═════════════════════════════════════════════════════════════
  describe('getPlans', () => {
    it('obtiene los planes activos ordenados por precio', async () => {
      const dbPlans = [
        { id: '1', name: 'Basico', price_monthly: 10, is_active: true },
        { id: '2', name: 'Pro', price_monthly: 20, is_active: true }
      ]
      
      const chain = mockSupabaseChain({ data: dbPlans, error: null })
      // Para getPlans no usamos single() sino devolvemos directamente
      chain.order = vi.fn().mockResolvedValue({ data: dbPlans, error: null })
      supabase.from.mockReturnValue(chain)

      const res = await plansService.getPlans()
      
      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
      expect(chain.order).toHaveBeenCalledWith('price_monthly', { ascending: true })
      expect(res.success).toBe(true)
      expect(res.data).toEqual(dbPlans)
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: getCurrentSubscription (Lógica compleja y fallbacks)
  // ═════════════════════════════════════════════════════════════
  describe('getCurrentSubscription', () => {
    const CLIENT_ID = 'client-123'

    it('devuelve la suscripción directamente de client_subscriptions si existe', async () => {
      const activeSub = { id: 'sub-1', status: 'active', plan: { name: 'Pro' } }
      
      const chain = mockSupabaseChain({ data: activeSub, error: null })
      supabase.from.mockReturnValue(chain)

      const res = await plansService.getCurrentSubscription(CLIENT_ID)
      
      expect(supabase.from).toHaveBeenCalledWith('client_subscriptions')
      expect(res.success).toBe(true)
      expect(res.data).toEqual(activeSub)
    })

    it('si no hay sub (PGRST116), hace fallback a tabla users con plan legacy "pro"', async () => {
      // 1ra llamada: client_subscriptions -> null
      // 2da llamada: users -> { plan_id: 'pro' }
      // 3ra llamada: subscription_plans (busca por nombre 'Profesional') -> { id: 'plan-xyz' }
      let callCount = 0
      supabase.from.mockImplementation((tableName) => {
        const chain = mockSupabaseChain({})
        callCount++
        
        if (callCount === 1) {
          // Fallo 116 de no encontrar fila
          chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        } else if (callCount === 2) {
          // Users
          chain.single.mockResolvedValue({ data: { client_id: CLIENT_ID, plan_id: 'pro' }, error: null })
        } else if (callCount === 3) {
          // subscription_plans por mappedName ('Profesional')
          chain.single.mockResolvedValue({ data: { id: 'plan-pro-id', name: 'Profesional' }, error: null })
        }
        
        return chain
      })

      const res = await plansService.getCurrentSubscription(CLIENT_ID)

      expect(res.success).toBe(true)
      expect(res.data.plan_id).toBe('plan-pro-id') // Reemplazó 'pro' por el id mapeado
      expect(res.data.plan.name).toBe('Profesional')
    })

    it('si hace fallback a users y tiene plan "free_trial", inyecta el plan estático sin llamar a base de datos', async () => {
      let callCount = 0
      supabase.from.mockImplementation((tableName) => {
        const chain = mockSupabaseChain({})
        callCount++
        if (callCount === 1) chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        if (callCount === 2) chain.single.mockResolvedValue({ data: { client_id: CLIENT_ID, plan_id: 'free_trial' }, error: null })
        return chain
      })

      const res = await plansService.getCurrentSubscription(CLIENT_ID)

      expect(res.success).toBe(true)
      expect(res.data.plan_id).toBe('free_trial')
      expect(res.data.plan.name).toBe('Prueba Gratuita')
      
      // La tercera llamada (a plans) nunca ocurrió porque es estático
      expect(callCount).toBe(2)
    })
  })
})
