import { describe, it, expect } from 'vitest'
import {
  hoyEnCaracas,
  diferenciaEnDias,
  clasificarDocumentoFiscal,
  clasificarFactura,
  agruparPorCliente,
  textoVencimiento,
  mensajeDocumentoFiscal,
  mensajeFactura,
  construirAsunto,
  DIAS_VENCIDO_FISCAL
} from '../../supabase/functions/avisos-vencimiento/logica.js'

describe('avisos-vencimiento: lógica pura', () => {
  describe('hoyEnCaracas', () => {
    it('devuelve la fecha en formato YYYY-MM-DD', () => {
      const resultado = hoyEnCaracas(new Date('2026-10-13T12:00:00Z'))
      expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('usa la zona America/Caracas (UTC-4): 02:00 UTC sigue siendo el día anterior', () => {
      // 2026-10-13T02:00:00Z en Caracas (UTC-4) es 2026-10-12 22:00, mismo día calendario -4h
      const resultado = hoyEnCaracas(new Date('2026-10-13T03:00:00Z'))
      expect(resultado).toBe('2026-10-12')
    })

    it('a las 12:00 UTC ya es el nuevo día en Caracas (08:00 am)', () => {
      const resultado = hoyEnCaracas(new Date('2026-10-13T12:00:00Z'))
      expect(resultado).toBe('2026-10-13')
    })
  })

  describe('diferenciaEnDias', () => {
    it('calcula días futuros', () => {
      expect(diferenciaEnDias('2026-11-12', '2026-10-13')).toBe(30)
      expect(diferenciaEnDias('2026-10-20', '2026-10-13')).toBe(7)
      expect(diferenciaEnDias('2026-10-14', '2026-10-13')).toBe(1)
    })

    it('calcula días pasados (vencido)', () => {
      expect(diferenciaEnDias('2026-10-12', '2026-10-13')).toBe(-1)
      expect(diferenciaEnDias('2026-10-01', '2026-10-13')).toBe(-12)
    })

    it('retorna 0 el mismo día', () => {
      expect(diferenciaEnDias('2026-10-13', '2026-10-13')).toBe(0)
    })

    it('retorna null si falta alguna fecha', () => {
      expect(diferenciaEnDias(null, '2026-10-13')).toBeNull()
      expect(diferenciaEnDias('2026-10-13', null)).toBeNull()
    })
  })

  describe('clasificarDocumentoFiscal', () => {
    const hoy = '2026-10-13'

    it('selecciona documentos VIGENTES a 30, 7 o 1 días', () => {
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: '2026-11-12' }, hoy)).toBe(30)
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: '2026-10-20' }, hoy)).toBe(7)
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: '2026-10-14' }, hoy)).toBe(1)
    })

    it('selecciona el que venció ayer (un solo aviso) con dias_antes = -1', () => {
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: '2026-10-12' }, hoy)).toBe(DIAS_VENCIDO_FISCAL)
    })

    it('ignora documentos que no están en 30/7/1 ni vencieron ayer', () => {
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: '2026-10-15' }, hoy)).toBeNull()
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: '2026-09-01' }, hoy)).toBeNull()
    })

    it('ignora documentos que no están VIGENTES (tramite, vencido, no_aplica)', () => {
      expect(clasificarDocumentoFiscal({ status: 'TRAMITE', expiration_date: '2026-10-14' }, hoy)).toBeNull()
      expect(clasificarDocumentoFiscal({ status: 'VENCIDO', expiration_date: '2026-10-12' }, hoy)).toBeNull()
      expect(clasificarDocumentoFiscal({ status: 'NO_APLICA', expiration_date: '2026-10-14' }, hoy)).toBeNull()
    })

    it('ignora documentos sin fecha de vencimiento', () => {
      expect(clasificarDocumentoFiscal({ status: 'VIGENTE', expiration_date: null }, hoy)).toBeNull()
    })
  })

  describe('clasificarFactura', () => {
    const hoy = '2026-10-13'

    it('selecciona facturas pendientes a 3 o 0 días', () => {
      expect(clasificarFactura({ status: 'pending', due_date: '2026-10-16' }, hoy)).toBe(3)
      expect(clasificarFactura({ status: 'pending', due_date: '2026-10-13' }, hoy)).toBe(0)
    })

    it('ignora facturas fuera de los umbrales', () => {
      expect(clasificarFactura({ status: 'pending', due_date: '2026-10-17' }, hoy)).toBeNull()
      expect(clasificarFactura({ status: 'pending', due_date: '2026-10-12' }, hoy)).toBeNull()
    })

    it('ignora facturas que no están pendientes', () => {
      expect(clasificarFactura({ status: 'paid', due_date: '2026-10-13' }, hoy)).toBeNull()
      expect(clasificarFactura({ status: 'overdue', due_date: '2026-10-13' }, hoy)).toBeNull()
      expect(clasificarFactura({ status: 'canceled', due_date: '2026-10-13' }, hoy)).toBeNull()
    })
  })

  describe('agruparPorCliente', () => {
    it('agrupa varios ítems del mismo cliente en un solo grupo', () => {
      const items = [
        { client_id: 'a', dias_antes: 30 },
        { client_id: 'b', dias_antes: 7 },
        { client_id: 'a', dias_antes: 1 }
      ]
      const grupos = agruparPorCliente(items)
      expect(grupos.size).toBe(2)
      expect(grupos.get('a')).toHaveLength(2)
      expect(grupos.get('b')).toHaveLength(1)
    })

    it('ignora ítems sin client_id', () => {
      const grupos = agruparPorCliente([{ dias_antes: 30 }])
      expect(grupos.size).toBe(0)
    })
  })

  describe('textoVencimiento', () => {
    it('describe cada umbral en lenguaje llano', () => {
      expect(textoVencimiento(30)).toBe('vence en 30 días')
      expect(textoVencimiento(7)).toBe('vence en 7 días')
      expect(textoVencimiento(1)).toBe('vence en 1 día')
      expect(textoVencimiento(0)).toBe('vence hoy')
      expect(textoVencimiento(3)).toBe('vence en 3 días')
      expect(textoVencimiento(DIAS_VENCIDO_FISCAL)).toBe('venció ayer')
    })
  })

  describe('construcción de mensajes y asunto (tuteo, lenguaje llano)', () => {
    it('mensajeDocumentoFiscal usa tuteo y nombre del cliente', () => {
      const msg = mensajeDocumentoFiscal('María', { nombre: 'tu RIF', dias_antes: 7 })
      expect(msg).toBe('Tu RIF vence en 7 días. Renovarlo a tiempo evita multas.')
    })

    it('mensajeDocumentoFiscal cambia el llamado a la acción cuando ya venció', () => {
      const msg = mensajeDocumentoFiscal('María', { nombre: 'tu RIF', dias_antes: DIAS_VENCIDO_FISCAL })
      expect(msg).toContain('venció ayer')
      expect(msg).toContain('Renuévalo lo antes posible')
    })

    it('mensajeFactura incluye el número de factura si está disponible', () => {
      const msg = mensajeFactura('Carlos', { invoice_number: 'INV-001', dias_antes: 0 })
      expect(msg).toBe('Tu factura de suscripción (INV-001) vence hoy.')
    })

    it('construirAsunto usa singular/plural según la cantidad de ítems', () => {
      expect(construirAsunto([{}])).toBe('Aviso de vencimiento — AD System')
      expect(construirAsunto([{}, {}])).toBe('Tienes 2 avisos de vencimiento — AD System')
    })
  })
})
