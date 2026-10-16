import { describe, it, expect, vi } from 'vitest'

// Los logos se importan como archivos de /public: en vitest no existen, se simulan.
vi.mock('/ADSystem/logo.png', () => ({ default: 'logo.png' }))
vi.mock('/ADSystem/png/logo.png', () => ({ default: 'logo.png' }))
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'marca.png' }))
import { formatNumber, getYearMonth } from '@/services/retention-pdf-service.js'
import { fmtCurrency, fmtDate } from '@/services/receipt-pdf-service.js'
import { periodosParaPdf } from '@/services/expediente-pdf-service.js'
import { textoSeguro, numeroSeguro } from '@/utils/estiloExcel.js'

describe('formato de montos en los documentos', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatNumber(104036.77)).toBe('104.036,77')
    expect(formatNumber('104036.77')).toBe('104.036,77')
    expect(formatNumber(0)).toBe('0,00')
    expect(formatNumber(null)).toBe('0,00')
    expect(formatNumber('abc')).toBe('0,00')
    expect(formatNumber(-0.001)).toBe('0,00')
  })
  it('el recibo muestra Bs y $ con el mismo formato', () => {
    expect(fmtCurrency(104036.77, 'VES')).toBe('Bs 104.036,77')
    expect(fmtCurrency(1234.5, 'USD')).toBe('$ 1.234,50')
    expect(fmtCurrency(undefined, 'VES')).toBe('Bs 0,00')
    expect(fmtCurrency(-12484.41, 'VES')).toBe('-Bs 12.484,41')
  })
})

describe('fechas de los documentos', () => {
  it('2026-10-01 es octubre (sin desfase UTC)', () => {
    expect(getYearMonth('2026-10-01')).toMatchObject({ year: '2026', month: '10', periodCode: '202610' })
    expect(fmtDate('2026-10-01')).toBe('01/10/2026')
    expect(fmtDate(null)).toBe('—')
  })
})

describe('expediente fiscal en PDF', () => {
  const ahora = new Date(2026, 9, 16)
  it('un documento presentado en octubre cuenta en el período mensual', () => {
    const tipo = { id: 'X', label: 'X', frequency: 'MONTHLY' }
    const filas = periodosParaPdf(tipo, [{ doc_type: 'X', emission_date: '2026-09-01', status: 'VIGENTE' }], 2026, ahora)
    expect(filas).toHaveLength(12)
    expect(filas[8].statusLabel).toBe('PRESENTADO') // septiembre, no agosto
    expect(filas[0].statusLabel).toBe('NO PRESENTADO')
    expect(filas[11].statusLabel).toBe('—') // diciembre aún no llega
  })
})

describe('textos seguros para Excel', () => {
  it('nunca deja undefined, null ni NaN', () => {
    expect(textoSeguro(undefined, '—')).toBe('—')
    expect(textoSeguro('null', '—')).toBe('—')
    expect(textoSeguro('NaN')).toBe('')
    expect(textoSeguro(' 0012 ')).toBe('0012')
    expect(numeroSeguro('x')).toBe(0)
  })
})
