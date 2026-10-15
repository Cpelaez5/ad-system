/**
 * Tests de documentoIaService.js ("Llenar con un documento").
 * Todo con mocks y datos ficticios: no se llama a la IA.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const invoke = vi.fn()
const reducirImagen = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { functions: { invoke: (...a) => invoke(...a) } },
}))
vi.mock('@/services/productoFotoService', () => ({
  reducirImagen: (...a) => reducirImagen(...a),
}))

import {
  leerDocumento, aProveedor, aCliente, aEmpresa, coincidirEstado, rifCoincide,
  aplicarSoloVacios, restaurar, avisoDeCalidad, marcaDeLlenado, fechaIso, fechaParaMostrar,
  mensajeDeError, MSG_ILEGIBLE,
} from '@/services/documentoIaService'

const RIF = {
  tipo: 'rif', tipo_persona: 'juridica', nombre: 'DISTRIBUIDORA EJEMPLO, C.A.', rif: 'J-40123456-7',
  cedula: null, domicilio_fiscal: 'Av. Ficticia, Edif. Uno, Caracas', estado: 'DISTRITO CAPITAL',
  fecha_inscripcion: '2020-01-15', fecha_vencimiento: '2027-01-15', telefono: '0412-0000000',
  correo: 'ejemplo@ejemplo.com', confianza: 'alta', legible: true,
}
const CEDULA = {
  tipo: 'cedula', tipo_persona: null, nombre: 'MARIA EJEMPLO', rif: null, cedula: 'V-12345678',
  domicilio_fiscal: null, confianza: 'alta', legible: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('aProveedor', () => {
  it('usa los nombres reales del formulario de proveedor y deja el nombre como viene', () => {
    expect(aProveedor(RIF)).toEqual({
      nombre: 'DISTRIBUIDORA EJEMPLO, C.A.', rif: 'J-40123456-7', tipo_persona: 'JURIDICA',
      direccion: 'Av. Ficticia, Edif. Uno, Caracas', telefono: '0412-0000000', email: 'ejemplo@ejemplo.com',
    })
  })
  it('con una cédula usa la cédula como identificación y sugiere persona natural', () => {
    expect(aProveedor(CEDULA)).toEqual({ nombre: 'MARIA EJEMPLO', rif: 'V-12345678', tipo_persona: 'NATURAL' })
  })
  it('no inventa campos vacíos ni falla sin documento', () => {
    expect(aProveedor(null)).toEqual({})
    expect(aProveedor({ nombre: ' ', rif: '' })).toEqual({})
  })
})

describe('aCliente', () => {
  it('usa tipo_persona en minúscula y correo', () => {
    expect(aCliente(RIF)).toEqual({
      nombre: 'DISTRIBUIDORA EJEMPLO, C.A.', rif: 'J-40123456-7', tipo_persona: 'juridica',
      direccion: 'Av. Ficticia, Edif. Uno, Caracas', telefono: '0412-0000000', correo: 'ejemplo@ejemplo.com',
    })
    expect(aCliente(CEDULA).tipo_persona).toBe('natural')
  })
})

describe('aEmpresa', () => {
  const estados = ['Distrito Capital', 'Miranda', 'Zulia']
  it('llena razón social, RIF, domicilio, estado y teléfono', () => {
    expect(aEmpresa(RIF, estados)).toEqual({
      companyName: 'DISTRIBUIDORA EJEMPLO, C.A.', rif: 'J-40123456-7',
      address: 'Av. Ficticia, Edif. Uno, Caracas', estado: 'Distrito Capital', phone: '0412-0000000',
    })
  })
  it('omite el estado si no coincide con la lista', () => {
    expect(aEmpresa({ ...RIF, estado: 'Narnia' }, estados).estado).toBeUndefined()
  })
})

describe('coincidirEstado / rifCoincide / tipo de persona', () => {
  it('empata estados con tildes, mayúsculas y prefijo', () => {
    expect(coincidirEstado('EDO. MIRANDA', ['Miranda'])).toBe('Miranda')
    expect(coincidirEstado('Estado Táchira', ['Táchira'])).toBe('Táchira')
    expect(coincidirEstado('', ['Miranda'])).toBe('')
  })
  it('compara RIF sin guiones', () => {
    expect(rifCoincide('J-40123456-7', 'j401234567')).toBe(true)
    expect(rifCoincide('J-40123456-7', 'J-40123456-8')).toBe(false)
    expect(rifCoincide('', 'J-40123456-7')).toBe(false)
  })
  it('deduce el tipo de persona por la letra si la IA no lo trae', () => {
    expect(aProveedor({ rif: 'V-1234567-0', nombre: 'X' }).tipo_persona).toBe('NATURAL')
    expect(aProveedor({ rif: 'G-20000000-1', nombre: 'X' }).tipo_persona).toBe('JURIDICA')
  })
})

describe('aplicarSoloVacios / restaurar', () => {
  it('llena solo los campos vacíos y deshace al valor anterior', () => {
    const form = { nombre: 'Lo que escribí', rif: '', telefono: null, tipo_persona: 'JURIDICA' }
    const { campos, previo } = aplicarSoloVacios(form, { nombre: 'OTRO', rif: 'J-1', telefono: '0414', tipo_persona: 'NATURAL' }, ['tipo_persona'])
    expect(form).toEqual({ nombre: 'Lo que escribí', rif: 'J-1', telefono: '0414', tipo_persona: 'NATURAL' })
    expect(campos.sort()).toEqual(['rif', 'telefono', 'tipo_persona'])
    restaurar(form, previo)
    expect(form).toEqual({ nombre: 'Lo que escribí', rif: '', telefono: null, tipo_persona: 'JURIDICA' })
  })
  it('sin forzar no pisa un selector con valor', () => {
    const form = { tipo_persona: 'JURIDICA' }
    expect(aplicarSoloVacios(form, { tipo_persona: 'NATURAL' }).campos).toEqual([])
  })
})

describe('calidad, marca y fechas', () => {
  it('avisa con el mensaje amable si no se lee o la confianza es baja', () => {
    expect(avisoDeCalidad({ legible: false })).toBe(MSG_ILEGIBLE)
    expect(avisoDeCalidad({ legible: true, confianza: 'baja' })).toBe(MSG_ILEGIBLE)
    expect(avisoDeCalidad(RIF)).toBeNull()
  })
  it('la marca no nombra el tipo de documento (pudo ser otro)', () => {
    expect(marcaDeLlenado(RIF)).toBe('Llenado con IA desde tu documento · revisa los datos')
    expect(marcaDeLlenado(CEDULA)).toBe('Llenado con IA desde tu documento · revisa los datos')
  })
  it('formatea fechas DD/MM/AAAA', () => {
    expect(fechaParaMostrar('2027-01-15')).toBe('15/01/2027')
    expect(fechaIso('15/01/2027')).toBe('2027-01-15')
    expect(fechaIso('basura')).toBe('')
  })
})

describe('leerDocumento', () => {
  const foto = new File(['x'], 'rif.png', { type: 'image/png' })

  it('reduce la imagen, llama a documento-ia y devuelve el documento', async () => {
    reducirImagen.mockResolvedValue(new Blob(['jpg'], { type: 'image/jpeg' }))
    invoke.mockResolvedValue({ data: { documento: RIF }, error: null })
    const r = await leerDocumento(foto, 'rif')
    expect(r).toEqual({ documento: RIF, error: null })
    const [nombre, opciones] = invoke.mock.calls[0]
    expect(nombre).toBe('documento-ia')
    expect(opciones.body.tipo_esperado).toBe('rif')
    expect(opciones.body.archivo.mime).toBe('image/jpeg')
    expect(opciones.body.archivo.base64.length).toBeGreaterThan(0)
  })

  it('manda el PDF tal cual, sin reducir', async () => {
    invoke.mockResolvedValue({ data: { documento: RIF }, error: null })
    await leerDocumento(new File(['%PDF'], 'rif.pdf', { type: 'application/pdf' }))
    expect(reducirImagen).not.toHaveBeenCalled()
    expect(invoke.mock.calls[0][1].body.archivo.mime).toBe('application/pdf')
  })

  it('un PDF de más de 8 MB ni se envía', async () => {
    const grande = new File(['x'], 'g.pdf', { type: 'application/pdf' })
    Object.defineProperty(grande, 'size', { value: 9 * 1024 * 1024 })
    const r = await leerDocumento(grande)
    expect(r.error.code).toBe('GRANDE')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('rechaza tipos que no son foto ni PDF', async () => {
    const r = await leerDocumento(new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(r.error.code).toBe('TIPO')
  })

  it('traduce el error de la función a un mensaje amable y no lanza', async () => {
    reducirImagen.mockResolvedValue(new Blob(['jpg']))
    invoke.mockResolvedValue({ data: { error: { code: 'TIEMPO_IA', message: 'x' } }, error: null })
    const r = await leerDocumento(foto)
    expect(r.documento).toBeNull()
    expect(r.error.message).toBe(mensajeDeError('TIEMPO_IA'))
  })

  it('lee el código del cuerpo cuando la función responde con error HTTP', async () => {
    reducirImagen.mockResolvedValue(new Blob(['jpg']))
    invoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: { code: 'GRANDE' } }) } } })
    expect((await leerDocumento(foto)).error.code).toBe('GRANDE')
  })

  it('una excepción de red da el mensaje genérico', async () => {
    reducirImagen.mockResolvedValue(new Blob(['jpg']))
    invoke.mockRejectedValue(new Error('offline'))
    const r = await leerDocumento(foto)
    expect(r.error.code).toBe('RED')
  })

  it('si la imagen no se puede abrir, mensaje de imagen', async () => {
    reducirImagen.mockRejectedValue(new Error('imagen_invalida'))
    expect((await leerDocumento(foto)).error.code).toBe('IMAGEN')
  })
})
