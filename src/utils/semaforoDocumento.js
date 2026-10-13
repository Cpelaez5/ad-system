/**
 * semaforoDocumento.js
 *
 * Función pura que calcula el "semáforo" (color + ícono + texto) de un
 * documento fiscal según su fecha de emisión y de vencimiento, siguiendo
 * la especificación de la contadora (examples/expediente-fiscal-360.md):
 *
 *   Gris    → falta muchísimo tiempo, todavía no hay nada que hacer.
 *   Verde   → el documento se emitió recientemente.
 *   Naranja → ya se acerca la fecha de vencimiento.
 *   Rojo    → vence pronto o ya venció.
 *
 * No depende de Vue ni de Vuetify ni de la fecha real del sistema (recibe
 * `hoy` como parámetro) — por eso es 100% testeable de forma aislada.
 * Los colores devueltos ('grey' | 'success' | 'warning' | 'error') son
 * nombres de tema de Vuetify ya usados en el resto de la app (ver
 * docs/mvp/diseno/sistema-diseno.md): se pueden pasar directo a `color`
 * en `<v-chip>`, `<v-icon>`, etc.
 *
 * Regla importante del sistema de diseño: el color NUNCA va solo — el
 * resultado siempre incluye `icono` y `texto` en lenguaje llano para que
 * una persona con dificultad para distinguir colores entienda igual.
 */

const DIA_EN_MS = 24 * 60 * 60 * 1000

// Umbrales (en días), ver examples/expediente-fiscal-360.md
export const UMBRAL_URGENTE_DIAS = 30   // Rojo: vence en 30 días o menos (o ya venció)
export const UMBRAL_PROXIMO_DIAS = 90   // Naranja: vence en 90 días o menos
export const UMBRAL_RECIENTE_DIAS = 60  // Verde: se emitió hace 60 días o menos

/**
 * Normaliza cualquier entrada de fecha (Date, 'YYYY-MM-DD', ISO completo)
 * a un Date a medianoche hora local, para comparar solo días completos
 * y evitar desfases de zona horaria.
 * @returns {Date|null}
 */
function aFechaLocal(valor) {
  if (!valor) return null
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate())
  }
  const soloFecha = String(valor).slice(0, 10) // tolera 'YYYY-MM-DD' o timestamps ISO
  const fecha = new Date(`${soloFecha}T00:00:00`)
  if (isNaN(fecha.getTime())) return null
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

function diasEntre(desde, hasta) {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA_EN_MS)
}

function dia(n) {
  return n === 1 ? 'día' : 'días'
}

/**
 * Calcula el semáforo de un documento fiscal.
 *
 * @param {Date|string|null} emision - fecha de emisión del documento (puede faltar)
 * @param {Date|string|null} vencimiento - fecha de vencimiento del documento (puede faltar)
 * @param {Date} [hoy] - fecha de referencia ("hoy"). Por defecto, la fecha actual.
 * @returns {{ color: 'grey'|'success'|'warning'|'error', icono: string, nivel: string, texto: string, diasRestantes: number|null }}
 */
export function semaforoDocumento(emision, vencimiento, hoy = new Date()) {
  const fechaHoy = aFechaLocal(hoy) || new Date()
  const fechaVencimiento = aFechaLocal(vencimiento)
  const fechaEmision = aFechaLocal(emision)

  const diasDesdeEmision = fechaEmision ? diasEntre(fechaEmision, fechaHoy) : null
  const emitidoRecientemente =
    diasDesdeEmision !== null && diasDesdeEmision >= 0 && diasDesdeEmision <= UMBRAL_RECIENTE_DIAS

  // ── Sin fecha de vencimiento (documentos permanentes o incompletos) ──
  if (!fechaVencimiento) {
    if (emitidoRecientemente) {
      return {
        color: 'success',
        icono: 'mdi-check-circle-outline',
        nivel: 'reciente',
        texto: 'Sin fecha de vencimiento',
        diasRestantes: null
      }
    }
    return {
      color: 'grey',
      icono: 'mdi-infinity',
      nivel: 'sin_vencimiento',
      texto: 'Sin fecha de vencimiento',
      diasRestantes: null
    }
  }

  const diasRestantes = diasEntre(fechaHoy, fechaVencimiento)

  // ── Ya venció (rojo) ──
  if (diasRestantes < 0) {
    const diasVencido = Math.abs(diasRestantes)
    return {
      color: 'error',
      icono: 'mdi-alert-circle',
      nivel: 'vencido',
      texto: `Venció hace ${diasVencido} ${dia(diasVencido)}`,
      diasRestantes
    }
  }

  // ── Vence pronto (rojo) ──
  if (diasRestantes <= UMBRAL_URGENTE_DIAS) {
    const texto = diasRestantes === 0 ? 'Vence hoy' : `Vence en ${diasRestantes} ${dia(diasRestantes)}`
    return {
      color: 'error',
      icono: 'mdi-clock-alert-outline',
      nivel: 'vence_pronto',
      texto,
      diasRestantes
    }
  }

  // ── Se acerca (naranja/amarillo) ──
  if (diasRestantes <= UMBRAL_PROXIMO_DIAS) {
    return {
      color: 'warning',
      icono: 'mdi-clock-outline',
      nivel: 'se_acerca',
      texto: `Vence en ${diasRestantes} días`,
      diasRestantes
    }
  }

  // ── Falta bastante: ¿se emitió hace poco? → verde. Si no, gris. ──
  if (emitidoRecientemente) {
    return {
      color: 'success',
      icono: 'mdi-check-circle-outline',
      nivel: 'reciente',
      texto: `Vence en ${diasRestantes} días`,
      diasRestantes
    }
  }

  return {
    color: 'grey',
    icono: 'mdi-calendar-check',
    nivel: 'falta_mucho',
    texto: `Vence en ${diasRestantes} días`,
    diasRestantes
  }
}

export default semaforoDocumento
