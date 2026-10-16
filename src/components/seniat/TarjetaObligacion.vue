<template>
  <section class="tarjeta-obligacion" :aria-label="titulo" :data-testid="`tarjeta-${clave}`">
    <header class="tarjeta-obligacion__cabecera">
      <div>
        <h2 class="tarjeta-obligacion__titulo">{{ titulo }}</h2>
        <p class="tarjeta-obligacion__subtitulo">{{ subtitulo }}</p>
      </div>
    </header>

    <p v-if="resumen" class="tarjeta-obligacion__resumen">{{ resumen }}</p>

    <v-chip :color="meta.color" variant="tonal" size="default" :prepend-icon="meta.icono" class="tarjeta-obligacion__estado" :class="{ 'tarjeta-obligacion__estado--aviso': meta.color === 'warning' }">
      {{ textoEstado }}
    </v-chip>

    <v-btn
      v-if="accionPrincipal"
      color="primary"
      variant="flat"
      size="large"
      block
      class="text-none tarjeta-obligacion__boton"
      :prepend-icon="accionPrincipal.icono"
      :loading="cargando"
      :data-testid="`accion-${clave}`"
      @click="$emit('principal')"
    >
      {{ accionPrincipal.texto }}
    </v-btn>

    <div v-if="secundarias.length" class="tarjeta-obligacion__secundarias">
      <v-btn
        v-for="s in secundarias"
        :key="s.clave"
        variant="text"
        size="default"
        class="text-none tarjeta-obligacion__secundaria"
        :disabled="cargando"
        @click="$emit('secundaria', s.clave)"
      >
        {{ s.texto }}
      </v-btn>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { metaEstado } from '@/utils/seniat/estadoTarjeta.js'

/**
 * TarjetaObligacion — una obligación de "SENIAT del mes": qué es, en qué estado está y UN botón
 * grande con el siguiente paso. Las acciones secundarias van como texto.
 */
const props = defineProps({
  clave: { type: String, required: true },
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  /** Ej: "4 comprobantes · Bs 12.345,00" */
  resumen: { type: String, default: '' },
  estado: { type: String, default: 'nada' },
  /** Cuando es "faltan_datos": cuántos problemas hay. */
  problemas: { type: Number, default: 0 },
  /** { texto, icono } o null si no hay nada que hacer. */
  accionPrincipal: { type: Object, default: null },
  /** [{ clave, texto }] */
  secundarias: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
})
defineEmits(['principal', 'secundaria'])

const meta = computed(() => metaEstado(props.estado))
const textoEstado = computed(() =>
  props.estado === 'faltan_datos' && props.problemas > 0
    ? `Faltan datos en ${props.problemas}`
    : meta.value.etiqueta)
</script>

<style scoped>
/* El dorado nunca va como color de texto (contraste): texto oscuro, ícono dorado. */
.tarjeta-obligacion__estado--aviso { color: rgb(var(--v-theme-on-surface)) !important; }
.tarjeta-obligacion__estado--aviso :deep(.v-icon) { color: rgb(var(--v-theme-warning)); }
.tarjeta-obligacion__estado--aviso :deep(.v-chip__underlay) { background: rgb(var(--v-theme-warning)); opacity: 0.18; }
.tarjeta-obligacion {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.tarjeta-obligacion__titulo {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}
.tarjeta-obligacion__subtitulo {
  margin: 2px 0 0;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.tarjeta-obligacion__resumen {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.tarjeta-obligacion__estado { font-weight: 600; }
.tarjeta-obligacion__boton { min-height: 48px; }
.tarjeta-obligacion__secundarias {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 0 -8px -4px;
}
.tarjeta-obligacion__secundaria { min-height: 44px; }
</style>
