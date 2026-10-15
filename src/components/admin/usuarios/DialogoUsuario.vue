<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="editando ? 'Editar usuario' : 'Invitar usuario'"
    :icono="editando ? 'mdi-pencil-outline' : 'mdi-email-plus-outline'"
    :cargando="cargando"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-form ref="formulario" id="form-usuario" @submit.prevent="enviar">
      <template v-if="editando">
        <v-text-field :model-value="form.username" label="Nombre de usuario" variant="outlined" disabled class="mb-2" />
        <v-text-field :model-value="form.email" label="Correo" variant="outlined" disabled class="mb-2" />
      </template>
      <v-text-field
        v-else
        v-model="form.email"
        label="Correo electrónico"
        type="email"
        placeholder="nombre@empresa.com"
        variant="outlined"
        hint="A este correo llegará el enlace seguro para activar la cuenta."
        persistent-hint
        :rules="reglaCorreo"
        class="mb-4"
        data-testid="campo-correo"
      />

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.firstName" label="Nombre" variant="outlined" :rules="reglaObligatorio" data-testid="campo-nombre" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.lastName" label="Apellido" variant="outlined" :rules="reglaObligatorio" data-testid="campo-apellido" />
        </v-col>
      </v-row>

      <div class="text-subtitle-2 mb-2 mt-2">¿Qué rol tendrá?</div>
      <v-radio-group v-model="form.role" :rules="reglaObligatorio" hide-details="auto" class="mb-2" data-testid="campo-rol">
        <v-radio v-for="(r, clave) in roles" :key="clave" :value="clave" class="radio-rol">
          <template #label>
            <span>
              <span class="font-weight-bold">{{ r.name }}</span>
              <span class="d-block text-body-2 text-medium-emphasis">{{ r.description }}</span>
            </span>
          </template>
        </v-radio>
      </v-radio-group>

      <AvisoAmable
        v-if="!editando"
        class="mt-3"
        mensaje="Recibirá un correo de AD System para activar su cuenta y crear su propia contraseña. No necesitas darle una clave provisional."
      />

      <v-switch
        v-if="editando"
        v-model="form.isActive"
        color="primary"
        label="Usuario activo"
        hide-details
        inset
        class="mt-2"
        data-testid="campo-activo"
      />
    </v-form>

    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" @click="$emit('update:modelValue', false)">Cancelar</v-btn>
      <v-btn color="primary" size="large" class="text-none" type="submit" form="form-usuario" :loading="cargando" data-testid="guardar">
        {{ editando ? 'Guardar cambios' : 'Enviar invitación' }}
      </v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  editando: { type: Boolean, default: false },
  usuario: { type: Object, default: null },
  /** Roles que quien mira puede asignar ({ clave: { name, description } }). */
  roles: { type: Object, default: () => ({}) },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'guardar'])

const vacio = () => ({ id: null, username: '', email: '', firstName: '', lastName: '', role: '', isActive: true })
const form = ref(vacio())
const formulario = ref(null)

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) form.value = props.editando && props.usuario ? { ...vacio(), ...props.usuario } : vacio()
  },
  { immediate: true }
)

const reglaObligatorio = [(v) => !!(v && String(v).trim()) || 'Este dato es obligatorio']
const reglaCorreo = [
  (v) => !!(v && v.trim()) || 'Escribe el correo',
  (v) => /^\S+@\S+\.\S+$/.test(v.trim()) || 'Revisa que el correo esté completo',
]

async function enviar() {
  const res = await formulario.value?.validate()
  if (res && res.valid === false) return
  emit('guardar', { ...form.value, email: (form.value.email || '').trim() })
}
</script>

<style scoped>
.radio-rol :deep(.v-label) { opacity: 1; align-items: flex-start; }
</style>
