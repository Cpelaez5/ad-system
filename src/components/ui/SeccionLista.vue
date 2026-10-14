<template>
  <section class="seccion-lista">
    <header v-if="titulo || $slots.cabecera" class="seccion-lista__cabecera">
      <div>
        <h2 class="seccion-lista__titulo">
          <v-icon v-if="icono" :icon="icono" size="20" class="mr-2" />{{ titulo }}
        </h2>
        <p v-if="ayuda" class="seccion-lista__ayuda">{{ ayuda }}</p>
      </div>
      <slot name="cabecera">
        <span v-if="meta" class="seccion-lista__meta" :class="{ 'text-success': metaExito }">{{ meta }}</span>
      </slot>
    </header>
    <div class="seccion-lista__filas">
      <slot />
    </div>
  </section>
</template>

<script setup>
/**
 * SeccionLista — título de sección (+ ícono, ayuda y dato a la derecha, p. ej.
 * "2 de 5 al día") y un contenedor con borde donde cada fila hija queda
 * separada por una línea. No usa una tarjeta por fila: la lista es una sola
 * superficie, más fácil de recorrer con la vista.
 */
defineProps({
  titulo: { type: String, default: '' },
  icono: { type: String, default: '' },
  ayuda: { type: String, default: '' },
  meta: { type: String, default: '' },
  metaExito: { type: Boolean, default: false },
})
</script>

<style scoped>
.seccion-lista + .seccion-lista {
  margin-top: 28px;
}

.seccion-lista__cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 10px;
  padding: 0 4px;
}

.seccion-lista__titulo {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.seccion-lista__ayuda {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.seccion-lista__meta {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-variant-numeric: tabular-nums;
}

.seccion-lista__filas {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  overflow: hidden;
}

.seccion-lista__filas > :deep(* + *) {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
