<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="perfil ? 'Editar perfil de IA' : 'Nuevo perfil de IA'"
    icono="mdi-robot-outline"
    :cargando="cargando"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-form id="form-perfil-ia" @submit.prevent="guardar">
      <v-text-field
        v-model="form.profileName"
        label="Nombre del perfil"
        placeholder="Ej. Gemini producción"
        variant="outlined"
        class="mb-2"
        data-testid="campo-nombre"
      />
      <v-select v-model="form.provider" :items="PROVEEDORES" label="Proveedor" variant="outlined" class="mb-2" data-testid="campo-proveedor" />
      <v-text-field
        v-model="form.model"
        label="Modelo"
        placeholder="ej. gemini-3.7-flash"
        variant="outlined"
        hint="Sugerencias: gemini-3.1-pro-preview, gemini-3.7-flash, deepseek-chat"
        persistent-hint
        class="mb-4"
        data-testid="campo-modelo"
      />
      <v-text-field
        v-model="form.apiKey"
        label="Llave de API"
        type="password"
        autocomplete="new-password"
        variant="outlined"
        :placeholder="perfil ? 'Déjala vacía para mantener la actual' : 'Pega aquí la llave'"
        :hint="perfil ? `Llave actual: ${llaveEnmascarada(perfil.key_suffix)}. Por seguridad no se muestra completa.` : 'Se guarda y nunca vuelve a mostrarse completa.'"
        persistent-hint
        data-testid="campo-llave"
      />
    </v-form>

    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" @click="$emit('update:modelValue', false)">Cancelar</v-btn>
      <v-btn
        color="primary"
        size="large"
        class="text-none"
        type="submit"
        form="form-perfil-ia"
        :disabled="!valido"
        :loading="cargando"
        data-testid="guardar"
      >Guardar</v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { PROVEEDORES, llaveEnmascarada, formularioValido } from './iaUtil'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Perfil a editar; null = perfil nuevo. */
  perfil: { type: Object, default: null },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'guardar'])

const vacio = () => ({ id: null, profileName: '', provider: 'gemini', model: '', apiKey: '' })
const form = ref(vacio())

watch(
  () => props.modelValue,
  (abierto) => {
    if (!abierto) return
    // La llave nunca se precarga: se deja vacía para conservar la actual.
    form.value = props.perfil
      ? { id: props.perfil.id, profileName: props.perfil.profile_name, provider: props.perfil.provider, model: props.perfil.model, apiKey: '' }
      : vacio()
  },
  { immediate: true }
)

const valido = computed(() => formularioValido(form.value))

function guardar() {
  if (valido.value) emit('guardar', { ...form.value })
}
</script>
