import { ref, computed } from 'vue'

/**
 * Evita el título repetido ("¿Cómo voy?" en la barra superior y otra vez en la vista).
 *
 * Patrón de "título grande": mientras el h1 de EncabezadoPagina se ve en pantalla, la
 * barra superior no repite el nombre; cuando el usuario hace scroll y el h1 se esconde
 * bajo la barra, el nombre aparece arriba para no perder la ubicación. Las vistas sin
 * EncabezadoPagina siguen mostrando el título en la barra como siempre.
 */
const visibles = ref(0)

/** true si algún h1 de EncabezadoPagina está a la vista ahora mismo. */
export const tituloEnVista = computed(() => visibles.value > 0)

/** Alto aproximado de la barra superior: el h1 tapado por ella cuenta como oculto. */
const ALTO_BARRA = 64

/**
 * Observa un elemento (el h1) y cuenta mientras esté visible. Devuelve la función
 * para dejar de observar (llamarla al desmontar).
 */
export function observarTitulo(el) {
  if (!el || typeof IntersectionObserver === 'undefined') return () => {}
  let visible = false
  const marcar = (v) => {
    if (v === visible) return
    visible = v
    visibles.value += v ? 1 : -1
  }
  const observador = new IntersectionObserver(
    ([entrada]) => marcar(entrada.isIntersecting),
    { rootMargin: `-${ALTO_BARRA}px 0px 0px 0px`, threshold: 0 },
  )
  observador.observe(el)
  return () => {
    observador.disconnect()
    marcar(false)
  }
}

/** Solo para tests. */
export function _reiniciarTitulos() {
  visibles.value = 0
}
