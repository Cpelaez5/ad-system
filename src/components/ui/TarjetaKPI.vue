<template>
  <ResumenMonto
    :etiqueta="etiqueta"
    :monto="monto"
    :monto-bs="montoBs"
    :color="color"
    animar
    class="tarjeta-kpi ad-move-entrada"
    :style="{ animationDelay: retraso }"
  >
    <div v-if="texto" class="tarjeta-kpi__comparacion mt-2 d-flex align-center ga-1">
      <v-icon :icon="icono" :color="colorComparacion" size="16" />
      <span class="text-caption" :class="`text-${colorComparacion}`">{{ texto }}</span>
    </div>
  </ResumenMonto>
</template>

<script>
import ResumenMonto from './ResumenMonto.vue'
import { textoComparacion } from '@/utils/resumenFinanciero'
import { ESCALON_LISTA_MS } from './movimiento.js'

/**
 * TarjetaKPI — una de las tres tarjetas resumen de "¿Cómo voy?"
 * (Vendí / Gasté / Me queda). Extiende `ResumenMonto` (monto grande en USD
 * + equivalente chico en Bs, animado con AnimatedNumber) agregando la
 * comparación contra el período anterior en lenguaje llano: flecha + color
 * + texto, nunca solo color (regla de `sistema-diseno.md` §1.10 aplicada
 * a esta pantalla). El texto sale de `textoComparacion`
 * (`src/utils/resumenFinanciero.js`) — esta tarjeta solo decide el ícono y
 * el color, no vuelve a calcular el porcentaje.
 *
 * `subirEsBueno` decide el color: para "Vendí" y "Me queda", subir es
 * bueno (verde); para "Gasté", subir es malo (rojo) — se pasa por fuera
 * porque es la única pieza que depende de qué métrica es.
 */
export default {
  name: 'TarjetaKPI',

  components: { ResumenMonto },

  props: {
    etiqueta: { type: String, required: true },
    /** Monto en USD. Siempre un Number: así AnimatedNumber puede animarlo. */
    monto: { type: Number, required: true },
    /** Equivalente en bolívares. null = no se muestra la línea pequeña. */
    montoBs: { type: Number, default: null },
    /** Color del monto grande (token del tema: "success", "error", "primary"...). */
    color: { type: String, default: 'primary' },
    /** Porcentaje vs período anterior. null = sin período anterior para comparar. */
    variacion: { type: Number, default: null },
    /** Si subir el monto es una buena noticia para esta tarjeta. */
    subirEsBueno: { type: Boolean, default: true },
    /** Cómo nombrar el período anterior en el texto ("el mes pasado", "el año pasado"...). */
    etiquetaPeriodoAnterior: { type: String, default: 'el período anterior' },
    /** Índice de la tarjeta dentro de su fila, para escalonar la entrada. */
    indice: { type: Number, default: 0 },
  },

  computed: {
    texto() {
      return textoComparacion(this.variacion, this.etiquetaPeriodoAnterior)
    },
    sinCambioRelevante() {
      return this.variacion === null || Math.abs(this.variacion) < 0.5
    },
    subio() {
      return (this.variacion || 0) > 0
    },
    icono() {
      if (this.sinCambioRelevante) return 'mdi-minus'
      return this.subio ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold'
    },
    colorComparacion() {
      if (this.sinCambioRelevante) return 'grey'
      const esBueno = this.subio === this.subirEsBueno
      return esBueno ? 'success' : 'error'
    },
    retraso() {
      return `${this.indice * ESCALON_LISTA_MS}ms`
    },
  },
}
</script>

<style scoped>
.tarjeta-kpi__comparacion {
  line-height: 1.3;
}
</style>
