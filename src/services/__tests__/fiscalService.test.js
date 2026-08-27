/**
 * Tests unitarios del módulo de Expediente Fiscal 360 (fiscalService.js)
 *
 * Estrategia de mocking:
 * - Supabase se mockea completamente (vi.mock).
 * - tenantHelpers se mockea para simular un organization_id fijo.
 * - documentService se mockea para aislar la subida de archivos y eliminación.
 * - userService se mockea para simular roles (cliente vs admin/contador).
 * - browser-image-compression se mockea para la compresión.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Mocks globales
// ─────────────────────────────────────────────────────────────
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn()
  }
}))

vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: vi.fn()
}))

vi.mock('@/services/userService', () => ({
  default: {
    getCurrentUser: vi.fn()
  }
}))

vi.mock('@/services/documentService', () => ({
  default: {
    uploadFile: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn()
  }
}))

vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn((file) => Promise.resolve({ ...file, size: file.size / 2 }))
  }
})

import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'
import userService from '@/services/userService'
import documentService from '@/services/documentService'
import imageCompression from 'browser-image-compression'

// Importar servicio después de configurar mocks
import fiscalService from '@/services/fiscalService'

const ORG_ID = 'org-test-123'
const USER_ID = 'user-test-abc'
const CLIENT_ID = 'client-test-xyz'

// ─────────────────────────────────────────────────────────────
// Helper: configurar supabase.from() con cadena fluida
// ─────────────────────────────────────────────────────────────
const mockSupabaseChain = (finalResult) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }
  chain.order = vi.fn().mockReturnValue(chain)
  chain.then = (resolve) => Promise.resolve(finalResult).then(resolve)
  chain.catch = (reject) => Promise.resolve(finalResult).catch(reject)
  return chain
}

const buildDoc = (overrides = {}) => ({
  id: 'doc-1',
  status: 'VIGENTE',
  deleted_at: null,
  expiration_date: null,
  ...overrides
})

describe('FiscalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentOrganizationId.mockReturnValue(ORG_ID)
    userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'admin' })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: getFiscalDocs y filtrado por roles
  // ═════════════════════════════════════════════════════════════
  describe('getFiscalDocs', () => {
    it('filtra por cliente cuando el rol es cliente', async () => {
      userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'cliente', client_id: CLIENT_ID })
      const isChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }
      isChain.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve)
      supabase.from.mockReturnValue(isChain)

      await fiscalService.getFiscalDocs()

      // Debe haber filtrado por client_id
      expect(isChain.eq).toHaveBeenCalledWith('client_id', CLIENT_ID)
    })

    it('no filtra por cliente si el rol es admin', async () => {
      userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'admin' })
      const isChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }
      isChain.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve)
      supabase.from.mockReturnValue(isChain)

      await fiscalService.getFiscalDocs()

      // Comprobar que no se llamó a eq('client_id', ...)
      expect(isChain.eq).not.toHaveBeenCalledWith('client_id', expect.anything())
    })

    it('devuelve [] y emite warning si es cliente pero no tiene client_id', async () => {
      userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'cliente', client_id: null })
      
      // La query se inicializa antes del condicional, por lo que mockeamos la cadena base
      const isChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }
      isChain.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve)
      supabase.from.mockReturnValue(isChain)

      const data = await fiscalService.getFiscalDocs()
      expect(data).toEqual([])
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: compresión de imágenes
  // ═════════════════════════════════════════════════════════════
  describe('compressImage', () => {
    it('comprime solo si el tipo de archivo es imagen', async () => {
      const file = { name: 'test.jpg', type: 'image/jpeg', size: 2000 }
      const res = await fiscalService.compressImage(file)
      expect(imageCompression).toHaveBeenCalled()
      expect(res.size).toBe(1000)
    })

    it('no comprime si es pdf u otro formato', async () => {
      const file = { name: 'test.pdf', type: 'application/pdf', size: 2000 }
      const res = await fiscalService.compressImage(file)
      expect(imageCompression).not.toHaveBeenCalled()
      expect(res.size).toBe(2000)
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 3: saveFiscalDoc
  // ═════════════════════════════════════════════════════════════
  describe('saveFiscalDoc', () => {
    it('asigna automáticamente el client_id si el que guarda es un cliente', async () => {
      userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'cliente', client_id: CLIENT_ID })
      
      const docData = { name: 'Doc Test', status: 'VIGENTE' }
      
      const chain = mockSupabaseChain({ data: { id: 'new-id' }, error: null })
      supabase.from.mockReturnValue(chain)

      await fiscalService.saveFiscalDoc(docData)

      // Verificar el payload insertado
      const insertCall = chain.insert.mock.calls[0][0]
      expect(insertCall.client_id).toBe(CLIENT_ID)
    })

    it('formatea las fechas descartando la hora (T00:00...) para evitar desfase UTC', async () => {
      userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'admin' })
      const docData = { 
        name: 'Doc', 
        status: 'VIGENTE',
        emission_date: '2026-08-26T18:00:00.000Z',
        expiration_date: '2027-01-01' // ya formateada
      }
      
      const chain = mockSupabaseChain({ data: { id: 'new-id' }, error: null })
      supabase.from.mockReturnValue(chain)

      await fiscalService.saveFiscalDoc(docData)

      const insertCall = chain.insert.mock.calls[0][0]
      expect(insertCall.emission_date).toBe('2026-08-26')
      expect(insertCall.expiration_date).toBe('2027-01-01')
    })

    it('sube archivo, crea document y guarda su id si viene adjunto', async () => {
      userService.getCurrentUser.mockResolvedValue({ id: USER_ID, role: 'admin' })
      const file = { name: 'test.pdf', type: 'application/pdf', size: 1000 }
      const docData = { name: 'Doc Test' }
      
      documentService.uploadFile.mockResolvedValue({ success: true, data: { fileUrl: 'url' } })
      documentService.createDocument.mockResolvedValue({ success: true, data: { id: 'doc-db-1' } })

      const chain = mockSupabaseChain({ data: { id: 'fiscal-1' }, error: null })
      supabase.from.mockReturnValue(chain)

      await fiscalService.saveFiscalDoc(docData, file)

      expect(documentService.uploadFile).toHaveBeenCalledWith(file, 'FISCAL')
      const insertCall = chain.insert.mock.calls[0][0]
      expect(insertCall.document_id).toBe('doc-db-1')
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 4: getStats
  // ═════════════════════════════════════════════════════════════
  describe('getStats', () => {
    it('calcula estadísticas correctamente ignorando NO_APLICA para los contadores base', async () => {
      // Mockear getFiscalDocs devolviendo array de documentos
      const docs = [
        buildDoc({ status: 'VIGENTE' }),
        buildDoc({ status: 'VIGENTE' }),
        buildDoc({ status: 'TRAMITE' }),
        buildDoc({ status: 'VENCIDO' }),
        buildDoc({ status: 'NO_APLICA' }),
      ]
      
      // Mock: primera llamada (trashed=false) devuelve docs, segunda (trashed=true) devuelve 1 doc
      const isChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }
      
      let callCount = 0
      isChain.then = (resolve) => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: docs, error: null }).then(resolve)
        return Promise.resolve({ data: [ buildDoc() ], error: null }).then(resolve)
      }
      
      supabase.from.mockReturnValue(isChain)

      const stats = await fiscalService.getStats()
      
      expect(stats.total).toBe(5)
      expect(stats.vigente).toBe(2)
      expect(stats.tramite).toBe(1)
      expect(stats.vencido).toBe(1)
      expect(stats.noAplica).toBe(1)
      expect(stats.trash).toBe(1)
    })

    it('detecta documentos porVencer (30 días o menos) e infiere vencido si ya pasó (Visual)', async () => {
      // Configuramos fechas relativas a HOY
      const now = new Date()
      const en15Dias = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000))
      const hace10Dias = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000))
      
      const docs = [
        // VIGENTE pero se vence en 15 días → porVencer = 1, vigente = 1
        buildDoc({ status: 'VIGENTE', expiration_date: en15Dias.toISOString().split('T')[0] }),
        // VIGENTE pero ya pasó la fecha → vencido = 1, vigente restado
        buildDoc({ status: 'VIGENTE', expiration_date: hace10Dias.toISOString().split('T')[0] })
      ]

      const isChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }
      let callCount = 0
      isChain.then = (resolve) => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: docs, error: null }).then(resolve)
        return Promise.resolve({ data: [], error: null }).then(resolve)
      }
      supabase.from.mockReturnValue(isChain)

      const stats = await fiscalService.getStats()

      expect(stats.porVencer).toBe(1)
      // Originalmente eran 2 vigentes, pero uno ya pasó, así que quedó 1 vigente y 1 vencido
      expect(stats.vigente).toBe(1)
      expect(stats.vencido).toBe(1)
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 5: Delete Logic (Soft / Hard / Restore)
  // ═════════════════════════════════════════════════════════════
  describe('Borrado y Restauración', () => {
    it('soft delete (papelera) actualiza deleted_at', async () => {
      const chain = mockSupabaseChain({ data: null, error: null })
      supabase.from.mockReturnValue(chain)

      await fiscalService.deleteFiscalDoc('doc-1')

      const updateCall = chain.update.mock.calls[0][0]
      expect(updateCall.deleted_at).toBeDefined()
    })

    it('restoreFiscalDoc pone deleted_at en null', async () => {
      const chain = mockSupabaseChain({ data: null, error: null })
      supabase.from.mockReturnValue(chain)

      await fiscalService.restoreFiscalDoc('doc-1')

      const updateCall = chain.update.mock.calls[0][0]
      expect(updateCall.deleted_at).toBeNull()
    })

    it('hardDeleteFiscalDoc borra el registro de la BD y el archivo físico si tiene document_id', async () => {
      // 1er chain: Obtener document_id
      // 2do chain: Borrar registro
      supabase.from.mockImplementation(() => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { document_id: 'file-123' }, error: null })
        }
        chain.then = (resolve) => Promise.resolve({ data: null, error: null }).then(resolve)
        return chain
      })

      await fiscalService.hardDeleteFiscalDoc('doc-1')

      expect(documentService.deleteDocument).toHaveBeenCalledWith('file-123')
    })
  })
})
