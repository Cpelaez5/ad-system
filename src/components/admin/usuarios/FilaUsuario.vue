<template>
  <div class="fila-usuario" data-testid="fila-usuario">
    <v-avatar class="fila-usuario__avatar" size="44" aria-hidden="true">
      <span>{{ iniciales(usuario) }}</span>
    </v-avatar>

    <div class="fila-usuario__texto">
      <div class="fila-usuario__nombre">{{ nombreCompleto(usuario) }}</div>
      <div class="fila-usuario__correo">{{ usuario.email }}</div>
      <div class="fila-usuario__chips">
        <v-chip size="small" variant="tonal" color="secondary" :prepend-icon="icono" data-testid="rol">{{ nombreRol }}</v-chip>
        <v-chip
          size="small"
          variant="tonal"
          :color="usuario.isActive ? 'success' : 'warning'"
          :prepend-icon="usuario.isActive ? 'mdi-check-circle-outline' : 'mdi-clock-outline'"
          data-testid="estado"
        >{{ textoEstado(usuario) }}</v-chip>
      </div>
      <div class="fila-usuario__dato">
        {{ plan }}<template v-if="usuario.trial_end"> · hasta {{ fechaCorta(usuario.trial_end) }}</template>
        · Último acceso: {{ fechaCorta(usuario.lastLogin) }}
      </div>
    </div>

    <div class="fila-usuario__acciones">
      <v-btn
        v-if="!usuario.isActive && puedeEditar"
        variant="tonal"
        color="primary"
        class="text-none fila-usuario__principal"
        prepend-icon="mdi-email-sync-outline"
        data-testid="reenviar"
        @click="$emit('reenviar', usuario)"
      >Reenviar invitación</v-btn>
      <v-btn
        v-else
        variant="outlined"
        class="text-none fila-usuario__principal"
        prepend-icon="mdi-eye-outline"
        data-testid="ver"
        @click="$emit('ver', usuario)"
      >Ver</v-btn>

      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" aria-label="Más acciones" data-testid="menu" />
        </template>
        <v-list>
          <v-list-item prepend-icon="mdi-eye-outline" title="Ver detalles" data-testid="menu-ver" @click="$emit('ver', usuario)" />
          <v-list-item v-if="puedeEditar" prepend-icon="mdi-pencil-outline" title="Editar rol y estado" data-testid="menu-editar" @click="$emit('editar', usuario)" />
          <v-list-item v-if="puedeEditar" prepend-icon="mdi-calendar-clock" title="Plan y prueba" data-testid="menu-plan" @click="$emit('plan', usuario)" />
          <v-list-item v-if="!usuario.isActive && puedeEditar" prepend-icon="mdi-email-sync-outline" title="Reenviar invitación" data-testid="menu-reenviar" @click="$emit('reenviar', usuario)" />
          <v-divider v-if="puedeBorrar" />
          <v-list-item v-if="puedeBorrar" prepend-icon="mdi-delete-outline" title="Eliminar cuenta y datos" base-color="error" data-testid="menu-borrar" @click="$emit('borrar', usuario)" />
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script setup>
import { nombreCompleto, iniciales, textoEstado, fechaCorta } from './usuariosUtil'

defineProps({
  usuario: { type: Object, required: true },
  nombreRol: { type: String, default: '' },
  icono: { type: String, default: 'mdi-account-outline' },
  plan: { type: String, default: '' },
  puedeEditar: { type: Boolean, default: false },
  puedeBorrar: { type: Boolean, default: false },
})
defineEmits(['ver', 'editar', 'plan', 'reenviar', 'borrar'])
</script>

<style scoped>
.fila-usuario {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.fila-usuario__avatar {
  flex-shrink: 0;
  align-self: flex-start;
  background: rgba(var(--v-theme-secondary), 0.14);
  color: rgb(var(--v-theme-on-surface));
  font-weight: 700;
}
.fila-usuario__texto { flex: 1 1 auto; min-width: 0; }
.fila-usuario__nombre { font-weight: 700; overflow-wrap: anywhere; }
.fila-usuario__correo { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); overflow-wrap: anywhere; }
.fila-usuario__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.fila-usuario__dato { margin-top: 6px; font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.65); }
.fila-usuario__acciones { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

@media (max-width: 599px) {
  .fila-usuario { flex-wrap: wrap; }
  .fila-usuario__texto { flex-basis: calc(100% - 60px); }
  .fila-usuario__acciones { flex: 1 1 100%; }
  .fila-usuario__principal { flex: 1 1 auto; min-height: 44px; }
}
</style>
