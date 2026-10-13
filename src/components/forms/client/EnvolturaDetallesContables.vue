<template>
  <!-- Modo simple: el contenido va plegado en "Ver detalles contables" (eager, para
       que cálculos y validaciones sigan funcionando aunque esté cerrado). -->
  <v-expansion-panels
    v-if="simple"
    :model-value="abierto ? 0 : undefined"
    @update:model-value="v => $emit('update:abierto', v === 0)"
    flat
    class="sif-simple-details px-4 pb-4"
    data-testid="simple-detalles"
  >
    <v-expansion-panel>
      <v-expansion-panel-title>
        <span class="text-body-2 font-weight-medium">Ver detalles contables</span>
      </v-expansion-panel-title>
      <v-expansion-panel-text eager>
        <slot />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>

  <!-- Modo normal: el contenido se muestra tal cual -->
  <slot v-else />
</template>

<script>
/**
 * Envoltura de las secciones contables de SimpleInvoiceForm. Permite escribir
 * esas ~1000 líneas una sola vez y presentarlas plegadas solo en modo simple.
 */
export default {
  name: 'EnvolturaDetallesContables',
  props: {
    simple: { type: Boolean, default: false },
    abierto: { type: Boolean, default: false }
  },
  emits: ['update:abierto']
}
</script>
