// Datos FICTICIOS para generar las muestras de documentos (nunca datos reales).
export const factura = {
  id: 'fake-1',
  flow: 'COMPRA',
  documentType: 'FACTURA',
  invoiceNumber: '00012345',
  controlNumber: '00-00067890',
  issueDate: '2026-10-01',
  fecha_fiscal: '2026-10-01',
  status: 'EMITIDA',
  dueDate: '2026-10-31',
  notes: 'Pago acordado a 30 días. Entrega en el depósito principal; confirmar la recepción con el encargado de turno antes de firmar la nota de entrega.',
  issuer: {
    id: 'p-1',
    companyName: 'Distribuidora Los Andes de Alimentos y Productos de Consumo Masivo, C.A.',
    razon_social: 'Distribuidora Los Andes de Alimentos y Productos de Consumo Masivo, C.A.',
    rif: 'J-12345678-9',
    direccion: 'Av. Principal de Los Ruices, Edificio Centro Empresarial Los Ruices, Piso 3, Oficina 3-B, Urbanización Los Ruices, Caracas, Distrito Capital, Venezuela',
    address: 'Av. Principal de Los Ruices, Edificio Centro Empresarial Los Ruices, Piso 3, Oficina 3-B, Caracas',
    telefono: '0212-5551234',
    phone: '0212-5551234',
    municipio_id: 'Sucre',
    email: 'ventas@losandes.example',
  },
  client: {
    id: 'c-1',
    companyName: 'Bodega La Esquina Feliz, C.A.',
    razon_social: 'Bodega La Esquina Feliz, C.A.',
    rif: 'J-98765432-1',
    address: 'Calle 5, Casa 12, Sector El Paraíso, Caracas',
    direccion: 'Calle 5, Casa 12, Sector El Paraíso, Caracas',
    municipio_id: 'Libertador',
    phone: '0414-5557890',
    email: 'laesquina@example.com',
  },
  financial: {
    currency: 'VES',
    exemptSales: 1500.5,
    nonTaxableSales: 1500.5,
    taxableSales: 104036.77,
    taxDebit: 16645.88,
    totalSales: 122183.15,
    ivaRetention: 12484.41,
    islrRetention: 2080.74,
    municipalRetention: 1040.37,
    igtf: 0,
    exchangeRate: 104.03677,
    tasas: { USD: 104.03677 },
  },
  items: [
    { description: 'Harina de maíz precocida 1 kg (caja de 20 unidades)', quantity: 10, unitPrice: 5200.5, total: 52005 },
    { description: 'Aceite vegetal 900 ml (24 unidades)', quantity: 1, unitPrice: 52031.77, total: 52031.77 },
    { description: 'Servicio de flete y entrega a domicilio dentro del área metropolitana de Caracas', quantity: 1, unitPrice: 1500.5, total: 1500.5 },
  ],
}

export const companyInfo = {
  name: 'Bodega La Esquina Feliz, C.A.',
  rif: 'J-98765432-1',
  address: 'Calle 5, Casa 12, Sector El Paraíso, Caracas',
  phone: '0414-5557890',
  municipio: 'Libertador',
  licencia: 'LAE-2020-001234',
}

export const facturaVenta = {
  ...factura,
  flow: 'VENTA',
  id: 'fake-2',
  invoiceNumber: '00000077',
  financial: { ...factura.financial, ivaRetentionNumber: '20261000000123' },
}

// Filas de la tabla `retenciones` (la rama real de los PDF las lee de ahí).
export const retenciones = {
  IVA: {
    id: 'r1',
    numero_comprobante: '20261000000123',
    fecha_comprobante: '2026-10-05',
    porcentaje_retencion: 75,
    base_imponible: 104036.77,
    monto_retenido: 12484.41,
    monto_iva: 16645.88,
    proveedor_nombre: 'Distribuidora Los Andes de Alimentos y Productos de Consumo Masivo, C.A.',
    proveedor_rif: 'J-12345678-9',
    factura_numero: '00012345',
    factura_control: '00-00067890',
    factura_fecha: '2026-10-01',
  },
  ISLR: {
    id: 'r2',
    numero_comprobante: '20261000000124',
    fecha_comprobante: '2026-10-05',
    porcentaje_retencion: 2,
    base_imponible: 104036.77,
    monto_retenido: 2080.74,
    sustraendo_ut: 0,
    valor_ut: 9,
    proveedor_nombre: 'Distribuidora Los Andes de Alimentos y Productos de Consumo Masivo, C.A.',
    proveedor_rif: 'J-12345678-9',
    factura_numero: '00012345',
    factura_control: '00-00067890',
    factura_fecha: '2026-10-01',
    concepto_islr: { codigo: '055', nombre: 'Servicios', porcentaje_retencion: 2 },
    concepto_islr_nombre: 'Servicios - 055',
  },
  MUNICIPAL: {
    id: 'r3',
    numero_comprobante: '20261000000125',
    fecha_comprobante: '2026-10-05',
    porcentaje_retencion: 1,
    base_imponible: 104036.77,
    monto_retenido: 1040.37,
    proveedor_nombre: 'Distribuidora Los Andes de Alimentos y Productos de Consumo Masivo, C.A.',
    proveedor_rif: 'J-12345678-9',
    factura_numero: '00012345',
    factura_control: '00-00067890',
    factura_fecha: '2026-10-01',
    licencia_actividad: 'LAE-2020-001234',
    municipio_id: 'Libertador',
  },
}

export const libroCompras = [factura, { ...factura, id: 'fake-3', invoiceNumber: '00012346', issueDate: '2026-10-09', fecha_fiscal: '2026-10-09', issuer: { ...factura.issuer, companyName: 'Ferretería El Tornillo, C.A.', rif: 'J-11223344-5' }, financial: { ...factura.financial, exemptSales: 0, taxableSales: 5000, taxDebit: 800, totalSales: 5800, ivaRetention: 600, islrRetention: 0, municipalRetention: 0 } }]
export const libroVentas = [facturaVenta, { ...facturaVenta, id: 'fake-4', invoiceNumber: '00000078', issueDate: '2026-10-12', client: { ...facturaVenta.client, companyName: 'Cliente General', rif: '' }, financial: { ...facturaVenta.financial, exemptSales: 0, taxableSales: 2000, taxDebit: 320, totalSales: 2320, ivaRetention: 0, islrRetention: 0, municipalRetention: 0, ivaRetentionNumber: '' } }]

export const papeles = {
  selectedYear: 2026,
  progressRate: 62,
  clientName: 'Bodega La Esquina Feliz, C.A.',
  clientRif: 'J-98765432-1',
}
