<template>
  <form class="paso" @submit.prevent="enviar">
    <h3 class="paso__titulo">Escríbele al equipo</h3>
    <p class="paso__sub">Una persona de AD System te responde aquí mismo. {{ PROMESA_RESPUESTA }}.</p>

    <fieldset class="paso__temas">
      <legend class="paso__etiqueta">¿Sobre qué es?</legend>
      <div class="paso__chips">
        <button
          v-for="t in TEMAS"
          :key="t.valor"
          type="button"
          class="tema"
          :class="{ 'tema--activo': tema === t.valor }"
          :aria-pressed="tema === t.valor"
          @click="tema = t.valor"
        >
          <v-icon :icon="t.icono" size="22" />
          {{ t.texto }}
        </button>
      </div>
    </fieldset>

    <label class="paso__etiqueta" for="soporte-mensaje">Cuéntanos qué pasa</label>
    <textarea
      id="soporte-mensaje"
      v-model="mensaje"
      class="paso__texto"
      rows="5"
      maxlength="1500"
      placeholder="Escribe aquí con tus palabras"
      @paste="alPegar"
      @dragover="alArrastrar"
      @drop="alSoltar"
    ></textarea>
    <div class="paso__adjuntar">
      <BotonAdjuntar :deshabilitado="lleno || enviando" @archivos="agregar" />
      <span class="paso__ayuda">Puedes agregar capturas de pantalla (hasta 4).</span>
    </div>
    <AdjuntosPendientes :pendientes="pendientes" :aviso="aviso" @quitar="quitar" />
    <p v-if="error" class="paso__error" role="alert">{{ error }}</p>

    <div class="paso__acciones">
      <v-btn type="submit" color="primary" size="large" block class="text-none" :disabled="!puedeEnviar" :loading="enviando">
        Enviar al equipo
      </v-btn>
      <v-btn variant="text" size="large" block class="text-none" :disabled="enviando" @click="$emit('cancelar')">Cancelar</v-btn>
    </div>
  </form>
</template>

<script setup>
/**
 * PasoEscribirEquipo — capa 3: tema con chips grandes + mensaje. No envía por sí
 * solo: emite `enviar` con { categoria, mensaje } y el padre llama al servicio.
 */
import { computed, ref, watch } from 'vue'
import { PROMESA_RESPUESTA, TEMAS } from '@/utils/soporte.js'
import AdjuntosPendientes from './AdjuntosPendientes.vue'
import BotonAdjuntar from './BotonAdjuntar.vue'
import { useAdjuntosPendientes } from '@/composables/useAdjuntosPendientes'

const props = defineProps({
  temaInicial: { type: String, default: '' },
  mensajeInicial: { type: String, default: '' },
  enviando: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['enviar', 'cancelar'])

const tema = ref(props.temaInicial)
const mensaje = ref(props.mensajeInicial)
watch(() => props.temaInicial, (v) => { if (!tema.value) tema.value = v })
watch(() => props.mensajeInicial, (v) => { if (!mensaje.value) mensaje.value = v })

const { pendientes, archivos, aviso, lleno, agregar, quitar, limpiar, alPegar, alArrastrar, alSoltar } = useAdjuntosPendientes()
const puedeEnviar = computed(() =>
  !!tema.value && (mensaje.value.trim().length >= 5 || pendientes.value.length > 0) && !props.enviando)

function enviar() {
  if (!puedeEnviar.value) return
  emit('enviar', { categoria: tema.value, mensaje: mensaje.value.trim(), archivos: [...archivos.value] })
}

// Al terminar un envío sin error se limpian las imágenes (el padre cierra el paso).
watch(() => props.enviando, (ahora, antes) => { if (antes && !ahora && !props.error) limpiar() })
</script>

<style scoped>
.paso { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.paso__titulo { margin: 0; font-size: 1.25rem; font-weight: 700; }
.paso__sub { margin: 0; font-size: 1rem; color: rgba(var(--v-theme-on-surface), 0.75); }
.paso__temas { border: 0; padding: 0; margin: 0; }
.paso__etiqueta { font-weight: 700; font-size: 1rem; padding: 0; }
.paso__chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.tema {
  display: flex; align-items: center; gap: 8px; text-align: left;
  min-height: 56px; padding: 8px 12px; border-radius: 14px;
  font: inherit; font-size: 1rem; font-weight: 600; cursor: pointer;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.25);
}
.tema:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.tema--activo {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
}
.paso__texto {
  width: 100%; padding: 12px; border-radius: 12px; resize: vertical;
  font: inherit; font-size: 1rem; line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.3);
}
.paso__texto:focus { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 1px; }
.paso__adjuntar { display: flex; align-items: center; gap: 8px; }
.paso__ayuda { font-size: 0.9375rem; color: rgba(var(--v-theme-on-surface), 0.75); }
.paso__error { margin: 0; color: rgb(var(--v-theme-error)); font-weight: 600; }
.paso__acciones { display: flex; flex-direction: column; gap: 4px; }
</style>
