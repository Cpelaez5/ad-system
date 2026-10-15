/**
 * soporte — lógica PURA del soporte con tickets (sin Vue ni red).
 * Especificación: docs/mvp/diseno/soporte-y-tickets.md
 */
import { normalizar, buscarArticulos } from '@/utils/ayudaBusqueda.js'

// ── Textos ──────────────────────────────────────────────────────────────────

export const PROMESA_RESPUESTA = 'Te respondemos en menos de 24 horas hábiles'
export const NOMBRE_EQUIPO = 'Equipo AD System'
export const HORAS_AVISO = 24

/** Marca que la IA agrega al final cuando no sabe; la pantalla la oculta. */
export const MARCA_ESCALAR = '[[ESCALAR]]'

/** Instrucción para el mensaje de sistema de la IA (fase 2). */
export const INSTRUCCION_ESCALAR =
  `Si NO sabes la respuesta, no está en las guías, o el problema requiere que una persona del equipo revise la cuenta (cobros, pagos de suscripción, errores del sistema, datos que no cuadran), dilo con calidez y termina tu respuesta con la marca ${MARCA_ESCALAR} en una línea aparte. Nunca expliques la marca.`

export const TEMAS = [
  { valor: 'pagos', texto: 'Pagos y mi plan', icono: 'mdi-credit-card-outline' },
  { valor: 'error', texto: 'Algo no funciona', icono: 'mdi-alert-circle-outline' },
  { valor: 'fiscal', texto: 'Duda fiscal o contable', icono: 'mdi-file-document-outline' },
  { valor: 'otra', texto: 'Otra', icono: 'mdi-dots-horizontal' },
]

export const ESTADOS_TICKET = {
  nuevo: 'Nueva',
  en_curso: 'En curso',
  esperando_cliente: 'Esperando al cliente',
  resuelto: 'Resuelta',
}

/** Cómo lo ve el cliente (más cercano). */
export const ESTADOS_PARA_CLIENTE = {
  nuevo: 'Recibida',
  en_curso: 'En revisión',
  esperando_cliente: 'Te respondimos',
  resuelto: 'Resuelta',
}

export const PRIORIDADES = { baja: 'Baja', normal: 'Normal', alta: 'Alta' }

export function textoTema(categoria) {
  return TEMAS.find((t) => t.valor === categoria)?.texto || 'Consulta'
}

/** 42 → "AD-0042". */
export function numeroTicket(n) {
  if (n === null || n === undefined || n === '') return ''
  return `AD-${String(n).padStart(4, '0')}`
}

/** "Consulta #AD-0042 · Te respondemos en menos de 24 horas hábiles" */
export function textoConfirmacion(n) {
  return `Consulta #${numeroTicket(n)} · ${PROMESA_RESPUESTA}`
}

// ── Sin créditos o con error de la IA ───────────────────────────────────────

const CODIGOS_SIN_CREDITOS = new Set(['SIN_CREDITOS', 'NO_CREDITS', 'INSUFFICIENT_CREDITS'])

export function esSinCreditos(error) {
  return CODIGOS_SIN_CREDITOS.has(String(error?.code || '').toUpperCase())
}

export const MENSAJE_SIN_CREDITOS =
  'Tu asistente con IA ya usó los créditos de este mes. Mira estas guías o escríbele al equipo: te ayudamos igual.'
export const MENSAJE_FALLO_IA =
  'El asistente no pudo responder ahora. Mira estas guías o escríbele al equipo: te ayudamos igual.'

export const MENSAJE_SIN_PLAN =
  'Tu plan no incluye el asistente con IA. Mira estas guías o escríbele al equipo: te ayudamos igual.'

/** Tipo de aviso que se muestra cuando la IA no responde. */
export function avisoDeErrorIa(error) {
  if (esSinCreditos(error)) return { tipo: 'sin_creditos', mensaje: MENSAJE_SIN_CREDITOS }
  return { tipo: 'fallo', mensaje: MENSAJE_FALLO_IA }
}

// ── La IA sugiere escalar (fase 2) ──────────────────────────────────────────

const PALABRAS_ESCALAR = [
  /\bcobr(o|os|aron|aste|ado|ar)\b/, /\bme cobraron\b/, /\bcargo (doble|duplicado)\b/,
  /\bpago(s)? de (la )?(mi )?(suscripcion|plan|membresia)\b/, /\b(suscripcion|membresia)\b.*\b(pago|cobro|vencid)/,
  /\breembolso\b/, /\bdevolucion de (mi )?dinero\b/,
  /\berror\b/, /\bse (cayo|traba|trabo|congela)\b/, /\bno (me )?(carga|abre|funciona|deja|guarda|aparece)\b/, /\bfalla\b/, /\bpantalla (en )?blanca\b/,
  /\bno cuadra(n)?\b/, /\bno coincide(n)?\b/, /\bdiferencia(s)? (en|de)\b/, /\bdatos? (incorrectos?|erroneos?|mal)\b/, /\bdesaparecio\b/, /\bperdi\b/, /\bme sale (mal|otro|distinto)\b/,
]

/** ¿La pregunta habla de cobros, pagos de suscripción, errores o datos que no cuadran? */
export function preguntaPideEquipo(pregunta) {
  const t = normalizar(pregunta)
  if (!t) return false
  return PALABRAS_ESCALAR.some((re) => re.test(t))
}

const FRASES_NO_SE = [
  'no tengo esa informacion', 'no tengo informacion', 'no estoy seguro', 'no estoy segura', 'no sabria',
  'no puedo ayudarte con eso', 'no encuentro', 'contactar al equipo', 'escribele al equipo',
  'escribir al equipo', 'soporte humano', 'no cuento con', 'no se la respuesta', 'no lo se',
]

/** ¿La respuesta de la IA admite que no sabe? */
export function respuestaNoSabe(respuesta) {
  const t = normalizar(respuesta)
  return FRASES_NO_SE.some((f) => t.includes(normalizar(f)))
}

/**
 * Separa la marca [[ESCALAR]] del texto que ve el cliente.
 * @returns {{ texto: string, marca: boolean }}
 */
export function separarMarcaEscalar(respuesta) {
  const original = String(respuesta ?? '')
  const marca = original.includes(MARCA_ESCALAR)
  const texto = original.split(MARCA_ESCALAR).join('').replace(/\s+$/g, '').trim()
  return { texto, marca }
}

/**
 * Decide si debajo de la respuesta se ofrece "¿Se lo pasamos al equipo?".
 * @returns {{ texto: string, ofrecer: boolean, motivo: 'marca'|'no_sabe'|'pregunta'|null }}
 */
export function evaluarRespuestaIa(pregunta, respuestaCruda) {
  const { texto, marca } = separarMarcaEscalar(respuestaCruda)
  if (marca) return { texto, ofrecer: true, motivo: 'marca' }
  if (respuestaNoSabe(texto)) return { texto, ofrecer: true, motivo: 'no_sabe' }
  if (preguntaPideEquipo(pregunta)) return { texto, ofrecer: true, motivo: 'pregunta' }
  return { texto, ofrecer: false, motivo: null }
}

/** Resumen automático que viaja con el ticket: lo que preguntó y la pantalla. */
export function resumenParaTicket({ preguntas = [], pantalla = '', tema = '' } = {}) {
  const lista = preguntas.map((p) => String(p).trim()).filter(Boolean).slice(-3)
  const lineas = []
  if (tema) lineas.push(`Tema: ${tema}`)
  if (pantalla) lineas.push(`Pantalla: ${pantalla}`)
  if (lista.length) lineas.push(`Lo que preguntó: ${lista.map((p) => `"${p.length > 200 ? `${p.slice(0, 200)}…` : p}"`).join(' · ')}`)
  return lineas.join('\n')
}

/** Tema probable según las palabras de la pregunta, para preseleccionar el chip. */
export function temaSugerido(texto) {
  const t = normalizar(texto)
  if (/\b(cobr|pago|plan|suscripcion|membresia|factura del sistema)/.test(t)) return 'pagos'
  if (/\b(error|falla|no (me )?(carga|abre|funciona|deja|guarda)|se (cayo|traba))/.test(t)) return 'error'
  if (/\b(iva|islr|retencion|seniat|declar|fiscal|libro)/.test(t)) return 'fiscal'
  return null
}

// ── Capa 1: guías mientras escribe ──────────────────────────────────────────

/** Hasta `max` guías que coinciden con lo que escribe (mínimo 3 letras útiles). */
export function sugerirGuias(articulos, texto, max = 3) {
  const t = normalizar(texto)
  if (t.length < 3) return []
  return buscarArticulos(articulos, texto, { max }).filter((a) => a.puntaje > 0)
}

// ── Bandeja del equipo ──────────────────────────────────────────────────────

export const ORDEN_ESTADOS = ['nuevo', 'en_curso', 'esperando_cliente', 'resuelto']

/** Fecha desde la que el cliente espera respuesta (último mensaje suyo). */
function desdeCuandoEspera(c) {
  return new Date(c.ultimo_mensaje_en || c.updated_at || c.created_at).getTime()
}

/** Horas que lleva esperando una consulta que necesita respuesta del equipo; 0 si no espera. */
export function horasSinResponder(c, ahora = Date.now()) {
  if (!c || !['nuevo', 'en_curso'].includes(c.estado_ticket)) return 0
  const ms = ahora - desdeCuandoEspera(c)
  return ms > 0 ? ms / 3_600_000 : 0
}

export function pasaDelLimite(c, ahora = Date.now()) {
  return horasSinResponder(c, ahora) > HORAS_AVISO
}

/** Conteo por estado: { nuevo, en_curso, esperando_cliente, resuelto, todas }. */
export function conteosPorEstado(consultas) {
  const r = { nuevo: 0, en_curso: 0, esperando_cliente: 0, resuelto: 0, todas: 0 }
  for (const c of consultas || []) {
    if (r[c.estado_ticket] !== undefined) r[c.estado_ticket] += 1
    r.todas += 1
  }
  return r
}

/** Filtra por estado ('todas' = todas menos las resueltas, que van aparte). */
export function filtrarBandeja(consultas, estado) {
  if (estado === 'todas') return consultas.filter((c) => c.estado_ticket !== 'resuelto')
  return consultas.filter((c) => c.estado_ticket === estado)
}

/**
 * Orden por antigüedad: primero la que lleva más tiempo esperando.
 * Las resueltas y las que esperan al cliente van después, de más reciente a más antigua.
 */
export function ordenarBandeja(consultas, ahora = Date.now()) {
  const espera = (c) => ['nuevo', 'en_curso'].includes(c.estado_ticket)
  return [...consultas].sort((a, b) => {
    const ea = espera(a)
    const eb = espera(b)
    if (ea !== eb) return ea ? -1 : 1
    const ta = desdeCuandoEspera(a)
    const tb = desdeCuandoEspera(b)
    return ea ? ta - tb : tb - ta
  })
}

/** "hace 3 h", "hace 2 días"… */
export function haceCuanto(fecha, ahora = Date.now()) {
  const ms = ahora - new Date(fecha).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'ahora'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

/** Total de mensajes del equipo sin leer por el cliente. */
export function totalNoLeidosCliente(consultas) {
  return (consultas || []).reduce((s, c) => s + (Number(c.no_leidos_cliente) || 0), 0)
}

// ── Respuestas guardadas (en localStorage del admin en esta fase) ───────────

export const RESPUESTAS_INICIALES = [
  { id: 'r1', titulo: 'Recibimos tu pago', texto: 'Hola, recibimos tu reporte de pago y lo estamos verificando. En cuanto lo confirmemos, tu plan queda al día. Gracias por tu paciencia.' },
  { id: 'r2', titulo: 'Necesito una captura', texto: 'Hola, para revisar esto mejor, ¿puedes enviarme una captura de la pantalla donde ves el problema? Gracias.' },
  { id: 'r3', titulo: 'Ya lo corregimos', texto: 'Hola, ya revisamos y corregimos lo que reportaste. Entra de nuevo y cuéntame si todo se ve bien ahora.' },
]

/** Lee/valida la lista guardada; si no hay o está dañada, devuelve las iniciales. */
export function leerRespuestas(storage) {
  try {
    const lista = JSON.parse(storage?.getItem('ad_soporte_respuestas') || 'null')
    if (Array.isArray(lista) && lista.every((r) => r && typeof r.titulo === 'string' && typeof r.texto === 'string')) return lista
  } catch { /* se usan las iniciales */ }
  return RESPUESTAS_INICIALES.map((r) => ({ ...r }))
}

export function guardarRespuestas(storage, lista) {
  try { storage?.setItem('ad_soporte_respuestas', JSON.stringify(lista)) } catch { /* sin almacenamiento */ }
}

// ── Texto seguro ────────────────────────────────────────────────────────────

/** Divide "hola **mundo**" en partes para pintar negritas SIN v-html (el texto del cliente nunca se interpreta como HTML). */
export function partesTexto(texto) {
  return String(texto ?? '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((p) => p !== '')
    .map((p) => (p.startsWith('**') && p.endsWith('**') && p.length > 4 ? { texto: p.slice(2, -2), negrita: true } : { texto: p, negrita: false }))
}
