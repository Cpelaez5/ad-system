<template>
  <div class="fila-perfil" data-testid="fila-perfil">
    <v-avatar class="fila-perfil__icono" size="44" aria-hidden="true">
      <v-icon :icon="perfil.provider === 'gemini' ? 'mdi-google' : 'mdi-brain'" size="22" />
    </v-avatar>

    <div class="fila-perfil__texto">
      <div class="fila-perfil__nombre">
        {{ perfil.profile_name }}
        <v-chip v-if="perfil.is_active" size="small" color="success" variant="tonal" class="ml-2" data-testid="chip-activo">En uso</v-chip>
      </div>
      <div class="fila-perfil__sub">{{ nombreProveedor }} · {{ perfil.model }}</div>
      <div class="fila-perfil__llave" data-testid="llave">
        <v-icon icon="mdi-key-variant" size="16" class="mr-1" aria-hidden="true" />
        Llave guardada: <span class="fila-perfil__mascara">{{ llaveEnmascarada }}</span>
      </div>
      <div v-if="perfil.is_active && estado" class="fila-perfil__estado" :class="`fila-perfil__estado--${estado.color}`" data-testid="estado-conexion">
        <v-icon :icon="estado.icono" size="16" class="mr-1" aria-hidden="true" />{{ estado.texto }}
      </div>
    </div>

    <div class="fila-perfil__acciones">
      <v-btn
        v-if="!perfil.is_active"
        variant="outlined"
        class="text-none fila-perfil__principal"
        :loading="activando"
        :disabled="bloqueado"
        data-testid="activar"
        @click="$emit('activar', perfil)"
      >Usar este</v-btn>
      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" aria-label="Más acciones" data-testid="menu" />
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-pencil-outline" title="Editar" data-testid="menu-editar" @click="$emit('editar', perfil)" />
          <v-list-item v-if="!perfil.is_active" prepend-icon="mdi-delete-outline" title="Eliminar" base-color="error" data-testid="menu-eliminar" @click="$emit('eliminar', perfil)" />
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { llaveEnmascarada as enmascarar, nombreProveedor as nombreDe } from './iaUtil'

const props = defineProps({
  perfil: { type: Object, required: true },
  /** { icono, texto, color } del estado de conexión (solo se muestra en el perfil activo). */
  estado: { type: Object, default: null },
  activando: { type: Boolean, default: false },
  bloqueado: { type: Boolean, default: false },
})
defineEmits(['activar', 'editar', 'eliminar'])

const llaveEnmascarada = computed(() => enmascarar(props.perfil.key_suffix))
const nombreProveedor = computed(() => nombreDe(props.perfil.provider))
</script>

<style scoped>
.fila-perfil { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.fila-perfil__icono { flex-shrink: 0; align-self: flex-start; background: rgba(var(--v-theme-secondary), 0.14); color: rgb(var(--v-theme-on-surface)); }
.fila-perfil__texto { flex: 1 1 auto; min-width: 0; }
.fila-perfil__nombre { font-weight: 700; overflow-wrap: anywhere; }
.fila-perfil__sub { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); overflow-wrap: anywhere; }
.fila-perfil__llave { display: flex; align-items: center; margin-top: 6px; font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); }
.fila-perfil__mascara { margin-left: 4px; font-family: ui-monospace, Menlo, Consolas, monospace; letter-spacing: 0.04em; }
.fila-perfil__estado { display: flex; align-items: center; margin-top: 6px; font-size: 0.9rem; font-weight: 600; }
.fila-perfil__estado--success { color: rgb(var(--v-theme-success)); }
.fila-perfil__estado--error { color: rgb(var(--v-theme-error)); }
.fila-perfil__estado--warning { color: rgb(var(--v-theme-warning)); }
.fila-perfil__estado--grey { color: rgba(var(--v-theme-on-surface), 0.68); }
.fila-perfil__acciones { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

@media (max-width: 599px) {
  .fila-perfil { flex-wrap: wrap; }
  .fila-perfil__texto { flex-basis: calc(100% - 60px); }
  .fila-perfil__acciones { flex: 1 1 100%; }
  .fila-perfil__principal { flex: 1 1 auto; min-height: 44px; }
}
</style>
