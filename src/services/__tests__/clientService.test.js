/**
 * Tests unitarios del módulo de Clientes (clientService.js)
 *
 * Cubre:
 * - Obtención de clientes (getClients, getClientById)
 * - Creación y validación de retorno de datos (createClient)
 * - Modificación (updateClient)
 * - Borrado lógico (deleteClient)
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
  getCurrentOrganizationId: vi.fn(),
  queryWithTenant: vi.fn(),
  insertWithTenant: vi.fn(),
  updateWithTenant: vi.fn(),
  deleteWithTenant: vi.fn(),
  handleTenantError: vi.fn((err) => { throw err })
}))

import { queryWithTenant, insertWithTenant, updateWithTenant } from '@/utils/tenantHelpers'
import clientService from '@/services/clientService'

describe('ClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Obtención de Clientes
  // ═════════════════════════════════════════════════════════════
  describe('getClients', () => {
    it('llama a queryWithTenant y transforma de snake_case a camelCase', async () => {
      // Supabase devuelve snake_case
      const dbClients = [
        {
          id: 'client-1',
          company_name: 'Tech Corp',
          taxpayer_type: 'JURIDICA',
          contact_person: 'John Doe',
          created_at: '2024-01-01'
        }
      ]

      queryWithTenant.mockResolvedValue({ data: dbClients, error: null })

      const clients = await clientService.getClients()

      expect(queryWithTenant).toHaveBeenCalledWith('clients', expect.any(String))
      
      // Debe haber transformado a camelCase
      expect(clients[0].companyName).toBe('Tech Corp')
      expect(clients[0].taxpayerType).toBe('JURIDICA')
      expect(clients[0].contactPerson).toBe('John Doe')
      expect(clients[0].createdAt).toBe('2024-01-01')
    })

    it('devuelve array vacío si hay error en base de datos', async () => {
      queryWithTenant.mockResolvedValue({ data: null, error: new Error('DB Error') })
      
      const clients = await clientService.getClients()
      expect(clients).toEqual([])
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Creación de Clientes
  // ═════════════════════════════════════════════════════════════
  describe('createClient', () => {
    it('inserta el cliente y lo devuelve transformado si tiene éxito', async () => {
      const newClientData = {
        companyName: 'New Corp',
        rif: 'J-12345678-9',
        taxpayerType: 'JURIDICA',
        email: 'test@newcorp.com'
      }

      // Lo que devuelve Supabase
      const returnedDBClient = [{
        id: 'new-id',
        company_name: 'New Corp',
        rif: 'J-12345678-9',
        taxpayer_type: 'JURIDICA',
        email: 'test@newcorp.com',
        status: 'ACTIVO'
      }]

      insertWithTenant.mockResolvedValue({ data: returnedDBClient, error: null })

      const res = await clientService.createClient(newClientData)

      // Verificamos payload de base de datos
      const insertCall = insertWithTenant.mock.calls[0]
      expect(insertCall[0]).toBe('clients')
      expect(insertCall[1].company_name).toBe('New Corp') // mapeado a snake_case para enviar a bd
      expect(insertCall[1].taxpayer_type).toBe('JURIDICA')

      // Verificamos respuesta transformada
      expect(res.id).toBe('new-id')
      expect(res.companyName).toBe('New Corp')
    })

    it('devuelve success: false si hay error en la inserción', async () => {
      insertWithTenant.mockResolvedValue({ data: null, error: new Error('Network error') })
      
      const res = await clientService.createClient({ companyName: 'Fail Corp' })
      expect(res.success).toBe(false)
      expect(res.message).toBeDefined()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 3: Actualización y Borrado (Soft Delete)
  // ═════════════════════════════════════════════════════════════
  describe('updateClient y deleteClient', () => {
    it('updateClient envía los campos correctamente formateados', async () => {
      updateWithTenant.mockResolvedValue({ data: [{ id: '1' }], error: null })

      await clientService.updateClient('client-1', {
        companyName: 'Updated Corp',
        status: 'INACTIVO'
      })

      const updateCall = updateWithTenant.mock.calls[0]
      expect(updateCall[0]).toBe('clients')
      expect(updateCall[1]).toBe('client-1')
      expect(updateCall[2].company_name).toBe('Updated Corp')
      expect(updateCall[2].status).toBe('INACTIVO')
    })

    it('deleteClient realiza un soft delete (cambia status a INACTIVO)', async () => {
      updateWithTenant.mockResolvedValue({ data: [{ id: '1' }], error: null })

      const res = await clientService.deleteClient('client-1')

      const updateCall = updateWithTenant.mock.calls[0]
      expect(updateCall[0]).toBe('clients')
      expect(updateCall[1]).toBe('client-1')
      expect(updateCall[2].status).toBe('INACTIVO')
      
      expect(res.status).toBe('INACTIVO')
    })
  })
})
