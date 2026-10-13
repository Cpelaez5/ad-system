/**
 * Estado de un "papel" del negocio (documento fiscal subido o requerido sin subir)
 * para la vista Mis papeles. Función pura: decide en qué grupo cae, qué semáforo
 * mostrar (color + ícono + texto, nunca solo color) y cuál es su acción principal.
 *
 * Tiene en cuenta el CICLO de cada tipo (ver src/constants/fiscalDocuments.js):
 *  - 'PERMANENT' → se sube una sola vez; subido = listo para siempre (nunca "Renovar").
 *  - 'VIGENTE'   → se renueva cuando vence; se mide por su fecha de vencimiento.
 *                  Sin fecha no podemos avisar: queda "por completar".
 *  - 'AdHoc'     → ocasional (actas, otros): se guarda y no vence.
 *  - Periódicos (mensual, quincenal, trimestral, anual) NO pasan por aquí: los
 *    lleva FiscalPeriodTracker por año.
 *
 * Grupos (clave):
 *  - 'atender'   : vencido o vence pronto (rojo / ámbar por fecha)
 *  - 'falta'     : requerido y nunca subido
 *  - 'completar' : renovable subido sin fecha de vencimiento (no podemos avisar)
 *  - 'tramite'   : en trámite (sin fecha real todavía)
 *  - 'aldia'     : vigente, o "una sola vez" ya subido
 *  - 'noaplica'  : la persona marcó que no aplica a su negocio (no cuenta en el avance)
 */
import { semaforoDocumento } from './semaforoDocumento'

export const ORDEN_GRUPOS = ['atender', 'falta', 'completar', 'tramite', 'aldia', 'noaplica']
export const GRUPOS_POR_RESOLVER = ['atender', 'falta', 'completar', 'tramite']

/** Texto corto del ciclo de renovación, en llano. */
export function textoCiclo(frecuencia) {
  if (frecuencia === 'PERMANENT') return 'se sube una sola vez'
  if (frecuencia === 'VIGENTE') return 'se renueva al vencer'
  if (frecuencia === 'AdHoc') return 'ocasional'
  return ''
}

const ACCION = {
  subir: { texto: 'Subir', icono: 'mdi-upload', evento: 'subir' },
  renovar: { texto: 'Renovar', icono: 'mdi-autorenew', evento: 'editar' },
  fecha: { texto: 'Agregar fecha', icono: 'mdi-calendar-plus', evento: 'editar' },
  actualizar: { texto: 'Actualizar', icono: 'mdi-pencil-outline', evento: 'editar' },
  ver: { texto: 'Ver', icono: 'mdi-eye-outline', evento: 'ver' },
}

export function estadoPapel({ doc = null, pendiente = null, frecuencia = null } = {}) {
  const ciclo = frecuencia || pendiente?.frequency || null

  if (!doc) {
    const sufijo = textoCiclo(ciclo)
    return {
      clave: 'falta',
      ciclo,
      semaforo: { color: 'grey', icono: 'mdi-upload-outline', texto: sufijo ? `Falta subirlo · ${sufijo}` : 'Falta subirlo' },
      accion: ACCION.subir,
      diasRestantes: null,
    }
  }
  if (doc.status === 'NO_APLICA') {
    return {
      clave: 'noaplica',
      ciclo,
      semaforo: { color: 'grey', icono: 'mdi-minus-circle-outline', texto: 'No aplica a tu negocio' },
      accion: ACCION.ver,
      diasRestantes: null,
    }
  }
  if (doc.status === 'TRAMITE') {
    return {
      clave: 'tramite',
      ciclo,
      semaforo: { color: 'warning', icono: 'mdi-clock-outline', texto: 'En trámite' },
      accion: ACCION.actualizar,
      diasRestantes: null,
    }
  }

  // Una sola vez u ocasional: subido = listo (aunque no tenga fecha de vencimiento).
  if ((ciclo === 'PERMANENT' || ciclo === 'AdHoc') && !doc.expiration_date) {
    return {
      clave: 'aldia',
      ciclo,
      semaforo: {
        color: 'success',
        icono: 'mdi-check-circle-outline',
        texto: ciclo === 'PERMANENT' ? 'Listo · se sube una sola vez' : 'Guardado',
      },
      accion: ACCION.ver,
      diasRestantes: null,
    }
  }

  // Renovable sin fecha de vencimiento: no podemos avisarle → por completar.
  if (ciclo === 'VIGENTE' && !doc.expiration_date) {
    return {
      clave: 'completar',
      ciclo,
      semaforo: { color: 'warning', icono: 'mdi-calendar-question', texto: 'Falta la fecha de vencimiento' },
      accion: ACCION.fecha,
      diasRestantes: null,
    }
  }

  const semaforo = semaforoDocumento(doc.emission_date, doc.expiration_date)
  const atender = semaforo.color === 'error' || semaforo.color === 'warning'
  return {
    clave: atender ? 'atender' : 'aldia',
    ciclo,
    semaforo: semaforo.color === 'grey' ? { ...semaforo, color: 'success', icono: 'mdi-check-circle-outline' } : semaforo,
    accion: atender ? ACCION.renovar : ACCION.ver,
    diasRestantes: semaforo.diasRestantes ?? null,
  }
}

/**
 * El papel más importante para resolver ahora: primero lo vencido (el más
 * atrasado primero) y lo que vence pronto, luego lo que falta subir (en el orden
 * recibido, que es el de las categorías), luego lo renovable sin fecha, luego lo
 * que está en trámite. Devuelve null si todo está al día.
 */
export function siguientePaso(papeles = []) {
  const atender = papeles
    .filter((p) => p.estado.clave === 'atender')
    .sort((a, b) => (a.estado.diasRestantes ?? 0) - (b.estado.diasRestantes ?? 0))
  if (atender.length) return atender[0]
  for (const clave of ['falta', 'completar', 'tramite']) {
    const p = papeles.find((x) => x.estado.clave === clave)
    if (p) return p
  }
  return null
}

/** Conteos por grupo + avance (los "no aplica" no cuentan). */
export function resumenPapeles(papeles = []) {
  const conteo = { atender: 0, falta: 0, completar: 0, tramite: 0, aldia: 0, noaplica: 0 }
  papeles.forEach((p) => { conteo[p.estado.clave] = (conteo[p.estado.clave] || 0) + 1 })
  const total = papeles.length - conteo.noaplica
  const porResolver = GRUPOS_POR_RESOLVER.reduce((n, g) => n + conteo[g], 0)
  return { ...conteo, total, alDia: conteo.aldia, porResolver, porcentaje: total ? Math.round((conteo.aldia / total) * 100) : 100 }
}
