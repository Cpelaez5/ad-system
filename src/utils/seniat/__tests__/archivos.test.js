import { describe, it, expect } from 'vitest'
import { construirTxtIva, lineaTxtIva, nombreArchivoTxtIva } from '../txtIva.js'
import { construirXmlIslr, codificarLatin1, escaparXml, fechaDdMmAaaa, nombreArchivoXmlIslr } from '../xmlIslr.js'
import { alicuotaIva, monto2, rifSeniat, codigoTipoDocumento, sinAcentos } from '../comunes.js'
import { cliente, retIva, retIslr } from './fixtures.js'

describe('comunes', () => {
  it('rifSeniat quita guiones y rellena cédulas viejas', () => {
    expect(rifSeniat('J-12345678-9')).toBe('J123456789')
    expect(rifSeniat(' j 12345678 9 ')).toBe('J123456789')
    expect(rifSeniat('V-1234567-0')).toBe('V012345670')
    expect(rifSeniat('J-1234')).toBeNull()
    expect(rifSeniat('J-1234567')).toBeNull()
    expect(rifSeniat('12345678-9')).toBeNull()
  })
  it('monto2: punto, 2 decimales, sin -0.00', () => {
    expect(monto2(1234.5)).toBe('1234.50')
    expect(monto2('12,5')).toBe('0.00')
    expect(monto2(-0.001)).toBe('0.00')
    expect(monto2(1.005 + 0.0000001)).toBe('1.01')
  })
  it('alícuota se acerca a 8, 16 o 31', () => {
    expect(alicuotaIva(160, 1000)).toBe(16)
    expect(alicuotaIva(80, 1000)).toBe(8)
    expect(alicuotaIva(310, 1000)).toBe(31)
    expect(alicuotaIva(158, 1000)).toBe(16)
    expect(alicuotaIva(0, 1000)).toBe(16)
  })
  it('tipo de documento', () => {
    expect(codigoTipoDocumento('FACTURA')).toBe('01')
    expect(codigoTipoDocumento('NOTA_DEBITO')).toBe('02')
    expect(codigoTipoDocumento('Nota de Crédito')).toBe('03')
    expect(codigoTipoDocumento(undefined)).toBe('01')
  })
  it('sinAcentos', () => {
    expect(sinAcentos('Pérez Núñez ñ')).toBe('Perez Nunez n')
  })
})

describe('TXT de IVA', () => {
  it('arma la línea con los 16 campos exactos separados por tabulador', () => {
    const campos = lineaTxtIva(cliente, retIva()).split('\t')
    expect(campos).toEqual([
      'J123456789', '202610', '2026-10-05', 'C', '01', 'J301112223', '123', '00-000456',
      '1160.00', '1000.00', '120.00', '0', '20261000000001', '0.00', '16.00', '0',
    ])
  })

  it('usa \\r\\n como fin de línea y ordena por fecha del comprobante', () => {
    const txt = construirTxtIva({
      cliente,
      retenciones: [retIva({ id: 'b', fecha_comprobante: '2026-10-09', numero_comprobante: '20261000000002' }), retIva()],
    })
    const lineas = txt.split('\r\n')
    expect(lineas).toHaveLength(3)
    expect(lineas[2]).toBe('')
    expect(lineas[0]).toContain('20261000000001')
    expect(lineas[1]).toContain('20261000000002')
    expect(txt.includes('\n') && !txt.replace(/\r\n/g, '').includes('\n')).toBe(true)
  })

  it('nota de crédito: montos en negativo, documento afectado y tipo 03', () => {
    const campos = lineaTxtIva(cliente, retIva({ document_type: 'NOTA_CREDITO', doc_afectado: '00-77', exento: 50 })).split('\t')
    expect(campos[4]).toBe('03')
    expect(campos.slice(8, 11)).toEqual(['-1160.00', '-1000.00', '-120.00'])
    expect(campos[11]).toBe('0077')
    expect(campos[13]).toBe('-50.00')
  })

  it('alícuota 8 y exento', () => {
    const campos = lineaTxtIva(cliente, retIva({ monto_iva: 80, exento: 25.5 })).split('\t')
    expect(campos[14]).toBe('8.00')
    expect(campos[13]).toBe('25.50')
  })

  it('sin acentos ni tabuladores en los textos', () => {
    const campos = lineaTxtIva(cliente, retIva({ factura_numero: 'Nº\t12' })).split('\t')
    expect(campos).toHaveLength(16)
    expect(campos[6]).toBe('N 12')
  })

  it('sin retenciones devuelve vacío', () => {
    expect(construirTxtIva({ cliente, retenciones: [] })).toBe('')
  })

  it('nombre del archivo', () => {
    expect(nombreArchivoTxtIva('J-12345678-9', '202610', 1)).toBe('retenciones-iva-J123456789-202610-q1.txt')
  })
})

describe('XML de ISLR', () => {
  it('genera la estructura del spec', () => {
    const xml = construirXmlIslr({ cliente, periodo: '202610', retenciones: [retIslr()] })
    expect(xml.startsWith('<?xml version="1.0" encoding="ISO-8859-1"?>\n')).toBe(true)
    expect(xml).toContain('<RelacionRetencionesISLR RifAgente="J123456789" Periodo="202610">')
    expect(xml).toContain('<RifRetenido>J402223334</RifRetenido>')
    expect(xml).toContain('<NumeroFactura>1234</NumeroFactura>')
    expect(xml).toContain('<NumeroControl>005678</NumeroControl>')
    expect(xml).toContain('<FechaOperacion>15/10/2026</FechaOperacion>')
    expect(xml).toContain('<CodigoConcepto>002</CodigoConcepto>')
    expect(xml).toContain('<MontoOperacion>2000.00</MontoOperacion>')
    expect(xml).toContain('<PorcentajeRetencion>5.00</PorcentajeRetencion>')
    expect(xml.trim().endsWith('</RelacionRetencionesISLR>')).toBe(true)
  })

  it('NA cuando no hay número de control', () => {
    const xml = construirXmlIslr({ cliente, periodo: '202610', retenciones: [retIslr({ factura_control: null })] })
    expect(xml).toContain('<NumeroControl>NA</NumeroControl>')
  })

  it('escapa los caracteres de XML', () => {
    expect(escaparXml(`Pérez & "Hijos" <C.A.> 'x'`)).toBe('Pérez &amp; &quot;Hijos&quot; &lt;C.A.&gt; &apos;x&apos;')
    const xml = construirXmlIslr({ cliente, periodo: '202610', retenciones: [retIslr({ codigo_seniat: '0<2' })] })
    expect(xml).toContain('<CodigoConcepto>0&lt;2</CodigoConcepto>')
  })

  it('fecha dd/mm/aaaa y nombre del archivo', () => {
    expect(fechaDdMmAaaa('2026-01-09')).toBe('09/01/2026')
    expect(fechaDdMmAaaa('')).toBe('')
    expect(nombreArchivoXmlIslr('J-12345678-9', '202610')).toBe('retenciones-islr-J123456789-202610.xml')
  })

  it('codifica a ISO-8859-1: una vocal acentuada es un solo byte; lo que no cabe es ?', () => {
    const bytes = codificarLatin1('Pérez ñ€')
    expect(Array.from(bytes)).toEqual([80, 233, 114, 101, 122, 32, 241, 63])
  })
})
