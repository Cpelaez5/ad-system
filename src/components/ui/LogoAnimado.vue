<template>
  <svg
    class="logo-animado"
    :class="{
      'logo-animado--reproduciendo': enMovimiento,
      'logo-animado--bucle': bucle && enMovimiento,
      'logo-animado--sin-movimiento': prefiereMovimientoReducido,
    }"
    :style="estiloSvg"
    :viewBox="viewBoxFinal"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :aria-label="etiqueta"
    preserveAspectRatio="xMidYMid meet"
  >
    <g class="ad-logo__icono">
      <!-- Contorno de la "D": aparece primero, como base del ícono. -->
      <g class="ad-logo__d">
        <path fill="black" d="M1370 972.92l207.52 -193.82 -198.56 -522.52c95.23,-9.71 369.29,-9.09 451.33,10.8 121.58,29.49 226.86,114.53 267.65,206.65 43.19,-4.62 238.22,-52.8 267.57,-68.65 -60.89,-178.19 -268.52,-348.71 -494.89,-389.86 -125.14,-22.74 -707.04,-14.12 -872.28,-12.95l371.66 970.35z"/>
      </g>

      <!-- Faceta interior en granate de marca (acento pequeño dentro de la "D"). -->
      <g class="ad-logo__interior">
        <path fill="#8E1818" d="M1852.54 892.95c28.61,-16.68 82.74,-77.96 111.14,-104.13 41.04,-37.84 29.77,-116.47 26.7,-187.16l-232.2 0.45c-4.05,56.09 -3.69,129.57 -2.39,186.17 0.95,41.56 4.36,47.28 30.81,65.22 21.18,14.36 40.2,26.34 65.94,39.45z"/>
      </g>

      <!-- Barras ascendentes dentro de la "D": crecen desde abajo, escalonadas. -->
      <g class="ad-logo__barras">
        <polygon class="ad-logo__barra ad-logo__barra--1" fill="black" points="1269.8,1074.5 1181.81,847.38 692.86,847.78 601.77,1098.37 982.19,1099.27 1056.67,1272.95 "/>
        <path class="ad-logo__barra ad-logo__barra--2" fill="black" d="M1355.86 1261.13c-30.9,12.86 -180.25,160.56 -212.45,194.84l213.59 1.34 -1.14 -196.18z"/>
        <path class="ad-logo__barra ad-logo__barra--3" fill="black" d="M1652.74 980.85c-46.09,15.13 -141.66,126.68 -185.5,166.3 -44.83,40.51 -30.21,63.03 -30.01,139.95 0.14,56.23 -0.48,112.47 0.57,170.32l237.61 -0.89c1.54,-84.41 0.33,-169.6 0.27,-254.1 -0.08,-119.4 16.04,-168 -22.94,-221.58z"/>
        <path class="ad-logo__barra ad-logo__barra--4" fill="black" d="M1758.3 1455.54c97.07,-2.03 147.05,-17.65 232.47,-42.46l0.21 -382.91c-28,13.36 -34.18,22.06 -59.09,48.48 -87.02,92.29 -51.33,35.91 -175.69,-19.76l2.1 396.65z"/>
        <path class="ad-logo__barra ad-logo__barra--5" fill="black" d="M2072.29 1066.97l1.02 303.32c151.82,-53.51 367.09,-325.65 349.68,-565.79l-102.57 -102.65c-35.94,16.65 -55.53,47.96 -81.08,74.58 -151.18,157.46 -40.29,16.02 -122.72,182.06 -23.58,47.52 -44.3,48.42 -44.33,108.48z"/>
      </g>

      <!-- Flecha de crecimiento: se "dibuja" creciendo desde la cola y la punta hace un pequeño pop. -->
      <polygon class="ad-logo__flecha" fill="black" points="2385.94,702.98 2436.56,439.88 2185.33,501.94 2240.48,567.43 1861,946.09 1625.33,798.38 1064.4,1321.23 1115.94,1416.05 1640.87,926.47 1869.47,1077.68 2320.04,643.3 "/>

      <!-- "A": entra con fade + slide suave, después de la flecha. -->
      <polygon class="ad-logo__a" fill="#8E1818" points="710.2,449.76 819.12,717.75 1132.37,718.62 853.48,0.79 565.62,1.41 -0,1462.94 326.7,1461.79 "/>
    </g>

    <!-- Wordmark "System": solo en la variante "completo", entra al final. -->
    <g v-if="variante === 'completo'" class="ad-logo__wordmark">
      <path fill="black" d="M3291.87 431.57c18.98,-12.75 82.16,-78.29 95.33,-101.2 -59.68,-114.74 -315.53,-142.77 -452.86,-69.64 -130.67,69.58 -209.25,276.07 -61.33,395.31 146.43,118.03 368.88,80.98 376.57,225.03 7.29,136.65 -175.09,161.28 -290.79,95.58 -47.37,-26.89 -45.89,-42.16 -81.79,-65.34 -32.71,20.04 -70.77,64.33 -101.03,87.13 19.15,52.71 101.21,109.18 174.13,130.85 80.13,23.81 198.04,25.26 274.47,-2.4 198.71,-71.91 213.05,-286.73 141.36,-387.93 -44.27,-62.49 -103.97,-90.23 -187.58,-116.34 -70.31,-21.94 -176.06,-40.16 -212.3,-93.3 -55.57,-81.47 26.86,-161.92 105.67,-172.35 122.29,-16.18 159.74,26.37 220.15,74.6z"/>
      <path fill="black" d="M3490.3 1376.1c128.99,35.36 232,2.19 280.95,-75.33 41.28,-65.4 82.14,-181.78 110.49,-262.05 33.07,-93.62 193.6,-486.34 199.21,-547.16l-143.66 2.13 -162.82 453.13c-57.65,-89.31 -125.44,-391.55 -177.8,-454.77l-145.27 0.15c17.05,141.75 267.05,577.94 238.25,658.7 -40.18,112.69 -54.94,116.78 -185.08,104.78l-14.27 120.42z"/>
      <path fill="black" d="M4519.54 658.16c29.1,-28.03 70.37,-55.68 83.8,-90.73 -86.5,-123.34 -393.7,-132.14 -456.01,42.3 -93.59,261.97 298.47,231.11 327.09,325.5 22.43,73.96 -64.83,98.58 -132.21,89.5 -76.4,-10.3 -93.73,-43.34 -135.94,-81.54 -24.19,15.04 -75.49,54.85 -95.66,89.91 45.77,83.23 206.02,133.67 345.11,105.27 112.31,-22.94 204.48,-131.6 150.63,-268.34 -51.33,-130.35 -203.07,-94.25 -298.96,-158.02 -64.98,-43.21 -20.63,-117.1 59.68,-121.24 91.91,-4.74 109.26,45.14 152.47,67.39z"/>
      <path fill="black" d="M4665.45 607.25l107.55 2.85c2.97,248.98 -82.35,629.36 297.46,515.52l-2.43 -116.94c-175.22,13.66 -168.08,39.01 -159.09,-400.54l159.98 -1.41 -1.39 -114.55 -157.82 -1.31 -4.28 -174.64 -130.69 1.25 -3.06 173.25 -108.49 1.68 2.26 114.84z"/>
      <path fill="black" d="M5289.61 753.22c6.37,-202.2 314.18,-230.09 319.1,-0.07l-319.1 0.07zm434 262.95c-10.57,-17.66 -64.28,-66.51 -86.47,-77.1 -51.79,44.28 -87.26,100.67 -207.8,80.46 -79.09,-13.26 -130.07,-72.69 -140.49,-155.53l465.3 -0.17c32.93,-480.22 -477.13,-491.15 -593.93,-180.63 -68.22,181.36 17.78,349.34 129.13,418.3 147.47,91.33 377.68,39.24 434.26,-85.33z"/>
      <path fill="black" d="M6006.66 569.42l-2.59 -72.39 -127.21 -5.29 -1.83 639.17 137.51 0.29c19.03,-167.33 -57.51,-514.63 132.61,-533.29 113.43,-11.14 130.49,99.68 130.52,197.79 0.03,111.65 -0.59,223.33 -0.33,334.99l142.7 -0.07c-0.23,-171.18 -49.57,-522.38 133.48,-532.75 203.08,-11.51 96.57,376.96 129.59,533.22l135.41 -0.37c13.92,-110.67 12.94,-474.47 -30.58,-552.17 -33.32,-59.5 -103.55,-103.59 -200.68,-101.07 -128.7,3.34 -133.49,61.59 -207.03,101.85 -36.56,-96.29 -209.87,-159.86 -345.45,-31.38 -1.87,1.77 -7.42,7.11 -9.38,8.8 -12.28,10.53 -1.04,3.27 -16.74,12.67z"/>
    </g>
  </svg>
</template>

<script>
/**
 * LogoAnimado — logo oficial de AD System (isotipo "AD" + flecha de
 * crecimiento + barras, seguido del wordmark "System") animado con
 * CSS/SVG puro, sin librerías nuevas. Las formas son una copia inline
 * exacta de `public/ADSystem/editable/LOGO.svg` (15 formas), agrupadas
 * semánticamente para poder coreografiar la entrada:
 *
 *   1. Contorno de la "D" + faceta interior granate: fade rápido (base).
 *   2. 5 barras: crecen desde abajo (scaleY, transform-origin bottom),
 *      escalonadas de izquierda a derecha.
 *   3. Flecha de crecimiento: crece desde la cola y la punta hace un pop.
 *   4. "A" (granate): fade + slide suave desde la izquierda.
 *   5. Wordmark "System" (solo variante "completo"): fade + slide hacia
 *      arriba, al final.
 *
 * Toda la coreografía vive en <style scoped> de este archivo (nada en
 * animations.css global: es específica del logo, no un segundo sistema
 * de animación de UI). Duración total ≤ 1.6s (regla del logo).
 *
 * Accesibilidad: respeta `prefers-reduced-motion` (CSS + detección JS) —
 * en ese caso el logo se muestra completo de inmediato, sin transformar
 * ni hacer fade, nunca solo con la animación "congelada" a mitad de camino.
 *
 * Props:
 *   - variante: 'completo' (isotipo + "System") | 'icono' (solo "AD" +
 *     flecha + barras, sin texto).
 *   - alto: alto en px (el ancho se ajusta solo; nunca se estira el logo).
 *   - reproducir: si es false, se muestra el logo ya completo, sin animar.
 *   - bucle: si es true (y `reproducir` es true), tras la entrada el ícono
 *     queda con un "latido" suave e infinito — para usarlo como indicador
 *     de carga. No se repite la entrada completa (sería mareante).
 */
export default {
  name: 'LogoAnimado',

  props: {
    variante: {
      type: String,
      default: 'completo',
      validator: (v) => ['completo', 'icono'].includes(v),
    },
    /** Alto en px. Por defecto 40 ("completo") o 32 ("icono"). */
    alto: {
      type: Number,
      default: null,
    },
    reproducir: {
      type: Boolean,
      default: true,
    },
    bucle: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      prefiereMovimientoReducido: false,
    }
  },

  computed: {
    /** Solo anima si se pidió reproducir Y la persona no pidió menos movimiento. */
    enMovimiento() {
      return this.reproducir && !this.prefiereMovimientoReducido
    },

    altoFinal() {
      if (this.alto) return this.alto
      return this.variante === 'completo' ? 40 : 32
    },

    estiloSvg() {
      return {
        height: `${this.altoFinal}px`,
        width: 'auto',
        display: 'inline-block',
      }
    },

    viewBoxFinal() {
      // Icono: solo "AD" + flecha + barras (x < ~2450 del SVG oficial).
      return this.variante === 'icono' ? '0 0 2460 1462.94' : '0 0 6824.48 1462.94'
    },

    etiqueta() {
      return this.variante === 'icono' ? 'Ícono de AD System' : 'AD System'
    },
  },

  mounted() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    try {
      this.prefiereMovimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch (_) {
      this.prefiereMovimientoReducido = false
    }
  },
}
</script>

<style scoped>
.logo-animado {
  overflow: visible;
}

/* ===== Estado de reposo (por defecto): el logo completo, sin animar.
   Es el estado cuando reproducir=false, cuando se prefiere menos
   movimiento, y el primer pintado antes de que el navegador aplique
   cualquier animación. Nunca deja nada invisible "a medio camino". ===== */
.ad-logo__d,
.ad-logo__interior,
.ad-logo__a,
.ad-logo__flecha,
.ad-logo__wordmark {
  opacity: 1;
}

.ad-logo__barra {
  transform-box: fill-box;
  transform-origin: bottom;
  transform: scaleY(1);
}

.ad-logo__a {
  transform: translateX(0);
}

.ad-logo__flecha {
  transform-box: fill-box;
  transform-origin: 6% 94%;
  transform: scale(1);
}

.ad-logo__wordmark {
  transform: translateY(0);
}

/* ===== Reproducción de la coreografía ===== */

.logo-animado--reproduciendo .ad-logo__d {
  opacity: 0;
  animation: ad-logo-fade 160ms ease-out 0ms forwards;
}

.logo-animado--reproduciendo .ad-logo__interior {
  opacity: 0;
  animation: ad-logo-fade 180ms ease-out 40ms forwards;
}

.logo-animado--reproduciendo .ad-logo__barra {
  transform: scaleY(0);
  animation: ad-logo-crecer 240ms cubic-bezier(0, 0, 0.2, 1) forwards;
}
.logo-animado--reproduciendo .ad-logo__barra--1 { animation-delay: 60ms; }
.logo-animado--reproduciendo .ad-logo__barra--2 { animation-delay: 115ms; }
.logo-animado--reproduciendo .ad-logo__barra--3 { animation-delay: 170ms; }
.logo-animado--reproduciendo .ad-logo__barra--4 { animation-delay: 225ms; }
.logo-animado--reproduciendo .ad-logo__barra--5 { animation-delay: 280ms; }

.logo-animado--reproduciendo .ad-logo__flecha {
  opacity: 0;
  transform: scale(0.001);
  animation:
    ad-logo-flecha 260ms cubic-bezier(0, 0, 0.2, 1) 480ms forwards,
    ad-logo-pop 170ms ease-out 740ms forwards;
}

.logo-animado--reproduciendo .ad-logo__a {
  opacity: 0;
  transform: translateX(-14px);
  animation: ad-logo-entrar-a 280ms cubic-bezier(0, 0, 0.2, 1) 820ms forwards;
}

.logo-animado--reproduciendo .ad-logo__wordmark {
  opacity: 0;
  transform: translateY(8px);
  animation: ad-logo-entrar-wordmark 320ms cubic-bezier(0, 0, 0.2, 1) 1020ms forwards;
}

@keyframes ad-logo-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ad-logo-crecer {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@keyframes ad-logo-flecha {
  from { opacity: 0; transform: scale(0.001); }
  to { opacity: 1; transform: scale(1); }
}

/* La punta "aparece con un pop": pequeño sobre-impulso calmado, no un salto brusco. */
@keyframes ad-logo-pop {
  0% { transform: scale(1); }
  55% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes ad-logo-entrar-a {
  from { opacity: 0; transform: translateX(-14px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes ad-logo-entrar-wordmark {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== Bucle (indicador de carga): tras la entrada, un latido suave e
   infinito del ícono completo. Nunca repite la entrada entera. ===== */
@keyframes ad-logo-latido {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.015); }
}

.logo-animado--bucle.logo-animado--reproduciendo .ad-logo__icono {
  transform-box: fill-box;
  transform-origin: center;
  animation: ad-logo-latido 1.8s ease-in-out 1.3s infinite;
}

/* ===== Reduced motion: nunca se anima, el logo completo aparece de una
   vez (ya es el estado de reposo de arriba; esto es un refuerzo por si
   el navegador no corrió el chequeo de JS a tiempo). ===== */
@media (prefers-reduced-motion: reduce) {
  .logo-animado,
  .logo-animado * {
    animation: none !important;
    transition: none !important;
  }
  .logo-animado .ad-logo__d,
  .logo-animado .ad-logo__interior,
  .logo-animado .ad-logo__a,
  .logo-animado .ad-logo__flecha,
  .logo-animado .ad-logo__wordmark {
    opacity: 1 !important;
  }
  .logo-animado .ad-logo__barra,
  .logo-animado .ad-logo__a,
  .logo-animado .ad-logo__flecha,
  .logo-animado .ad-logo__wordmark,
  .logo-animado .ad-logo__icono {
    transform: none !important;
  }
}
</style>
