<template>
  <div v-if="pendientes.length || aviso" class="pend">
    <ul v-if="pendientes.length" class="pend__lista" aria-label="Imágenes por enviar">
      <li v-for="p in pendientes" :key="p.id" class="pend__item">
        <img :src="p.vista" :alt="`Vista previa de ${p.archivo.name || 'la captura'}`" class="pend__img" />
        <button type="button" class="pend__quitar" :aria-label="`Quitar ${p.archivo.name || 'la captura'}`" @click="$emit('quitar', p.id)">
          <v-icon icon="mdi-close" size="18" />
        </button>
      </li>
    </ul>
    <p v-if="aviso" class="pend__aviso" role="alert">{{ aviso }}</p>
  </div>
</template>

<script setup>
/** Miniaturas de las capturas por enviar, cada una con su (x) para quitarla. */
defineProps({
  pendientes: { type: Array, default: () => [] },
  aviso: { type: String, default: '' },
})
defineEmits(['quitar'])
</script>

<style scoped>
.pend { display: flex; flex-direction: column; gap: 6px; }
.pend__lista { display: flex; flex-wrap: wrap; gap: 10px; list-style: none; margin: 0; padding: 4px 0 0; }
.pend__item { position: relative; width: 72px; height: 72px; }
.pend__img {
  width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
}
/* Área táctil de 44px alrededor de la (x), que se ve más chica. */
.pend__quitar {
  position: absolute; top: -14px; right: -14px; width: 44px; height: 44px; padding: 0;
  display: grid; place-items: center; background: transparent; border: 0; cursor: pointer;
  color: rgb(var(--v-theme-surface));
}
.pend__quitar :deep(.v-icon) {
  width: 24px; height: 24px; border-radius: 50%; background: rgb(var(--v-theme-on-surface));
}
.pend__quitar:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); border-radius: 50%; }
.pend__aviso { margin: 0; font-size: 0.9375rem; font-weight: 600; color: rgb(var(--v-theme-error)); }
</style>
