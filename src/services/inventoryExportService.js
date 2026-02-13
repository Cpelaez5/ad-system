import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

class InventoryExportService {

    /**
     * Exporta el inventario valorizado a Excel
     * @param {Array} products Lista de productos con stock y precios
     * @param {String} organizationName Nombre de la empresa
     */
    async exportValuation(products, organizationName = 'Mi Empresa') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario Valorizado');

        // Estilos
        const titleStyle = { font: { bold: true, size: 16 } };
        const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F355C' } } };
        const currencyFormat = '"Bs" #,##0.00';

        // Títulos
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').value = organizationName;
        worksheet.getCell('A1').font = { size: 12 };

        worksheet.mergeCells('A2:G2');
        worksheet.getCell('A2').value = 'INVENTARIO VALORIZADO AL ' + new Date().toLocaleDateString();
        worksheet.getCell('A2').style = titleStyle;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        // Encabezados
        worksheet.getRow(4).values = ['Código', 'Producto', 'Unidad', 'Stock Actual', 'Costo Unit.', 'Val. Costo Total', 'Val. Venta Total'];
        worksheet.getRow(4).eachCell((cell) => {
            cell.style = headerStyle;
            cell.alignment = { horizontal: 'center' };
        });

        // Datos
        let totalCost = 0;
        let totalSale = 0;

        products.forEach((p, index) => {
            const rowIdx = 5 + index;
            const stock = Number(p.stock) || 0;
            const cost = Number(p.cost_price) || 0;
            const sale = Number(p.sale_price) || 0;
            const totalC = stock * cost;
            const totalS = stock * sale;

            totalCost += totalC;
            totalSale += totalS;

            const row = worksheet.getRow(rowIdx);
            row.values = [
                p.code,
                p.name,
                p.unit,
                stock,
                cost,
                totalC,
                totalS
            ];

            // Formatos
            row.getCell(5).numFmt = currencyFormat;
            row.getCell(6).numFmt = currencyFormat;
            row.getCell(7).numFmt = currencyFormat;
        });

        // Totales
        const lastRow = 5 + products.length;
        worksheet.getRow(lastRow).values = ['', '', '', 'TOTALES:', '', totalCost, totalSale];
        worksheet.getRow(lastRow).font = { bold: true };
        worksheet.getRow(lastRow).getCell(6).numFmt = currencyFormat;
        worksheet.getRow(lastRow).getCell(7).numFmt = currencyFormat;

        // Ajustar columnas
        worksheet.columns = [
            { width: 15 },
            { width: 40 },
            { width: 10 },
            { width: 15 },
            { width: 15 },
            { width: 20 },
            { width: 20 }
        ];

        // Generar archivo
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Inventario_Valorizado_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    /**
     * Exporta Kardex (Movimientos)
     */
    async exportMovements(movements, productName = 'Todos') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Kardex');

        // Headers
        worksheet.columns = [
            { header: 'Fecha', key: 'date', width: 20 },
            { header: 'Tipo', key: 'type', width: 20 },
            { header: 'Producto', key: 'product', width: 30 },
            { header: 'Entrada', key: 'in', width: 12 },
            { header: 'Salida', key: 'out', width: 12 },
            { header: 'Referencia', key: 'ref', width: 25 },
            { header: 'Usuario', key: 'user', width: 20 }
        ];

        // Style headers
        worksheet.getRow(1).font = { bold: true };

        movements.forEach(m => {
            const isIn = m.quantity > 0;
            worksheet.addRow({
                date: new Date(m.created_at).toLocaleString(),
                type: m.movement_type,
                product: m.products?.name || 'Unknown',
                in: isIn ? m.quantity : '',
                out: !isIn ? Math.abs(m.quantity) : '',
                ref: m.description,
                user: 'Sistema' // TODO: Add user info if available
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Kardex_${productName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    async exportHorizontalSummary(products, movements, dateRange) {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Resumen Horizontal');

        // Headers
        ws.addRow(['Código', 'Producto', 'Stock Inicial', 'Entradas', 'Salidas', 'Autoconsumo', 'Stock Final']);
        ws.getRow(1).font = { bold: true };

        const summary = {};
        products.forEach(p => summary[p.id] = { p, init: 0, in: 0, out: 0, self: 0 });

        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime();

        movements.forEach(m => {
            if (!summary[m.product_id]) return;
            const entry = summary[m.product_id];
            const dt = new Date(m.created_at).getTime();
            const qty = Number(m.quantity);

            if (dt < start) {
                entry.init += qty;
            } else if (dt <= end) {
                if (qty > 0) entry.in += qty;
                else {
                    if (m.movement_type === 'OUT_SELF_CONSUMPTION') entry.self += Math.abs(qty);
                    else entry.out += Math.abs(qty);
                }
            }
        });

        Object.values(summary).forEach(({ p, init, in: inp, out, self }) => {
            ws.addRow([p.code, p.name, init, inp, out, self, (init + inp - out - self)]);
        });

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `Resumen_Inv_${dateRange.start}_${dateRange.end}.xlsx`);
    }
}

export default new InventoryExportService();
