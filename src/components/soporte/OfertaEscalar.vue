<template>
  <div class="oferta">
    <p class="oferta__pregunta">¿Se lo pasamos al equipo?</p>
    <div class="oferta__botones">
      <v-btn color="primary" class="text-none" size="large" @click="$emit('aceptar')">Sí, pasárselo</v-btn>
      <v-btn variant="text" class="text-none" size="large" @click="$emit('rechazar')">No, gracias</v-btn>
    </div>
  </div>
</template>

<script setup>
/** OfertaEscalar — fase 2: la IA sugiere pasar la consulta al equipo (nunca abre el ticket sola). */
defineEmits(['aceptar', 'rechazar'])
</script>

<style scoped>
.oferta {
  padding: 12px 14px; border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-primary), 0.5);
}
.oferta__pregunta { margin: 0 0 8px; font-weight: 700; font-size: 1rem; }
.oferta__botones { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
