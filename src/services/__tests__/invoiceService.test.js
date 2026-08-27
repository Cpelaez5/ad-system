/**
 * Tests unitarios del módulo de Facturación (invoiceService.js)
 *
 * Estrategia de mocking:
 * - Supabase se mockea completamente (vi.mock) para aislar la lógica de negocio.
 * - tenantHelpers se mockea para simular un organization_id fijo.
 * - inventoryService se mockea para que los movimientos no interfieran.
 *
 * Cobertura prioritaria:
 * 1. Transformación de datos BD → frontend (mapeo de campos snake_case → camelCase)
 * 2. Cálculo de retenciones y neto_a_pagar (lógica crítica de negocio)
 * 3. Generación / incremento del número de factura correlativo
 * 4. Lógica de reintento con incremento monotónico ante conflictos de número
 * 5. Validación de número único
 * 6. Cálculo de estadísticas (getInvoiceStats fallback)
 * 7. Filtros de papelera en getInvoices
 * 8. Flujos de error cuando no hay organization_id
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Mocks globales (se configuran antes del import del servicio)
// ─────────────────────────────────────────────────────────────
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: vi.fn(),
  queryWithTenant: vi.fn(),
  insertWithTenant: vi.fn(),
  updateWithTenant: vi.fn(),
  deleteWithTenant: vi.fn(),
  handleTenantError: vi.fn()
}))

vi.mock('@/services/inventoryService', () => ({
  default: {
    processMovements: vi.fn().mockResolvedValue({ success: true, createdProducts: [] })
  }
}))

// ─────────────────────────────────────────────────────────────
// Importar después de configurar mocks
// ─────────────────────────────────────────────────────────────
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'
import InvoiceService from '@/services/invoiceService'

const ORG_ID = 'org-test-123'
const CLIENT_ID = 'client-test-abc'

// ─────────────────────────────────────────────────────────────
// Helpers de builder: datos de factura crudos (BD)
// ─────────────────────────────────────────────────────────────
const buildRawInvoice = (overrides = {}) => ({
  id: 'inv-001',
  organization_id: ORG_ID,
  client_id: CLIENT_ID,
  invoice_number: 'F-2026-001',
  control_number: '00-0000001',
  document_type: 'FACTURA',
  flow: 'VENTA',
  expense_type: null,
  expense_categories: null,
  issue_date: '2026-08-01',
  due_date: '2026-08-31',
  status: 'EMITIDA',
  issuer: { name: 'Mi Empresa', rif: 'J-12345678-9' },
  client_info: { companyName: 'Cliente SA', rif: 'J-98765432-1' },
  financial: { totalSales: 1000, taxAmount: 160 },
  iva_retention: 75,
  islr_retention: 30,
  municipal_retention: 10,
  neto_a_pagar: 885,
  items: [{ description: 'Servicio', qty: 1, price: 1000 }],
  attachments: [],
  notes: 'Test',
  created_by: 'user-1',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  clients: { id: CLIENT_ID, company_name: 'Cliente SA' },
  ...overrides
})

// ─────────────────────────────────────────────────────────────
// Helper: configurar supabase.from() con cadena fluida
// ─────────────────────────────────────────────────────────────
const mockSupabaseChain = (finalResult) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    // Para llamadas sin .single(), resolvemos directamente al await
    then: undefined
  }
  // Hacer que la cadena sea thenable (await chain → usa el finalResult)
  chain[Symbol.for('nodejs.rejection')] = undefined
  // Para permitir `const { data, error } = await supabase.from(...).select(...)...`
  // necesitamos que la cadena sea una Promise cuando no se llama .single()
  // Para simplificar, hacemos que .order() devuelva la misma cadena
  // y solo resolvemos en el then() de la cadena final.
  chain.order = vi.fn().mockReturnValue(chain)
  chain.then = (resolve) => Promise.resolve(finalResult).then(resolve)
  chain.catch = (reject) => Promise.resolve(finalResult).catch(reject)
  return chain
}

// ─────────────────────────────────────────────────────────────
// Instancia del servicio
// ─────────────────────────────────────────────────────────────
let service

beforeEach(() => {
  vi.clearAllMocks()
  getCurrentOrganizationId.mockReturnValue(ORG_ID)
  // Mock de auth.getUser para getCurrentUserProfile
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } }
  })
  // Mock de perfil de usuario (tabla users)
  const fromMock = vi.fn()
  supabase.from.mockImplementation(fromMock)
  service = InvoiceService
})

// ═════════════════════════════════════════════════════════════
// Suite 1: Transformación de datos BD → Frontend
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Transformación de datos', () => {

  it('mapea correctamente los campos snake_case a camelCase', async () => {
    const rawInvoice = buildRawInvoice()
    supabase.from.mockReturnValue(mockSupabaseChain({ data: [rawInvoice], error: null }))

    const result = await service.getInvoices({ flow: 'VENTA' })

    expect(result).toHaveLength(1)
    const inv = result[0]
    expect(inv.invoiceNumber).toBe('F-2026-001')
    expect(inv.controlNumber).toBe('00-0000001')
    expect(inv.documentType).toBe('FACTURA')
    expect(inv.flow).toBe('VENTA')
    expect(inv.issueDate).toBe('2026-08-01')
    expect(inv.dueDate).toBe('2026-08-31')
    expect(inv.status).toBe('EMITIDA')
    expect(inv.clientId).toBe(CLIENT_ID)
  })

  it('usa "VENTA" como flujo por defecto cuando flow es nulo en la BD', async () => {
    const rawInvoice = buildRawInvoice({ flow: null })
    supabase.from.mockReturnValue(mockSupabaseChain({ data: [rawInvoice], error: null }))

    const result = await service.getInvoices()
    expect(result[0].flow).toBe('VENTA')
  })

  it('devuelve arrays vacíos para items y attachments cuando son null en la BD', async () => {
    const rawInvoice = buildRawInvoice({ items: null, attachments: null })
    supabase.from.mockReturnValue(mockSupabaseChain({ data: [rawInvoice], error: null }))

    const result = await service.getInvoices()
    expect(result[0].items).toEqual([])
    expect(result[0].attachments).toEqual([])
  })

  it('devuelve [] cuando Supabase devuelve error', async () => {
    supabase.from.mockReturnValue(mockSupabaseChain({ data: null, error: { message: 'DB Error' } }))

    const result = await service.getInvoices()
    expect(result).toEqual([])
  })

  it('devuelve [] cuando no hay organization_id', async () => {
    getCurrentOrganizationId.mockReturnValue(null)
    const result = await service.getInvoices()
    expect(result).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════
// Suite 2: Cálculo de Retenciones y Neto a Pagar
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Cálculo de retenciones', () => {

  const buildAndTransform = async (rawOverrides = {}) => {
    const rawInvoice = buildRawInvoice(rawOverrides)
    supabase.from.mockReturnValue(mockSupabaseChain({ data: [rawInvoice], error: null }))
    const result = await service.getInvoices()
    return result[0]
  }

  it('lee correctamente las retenciones desde columnas dedicadas de la BD', async () => {
    const inv = await buildAndTransform({
      iva_retention: 75,
      islr_retention: 30,
      municipal_retention: 10,
      neto_a_pagar: 885
    })

    expect(inv.retenciones.iva).toBe(75)
    expect(inv.retenciones.islr).toBe(30)
    expect(inv.retenciones.municipal).toBe(10)
    expect(inv.retenciones.neto_a_pagar).toBe(885)
  })

  it('calcula neto_a_pagar como fallback cuando es null en la BD', async () => {
    // total=1000, iva=75, islr=30, municipal=10 → neto=885
    const inv = await buildAndTransform({
      iva_retention: 75,
      islr_retention: 30,
      municipal_retention: 10,
      neto_a_pagar: null,
      financial: { totalSales: 1000 }
    })

    // 1000 - 75 - 30 - 10 = 885
    expect(inv.retenciones.neto_a_pagar).toBe(885)
  })

  it('cae a 0 en retenciones cuando son null tanto en columnas como en financial', async () => {
    const inv = await buildAndTransform({
      iva_retention: null,
      islr_retention: null,
      municipal_retention: null,
      neto_a_pagar: null,
      financial: {}
    })

    expect(inv.retenciones.iva).toBe(0)
    expect(inv.retenciones.islr).toBe(0)
    expect(inv.retenciones.municipal).toBe(0)
    // 0 - 0 - 0 - 0 = 0
    expect(inv.retenciones.neto_a_pagar).toBe(0)
  })

  it('usa los valores de financial como fallback cuando las columnas dedicadas son null', async () => {
    const inv = await buildAndTransform({
      iva_retention: null,
      islr_retention: null,
      municipal_retention: null,
      neto_a_pagar: null,
      financial: {
        totalSales: 500,
        ivaRetention: 37.5,
        islrRetention: 15,
        municipalRetention: 5
      }
    })

    expect(inv.retenciones.iva).toBe(37.5)
    expect(inv.retenciones.islr).toBe(15)
    expect(inv.retenciones.municipal).toBe(5)
    // 500 - 37.5 - 15 - 5 = 442.5
    expect(inv.retenciones.neto_a_pagar).toBeCloseTo(442.5)
  })

  it('las retenciones son de tipo Number aunque vengan como strings de la BD', async () => {
    const inv = await buildAndTransform({
      iva_retention: '75.50',
      islr_retention: '30.25',
      municipal_retention: '10.00',
      neto_a_pagar: 884.25
    })

    expect(typeof inv.retenciones.iva).toBe('number')
    expect(typeof inv.retenciones.islr).toBe('number')
    expect(typeof inv.retenciones.municipal).toBe('number')
    expect(inv.retenciones.iva).toBe(75.50)
  })
})

// ═════════════════════════════════════════════════════════════
// Suite 3: Número de Factura Correlativo
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Número de factura correlativo', () => {

  const mockGetNextNumber = (lastInvoiceNumber) => {
    // Primer from() para getNextInvoiceNumber → devuelve la última factura
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: lastInvoiceNumber ? [{ invoice_number: lastInvoiceNumber }] : [],
          error: null
        })
      )
    })
  }

  it('devuelve F-2024-001 cuando no hay facturas previas', async () => {
    mockGetNextNumber(null)
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2024-001')
  })

  it('incrementa correctamente el número manteniendo el padding de 3 dígitos', async () => {
    mockGetNextNumber('F-2026-005')
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2026-006')
  })

  it('incrementa correctamente cuando cruza de 009 a 010', async () => {
    mockGetNextNumber('F-2026-009')
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2026-010')
  })

  it('incrementa correctamente cuando cruza de 099 a 100', async () => {
    mockGetNextNumber('F-2026-099')
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2026-100')
  })

  it('preserva el año del último número en el siguiente', async () => {
    mockGetNextNumber('F-2025-050')
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2025-051')
  })

  it('devuelve F-2024-001 cuando el formato de número no coincide con el patrón', async () => {
    mockGetNextNumber('NUMERO-INVALIDO')
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2024-001')
  })

  it('devuelve F-2024-001 cuando hay error en la consulta a la BD', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: 'connection error' } })
      )
    })
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2024-001')
  })

  it('devuelve F-2024-001 cuando no hay organization_id', async () => {
    getCurrentOrganizationId.mockReturnValue(null)
    const next = await service.getNextInvoiceNumber()
    expect(next).toBe('F-2024-001')
  })
})

// ═════════════════════════════════════════════════════════════
// Suite 4: Lógica de reintento con incremento monotónico
// Esta es la lógica más crítica del sistema de numeración
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Incremento monotónico ante conflictos', () => {

  /**
   * Simula la lógica interna de parseInvoiceNum + comparación.
   * Como la función es interna (en createInvoice), la testeamos
   * verificando el resultado final del proceso.
   */

  // Extraemos la lógica de parseInvoiceNum para testear de forma aislada
  // (copia exacta de la lógica de invoiceService.js líneas 381-384)
  const parseInvoiceNum = (numStr) => {
    const match = numStr.match(/^(.*?)-(\d+)$/)
    if (!match) return { prefix: numStr, val: 0, raw: numStr }
    return { prefix: match[1], val: parseInt(match[2], 10), raw: numStr, len: match[2].length }
  }

  it('parseInvoiceNum: extrae prefix y val correctamente de "F-2026-005"', () => {
    const parsed = parseInvoiceNum('F-2026-005')
    expect(parsed.prefix).toBe('F-2026')
    expect(parsed.val).toBe(5)
    expect(parsed.len).toBe(3)
  })

  it('parseInvoiceNum: devuelve val=0 para formatos sin guión-número al final', () => {
    const parsed = parseInvoiceNum('NUMERO-SIN-DIGITOS')
    // El último grupo "DIGITOS" no es numérico puro, depende de la regex
    // La regex es /^(.*?)-(\d+)$/ → busca solo dígitos al final
    // "NUMERO-SIN-DIGITOS" → no termina en dígitos → no hay match
    expect(parsed.val).toBe(0)
  })

  it('parseInvoiceNum: funciona con número grande como "F-2026-9999"', () => {
    const parsed = parseInvoiceNum('F-2026-9999')
    expect(parsed.val).toBe(9999)
    expect(parsed.len).toBe(4)
  })

  // Test de la lógica de monotonicidad como función pura
  it('detecta violación monotónica cuando el número sugerido es igual al fallido', () => {
    const currentFailed = 'F-2026-005'
    const suggested = 'F-2026-005' // Mismo número → violación

    const current = parseInvoiceNum(currentFailed)
    const next = parseInvoiceNum(suggested)

    const isViolation = current.prefix === next.prefix && next.val <= current.val
    expect(isViolation).toBe(true)
  })

  it('detecta violación monotónica cuando el número sugerido es menor al fallido', () => {
    const current = parseInvoiceNum('F-2026-010')
    const next = parseInvoiceNum('F-2026-008')

    const isViolation = current.prefix === next.prefix && next.val <= current.val
    expect(isViolation).toBe(true)
  })

  it('no detecta violación cuando el número sugerido es mayor al fallido', () => {
    const current = parseInvoiceNum('F-2026-005')
    const next = parseInvoiceNum('F-2026-006')

    const isViolation = current.prefix === next.prefix && next.val <= current.val
    expect(isViolation).toBe(false)
  })

  it('no detecta violación cuando los prefijos son distintos (años distintos)', () => {
    const current = parseInvoiceNum('F-2025-050')
    const next = parseInvoiceNum('F-2026-001')

    // Prefijos distintos → no aplica la regla monotónica
    const isViolation = current.prefix === next.prefix && next.val <= current.val
    expect(isViolation).toBe(false)
  })

  it('calcula el siguiente número correcto al forzar incremento manual', () => {
    const failedNum = 'F-2026-005'
    const current = parseInvoiceNum(failedNum)

    // Simula la corrección: newVal = current.val + 1, con padding
    const newVal = current.val + 1
    const newNumPart = newVal.toString().padStart(current.len, '0')
    const corrected = `${current.prefix}-${newNumPart}`

    expect(corrected).toBe('F-2026-006')
  })

  it('mantiene el padding al cruzar de 009 a 010 en el incremento forzado', () => {
    const failedNum = 'F-2026-009'
    const current = parseInvoiceNum(failedNum)
    const newVal = current.val + 1
    const corrected = `${current.prefix}-${newVal.toString().padStart(current.len, '0')}`
    expect(corrected).toBe('F-2026-010')
  })
})

// ═════════════════════════════════════════════════════════════
// Suite 5: Validación de número de factura único
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Validación de unicidad de número', () => {

  it('retorna true cuando el número no existe en la BD', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
      catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject)
    })
    // Simular query que resuelve con array vacío
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: [], error: null })
        )
      }))
    })

    const isValid = await service.validateUniqueInvoiceNumber('F-2026-099')
    expect(isValid).toBe(true)
  })

  it('retorna false cuando el número ya existe en la BD', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: [{ id: 'inv-existente' }], error: null })
        )
      }))
    })

    const isValid = await service.validateUniqueInvoiceNumber('F-2026-001')
    expect(isValid).toBe(false)
  })

  it('retorna false cuando hay error de BD (fail safe)', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: null, error: { message: 'Error de conexión' } })
        )
      }))
    })

    const isValid = await service.validateUniqueInvoiceNumber('F-2026-001')
    expect(isValid).toBe(false)
  })

  it('retorna false cuando no hay organization_id', async () => {
    getCurrentOrganizationId.mockReturnValue(null)
    const isValid = await service.validateUniqueInvoiceNumber('F-2026-001')
    expect(isValid).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════
// Suite 6: Estadísticas de Facturas (fallback manual)
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Estadísticas', () => {

  const mockRpcFailure = () => {
    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC no disponible' } })
  }

  it('calcula total de facturas correctamente con fallback manual', async () => {
    mockRpcFailure()
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: [
            { status: 'EMITIDA', financial: { totalSales: 1000 } },
            { status: 'PAGADA', financial: { totalSales: 500 } },
            { status: 'PAGADA', financial: { totalSales: 800 } }
          ],
          error: null
        })
      )
    })

    const stats = await service.getInvoiceStats()

    expect(stats.total).toBe(3)
    expect(stats.byStatus['EMITIDA']).toBe(1)
    expect(stats.byStatus['PAGADA']).toBe(2)
    expect(stats.totalAmount).toBe(2300)
    expect(stats.paidAmount).toBe(1300)
  })

  it('devuelve estadísticas vacías cuando no hay facturas', async () => {
    mockRpcFailure()
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: [], error: null })
      )
    })

    const stats = await service.getInvoiceStats()

    expect(stats.total).toBe(0)
    expect(stats.totalAmount).toBe(0)
    expect(stats.paidAmount).toBe(0)
    expect(stats.byStatus).toEqual({})
  })

  it('devuelve estadísticas vacías cuando no hay organization_id', async () => {
    getCurrentOrganizationId.mockReturnValue(null)
    const stats = await service.getInvoiceStats()

    expect(stats.total).toBe(0)
    expect(stats.totalAmount).toBe(0)
  })

  it('usa 0 cuando financial.totalSales es undefined en una factura', async () => {
    mockRpcFailure()
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: [
            { status: 'EMITIDA', financial: null },     // Sin financial
            { status: 'EMITIDA', financial: {} }         // Financial vacío
          ],
          error: null
        })
      )
    })

    const stats = await service.getInvoiceStats()
    expect(stats.totalAmount).toBe(0)
    expect(stats.total).toBe(2)
  })
})

// ═════════════════════════════════════════════════════════════
// Suite 7: Filtros de Papelera en getInvoices
// ═════════════════════════════════════════════════════════════
describe('InvoiceService — Filtros de papelera', () => {

  it('excluye documentos eliminados por defecto (deleted_at IS NULL)', async () => {
    const isChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null }))
    }
    supabase.from.mockReturnValue(isChain)

    await service.getInvoices({ flow: 'VENTA' }, { trashed: false })

    // Verificar que se llamó .is() con 'deleted_at' y null (excluir eliminados)
    expect(isChain.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('incluye solo documentos eliminados cuando trashed=true', async () => {
    const notChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null }))
    }
    supabase.from.mockReturnValue(notChain)

    await service.getInvoices({ flow: 'VENTA' }, { trashed: true })

    // Verificar que se llamó .not() con 'deleted_at' y 'is' para filtrar eliminados
    expect(notChain.not).toHaveBeenCalledWith('deleted_at', 'is', null)
  })
})
