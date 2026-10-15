/**
 * useAdjuntosPendientes — las capturas que la persona va a enviar con su mensaje:
 * se agregan desde el botón, pegando (Ctrl+V) o arrastrando; se validan (tipo, 5 MB, máx. 4)
 * y se muestran en miniatura antes de enviar.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { MAX_POR_MENSAJE, validarArchivos } from '@/utils/adjuntosSoporte.js'

export function useAdjuntosPendientes() {
  /** [{ id, archivo, vista }] */
  const pendientes = ref([])
  const aviso = ref('')
  let contador = 0

  const archivos = computed(() => pendientes.value.map((p) => p.archivo))
  const lleno = computed(() => pendientes.value.length >= MAX_POR_MENSAJE)

  function agregar(lista) {
    const { aceptados, rechazados } = validarArchivos(pendientes.value.length, Array.from(lista || []))
    for (const archivo of aceptados) {
      contador += 1
      pendientes.value.push({ id: `p${contador}`, archivo, vista: URL.createObjectURL(archivo) })
    }
    aviso.value = rechazados.length ? rechazados[0].motivo : ''
  }

  function quitar(id) {
    const i = pendientes.value.findIndex((p) => p.id === id)
    if (i < 0) return
    URL.revokeObjectURL(pendientes.value[i].vista)
    pendientes.value.splice(i, 1)
    aviso.value = ''
  }

  function limpiar() {
    pendientes.value.forEach((p) => URL.revokeObjectURL(p.vista))
    pendientes.value = []
    aviso.value = ''
  }

  /** Ctrl+V sobre el campo de texto: si trae imágenes, se adjuntan (el texto pegado sigue igual). */
  function alPegar(evento) {
    const items = Array.from(evento.clipboardData?.items || [])
    const imagenes = items.filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean)
    if (!imagenes.length) return
    evento.preventDefault()
    agregar(imagenes)
  }

  function alArrastrar(evento) {
    if (Array.from(evento.dataTransfer?.types || []).includes('Files')) evento.preventDefault()
  }

  function alSoltar(evento) {
    const files = Array.from(evento.dataTransfer?.files || [])
    if (!files.length) return
    evento.preventDefault()
    agregar(files)
  }

  onBeforeUnmount(limpiar)

  return { pendientes, archivos, aviso, lleno, agregar, quitar, limpiar, alPegar, alArrastrar, alSoltar }
}
