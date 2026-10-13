import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import GraficoBarras from '../GraficoBarras.vue'

const globalConfig = {
  stubs: {
    BarChart: {
      props: ['data', 'options', 'height'],
      template: '<div class="bar-chart-stub"></div>',
    },
  },
}

describe('GraficoBarras.vue', () => {
  const labels = ['Ago', 'Sep', 'Oct']
  const series = [
    { nombre: 'Vendí', datos: [100, 200, 150], color: '#2E7D32' },
    { nombre: 'Gasté', datos: [50, 80, 60], color: '#D32F2F' },
  ]

  it('convierte las series en datasets de chart.js con el color y el grosor de barra de la skill dataviz', () => {
    const wrapper = mount(GraficoBarras, { props: { labels, series }, global: globalConfig })
    const data = wrapper.vm.datosGrafico
    expect(data.labels).toEqual(labels)
    expect(data.datasets).toHaveLength(2)
    expect(data.datasets[0]).toMatchObject({ label: 'Vendí', data: [100, 200, 150], backgroundColor: '#2E7D32', borderRadius: 4, maxBarThickness: 24 })
    expect(data.datasets[1]).toMatchObject({ label: 'Gasté', data: [50, 80, 60], backgroundColor: '#D32F2F' })
  })

  it('siempre muestra la leyenda (2+ series) y el tooltip usa formatMoney', () => {
    const wrapper = mount(GraficoBarras, { props: { labels, series, moneda: 'USD' }, global: globalConfig })
    const opciones = wrapper.vm.opcionesGrafico
    expect(opciones.plugins.legend.position).toBe('bottom')
    const texto = opciones.plugins.tooltip.callbacks.label({ dataset: { label: 'Vendí' }, parsed: { y: 1234.5 } })
    expect(texto).toContain('Vendí')
    expect(texto).toContain('$ 1.234,50')
  })

  it('la grilla es sutil (sin línea vertical, horizontal en gris muy claro)', () => {
    const wrapper = mount(GraficoBarras, { props: { labels, series }, global: globalConfig })
    const opciones = wrapper.vm.opcionesGrafico
    expect(opciones.scales.x.grid.display).toBe(false)
    expect(opciones.scales.y.grid.color).toBe('rgba(0,0,0,0.06)')
  })
})
