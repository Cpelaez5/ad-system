import { describe, it, expect } from 'vitest'
import {
  filtrarFacturas, filtrarReportes, contarPorEstado, cifrasBalance, siguientePasoFacturacion,
  prellenarSuscripcion, estadoFactura, estadoReporte, tipoMetodo, esImagen, formatBs,
} from '../facturacionSistema.js'

const facturas = [
  { id: 1, invoice_number: 'INV-001', status: 'paid', client: { company_name: 'Panadería Sol', rif: 'J-111' } },
  { id: 2, invoice_number: 'INV-002', status: 'pending', client: { company_name: 'Ferretería Luna', rif: 'J-222' } },
  { id: 3, invoice_number: 'INV-003', status: 'overdue', client: { company_name: 'Taller Mar', rif: 'V-333' } },
]

describe('filtros', () => {
  it('filtra por texto en número, empresa o RIF, sin importar mayúsculas', () => {
    expect(filtrarFacturas(facturas, { texto: 'inv-002' }).map((f) => f.id)).toEqual([2])
    expect(filtrarFacturas(facturas, { texto: 'sol' }).map((f) => f.id)).toEqual([1])
    expect(filtrarFacturas(facturas, { texto: 'v-333' }).map((f) => f.id)).toEqual([3])
  })
  it('filtra por estado y combina con el texto', () => {
    expect(filtrarFacturas(facturas, { estado: 'overdue' }).map((f) => f.id)).toEqual([3])
    expect(filtrarFacturas(facturas, { estado: 'paid', texto: 'luna' })).toEqual([])
    expect(filtrarFacturas(facturas)).toHaveLength(3)
  })
  it('filtra reportes por estado', () => {
    const r = [{ status: 'approved' }, { status: 'pending_review' }]
    expect(filtrarReportes(r, 'pending_review')).toEqual([{ status: 'pending_review' }])
    expect(filtrarReportes(r, 'all')).toHaveLength(2)
  })
  it('cuenta por estado', () => {
    expect(contarPorEstado(facturas)).toEqual({ all: 3, paid: 1, pending: 1, overdue: 1 })
  })
})

describe('textos de estado', () => {
  it('traduce estados conocidos y no revienta con desconocidos', () => {
    expect(estadoFactura('overdue')).toMatchObject({ texto: 'Vencida', color: 'error' })
    expect(estadoReporte('pending_review').texto).toBe('Por revisar')
    expect(estadoFactura('raro').texto).toBe('raro')
    expect(tipoMetodo('zelle').texto).toBe('Zelle')
    expect(tipoMetodo(undefined).texto).toBe('—')
  })
  it('reconoce imágenes y formatea bolívares', () => {
    expect(esImagen('a/b/foto.PNG')).toBe(true)
    expect(esImagen('a/b/doc.pdf')).toBe(false)
    expect(esImagen(null)).toBe(false)
    expect(formatBs(null)).toBe('0,00')
    expect(formatBs(1234.5)).toMatch(/1\.234,50/)
  })
})

describe('cifrasBalance', () => {
  it('marca como alerta lo pendiente y lo vencido solo si hay monto', () => {
    const c = cifrasBalance({ totalFacturado: 350, totalPagado: 100, totalPendiente: 50, totalVencido: 0 }, (n) => `$${n}`)
    expect(c.map((x) => x.valor)).toEqual(['$350', '$100', '$50', '$0'])
    expect(c.find((x) => x.clave === 'pendiente').alerta).toBe(true)
    expect(c.find((x) => x.clave === 'vencido').alerta).toBe(false)
  })
})

describe('siguientePasoFacturacion', () => {
  it('prioriza pagos por aprobar sobre facturas vencidas, y null si no hay nada', () => {
    expect(siguientePasoFacturacion({ pagosPorRevisar: 2, facturasVencidas: 5 }).clave).toBe('pagos')
    expect(siguientePasoFacturacion({ pagosPorRevisar: 1 }).titulo).toBe('1 pago por aprobar')
    expect(siguientePasoFacturacion({ facturasVencidas: 1 }).titulo).toBe('1 factura vencida')
    expect(siguientePasoFacturacion({})).toBeNull()
  })
})

describe('prellenarSuscripcion', () => {
  const planes = [{ id: 'p1', name: 'AD Solo Pro' }, { id: 'p2', name: 'AD Visionary' }]
  it('detecta el plan por el nombre en las notas y sugiere el vencimiento', () => {
    const r = prellenarSuscripcion({ invoice: { notes: 'Suscripción a plan AD Visionary (mensual)', period_end: '2026-11-15T12:00:00.000Z' } }, planes)
    expect(r.plan_id).toBe('p2')
    expect(r.trial_end).toBe('2026-11-15T12:00')
  })
  it('si no es suscripción, deja el formulario vacío', () => {
    expect(prellenarSuscripcion({ invoice: { notes: 'Otra cosa' } }, planes)).toEqual({ plan_id: null, trial_end: '' })
    expect(prellenarSuscripcion(null, planes)).toEqual({ plan_id: null, trial_end: '' })
  })
})
