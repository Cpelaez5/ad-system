<template>
  <DialogoAdaptable
    :model-value="modelValue" titulo="Emitir factura" icono="mdi-file-document-plus-outline"
    persistent :cargando="cargando" @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-form ref="formulario" @submit.prevent="guardar">
      <v-autocomplete
        v-model="form.client_id" :items="clientes" item-title="label" item-value="id"
        label="Empresa" variant="outlined" prepend-inner-icon="mdi-account-search"
        placeholder="Buscar empresa…" :rules="[v => !!v || 'Elige una empresa']" class="mb-2"
        data-testid="factura-cliente"
      />
      <v-text-field v-model="form.invoice_number" label="Nº de factura" variant="outlined" prepend-inner-icon="mdi-pound" readonly class="mb-2" />
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model.number="form.amount" label="Monto" variant="outlined" type="number" inputmode="decimal"
            prepend-inner-icon="mdi-currency-usd" :rules="[v => v > 0 || 'El monto debe ser mayor a 0']" data-testid="factura-monto"
          />
        </v-col>
        <v-col cols="12" sm="6"><v-select v-model="form.currency" :items="['USD', 'VES']" label="Moneda" variant="outlined" /></v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.period_start" label="Inicio del periodo" variant="outlined" type="date" :rules="[v => !!v || 'Indica la fecha']" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.period_end" label="Fin del periodo" variant="outlined" type="date" :rules="[v => !!v || 'Indica la fecha']" />
        </v-col>
      </v-row>
      <v-text-field
        v-model="form.due_date" label="Fecha de vencimiento" variant="outlined" type="date"
        prepend-inner-icon="mdi-calendar-clock" :rules="[v => !!v || 'Indica la fecha']" class="mb-2"
      />
      <v-textarea v-model="form.notes" label="Notas (opcional)" variant="outlined" rows="2" auto-grow />
    </v-form>
    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" @click="$emit('update:modelValue', false)">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" size="large" class="text-none font-weight-bold" :loading="cargando" data-testid="factura-emitir" @click="guardar">
        Emitir factura
      </v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  clientes: { type: Array, default: () => [] },
  /** Siguiente número de factura (lo calcula la vista al abrir). */
  numero: { type: String, default: '' },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'guardar'])

const vacio = () => ({ client_id: null, invoice_number: '', amount: 0, currency: 'USD', period_start: '', period_end: '', due_date: '', notes: '' })
const form = reactive(vacio())
const formulario = ref(null)

watch(() => props.modelValue, (abierto) => {
  if (abierto) Object.assign(form, vacio(), { invoice_number: props.numero })
})

async function guardar() {
  const { valid } = await formulario.value.validate()
  if (valid) emit('guardar', { ...form })
}
</script>
