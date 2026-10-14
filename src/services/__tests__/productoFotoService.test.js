/**
 * Tests de productoFotoService.js (fotos de productos + IA "Foto y listo").
 * Todo con mocks: no se sube nada ni se llama a la IA.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const upload = vi.fn()
const remove = vi.fn()
const invoke = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    storage: { from: vi.fn(() => ({ upload, remove })) },
    functions: { invoke: (...a) => invoke(...a) }
  }
}))
vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: vi.fn(() => 'org-1'),
  getCurrentClientId: vi.fn(() => 'cli-1')
}))
vi.mock('@/services/storageUrlService', () => ({
  obtenerUrlFirmada: vi.fn(async () => 'https://firmada/x.jpg')
}))

import { supabase } from '@/lib/supabaseClient'
import { getCurrentClientId } from '@/utils/tenantHelpers'
import { obtenerUrlFirmada } from '@/services/storageUrlService'
import svc, {
  calcularTamano, carpetaNegocio, nombreArchivo, subirFoto, urlFoto, borrarFotos,
  identificarProducto, mejorarFoto, unidadDelFormulario
} from '@/services/productoFotoService'

beforeEach(() => {
  vi.clearAllMocks()
  getCurrentClientId.mockReturnValue('cli-1')
})

describe('calcularTamano', () => {
  it('reduce la foto horizontal a 1600 de ancho', () => {
    expect(calcularTamano(4000, 3000)).toEqual({ ancho: 1600, alto: 1200 })
  })
  it('reduce la foto vertical a 1600 de alto', () => {
    expect(calcularTamano(3000, 4000)).toEqual({ ancho: 1200, alto: 1600 })
  })
  it('no agranda fotos pequeñas', () => {
    expect(calcularTamano(800, 600)).toEqual({ ancho: 800, alto: 600 })
  })
})

describe('rutas', () => {
  it('la carpeta es organization_id/client_id', () => {
    expect(carpetaNegocio()).toBe('org-1/cli-1')
  })
  it('sin cliente no hay carpeta', () => {
    getCurrentClientId.mockReturnValue(null)
    expect(carpetaNegocio()).toBeNull()
  })
  it('el nombre es .jpg y distinto cada vez', () => {
    const a = nombreArchivo()
    expect(a).toMatch(/\.jpg$/)
    expect(a).not.toBe(nombreArchivo())
  })
})

describe('subirFoto', () => {
  it('avisa en llano si no hay negocio', async () => {
    getCurrentClientId.mockReturnValue(null)
    const r = await subirFoto(new Blob(['x']))
    expect(r.path).toBeNull()
    expect(r.error).toMatch(/negocio/)
    expect(upload).not.toHaveBeenCalled()
  })

  it('avisa si la foto no se puede leer (no es imagen)', async () => {
    const r = await subirFoto(new Blob(['no soy imagen']))
    expect(r.path).toBeNull()
    expect(r.error).toMatch(/leer esa foto/)
  })

  it('reduce, sube a la carpeta del negocio y devuelve la ruta', async () => {
    const reducida = new Blob(['jpg'], { type: 'image/jpeg' })
    const spy = vi.spyOn(svc, 'reducirImagen')
    upload.mockResolvedValue({ error: null })
    // La reducción real necesita canvas; se simula el DOM mínimo.
    const origImage = globalThis.Image
    const origUrl = globalThis.URL.createObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:x')
    globalThis.URL.revokeObjectURL = vi.fn()
    globalThis.Image = class { set src(_) { this.naturalWidth = 4000; this.naturalHeight = 3000; setTimeout(() => this.onload()) } }
    const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (cb) => cb(reducida) }
    const crear = vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    try {
      const r = await subirFoto(new Blob(['x'], { type: 'image/png' }))
      expect(canvas.width).toBe(1600)
      expect(canvas.height).toBe(1200)
      expect(r.error).toBeNull()
      expect(r.path).toMatch(/^org-1\/cli-1\/.+\.jpg$/)
      expect(supabase.storage.from).toHaveBeenCalledWith('productos')
      expect(upload.mock.calls[0][1]).toBe(reducida)
      expect(upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/jpeg', upsert: false })
    } finally {
      crear.mockRestore()
      spy.mockRestore()
      globalThis.Image = origImage
      globalThis.URL.createObjectURL = origUrl
    }
  })
})

describe('urlFoto y borrarFotos', () => {
  it('firma con el bucket productos', async () => {
    expect(await urlFoto('org-1/cli-1/a.jpg')).toBe('https://firmada/x.jpg')
    expect(obtenerUrlFirmada).toHaveBeenCalledWith('productos', 'org-1/cli-1/a.jpg', 3600)
  })
  it('sin ruta devuelve null sin firmar', async () => {
    expect(await urlFoto(null)).toBeNull()
    expect(obtenerUrlFirmada).not.toHaveBeenCalled()
  })
  it('borra solo rutas válidas', async () => {
    remove.mockResolvedValue({ error: null })
    expect(await borrarFotos(['a', null, ''])).toBe(true)
    expect(remove).toHaveBeenCalledWith(['a'])
    expect(await borrarFotos([])).toBe(false)
  })
})

describe('IA producto-ia', () => {
  it('identificar envía la acción, la ruta y los campos del rubro', async () => {
    invoke.mockResolvedValue({ data: { producto: { nombre: 'Harina PAN 1 kg', confianza: 'alta' } }, error: null })
    const r = await identificarProducto('org-1/cli-1/a.jpg', [{ clave: 'talla', etiqueta: 'Talla', tipo: 'texto', ejemplo: 'M' }])
    expect(invoke).toHaveBeenCalledWith('producto-ia', {
      body: { accion: 'identificar', foto_path: 'org-1/cli-1/a.jpg', campos: [{ clave: 'talla', etiqueta: 'Talla' }] }
    })
    expect(r).toEqual({ producto: { nombre: 'Harina PAN 1 kg', confianza: 'alta' }, error: null })
  })

  it('identificar no lanza si la función falla: mensaje amable', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('500') })
    const r = await identificarProducto('a')
    expect(r.producto).toBeNull()
    expect(r.error).toMatch(/completar los datos/)
  })

  it('identificar usa el mensaje del error de la función', async () => {
    invoke.mockResolvedValue({ data: { error: { code: 'x', message: 'Foto muy oscura' } }, error: null })
    expect((await identificarProducto('a')).error).toBe('Foto muy oscura')
  })

  it('identificar sobrevive a una excepción de red', async () => {
    invoke.mockRejectedValue(new Error('network'))
    expect((await identificarProducto('a')).producto).toBeNull()
  })

  it('mejorar devuelve la nueva ruta', async () => {
    invoke.mockResolvedValue({ data: { foto_path: 'org-1/cli-1/b.jpg' }, error: null })
    expect(await mejorarFoto('org-1/cli-1/a.jpg')).toEqual({ path: 'org-1/cli-1/b.jpg', error: null })
    expect(invoke).toHaveBeenCalledWith('producto-ia', { body: { accion: 'mejorar', foto_path: 'org-1/cli-1/a.jpg' } })
  })

  it('mejorar falla con mensaje amable', async () => {
    invoke.mockResolvedValue({ data: {}, error: null })
    const r = await mejorarFoto('a')
    expect(r.path).toBeNull()
    expect(r.error).toMatch(/usar la original/)
  })
})

describe('unidadDelFormulario', () => {
  it('traduce las unidades de la IA a las del formulario', () => {
    expect(unidadDelFormulario('LT')).toBe('LTS')
    expect(unidadDelFormulario('MT')).toBe('MTS')
    expect(unidadDelFormulario('PAQ')).toBe('BULTO')
    expect(unidadDelFormulario('kg')).toBe('KG')
    expect(unidadDelFormulario('raro')).toBe('UND')
    expect(unidadDelFormulario(null)).toBe('UND')
  })
})
