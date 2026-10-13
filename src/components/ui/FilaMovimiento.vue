<template>
  <v-card
    class="fila-movimiento ad-move-press"
    role="button"
    tabindex="0"
    :aria-label="`${quien || 'Sin nombre'}, ${montoFormateado}, ${estado || ''}`"
    @click="$emit('abrir', $event)"
    @keydown.enter="$emit('abrir', $event)"
    @keydown.space.prevent="$emit('abrir', $event)"
  >
    <v-card-item class="fila-movimiento__item">
      <template v-if="icono" #prepend>
        <v-icon :icon="icono" :color="colorIcono" size="22" aria-hidden="true" />
      </template>

      <!-- M7 (ola F2b): `quien` es obligatorio, pero si al emisor/cliente le
           falta companyName llega undefined (warning de Vue + título vacío). -->
      <v-card-title class="fila-movimiento__quien">{{ quien || 'Sin nombre' }}</v-card-title>
      <v-card-subtitle v-if="subtitulo || fechaFormateada" class="fila-movimiento__detalle">
        <span v-if="subtitulo">{{ subtitulo }}</span>
        <span v-if="subtitulo && fechaFormateada"> · </span>
        <span v-if="fechaFormateada">{{ fechaFormateada }}</span>
      </v-card-subtitle>

      <template #append>
        <div class="fila-movimiento__derecha">
          <div class="fila-movimiento__monto">{{ montoFormateado }}</div>
          <div v-if="equivalente" class="fila-movimiento__equivalente">≈ {{ equivalente }}</div>
          <v-chip v-if="estado" :color="colorEstado" variant="tonal" size="small" class="mt-1">
            {{ estado }}
          </v-chip>
        </div>
        <!-- C1 (ola F2b): acciones además de "ver detalle" (tocar la fila).
             @click.stop para que tocar un botón de acá NO dispare "abrir". -->
        <div v-if="$slots.acciones" class="fila-movimiento__acciones" @click.stop @keydown.enter.stop @keydown.space.stop>
          <slot name="acciones" />
        </div>
      </template>
    </v-card-item>
  </v-card>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney.js'
import { formatFechaCorta } from '@/utils/fechas.js'

/**
 * FilaMovimiento — tarjeta compacta para listas de movimientos (facturas,
 * compras, gastos, ventas) en el teléfono, donde una v-data-table de muchas
 * columnas se vuelve ilegible. Reemplaza la tabla SOLO en xs; en escritorio
 * se sigue usando v-data-table.
 *
 * Muestra: quién (cliente/proveedor) + detalle (RIF/número, fecha), cuánto
 * (formatMoney) y el estado (chip de color). Tocar toda la tarjeta abre el
 * detalle (evento "abrir"), igual que TarjetaAccion (accesible por teclado).
 */
export default {
  name: 'FilaMovimiento',

  props: {
    /** Nombre del cliente o proveedor. */
    quien: {
      type: String,
      required: true,
    },
    /** Texto corto adicional (RIF, número de documento...). Opcional. */
    subtitulo: {
      type: String,
      default: '',
    },
    fecha: {
      type: [String, Date],
      default: null,
    },
    monto: {
      type: [Number, String],
      default: 0,
    },
    moneda: {
      type: String,
      default: 'USD',
    },
    estado: {
      type: String,
      default: '',
    },
    colorEstado: {
      type: String,
      default: 'grey',
    },
    /** Ícono opcional a la izquierda (ej. flecha arriba/abajo según flujo). */
    icono: {
      type: String,
      default: '',
    },
    colorIcono: {
      type: String,
      default: 'grey',
    },
    /** Monto ya formateado en la OTRA moneda, para mostrar como referencia
     * bajo el monto principal (p. ej. "≈ Bs 3.600,00" bajo "$100,00"). I1:
     * igual que la tabla de escritorio, que siempre muestra el equivalente. */
    equivalente: {
      type: String,
      default: '',
    },
  },

  emits: ['abrir'],

  computed: {
    montoFormateado() {
      return formatMoney(this.monto, this.moneda)
    },
    fechaFormateada() {
      return this.fecha ? formatFechaCorta(this.fecha) : ''
    },
  },
}
</script>

<style scoped>
.fila-movimiento {
  min-height: 72px;
  cursor: pointer;
  box-shadow: none !important;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: transform 160ms ease-out;
}

.fila-movimiento:focus-visible {
  outline: 3px solid #1F355C;
  outline-offset: 2px;
}

.fila-movimiento:active {
  transform: scale(0.98);
}

.fila-movimiento__item {
  padding-top: 12px;
  padding-bottom: 12px;
}

.fila-movimiento__quien {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: normal;
}

.fila-movimiento__detalle {
  font-size: 0.8rem;
  opacity: 0.8;
  white-space: normal;
}

.fila-movimiento__derecha {
  text-align: right;
}

.fila-movimiento__monto {
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
}

.fila-movimiento__equivalente {
  font-size: 0.75rem;
  opacity: 0.7;
  white-space: nowrap;
}

.fila-movimiento__acciones {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .fila-movimiento {
    transition: none;
  }
  .fila-movimiento:active {
    transform: none;
  }
}
</style>
