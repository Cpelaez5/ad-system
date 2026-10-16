<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="titulo"
    icono="mdi-clipboard-check-outline"
    max-width="640"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p v-if="!problemas.length" class="revision__ok" data-testid="revision-ok">
      <v-icon icon="mdi-check-circle-outline" color="success" class="mr-1" />
      Todo está en orden. Ya puedes descargar el archivo.
    </p>

    <template v-else>
      <p class="revision__intro">
        Encontramos {{ problemas.length === 1 ? '1 cosa' : `${problemas.length} cosas` }} que el SENIAT podría rechazar. Arréglalas y vuelve aquí.
      </p>
      <ul class="revision__lista">
        <li v-for="(p, i) in problemas" :key="`${p.codigo}-${i}`" class="revision__fila" data-testid="problema">
          <v-icon icon="mdi-alert-outline" color="warning" class="revision__icono" />
          <div class="revision__texto">
            <span class="revision__mensaje">{{ p.mensaje }}</span>
            <span v-if="p.arreglo.tipo === 'equipo'" class="revision__equipo">Lo arregla el equipo de AD System.</span>
          </div>
          <v-btn
            v-if="p.arreglo.tipo !== 'equipo'"
            variant="tonal"
            color="primary"
            class="text-none revision__arreglar"
            data-testid="arreglar"
            @click="arreglar(p)"
          >
            Arreglar
          </v-btn>
        </li>
      </ul>
    </template>

    <p v-if="textoExcluidas" class="revision__nota">{{ textoExcluidas }}</p>

    <v-expansion-panels v-if="normalizaciones.length" variant="accordion" class="mt-4 revision__arreglamos">
      <v-expansion-panel>
        <v-expansion-panel-title>Arreglamos esto por ti ({{ normalizaciones.length }})</v-expansion-panel-title>
        <v-expansion-panel-text>
          <ul class="revision__normalizaciones">
            <li v-for="(n, i) in normalizaciones" :key="i">{{ n.mensaje }}</li>
          </ul>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <template #acciones>
      <v-btn
        v-if="problemas.length && puedeDescargarIgual"
        variant="text"
        size="small"
        class="text-none"
        data-testid="descargar-igual"
        @click="$emit('descargar-igual')"
      >
        Descargar igual (el SENIAT podría rechazarlo)
      </v-btn>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none" @click="$emit('update:modelValue', false)">
        {{ problemas.length ? 'Cerrar' : 'Listo' }}
      </v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { useRouter } from 'vue-router'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { destinoDeArreglo } from '@/utils/seniat/arreglos.js'

defineProps({
  modelValue: { type: Boolean, default: false },
  titulo: { type: String, default: 'Revisión' },
  /** [{ codigo, mensaje, arreglo: { tipo, id } }] */
  problemas: { type: Array, default: () => [] },
  /** [{ mensaje }] */
  normalizaciones: { type: Array, default: () => [] },
  textoExcluidas: { type: String, default: '' },
  puedeDescargarIgual: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'descargar-igual'])

const router = useRouter()

function arreglar(problema) {
  const destino = destinoDeArreglo(problema.arreglo)
  if (!destino) return
  emit('update:modelValue', false)
  router.push(destino)
}
</script>

<style scoped>
.revision__intro { margin: 0 0 12px; font-size: 1rem; }
.revision__ok { display: flex; align-items: center; margin: 0; font-size: 1.05rem; font-weight: 600; }
.revision__lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.revision__fila {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}
.revision__icono { flex: none; }
.revision__texto { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.revision__mensaje { font-size: 0.98rem; line-height: 1.4; overflow-wrap: anywhere; }
.revision__equipo { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.revision__arreglar { flex: none; min-height: 44px; }
.revision__nota { margin: 12px 0 0; font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.revision__normalizaciones { margin: 0; padding-left: 18px; font-size: 0.92rem; }
@media (max-width: 599px) {
  .revision__fila { flex-wrap: wrap; }
  .revision__arreglar { width: 100%; }
}
</style>
