<template>
  <section
    class="resultado-periodo"
    :class="`resultado-periodo--${resultado.tono}`"
    :aria-label="`${resultado.etiqueta}: ${montoTexto}. ${resultado.frase}`"
    data-testid="resultado-periodo"
  >
    <span class="resultado-periodo__icono" aria-hidden="true">
      <v-icon :icon="icono" size="28" />
    </span>

    <div class="resultado-periodo__texto">
      <p class="resultado-periodo__etiqueta">{{ resultado.etiqueta }}</p>
      <p class="resultado-periodo__monto">
        {{ montoTexto }}
        <span v-if="montoBsTexto" class="resultado-periodo__bs">≈ {{ montoBsTexto }}</span>
      </p>
      <p class="resultado-periodo__frase">{{ resultado.frase }}</p>

      <p v-if="resultado.pista" class="resultado-periodo__pista">
        {{ resultado.pista }}
        <button type="button" class="resultado-periodo__accion" @click="$emit('registrar')">
          Registrar una venta
        </button>
      </p>
    </div>
  </section>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney'

/**
 * ResultadoPeriodo — "¿Cuánto me quedó?" de la cabecera de ¿Cómo voy?, mostrado como
 * dato y no como una frase con cifras: etiqueta del período, monto grande SIN signo,
 * color e ícono según el tono, y una frase llana. Con pérdida, una pista amable para
 * registrar ventas faltantes (emite `registrar`). Recibe el objeto de
 * `resultadoPeriodo()` (src/utils/resumenFinanciero.js).
 */
export default {
  name: 'ResultadoPeriodo',

  props: {
    /** { etiqueta, monto, tono: 'ganancia' | 'perdida' | 'equilibrio', frase, pista } */
    resultado: { type: Object, required: true },
    /** Tasa del dólar del día para el equivalente en bolívares; 0 lo oculta. */
    factorBs: { type: Number, default: 0 },
  },

  emits: ['registrar'],

  computed: {
    icono() {
      return {
        ganancia: 'mdi-trending-up',
        perdida: 'mdi-trending-down',
        equilibrio: 'mdi-scale-balance',
      }[this.resultado.tono]
    },
    montoTexto() {
      return formatMoney(this.resultado.monto, 'USD')
    },
    montoBsTexto() {
      if (!(this.factorBs > 0) || !this.resultado.monto) return ''
      const bs = this.resultado.monto * this.factorBs
      return formatMoney(bs, 'VES', { abreviar: bs >= 1000000 })
    },
  },
}
</script>

<style scoped>
.resultado-periodo {
  --tono: var(--v-theme-on-surface);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(var(--tono), 0.07);
  max-width: 640px;
}
.resultado-periodo--ganancia { --tono: var(--v-theme-success); }
.resultado-periodo--perdida { --tono: var(--v-theme-error); }

.resultado-periodo__icono {
  flex: none;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(var(--tono), 0.14);
  color: rgb(var(--tono));
}

.resultado-periodo__texto { min-width: 0; }
.resultado-periodo__texto p { margin: 0; }

.resultado-periodo__etiqueta {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.resultado-periodo__monto {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 10px;
  margin-top: 2px !important;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--tono));
}
.resultado-periodo--equilibrio .resultado-periodo__monto { color: rgb(var(--v-theme-on-surface)); }

.resultado-periodo__bs {
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.resultado-periodo__frase {
  margin-top: 4px !important;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.resultado-periodo__pista {
  margin-top: 10px !important;
  font-size: 0.875rem;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.resultado-periodo__accion {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 2px;
  font: inherit;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

@media (min-width: 600px) {
  .resultado-periodo { padding: 20px 24px; gap: 20px; }
  .resultado-periodo__monto { font-size: 2.5rem; }
}
</style>
