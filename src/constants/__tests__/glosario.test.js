import { describe, it, expect } from 'vitest';
import GLOSARIO from '../glosario.js';

describe('Glosario de Términos (Microcopy UX)', () => {
  it('debe exportar un objeto válido', () => {
    expect(typeof GLOSARIO).toBe('object');
    expect(GLOSARIO).not.toBeNull();
  });

  Object.entries(GLOSARIO).forEach(([key, value]) => {
    describe(`Término: ${key}`, () => {
      it('debe tener las propiedades requeridas y no estar vacías', () => {
        expect(typeof value.termino).toBe('string', 'termino debe ser string');
        expect(value.termino.trim().length).toBeGreaterThan(0, 'termino no debe estar vacío');
        
        expect(typeof value.simple).toBe('string', 'simple debe ser string');
        expect(value.simple.trim().length).toBeGreaterThan(0, 'simple no debe estar vacío');
        
        expect(typeof value.explicacion).toBe('string', 'explicacion debe ser string');
        expect(value.explicacion.trim().length).toBeGreaterThan(0, 'explicacion no debe estar vacía');
      });

      it('la propiedad "simple" debe tener un máximo de 5 palabras', () => {
        const words = value.simple.trim().split(/\s+/);
        expect(words.length).toBeLessThanOrEqual(5, `"${value.simple}" tiene ${words.length} palabras (máximo 5)`);
      });

      it('la propiedad "explicacion" debe tener un máximo de 2 frases', () => {
        // Separa por puntos (o !?), ignora los espacios en blanco que deja el punto final
        const frases = value.explicacion.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
        expect(frases.length).toBeLessThanOrEqual(2, `La explicación tiene ${frases.length} frases (máximo 2)`);
      });
    });
  });
});
