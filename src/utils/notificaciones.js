/**
 * notificaciones — lógica PURA del centro de notificaciones (sin Vue ni red).
 * Especificación: docs/mvp/diseno/centro-de-notificaciones.md
 */
const ZONA = 'America/Caracas'

/** Día 'YYYY-MM-DD' en Caracas de una fecha ISO o Date. */
export function diaCaracas(valor) {
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return ''
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const get = (t) => partes.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function diasEntre(diaA, diaB) {
  return Math.round((new Date(`${diaB}T00:00:00Z`) - new Date(`${diaA}T00:00:00Z`)) / 86400000)
}

/** "ahora", "hace 5 min", "hace 3 h", "ayer", "hace 4 días", o la fecha corta. */
export function tiempoRelativo(valor, ahora = new Date()) {
  const fecha = valor instanceof Date ? valor : new Date(valor)
  const ref = ahora instanceof Date ? ahora : new Date(ahora)
  if (Number.isNaN(fecha.getTime())) return ''
  const seg = Math.floor((ref - fecha) / 1000)
  if (seg < 45) return 'ahora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${Math.max(1, min)} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) {
    // Una notificación de anoche, vista de madrugada, es "ayer"
    return diaCaracas(fecha) === diaCaracas(ref) ? `hace ${horas} h` : 'ayer'
  }
  const dias = diasEntre(diaCaracas(fecha), diaCaracas(ref))
  if (dias <= 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return new Intl.DateTimeFormat('es-VE', { timeZone: ZONA, day: 'numeric', month: 'short' }).format(fecha)
}

/** Grupos Hoy / Esta semana / Antes (solo los que tienen avisos), del más nuevo al más viejo. */
export function agruparPorFecha(items, ahora = new Date()) {
  const hoy = diaCaracas(ahora)
  const grupos = [
    { clave: 'hoy', titulo: 'Hoy', items: [] },
    { clave: 'semana', titulo: 'Esta semana', items: [] },
    { clave: 'antes', titulo: 'Antes', items: [] },
  ]
  const orden = [...(items || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  for (const n of orden) {
    const dia = diaCaracas(n.created_at)
    const dif = dia ? diasEntre(dia, hoy) : 99
    if (dif <= 0) grupos[0].items.push(n)
    else if (dif < 7) grupos[1].items.push(n)
    else grupos[2].items.push(n)
  }
  return grupos.filter((g) => g.items.length)
}

/** Número de la insignia: "" si 0, "9+" desde 10. */
export function textoInsignia(n) {
  const c = Number(n) || 0
  if (c <= 0) return ''
  return c > 9 ? '9+' : String(c)
}

const ICONOS = {
  soporte_respuesta: 'mdi-message-reply-text-outline',
  soporte_estado: 'mdi-check-circle-outline',
  soporte_nueva: 'mdi-lifebuoy',
  soporte_mensaje_cliente: 'mdi-message-text-outline',
  papel_por_vencer: 'mdi-file-clock-outline',
  pago_plan: 'mdi-credit-card-outline',
  pago_reportado: 'mdi-cash-check',
  tasa_recordatorio: 'mdi-currency-usd',
  seniat_pendiente: 'mdi-file-document-check-outline',
  uso_ia: 'mdi-robot-outline',
}
export function iconoDeTipo(tipo) {
  return ICONOS[tipo] || 'mdi-bell-outline'
}

export function esDeSoporte(tipo) {
  return typeof tipo === 'string' && tipo.startsWith('soporte_')
}

/** Preferencia efectiva de una persona: su fila, o los valores por defecto del catálogo. */
export function resolverPreferencia(pref, tipoDef) {
  return {
    correo: typeof pref?.correo === 'boolean' ? pref.correo : (tipoDef?.correo_def ?? true),
    push: typeof pref?.push === 'boolean' ? pref.push : (tipoDef?.push_def ?? true),
  }
}

/** Eventos que se muestran en Configuración → Avisos para un rol. */
export function tiposParaRol(tipos, rol) {
  const esAdmin = rol === 'super_admin'
  return (tipos || [])
    .filter((t) => t.para_rol === 'todos' || (esAdmin ? t.para_rol === 'super_admin' : t.para_rol === 'cliente'))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
}

/** Solo rutas internas: evita que un aviso mande a otro sitio. */
export function rutaSegura(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null
}

/** 'soporte:<id>' para agrupar los avisos de una consulta. */
export function agruparSoporte(conversationId) {
  return `soporte:${conversationId}`
}
