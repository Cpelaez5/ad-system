import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive, nextTick } from 'vue'

import Inicio from '../Inicio.vue'
import { formatMoney } from '@/utils/formatMoney'

// ─── Mocks de servicios (no se ejecuta red/Supabase real) ───────────────────
const mockGetCurrentUser = vi.fn()
const mockGetInvoices = vi.fn()
const mockGetFiscalDocs = vi.fn()
const mockBillingGetInvoices = vi.fn()
const mockGetCurrentRate = vi.fn()
const mockGuardarRegistro = vi.fn()

vi.mock('@/services/userService', () => ({
  default: { getCurrentUser: (...args) => mockGetCurrentUser(...args) },
}))
vi.mock('@/services/invoiceService', () => ({
  default: { getInvoices: (...args) => mockGetInvoices(...args) },
}))
vi.mock('@/services/fiscalService', () => ({
  default: { getFiscalDocs: (...args) => mockGetFiscalDocs(...args) },
}))
vi.mock('@/services/billingService', () => ({
  default: { getInvoices: (...args) => mockBillingGetInvoices(...args) },
}))
vi.mock('@/services/bcvService', () => ({
  default: { getCurrentRate: (...args) => mockGetCurrentRate(...args) },
}))
vi.mock('@/services/seal-service', () => ({
  default: { getSealConfig: () => Promise.resolve({ sealUrl: null, signatureUrl: null }) },
}))
vi.mock('@/services/registroService', () => ({
  guardarRegistro: (...args) => mockGuardarRegistro(...args),
}))

// SimpleInvoiceForm es un formulario enorme con dependencias propias (OCR,
// proveedores, etc.) — se reemplaza por un stub mínimo que expone la misma
// API que usa Inicio.vue (prop flow, eventos submit/cancel, refs onSaveSuccess/onSaveFailed).
vi.mock('@/components/forms/client/SimpleInvoiceForm.vue', () => ({
  default: {
    name: 'SimpleInvoiceForm',
    props: ['invoice', 'flow', 'simple'],
    emits: ['submit', 'cancel', 'saved'],
    template: '<div class="stub-simple-invoice-form">{{ flow }}</div>',
    methods: {
      onSaveSuccess() {},
      onSaveFailed() {},
    },
  },
}))

// ─── Fecha dentro del mes actual (robusta frente al día de ejecución) ───────
function fechaEnMesActual(dia = 5) {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), dia).toISOString()
}

function montarInicio({ routeQuery = {}, routerReplace = vi.fn(), routerPush = vi.fn() } = {}) {
  const route = reactive({ query: { ...routeQuery } })
  const wrapper = mount(Inicio, {
    global: {
      mocks: {
        $route: route,
        $router: { replace: routerReplace, push: routerPush },
        $vuetify: { display: { smAndDown: false } },
      },
    },
  })
  return { wrapper, route, routerReplace, routerPush }
}

describe('Inicio.vue — pantalla de inicio del cliente', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockGetCurrentUser.mockResolvedValue({
      id: 'u1',
      firstName: 'María',
      email: 'maria@bodega.com',
      client_id: 'c1',
      client: { company_name: 'Bodega María' },
    })
    mockGetFiscalDocs.mockResolvedValue([])
    mockBillingGetInvoices.mockResolvedValue({ success: true, data: [] })
    mockGetCurrentRate.mockResolvedValue({ success: true, data: { dollar: 36.5, euro: 39 } })
    mockGetInvoices.mockResolvedValue([])
  })

  it('muestra la frase del mes con los montos del cliente formateados', async () => {
    mockGetInvoices.mockImplementation(({ flow }) => {
      if (flow === 'VENTA') {
        return Promise.resolve([
          { issueDate: fechaEnMesActual(), financial: { totalSales: 1250, currency: 'USD' } },
        ])
      }
      return Promise.resolve([
        { issueDate: fechaEnMesActual(), financial: { totalSales: 830, currency: 'USD' } },
      ])
    })

    const { wrapper } = montarInicio()
    await flushPromises()

    // Los montos de la frase del mes usan <AnimatedNumber> (conteo animado,
    // ver docs/mvp/diseno/sistema-diseno.md §3.5): se espera a que termine
    // su animación (400ms) antes de leer el texto final.
    await new Promise((resolve) => setTimeout(resolve, 500))
    await flushPromises()

    const texto = wrapper.text()
    expect(texto).toContain('¡Hola, María!')
    expect(texto).toContain(formatMoney(1250, 'USD'))
    expect(texto).toContain(formatMoney(830, 'USD'))
    expect(texto).toContain(formatMoney(420, 'USD'))
  })

  it('sin pendientes y con datos del negocio incompletos, el siguiente paso es completarlos', async () => {
    const { wrapper } = montarInicio()
    await flushPromises()

    const panel = wrapper.findComponent({ name: 'PanelSiguientePaso' })
    expect(panel.exists()).toBe(true)
    expect(panel.props('listo')).toBe(false)
    expect(panel.props('titulo')).toBe('Completa los datos de tu negocio')
  })

  it('muestra "Primeros pasos" con avance calculado de los datos reales', async () => {
    const { wrapper } = montarInicio()
    await flushPromises()

    const lista = wrapper.findComponent({ name: 'ListaPasos' })
    expect(lista.exists()).toBe(true)
    const pasos = lista.props('pasos')
    expect(pasos.map(p => p.clave)).toEqual(['perfil', 'gasto', 'venta', 'rif', 'sello', 'comovoy'])
    expect(pasos.find(p => p.clave === 'perfil').hecho).toBe(false)
    expect(pasos.find(p => p.clave === 'sello').hecho).toBe(false)
  })

  it('abre el diálogo de registro en modo COMPRA al tocar "Gasté o compré algo"', async () => {
    const { wrapper } = montarInicio()
    await flushPromises()

    expect(wrapper.find('.stub-simple-invoice-form').exists()).toBe(false)

    const tarjetas = wrapper.findAllComponents({ name: 'TarjetaAccion' })
    const tarjetaGasto = tarjetas.find(t => t.props('titulo') === 'Gasté o compré algo')
    expect(tarjetaGasto).toBeTruthy()

    await tarjetaGasto.trigger('click')
    await nextTick()

    const formulario = wrapper.findComponent({ name: 'SimpleInvoiceForm' })
    expect(formulario.exists()).toBe(true)
    expect(formulario.props('flow')).toBe('COMPRA')
  })

  it('abre el registro según ?registrar=compra|venta y limpia el query al cerrar', async () => {
    const routerReplace = vi.fn()
    const { wrapper, route } = montarInicio({ routeQuery: { registrar: 'compra' }, routerReplace })
    await flushPromises()

    let formulario = wrapper.findComponent({ name: 'SimpleInvoiceForm' })
    expect(formulario.exists()).toBe(true)
    expect(formulario.props('flow')).toBe('COMPRA')

    // Reactividad: cambia la query sin remontar el componente.
    wrapper.vm.dialogRegistroAbierto = false
    route.query.registrar = 'venta'
    await nextTick()

    formulario = wrapper.findComponent({ name: 'SimpleInvoiceForm' })
    expect(formulario.exists()).toBe(true)
    expect(formulario.props('flow')).toBe('VENTA')

    // Al cerrar, se limpia el query para que "atrás" no reabra el diálogo.
    await formulario.vm.$emit('cancel')
    await nextTick()
    expect(routerReplace).toHaveBeenCalledWith({ query: {} })
  })
})
