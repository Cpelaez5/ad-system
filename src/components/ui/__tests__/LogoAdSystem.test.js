import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LogoAdSystem from '../LogoAdSystem.vue'

describe('LogoAdSystem.vue', () => {
  it('usa el imagotipo a color por defecto (completo + color)', () => {
    const wrapper = mount(LogoAdSystem)
    expect(wrapper.attributes('src')).toBe('/ADSystem/png/logo.png')
    expect(wrapper.attributes('alt')).toBe('AD System')
  })

  it('variante "icono" usa el isotipo cuadrado, no el imagotipo completo', () => {
    const wrapper = mount(LogoAdSystem, { props: { variante: 'icono' } })
    expect(wrapper.attributes('src')).toBe('/ADSystem/png/icono2.png')
    expect(wrapper.attributes('alt')).toBe('Ícono de AD System')
  })

  it('tono "negro" y "blanco" usan los archivos monocromáticos correctos', () => {
    const negro = mount(LogoAdSystem, { props: { variante: 'icono', tono: 'negro' } })
    const blanco = mount(LogoAdSystem, { props: { variante: 'icono', tono: 'blanco' } })
    expect(negro.attributes('src')).toContain('svg_logo_000000')
    expect(blanco.attributes('src')).toContain('svg_logo_FFFFFF')
  })

  it('el logo "completo" en tono blanco usa el SVG original invertido por CSS', () => {
    const wrapper = mount(LogoAdSystem, { props: { variante: 'completo', tono: 'blanco' } })
    expect(wrapper.attributes('src')).toBe('/ADSystem/editable/LOGO.svg')
    expect(wrapper.classes()).toContain('logo-ad-system--invertir')
  })

  it('nunca estira el logo: el ancho queda en "auto" y el alto es configurable', () => {
    const wrapper = mount(LogoAdSystem, { props: { alto: 64 } })
    expect(wrapper.attributes('style')).toContain('height: 64px')
    expect(wrapper.attributes('style')).toContain('width: auto')
  })
})
