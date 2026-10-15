<template>
  <DialogoAdaptable
    :model-value="modelValue"
    titulo="Plan y prueba"
    icono="mdi-calendar-clock"
    :cargando="cargando"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="usuario" class="text-body-1 mb-4">Para <strong>{{ nombreCompleto(usuario) }}</strong></p>

    <v-select
      v-model="plan"
      :items="opciones"
      label="Plan"
      variant="outlined"
      hide-details="auto"
      class="mb-4"
      data-testid="campo-plan"
    />

    <v-text-field
      v-model="fin"
      type="datetime-local"
      label="Fin de la prueba o suscripción"
      variant="outlined"
      hint="Déjalo vacío para que no tenga fecha de fin."
      persistent-hint
      data-testid="campo-fin"
    />

    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" @click="$emit('update:modelValue', false)">Cancelar</v-btn>
      <v-btn color="primary" size="large" class="text-none" :loading="cargando" data-testid="guardar-plan" @click="guardar">
        Guardar cambios
      </v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { nombreCompleto } from './usuariosUtil'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  usuario: { type: Object, default: null },
  planes: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'guardar'])

const plan = ref('free_trial')
const fin = ref('')

watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto || !props.usuario) return
    plan.value = props.usuario.plan_id || 'free_trial'
    fin.value = props.usuario.trial_end ? new Date(props.usuario.trial_end).toISOString().slice(0, 16) : ''
  },
  { immediate: true }
)

const opciones = computed(() => [
  { title: 'Prueba gratuita', value: 'free_trial' },
  ...props.planes.map((p) => ({ title: `${p.name} · $${p.price_monthly}/mes`, value: p.id })),
])

function guardar() {
  emit('guardar', {
    userId: props.usuario?.id,
    plan_id: plan.value,
    trial_end: fin.value ? new Date(fin.value).toISOString() : null,
  })
}
</script>
