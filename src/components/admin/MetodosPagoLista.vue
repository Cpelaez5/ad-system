<template>
  <div class="metodos-lista">
    <div v-if="cargando" class="py-8"><v-skeleton-loader v-for="n in 2" :key="n" type="list-item-two-line" /></div>

    <EstadoVacio
      v-else-if="!metodos.length"
      icono="mdi-credit-card-off-outline"
      titulo="Aún no hay métodos de pago"
      mensaje="Agrega uno para que los negocios sepan a dónde pagar."
      texto-accion="Agregar método"
      @accion="$emit('agregar')"
    />

    <SeccionLista v-else :meta="`${metodos.length} ${metodos.length === 1 ? 'método' : 'métodos'}`">
      <FilaLista
        v-for="m in metodos" :key="m.id"
        :titulo="m.name"
        :subtitulo="subtitulo(m)"
        :icono="tipoMetodo(m.type).icono"
        :color-icono="m.is_enabled ? 'secondary' : 'grey'"
        :estado="m.is_enabled ? 'Habilitado' : 'Oculto'"
        :color-estado="m.is_enabled ? 'success' : 'secondary'"
        data-testid="metodo-fila"
      >
        <template #acciones>
          <div class="metodos-lista__acciones">
            <v-switch
              :model-value="m.is_enabled" color="success" hide-details density="comfortable"
              :aria-label="`${m.is_enabled ? 'Ocultar' : 'Habilitar'} ${m.name}`" data-testid="metodo-interruptor"
              @update:model-value="$emit('alternar', m, $event)"
            />
            <v-btn variant="outlined" class="text-none" prepend-icon="mdi-pencil-outline" data-testid="metodo-editar" @click="$emit('editar', m)">Editar</v-btn>
            <v-menu>
              <template #activator="{ props: menu }">
                <v-btn v-bind="menu" icon="mdi-dots-vertical" variant="text" aria-label="Más acciones" />
              </template>
              <v-list>
                <v-list-item prepend-icon="mdi-delete-outline" title="Eliminar método" data-testid="metodo-eliminar" @click="$emit('eliminar', m)" />
              </v-list>
            </v-menu>
          </div>
        </template>
      </FilaLista>
    </SeccionLista>
  </div>
</template>

<script setup>
import SeccionLista from '@/components/ui/SeccionLista.vue'
import FilaLista from '@/components/ui/FilaLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import { tipoMetodo } from '@/utils/facturacionSistema'

defineProps({
  metodos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
})
defineEmits(['agregar', 'editar', 'eliminar', 'alternar'])

const subtitulo = (m) => [
  tipoMetodo(m.type).texto,
  m.require_proof ? 'Pide comprobante' : '',
  m.charge_igtf ? 'Cobra IGTF 3%' : '',
  m.support_phone ? `Soporte ${m.support_phone_prefix}-${m.support_phone}` : '',
].filter(Boolean).join(' · ')
</script>

<style scoped>
.metodos-lista__acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
</style>
