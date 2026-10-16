// Genera muestras de TODOS los documentos que crea el sistema (con datos ficticios) en .muestras/
// y las convierte a imágenes para revisarlas a ojo: PDF -> PNG, correos -> PNG (600 y 375 px),
// Excel -> resumen en texto (celdas, relleno, formato numérico).
//
//   node scripts/muestras-documentos.mjs
//
// No toca la base de datos: Supabase apunta a un dominio falso y sus respuestas se simulan aquí.
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import ExcelJS from 'exceljs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(RAIZ, '.muestras')
const PUERTO = 5199
fs.rmSync(SALIDA, { recursive: true, force: true })
for (const d of ['pdf', 'png', 'excel', 'texto', 'correo', 'tmp']) fs.mkdirSync(path.join(SALIDA, d), { recursive: true })

const datos = await import(path.join(RAIZ, 'scripts/muestras/datos.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'))

// ─── 1. Documentos del navegador (PDF, Excel, TXT, XML) ──────────────────────
process.env.VITE_SUPABASE_URL = 'https://fake.supabase.test'
process.env.VITE_SUPABASE_ANON_KEY = 'fake-key'
const vite = await createServer({ root: RAIZ, server: { port: PUERTO, host: '127.0.0.1', open: false, strictPort: true }, logLevel: 'error' })
await vite.listen()
const navegador = await chromium.launch()
const pagina = await navegador.newPage()
const consola = []
pagina.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consola.push(m.text()) })
pagina.on('requestfailed', (r) => consola.push(`requestfailed ${r.url()} ${r.failure()?.errorText}`))
pagina.on('pageerror', (e) => consola.push(String(e)))

// Supabase simulado: solo la tabla de retenciones devuelve algo (según ?tipo=eq.X).
await pagina.route('https://fake.supabase.test/**', async (route) => {
  const url = new URL(route.request().url())
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,accept-profile,accept,prefer' }
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
  if (url.pathname.endsWith('/rest/v1/retenciones')) {
    const tipo = (url.searchParams.get('tipo') || '').replace('eq.', '')
    const fila = datos.retenciones[tipo]
    if (fila && route.request().headers().accept?.includes('vnd.pgrst.object')) {
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(fila) })
    }
  }
  return route.fulfill({ status: 406, headers: cors, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST116', message: 'sin filas', details: '0 rows', hint: null }) })
})

await pagina.goto(`http://127.0.0.1:${PUERTO}/scripts/muestras/index.html`).catch(() => {})
// El entorno de pruebas a veces corta las conexiones locales (ver playwright.config.js): se reintenta.
let cargo = false
for (let intento = 0; intento < 5 && !cargo; intento++) {
  try {
    await pagina.waitForFunction(() => window.__listo === true, null, { timeout: 20000 })
    cargo = true
  } catch (e) {
    consola.length = 0
    await pagina.goto(`http://127.0.0.1:${PUERTO}/scripts/muestras/index.html`).catch(() => {})
  }
}
if (!cargo) {
  console.error('La página de muestras no cargó. Consola:\n' + consola.join('\n'))
  await navegador.close()
  await vite.close()
  process.exit(1)
}
const errores = await pagina.evaluate(() => window.__generar())
const muestras = await pagina.evaluate(() => window.__muestras)
for (const [nombre, v] of Object.entries(muestras)) {
  const sub = nombre.endsWith('.pdf') ? 'pdf' : nombre.endsWith('.xlsx') ? 'excel' : 'texto'
  fs.writeFileSync(path.join(SALIDA, sub, nombre), Buffer.from(v.base64, 'base64'))
}
await navegador.close()
await vite.close()

// ─── 2. PDF -> PNG ───────────────────────────────────────────────────────────
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
for (const f of fs.readdirSync(path.join(SALIDA, 'pdf'))) {
  const datosPdf = new Uint8Array(fs.readFileSync(path.join(SALIDA, 'pdf', f)))
  const doc = await pdfjs.getDocument({ data: datosPdf, useSystemFonts: true, disableFontFace: true }).promise
  for (let n = 1; n <= doc.numPages; n++) {
    const pag = await doc.getPage(n)
    const vp = pag.getViewport({ scale: 2.2 })
    const lienzo = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
    await pag.render({ canvasContext: lienzo.getContext('2d'), viewport: vp, canvas: lienzo }).promise
    fs.writeFileSync(path.join(SALIDA, 'png', `${f.replace(/\.pdf$/, '')}${doc.numPages > 1 ? `-p${n}` : ''}.png`), lienzo.toBuffer('image/png'))
  }
}

// ─── 3. Excel -> resumen de texto ────────────────────────────────────────────
for (const f of fs.readdirSync(path.join(SALIDA, 'excel'))) {
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.readFile(path.join(SALIDA, 'excel', f))
  const lineas = []
  libro.eachSheet((hoja) => {
    lineas.push(`## Hoja "${hoja.name}"  (${hoja.rowCount} filas)  congelado: ${JSON.stringify(hoja.views?.[0]?.state || 'no')}`)
    lineas.push(`anchos: ${hoja.columns.map((c) => c.width ?? '-').join(', ')}`)
    hoja.eachRow({ includeEmpty: false }, (fila, i) => {
      const celdas = []
      fila.eachCell({ includeEmpty: false }, (c) => {
        const v = c.value && typeof c.value === 'object' ? (c.value.formula ? `=${c.value.formula}` : JSON.stringify(c.value)) : c.value
        const fill = c.fill?.fgColor?.argb ? ` fill:${c.fill.fgColor.argb}` : ''
        const fmt = typeof c.value === 'number' ? ` fmt:${c.numFmt || 'General'}` : ''
        celdas.push(`${c.address}=${JSON.stringify(v)}${fill}${fmt}`)
      })
      lineas.push(`${i}: ${celdas.join(' | ')}`)
    })
  })
  fs.writeFileSync(path.join(SALIDA, 'excel', `${f}.txt`), lineas.join('\n'))
}

// ─── 4. Correos -> PNG (600 y 375 px) ────────────────────────────────────────
const stub = {
  name: 'stub-deno',
  setup(b) {
    b.onResolve({ filter: /^(jsr:|npm:|https?:)/ }, (a) => ({ path: a.path, namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const createClient = () => ({}); export const serve = () => {}; export default {};', loader: 'js' }))
  },
}
const correos = [
  { archivo: 'supabase/functions/send-invoice-email/index.ts', exporta: ['buildEmailHtml', 'buildPaymentStatusHtml', 'buildPaymentReportHtml', 'buildPaymentReceivedHtml'] },
  { archivo: 'supabase/functions/avisos-vencimiento/index.ts', exporta: ['buildAvisoHtml'] },
  { archivo: 'supabase/functions/despachar-notificacion/index.ts', exporta: ['construirCorreoHtml'] },
  { archivo: 'supabase/functions/admin-invite-user/index.ts', exporta: ['buildInvitationEmailHtml'] },
]
const fakeFactura = {
  clientName: 'Bodega La Esquina Feliz, C.A.', documentType: 'FACTURA', invoiceNumber: '00012345', controlNumber: '00-00067890', flow: 'COMPRA',
  issueDate: '2026-10-01', dueDate: '2026-10-31', status: 'EMITIDA', currency: 'VES', totalAmount: 122183.15, subtotal: 105537.27, taxAmount: 16645.88,
  items: datos.factura.items,
  issuer: { name: 'Distribuidora Los Andes de Alimentos y Productos de Consumo Masivo, C.A.', rif: 'J-12345678-9', address: datos.factura.issuer.address },
}
const llamadas = {
  buildEmailHtml: [fakeFactura],
  buildPaymentStatusHtml: [{ clientName: 'Bodega La Esquina Feliz, C.A.', invoiceNumber: 'SYS-000123', status: 'rejected', rejectionReason: 'La referencia no coincide con el monto reportado.', amount: 1234.5 }],
  buildPaymentReportHtml: [{ clientName: 'Bodega La Esquina Feliz, C.A.', planName: 'Plan Comercio', billingPeriod: 'Mensual', amountUsd: 25, amountBs: 2600.92, bcvRate: 104.03677, paymentMethod: 'Pago móvil', reference: '0012345678', reportId: 'abc' }],
  buildPaymentReceivedHtml: [{ clientName: 'Bodega La Esquina Feliz, C.A.', planName: 'Plan Comercio', amountUsd: 25, amountBs: 2600.92, paymentMethod: 'Pago móvil', reference: '0012345678' }],
  buildAvisoHtml: [{ nombreCliente: 'Bodega La Esquina Feliz, C.A.', mensajes: ['Tu Registro Mercantil vence en 7 días (23/10/2026).', 'Tu factura SYS-000123 de AD System vence mañana.'], appUrl: 'https://adsystemapp.com/cliente/mis-papeles' }],
  construirCorreoHtml: [{ titulo: 'Tienes un mensaje nuevo de soporte', lineas: ['Hola, ya revisamos tu consulta sobre la retención de IVA.', 'Escríbenos si necesitas algo más.'], urlBoton: 'https://adsystemapp.com/cliente/soporte', boton: 'Ver respuesta', nombreEvento: 'Soporte', urlPreferencias: 'https://adsystemapp.com/configuracion' }],
  buildInvitationEmailHtml: ['María', 'contador', 'https://adsystemapp.com/auth/aceptar?token=abc123'],
}
const logo = fs.readFileSync(path.join(RAIZ, 'public/ADSystem/png/logo-correo.png'))
const nav2 = await chromium.launch()
for (const c of correos) {
  const fuente = fs.readFileSync(path.join(RAIZ, c.archivo), 'utf8')
  c.exporta = c.exporta.filter((n) => fuente.includes('function ' + n))
  const salida = path.join(SALIDA, 'tmp', path.basename(path.dirname(c.archivo)) + '.mjs')
  await build({
    entryPoints: [path.join(RAIZ, c.archivo)], bundle: true, format: 'esm', platform: 'neutral', outfile: salida, plugins: [stub], logLevel: 'error',
    banner: { js: 'globalThis.Deno = globalThis.Deno || { serve() {}, env: { get() { return "" } } };' },
    footer: { js: `export { ${c.exporta.join(', ')} };` },
  }).catch((e) => { fs.writeFileSync(path.join(SALIDA, 'correo', `ERROR-${path.basename(path.dirname(c.archivo))}.txt`), String(e)) })
  if (!fs.existsSync(salida)) continue
  const mod = await import('file:///' + salida.replace(/\\/g, '/'))
  for (const nombre of c.exporta) {
    if (typeof mod[nombre] !== 'function') continue
    const html = mod[nombre](...llamadas[nombre])
    fs.writeFileSync(path.join(SALIDA, 'correo', `${nombre}.html`), html)
    for (const ancho of [600, 375]) {
      const p = await nav2.newPage({ viewport: { width: ancho, height: 800 } })
      await p.route('https://adsystemapp.com/ADSystem/**', (r) => r.fulfill({ contentType: 'image/png', body: logo }))
      await p.route(/^https?:\/\/(?!adsystemapp\.com|localhost)/, (r) => r.abort())
      await p.setContent(html, { waitUntil: 'load' })
      await p.screenshot({ path: path.join(SALIDA, 'correo', `${nombre}-${ancho}.png`), fullPage: true })
      await p.close()
    }
  }
}
await nav2.close()

fs.writeFileSync(path.join(SALIDA, 'RESUMEN.txt'), `Errores al generar: ${JSON.stringify(errores, null, 2)}\nConsola (errores): ${consola.slice(0, 20).join('\n')}\n`)
console.log('Errores al generar:', errores)
console.log('Muestras en', SALIDA)
