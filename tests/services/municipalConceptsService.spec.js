import { describe, it, expect, vi, beforeEach } from 'vitest';
import { municipalConceptsService } from '../../src/services/municipalConceptsService';
import { supabase } from '../../src/lib/supabaseClient';
import { getCurrentOrganizationId } from '../../src/utils/tenantHelpers';

vi.mock('../../src/lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis()
      }))
    }
  };
});

vi.mock('../../src/utils/tenantHelpers', () => {
  return {
    getCurrentOrganizationId: vi.fn(() => 'org-1')
  };
});

describe('MunicipalConceptsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all active concepts', async () => {
    const mockData = [{ id: '1', codigo: '001', porcentaje: 5, status: 'ACTIVO' }];
    
    const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const eqStatusMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqStatusMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock });
    
    supabase.from.mockReturnValue({ select: selectMock });

    const result = await municipalConceptsService.getConcepts();
    expect(supabase.from).toHaveBeenCalledWith('conceptos_municipales');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqOrgMock).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(eqStatusMock).toHaveBeenCalledWith('status', 'ACTIVO');
    expect(orderMock).toHaveBeenCalledWith('codigo', { ascending: true });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  it('should create a new concept', async () => {
    const conceptData = { codigo: '002', descripcion: 'Comercio', porcentaje: 3 };
    const mockCreated = { id: '2', ...conceptData };
    
    const singleMock = vi.fn().mockResolvedValue({ data: mockCreated, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    
    supabase.from.mockReturnValue({ insert: insertMock });

    const result = await municipalConceptsService.createConcept(conceptData);
    expect(supabase.from).toHaveBeenCalledWith('conceptos_municipales');
    expect(insertMock).toHaveBeenCalledWith([{
      organization_id: 'org-1',
      codigo: '002',
      descripcion: 'Comercio',
      porcentaje: 3,
      status: 'ACTIVO'
    }]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCreated);
  });

  it('should soft delete a concept by updating status to INACTIVO', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { id: '1', status: 'INACTIVO' }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqOrgMock = vi.fn().mockReturnValue({ select: selectMock });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqOrgMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    
    supabase.from.mockReturnValue({ update: updateMock });

    const result = await municipalConceptsService.deleteConcept('1');
    expect(supabase.from).toHaveBeenCalledWith('conceptos_municipales');
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'INACTIVO' }));
    expect(eqIdMock).toHaveBeenCalledWith('id', '1');
    expect(eqOrgMock).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(result.success).toBe(true);
  });
});
