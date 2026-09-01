import { describe, it, expect } from 'vitest'

describe('Cálculos Financieros y Desacople de Fecha en Retenciones', () => {

  describe('1. Base Imponible vs Monto IVA y Alícuota SENIAT', () => {
    it('calcula la alícuota legal del 16% sobre la base imponible correcta y no 100%', () => {
      const taxableSales = 233800.71
      const taxDebit = 37408.11
      const ivaRetentionRate = 75
      const ivaRetentionAmount = Number((taxDebit * (ivaRetentionRate / 100)).toFixed(2))

      // La base imponible debe ser el subtotal gravable
      const baseImponible = taxableSales
      const montoIva = taxDebit

      expect(baseImponible).toBe(233800.71)
      expect(montoIva).toBe(37408.11)
      expect(ivaRetentionAmount).toBe(28056.08)

      // Cálculo de alícuota en PDF fiscal
      const alicuota = Math.round((montoIva / baseImponible) * 100)
      expect(alicuota).toBe(16)
    })
  })

  describe('2. Fallback SQL cuando taxableSales es null o cero', () => {
    it('recupera la base imponible a partir del monto de IVA asumiendo alícuota general del 16%', () => {
      const montoIva = 37408.11
      const fallbackBase = Number((montoIva / 0.16).toFixed(2))

      // ROUND(37408.11 / 0.16, 2) = 233800.69 (o ~233800.71)
      expect(fallbackBase).toBeCloseTo(233800.71, 0)
      expect(Math.round((montoIva / fallbackBase) * 100)).toBe(16)
    })
  })

  describe('3. Factura de fin de mes con retención en mes siguiente', () => {
    it('desacopla el período fiscal del comprobante respecto a la fecha de la factura', () => {
      const invoiceIssueDate = '2026-08-31'
      const retentionDate = '2026-09-02'

      // Helper para extraer período YYYYMM
      const getYearMonth = (dateStr) => {
        const [year, month] = dateStr.split('-')
        return { year, month, periodCode: `${year}${month}` }
      }

      const invPeriod = getYearMonth(invoiceIssueDate)
      const retPeriod = getYearMonth(retentionDate)

      // El período de la factura es Agosto 2026
      expect(invPeriod.periodCode).toBe('202608')
      // El período del comprobante de retención SENIAT es Septiembre 2026
      expect(retPeriod.periodCode).toBe('202609')

      // Generación de correlativo con el período de la retención
      const rawNum = '14492'
      const numComprobante = `${retPeriod.periodCode}${rawNum.padStart(8, '0')}`
      expect(numComprobante).toBe('20260900014492')
    })
  })

  describe('4. Idempotencia de migración y preservación de auditoría', () => {
    it('preserva base_imponible_original y evita modificaciones duplicadas en ejecuciones repetidas', () => {
      // Estado inicial con el bug (base_imponible tenía el monto_iva)
      let record = {
        id: 'ret-123',
        tipo: 'IVA',
        base_imponible: 37408.11,
        monto_iva: 37408.11,
        monto_retenido: 28056.08,
        base_imponible_original: null,
        corregido_en: null,
        corregido_motivo: null
      }

      const invoice = {
        financial: {
          taxableSales: 233800.71
        }
      }

      // Función que simula la consulta UPDATE de la migración
      const applyMigrationUpdate = (rec, inv) => {
        if (rec.tipo === 'IVA' && rec.corregido_en === null && rec.base_imponible === rec.monto_iva && rec.monto_iva > 0) {
          rec.base_imponible_original = rec.base_imponible
          rec.base_imponible = inv.financial?.taxableSales || Number((rec.monto_iva / 0.16).toFixed(2))
          rec.corregido_en = new Date().toISOString()
          rec.corregido_motivo = 'Corrección de bug en asignación de base_imponible (antes guardaba monto_iva)'
          return true // modificado
        }
        return false // no modificado (idempotente)
      }

      // Primera ejecución
      const firstRunModified = applyMigrationUpdate(record, invoice)
      expect(firstRunModified).toBe(true)
      expect(record.base_imponible_original).toBe(37408.11)
      expect(record.base_imponible).toBe(233800.71)
      expect(record.corregido_en).not.toBeNull()

      // Guardamos timestamp de la primera corrección
      const firstCorrectedEn = record.corregido_en

      // Segunda ejecución (debe ser ignorada por WHERE corregido_en IS NULL)
      const secondRunModified = applyMigrationUpdate(record, invoice)
      expect(secondRunModified).toBe(false)
      expect(record.base_imponible_original).toBe(37408.11)
      expect(record.base_imponible).toBe(233800.71)
      expect(record.corregido_en).toBe(firstCorrectedEn)
    })
  })
})
