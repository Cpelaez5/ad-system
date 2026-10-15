<template>
  <BarChart :data="datosGrafico" :options="opcionesGrafico" :height="altura" />
</template>

<script>
import BarChart from '@/components/chart/BarChart.vue'
import { formatMoney } from '@/utils/formatMoney'
import { DURACION_CHART_MS, EASING_CHART, prefiereMovimientoReducido } from './movimiento.js'

/**
 * GraficoBarras — envoltorio sobre el BarChart existente (chart.js) con la
 * paleta y las especificaciones de marca de la skill `dataviz` ya
 * aplicadas: barras finas (≤24px) con esquina redondeada 4px solo en la
 * punta, leyenda visible solo con 2+ series, grilla en pelo (1px, sólida,
 * recesiva), tooltip con `formatMoney`. No vuelve a escribir la lógica de
 * chart.js del `BarChart` base — solo decide `data`/`options`.
 *
 * `series`: Array<{ nombre, datos: Number[], color, tipo?: 'barra'|'linea' }>.
 * `tipo: 'linea'` superpone esa serie como línea sobre las demás en barra
 * (gráfico mixto de chart.js) — para "Me queda" sobre Vendí/Gasté. El orden
 * del array es el orden de dibujo: pon las líneas al final para que queden
 * encima de las barras.
 *
 * `horizontal`: barras horizontales (categorías en el eje Y) — más legibles
 * con nombres largos (categorías, proveedores) o muchas categorías en móvil.
 */
export default {
  name: 'GraficoBarras',

  components: { BarChart },

  props: {
    labels: { type: Array, required: true },
    series: { type: Array, required: true },
    moneda: { type: String, default: 'USD' },
    altura: { type: Number, default: 280 },
    horizontal: { type: Boolean, default: false },
    /** 'moneda' (por defecto) o 'entero' para conteos (llamadas, días…). */
    formato: { type: String, default: 'moneda' },
  },

  computed: {
    datosGrafico() {
      return {
        labels: this.labels,
        datasets: this.series.map((serie) => {
          const esLinea = serie.tipo === 'linea'
          if (esLinea) {
            return {
              type: 'line',
              label: serie.nombre,
              data: serie.datos,
              borderColor: serie.color,
              backgroundColor: serie.color,
              pointBackgroundColor: serie.color,
              borderWidth: 2,
              pointRadius: 3,
              tension: 0.35,
              fill: false,
            }
          }
          return {
            label: serie.nombre,
            data: serie.datos,
            backgroundColor: serie.color,
            borderRadius: 4,
            maxBarThickness: 24,
            categoryPercentage: 0.6,
            barPercentage: 0.9,
          }
        }),
      }
    },

    opcionesGrafico() {
      const moneda = this.moneda
      const horizontal = this.horizontal
      const conteo = this.formato === 'entero'
      const fmt = (v, opc) => (conteo ? Number(v || 0).toLocaleString('es-VE') : formatMoney(v, moneda, opc))
      const reducido = prefiereMovimientoReducido()
      const ejeValor = {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
        ticks: {
          font: { family: 'Montserrat, sans-serif', size: 11 },
          callback: (v) => (conteo ? (Number.isInteger(v) ? Number(v).toLocaleString('es-VE') : '') : formatMoney(v, moneda, { abreviar: true, sinDecimales: true })),
        },
      }
      const ejeCategoria = {
        grid: { display: false },
        ticks: { font: { family: 'Montserrat, sans-serif', size: 11 } },
      }
      return {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        animation: reducido ? false : { duration: DURACION_CHART_MS, easing: EASING_CHART },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            display: this.series.length > 1,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { family: 'Montserrat, sans-serif', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(42, 42, 46, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 10,
            padding: 10,
            titleFont: { family: 'Montserrat' },
            bodyFont: { family: 'Montserrat' },
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${fmt((horizontal ? ctx.parsed.x : ctx.parsed.y) || 0)}`,
            },
          },
        },
        scales: horizontal
          ? { x: ejeValor, y: ejeCategoria }
          : { x: ejeCategoria, y: ejeValor },
      }
    },
  },
}
</script>
