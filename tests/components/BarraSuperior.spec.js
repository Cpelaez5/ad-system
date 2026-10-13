import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BarraSuperior from '@/components/layout/BarraSuperior.vue'

/**
 * BarraSuperior — hallazgo #8 Importante (la afirmación de AppShell.spec.js
 * de que "cada uno tiene su propio spec" era falsa para este componente).
 * Se stubbea ChipTasa/MenuUsuario: sus propios specs cubren su comportamiento.
 */
const globalConfig = {
  stubs: {
    ChipTasa: { template: '<span class="chip-tasa-stub" />', props: ['currency', 'rateValue', 'loading', 'error'] },
    MenuUsuario: true,
  },
}

describe('BarraSuperior', () => {
  it('muestra el título de la vista actual', () => {
    const wrapper = mount(BarraSuperior, {
      props: { tituloPagina: '¿Cómo voy?' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('¿Cómo voy?')
  })

  it('usa el título por defecto si no se pasa ninguno', () => {
    const wrapper = mount(BarraSuperior, { global: globalConfig })
    expect(wrapper.text()).toContain('Sistema Contable')
  })

  it('actualiza el título mostrado cuando cambia la prop (crossfade de ruta)', async () => {
    const wrapper = mount(BarraSuperior, {
      props: { tituloPagina: 'Inicio' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Inicio')
    await wrapper.setProps({ tituloPagina: 'Mis movimientos' })
    expect(wrapper.text()).toContain('Mis movimientos')
    expect(wrapper.text()).not.toContain('Inicio')
  })

  it('muestra el botón de menú (hamburguesa) solo si mostrarMenu=true', () => {
    const conMenu = mount(BarraSuperior, { props: { mostrarMenu: true }, global: globalConfig })
    expect(conMenu.find('[aria-label="Abrir menú"]').exists()).toBe(true)

    const sinMenu = mount(BarraSuperior, { props: { mostrarMenu: false }, global: globalConfig })
    expect(sinMenu.find('[aria-label="Abrir menú"]').exists()).toBe(false)
  })

  it('emite toggle-drawer al pulsar el botón de menú', async () => {
    const wrapper = mount(BarraSuperior, { props: { mostrarMenu: true }, global: globalConfig })
    await wrapper.find('[aria-label="Abrir menú"]').trigger('click')
    expect(wrapper.emitted('toggle-drawer')).toBeTruthy()
  })

  it('ya no tiene botón de plegar el menú (ahora es el pin del propio menú lateral)', () => {
    const wrapper = mount(BarraSuperior, { props: {}, global: globalConfig })
    expect(wrapper.find('[aria-label="Contraer menú"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Expandir menú"]').exists()).toBe(false)
  })

  it('solo muestra las tasas habilitadas por las preferencias (showUsdRate/showEurRate)', () => {
    const conAmbas = mount(BarraSuperior, {
      props: { bcvRate: { dollar: 36.5, euro: 39.1 }, showUsdRate: true, showEurRate: true },
      global: globalConfig,
    })
    expect(conAmbas.findAll('.chip-tasa-stub')).toHaveLength(2)

    const soloUsd = mount(BarraSuperior, {
      props: { bcvRate: { dollar: 36.5, euro: 39.1 }, showUsdRate: true, showEurRate: false },
      global: globalConfig,
    })
    expect(soloUsd.findAll('.chip-tasa-stub')).toHaveLength(1)
  })
})
