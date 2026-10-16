import { describe, it, expect, vi } from 'vitest'
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
    // La campanita tiene su propio spec y usa useDisplay (Vuetify), que aquí no está instalado.
    CampanaNotificaciones: { template: '<span class="campana-stub" />' },
    TasaRapida: { template: '<div class="tasa-rapida-stub" />' },
    // v-menu: renderiza el activador (los chips) y el contenido solo si está abierto.
    VMenu: {
      props: ['modelValue', 'disabled'],
      template: `<div><slot name="activator" :props="{ onClick: () => $emit('update:modelValue', true) }" /><slot v-if="modelValue" /></div>`,
    },
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
    expect(wrapper.text()).toContain('AD System')
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

  it('el cliente abre el acceso rápido de la tasa (no refresca ni navega)', async () => {
    const push = vi.fn()
    const wrapper = mount(BarraSuperior, {
      props: { bcvRate: { dollar: 36.5 }, currentUser: { role: 'cliente' } },
      global: { ...globalConfig, mocks: { $router: { push } } },
    })
    wrapper.vm.alTocarTasa()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.emitted('refresh-bcv')).toBeFalsy()
    wrapper.vm.menuTasa = true
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tasa-rapida-stub').exists()).toBe(true)
  })

  it('recuerda actualizar la tasa manual entre semana si no es de hoy', () => {
    const wrapper = mount(BarraSuperior, {
      props: { currentUser: { role: 'cliente' }, tasaInfo: { modo: 'manual', fecha: '2000-01-03' } },
      global: globalConfig,
    })
    const dia = new Date().getDay()
    expect(wrapper.find('[data-testid="recordatorio-tasa"]').exists()).toBe(dia !== 0 && dia !== 6)
  })

  it('otros roles refrescan la tasa al tocar un chip', () => {
    const push = vi.fn()
    const wrapper = mount(BarraSuperior, {
      props: { currentUser: { role: 'contador' } },
      global: { ...globalConfig, mocks: { $router: { push } } },
    })
    wrapper.vm.alTocarTasa()
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.emitted('refresh-bcv')).toBeTruthy()
  })

  it('marca Manual y ámbar según la tasa vigente, con la nota correspondiente', () => {
    const manual = mount(BarraSuperior, {
      props: { tasaInfo: { modo: 'manual', desactualizada: true, fallo: false, fecha: '2026-10-10' } },
      global: globalConfig,
    })
    expect(manual.vm.chipManual).toBe(true)
    expect(manual.vm.chipAviso).toBe(true)
    expect(manual.vm.chipNota).toContain('10/10/2026')

    const fallo = mount(BarraSuperior, {
      props: { tasaInfo: { modo: 'automatica', desactualizada: false, fallo: true, fecha: '2026-10-14' } },
      global: globalConfig,
    })
    expect(fallo.vm.chipManual).toBe(false)
    expect(fallo.vm.chipAviso).toBe(true)
    expect(fallo.vm.chipNota).toContain('No pudimos actualizar la tasa del BCV')

    const normal = mount(BarraSuperior, {
      props: { tasaInfo: { modo: 'automatica', desactualizada: false, fallo: false, fecha: '2026-10-14' } },
      global: globalConfig,
    })
    expect(normal.vm.chipAviso).toBe(false)
    expect(normal.vm.chipNota).toBe('')
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
