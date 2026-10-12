/**
 * Tests unitarios de registroService.js
 *
 * Estrategia de mocking:
 * - invoiceService, retentionRpcService y emailNotificationService se mockean
 *   por completo para aislar la lógica de decisión (update vs. create vs. RPC
 *   de retenciones) sin tocar Supabase.
 *
 * Cobertura:
 * 1. Update (formData.id presente) → invoiceService.updateInvoice
 * 2. Compra con retenciones → retentionRpcService.registrarCompra con el
 *    payload exacto esperado por el RPC
 * 3. Venta normal → invoiceService.createInvoice
 * 4. Error del servicio de persistencia → success: false con mensaje
 * 5. El email nunca bloquea el resultado del guardado (ni en éxito ni en error)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/invoiceService.js', () => ({
  default: {
    createInvoice: vi.fn(),
    updateInvoice: vi.fn()
  }
}))

vi.mock('@/services/retentionRpcService.js', () => ({
  default: {
    registrarCompra: vi.fn()
  }
}))

vi.mock('@/services/email-notification-service.js', () => ({
  default: {
    notifyInvoiceCreated: vi.fn()
  }
}))

import invoiceService from '@/services/invoiceService.js'
import retentionRpcService from '@/services/retentionRpcService.js'
import emailNotificationService from '@/services/email-notification-service.js'
import { guardarRegistro } from '@/services/registroService.js'

describe('registroService.guardarRegistro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Por defecto, el email "sale bien" y no debe bloquear nada.
    emailNotificationService.notifyInvoiceCreated.mockResolvedValue({ success: true })
  })

  it('actualiza un registro existente (formData.id presente) usando invoiceService.updateInvoice', async () => {
    const formData = { id: 'inv-123', flow: 'VENTA', financial: {} }
    invoiceService.updateInvoice.mockResolvedValue({ success: true, data: { id: 'inv-123' } })

    const result = await guardarRegistro(formData)

    expect(invoiceService.updateInvoice).toHaveBeenCalledWith('inv-123', formData)
    expect(invoiceService.createInvoice).not.toHaveBeenCalled()
    expect(retentionRpcService.registrarCompra).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.isUpdate).toBe(true)
    // Al editar no se notifica por email
    expect(emailNotificationService.notifyInvoiceCreated).not.toHaveBeenCalled()
  })

  it('registra una compra con retenciones vía RPC con el payload exacto esperado', async () => {
    const formData = {
      flow: 'COMPRA',
      expense_type: 'COMPRA',
      client: { id: 'client-abc' },
      issuer: { id: 'proveedor-xyz' },
      financial: {
        ivaRetention: 160,
        islrRetention: 30,
        municipalRetention: 0,
        ivaRetentionNumber: 'IVA-001',
        islrRetentionNumber: 'ISLR-001',
        municipalRetentionNumber: null
      },
      islr_concept_id: 'concept-1',
      concepto_municipal_id: 'municipal-1'
    }

    retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-999' })

    const result = await guardarRegistro(formData)

    expect(retentionRpcService.registrarCompra).toHaveBeenCalledWith({
      p_client_id: 'client-abc',
      p_proveedor_id: 'proveedor-xyz',
      p_aplicar_iva: true,
      p_aplicar_islr: true,
      p_aplicar_municipal: false,
      p_comprobante_iva: 'IVA-001',
      p_comprobante_islr: 'ISLR-001',
      p_comprobante_municipal: null,
      p_factura: formData,
      p_islr_concept_id: 'concept-1',
      p_concepto_municipal_id: 'municipal-1'
    })
    expect(invoiceService.createInvoice).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('inv-999')
    expect(result.isCompra).toBe(true)
    expect(result.isUpdate).toBe(false)
    // Al crear sí se notifica por email
    expect(emailNotificationService.notifyInvoiceCreated).toHaveBeenCalledWith(result.data)
  })

  it('registra una venta normal (sin retenciones) usando invoiceService.createInvoice', async () => {
    const formData = { flow: 'VENTA', financial: {} }
    invoiceService.createInvoice.mockResolvedValue({ success: true, data: { id: 'inv-venta-1' } })

    const result = await guardarRegistro(formData)

    expect(invoiceService.createInvoice).toHaveBeenCalledWith(formData)
    expect(retentionRpcService.registrarCompra).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.isCompra).toBe(false)
    expect(emailNotificationService.notifyInvoiceCreated).toHaveBeenCalledWith({ id: 'inv-venta-1' })
  })

  it('devuelve success: false con mensaje en lenguaje llano cuando el servicio de persistencia falla', async () => {
    const formData = { flow: 'VENTA', financial: {} }
    invoiceService.createInvoice.mockResolvedValue({ success: false, message: 'No se pudo guardar la factura' })

    const result = await guardarRegistro(formData)

    expect(result.success).toBe(false)
    expect(result.message).toBe('No se pudo guardar la factura')
    expect(emailNotificationService.notifyInvoiceCreated).not.toHaveBeenCalled()
  })

  it('nunca lanza: si el RPC rechaza, devuelve success: false con el mensaje del error', async () => {
    const formData = { flow: 'COMPRA', expense_type: 'GASTO', financial: {} }
    retentionRpcService.registrarCompra.mockRejectedValue(new Error('No hay configuración fiscal para este periodo'))

    const result = await guardarRegistro(formData)

    expect(result.success).toBe(false)
    expect(result.message).toBe('No hay configuración fiscal para este periodo')
  })

  it('el email no bloquea el resultado del guardado aunque falle (se dispara en background)', async () => {
    const formData = { flow: 'VENTA', financial: {} }
    invoiceService.createInvoice.mockResolvedValue({ success: true, data: { id: 'inv-email-fail' } })
    emailNotificationService.notifyInvoiceCreated.mockRejectedValue(new Error('SMTP caído'))

    const result = await guardarRegistro(formData)

    expect(result.success).toBe(true)
    expect(result.data.id).toBe('inv-email-fail')
  })
})
