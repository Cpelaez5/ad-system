import { describe, it, expect } from 'vitest'
import {
  MARCA_ESCALAR, numeroTicket, textoConfirmacion, esSinCreditos, avisoDeErrorIa, MENSAJE_SIN_CREDITOS, MENSAJE_FALLO_IA,
  preguntaPideEquipo, respuestaNoSabe, separarMarcaEscalar, evaluarRespuestaIa, resumenParaTicket, temaSugerido,
  sugerirGuias, horasSinResponder, pasaDelLimite, conteosPorEstado, filtrarBandeja, ordenarBandeja, haceCuanto,
  totalNoLeidosCliente, partesTexto, leerRespuestas, guardarRespuestas, RESPUESTAS_INICIALES, INSTRUCCION_ESCALAR,
} from '@/utils/soporte.js'
import { crearArticulo } from '@/utils/ayudaBusqueda.js'

const AHORA = new Date('2026-10-15T12:00:00Z').getTime()
const hace = (h) => new Date(AHORA - h * 3_600_000).toISOString()

describe('textos del ticket', () => {
  it('da formato al número y a la confirmación', () => {
    expect(numeroTicket(42)).toBe('AD-0042')
    expect(numeroTicket(12345)).toBe('AD-12345')
    expect(numeroTicket(null)).toBe('')
    expect(textoConfirmacion(42)).toBe('Consulta #AD-0042 · Te respondemos en menos de 24 horas hábiles')
  })
})

describe('sin créditos o con error de la IA', () => {
  it('reconoce SIN_CREDITOS y da el mensaje amable', () => {
    expect(esSinCreditos({ code: 'SIN_CREDITOS' })).toBe(true)
    expect(esSinCreditos({ code: 'sin_creditos' })).toBe(true)
    expect(esSinCreditos({ code: 'NETWORK_ERROR' })).toBe(false)
    expect(esSinCreditos(null)).toBe(false)
    expect(avisoDeErrorIa({ code: 'SIN_CREDITOS' })).toEqual({ tipo: 'sin_creditos', mensaje: MENSAJE_SIN_CREDITOS })
    expect(MENSAJE_SIN_CREDITOS).toContain('ya usó los créditos de este mes')
  })

  it('cualquier otro fallo tiene salida igual', () => {
    expect(avisoDeErrorIa(new Error('x'))).toEqual({ tipo: 'fallo', mensaje: MENSAJE_FALLO_IA })
    expect(MENSAJE_FALLO_IA).toContain('escríbele al equipo')
  })
})

describe('la IA sugiere escalar', () => {
  it('detecta cobros, pagos, errores y datos que no cuadran en la pregunta', () => {
    expect(preguntaPideEquipo('Me cobraron dos veces el plan')).toBe(true)
    expect(preguntaPideEquipo('Hice el pago de mi suscripción y no aparece')).toBe(true)
    expect(preguntaPideEquipo('La pantalla no carga')).toBe(true)
    expect(preguntaPideEquipo('El IVA no cuadra con mi libro')).toBe(true)
    expect(preguntaPideEquipo('Me sale un error al guardar')).toBe(true)
    expect(preguntaPideEquipo('¿Cómo registro una venta?')).toBe(false)
    expect(preguntaPideEquipo('')).toBe(false)
  })

  it('detecta cuando la respuesta admite que no sabe', () => {
    expect(respuestaNoSabe('Lo siento, no tengo esa información. Escríbele al equipo.')).toBe(true)
    expect(respuestaNoSabe('Para registrar una venta toca el botón Registrar.')).toBe(false)
  })

  it('quita la marca [[ESCALAR]] y avisa que estaba', () => {
    expect(separarMarcaEscalar(`No sé eso.\n${MARCA_ESCALAR}`)).toEqual({ texto: 'No sé eso.', marca: true })
    expect(separarMarcaEscalar('Hola')).toEqual({ texto: 'Hola', marca: false })
    expect(separarMarcaEscalar(null)).toEqual({ texto: '', marca: false })
  })

  it('decide si se ofrece pasarlo al equipo y nunca muestra la marca', () => {
    const conMarca = evaluarRespuestaIa('algo raro', `No lo sé.\n${MARCA_ESCALAR}`)
    expect(conMarca).toEqual({ texto: 'No lo sé.', ofrecer: true, motivo: 'marca' })
    expect(evaluarRespuestaIa('hola', 'No estoy seguro de eso.').motivo).toBe('no_sabe')
    expect(evaluarRespuestaIa('me cobraron de más', 'Revisa tu plan.').motivo).toBe('pregunta')
    const normal = evaluarRespuestaIa('¿cómo registro una venta?', 'Toca Registrar.')
    expect(normal.ofrecer).toBe(false)
    expect(normal.texto).not.toContain('[[')
  })

  it('la instrucción para la IA nombra la marca', () => {
    expect(INSTRUCCION_ESCALAR).toContain(MARCA_ESCALAR)
  })

  it('arma el resumen del ticket con la pantalla y lo que preguntó (máx. 3)', () => {
    const r = resumenParaTicket({ preguntas: ['uno', 'dos', 'tres', 'cuatro'], pantalla: 'Mis papeles', tema: 'Algo no funciona' })
    expect(r).toContain('Tema: Algo no funciona')
    expect(r).toContain('Pantalla: Mis papeles')
    expect(r).toContain('"dos" · "tres" · "cuatro"')
    expect(r).not.toContain('"uno"')
    expect(resumenParaTicket({})).toBe('')
  })

  it('sugiere un tema para preseleccionar el chip', () => {
    expect(temaSugerido('me cobraron el plan')).toBe('pagos')
    expect(temaSugerido('la app no carga')).toBe('error')
    expect(temaSugerido('retención de IVA')).toBe('fiscal')
    expect(temaSugerido('hola')).toBeNull()
  })
})

describe('guías mientras escribe', () => {
  const articulos = [
    crearArticulo('mi-plan-y-pagos', '---\ntitulo: Mi plan y pagos\nresumen: Cómo pagar tu plan\npalabras: pago, plan, suscripción\norden: 1\n---\nReporta tu pago.'),
    crearArticulo('registrar', '---\ntitulo: Registrar\nresumen: Cargar ventas\npalabras: venta, compra\norden: 2\n---\nToca Registrar.'),
  ]
  it('encuentra guías y no busca con menos de 3 letras', () => {
    expect(sugerirGuias(articulos, 'cómo pago mi plan')[0].slug).toBe('mi-plan-y-pagos')
    expect(sugerirGuias(articulos, 'ho')).toEqual([])
    expect(sugerirGuias(articulos, 'zzzzz')).toEqual([])
  })
})

describe('bandeja del equipo', () => {
  const c = (id, estado, h, extra = {}) => ({ id, estado_ticket: estado, ultimo_mensaje_en: hace(h), ...extra })
  const lista = [
    c('resuelta', 'resuelto', 1),
    c('reciente', 'nuevo', 2),
    c('esperando', 'esperando_cliente', 50),
    c('vieja', 'en_curso', 30),
    c('media', 'nuevo', 10),
  ]

  it('cuenta por estado', () => {
    expect(conteosPorEstado(lista)).toEqual({ nuevo: 2, en_curso: 1, esperando_cliente: 1, resuelto: 1, todas: 5 })
    expect(conteosPorEstado(null).todas).toBe(0)
  })

  it('filtra por estado', () => {
    expect(filtrarBandeja(lista, 'nuevo').map((x) => x.id).sort()).toEqual(['media', 'reciente'])
    expect(filtrarBandeja(lista, 'todas').map((x) => x.id)).not.toContain('resuelta')
  })

  it('ordena por antigüedad: la que más espera, primero; las demás después', () => {
    expect(ordenarBandeja(lista, AHORA).map((x) => x.id)).toEqual(['vieja', 'media', 'reciente', 'resuelta', 'esperando'])
  })

  it('avisa si pasan más de 24 h sin respuesta, solo si espera al equipo', () => {
    expect(horasSinResponder(c('a', 'nuevo', 30), AHORA)).toBeCloseTo(30)
    expect(pasaDelLimite(c('a', 'nuevo', 30), AHORA)).toBe(true)
    expect(pasaDelLimite(c('a', 'en_curso', 23), AHORA)).toBe(false)
    expect(pasaDelLimite(c('a', 'esperando_cliente', 90), AHORA)).toBe(false)
    expect(pasaDelLimite(c('a', 'resuelto', 90), AHORA)).toBe(false)
  })

  it('escribe cuánto hace', () => {
    expect(haceCuanto(hace(0.01), AHORA)).toBe('ahora')
    expect(haceCuanto(hace(0.5), AHORA)).toBe('hace 30 min')
    expect(haceCuanto(hace(5), AHORA)).toBe('hace 5 h')
    expect(haceCuanto(hace(24), AHORA)).toBe('hace 1 día')
    expect(haceCuanto(hace(72), AHORA)).toBe('hace 3 días')
  })

  it('suma los no leídos del cliente', () => {
    expect(totalNoLeidosCliente([{ no_leidos_cliente: 2 }, { no_leidos_cliente: 0 }, {}])).toBe(2)
    expect(totalNoLeidosCliente(undefined)).toBe(0)
  })
})

describe('texto seguro y respuestas guardadas', () => {
  it('separa negritas sin interpretar HTML', () => {
    expect(partesTexto('hola **mundo** <b>x</b>')).toEqual([
      { texto: 'hola ', negrita: false }, { texto: 'mundo', negrita: true }, { texto: ' <b>x</b>', negrita: false },
    ])
  })

  it('lee y guarda respuestas en el almacenamiento, con valores iniciales si falla', () => {
    const mem = {}
    const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v } }
    expect(leerRespuestas(storage)).toEqual(RESPUESTAS_INICIALES)
    guardarRespuestas(storage, [{ id: 'x', titulo: 'T', texto: 'Hola' }])
    expect(leerRespuestas(storage)).toEqual([{ id: 'x', titulo: 'T', texto: 'Hola' }])
    mem.ad_soporte_respuestas = '{roto'
    expect(leerRespuestas(storage)).toEqual(RESPUESTAS_INICIALES)
    expect(leerRespuestas(null)).toEqual(RESPUESTAS_INICIALES)
  })
})
