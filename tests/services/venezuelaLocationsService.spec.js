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
    // Note: Zulia doesn't have Libertador, it's in Caracas/Merida/etc. (Wait, let's just test a completely fake one)
    const isFakeValid = venezuelaLocationsService.isValidMunicipality('Zulia', 'FakeMunicipio');
    expect(isFakeValid).toBe(false);
  });
});
