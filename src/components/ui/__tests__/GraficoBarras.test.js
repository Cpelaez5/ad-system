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

  it('con una sola serie, oculta la leyenda (es ruido con un solo nombre)', () => {
    const wrapper = mount(GraficoBarras, { props: { labels, series: [series[0]] }, global: globalConfig })
    expect(wrapper.vm.opcionesGrafico.plugins.legend.display).toBe(false)
  })

  it('una serie con tipo "linea" se dibuja como línea sobre las barras (gráfico mixto)', () => {
    const conNeto = [...series, { nombre: 'Me queda', datos: [50, 120, 90], color: '#2A2A2E', tipo: 'linea' }]
    const wrapper = mount(GraficoBarras, { props: { labels, series: conNeto }, global: globalConfig })
    const linea = wrapper.vm.datosGrafico.datasets[2]
    expect(linea).toMatchObject({ type: 'line', label: 'Me queda', data: [50, 120, 90], borderColor: '#2A2A2E', fill: false })
    // las barras no llevan `type` (chart.js usa el tipo base del chart).
    expect(wrapper.vm.datosGrafico.datasets[0].type).toBeUndefined()
  })

  it('horizontal: invierte los ejes (categorías en Y, valores en X) y el tooltip lee parsed.x', () => {
    const wrapper = mount(GraficoBarras, { props: { labels, series, horizontal: true } , global: globalConfig })
    const opciones = wrapper.vm.opcionesGrafico
    expect(opciones.indexAxis).toBe('y')
    expect(opciones.scales.y.grid.display).toBe(false) // eje de categorías, ahora en Y
    expect(opciones.scales.x.ticks.callback).toBeTypeOf('function') // eje de valores, ahora en X
    const texto = opciones.plugins.tooltip.callbacks.label({ dataset: { label: 'Vendí' }, parsed: { x: 300 } })
    expect(texto).toContain('$ 300,00')
  })
})
