<template>
  <section class="panel-paso" :class="{ 'panel-paso--listo': listo }" aria-live="polite">
    <template v-if="!listo">
      <div class="panel-paso__etiqueta">{{ etiqueta }}</div>
      <div class="panel-paso__titulo">{{ titulo }}</div>
      <p v-if="detalle" class="panel-paso__detalle">{{ detalle }}</p>
      <div class="panel-paso__acciones">
        <v-btn
          color="primary"
          size="large"
          :prepend-icon="iconoBoton || undefined"
          class="text-none panel-paso__boton"
          :loading="cargando"
          @click="$emit('accion')"
        >
          {{ textoBoton }}
        </v-btn>
        <slot name="secundaria" />
      </div>
    </template>
    <template v-else>
      <v-icon icon="mdi-check-decagram" size="40" color="success" class="mb-2" />
      <div class="panel-paso__titulo">{{ tituloListo }}</div>
      <p v-if="detalleListo" class="panel-paso__detalle mb-0">{{ detalleListo }}</p>
    </template>
  </section>
</template>

<script setup>
/**
 * PanelSiguientePaso — "Tu siguiente paso": UNA cosa que hacer ahora, con un
 * botón grande. Cuando no queda nada (`listo`), muestra un mensaje de logro.
 * Patrón central del cliente (Mis papeles, Inicio, Mi negocio, Mi plan…): en
 * vez de listas de tareas, la próxima acción concreta.
 */
defineProps({
  etiqueta: { type: String, default: 'Tu siguiente paso' },
  titulo: { type: String, default: '' },
  detalle: { type: String, default: '' },
  textoBoton: { type: String, default: 'Continuar' },
  iconoBoton: { type: String, default: '' },
  cargando: { type: Boolean, default: false },
  listo: { type: Boolean, default: false },
  tituloListo: { type: String, default: '¡Todo al día!' },
  detalleListo: { type: String, default: '' },
})
defineEmits(['accion'])
</script>

<style scoped>
.panel-paso {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 20px;
  padding: 22px 24px;
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  background: linear-gradient(0deg, rgba(var(--v-theme-primary), 0.045), rgba(var(--v-theme-primary), 0.045)), rgb(var(--v-theme-surface));
}

.panel-paso--listo {
  border-color: rgba(var(--v-theme-success), 0.3);
  background: linear-gradient(0deg, rgba(var(--v-theme-success), 0.06), rgba(var(--v-theme-success), 0.06)), rgb(var(--v-theme-surface));
}

.panel-paso__etiqueta {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}

.panel-paso__titulo {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  text-wrap: balance;
}

.panel-paso__detalle {
  margin: 8px 0 16px;
  font-size: 0.98rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.75);
  max-width: 52ch;
}

.panel-paso__acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (max-width: 599px) {
  .panel-paso { padding: 18px; }
  .panel-paso__boton { flex: 1 1 100%; }
}
</style>
