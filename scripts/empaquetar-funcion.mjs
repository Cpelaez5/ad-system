// Empaqueta una Edge Function que importa archivos locales (p. ej. ./logica.js) en UN SOLO archivo,
// porque el despliegue por herramienta solo acepta un archivo. Sin duplicar lógica a mano.
//
//   node scripts/empaquetar-funcion.mjs avisos-vencimiento
//
// Salida: supabase/functions/<nombre>/dist/index.ts (se sube a git para poder desplegarlo).
// Los imports remotos (https:, jsr:, npm:) se dejan tal cual: los resuelve Deno al desplegar.
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nombre = process.argv[2] || 'avisos-vencimiento'
const carpeta = path.join(raiz, 'supabase', 'functions', nombre)
const entrada = path.join(carpeta, 'index.ts')
if (!fs.existsSync(entrada)) {
  console.error(`No existe ${entrada}`)
  process.exit(1)
}
const salida = path.join(carpeta, 'dist', 'index.ts')

await build({
  entryPoints: [entrada],
  outfile: salida,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'error',
  // Remotos: se quedan como import (Deno los baja al desplegar)
  plugins: [{
    name: 'remotos-externos',
    setup(b) {
      b.onResolve({ filter: /^(https?:|jsr:|npm:|node:)/ }, (a) => ({ path: a.path, external: true }))
    },
  }],
  banner: {
    js: `// ARCHIVO GENERADO por scripts/empaquetar-funcion.mjs a partir de index.ts + sus imports locales.\n// NO editar a mano: cambia el origen y vuelve a correr "node scripts/empaquetar-funcion.mjs ${nombre}".\n// Este es el archivo que se despliega (un solo archivo).`,
  },
})

const tam = (fs.statSync(salida).size / 1024).toFixed(1)
console.log(`Listo: ${path.relative(raiz, salida)} (${tam} KB). Despliega ESE archivo como "${nombre}".`)
