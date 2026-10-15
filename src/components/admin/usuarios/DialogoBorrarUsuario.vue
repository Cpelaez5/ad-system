<template>
  <DialogoAdaptable
    :model-value="modelValue"
    titulo="Eliminar cuenta y datos"
    icono="mdi-alert-octagon-outline"
    :cargando="cargando"
    persistent
    @update:model-value="cerrar"
  >
    <template v-if="usuario">
      <AvisoAmable
        tipo="error"
        titulo="Esto no se puede deshacer"
        mensaje="Se borra la cuenta y todo lo que tiene guardado. Solo el super administrador puede hacerlo."
        class="mb-4"
      />

      <dl class="datos">
        <div><dt>Nombre</dt><dd>{{ nombreCompleto(usuario) }}</dd></div>
        <div><dt>Correo</dt><dd data-testid="correo-borrar">{{ usuario.email }}</dd></div>
        <div><dt>Rol</dt><dd>{{ nombreRol }}</dd></div>
        <div v-if="empresa"><dt>Empresa o negocio</dt><dd>{{ empresa }}</dd></div>
      </dl>

      <p class="text-body-1 mb-4">
        Se eliminan sus <strong>facturas</strong>, <strong>retenciones</strong>, <strong>documentos fiscales</strong>,
        <strong>inventarios</strong> y <strong>credenciales de acceso</strong>. El correo y el RIF quedan libres para registrarse de nuevo desde cero.
      </p>

      <v-text-field
        v-model="escrito"
        label="Para confirmar, escribe el correo de la cuenta"
        :placeholder="usuario.email"
        variant="outlined"
        autocomplete="off"
        hide-details
        :disabled="cargando"
        data-testid="confirmar-correo"
      />
    </template>

    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" @click="cerrar(false)">Cancelar</v-btn>
      <v-btn
        color="error"
        size="large"
        class="text-none"
        prepend-icon="mdi-delete-outline"
        :disabled="!coincide"
        :loading="cargando"
        data-testid="borrar"
        @click="$emit('confirmar')"
      >Eliminar definitivamente</v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { nombreCompleto } from './usuariosUtil'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  usuario: { type: Object, default: null },
  nombreRol: { type: String, default: '' },
  cargando: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirmar'])

const escrito = ref('')
watch(() => props.modelValue, (abierto) => { if (abierto) escrito.value = '' })

const empresa = computed(() => props.usuario?.organization?.name || props.usuario?.client?.company_name || '')
// Escribir el correo exacto (sin importar mayúsculas ni espacios) habilita el botón.
const coincide = computed(() => !!props.usuario?.email && escrito.value.trim().toLowerCase() === props.usuario.email.trim().toLowerCase())

function cerrar(valor) {
  if (props.cargando) return
  emit('update:modelValue', valor)
}
</script>

<style scoped>
.datos { margin: 0 0 16px; }
.datos > div { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08); }
.datos dt { color: rgba(var(--v-theme-on-surface), 0.68); flex-shrink: 0; }
.datos dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
</style>
