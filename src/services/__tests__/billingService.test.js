/**
 * Tests unitarios del módulo de Facturación/Checkout (billingService.js)
 *
 * Cubre:
 * - Facturas del sistema (getInvoices, getAllInvoices)
 * - Checkout y Generación de Facturas Pendientes (createPendingSubscriptionInvoice)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

// Mock emailNotificationService to prevent side effects
vi.mock('@/services/email-notification-service.js', () => ({
  default: {
    sendPaymentReceivedEmail: vi.fn(),
    sendPaymentApprovedEmail: vi.fn(),
    sendPaymentRejectedEmail: vi.fn()
  }
}))

import { supabase } from '@/lib/supabaseClient'
import billingService from '@/services/billingService'

const mockSupabaseChain = (finalResult) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult)
  }
  // Permitir usar await directamente sin single() si se configuró thusly
  chain.then = (resolve) => Promise.resolve(finalResult).then(resolve)
  return chain
}

describe('BillingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Obtención de Facturas del Sistema
  // ═════════════════════════════════════════════════════════════
  describe('getInvoices & getAllInvoices', () => {
    const CLIENT_ID = 'client-1'

    it('getInvoices filtra las facturas por client_id', async () => {
      const dbInvoices = [{ id: 'inv-1', amount: 100 }]
      const chain = mockSupabaseChain({ data: dbInvoices, error: null })
      supabase.from.mockReturnValue(chain)

      const res = await billingService.getInvoices(CLIENT_ID)
      
      expect(supabase.from).toHaveBeenCalledWith('system_invoices')
      expect(chain.eq).toHaveBeenCalledWith('client_id', CLIENT_ID)
      expect(res.success).toBe(true)
      expect(res.data).toEqual(dbInvoices)
    })

    it('getAllInvoices obtiene todas sin filtrar por cliente (vista admin)', async () => {
      const dbInvoices = [{ id: 'inv-1', amount: 100 }, { id: 'inv-2', amount: 200 }]
      const chain = mockSupabaseChain({ data: dbInvoices, error: null })
      supabase.from.mockReturnValue(chain)

      const res = await billingService.getAllInvoices()
      
      expect(supabase.from).toHaveBeenCalledWith('system_invoices')
      // Se aseguró que NUNCA se llamó a eq
      expect(chain.eq).not.toHaveBeenCalled()
      expect(res.success).toBe(true)
      expect(res.data).toEqual(dbInvoices)
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Checkout - createPendingSubscriptionInvoice (RPC)
  // ═════════════════════════════════════════════════════════════
  describe('createPendingSubscriptionInvoice', () => {
    it('envía los datos al RPC correcto y retorna el éxito estructurado', async () => {
      // El RPC de Supabase devuelve la info envuelta
      const rpcResponse = { 
        data: { 
          success: true, 
          data: { invoice_id: 'inv-new', amount: 35 }
        }, 
        error: null 
      }
      supabase.rpc.mockResolvedValue(rpcResponse)

      const payload = {
        client_id: 'client-1',
        amount: 35,
        notes: 'Pago anual pro'
      }

      const res = await billingService.createPendingSubscriptionInvoice(payload)

      expect(supabase.rpc).toHaveBeenCalledWith('create_pending_subscription_invoice_v3', {
        payload: {
          client_id: 'client-1',
          amount: 35,
          notes: 'Pago anual pro'
        }
      })
      
      // Debe desenvolverse
      expect(res.success).toBe(true)
      expect(res.data.invoice_id).toBe('inv-new')
    })

    it('maneja errores lógicos retornados por el RPC (!data.success)', async () => {
      // Supabase contesta HTTP 200 pero el RPC falla por lógica interna (ej. "No hay sub activa")
      const rpcResponse = { 
        data: { 
          success: false, 
          error: 'Invalid client'
        }, 
        error: null 
      }
      supabase.rpc.mockResolvedValue(rpcResponse)

      const res = await billingService.createPendingSubscriptionInvoice({ client_id: 'fail' })

      expect(res.success).toBe(false)
      expect(res.error).toBeInstanceOf(Error)
      expect(res.error.message).toBe('Invalid client')
    })

    it('maneja errores crudos de conexión/Supabase', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: new Error('Network timeout') })

      const res = await billingService.createPendingSubscriptionInvoice({ client_id: 'fail' })

      expect(res.success).toBe(false)
      expect(res.error.message).toBe('Network timeout')
    })
  })
})
