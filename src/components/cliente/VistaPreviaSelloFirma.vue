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

      <img v-if="imgSello" :src="imgSello" alt="" class="vista-sello__sello" />
      <img v-if="imgFirma" :src="imgFirma" alt="" class="vista-sello__firma" />

      <span class="vista-sello__linea vista-sello__linea--agente" />
      <span class="vista-sello__rotulo vista-sello__rotulo--agente">Firma y Sello del Agente de Retención</span>
    </div>

    <p class="vista-sello__nota">
      Así se ve el pie de tus comprobantes de retención. El tamaño y la posición son los mismos del PDF.
    </p>
  </div>
</template>

<script>
/**
 * Vista previa del sello y la firma en un comprobante de retención.
 * Reproduce con CSS las medidas de `estamparSelloYFirma` (retention-pdf-service.js,
 * MEDIDAS_SELLO_FIRMA): se ve en cualquier teléfono, sin depender de un visor de PDF.
 */
import FiltroChips from '@/components/ui/FiltroChips.vue'

export default {
  name: 'VistaPreviaSelloFirma',
  components: { FiltroChips },
  props: {
    sealUrl: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    combinedUrl: { type: String, default: null },
  },
  data() {
    return { modo: this.sealUrl && this.signatureUrl ? 'ambos' : this.sealUrl ? 'sello' : 'firma' }
  },
  computed: {
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
    descripcion() {
      return { sello: 'Comprobante de ejemplo con tu sello', firma: 'Comprobante de ejemplo con tu firma', ambos: 'Comprobante de ejemplo con tu sello y tu firma' }[this.modo]
    },
    /** Lo que se estamparía según la opción elegida (para el PDF de ejemplo). */
    configElegida() {
      if (this.modo === 'ambos' && this.combinedUrl) return { combinedUrl: this.combinedUrl }
      return { sealUrl: this.imgSello, signatureUrl: this.imgFirma }
    },
  },
}
</script>

<style scoped>
/* --mm: un milímetro de la hoja en el ancho disponible. Se muestran 100 mm (x = 5…105 mm de la
   hoja), así que cada posición del PDF va con 5 mm menos. */
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
/* Línea del agente: x = 15 mm de la hoja (10 aquí), y = 34 mm, 75 mm de largo (MEDIDAS_SELLO_FIRMA). */
.vista-sello__linea {
  position: absolute;
  top: calc(var(--mm) * 34);
  width: calc(var(--mm) * 75);
  border-top: max(1px, calc(var(--mm) * 0.4)) solid #1e1e1e;
}
.vista-sello__linea--agente { left: calc(var(--mm) * 10); }
.vista-sello__rotulo {
  position: absolute;
  top: calc(var(--mm) * 35.5);
  width: calc(var(--mm) * 75);
  text-align: center;
  font-weight: 700;
  font-size: max(9px, calc(var(--mm) * 2.5));
  color: #1e1e1e;
}
.vista-sello__rotulo--agente { left: calc(var(--mm) * 10); }
/* Sello: 22 mm de alto, máx. 35 mm de ancho, 10 mm desde el inicio de la línea, 18 mm arriba. */
.vista-sello__sello {
  position: absolute;
  left: calc(var(--mm) * 20);
  top: calc(var(--mm) * 16);
  height: calc(var(--mm) * 22);
  max-width: calc(var(--mm) * 35);
  object-fit: contain;
}
/* Firma: 14 mm de alto, máx. 38 mm, termina 4 mm antes del fin de la línea (x = 86 mm de la hoja, 81 aquí), 13 mm arriba. */
.vista-sello__firma {
  position: absolute;
  right: calc(var(--mm) * 19);
  top: calc(var(--mm) * 21);
  height: calc(var(--mm) * 14);
  max-width: calc(var(--mm) * 38);
  object-fit: contain;
}
.vista-sello__nota {
  margin: 12px 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
</style>
