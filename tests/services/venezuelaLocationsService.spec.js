import { describe, it, expect } from 'vitest';
import venezuelaLocationsService from '../../src/services/venezuelaLocationsService';

describe('VenezuelaLocationsService', () => {
  it('should return a list of states', () => {
    const states = venezuelaLocationsService.getStates();
    expect(states).toBeInstanceOf(Array);
    expect(states.length).toBeGreaterThan(0);
    expect(states).toContain('Distrito Capital');
    expect(states).toContain('Zulia');
  });

  it('should return municipalities for a given state', () => {
    const municipalities = venezuelaLocationsService.getMunicipalities('Distrito Capital');
    expect(municipalities).toBeInstanceOf(Array);
    expect(municipalities.length).toBeGreaterThan(0);
    expect(municipalities).toContain('Libertador');
  });

  it('should return an empty array if state is not found', () => {
    const municipalities = venezuelaLocationsService.getMunicipalities('Estado Inexistente');
    expect(municipalities).toBeInstanceOf(Array);
    expect(municipalities.length).toBe(0);
  });

  it('should validate a correct municipality for a state', () => {
    const isValid = venezuelaLocationsService.isValidMunicipality('Zulia', 'Maracaibo');
    expect(isValid).toBe(true);
  });

  it('should invalidate an incorrect municipality for a state', () => {
    const isValid = venezuelaLocationsService.isValidMunicipality('Zulia', 'Libertador');
    const isFakeValid = venezuelaLocationsService.isValidMunicipality('Zulia', 'FakeMunicipio');
    expect(isFakeValid).toBe(false);
  });

  describe('areSameMunicipality', () => {
    it('returns true for identical municipality names (case-insensitive)', () => {
      expect(venezuelaLocationsService.areSameMunicipality('Chacao', 'Chacao')).toBe(true);
      expect(venezuelaLocationsService.areSameMunicipality('chacao', 'CHACAO')).toBe(true);
      expect(venezuelaLocationsService.areSameMunicipality('  Baruta  ', 'baruta')).toBe(true);
    });

    it('returns true when comparing legacy UUID and slug for the same municipality', () => {
      // 4c5edabf-05e3-4601-922c-ec7f5e4dfeb0 -> Chacao (Miranda)
      // m-chacao -> Chacao (Miranda)
      expect(venezuelaLocationsService.areSameMunicipality('4c5edabf-05e3-4601-922c-ec7f5e4dfeb0', 'm-chacao')).toBe(true);
      // c8921e1d-5407-4cc4-87f3-04f9ce46920f -> Libertador (Distrito Capital)
      // m-libertador -> Libertador (Distrito Capital)
      expect(venezuelaLocationsService.areSameMunicipality('c8921e1d-5407-4cc4-87f3-04f9ce46920f', 'm-libertador')).toBe(true);
    });

    it('returns true when comparing clean name with formatted name including state', () => {
      expect(venezuelaLocationsService.areSameMunicipality('Chacao (Miranda)', 'Chacao')).toBe(true);
      expect(venezuelaLocationsService.areSameMunicipality('Maracaibo', 'Maracaibo (Zulia)')).toBe(true);
    });

    it('returns false for different municipalities', () => {
      expect(venezuelaLocationsService.areSameMunicipality('Chacao', 'Baruta')).toBe(false);
      expect(venezuelaLocationsService.areSameMunicipality('m-chacao', 'm-baruta')).toBe(false);
      expect(venezuelaLocationsService.areSameMunicipality('Libertador (Distrito Capital)', 'Maracaibo (Zulia)')).toBe(false);
      expect(venezuelaLocationsService.areSameMunicipality('4c5edabf-05e3-4601-922c-ec7f5e4dfeb0', 'ae0fd71e-a052-4755-9a2b-fa148caa96d5')).toBe(false);
    });

    it('returns false when either municipality is null, undefined or empty', () => {
      expect(venezuelaLocationsService.areSameMunicipality(null, 'Chacao')).toBe(false);
      expect(venezuelaLocationsService.areSameMunicipality('Chacao', null)).toBe(false);
      expect(venezuelaLocationsService.areSameMunicipality('', 'Chacao')).toBe(false);
      expect(venezuelaLocationsService.areSameMunicipality(undefined, undefined)).toBe(false);
    });
  });
});
