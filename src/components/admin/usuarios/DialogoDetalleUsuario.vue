<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="usuario ? nombreCompleto(usuario) : 'Usuario'"
    icono="mdi-account-outline"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-if="usuario">
      <div class="chips mb-4">
        <v-chip variant="tonal" color="secondary" :prepend-icon="rol?.icon || 'mdi-account-outline'">{{ rol?.name || usuario.role }}</v-chip>
        <v-chip variant="tonal" :color="usuario.isActive ? 'success' : 'warning'">{{ textoEstado(usuario) }}</v-chip>
      </div>

      <dl class="datos">
        <div><dt>Usuario</dt><dd>{{ usuario.username || 'Sin nombre de usuario' }}</dd></div>
        <div><dt>Correo</dt><dd>{{ usuario.email }}</dd></div>
        <div v-if="usuario.organization?.name"><dt>Empresa</dt><dd>{{ usuario.organization.name }}</dd></div>
        <div><dt>Plan</dt><dd>{{ plan }}</dd></div>
        <div v-if="usuario.trial_end"><dt>Fin de la prueba</dt><dd>{{ fechaHora(usuario.trial_end) }}</dd></div>
        <div><dt>Creado</dt><dd>{{ fechaHora(usuario.createdAt) }}</dd></div>
        <div><dt>Último acceso</dt><dd>{{ fechaHora(usuario.lastLogin) }}</dd></div>
      </dl>

      <h3 class="titulo-seccion">Qué puede hacer</h3>
      <p v-if="rol?.description" class="text-body-1 mb-2">{{ rol.description }}</p>
      <div class="chips" data-testid="permisos">
        <v-chip v-for="p in permisos" :key="p" size="small" variant="outlined">{{ formatearPermiso(p) }}</v-chip>
      </div>
    </template>

    <template #acciones>
      <v-btn variant="text" class="text-none" @click="$emit('update:modelValue', false)">Cerrar</v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { nombreCompleto, textoEstado, fechaHora, formatearPermiso } from './usuariosUtil'

defineProps({
  modelValue: { type: Boolean, default: false },
  usuario: { type: Object, default: null },
  /** Definición del rol ({ name, description, icon }). */
  rol: { type: Object, default: null },
  permisos: { type: Array, default: () => [] },
  plan: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.datos { margin: 0 0 20px; }
.datos > div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08); }
.datos dt { color: rgba(var(--v-theme-on-surface), 0.68); flex-shrink: 0; }
.datos dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.titulo-seccion { font-size: 1.05rem; font-weight: 700; margin: 0 0 6px; }
</style>
