import { describe, it, expect } from 'vitest'
import { esDiaHabil, ultimosDiasHabiles, construirTablaTasas, huecosDeTasas, textoFaltan, validarTasaManual } from '../tasasAdmin'

const hoy = new Date(2026, 9, 15, 12, 0, 0) // jueves 15/10/2026

describe('días hábiles', () => {
  it('lunes a viernes sí, fin de semana no', () => {
    expect(esDiaHabil('2026-10-12')).toBe(true) // lunes
    expect(esDiaHabil('2026-10-16')).toBe(true) // viernes
    expect(esDiaHabil('2026-10-17')).toBe(false) // sábado
    expect(esDiaHabil('2026-10-18')).toBe(false) // domingo
  })
  it('últimos 5 hábiles desde un jueves se saltan el fin de semana', () => {
    expect(ultimosDiasHabiles(5, hoy)).toEqual(['2026-10-15', '2026-10-14', '2026-10-13', '2026-10-12', '2026-10-09'])
  })
  it('desde un sábado empieza en el viernes', () => {
    expect(ultimosDiasHabiles(2, new Date(2026, 9, 17))).toEqual(['2026-10-16', '2026-10-15'])
  })
  it('da 60 días hábiles por defecto', () => {
    expect(ultimosDiasHabiles(60, hoy)).toHaveLength(60)
  })
})

describe('tabla y huecos', () => {
  const filas = [
    { date: '2026-10-15', currency: 'USD', rate: 104.25, source: 'PROXY-API-CRON' },
    { date: '2026-10-14', currency: 'USD', rate: 103.9, source: 'MANUAL-SUPERADMIN' },
    { date: '2026-10-14', currency: 'EUR', rate: 120.1, source: 'MANUAL-SUPERADMIN' },
    { date: '2026-10-12', currency: 'USD', rate: 103, source: 'PROXY-API-CRON' },
  ]
  const tabla = construirTablaTasas(filas, { cantidad: 5, hoy })

  it('marca los huecos: hábiles pasados sin ninguna tasa', () => {
    expect(huecosDeTasas(tabla)).toEqual(['2026-10-09', '2026-10-13'])
  })
  it('hoy sin tasa todavía no es hueco', () => {
    const sinHoy = construirTablaTasas(filas.slice(1), { cantidad: 5, hoy })
    expect(sinHoy[0]).toMatchObject({ fecha: '2026-10-15', vacio: true, hueco: false })
  })
  it('indica qué monedas faltan en un día con datos parciales', () => {
    const dia = tabla.find((d) => d.fecha === '2026-10-14')
    expect(dia.faltan).toEqual(['CNY', 'TRY', 'RUB'])
    expect(dia.tasas.USD).toEqual({ tasa: 103.9, fuente: 'MANUAL-SUPERADMIN' })
    expect(dia.hueco).toBe(false)
  })
  it('ignora fines de semana aunque tengan tasa', () => {
    const t = construirTablaTasas([{ date: '2026-10-10', currency: 'USD', rate: 1, source: 'x' }], { cantidad: 5, hoy })
    expect(t.some((d) => d.fecha === '2026-10-10')).toBe(false)
  })
  it('textos de "Faltan N días"', () => {
    expect(textoFaltan(0)).toBe('No falta ningún día')
    expect(textoFaltan(1)).toBe('Falta 1 día')
    expect(textoFaltan(3)).toBe('Faltan 3 días')
  })
})

describe('validarTasaManual', () => {
  it('lee la tasa en formato venezolano y marca la fuente', () => {
    const r = validarTasaManual({ fecha: '2026-10-14', moneda: 'USD', tasaTexto: '104.036,77' }, hoy)
    expect(r.ok).toBe(true)
    expect(r.valor).toEqual({ date: '2026-10-14', currency: 'USD', rate: 104036.77, source: 'MANUAL-SUPERADMIN' })
  })
  it('rechaza fecha futura, moneda ajena y tasa vacía o cero', () => {
    const r = validarTasaManual({ fecha: '2026-10-20', moneda: 'VES', tasaTexto: '0' }, hoy)
    expect(r.ok).toBe(false)
    expect(Object.keys(r.errores).sort()).toEqual(['fecha', 'moneda', 'tasa'])
    expect(r.valor).toBeNull()
  })
})
