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
 * punta, leyenda siempre visible (2+ series), grilla en pelo (1px, sólida,
 * recesiva), tooltip con `formatMoney`. No vuelve a escribir la lógica de
 * chart.js del `BarChart` base — solo decide `data`/`options`.
 *
 * `series`: Array<{ nombre: String, datos: Number[], color: String }>.
 * Pensado para comparar 2 series por mes (ej. "Vendí" vs "Gasté"); con más
 * de 2 revisa `dataviz/references/choosing-a-form.md` antes de reusarlo.
 */
export default {
  name: 'GraficoBarras',

  components: { BarChart },

  props: {
    labels: { type: Array, required: true },
    series: { type: Array, required: true },
    moneda: { type: String, default: 'USD' },
    altura: { type: Number, default: 280 },
  },

  computed: {
    datosGrafico() {
      return {
        labels: this.labels,
        datasets: this.series.map((serie) => ({
          label: serie.nombre,
          data: serie.datos,
          backgroundColor: serie.color,
          borderRadius: 4,
          maxBarThickness: 24,
          categoryPercentage: 0.6,
          barPercentage: 0.9,
        })),
      }
    },

    opcionesGrafico() {
      const moneda = this.moneda
      const reducido = prefiereMovimientoReducido()
      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducido ? false : { duration: DURACION_CHART_MS, easing: EASING_CHART },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { family: 'Open Sans, sans-serif', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(31, 53, 92, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 10,
            padding: 10,
            titleFont: { family: 'Montserrat' },
            bodyFont: { family: 'Open Sans' },
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.parsed.y || 0, moneda)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Open Sans, sans-serif', size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
            ticks: {
              font: { family: 'Open Sans, sans-serif', size: 11 },
              callback: (v) => formatMoney(v, moneda, { abreviar: true, sinDecimales: true }),
            },
          },
        },
      }
    },
  },
}
</script>
