<template>
  <div class="panel-avisos" data-testid="panel-avisos">
    <div class="panel-avisos__encabezado">
      <h2 class="panel-avisos__titulo">Avisos</h2>
      <v-btn
        v-if="noLeidas > 0"
        variant="text"
        color="primary"
        size="small"
        class="text-none panel-avisos__marcar"
        data-testid="marcar-todo"
        @click="$emit('marcar-todas')"
      >
        Marcar todo como leído
      </v-btn>
    </div>

    <div class="panel-avisos__lista">
      <div v-if="cargando && !grupos.length" class="panel-avisos__estado" aria-live="polite">
        <v-progress-circular indeterminate size="28" color="primary" />
      </div>

      <EstadoVacio
        v-else-if="!grupos.length"
        icono="mdi-bell-outline"
        titulo="No tienes avisos"
        mensaje="Aquí te contaremos cuando el equipo te responda o se acerque un vencimiento."
      />

      <template v-else>
        <section v-for="g in grupos" :key="g.clave" class="panel-avisos__grupo">
          <h3 class="panel-avisos__grupo-titulo">{{ g.titulo }}</h3>
          <button
            v-for="n in g.items"
            :key="n.id"
            type="button"
            class="aviso"
            :class="{ 'aviso--sin-leer': !n.leida_en }"
            :data-testid="`aviso-${n.id}`"
            @click="$emit('abrir', n)"
          >
            <v-avatar size="40" :color="n.leida_en ? 'surface-variant' : 'primary'" variant="tonal" class="aviso__icono">
              <v-icon :icon="iconoDeTipo(n.tipo)" size="22" aria-hidden="true" />
            </v-avatar>
            <span class="aviso__texto">
              <span class="aviso__titulo">{{ n.titulo }}</span>
              <span v-if="n.cuerpo" class="aviso__cuerpo">{{ n.cuerpo }}</span>
              <span class="aviso__hora">{{ tiempoRelativo(n.created_at, ahora) }}</span>
            </span>
            <span v-if="!n.leida_en" class="aviso__punto" role="img" aria-label="Sin leer" />
          </button>
        </section>

        <div v-if="hayMas" class="panel-avisos__mas">
          <v-btn variant="text" color="primary" class="text-none" :loading="cargando" data-testid="ver-mas" @click="$emit('ver-mas')">
            Ver avisos anteriores
          </v-btn>
        </div>
      </template>
    </div>

    <div class="panel-avisos__pie">
      <v-btn variant="text" color="primary" block class="text-none" prepend-icon="mdi-cog-outline" data-testid="ir-preferencias" @click="$emit('preferencias')">
        Elegir qué me llega por correo
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import { iconoDeTipo, tiempoRelativo } from '@/utils/notificaciones.js'

defineProps({
  grupos: { type: Array, default: () => [] },
  noLeidas: { type: Number, default: 0 },
  cargando: { type: Boolean, default: false },
  hayMas: { type: Boolean, default: false },
  ahora: { type: Date, default: () => new Date() },
})
defineEmits(['abrir', 'marcar-todas', 'ver-mas', 'preferencias'])
</script>

<style scoped>
.panel-avisos {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.panel-avisos__encabezado {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.panel-avisos__titulo { font-size: 1.125rem; font-weight: 800; margin: 0; }
.panel-avisos__marcar { min-height: 44px; }
.panel-avisos__lista { flex: 1 1 auto; overflow-y: auto; min-height: 0; }
.panel-avisos__estado { display: flex; justify-content: center; padding: 32px 0; }
.panel-avisos__grupo-titulo {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding: 12px 16px 4px;
  margin: 0;
}
.aviso {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 10px 16px;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.aviso:hover, .aviso:focus-visible { background: rgba(var(--v-theme-on-surface), 0.06); outline: none; }
.aviso--sin-leer { background: rgba(var(--v-theme-primary), 0.06); }
.aviso__icono { flex: 0 0 auto; }
.aviso__texto { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
.aviso__titulo { font-size: 0.9375rem; line-height: 1.3; font-weight: 500; }
.aviso--sin-leer .aviso__titulo { font-weight: 800; }
.aviso__cuerpo {
  font-size: 0.875rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.aviso__hora { font-size: 0.75rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }
.aviso__punto {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
}
.panel-avisos__mas { display: flex; justify-content: center; padding: 8px 0 12px; }
.panel-avisos__pie { padding: 8px 12px; border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
</style>
