// RIFs y nombres inventados. Nunca datos reales.
export const cliente = { rif: 'J-12345678-9', es_contribuyente_especial: true }

export function retIva(extra = {}) {
  return {
    id: 'r1',
    invoice_id: 'f1',
    tipo: 'IVA',
    numero_comprobante: '20261000000001',
    fecha_comprobante: '2026-10-07',
    porcentaje_retencion: 75,
    base_imponible: 1000,
    monto_iva: 160,
    monto_retenido: 120,
    proveedor_id: 'p1',
    proveedor_nombre: 'Distribuidora Ejemplo C.A.',
    proveedor_rif: 'J-30111222-3',
    factura_numero: '123',
    factura_control: '00-000456',
    factura_fecha: '2026-10-05',
    document_type: 'FACTURA',
    total: 1160,
    exento: 0,
    ...extra,
  }
}

export function retIslr(extra = {}) {
  return {
    id: 'i1',
    invoice_id: 'f2',
    tipo: 'ISLR',
    numero_comprobante: '20261000000002',
    fecha_comprobante: '2026-10-20',
    porcentaje_retencion: 5,
    base_imponible: 2000,
    monto_retenido: 100,
    sustraendo_ut: 0,
    valor_ut: 9,
    proveedor_id: 'p2',
    proveedor_nombre: 'Servicios Pérez & Hijos',
    proveedor_rif: 'J-40222333-4',
    factura_numero: 'A-1234',
    factura_control: '00-5678',
    factura_fecha: '2026-10-15',
    concepto_islr_id: 'c2',
    concepto_islr_nombre: 'Honorarios Profesionales (Jurídicas)',
    codigo_seniat: '002',
    ...extra,
  }
}
