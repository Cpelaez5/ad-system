import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HojaMas from '@/components/layout/HojaMas.vue'
import { getMenuClienteMas } from '@/components/layout/menuPorRol.js'

/**
 * HojaMas — hallazgo #8 Importante: antes repetía a mano los 6 ítems del
 * menú del cliente (podía divergir de `MenuLateral.vue`/`menuPorRol.js` sin
 * que ningún test lo notara). Ahora usa `getMenuClienteMas` directamente, y
 * este spec verifica justamente eso: que renderiza lo que esa función
 * devuelve, no una copia a mano.
 */
const globalConfig = {
  stubs: {
    'v-list': { template: '<div class="v-list"><slot /></div>' },
    'v-list-item': {
      props: ['title'],
      template:
        '<div class="v-list-item" v-bind="$attrs"><slot name="prepend" /><span>{{ title }}</span><slot /><slot name="append" /></div>',
    },
    'v-list-subheader': { template: '<div class="v-list-subheader"><slot /></div>' },
    'v-divider': { template: '<hr />' },
    'v-icon': { template: '<i><slot /></i>' },
  },
}

describe('HojaMas', () => {
  it('renderiza exactamente los ítems de getMenuClienteMas (misma fuente de verdad que el drawer)', () => {
    const wrapper = mount(HojaMas, { props: { isServicesCompany: false }, global: globalConfig })
    const esperados = getMenuClienteMas({ isServicesCompany: false })
    esperados.forEach((item) => {
      expect(wrapper.text()).toContain(item.titulo)
    })
    // No repite "Inicio" ni "Mis movimientos": esos ya están en la barra inferior.
    expect(wrapper.text()).not.toContain('Inicio')
  })

  it('ofrece "Cambiar mi tasa" que lleva a Mi negocio → Tasa de cambio', async () => {
    const wrapper = mount(HojaMas, { props: { isServicesCompany: false }, global: globalConfig })
    await wrapper.find('[data-testid="hoja-cambiar-tasa"]').trigger('click')
    expect(wrapper.emitted('navegar').at(-1)[0]).toBe('/cliente/mi-area#tasa')
  })

  it('avisa cuando la tasa falló o está desactualizada y rotula las tasas manuales', () => {
    const fallo = mount(HojaMas, { props: { tasaInfo: { modo: 'automatica', fallo: true } }, global: globalConfig })
    expect(fallo.find('[data-testid="hoja-aviso-tasa"]').text()).toContain('No pudimos actualizar la tasa del BCV')

    const vieja = mount(HojaMas, {
      props: { tasaInfo: { modo: 'manual', desactualizada: true, fecha: '2026-10-10' } },
      global: globalConfig,
    })
    expect(vieja.text()).toContain('Tus tasas (manual)')
    expect(vieja.find('[data-testid="hoja-aviso-tasa"]').text()).toContain('10/10/2026')

    const bien = mount(HojaMas, { props: { tasaInfo: { modo: 'automatica' } }, global: globalConfig })
    expect(bien.find('[data-testid="hoja-aviso-tasa"]').exists()).toBe(false)
  })

  it('oculta "Mi mercancía" si isServicesCompany=true (igual que el drawer de escritorio)', () => {
    const conInventario = mount(HojaMas, { props: { isServicesCompany: false }, global: globalConfig })
    expect(conInventario.text()).toContain('Mi mercancía')

    const sinInventario = mount(HojaMas, { props: { isServicesCompany: true }, global: globalConfig })
    expect(sinInventario.text()).not.toContain('Mi mercancía')
  })

  it('emite "navegar" con el destino del ítem (objeto de ruta, no un string a mano)', async () => {
    const wrapper = mount(HojaMas, { props: { isServicesCompany: true }, global: globalConfig })
    const item = wrapper.findAll('.v-list-item').find((i) => i.text().includes('¿Cómo voy?'))
    await item.trigger('click')
    expect(wrapper.emitted('navegar')).toBeTruthy()
    expect(wrapper.emitted('navegar')[0][0]).toEqual({ name: 'ClienteDashboard' })
  })

  it('muestra las tasas del día solicitadas (showUsdRate/showEurRate) con formatTasa ("Bs ...")', () => {
    const wrapper = mount(HojaMas, {
      props: {
        bcvRate: { dollar: 36.5, euro: 39.1 },
        showUsdRate: true,
        showEurRate: true,
      },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Dólar')
    expect(wrapper.text()).toContain('Bs 36,50')
    expect(wrapper.text()).toContain('Euro')
    expect(wrapper.text()).toContain('Bs 39,10')
  })

  it('no muestra el euro si showEurRate=false, aunque haya tasa', () => {
    const wrapper = mount(HojaMas, {
      props: { bcvRate: { dollar: 36.5, euro: 39.1 }, showUsdRate: true, showEurRate: false },
      global: globalConfig,
    })
    expect(wrapper.text()).not.toContain('Euro')
  })

  it('emite "ayuda" al hacer clic en Ayuda', async () => {
    const wrapper = mount(HojaMas, { global: globalConfig })
    const item = wrapper.findAll('.v-list-item').find((i) => i.text().includes('Ayuda'))
    await item.trigger('click')
    expect(wrapper.emitted('ayuda')).toBeTruthy()
  })

  it('emite "logout" al hacer clic en Cerrar sesión', async () => {
    const wrapper = mount(HojaMas, { global: globalConfig })
    const item = wrapper.findAll('.v-list-item').find((i) => i.text().includes('Cerrar sesión'))
    await item.trigger('click')
    expect(wrapper.emitted('logout')).toBeTruthy()
  })
})
