/**
 * Pantallas del panel de Operación del super admin (catálogo, uso de IA,
 * tasas y portada). El servicio está simulado: ningún test toca la BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

const servicio = vi.hoisted(() => ({
  contarPorVerificar: vi.fn(),
  listarCatalogo: vi.fn(),
  verificar: vi.fn(),
  editar: vi.fn(),
  crear: vi.fn(),
  eliminar: vi.fn(),
  subirFotoEstudio: vi.fn(),
  importarSemilla: vi.fn(),
  urlFoto: vi.fn(() => null),
  filasUsoIa: vi.fn(),
  contarErroresIa7Dias: vi.fn(),
  filasTasas: vi.fn(),
  guardarTasaManual: vi.fn(),
}))
vi.mock('@/services/superAdminService', () => servicio)
vi.mock('@/services/soporteService', () => ({ contarSinResponder: vi.fn(async () => ({ data: 0, error: null })) }))
vi.mock('@/services/importacionProductosService', () => ({ leerArchivo: vi.fn() }))

const mostrar = vi.hoisted(() => vi.fn())
vi.mock('@/store/notificacionStore', () => ({ useNotificacionStore: () => ({ mostrar }) }))

import CatalogoGlobal from '../CatalogoGlobal.vue'
import UsoIa from '../UsoIa.vue'
import TasasGlobales from '../TasasGlobales.vue'
import OperacionPortada from '../OperacionPortada.vue'

const stubs = {
  // El diálogo real se teletransporta al body: aquí solo se pinta su contenido.
  DialogoAdaptable: {
    props: ['modelValue', 'titulo'],
    template: '<div v-if="modelValue" class="dialogo"><h2>{{ titulo }}</h2><slot /><slot name="acciones" /></div>',
  },
  GraficoBarras: { props: ['labels', 'series', 'formato'], template: '<div class="grafico" :data-formato="formato" :data-dias="labels.length" />' },
  'router-link': { props: ['to'], template: '<a :href="to" class="enlace"><slot /></a>' },
}
const montar = (comp) => mount(comp, {
  global: { plugins: [createVuetify({ components, directives })], stubs, mocks: { $router: { push: vi.fn() } } },
})

const hoyLocal = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

beforeEach(() => {
  vi.clearAllMocks()
  servicio.urlFoto.mockReturnValue(null)
  servicio.contarPorVerificar.mockResolvedValue({ data: { proveedores: 2, productos: 3 }, error: null })
})

describe('CatalogoGlobal', () => {
  const producto = { id: 'p1', codigo_barras: '7591039000015', nombre: 'Harina PAN 1 kg', marca: 'PAN', categoria: 'Víveres', confirmaciones: 4, verificado: false, fuente: 'aporte' }

  beforeEach(() => {
    servicio.listarCatalogo.mockResolvedValue({ data: [producto], total: 1, error: null })
    servicio.verificar.mockResolvedValue({ data: {}, error: null })
  })

  it('muestra los productos por verificar con su marca, categoría, código y confirmaciones', async () => {
    const w = montar(CatalogoGlobal)
    await flushPromises()
    expect(servicio.listarCatalogo).toHaveBeenCalledWith('productos', expect.objectContaining({ filtro: 'por_verificar' }))
    const fila = w.get('[data-testid="catalogo-fila"]')
    expect(fila.text()).toContain('Harina PAN 1 kg')
    expect(fila.text()).toContain('PAN · Víveres')
    expect(fila.text()).toContain('7591039000015')
    expect(fila.text()).toContain('Confirmado por 4 negocios')
    expect(w.text()).toContain('Hay 3 productos por verificar')
  })

  it('Verificar llama al servicio y recarga la lista', async () => {
    const w = montar(CatalogoGlobal)
    await flushPromises()
    await w.get('[data-testid="catalogo-verificar"]').trigger('click')
    await flushPromises()
    expect(servicio.verificar).toHaveBeenCalledWith('productos', 'p1', true)
    expect(servicio.listarCatalogo).toHaveBeenCalledTimes(2)
    expect(mostrar).toHaveBeenCalledWith(expect.stringContaining('verificado'), 'success')
  })

  it('Agregar valida el código de barras antes de guardar', async () => {
    const w = montar(CatalogoGlobal)
    await flushPromises()
    await w.get('[data-testid="catalogo-agregar"]').trigger('click')
    await w.get('[data-testid="form-codigo"] input').setValue('111')
    await w.get('[data-testid="form-nombre"] input').setValue('Algo')
    await w.get('[data-testid="form-guardar"]').trigger('click')
    await flushPromises()
    expect(servicio.crear).not.toHaveBeenCalled()
    expect(w.text()).toContain('no es válido')
  })

  it('Agregar guarda un producto válido', async () => {
    servicio.crear.mockResolvedValue({ data: {}, error: null })
    const w = montar(CatalogoGlobal)
    await flushPromises()
    await w.get('[data-testid="catalogo-agregar"]').trigger('click')
    await w.get('[data-testid="form-codigo"] input').setValue('7591039000022')
    await w.get('[data-testid="form-nombre"] input').setValue('Arroz Mary 1 kg')
    await w.get('[data-testid="form-guardar"]').trigger('click')
    await flushPromises()
    expect(servicio.crear).toHaveBeenCalledWith('productos', expect.objectContaining({ codigo_barras: '7591039000022', nombre: 'Arroz Mary 1 kg' }))
  })

  it('no ofrece nada de los aportes de los negocios (solo el número de confirmaciones)', async () => {
    const w = montar(CatalogoGlobal)
    await flushPromises()
    expect(Object.keys(servicio).some((k) => /aporte/i.test(k))).toBe(false)
    expect(w.text()).not.toMatch(/aportó|aportado por|negocio:/i)
  })

  it('muestra un estado vacío cuando no hay nada', async () => {
    servicio.listarCatalogo.mockResolvedValue({ data: [], total: 0, error: null })
    const w = montar(CatalogoGlobal)
    await flushPromises()
    expect(w.text()).toContain('No hay nada en esta lista')
  })
})

describe('UsoIa', () => {
  const ahora = new Date()
  const filas = [
    { user_id: 'a', model: 'gemini-2.5-flash', status: 'success', tokens_prompt: 100, tokens_completion: 20, costo_estimado: 0.01, created_at: ahora.toISOString() },
    { user_id: 'b', model: 'gemini-2.5-flash', status: 'error', error_code: 'RATE_LIMIT', error_message: 'Demasiadas llamadas', tokens_prompt: 0, tokens_completion: 0, costo_estimado: 0, created_at: ahora.toISOString() },
  ]

  it('muestra cifras, gráfico, modelos y errores sin datos personales', async () => {
    servicio.filasUsoIa.mockResolvedValue({ data: filas, error: null })
    const w = montar(UsoIa)
    await flushPromises()
    const cifras = w.get('[data-testid="cifras"]').text()
    expect(cifras).toContain('2')
    expect(cifras).toContain('50%')
    expect(cifras).toContain('$0,0100')
    expect(w.get('.grafico').attributes('data-formato')).toBe('entero')
    expect(w.get('.grafico').attributes('data-dias')).toBe('30')
    expect(w.get('[data-testid="fila-modelo"]').text()).toContain('gemini-2.5-flash')
    expect(w.get('[data-testid="fila-error"]').text()).toContain('RATE_LIMIT')
    expect(w.get('[data-testid="fila-error"]').text()).toContain('Demasiadas llamadas')
    expect(w.text()).toContain('2 personas distintas')
    expect(w.html()).not.toMatch(/@|user_id/)
  })

  it('cambiar el período vuelve a pedir los datos', async () => {
    servicio.filasUsoIa.mockResolvedValue({ data: filas, error: null })
    const w = montar(UsoIa)
    await flushPromises()
    const chip7 = w.findAll('.v-chip').find((c) => c.text() === '7 días')
    await chip7.trigger('click')
    await flushPromises()
    expect(servicio.filasUsoIa).toHaveBeenLastCalledWith(7, expect.any(Date))
    expect(w.get('.grafico').attributes('data-dias')).toBe('7')
  })

  it('avisa cuando hay más de 10.000 llamadas', async () => {
    servicio.filasUsoIa.mockResolvedValue({ data: Array.from({ length: 10000 }, () => filas[0]), error: null })
    const w = montar(UsoIa)
    await flushPromises()
    expect(w.find('[data-testid="aviso-truncado"]').exists()).toBe(true)
  })

  it('sin uso muestra un estado vacío', async () => {
    servicio.filasUsoIa.mockResolvedValue({ data: [], error: null })
    const w = montar(UsoIa)
    await flushPromises()
    expect(w.text()).toContain('Sin uso de IA en este período')
  })
})

describe('TasasGlobales', () => {
  beforeEach(() => {
    servicio.filasTasas.mockResolvedValue({ data: [{ date: hoyLocal(), currency: 'USD', rate: 104.25, source: 'PROXY-API-CRON' }], error: null })
    servicio.guardarTasaManual.mockResolvedValue({ data: true, error: null })
  })

  it('muestra el horario automático, la tabla y los días que faltan', async () => {
    const w = montar(TasasGlobales)
    await flushPromises()
    expect(w.text()).toContain('Las tasas se guardan solas de lunes a viernes a las 10:00 y 18:00 (Caracas)')
    expect(w.findAll('[data-testid="fila-tasa"]').length).toBe(60)
    expect(w.get('[data-testid="huecos"]').exists()).toBe(true)
    expect(w.text()).toMatch(/Faltan \d+ días|Falta 1 día|No falta ningún día/)
  })

  it('corregir una tasa pide confirmación y guarda con la fuente MANUAL-SUPERADMIN', async () => {
    const w = montar(TasasGlobales)
    await flushPromises()
    await w.get('[data-testid="tasa-corregir"]').trigger('click')
    await w.get('[data-testid="tasa-valor"] input').setValue('104036,77')
    expect(w.get('[data-testid="tasa-valor"] input').element.value).toBe('104.036,77')
    await w.get('[data-testid="tasa-revisar"]').trigger('click')
    expect(servicio.guardarTasaManual).not.toHaveBeenCalled()
    expect(w.get('[data-testid="tasa-confirmacion"]').text()).toContain('Bs 104.036,77')
    await w.get('[data-testid="tasa-guardar"]').trigger('click')
    await flushPromises()
    expect(servicio.guardarTasaManual).toHaveBeenCalledWith({ date: hoyLocal(), currency: 'USD', rate: 104036.77, source: 'MANUAL-SUPERADMIN' })
  })

  it('no guarda una tasa vacía', async () => {
    const w = montar(TasasGlobales)
    await flushPromises()
    await w.get('[data-testid="tasa-corregir"]').trigger('click')
    await w.get('[data-testid="tasa-revisar"]').trigger('click')
    expect(w.find('[data-testid="tasa-confirmacion"]').exists()).toBe(false)
    expect(w.text()).toContain('Escribe la tasa')
  })
})

describe('OperacionPortada', () => {
  it('resume las herramientas con enlaces y lista lo pendiente', async () => {
    servicio.contarErroresIa7Dias.mockResolvedValue({ data: 4, error: null })
    servicio.filasTasas.mockResolvedValue({ data: [], error: null })
    const w = montar(OperacionPortada)
    await flushPromises()
    expect(w.get('[data-testid="tarjeta-catalogo"]').text()).toContain('5')
    expect(w.get('[data-testid="tarjeta-catalogo"]').text()).toContain('2 proveedores y 3 productos por verificar')
    expect(w.get('[data-testid="tarjeta-ia"]').text()).toContain('4')
    expect(w.get('[data-testid="tarjeta-soporte"]').attributes('href')).toBe('/admin/soporte')
    expect(w.get('[data-testid="tarjeta-tasas"]').attributes('href')).toBe('/admin/tasas')
    expect(w.get('[data-testid="tarjeta-catalogo"]').attributes('href')).toBe('/admin/catalogo')
    expect(w.get('[data-testid="tarjeta-ia"]').attributes('href')).toBe('/admin/uso-ia')
    expect(w.text()).toContain('Lo que sigue pendiente')
    expect(w.text()).toContain('Fusionar productos y proveedores duplicados')
  })
})
