/**
 * Sello y firma: detectar imágenes blancas o muy claras (no se verían sobre el papel)
 * y oscurecerlas conservando la transparencia. Ver docs/mvp/diseno/sello-y-firma-ajustes.md §2.
 */

export const TINTAS = {
  negro: [30, 30, 30],
  azul: [26, 58, 138],
}

/**
 * @param {Uint8ClampedArray|number[]} rgba  píxeles RGBA (ImageData.data)
 * @returns {{ visibles: number, claros: number, proporcionClara: number }}
 */
export function analizarClaridad(rgba) {
  let visibles = 0
  let claros = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 51) continue // casi transparente: no cuenta
    visibles++
    const lum = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255
    if (lum > 0.85) claros++
  }
  return { visibles, claros, proporcionClara: visibles ? claros / visibles : 0 }
}

/** true si la imagen casi no se vería sobre papel blanco. */
export function esImagenClara(rgba, umbral = 0.8) {
  const { visibles, proporcionClara } = analizarClaridad(rgba)
  return visibles > 0 && proporcionClara > umbral
}

/** Copia con cada píxel visible pintado del color dado; la transparencia se conserva. */
export function oscurecer(rgba, [r, g, b] = TINTAS.negro) {
  const out = new Uint8ClampedArray(rgba)
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
  }
  return out
}

/**
 * En el navegador: revisa un archivo de imagen (PNG, WebP o JPG).
 * @returns {Promise<{ clara: boolean, convertir: (tinta: 'negro'|'azul') => Promise<File> } | null>}
 *          null si no aplica (PDF, SVG o no se pudo leer).
 */
export async function revisarImagenSello(file) {
  if (!file || !/^image\/(png|webp|jpeg|jpg)$/.test(file.type)) return null
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0)
    const datos = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return {
      clara: esImagenClara(datos.data),
      convertir: async (tinta = 'negro') => {
        const pintada = new ImageData(oscurecer(datos.data, TINTAS[tinta] || TINTAS.negro), canvas.width, canvas.height)
        ctx.putImageData(pintada, 0, 0)
        const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'))
        const nombre = file.name.replace(/\.[^.]+$/, '') + '-oscura.png'
        return new File([blob], nombre, { type: 'image/png' })
      },
    }
  } catch {
    return null
  }
}
