
<template>
  <HojaInferior :model-value="modelValue" titulo="¿Cómo lo subo al SENIAT?" @update:model-value="$emit('update:modelValue', $event)">
    <ol class="como-subirlo__pasos">
      <li>Entra al portal del SENIAT con tu usuario.</li>
      <li>Busca la opción para declarar retenciones de {{ tipo === 'ISLR' ? 'ISLR' : 'IVA' }} e importa el archivo.</li>
      <li>Guarda la planilla o el comprobante que te da el portal.</li>
    </ol>

    <v-text-field
      v-if="puedeDeclarar"
      v-model="planilla"
      label="Número de planilla (opcional)"
      variant="outlined"
      density="comfortable"
      hide-details
      class="mt-4"
      data-testid="numero-planilla"
    />

    <p class="como-subirlo__ayuda">
      Los nombres de los menús del portal cambian, por eso los pasos son generales.
      <router-link to="/ayuda/seniat-retenciones" @click="$emit('update:modelValue', false)">Ver la guía completa</router-link>
    </p>

    <template #acciones>
      <v-btn variant="text" class="text-none" @click="$emit('update:modelValue', false)">Cerrar</v-btn>
      <v-spacer />
      <v-btn
        v-if="puedeDeclarar"
        color="primary"
        variant="flat"
        size="large"
        class="text-none"
        prepend-icon="mdi-check-decagram"
        :loading="cargando"
        data-testid="ya-lo-subi"
        @click="$emit('declarar', planilla.trim() || null)"
      >
        Ya lo subí
      </v-btn>
    </template>
  </HojaInferior>
</template>

<script setup>
import { ref, watch } from 'vue'
import HojaInferior from '@/components/ui/HojaInferior.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 'IVA' | 'ISLR' */
  tipo: { type: String, default: 'IVA' },
  /** Falso si la tarjeta ya está declarada. */
  puedeDeclarar: { type: Boolean, default: true },
  cargando: { type: Boolean, default: false },
  /** Número de planilla ya guardado, si lo hay. */
  planillaInicial: { type: String, default: '' },
})
defineEmits(['update:modelValue', 'declarar'])

const planilla = ref(props.planillaInicial)
watch(() => props.modelValue, (abierta) => { if (abierta) planilla.value = props.planillaInicial })
</script>

<style scoped>
.como-subirlo__pasos { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 10px; font-size: 1.02rem; line-height: 1.5; }
.como-subirlo__ayuda { margin: 16px 0 0; font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.como-subirlo__ayuda a { color: rgb(var(--v-theme-primary)); font-weight: 600; }
</style>
