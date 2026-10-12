export function formatMoney(monto, moneda = 'USD', opciones = {}) {
    if (monto === null || monto === undefined || (typeof monto === 'string' && monto.trim() === '') || Number.isNaN(Number(monto))) {
        return '—';
    }
    
    let val = Number(monto);
    const isNegative = val < 0;
    val = Math.abs(val);

    let simbolo = '';
    if (moneda === 'USD') simbolo = '$';
    else if (moneda === 'VES') simbolo = 'Bs';
    else if (moneda === 'EUR') simbolo = '€';
    else simbolo = moneda;

    let abreviacion = '';
    let divisor = 1;

    if (opciones.abreviar) {
        if (val >= 1000000000) {
            divisor = 1000000000;
            abreviacion = ' mil millones';
        } else if (val >= 1000000) {
            divisor = 1000000;
            abreviacion = ' millones';
        }
    }

    val = val / divisor;

    let decimales = opciones.sinDecimales ? 0 : 2;
    if (opciones.abreviar && divisor > 1) {
        decimales = 1;
    }

    let strNum = val.toFixed(decimales);
    let parts = strNum.split('.');
    let integerPart = parts[0];
    let decimalPart = parts.length > 1 ? ',' + parts[1] : '';

    // Separador de miles (punto)
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    let formatted = `${simbolo} ${integerPart}${decimalPart}${abreviacion}`;
    if (isNegative) {
        formatted = `-${formatted}`;
    }

    return formatted;
}

export function formatTasa(tasa) {
    return formatMoney(tasa, 'VES');
}

export function parseMontoVenezolano(texto) {
    if (typeof texto === 'number') return isNaN(texto) ? NaN : texto;
    if (typeof texto !== 'string') return NaN;
    
    let clean = texto.trim();
    // Remover símbolos de moneda y espacios
    clean = clean.replace(/[Bs$€\s]/g, '');
    if (clean === '') return NaN;

    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            // Ejemplo: 1.250,50
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // Ejemplo: 1,250.50
            clean = clean.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        // Ejemplo: 1250,50
        clean = clean.replace(',', '.');
    } else if (lastDot !== -1 && /^-?\d{1,3}(\.\d{3})+$/.test(clean)) {
        // Solo puntos agrupando de a 3 dígitos: en Venezuela "1.250" es mil doscientos cincuenta
        clean = clean.replace(/\./g, '');
    }
    // Un solo punto con 1-2 decimales ("1250.50") se interpreta como decimal

    const val = parseFloat(clean);
    return isNaN(val) ? NaN : val;
}
