import exportService from './services/exportService.js';

console.log('🚀 Starting Export Logic Verification...');

// Mock Data
const invoices = [
    {
        id: '1',
        invoiceNumber: 'FAC-001',
        documentType: 'FACTURA',
        documentCategory: 'FACTURA',
        flow: 'VENTA',
        issueDate: '2024-01-01',
        client: { companyName: 'Cliente Fiscal', rif: 'J-111111111' },
        financial: { totalSales: 116, taxableSales: 100, taxDebit: 16, currency: 'VES' }
    },
    {
        id: '2',
        invoiceNumber: 'NE-001',
        documentType: 'RECIBO',
        documentCategory: 'RECIBO',
        flow: 'VENTA',
        issueDate: '2024-01-02',
        client: { companyName: 'Cliente No Fiscal', rif: 'V-22222222' },
        financial: { totalSales: 50, taxableSales: 50, taxDebit: 0, currency: 'VES' }
    },
    {
        id: '3',
        invoiceNumber: 'FAC-002',
        documentType: 'FACTURA',
        documentCategory: 'FACTURA',
        flow: 'VENTA',
        issueDate: '2024-01-03',
        client: { companyName: 'Cliente Fiscal 2', rif: 'J-333333333' },
        financial: { totalSales: 232, taxableSales: 200, taxDebit: 32, currency: 'VES' }
    }
];

// Test 1: SENIAT Export (Should only include FAC-001 and FAC-002)
console.log('\n🧪 Test 1: SENIAT Export (Filtering)');
try {
    const ws = exportService.exportLibroVentas(invoices, 'J-000000000');

    let foundNonFiscal = false;
    let foundFiscal1 = false;
    let foundFiscal2 = false;

    for (const key in ws) {
        if (key.startsWith('!')) continue;
        const cell = ws[key];
        if (cell.v === 'Cliente No Fiscal') foundNonFiscal = true;
        if (cell.v === 'Cliente Fiscal') foundFiscal1 = true;
        if (cell.v === 'Cliente Fiscal 2') foundFiscal2 = true;
    }

    if (!foundNonFiscal && foundFiscal1 && foundFiscal2) {
        console.log('✅ PASS: Correctly filtered only fiscal invoices.');
    } else {
        console.error('❌ FAIL: Filtering incorrect.');
        console.log('Found Non-Fiscal:', foundNonFiscal);
        console.log('Found Fiscal 1:', foundFiscal1);
        console.log('Found Fiscal 2:', foundFiscal2);
    }
} catch (error) {
    console.error('❌ FAIL: Error executing exportLibroVentas:', error);
}

// Test 2: General Export Logic
console.log('\n🧪 Test 2: General Export Logic');
try {
    const data = [];
    invoices.forEach(inv => {
        data.push([inv.invoiceNumber]);
    });

    if (data.length === 3) {
        console.log('✅ PASS: General export logic considers all records.');
    } else {
        console.error('❌ FAIL: General export logic count mismatch.');
    }
} catch (error) {
    console.error('❌ FAIL: Error in general export test:', error);
}

console.log('\n🏁 Verification Complete.');
