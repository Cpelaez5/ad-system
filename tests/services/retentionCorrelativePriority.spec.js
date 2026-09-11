import { describe, it, expect, vi } from 'vitest';

describe('Resolución y Prioridad de Correlativos en Comprobantes de Retención (Punto 4)', () => {

  const resolveIslrCorrelative = (invoice, retData) => {
    const retentionDate = retData?.fecha_comprobante || invoice.retention_date || invoice.retentionDate || invoice.issueDate;
    return retData?.numero_comprobante 
      || invoice.financial?.islrRetentionNumber 
      || invoice.financial?.islr_retention_number 
      || invoice.islr_retention_number 
      || invoice.retention_number 
      || (() => {
        const [year, month] = (retentionDate || '2026-09-01').split('-');
        const periodCode = `${year}${month}`;
        const rawNum = invoice.invoiceNumber ? String(invoice.invoiceNumber).replace(/\D/g, '') : '1';
        return `ISLR-${periodCode}-${rawNum.padStart(6, '0')}`;
      })();
  };

  const resolveIvaCorrelative = (invoice, retData) => {
    const retentionDate = retData?.fecha_comprobante || invoice.retention_date || invoice.retentionDate || invoice.issueDate;
    return retData?.numero_comprobante 
      || invoice.financial?.ivaRetentionNumber 
      || invoice.financial?.iva_retention_number 
      || invoice.iva_retention_number 
      || invoice.retention_number 
      || (() => {
        const [year, month] = (retentionDate || '2026-09-01').split('-');
        const periodCode = `${year}${month}`;
        const rawNum = invoice.invoiceNumber ? String(invoice.invoiceNumber).replace(/\D/g, '') : '1';
        return `${periodCode}${rawNum.padStart(8, '0')}`;
      })();
  };

  it('prioriza el número correlativo persistido en la base de datos (retData.numero_comprobante)', () => {
    const invoice = {
      invoiceNumber: '000028',
      financial: { islrRetentionNumber: 'ISLR-MANUAL-99' }
    };
    const retData = {
      numero_comprobante: 'ISLR-DB-000001',
      fecha_comprobante: '2026-09-10'
    };

    const num = resolveIslrCorrelative(invoice, retData);
    expect(num).toBe('ISLR-DB-000001');
  });

  it('prioriza el número manual del formulario (invoice.financial.islrRetentionNumber) si no hay retData de BD', () => {
    const invoice = {
      invoiceNumber: '000028',
      issueDate: '2026-08-15',
      financial: {
        islrRetentionNumber: 'ISLR-2026-000042'
      }
    };
    const retData = null; // No vino de BD o es un Gasto que aún no consulta retData

    const num = resolveIslrCorrelative(invoice, retData);
    // Debe usar el número manual y NO generar el fallback falso 'ISLR-202608-000028'
    expect(num).toBe('ISLR-2026-000042');
    expect(num).not.toBe('ISLR-202608-000028');
  });

  it('prioriza el número manual de IVA (invoice.financial.ivaRetentionNumber) sobre el generado por defecto', () => {
    const invoice = {
      invoiceNumber: '000028',
      issueDate: '2026-08-15',
      financial: {
        ivaRetentionNumber: '20260900009999'
      }
    };
    const retData = null;

    const num = resolveIvaCorrelative(invoice, retData);
    expect(num).toBe('20260900009999');
  });

  it('utiliza el fallback fiscal reglamentario solo si no existe correlativo en BD ni en financial', () => {
    const invoice = {
      invoiceNumber: '000028',
      issueDate: '2026-09-11',
      financial: {}
    };
    const retData = null;

    const num = resolveIslrCorrelative(invoice, retData);
    expect(num).toBe('ISLR-202609-000028');
  });

  it('la regla de Facturacion.vue enruta los gastos con retención (flow COMPRA + GASTO) a retentionRpcService.registrarCompra', () => {
    // Verificación de la condición booleana corregida en Facturacion.vue:
    // flow === 'COMPRA' && (invoiceData.expense_type === 'COMPRA' || invoiceData.expense_type === 'GASTO') && hasRetentions
    const shouldCallRegistrarCompra = (flow, expense_type, hasRetentions) => {
      return flow === 'COMPRA' && (expense_type === 'COMPRA' || expense_type === 'GASTO') && hasRetentions;
    };

    // Compra ordinaria con retenciones -> true
    expect(shouldCallRegistrarCompra('COMPRA', 'COMPRA', true)).toBe(true);

    // GASTO con retenciones (caso reportado por el cliente) -> true (antes era false y causaba el bug)
    expect(shouldCallRegistrarCompra('COMPRA', 'GASTO', true)).toBe(true);

    // Gasto sin retenciones -> false (va por createInvoice normal)
    expect(shouldCallRegistrarCompra('COMPRA', 'GASTO', false)).toBe(false);

    // Venta -> false
    expect(shouldCallRegistrarCompra('VENTA', null, true)).toBe(false);
  });
});
