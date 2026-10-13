import { describe, it, expect } from 'vitest'
import { semaforoDocumento, UMBRAL_URGENTE_DIAS, UMBRAL_PROXIMO_DIAS, UMBRAL_RECIENTE_DIAS } from '../semaforoDocumento'

// Fecha de referencia fija para que los tests no dependan del reloj real.
const HOY = new Date(2026, 5, 15) // 15 de junio de 2026

function sumarDias(fecha, dias) {
  const copia = new Date(fecha)
  copia.setDate(copia.getDate() + dias)
  return copia
}

describe('semaforoDocumento', () => {
  describe('sin fecha de vencimiento', () => {
    it('gris cuando no hay vencimiento ni emisión', () => {
      const r = semaforoDocumento(null, null, HOY)
      expect(r.color).toBe('grey')
      expect(r.nivel).toBe('sin_vencimiento')
      expect(r.texto).toBe('Sin fecha de vencimiento')
    })

    it('gris cuando no hay vencimiento y la emisión es antigua', () => {
      const emision = sumarDias(HOY, -400)
      const r = semaforoDocumento(emision, null, HOY)
      expect(r.color).toBe('grey')
      expect(r.texto).toBe('Sin fecha de vencimiento')
    })

    it('verde cuando no hay vencimiento pero se emitió hace poco (dentro del umbral)', () => {
      const emision = sumarDias(HOY, -UMBRAL_RECIENTE_DIAS)
      const r = semaforoDocumento(emision, null, HOY)
      expect(r.color).toBe('success')
      expect(r.nivel).toBe('reciente')
      expect(r.texto).toBe('Sin fecha de vencimiento')
    })

    it('gris cuando no hay vencimiento y la emisión supera el umbral de "reciente" por un día', () => {
      const emision = sumarDias(HOY, -(UMBRAL_RECIENTE_DIAS + 1))
      const r = semaforoDocumento(emision, null, HOY)
      expect(r.color).toBe('grey')
    })
  })

  describe('documento ya vencido (rojo)', () => {
    it('vencido hace 1 día usa singular "día"', () => {
      const venc = sumarDias(HOY, -1)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('error')
      expect(r.nivel).toBe('vencido')
      expect(r.texto).toBe('Venció hace 1 día')
    })

    it('vencido hace varios días usa plural "días"', () => {
      const venc = sumarDias(HOY, -10)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('error')
      expect(r.texto).toBe('Venció hace 10 días')
    })

    it('vencido hace mucho tiempo sigue siendo rojo, no gris', () => {
      const venc = sumarDias(HOY, -800)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('error')
      expect(r.nivel).toBe('vencido')
    })
  })

  describe('vence pronto (rojo, <= umbral urgente)', () => {
    it('vence hoy', () => {
      const r = semaforoDocumento(null, HOY, HOY)
      expect(r.color).toBe('error')
      expect(r.nivel).toBe('vence_pronto')
      expect(r.texto).toBe('Vence hoy')
    })

    it(`vence en 1 día (singular)`, () => {
      const venc = sumarDias(HOY, 1)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('error')
      expect(r.texto).toBe('Vence en 1 día')
    })

    it(`vence justo en el umbral urgente (${UMBRAL_URGENTE_DIAS} días) → rojo`, () => {
      const venc = sumarDias(HOY, UMBRAL_URGENTE_DIAS)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('error')
      expect(r.nivel).toBe('vence_pronto')
      expect(r.texto).toBe(`Vence en ${UMBRAL_URGENTE_DIAS} días`)
    })
  })

  describe('se acerca (naranja/amarillo)', () => {
    it(`un día después del umbral urgente (${UMBRAL_URGENTE_DIAS + 1} días) → naranja`, () => {
      const venc = sumarDias(HOY, UMBRAL_URGENTE_DIAS + 1)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('warning')
      expect(r.nivel).toBe('se_acerca')
      expect(r.texto).toBe(`Vence en ${UMBRAL_URGENTE_DIAS + 1} días`)
    })

    it(`justo en el umbral próximo (${UMBRAL_PROXIMO_DIAS} días) → naranja`, () => {
      const venc = sumarDias(HOY, UMBRAL_PROXIMO_DIAS)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('warning')
      expect(r.nivel).toBe('se_acerca')
    })
  })

  describe('falta mucho (gris) vs. recién emitido (verde)', () => {
    it(`un día después del umbral próximo (${UMBRAL_PROXIMO_DIAS + 1} días) sin emisión reciente → gris`, () => {
      const venc = sumarDias(HOY, UMBRAL_PROXIMO_DIAS + 1)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('grey')
      expect(r.nivel).toBe('falta_mucho')
      expect(r.texto).toBe(`Vence en ${UMBRAL_PROXIMO_DIAS + 1} días`)
    })

    it('falta muchísimo tiempo (varios años) → gris', () => {
      const venc = sumarDias(HOY, 365 * 3)
      const r = semaforoDocumento(null, venc, HOY)
      expect(r.color).toBe('grey')
      expect(r.nivel).toBe('falta_mucho')
    })

    it('falta mucho para vencer PERO se emitió hace poco → verde (recién emitido)', () => {
      const emision = sumarDias(HOY, -5)
      const venc = sumarDias(HOY, 365 * 3) // RIF recién emitido: vence en 3 años
      const r = semaforoDocumento(emision, venc, HOY)
      expect(r.color).toBe('success')
      expect(r.nivel).toBe('reciente')
      expect(r.texto).toBe(`Vence en ${365 * 3} días`)
    })

    it('la emisión reciente NO sobrescribe un vencimiento urgente (rojo manda)', () => {
      const emision = sumarDias(HOY, -2)
      const venc = sumarDias(HOY, 5) // emitido hace poco pero vence en 5 días
      const r = semaforoDocumento(emision, venc, HOY)
      expect(r.color).toBe('error')
      expect(r.nivel).toBe('vence_pronto')
    })

    it('la emisión reciente NO sobrescribe un vencimiento "se acerca" (naranja manda)', () => {
      const emision = sumarDias(HOY, -3)
      const venc = sumarDias(HOY, 60)
      const r = semaforoDocumento(emision, venc, HOY)
      expect(r.color).toBe('warning')
      expect(r.nivel).toBe('se_acerca')
    })
  })

  describe('formatos de entrada de fecha', () => {
    it('acepta strings YYYY-MM-DD', () => {
      const r = semaforoDocumento('2026-06-01', '2026-06-20', HOY)
      expect(r.color).toBe('error')
      expect(r.texto).toBe('Vence en 5 días')
    })

    it('acepta objetos Date', () => {
      const r = semaforoDocumento(new Date(2026, 5, 1), new Date(2026, 5, 20), HOY)
      expect(r.color).toBe('error')
      expect(r.texto).toBe('Vence en 5 días')
    })

    it('ignora la hora dentro del string ISO y compara solo por día', () => {
      const r = semaforoDocumento(null, '2026-06-20T23:59:00.000Z', HOY)
      expect(r.texto).toBe('Vence en 5 días')
    })
  })

  describe('resultado siempre trae color + icono + texto (nunca solo color)', () => {
    it('todas las ramas devuelven icono y texto no vacíos', () => {
      const casos = [
        [null, null],
        [sumarDias(HOY, -10), null],
        [null, sumarDias(HOY, -10)],
        [null, HOY],
        [null, sumarDias(HOY, 10)],
        [null, sumarDias(HOY, 60)],
        [null, sumarDias(HOY, 400)],
        [sumarDias(HOY, -5), sumarDias(HOY, 400)]
      ]
      casos.forEach(([emision, vencimiento]) => {
        const r = semaforoDocumento(emision, vencimiento, HOY)
        expect(typeof r.icono).toBe('string')
        expect(r.icono.length).toBeGreaterThan(0)
        expect(typeof r.texto).toBe('string')
        expect(r.texto.length).toBeGreaterThan(0)
        expect(['grey', 'success', 'warning', 'error']).toContain(r.color)
      })
    })
  })
})
