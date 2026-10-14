import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const inFn = vi.fn()
const getPublicUrl = vi.fn()
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: () => ({ select: () => ({ in: (...a) => inFn(...a) }) }),
    storage: { from: () => ({ getPublicUrl: (...a) => getPublicUrl(...a) }) }
  }
}))
vi.mock('@/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
const subirBlob = vi.fn()
const reducirImagen = vi.fn()
vi.mock('@/services/productoFotoService', () => ({
  subirBlob: (...a) => subirBlob(...a),
  reducirImagen: (...a) => reducirImagen(...a)
}))

import {
  buscarProveedorPorRif, buscarProducto, buscarProductosPorCodigos,
  urlFotoCatalogo, copiarFotoCatalogoAlNegocio, rifParaCatalogo
} from '../catalogoService'

beforeEach(() => { vi.clearAllMocks() })

describe('catalogoService', () => {
  it('rifParaCatalogo exige letra + 9 dígitos', () => {
    expect(rifParaCatalogo('j-12345678-9')).toBe('J123456789')
    expect(rifParaCatalogo('J-1234')).toBeNull()
  })

  it('buscarProveedorPorRif devuelve la fila o null', async () => {
    rpc.mockResolvedValueOnce({ data: [{ razon_social: 'X' }], error: null })
    expect(await buscarProveedorPorRif('J-12345678-9')).toEqual({ razon_social: 'X' })
    expect(rpc).toHaveBeenCalledWith('buscar_catalogo_proveedor', { p_rif: 'J123456789' })
    expect(await buscarProveedorPorRif('J-12')).toBeNull()
  })

  it('buscarProveedorPorRif no lanza si falla', async () => {
    rpc.mockRejectedValueOnce(new Error('red'))
    expect(await buscarProveedorPorRif('J-12345678-9')).toBeNull()
  })

  it('buscarProducto: texto corto no consulta; código y texto sí', async () => {
    expect(await buscarProducto('ha')).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
    rpc.mockResolvedValue({ data: [{ nombre: 'Harina' }], error: null })
    expect(await buscarProducto('harina', 3)).toHaveLength(1)
    expect(rpc).toHaveBeenLastCalledWith('buscar_catalogo_producto', { p_texto: 'harina', p_limite: 3 })
    await buscarProducto('4006381333931')
    expect(rpc).toHaveBeenLastCalledWith('buscar_catalogo_producto', { p_texto: '4006381333931', p_limite: 5 })
  })

  it('buscarProducto devuelve [] si hay error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'x' } })
    expect(await buscarProducto('harina')).toEqual([])
  })

  it('buscarProductosPorCodigos hace un solo in con códigos válidos únicos', async () => {
    inFn.mockResolvedValue({ data: [{ codigo_barras: '4006381333931' }], error: null })
    const r = await buscarProductosPorCodigos(['4006381333931', '4006381333931', '123', '4006381333932'])
    expect(inFn).toHaveBeenCalledTimes(1)
    expect(inFn).toHaveBeenCalledWith('codigo_barras', ['4006381333931'])
    expect(r).toHaveLength(1)
    expect(await buscarProductosPorCodigos([])).toEqual([])
  })

  it('urlFotoCatalogo', () => {
    getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/y.jpg' } })
    expect(urlFotoCatalogo('y.jpg')).toBe('https://x/y.jpg')
    expect(urlFotoCatalogo(null)).toBeNull()
  })

  it('copiarFotoCatalogoAlNegocio descarga y sube la foto', async () => {
    getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/y.jpg' } })
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['a']) })
    reducirImagen.mockResolvedValue(new Blob(['b']))
    subirBlob.mockResolvedValue({ path: 'org/cli/a.jpg', error: null })
    expect(await copiarFotoCatalogoAlNegocio('y.jpg')).toBe('org/cli/a.jpg')
  })

  it('copiarFotoCatalogoAlNegocio devuelve null si falla', async () => {
    getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://x/y.jpg' } })
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('red'))
    expect(await copiarFotoCatalogoAlNegocio('y.jpg')).toBeNull()
  })
})
