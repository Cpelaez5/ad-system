import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import ClienteMiArea from '../ClienteMiArea.vue'

// jsdom no trae visualViewport (lo usa el overlay de Vuetify).
if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

// ─── Mocks de servicios (sin red/Supabase real) ─────────────────────────────
const mockGetCurrentUser = vi.fn()
const mockUpdateUserProfile = vi.fn()
const mockGetSealConfig = vi.fn()
const mockRemoveSealAsset = vi.fn()

vi.mock('@/services/userService', () => ({
  default: {
    getCurrentUser: (...args) => mockGetCurrentUser(...args),
    updateUserProfile: (...args) => mockUpdateUserProfile(...args),
  },
}))
vi.mock('@/services/seal-service', () => ({
  default: {
    getSealConfig: (...args) => mockGetSealConfig(...args),
    removeSealAsset: (...args) => mockRemoveSealAsset(...args),
  },
}))

function usuarioBase(overrides = {}) {
  return {
    id: 'u1',
    firstName: 'María',
    lastName: 'Pérez',
    email: 'maria@bodega.com',
    role: 'cliente',
    client_id: 'c1',
    client: {
      id: 'c1',
      company_name: 'Bodega María',
      rif: 'J-12345678-9',
      activity_type: '',
      licencia_actividad_economica: '',
      estado: '',
      municipio_id: '',
      taxpayer_type: 'JURIDICA',
      es_contribuyente_especial: false,
      es_agente_retencion_municipal: false,
      retains_islr: false,
    },
    ...overrides,
  }
}

function montar() {
  const vuetify = createVuetify({ components, directives })
  return mount(ClienteMiArea, {
    global: {
      plugins: [vuetify],
      mocks: {
        $route: { query: {} },
        $router: { push: vi.fn() },
      },
    },
    attachTo: document.body,
  })
}

describe('ClienteMiArea.vue — Mi negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSealConfig.mockResolvedValue({ sealUrl: null, signatureUrl: null, combinedUrl: null })
  })

  it('usa "Mi negocio" como título (igual que el menú)', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase())
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Mi negocio')
  })

  it('calcula el avance real por bloque: con el perfil vacío solo "Tu cuenta" está listo', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase())
    const wrapper = montar()
    await flushPromises()

    // Datos de la empresa, Perfil fiscal y Sello y firma incompletos; Tu
    // cuenta listo (firstName/lastName presentes) → 1 de 4 = 25%.
    expect(wrapper.vm.porcentajeListo).toBe(25)
    expect(wrapper.vm.todoListo).toBe(false)
    expect(wrapper.vm.siguienteBloque.clave).toBe('empresa')
  })

  it('con los 4 bloques completos queda 100% listo y sin siguiente bloque', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase({
      client: {
        id: 'c1',
        company_name: 'Bodega María',
        rif: 'J-12345678-9',
        activity_type: 'goods',
        licencia_actividad_economica: 'LAE-123',
        estado: 'Miranda',
        municipio_id: 'Chacao',
        taxpayer_type: 'JURIDICA',
        es_contribuyente_especial: false,
        es_agente_retencion_municipal: false,
        retains_islr: false,
      },
    }))
    mockGetSealConfig.mockResolvedValue({ sealUrl: 'ruta/sello.png', signatureUrl: null, combinedUrl: null })

    const wrapper = montar()
    await flushPromises()

    expect(wrapper.vm.porcentajeListo).toBe(100)
    expect(wrapper.vm.todoListo).toBe(true)
    expect(wrapper.vm.siguienteBloque).toBeNull()
  })

  it('al guardar los datos de la empresa, envía "estado" (I6: antes se perdía en el guardado)', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase({
      client: {
        id: 'c1',
        company_name: 'Bodega María',
        rif: 'J-12345678-9',
        activity_type: 'goods',
        licencia_actividad_economica: 'LAE-123',
        estado: 'Miranda',
        municipio_id: 'Chacao',
        taxpayer_type: 'JURIDICA',
        es_contribuyente_especial: false,
        es_agente_retencion_municipal: false,
        retains_islr: false,
      },
    }))
    mockUpdateUserProfile.mockResolvedValue({ success: true, user: usuarioBase() })

    const wrapper = montar()
    await flushPromises()

    await wrapper.vm.updateCompanyData()
    await flushPromises()

    expect(mockUpdateUserProfile).toHaveBeenCalled()
    const payload = mockUpdateUserProfile.mock.calls[0][1]
    expect(payload.client.estado).toBe('Miranda')
    expect(payload.client.municipio_id).toBe('Chacao')
  })

  it('al guardar el perfil fiscal, sincroniza es_contribuyente_especial con is_special_taxpayer (columna legada)', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase())
    mockUpdateUserProfile.mockResolvedValue({ success: true, user: usuarioBase() })

    const wrapper = montar()
    await flushPromises()

    wrapper.vm.form.es_contribuyente_especial = true
    wrapper.vm.form.es_agente_retencion_municipal = true
    wrapper.vm.form.retains_islr = true
    wrapper.vm.form.activity_type = 'services'
    wrapper.vm.form.taxpayer_type = 'NATURAL'

    await wrapper.vm.updateFiscalProfile()
    await flushPromises()

    const payload = mockUpdateUserProfile.mock.calls[0][1]
    expect(payload.client.es_contribuyente_especial).toBe(true)
    expect(payload.client.is_special_taxpayer).toBe(true)
    expect(payload.client.es_agente_retencion_municipal).toBe(true)
    expect(payload.client.retains_islr).toBe(true)
    expect(payload.client.activity_type).toBe('services')
    expect(payload.client.taxpayer_type).toBe('NATURAL')
  })

  it('"Perfil fiscal" se marca listo solo con activity_type (los sí/no son booleanos con default false, no distinguibles de "sin responder")', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase())
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.vm.perfilFiscalCompleto).toBe(false)
    wrapper.vm.form.activity_type = 'goods'
    expect(wrapper.vm.perfilFiscalCompleto).toBe(true)
  })

  it('la papelera del sello pregunta antes de borrar; solo al confirmar se quita', async () => {
    mockGetCurrentUser.mockResolvedValue(usuarioBase())
    mockGetSealConfig.mockResolvedValue({ sealUrl: 'https://x/sello.png', signatureUrl: null, combinedUrl: null })
    mockRemoveSealAsset.mockResolvedValue({ success: true, config: { sealUrl: null } })
    const w = montar()
    await flushPromises()
    w.vm.borrarSelloPendiente = 'seal'
    await w.vm.$nextTick()
    expect(mockRemoveSealAsset).not.toHaveBeenCalled()
    await w.vm.confirmarBorrarSello()
    expect(mockRemoveSealAsset).toHaveBeenCalledWith('seal', 'c1')
    expect(w.vm.borrarSelloPendiente).toBeNull()
  })
})
