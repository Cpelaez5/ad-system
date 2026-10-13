<template>
  <img
    :src="src"
    :alt="alt"
    :style="estilo"
    class="logo-ad-system"
    :class="{ 'logo-ad-system--invertir': tono === 'blanco' && variante === 'completo' }"
  />
</template>

<script>
/**
 * LogoAdSystem — logo oficial de AD System (el producto; NO confundir con
 * "AD Business Group", la firma contable). Usa siempre los archivos del kit
 * de marca en public/ADSystem/ (ver docs/mvp/diseno/sistema-diseno.md
 * §"Identidad visual AD System" para el detalle de cada archivo y su color
 * verificado por píxel).
 *
 * Props:
 *   - variante: 'completo' (isotipo + "System") | 'icono' (solo el isotipo
 *     con la flecha de crecimiento, sin texto).
 *   - tono: 'color' (granate + negro, el logo "Normal") | 'negro' | 'blanco'
 *     (para fondos oscuros).
 *   - alto: alto en px (ancho se ajusta solo, el logo nunca se estira).
 *
 * El respeto de la zona de seguridad y el tamaño mínimo del manual de marca
 * se aplica con el margen y el alto mínimo por defecto de cada variante.
 */
export default {
  name: 'LogoAdSystem',

  props: {
    variante: {
      type: String,
      default: 'completo',
      validator: (v) => ['completo', 'icono'].includes(v),
    },
    tono: {
      type: String,
      default: 'color',
      validator: (v) => ['color', 'negro', 'blanco'].includes(v),
    },
    /** Alto en px. Por defecto 40 ("completo") o 32 ("icono") — no bajar de 24. */
    alto: {
      type: Number,
      default: null,
    },
  },

  computed: {
    src() {
      const mapa = {
        completo: {
          color: '/ADSystem/png/logo.png',
          negro: '/ADSystem/editable/LOGO.svg',
          blanco: '/ADSystem/editable/LOGO.svg',
        },
        icono: {
          color: '/ADSystem/png/icono2.png',
          negro: '/ADSystem/png/svg_logo_000000_3000x3000.png',
          blanco: '/ADSystem/png/svg_logo_FFFFFF_3000x3000.png',
        },
      }
      return mapa[this.variante][this.tono]
    },
    alt() {
      return this.variante === 'icono' ? 'Ícono de AD System' : 'AD System'
    },
    altoFinal() {
      if (this.alto) return this.alto
      return this.variante === 'completo' ? 40 : 32
    },
    estilo() {
      // Zona de seguridad mínima: un margen propio igual a ~1/4 del alto,
      // y nunca se fuerza el ancho (se mantiene la proporción del archivo).
      const margen = Math.round(this.altoFinal / 4)
      return {
        height: `${this.altoFinal}px`,
        width: 'auto',
        margin: `${margen}px`,
        display: 'inline-block',
      }
    },
  },
}
</script>

<style scoped>
.logo-ad-system {
  object-fit: contain;
}

/* El SVG original es negro puro: invertirlo da blanco puro, sin distorsión
   de color, porque no tiene grises intermedios. */
.logo-ad-system--invertir {
  filter: invert(1);
}
</style>
