import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BotonIA from '../BotonIA.vue'
import TrabajandoIA from '../TrabajandoIA.vue'
import MarcaIA from '../MarcaIA.vue'

const stubs = {
  'v-btn': { template: '<button v-bind="$attrs"><slot name="prepend" /><slot /></button>' },
  'v-icon': { props: ['icon'], template: '<i :data-icon="icon" />' },
}
const global = { stubs }

describe('BotonIA', () => {
  it('envuelve un v-btn con el borde de IA y el ícono de destellos', () => {
    const w = mount(BotonIA, { props: { block: true }, attrs: { variant: 'tonal', color: 'primary' }, slots: { default: 'Tomar foto' }, global })
    expect(w.classes()).toContain('ad-ia')
    expect(w.classes()).toContain('ad-ia--bloque')
    const btn = w.find('button')
    expect(btn.text()).toBe('Tomar foto')
    expect(w.find('[data-icon="mdi-creation"]').exists()).toBe(true)
    expect(btn.attributes('variant')).toBe('tonal')
    expect(btn.attributes('color')).toBe('primary')
  })

  it('con ícono propio muestra ese ícono y los destellos para el cambio al pasar el mouse', () => {
    const w = mount(BotonIA, { props: { icono: 'mdi-camera-outline' }, slots: { default: 'Tomar foto' }, global })
    expect(w.find('[data-icon="mdi-camera-outline"]').classes()).toContain('boton-ia__icono--propio')
    expect(w.find('[data-icon="mdi-creation"]').classes()).toContain('boton-ia__icono--ia')
  })

  it('el clic llega al botón', async () => {
    let clics = 0
    const w = mount(BotonIA, { attrs: { onClick: () => { clics++ } }, slots: { default: 'Mejorar foto con IA' }, global })
    await w.find('button').trigger('click')
    expect(clics).toBe(1)
  })
})

describe('TrabajandoIA', () => {
  it('muestra el mensaje, el slot y la clase de barrido', () => {
    const w = mount(TrabajandoIA, { props: { mensaje: 'Mirando tu producto…' }, slots: { default: '<img alt="foto">' }, global })
    expect(w.classes()).toContain('ad-ia--trabajando')
    expect(w.text()).toContain('Mirando tu producto…')
    expect(w.find('img').exists()).toBe(true)
    expect(w.find('[role="status"]').exists()).toBe(true)
  })

  it('con activo=false no aplica el barrido pero conserva el mensaje', () => {
    const w = mount(TrabajandoIA, { props: { mensaje: 'Listo', activo: false }, global })
    expect(w.classes()).not.toContain('ad-ia--trabajando')
    expect(w.text()).toContain('Listo')
  })
})

describe('MarcaIA', () => {
  it('texto por defecto y texto propio', () => {
    expect(mount(MarcaIA, { global }).text()).toBe('Llenado con IA · revisa')
    expect(mount(MarcaIA, { props: { texto: 'Leído con IA' }, global }).text()).toBe('Leído con IA')
    expect(mount(MarcaIA, { global }).classes()).toContain('ad-ia-marca')
  })
})
