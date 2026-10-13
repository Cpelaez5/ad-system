/**
 * Tokens de movimiento compartidos por los componentes del dashboard del
 * cliente (TarjetaKPI, SeccionPanel, ListaRanking, SelectorPeriodo,
 * GraficoBarras) para que todos se muevan igual: misma duración, misma
 * curva, mismo escalón entre ítems de una lista.
 *
 * Esto NO es un segundo sistema de animación: extiende de forma aditiva el
 * ya vigente en `src/styles/animations.css` (`--animation-duration-*`,
 * `--ease-*`), que se mantiene sin cambios. Estos tokens cubren casos que
 * ese archivo no fijaba con un valor concreto (la curva de entrada "suave"
 * tipo easeOutExpo, el escalón de listas, la duración de chart.js). Las
 * variables CSS equivalentes viven en `src/styles/animations.css`
 * (`--ad-move-*`) — mismos números, para que un componente en CSS puro y
 * otro que necesite el número en JS (AnimatedNumber, chart.js) coincidan.
 *
 * Todo parte de `prefers-reduced-motion` ya resuelto globalmente en
 * `animations.css` (reduce cualquier animación/transición a ~0). Los
 * valores en JS (duración de AnimatedNumber, animation.duration de
 * chart.js) se apagan explícitamente aquí vía `prefiereMovimientoReducido`
 * porque esos dos casos no son CSS y esa regla global no los alcanza.
 */

/** Fade + translateY(8-12px) al aparecer una tarjeta/sección (una vez, al montar). */
export const DURACION_ENTRADA_MS = 280

/** Barras de ListaRanking creciendo desde 0 al aparecer. */
export const DURACION_ENTRADA_LISTA_MS = 240

/** Escalón entre ítems de una lista o grilla de tarjetas (40-60ms). */
export const ESCALON_LISTA_MS = 50

/** Feedback táctil al presionar (botones, chips, filas tocables). */
export const DURACION_PRESS_MS = 150
export const ESCALA_PRESS = 0.98

/** Curva "suave" de entrada — easeOutExpo-like, más marcada que el --ease-out de animations.css. */
export const CURVA_ENTRADA = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Duraciones de la navegación (barra, menú lateral, chips) — espejo de --ad-move-rapido / --ad-move-normal. */
export const DURACION_RAPIDA_MS = 150
export const DURACION_NORMAL_MS = 250

/** AnimatedNumber al cambiar de período (números que cuentan, no saltan). */
export const DURACION_NUMERO_MS = 600

/** chart.js: animación de entrada de GraficoBarras. */
export const DURACION_CHART_MS = 600
export const EASING_CHART = 'easeOutQuart'

/** true si el usuario pidió menos movimiento (apaga duración en JS: AnimatedNumber, chart.js). */
export function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (_) {
    return false
  }
}
