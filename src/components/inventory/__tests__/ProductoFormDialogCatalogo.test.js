import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}
globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const buscarProducto = vi.fn()
const copiarFoto = vi.fn()
vi.mock('@/services/catalogoService', () => ({
  buscarProducto: (...a) => buscarProducto(...a),
  copiarFotoCatalogoAlNegocio: (...a) => copiarFoto(...a),
  urlFotoCatalogo: (p) => (p ? `https://cat/${p}` : null)
}))
vi.mock('@/services/inventoryService', () => ({ default: {} }))
vi.mock('@/services/rubroService', () => ({ guardarRubro: vi.fn() }))
vi.mock('@/services/productoFotoService', () => ({
  subirFoto: vi.fn(), urlFoto: vi.fn().mockResolvedValue(null), mejorarFoto: vi.fn(), borrarFotos: vi.fn(),
  unidadDelFormulario: (u) => ({ KG: 'KG', UND: 'UND' }[String(u || '').toUpperCase()] || 'UND')
}))

import ProductoFormDialog from '../ProductoFormDialog.vue'

const ITEM = {
  id: '1', codigo_barras: '4006381333931', nombre: 'Harina PAN 1 kg', marca: 'PAN', categoria: 'Víveres',
  presentacion: '1 kg', unidad: 'KG', foto_path: 'harina.jpg', confirmaciones: 3, verificado: false
}

let wrapper
function montar(props = {}) {
  wrapper = mount(ProductoFormDialog, {
    props: { modelValue: true, producto: null, ...props },
    global: { plugins: [createVuetify({ components, directives })] },
    attachTo: document.body
  })
  return wrapper
}
const cuerpo = () => document.body

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  buscarProducto.mockReset()
  copiarFoto.mockReset()
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('ProductoFormDialog: catálogo global', () => {
  it('con prefill de IA con código válido llena los campos vacíos y ofrece la foto', async () => {
    buscarProducto.mockResolvedValue([ITEM])
    montar({ prefill: { foto_path: null, producto: { nombre: '', codigo_barras: '4006381333931' } } })
    await flushPromises()
    vi.advanceTimersByTime(450)
    await flushPromises()
    expect(buscarProducto).toHaveBeenCalledWith('4006381333931', 1)
    expect(cuerpo().textContent).toContain('Datos de AD System · confirmados por 3 negocios')
    expect(cuerpo().querySelector('[data-testid="catalogo-oferta-foto"]')).not.toBeNull()
    const nombre = cuerpo().querySelector('input[type="text"]')
    expect(nombre.value).toBe('Harina PAN 1 kg')
  })

  it('"No es este" deshace el llenado', async () => {
    buscarProducto.mockResolvedValue([ITEM])
    montar({ prefill: { foto_path: null, producto: { nombre: '', codigo_barras: '4006381333931' } } })
    await flushPromises()
    vi.advanceTimersByTime(450)
    await flushPromises()
    cuerpo().querySelector('[data-testid="catalogo-no-es-este"]').click()
    await flushPromises()
    expect(cuerpo().querySelector('[data-testid="catalogo-marca-producto"]')).toBeNull()
    expect(cuerpo().querySelector('input[type="text"]').value).toBe('')
  })

  it('sin código y con 3+ letras sugiere hasta 3 productos tras ~400 ms y al elegir llena', async () => {
    buscarProducto.mockResolvedValue([ITEM, { ...ITEM, id: '2', nombre: 'Harina de trigo', codigo_barras: null }, { ...ITEM, id: '3', nombre: 'Harina X' }, { ...ITEM, id: '4', nombre: 'Harina Y' }])
    montar()
    await flushPromises()
    const input = cuerpo().querySelector('input[type="text"]')
    input.value = 'Har'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    vi.advanceTimersByTime(300)
    expect(buscarProducto).not.toHaveBeenCalled()
    vi.advanceTimersByTime(150)
    await flushPromises()
    expect(buscarProducto).toHaveBeenCalledWith('Har', 3)
    const botones = cuerpo().querySelectorAll('.pf-sugerencia')
    expect(botones.length).toBe(3)
    botones[0].click()
    await flushPromises()
    expect(cuerpo().querySelector('[data-testid="catalogo-sugerencias"]')).toBeNull()
    expect(cuerpo().textContent).toContain('Datos de AD System')
  })

  it('al editar un producto no consulta el catálogo', async () => {
    montar({ producto: { id: 'p1', name: 'Harina', tipo: 'producto', codigo_barras: '4006381333931' } })
    await flushPromises()
    vi.advanceTimersByTime(600)
    await flushPromises()
    expect(buscarProducto).not.toHaveBeenCalled()
  })

  it('"Usar foto del catálogo" copia la foto al negocio', async () => {
    buscarProducto.mockResolvedValue([ITEM])
    copiarFoto.mockResolvedValue('org/cli/x.jpg')
    montar({ prefill: { foto_path: null, producto: { nombre: '', codigo_barras: '4006381333931' } } })
    await flushPromises()
    vi.advanceTimersByTime(450)
    await flushPromises()
    const boton = [...cuerpo().querySelectorAll('[data-testid="catalogo-oferta-foto"] button')][0]
    boton.click()
    await flushPromises()
    expect(copiarFoto).toHaveBeenCalledWith('harina.jpg')
    expect(cuerpo().querySelector('[data-testid="catalogo-oferta-foto"]')).toBeNull()
  })

  it('sin BarcodeDetector no aparece el botón Escanear', async () => {
    montar()
    await flushPromises()
    expect(cuerpo().querySelector('[data-testid="boton-escanear"]')).toBeNull()
  })
})
