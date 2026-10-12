/**
 * C1 (2026-10-13) — docs/mvp/backlog-contadora-2026-10-12.md punto 1:
 * El filtro de exportación por mes (usado para el Libro de Compras) debe usar
 * `fecha_fiscal` cuando exista en una factura de COMPRA, con fallback a
 * `issueDate`. Las VENTAS siguen filtrándose por issueDate (no se les pidió
 * fecha fiscal).
 */
vi.mock('/Cashea-black-icon.svg', () => ({ default: 'mock-cashea.svg' }));
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));

import { describe, it, expect } from 'vitest';
import Facturacion from '@/views/cliente/Facturacion.vue';

function buildVm() {
  return {
    exportDateMode: 'month',
    exportMonthDate: { month: 8, year: 2026 }, // Septiembre (0-indexed)
    exportDateRange: null,
    exportDateError: ''
  };
}

describe('Facturacion.vue.applyDateFilterToInvoices() — filtro por fecha_fiscal (C1)', () => {
  it('filtra una COMPRA por fecha_fiscal (septiembre) aunque issueDate sea de agosto', () => {
    const vm = buildVm();
    const invoices = [
      { id: 'c1', flow: 'COMPRA', issueDate: '2026-08-31', fecha_fiscal: '2026-09-02' },
      { id: 'c2', flow: 'COMPRA', issueDate: '2026-08-15' } // sin fecha_fiscal, se queda en agosto
    ];

    const result = Facturacion.methods.applyDateFilterToInvoices.call(vm, invoices);

    expect(result.map(i => i.id)).toEqual(['c1']);
  });

  it('usa issueDate como fallback en COMPRA cuando no hay fecha_fiscal', () => {
    const vm = buildVm();
    vm.exportMonthDate = { month: 7, year: 2026 }; // Agosto
    const invoices = [
      { id: 'c1', flow: 'COMPRA', issueDate: '2026-08-15' } // sin fecha_fiscal
    ];

    const result = Facturacion.methods.applyDateFilterToInvoices.call(vm, invoices);

    expect(result.map(i => i.id)).toEqual(['c1']);
  });

  it('una VENTA sigue filtrándose por issueDate aunque tenga fecha_fiscal (no aplica a ventas)', () => {
    const vm = buildVm();
    const invoices = [
      { id: 'v1', flow: 'VENTA', issueDate: '2026-08-31', fecha_fiscal: '2026-09-02' }
    ];

    // exportMonthDate = Septiembre; como es VENTA, se ignora fecha_fiscal y se usa
    // issueDate (agosto) → no debe aparecer en el filtro de septiembre.
    const result = Facturacion.methods.applyDateFilterToInvoices.call(vm, invoices);

    expect(result).toEqual([]);
  });
});
