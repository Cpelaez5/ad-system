<template>
  <DialogoAdaptable
    :model-value="modelValue" :titulo="metodo ? 'Editar método de pago' : 'Agregar método de pago'" icono="mdi-credit-card-settings-outline"
    :max-width="680" persistent :cargando="cargando" @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-form ref="formulario">
      <v-select
        v-model="form.type" :items="TIPOS" item-title="label" item-value="value" label="Tipo de método"
        variant="outlined" prepend-inner-icon="mdi-credit-card-outline" :rules="[v => !!v || 'Elige un tipo']"
        :disabled="!!metodo" class="mb-2" data-testid="metodo-tipo"
      />
      <v-text-field
        v-model="form.name" label="Nombre (lo ve el cliente)" variant="outlined" prepend-inner-icon="mdi-tag-outline"
        placeholder="Ej: Pago Móvil Venezuela" :rules="[v => !!v || 'Escribe un nombre']" class="mb-2" data-testid="metodo-nombre"
      />
      <v-textarea
        v-model="form.description" label="Instrucciones (opcional)" variant="outlined" rows="2" auto-grow
        placeholder="Lo que verá el cliente a la hora de pagar" class="mb-2"
      />

      <template v-if="form.type">
        <h3 class="dialogo-metodo__seccion">Datos del método</h3>
        <template v-if="form.type === 'mobile_payment'">
          <v-text-field v-model="form.details.phone" label="Teléfono del receptor" variant="outlined" prepend-inner-icon="mdi-phone" placeholder="0412-1234567" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.document" label="Documento del receptor (cédula o RIF)" variant="outlined" prepend-inner-icon="mdi-card-account-details-outline" placeholder="V-12345678" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.bank" label="Banco del receptor" variant="outlined" prepend-inner-icon="mdi-bank" placeholder="Ej: Banesco" :rules="req" class="mb-2" />
        </template>
        <template v-else-if="form.type === 'bank_transfer'">
          <v-text-field v-model="form.details.bank" label="Banco" variant="outlined" prepend-inner-icon="mdi-bank" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.account_number" label="Número de cuenta" variant="outlined" prepend-inner-icon="mdi-numeric" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.beneficiary_name" label="Nombre del beneficiario" variant="outlined" prepend-inner-icon="mdi-account-outline" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.beneficiary_document" label="Documento del beneficiario" variant="outlined" prepend-inner-icon="mdi-card-account-details-outline" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.email" label="Correo (opcional)" variant="outlined" prepend-inner-icon="mdi-email-outline" type="email" class="mb-2" />
        </template>
        <template v-else-if="form.type === 'zelle'">
          <v-text-field v-model="form.details.email" label="Correo de Zelle" variant="outlined" prepend-inner-icon="mdi-email-outline" type="email" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.full_name" label="Nombre completo" variant="outlined" prepend-inner-icon="mdi-account-outline" :rules="req" class="mb-2" />
        </template>
        <template v-else-if="form.type === 'binance'">
          <v-text-field v-model="form.details.email" label="Correo o ID de Binance" variant="outlined" prepend-inner-icon="mdi-email-outline" :rules="req" class="mb-2" />
          <v-text-field v-model="form.details.full_name" label="Nombre completo" variant="outlined" prepend-inner-icon="mdi-account-outline" :rules="req" class="mb-2" />
        </template>
      </template>

      <h3 class="dialogo-metodo__seccion">Soporte (a quién llamar si hay dudas)</h3>
      <v-row dense>
        <v-col cols="12" sm="4">
          <v-select v-model="form.support_phone_prefix" :items="PREFIJOS" label="Prefijo" variant="outlined" />
        </v-col>
        <v-col cols="12" sm="8">
          <v-text-field v-model="form.support_phone" label="Teléfono de asistencia" variant="outlined" prepend-inner-icon="mdi-headset" placeholder="1234567" inputmode="tel" />
        </v-col>
      </v-row>

      <h3 class="dialogo-metodo__seccion">Opciones</h3>
      <v-checkbox v-model="form.is_enabled" color="success" hide-details density="comfortable">
        <template #label><span>Método habilitado <span class="text-medium-emphasis">(lo ven los clientes)</span></span></template>
      </v-checkbox>
      <v-checkbox v-model="form.charge_igtf" color="warning" hide-details density="comfortable">
        <template #label>
          <div>
            <div>Cobrar impuesto IGTF</div>
            <div class="text-body-2 text-medium-emphasis">Se cobra al cliente un 3,00% adicional sobre el total.</div>
          </div>
        </template>
      </v-checkbox>
      <v-checkbox v-model="form.require_proof" color="primary" hide-details density="comfortable">
        <template #label>
          <div>
            <div>Comprobante de pago obligatorio</div>
            <div class="text-body-2 text-medium-emphasis">El cliente adjunta una captura o PDF al reportar su pago.</div>
          </div>
        </template>
      </v-checkbox>
    </v-form>
    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" @click="$emit('update:modelValue', false)">Cancelar</v-btn>
      <v-btn color="primary" variant="flat" size="large" class="text-none font-weight-bold" :loading="cargando" data-testid="metodo-guardar" @click="guardar">
        {{ metodo ? 'Guardar cambios' : 'Agregar método' }}
      </v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Método que se edita; null = uno nuevo. */
  metodo: { type: Object, default: null },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'guardar'])

const TIPOS = [
  { label: 'Pago Móvil', value: 'mobile_payment' },
  { label: 'Transferencia bancaria', value: 'bank_transfer' },
  { label: 'Zelle', value: 'zelle' },
  { label: 'Binance', value: 'binance' },
]
const PREFIJOS = ['0412', '0414', '0416', '0422', '0424', '0426']
const req = [(v) => !!v || 'Este dato es necesario']

const vacio = () => ({ type: null, name: '', description: '', is_enabled: true, charge_igtf: false, require_proof: false, details: {}, support_phone_prefix: '', support_phone: '' })
const form = reactive(vacio())
const formulario = ref(null)

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return
  const base = props.metodo ? { ...props.metodo, details: { ...(props.metodo.details || {}) } } : vacio()
  for (const k of Object.keys(form)) delete form[k]
  Object.assign(form, base)
})

async function guardar() {
  const { valid } = await formulario.value.validate()
  if (valid) emit('guardar', { ...form, details: { ...form.details } })
}
</script>

<style scoped>
.dialogo-metodo__seccion { font-size: 1rem; font-weight: 700; margin: 16px 0 8px; }
</style>
