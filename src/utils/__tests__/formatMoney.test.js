import { describe, it, expect } from 'vitest';
import { formatMoney, formatTasa, parseMontoVenezolano } from '../formatMoney';

describe('formatMoney', () => {
    it('formatea montos básicos en USD por defecto', () => {
        expect(formatMoney(1250)).toBe('$ 1.250,00');
        expect(formatMoney(1250.5)).toBe('$ 1.250,50');
    });

    it('formatea montos en VES', () => {
        expect(formatMoney(36.5, 'VES')).toBe('Bs 36,50');
        expect(formatMoney(1000, 'VES')).toBe('Bs 1.000,00');
    });

    it('formatea montos en EUR', () => {
        expect(formatMoney(10, 'EUR')).toBe('€ 10,00');
    });

    it('maneja valores nulos, indefinidos e inválidos retornando —', () => {
        expect(formatMoney(null)).toBe('—');
        expect(formatMoney(undefined)).toBe('—');
        expect(formatMoney(NaN)).toBe('—');
        expect(formatMoney('')).toBe('—');
        expect(formatMoney('   ')).toBe('—');
        expect(formatMoney('abc')).toBe('—');
    });

    it('maneja números negativos colocando el signo menos al inicio', () => {
        expect(formatMoney(-5)).toBe('-$ 5,00');
        expect(formatMoney(-1250.5, 'VES')).toBe('-Bs 1.250,50');
    });

    it('soporta la opción sinDecimales', () => {
        expect(formatMoney(1250, 'USD', { sinDecimales: true })).toBe('$ 1.250');
        expect(formatMoney(1250.5, 'USD', { sinDecimales: true })).toBe('$ 1.251'); // toFixed(0) redondea
    });

    it('soporta la opción abreviar para millones y miles de millones', () => {
        // Mayores a 1 millón
        expect(formatMoney(1000000, 'VES', { abreviar: true })).toBe('Bs 1,0 millones');
        expect(formatMoney(20500000, 'VES', { abreviar: true })).toBe('Bs 20,5 millones');
        // Mayores a 1000 millones
        expect(formatMoney(1500000000, 'USD', { abreviar: true })).toBe('$ 1,5 mil millones');
        // Menores a 1 millón (sin abreviar)
        expect(formatMoney(999999, 'USD', { abreviar: true })).toBe('$ 999.999,00');
        // Negativos abreviados
        expect(formatMoney(-1500000, 'VES', { abreviar: true })).toBe('-Bs 1,5 millones');
    });
});

describe('formatTasa', () => {
    it('formatea la tasa correctamente como VES y 2 decimales', () => {
        expect(formatTasa(36.5)).toBe('Bs 36,50');
        expect(formatTasa(36.123)).toBe('Bs 36,12');
        expect(formatTasa(1000)).toBe('Bs 1.000,00');
    });
});

describe('parseMontoVenezolano', () => {
    it('parsea strings con coma como separador decimal', () => {
        expect(parseMontoVenezolano('1.250,50')).toBe(1250.5);
        expect(parseMontoVenezolano('1250,50')).toBe(1250.5);
        expect(parseMontoVenezolano('-5,00')).toBe(-5);
    });

    it('parsea strings con punto como separador decimal', () => {
        expect(parseMontoVenezolano('1250.50')).toBe(1250.5);
        expect(parseMontoVenezolano('1,250.50')).toBe(1250.5);
    });

    it('remueve símbolos de moneda y espacios correctamente', () => {
        expect(parseMontoVenezolano('$ 1.250,50')).toBe(1250.5);
        expect(parseMontoVenezolano('Bs 36,5')).toBe(36.5);
        expect(parseMontoVenezolano('€ 10,00')).toBe(10);
        expect(parseMontoVenezolano('-$ 5,00')).toBe(-5);
        expect(parseMontoVenezolano('  Bs   1.250,50  ')).toBe(1250.5);
    });

    it('maneja valores numéricos, no numéricos o vacíos devolviendo NaN cuando corresponde', () => {
        expect(parseMontoVenezolano(1250.5)).toBe(1250.5);
        expect(Number.isNaN(parseMontoVenezolano('abc'))).toBe(true);
        expect(Number.isNaN(parseMontoVenezolano(null))).toBe(true);
        expect(Number.isNaN(parseMontoVenezolano(''))).toBe(true);
        expect(Number.isNaN(parseMontoVenezolano('   '))).toBe(true);
    });

    it('parsea correctamente con miles múltiples', () => {
        expect(parseMontoVenezolano('1.000.000,50')).toBe(1000000.5);
        expect(parseMontoVenezolano('Bs 1.000.000.000,99')).toBe(1000000000.99);
    });
});

describe('parseMontoVenezolano — punto como separador de miles', () => {
  it('interpreta "1.250" y "1.250.000" como miles (formato venezolano)', () => {
    expect(parseMontoVenezolano('1.250')).toBe(1250)
    expect(parseMontoVenezolano('1.250.000')).toBe(1250000)
  })
  it('mantiene "1250.50" y "12.5" como decimales', () => {
    expect(parseMontoVenezolano('1250.50')).toBe(1250.5)
    expect(parseMontoVenezolano('12.5')).toBe(12.5)
  })
})
