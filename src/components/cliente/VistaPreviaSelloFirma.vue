<template>
  <div class="vista-sello">
    <FiltroChips v-model="modo" :opciones="opciones" class="mb-4" />

    <!-- Zona de firma del agente (mitad izquierda del pie, de x = 5 a 105 mm de la hoja A4),
         a escala: así el sello y la firma se ven grandes también en el teléfono. -->
    <div class="vista-sello__hoja" role="img" :aria-label="descripcion">
      <div class="vista-sello__filas" aria-hidden="true">
        <span v-for="n in 3" :key="n" class="vista-sello__fila" />
      </div>
      <span class="vista-sello__marca" aria-hidden="true">EJEMPLO</span>

      <img v-if="imgSello" :src="imgSello" alt="" class="vista-sello__img" :class="{ 'vista-sello__img--activa': editando === 'sello' }" :style="estilo('sello')" @load="e => medir('sello', e)" />
      <img v-if="imgFirma" :src="imgFirma" alt="" class="vista-sello__img" :class="{ 'vista-sello__img--activa': editando === 'firma' }" :style="estilo('firma')" @load="e => medir('firma', e)" />

      <span class="vista-sello__linea" />
      <span class="vista-sello__rotulo">Firma y Sello del Agente de Retención</span>
    </div>

    <p class="vista-sello__nota">
      Así se ve el pie de tus comprobantes de retención. El tamaño y la posición son los mismos del PDF.
    </p>

    <!-- Ajustar tamaño y posición (flechas grandes: más fácil que arrastrar) -->
    <section class="vista-sello__ajustes" aria-label="Ajustar tamaño y posición" data-testid="ajustes-sello">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
        <h3 class="vista-sello__titulo-ajustes">Ajustar</h3>
        <v-btn-toggle v-if="editables.length > 1" v-model="editando" mandatory density="compact" color="primary" variant="outlined" divided>
          <v-btn v-for="t in editables" :key="t" :value="t" class="text-none">{{ t === 'sello' ? 'Sello' : 'Firma' }}</v-btn>
        </v-btn-toggle>
      </div>

      <div class="vista-sello__controles">
        <div class="vista-sello__tamano">
          <span class="vista-sello__etiqueta">Tamaño</span>
          <v-slider
            :model-value="actual.escala"
            :min="LIMITES.escalaMin"
            :max="LIMITES.escalaMax"
            :step="0.05"
            color="primary"
            hide-details
            prepend-icon="mdi-minus"
            append-icon="mdi-plus"
            aria-label="Tamaño"
            data-testid="ajuste-tamano"
            @update:model-value="v => cambiar({ escala: v })"
            @click:prepend="cambiar({ escala: actual.escala - 0.1 })"
            @click:append="cambiar({ escala: actual.escala + 0.1 })"
          />
        </div>

        <div class="vista-sello__flechas" role="group" aria-label="Mover">
          <span />
          <v-btn icon="mdi-arrow-up" variant="tonal" size="small" aria-label="Subir" data-testid="ajuste-arriba" @click="mover(0, -PASO)" />
          <span />
          <v-btn icon="mdi-arrow-left" variant="tonal" size="small" aria-label="Mover a la izquierda" data-testid="ajuste-izquierda" @click="mover(-PASO, 0)" />
          <v-btn icon="mdi-restore" variant="text" size="small" aria-label="Restablecer" title="Restablecer" @click="restablecer" />
          <v-btn icon="mdi-arrow-right" variant="tonal" size="small" aria-label="Mover a la derecha" data-testid="ajuste-derecha" @click="mover(PASO, 0)" />
          <span />
          <v-btn icon="mdi-arrow-down" variant="tonal" size="small" aria-label="Bajar" data-testid="ajuste-abajo" @click="mover(0, PASO)" />
          <span />
        </div>
      </div>
    </section>
  </div>
</template>

<script>
/**
 * Vista previa del sello y la firma en un comprobante de retención, con ajuste de tamaño
 * y posición. Las posiciones salen de `cajaImagen` (src/utils/ajustesSello.js), la misma
 * función que usa el PDF, así que lo que se ve aquí es lo que se imprime.
 * v-model:ajustes → { sello: { escala, dx, dy }, firma: { … } }.
 */
import FiltroChips from '@/components/ui/FiltroChips.vue'
import { cajaImagen, normalizarAjustes, LIMITES, AJUSTES_POR_DEFECTO } from '@/utils/ajustesSello.js'

const ANCHO_LINEA = 75 // mm (MEDIDAS_SELLO_FIRMA.linea.ancho)
const LINEA_X = 10 // inicio de la línea en la vista (15 mm de la hoja − 5 mm de recorte)
const LINEA_Y = 34 // altura de la línea en la vista (mm)

export default {
  name: 'VistaPreviaSelloFirma',
  components: { FiltroChips },
  props: {
    sealUrl: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    combinedUrl: { type: String, default: null },
    ajustes: { type: Object, default: () => AJUSTES_POR_DEFECTO },
  },
  emits: ['update:ajustes'],
  data() {
    return {
      LIMITES,
      PASO: 2, // mm por toque de flecha
      modo: this.sealUrl && this.signatureUrl ? 'ambos' : this.sealUrl ? 'sello' : 'firma',
      editando: this.sealUrl || this.combinedUrl ? 'sello' : 'firma',
      proporciones: { sello: 1, firma: 2.5 },
    }
  },
  computed: {
    norm() {
      return normalizarAjustes(this.ajustes)
    },
    actual() {
      return this.norm[this.editando]
    },
    opciones() {
      return [
        { valor: 'sello', texto: 'Solo sello', deshabilitado: !this.sealUrl },
        { valor: 'firma', texto: 'Solo firma', deshabilitado: !this.signatureUrl },
        { valor: 'ambos', texto: 'Ambos', deshabilitado: !(this.sealUrl && this.signatureUrl) && !this.combinedUrl },
      ]
    },
    imgSello() {
      if (this.modo === 'ambos' && this.combinedUrl) return this.combinedUrl
      return this.modo !== 'firma' ? this.sealUrl : null
    },
    imgFirma() {
      if (this.modo === 'ambos' && this.combinedUrl) return null
      return this.modo !== 'sello' ? this.signatureUrl : null
    },
    /** Imágenes que se pueden ajustar con la opción elegida. */
    editables() {
      return ['sello', 'firma'].filter((t) => (t === 'sello' ? this.imgSello : this.imgFirma))
    },
    descripcion() {
      return { sello: 'Comprobante de ejemplo con tu sello', firma: 'Comprobante de ejemplo con tu firma', ambos: 'Comprobante de ejemplo con tu sello y tu firma' }[this.modo]
    },
    /** Lo que se estamparía según la opción elegida (para el PDF de ejemplo), con los ajustes. */
    configElegida() {
      if (this.modo === 'ambos' && this.combinedUrl) return { combinedUrl: this.combinedUrl, ajustes: this.norm }
      return { sealUrl: this.imgSello, signatureUrl: this.imgFirma, ajustes: this.norm }
    },
  },
  watch: {
    editables(lista) {
      if (lista.length && !lista.includes(this.editando)) this.editando = lista[0]
    },
  },
  methods: {
    medir(tipo, evento) {
      const img = evento?.target
      if (img?.naturalWidth && img?.naturalHeight) this.proporciones[tipo] = img.naturalWidth / img.naturalHeight
    },
    estilo(tipo) {
      const c = cajaImagen(tipo, this.norm[tipo], ANCHO_LINEA, this.proporciones[tipo])
      const mm = (n) => `calc(var(--mm) * ${n.toFixed(2)})`
      return { left: mm(LINEA_X + c.x), top: mm(LINEA_Y + c.y), width: mm(c.ancho), height: mm(c.alto) }
    },
    cambiar(parcial) {
      const nuevos = normalizarAjustes({ ...this.norm, [this.editando]: { ...this.actual, ...parcial } })
      this.$emit('update:ajustes', nuevos)
    },
    mover(dx, dy) {
      this.cambiar({ dx: this.actual.dx + dx, dy: this.actual.dy + dy })
    },
    restablecer() {
      this.cambiar({ escala: 1, dx: 0, dy: 0 })
    },
  },
}
</script>

<style scoped>
/* --mm: un milímetro de la hoja en el ancho disponible. Se muestran 100 mm (x = 5…105 mm de la hoja). */
.vista-sello__hoja {
  container-type: inline-size;
  position: relative;
  width: 100%;
  aspect-ratio: 100 / 46;
  background: #fff;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  overflow: hidden;
  --mm: calc(100cqw / 100);
}
.vista-sello__filas {
  position: absolute;
  inset: calc(var(--mm) * 3) calc(var(--mm) * 5) auto;
  display: grid;
  gap: calc(var(--mm) * 2);
}
.vista-sello__fila {
  height: calc(var(--mm) * 3);
  border-radius: 2px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.vista-sello__marca {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%) rotate(-12deg);
  font-weight: 700;
  font-size: calc(var(--mm) * 10);
  color: rgba(var(--v-theme-on-surface), 0.06);
  letter-spacing: 0.1em;
  pointer-events: none;
}
.vista-sello__linea {
  position: absolute;
  left: calc(var(--mm) * 10);
  top: calc(var(--mm) * 34);
  width: calc(var(--mm) * 75);
  border-top: max(1px, calc(var(--mm) * 0.4)) solid #1e1e1e;
}
.vista-sello__rotulo {
  position: absolute;
  left: calc(var(--mm) * 10);
  top: calc(var(--mm) * 35.5);
  width: calc(var(--mm) * 75);
  text-align: center;
  font-weight: 700;
  font-size: max(9px, calc(var(--mm) * 2.5));
  color: #1e1e1e;
}
.vista-sello__img {
  position: absolute;
  object-fit: contain;
  transition: left 120ms ease-out, top 120ms ease-out, width 120ms ease-out, height 120ms ease-out;
}
.vista-sello__img--activa {
  outline: 1px dashed rgba(var(--v-theme-primary), 0.6);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .vista-sello__img { transition: none; }
}
.vista-sello__nota {
  margin: 12px 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.vista-sello__ajustes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.vista-sello__titulo-ajustes {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}
.vista-sello__controles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
}
.vista-sello__tamano {
  flex: 1 1 220px;
}
.vista-sello__etiqueta {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.vista-sello__flechas {
  display: grid;
  grid-template-columns: repeat(3, 40px);
  grid-auto-rows: 40px;
  gap: 4px;
  place-items: center;
}
</style>
