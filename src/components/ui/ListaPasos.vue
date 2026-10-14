<template>
  <section class="lista-pasos" :aria-label="titulo">
    <header class="lista-pasos__cabecera">
      <div>
        <h2 class="lista-pasos__titulo">{{ titulo }}</h2>
        <p class="lista-pasos__resumen">
          <template v-if="hechos < pasos.length">{{ hechos }} de {{ pasos.length }} listos</template>
          <template v-else>¡Completaste todos los pasos!</template>
        </p>
      </div>
      <slot name="cabecera" />
    </header>

    <BarraSegmentos
      class="lista-pasos__barra"
      :segmentos="segmentos"
      :etiqueta="`${hechos} de ${pasos.length} pasos listos`"
      :interactiva="false"
    />

    <ol class="lista-pasos__lista">
      <li
        v-for="paso in pasos"
        :key="paso.clave"
        class="lista-pasos__paso"
        :class="{ 'lista-pasos__paso--hecho': paso.hecho }"
      >
        <span class="lista-pasos__marca" aria-hidden="true">
          <v-icon :icon="paso.hecho ? 'mdi-check' : (paso.icono || 'mdi-circle-outline')" size="20" />
        </span>
        <div class="lista-pasos__texto">
          <div class="lista-pasos__paso-titulo">
            {{ paso.titulo }}<span class="d-sr-only">{{ paso.hecho ? ' (listo)' : ' (pendiente)' }}</span>
          </div>
          <div v-if="paso.detalle && !paso.hecho" class="lista-pasos__paso-detalle">{{ paso.detalle }}</div>
        </div>
        <v-btn
          v-if="!paso.hecho"
          variant="tonal"
          class="text-none lista-pasos__boton"
          :append-icon="'mdi-chevron-right'"
          @click="$emit('ir', paso)"
        >
          {{ paso.textoBoton || 'Hacerlo' }}
        </v-btn>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import BarraSegmentos from './BarraSegmentos.vue'

/**
 * ListaPasos — "Primeros pasos" para que la persona conozca el sistema:
 * checklist con avance por segmentos; cada paso pendiente tiene su botón
 * (`ir`), los hechos se marcan solos (`hecho` lo calcula quien la usa a partir
 * de los datos reales, nunca a mano).
 */
const props = defineProps({
  titulo: { type: String, default: 'Primeros pasos' },
  /** [{ clave, titulo, detalle?, icono?, textoBoton?, hecho }] */
  pasos: { type: Array, default: () => [] },
})
defineEmits(['ir'])

const hechos = computed(() => props.pasos.filter((p) => p.hecho).length)
const segmentos = computed(() => props.pasos.map((p) => ({ id: p.clave, tono: p.hecho ? 'success' : 'falta', etiqueta: p.titulo })))
</script>

<style scoped>
.lista-pasos {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  padding: 22px 24px 10px;
}

.lista-pasos__cabecera {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.lista-pasos__titulo {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.lista-pasos__resumen {
  margin: 4px 0 0;
  font-size: 0.92rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.lista-pasos__barra {
  margin: 14px 0 8px;
  height: 10px !important;
}

.lista-pasos__lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lista-pasos__paso {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
}

.lista-pasos__paso + .lista-pasos__paso {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.lista-pasos__marca {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  border: 1.5px dashed rgba(var(--v-theme-on-surface), 0.3);
}

.lista-pasos__paso--hecho .lista-pasos__marca {
  border: 0;
  background: rgb(var(--v-theme-success));
  color: #fff;
}

.lista-pasos__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.lista-pasos__paso-titulo {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.lista-pasos__paso--hecho .lista-pasos__paso-titulo {
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-decoration: line-through;
  text-decoration-color: rgba(var(--v-theme-on-surface), 0.3);
}

.lista-pasos__paso-detalle {
  margin-top: 2px;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

@media (max-width: 599px) {
  .lista-pasos { padding: 18px 18px 6px; }
  .lista-pasos__paso { flex-wrap: wrap; }
  .lista-pasos__texto { flex: 1 1 calc(100% - 50px); }
  .lista-pasos__boton { flex: 1 1 100%; margin-left: 50px; }
}
</style>
