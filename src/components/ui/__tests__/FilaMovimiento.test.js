import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FilaMovimiento from '../FilaMovimiento.vue'

const stubs = {
  'v-card': {
    template: '<div class="card" @click="$emit(\'click\', $event)" @keydown.enter="$emit(\'click\', $event)"><slot /></div>',
  },
  'v-card-item': {
    template: '<div class="item"><div class="prepend"><slot name="prepend" /></div><slot /><div class="append"><slot name="append" /></div></div>',
  },
  'v-card-title': { template: '<div class="quien"><slot /></div>' },
  'v-card-subtitle': { template: '<div class="detalle"><slot /></div>' },
  'v-chip': { template: '<span class="chip"><slot /></span>' },
  'v-icon': { template: '<i />' },
}

function montar(props = {}) {
  return mount(FilaMovimiento, {
    props: { quien: 'Ferretería Lopez', monto: 150, ...props },
    global: { stubs },
  })
}

describe('FilaMovimiento.vue', () => {
  it('muestra quién y el monto formateado', () => {
    const wrapper = montar({ monto: 1500, moneda: 'USD' })
    expect(wrapper.find('.quien').text()).toContain('Ferretería Lopez')
    expect(wrapper.find('.append').text()).toContain('$ 1.500,00')
  })

  it('muestra el subtítulo y la fecha unidos con un separador', () => {
    const wrapper = montar({ subtitulo: 'RIF J-12345678-9', fecha: '2026-03-05' })
    const detalle = wrapper.find('.detalle').text()
    expect(detalle).toContain('RIF J-12345678-9')
    expect(detalle).toContain('05/03/2026')
  })

  it('no muestra el bloque de detalle si no hay subtítulo ni fecha', () => {
    const wrapper = montar()
    expect(wrapper.find('.detalle').exists()).toBe(false)
  })

  it('muestra el chip de estado con su color', () => {
    const wrapper = montar({ estado: 'Pagada', colorEstado: 'success' })
    expect(wrapper.find('.chip').text()).toBe('Pagada')
  })

  it('no muestra chip si no hay estado', () => {
    const wrapper = montar()
    expect(wrapper.find('.chip').exists()).toBe(false)
  })

  it('emite "abrir" al tocar la tarjeta', async () => {
    const wrapper = montar()
    await wrapper.find('.card').trigger('click')
    expect(wrapper.emitted('abrir')).toBeTruthy()
  })

  it('muestra el equivalente cuando se pasa', () => {
    const wrapper = montar({ equivalente: 'Bs 3.600,00' })
    expect(wrapper.find('.append').text()).toContain('≈ Bs 3.600,00')
  })

  it('no muestra el equivalente si no se pasa', () => {
    const wrapper = montar()
    expect(wrapper.text()).not.toContain('≈')
  })

  it('C1: el slot "acciones" no dispara "abrir" al tocarlo (click.stop)', async () => {
    const wrapper = mount(FilaMovimiento, {
      props: { quien: 'Ferretería Lopez', monto: 150 },
      slots: { acciones: '<button class="menu-acciones">⋮</button>' },
      global: { stubs },
    })
    await wrapper.find('.menu-acciones').trigger('click')
    expect(wrapper.emitted('abrir')).toBeFalsy()
  })
})
