// Prueba la zona PURE de supabase/functions/despachar-notificacion/index.ts (un solo archivo):
// se extrae entre los marcadores, se transpila con esbuild y se evalúa. Así se prueba el código real.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transformSync } from 'esbuild'

const ruta = resolve(process.cwd(), 'supabase/functions/despachar-notificacion/index.ts')
const fuente = readFileSync(ruta, 'utf8')
const bloque = fuente.split('// <<PURE')[1].split('// PURE>>')[0].replace(/^[^\n]*\n/, '')
const js = transformSync(bloque, { loader: 'ts' }).code
const f = new Function(`${js}; return { escaparHtml, textoAHtml, resolverPreferencia, esSoporte, urlAbsoluta, etiquetaBoton, construirCorreoHtml, agruparPendientes, grupoListo, resumenGrupo, motivoOmitir }`)()

describe('despachar-notificacion · correo', () => {
  it('escapa todo el texto del usuario (sin HTML inyectable)', () => {
    const html = f.construirCorreoHtml({
      titulo: '<script>alert(1)</script>',
      lineas: ['Hola <img src=x onerror=alert(1)> & "comillas"\nsegunda línea'],
      extra: '<b>extra</b>',
      urlBoton: 'https://adsystemapp.com/x?a=1&b="2"',
      boton: 'Ver <b>',
      nombreEvento: '<i>evento</i>',
      urlPreferencias: 'https://adsystemapp.com/settings?seccion=avisos',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<b>extra</b>')
    expect(html).not.toContain('<i>evento</i>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp; &quot;comillas&quot;<br>segunda línea')
    expect(html).toContain('href="https://adsystemapp.com/x?a=1&amp;b=&quot;2&quot;"')
  })

  it('trae marca, botón y pie con enlace a preferencias', () => {
    const html = f.construirCorreoHtml({
      titulo: 'Te respondió el equipo', lineas: ['Hola'], urlBoton: 'https://adsystemapp.com/cliente/inicio?soporte=1',
      boton: 'Ver respuesta', nombreEvento: 'El equipo respondió tu consulta', urlPreferencias: 'https://adsystemapp.com/settings?seccion=avisos',
    })
    expect(html).toContain('AD <span')
    expect(html).toContain('Ver respuesta')
    expect(html).toContain('#8E1818')
    expect(html).toContain('Recibes este correo porque tienes activados los avisos de <strong>El equipo respondió tu consulta</strong>')
    expect(html).toContain('/settings?seccion=avisos')
    expect(html).not.toMatch(/background(-color)?:\s*#fff(fff)?[^;]*;[^"]*color:\s*#fff/i)
  })

  it('urlAbsoluta solo acepta rutas internas', () => {
    expect(f.urlAbsoluta('https://adsystemapp.com/', '/admin/soporte?c=1')).toBe('https://adsystemapp.com/admin/soporte?c=1')
    expect(f.urlAbsoluta('https://adsystemapp.com', '//evil.com')).toBe('https://adsystemapp.com/')
    expect(f.urlAbsoluta('https://adsystemapp.com', 'https://evil.com')).toBe('https://adsystemapp.com/')
    expect(f.urlAbsoluta('https://adsystemapp.com', null)).toBe('https://adsystemapp.com/')
  })

  it('botón por tipo', () => {
    expect(f.etiquetaBoton('soporte_respuesta')).toBe('Ver respuesta')
    expect(f.etiquetaBoton('soporte_nueva')).toBe('Responder')
    expect(f.etiquetaBoton('soporte_mensaje_cliente')).toBe('Responder')
    expect(f.etiquetaBoton('papel_por_vencer')).toBe('Ver en AD System')
  })
})

describe('despachar-notificacion · preferencias y reglas', () => {
  it('resolverPreferencia: fila > catálogo > true', () => {
    expect(f.resolverPreferencia(undefined, { correo_def: false, push_def: true })).toEqual({ correo: false, push: true })
    expect(f.resolverPreferencia({ correo: true, push: false }, { correo_def: false, push_def: true })).toEqual({ correo: true, push: false })
    expect(f.resolverPreferencia(null, null)).toEqual({ correo: true, push: true })
  })

  it('esSoporte', () => {
    expect(f.esSoporte('soporte_estado')).toBe(true)
    expect(f.esSoporte('papel_por_vencer')).toBe(false)
  })

  it('motivoOmitir: preferencia, leída, sin correo, o enviar', () => {
    const base = { pref: { correo: true }, todasLeidas: false, clienteYaLoVio: false, tieneCorreo: true }
    expect(f.motivoOmitir(base)).toBeNull()
    expect(f.motivoOmitir({ ...base, pref: { correo: false } })).toBe('preferencia')
    expect(f.motivoOmitir({ ...base, todasLeidas: true })).toBe('leida')
    expect(f.motivoOmitir({ ...base, clienteYaLoVio: true })).toBe('leida')
    expect(f.motivoOmitir({ ...base, tieneCorreo: false })).toBe('sin_correo')
  })
})

describe('despachar-notificacion · agrupación de correos de soporte', () => {
  const fila = (id, user, agrupar, minutos, extra = {}) => ({
    id, user_id: user, agrupar, titulo: 'Te respondió el equipo · Consulta #AD-0042', cuerpo: `msg ${id}`,
    created_at: new Date(Date.UTC(2026, 9, 16, 12, minutos)).toISOString(), ...extra,
  })

  it('agrupa por (usuario, consulta) y ordena por fecha', () => {
    const g = f.agruparPendientes([
      fila('3', 'u1', 'soporte:a', 2), fila('1', 'u1', 'soporte:a', 0), fila('2', 'u1', 'soporte:b', 1), fila('4', 'u2', 'soporte:a', 1),
    ])
    expect(g).toHaveLength(3)
    const deU1A = g.find((x) => x[0].user_id === 'u1' && x[0].agrupar === 'soporte:a')
    expect(deU1A.map((x) => x.id)).toEqual(['1', '3'])
  })

  it('sin agrupar, cada fila va sola', () => {
    expect(f.agruparPendientes([fila('1', 'u1', null, 0), fila('2', 'u1', null, 1)])).toHaveLength(2)
  })

  it('el grupo espera 2 minutos desde la notificación más antigua', () => {
    const grupo = [fila('1', 'u', 'soporte:a', 0), fila('2', 'u', 'soporte:a', 1)]
    const t0 = Date.UTC(2026, 9, 16, 12, 0)
    expect(f.grupoListo(grupo, t0 + 90_000, 120_000)).toBe(false)
    expect(f.grupoListo(grupo, t0 + 120_000, 120_000)).toBe(true)
    expect(f.grupoListo([], t0, 120_000)).toBe(false)
  })

  it('un mensaje -> su título; varios -> título con conteo y todas las líneas', () => {
    const uno = f.resumenGrupo([fila('1', 'u', 'soporte:a', 0)])
    expect(uno.asunto).toBe('Te respondió el equipo · Consulta #AD-0042')
    expect(uno.lineas).toEqual(['msg 1'])
    const tres = f.resumenGrupo([fila('1', 'u', 'a', 0), fila('2', 'u', 'a', 1), fila('3', 'u', 'a', 1)])
    expect(tres.asunto).toBe('Te respondió el equipo · Consulta #AD-0042 (3 mensajes nuevos)')
    expect(tres.lineas).toEqual(['msg 1', 'msg 2', 'msg 3'])
  })

  it('cuenta capturas sin adjuntarlas', () => {
    const r = f.resumenGrupo([fila('1', 'u', 'a', 0, { datos: { adjuntos: 2 } }), fila('2', 'u', 'a', 1, { datos: { adjuntos: 1 } })])
    expect(r.extra).toBe('Incluye 3 capturas: las ves dentro de AD System.')
    expect(f.resumenGrupo([fila('1', 'u', 'a', 0, { datos: { adjuntos: 1 } })]).extra).toBe('Incluye 1 captura: la ves dentro de AD System.')
    expect(f.resumenGrupo([fila('1', 'u', 'a', 0)]).extra).toBe('')
  })
})

describe('despachar-notificacion · archivo único', () => {
  it('no tiene imports relativos (deploy de un solo archivo)', () => {
    expect(fuente).not.toMatch(/from\s+['"]\.{1,2}\//)
  })
  it('el modo prueba exige JWT de la persona y no acepta credenciales del sistema', () => {
    expect(fuente).toContain("body?.modo === 'prueba'")
    expect(fuente).toContain('if (esSistema || !auth.startsWith')
    expect(fuente).toContain('supabase.auth.getUser(auth.slice(7))')
  })
})
