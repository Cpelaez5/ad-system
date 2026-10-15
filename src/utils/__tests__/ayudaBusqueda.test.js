import { describe, it, expect } from 'vitest'
import {
  normalizar, palabrasClave, parsearFrontmatter, crearArticulo, buscarArticulos,
  articulosParaChat, construirContextoAyuda, slugDeRuta, rutaArticulo, iconoArticulo,
  INSTRUCCION_GUIAS, SLUG_FAQ,
} from '../ayudaBusqueda.js'

const md = (titulo, palabras, orden, cuerpo, resumen = '') =>
  `---\ntitulo: ${titulo}\nresumen: ${resumen}\npalabras: ${palabras}\norden: ${orden}\n---\n${cuerpo}`

const articulos = [
  crearArticulo('mi-negocio', md('Mi negocio', 'tasa, sello, firma, perfil fiscal', 9, '# Mi negocio\nAquí configuras la tasa de cambio y tu sello.', 'Tus datos y la tasa')),
  crearArticulo('registrar', md('Registrar una venta, compra o gasto', 'factura, foto, venta', 2, '# Registrar\nTómale una foto a la factura.')),
  crearArticulo('mis-papeles', md('Mis papeles', 'vencimientos, rif, documentos', 5, '# Mis papeles\nSube tu RIF y recibe avisos.')),
  crearArticulo('mis-clientes', md('Mis clientes', 'cobrar, whatsapp', 8, '# Clientes\nCobra por WhatsApp.')),
  crearArticulo(SLUG_FAQ, md('Preguntas frecuentes', 'dudas, ayuda', 12, '# FAQ\nRespuestas rápidas.')),
]

describe('normalizar y palabrasClave', () => {
  it('quita acentos, mayúsculas y signos', () => {
    expect(normalizar('¿Cómo VOY?')).toBe('como voy')
    expect(normalizar('  Tasa   de  CAMBIO ')).toBe('tasa de cambio')
  })
  it('descarta palabras vacías y el plural simple', () => {
    expect(palabrasClave('¿Cómo cambio las tasas?')).toEqual(['cambio', 'tasa'])
  })
})

describe('parsearFrontmatter', () => {
  it('lee titulo, resumen, palabras y orden', () => {
    const { datos, cuerpo } = parsearFrontmatter('---\ntitulo: Mi negocio\nresumen: Tus datos\npalabras: tasa, sello , firma\norden: 9\n---\n# Hola\ntexto')
    expect(datos).toEqual({ titulo: 'Mi negocio', resumen: 'Tus datos', palabras: ['tasa', 'sello', 'firma'], orden: 9 })
    expect(cuerpo).toBe('# Hola\ntexto')
  })
  it('acepta comillas, saltos de línea de Windows y BOM', () => {
    const { datos } = parsearFrontmatter('﻿---\r\ntitulo: "Con comillas"\r\norden: 3\r\n---\r\ncuerpo')
    expect(datos.titulo).toBe('Con comillas')
    expect(datos.orden).toBe(3)
  })
  it('sin frontmatter devuelve valores por defecto y el texto completo', () => {
    const { datos, cuerpo } = parsearFrontmatter('# Solo texto')
    expect(datos.palabras).toEqual([])
    expect(datos.orden).toBe(999)
    expect(cuerpo).toBe('# Solo texto')
  })
  it('los dos puntos dentro del valor no rompen la línea', () => {
    expect(parsearFrontmatter('---\nresumen: Paso 1: abre\n---\nx').datos.resumen).toBe('Paso 1: abre')
  })
})

describe('crearArticulo', () => {
  it('usa el slug como título si falta y genera texto plano', () => {
    const a = crearArticulo('sin-titulo', '# Algo\nHola **mundo** [enlace](/x)')
    expect(a.titulo).toBe('sin-titulo')
    expect(a.texto).toContain('Hola mundo enlace')
    expect(slugDeRuta('/docs/ayuda/mi-negocio.md')).toBe('mi-negocio')
  })
})

describe('buscarArticulos', () => {
  it('"tasa" devuelve primero Mi negocio', () => {
    const r = buscarArticulos(articulos, 'tasa')
    expect(r[0].slug).toBe('mi-negocio')
  })
  it('ignora acentos, mayúsculas y plurales', () => {
    expect(buscarArticulos(articulos, 'TASAS de cambio')[0].slug).toBe('mi-negocio')
    expect(buscarArticulos(articulos, 'fáctura')[0].slug).toBe('registrar')
    expect(buscarArticulos(articulos, 'factura')[0].slug).toBe('registrar')
  })
  it('el título pesa más que el cuerpo', () => {
    const r = buscarArticulos(articulos, 'papeles')
    expect(r[0].slug).toBe('mis-papeles')
  })
  it('busca por prefijo ("whats" encuentra WhatsApp)', () => {
    expect(buscarArticulos(articulos, 'whats')[0].slug).toBe('mis-clientes')
  })
  it('sin consulta devuelve todos por orden', () => {
    expect(buscarArticulos(articulos, '').map((a) => a.slug)).toEqual(['registrar', 'mis-papeles', 'mis-clientes', 'mi-negocio', SLUG_FAQ])
  })
  it('sin coincidencias devuelve vacío y respeta max', () => {
    expect(buscarArticulos(articulos, 'xyzabc')).toEqual([])
    expect(buscarArticulos(articulos, '', { max: 2 })).toHaveLength(2)
  })
})

describe('articulosParaChat y construirContextoAyuda', () => {
  const muchos = [
    ...['a', 'b', 'c', 'd'].map((x, i) => crearArticulo(`guia-${x}`, md(`Guía ${x}`, 'impuesto', i + 1, `Habla del impuesto ${x}`))),
    crearArticulo(SLUG_FAQ, md('Preguntas frecuentes', 'dudas', 12, 'Dudas.')),
  ]

  it('toma como máximo 3 artículos relevantes', () => {
    const r = articulosParaChat(articulos, 'tasa sello firma')
    expect(r.filter((a) => a.slug !== SLUG_FAQ).length).toBeLessThanOrEqual(3)
    expect(r[0].slug).toBe('mi-negocio')
  })
  it('agrega la FAQ si hay menos de 3 resultados', () => {
    const r = articulosParaChat(articulos, 'tasa')
    expect(r.map((a) => a.slug)).toContain(SLUG_FAQ)
  })
  it('agrega la FAQ si hay empate en el corte', () => {
    const r = articulosParaChat(muchos, 'impuesto')
    expect(r).toHaveLength(4)
    expect(r[3].slug).toBe(SLUG_FAQ)
  })
  it('si nada coincide, da solo la FAQ', () => {
    expect(articulosParaChat(articulos, 'zzzz').map((a) => a.slug)).toEqual([SLUG_FAQ])
  })
  it('arma el bloque con la instrucción y el nombre de cada guía', () => {
    const t = construirContextoAyuda(articulos, 'cómo cambio la tasa')
    expect(t).toContain(INSTRUCCION_GUIAS)
    expect(t).toContain('### Guía: Mi negocio')
    expect(t).toContain('### Guía: Preguntas frecuentes')
  })
  it('recorta guías muy largas', () => {
    const larga = crearArticulo('larga', md('Larga', 'impuesto', 1, 'x'.repeat(10000)))
    const t = construirContextoAyuda([larga], 'impuesto', { maxCaracteres: 100 })
    expect(t.length).toBeLessThan(600)
    expect(t).toContain('…')
  })
  it('devuelve vacío si no hay artículos', () => {
    expect(construirContextoAyuda([], 'tasa')).toBe('')
  })
})

describe('rutas e íconos', () => {
  it('la API tiene su propia ruta', () => {
    expect(rutaArticulo('api')).toBe('/ayuda/api')
    expect(rutaArticulo('mi-negocio')).toBe('/ayuda/mi-negocio')
  })
  it('hay un ícono por defecto', () => {
    expect(iconoArticulo('mi-negocio')).toBe('mdi-domain')
    expect(iconoArticulo('desconocido')).toMatch(/^mdi-/)
  })
})
