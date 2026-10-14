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

vi.mock('@/services/proveedorService.js', () => ({
  default: {
    buscarPorRifNormalizado: vi.fn(),
    createProveedor: vi.fn(),
    deleteProveedor: vi.fn()
  }
}))

vi.mock('@/services/inventoryService.js', () => ({
  default: {
    createProduct: vi.fn()
  }
}))

const supabaseUpdate = { eq: vi.fn().mockResolvedValue({ error: null }) }
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(() => ({ update: vi.fn(() => supabaseUpdate) })) }
}))

import { supabase } from '@/lib/supabaseClient'
import invoiceService from '@/services/invoiceService.js'
import retentionRpcService from '@/services/retentionRpcService.js'
import emailNotificationService from '@/services/email-notification-service.js'
import proveedorService from '@/services/proveedorService.js'
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

  it('compra por RPC con fecha fiscal manual: la fija aparte en la factura creada', async () => {
    const formData = {
      flow: 'COMPRA', expense_type: 'COMPRA', fecha_fiscal: '2026-09-05',
      client_id: 'cli-1', proveedor_id: 'prov-1',
      financial: { ivaRetention: 12, islrRetention: 0, municipalRetention: 0 }
    }
    retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-9' })

    const result = await guardarRegistro(formData)

    expect(result.success).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('invoices')
    expect(supabaseUpdate.eq).toHaveBeenCalledWith('id', 'inv-9')
  })

  describe('proveedor pendiente del OCR (Tarea C)', () => {
    // RIF inventado con dígito verificador calculado de verdad (algoritmo
    // SENIAT, ver src/utils/rif.js): J + 12345678 → DV 4. Ninguno corresponde
    // a un contribuyente real.
    const RIF_VALIDO = 'J-12345678-4'

    it('crea el proveedor nuevo y lo enlaza antes de guardar la compra (vía RPC de retenciones)', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'GASTO',
        client: { id: 'client-abc' },
        issuer: {
          companyName: 'Corpelec',
          _proveedorPendiente: { nombre: 'Corpelec', rif: 'j123456784', direccion: 'Av. Principal' }
        },
        financial: { ivaRetention: 0, islrRetention: 0, municipalRetention: 0 }
      }

      proveedorService.buscarPorRifNormalizado.mockResolvedValue(null)
      proveedorService.createProveedor.mockResolvedValue({
        success: true,
        data: { id: 'prov-nuevo-1', rif: RIF_VALIDO }
      })
      retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-1' })

      const result = await guardarRegistro(formData)

      expect(proveedorService.createProveedor).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Corpelec', rif: RIF_VALIDO, tipo_persona: 'JURIDICA' })
      )
      expect(formData.issuer.id).toBe('prov-nuevo-1')
      expect(formData.issuer._proveedorPendiente).toBeUndefined()
      // El proveedor ya quedó enlazado ANTES de armar el payload del RPC
      expect(retentionRpcService.registrarCompra).toHaveBeenCalledWith(
        expect.objectContaining({ p_proveedor_id: 'prov-nuevo-1' })
      )
      expect(result.success).toBe(true)
    })

    it('reutiliza un proveedor existente por RIF en vez de duplicarlo', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'COMPRA',
        issuer: { _proveedorPendiente: { nombre: 'Corpelec', rif: RIF_VALIDO } },
        financial: {}
      }

      proveedorService.buscarPorRifNormalizado.mockResolvedValue({ id: 'prov-existente', rif: RIF_VALIDO })
      retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-2' })

      const result = await guardarRegistro(formData)

      expect(proveedorService.createProveedor).not.toHaveBeenCalled()
      expect(formData.issuer.id).toBe('prov-existente')
      expect(retentionRpcService.registrarCompra).toHaveBeenCalledWith(
        expect.objectContaining({ p_proveedor_id: 'prov-existente' })
      )
      expect(result.success).toBe(true)
    })

    it('si no se puede crear el proveedor, no guarda la factura y devuelve mensaje llano', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'GASTO',
        issuer: { _proveedorPendiente: { nombre: 'Corpelec', rif: RIF_VALIDO } },
        financial: {}
      }

      proveedorService.buscarPorRifNormalizado.mockResolvedValue(null)
      proveedorService.createProveedor.mockResolvedValue({ success: false, error: 'No se pudo registrar el proveedor nuevo.' })

      const result = await guardarRegistro(formData)

      expect(result.success).toBe(false)
      expect(result.message).toBe('No se pudo registrar el proveedor nuevo.')
      expect(invoiceService.createInvoice).not.toHaveBeenCalled()
    })

    it('no intenta crear nada si el proveedor ya tiene issuer.id (ya está enlazado)', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'GASTO',
        issuer: { id: 'prov-ya-enlazado', _proveedorPendiente: { nombre: 'Corpelec', rif: RIF_VALIDO } },
        financial: {}
      }
      retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-3' })

      await guardarRegistro(formData)

      expect(proveedorService.buscarPorRifNormalizado).not.toHaveBeenCalled()
      expect(proveedorService.createProveedor).not.toHaveBeenCalled()
    })

    // I4: si la búsqueda de duplicados falla (red, orgId sin resolver), NO se
    // crea el proveedor ni se guarda la factura.
    it('I4: si la búsqueda de duplicados falla, no crea el proveedor ni guarda la factura', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'GASTO',
        issuer: { _proveedorPendiente: { nombre: 'Corpelec', rif: RIF_VALIDO } },
        financial: {}
      }

      proveedorService.buscarPorRifNormalizado.mockRejectedValue(new Error('network error'))

      const result = await guardarRegistro(formData)

      expect(result.success).toBe(false)
      expect(proveedorService.createProveedor).not.toHaveBeenCalled()
      expect(invoiceService.createInvoice).not.toHaveBeenCalled()
      expect(retentionRpcService.registrarCompra).not.toHaveBeenCalled()
    })

    // I4: un choque 23505 con el índice único real (proveedores_client_rif_unico)
    // se trata como "ya existe": se busca de nuevo y se usa, no se falla.
    it('I4: si el insert choca con el RIF único (23505), reutiliza el proveedor encontrado tras el choque', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'GASTO',
        issuer: { _proveedorPendiente: { nombre: 'Corpelec', rif: RIF_VALIDO } },
        financial: {}
      }

      proveedorService.buscarPorRifNormalizado
        .mockResolvedValueOnce(null) // primera comprobación: no existe
        .mockResolvedValueOnce({ id: 'prov-ganador-de-la-carrera', rif: RIF_VALIDO }) // tras el choque: sí existe
      proveedorService.createProveedor.mockResolvedValue({
        success: false,
        error: `Ya existe un proveedor registrado con el RIF ${RIF_VALIDO}.`
      })
      retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-4' })

      const result = await guardarRegistro(formData)

      expect(formData.issuer.id).toBe('prov-ganador-de-la-carrera')
      expect(result.success).toBe(true)
    })

    // I4: si la factura falla justo después de crear el proveedor en este
    // mismo intento, se compensa (se borra) el proveedor recién creado.
    it('I4: compensa (borra) el proveedor recién creado si la factura falla justo después', async () => {
      const formData = {
        flow: 'COMPRA',
        expense_type: 'GASTO',
        issuer: { _proveedorPendiente: { nombre: 'Corpelec', rif: RIF_VALIDO } },
        financial: {}
      }

      proveedorService.buscarPorRifNormalizado.mockResolvedValue(null)
      proveedorService.createProveedor.mockResolvedValue({
        success: true,
        data: { id: 'prov-compensar', rif: RIF_VALIDO }
      })
      retentionRpcService.registrarCompra.mockRejectedValue(new Error('El RPC rechazó el registro'))
      proveedorService.deleteProveedor.mockResolvedValue({ success: true })

      const result = await guardarRegistro(formData)

      expect(result.success).toBe(false)
      expect(proveedorService.deleteProveedor).toHaveBeenCalledWith('prov-compensar', RIF_VALIDO)
    })
  })
})
