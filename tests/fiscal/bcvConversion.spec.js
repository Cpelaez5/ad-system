/**
 * TESTS GOLDEN (caracterización) — Conversión de moneda con tasa BCV.
 * F1 Red de seguridad, Agente Fiscal Venezuela.
 *
 * Cubre bcvService.convertUSDToVES() y convertEURToVES(), que son los únicos
 * puntos del servicio que hacen la multiplicación monto × tasa. Se mockea
 * getCurrentRate() (que internamente hace scraping/Edge Function/DB) para
 * aislar la aritmética pura.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import bcvService from '@/services/bcvService.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bcvService.convertUSDToVES() — conversión USD → Bs con tasa del día', () => {
  it('multiplica el monto en USD por la tasa oficial del dólar vigente', async () => {
    vi.spyOn(bcvService, 'getCurrentRate').mockResolvedValue({
      success: true,
      data: { dollar: 45.231, euro: 48.9, date: '2026-09-01', source: 'BCV oficial' }
    });

    const res = await bcvService.convertUSDToVES(100);

    expect(res.success).toBe(true);
    expect(res.data.rate).toBe(45.231);
    // 100 * 45.231 = 4523.1
    expect(res.data.vesAmount).toBeCloseTo(4523.1, 5);
  });

  it('devuelve success:false si no hay tasa disponible', async () => {
    vi.spyOn(bcvService, 'getCurrentRate').mockResolvedValue({ success: false });

    const res = await bcvService.convertUSDToVES(100);

    expect(res.success).toBe(false);
  });
});

describe('bcvService.convertEURToVES() — conversión EUR → Bs con tasa del día', () => {
  it('multiplica el monto en EUR por la tasa oficial del euro vigente', async () => {
    vi.spyOn(bcvService, 'getCurrentRate').mockResolvedValue({
      success: true,
      data: { dollar: 45.231, euro: 48.9, date: '2026-09-01', source: 'BCV oficial' }
    });

    const res = await bcvService.convertEURToVES(50);

    expect(res.success).toBe(true);
    expect(res.data.rate).toBe(48.9);
    // 50 * 48.9 = 2445
    expect(res.data.vesAmount).toBe(2445);
  });

  it('devuelve success:false si la respuesta no trae tasa de euro (fuente solo reporta USD)', async () => {
    vi.spyOn(bcvService, 'getCurrentRate').mockResolvedValue({
      success: true,
      data: { dollar: 45.231, euro: null, date: '2026-09-01' }
    });

    const res = await bcvService.convertEURToVES(50);

    expect(res.success).toBe(false);
    expect(res.error).toBe('Sin tasa EUR');
  });
});

describe('bcvService.formatRate() — formato de visualización de la tasa', () => {
  it('retorna "N/A" para tasas nulas, cero o indefinidas', () => {
    expect(bcvService.formatRate(null)).toBe('N/A');
    expect(bcvService.formatRate(0)).toBe('N/A');
    expect(bcvService.formatRate(undefined)).toBe('N/A');
  });

  it('formatea una tasa numérica como moneda VES con 4 decimales', () => {
    const formatted = bcvService.formatRate(45.231);
    // Intl.NumberFormat con currency VES; verificamos que preserve los decimales
    expect(formatted).toContain('45,2310'.split(',')[0]); // al menos la parte entera "45"
    expect(formatted).toMatch(/45,2310/);
  });
});
