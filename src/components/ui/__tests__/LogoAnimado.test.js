import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach, vi } from 'vitest'
import LogoAnimado from '../LogoAnimado.vue'

function mockMatchMedia(prefiereMenosMovimiento) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion') ? prefiereMenosMovimiento : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('LogoAnimado.vue', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('variante "completo" (por defecto) incluye el isotipo "AD" y el wordmark "System"', () => {
    mockMatchMedia(false)
    const wrapper = mount(LogoAnimado)
    expect(wrapper.find('.ad-logo__a').exists()).toBe(true)
    expect(wrapper.find('.ad-logo__wordmark').exists()).toBe(true)
    expect(wrapper.attributes('aria-label')).toBe('AD System')
    expect(wrapper.attributes('viewBox')).toBe('0 0 6824.48 1462.94')
  })

  it('variante "icono" muestra solo "AD" + flecha + barras, sin el wordmark "System"', () => {
    mockMatchMedia(false)
    const wrapper = mount(LogoAnimado, { props: { variante: 'icono' } })
    expect(wrapper.find('.ad-logo__a').exists()).toBe(true)
    expect(wrapper.find('.ad-logo__flecha').exists()).toBe(true)
    expect(wrapper.findAll('.ad-logo__barra')).toHaveLength(5)
    expect(wrapper.find('.ad-logo__wordmark').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('Ícono de AD System')
    expect(wrapper.attributes('viewBox')).toBe('0 0 2460 1462.94')
  })

  it('reproduce la coreografía por defecto: agrega la clase que dispara las animaciones CSS', () => {
    mockMatchMedia(false)
    const wrapper = mount(LogoAnimado)
    expect(wrapper.classes()).toContain('logo-animado--reproduciendo')
    expect(wrapper.classes()).not.toContain('logo-animado--sin-movimiento')
  })

  it('reproducir=false muestra el logo ya completo, sin la clase de animación', () => {
    mockMatchMedia(false)
    const wrapper = mount(LogoAnimado, { props: { reproducir: false } })
    expect(wrapper.classes()).not.toContain('logo-animado--reproduciendo')
  })

  it('prefers-reduced-motion: queda marcado "sin movimiento" y nunca anima, aunque reproducir sea true', async () => {
    mockMatchMedia(true)
    const wrapper = mount(LogoAnimado, { props: { reproducir: true } })
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).toContain('logo-animado--sin-movimiento')
    expect(wrapper.classes()).not.toContain('logo-animado--reproduciendo')
  })

  it('bucle solo aplica la clase de latido infinito si además está reproduciendo', async () => {
    mockMatchMedia(false)
    const conBucle = mount(LogoAnimado, { props: { bucle: true } })
    await conBucle.vm.$nextTick()
    expect(conBucle.classes()).toContain('logo-animado--bucle')

    mockMatchMedia(true)
    const bucleConMovimientoReducido = mount(LogoAnimado, { props: { bucle: true } })
    await bucleConMovimientoReducido.vm.$nextTick()
    expect(bucleConMovimientoReducido.classes()).not.toContain('logo-animado--bucle')
  })

  it('nunca estira el logo: el ancho queda en "auto" y el alto es configurable', () => {
    mockMatchMedia(false)
    const wrapper = mount(LogoAnimado, { props: { alto: 64 } })
    expect(wrapper.attributes('style')).toContain('height: 64px')
    expect(wrapper.attributes('style')).toContain('width: auto')
  })
})
