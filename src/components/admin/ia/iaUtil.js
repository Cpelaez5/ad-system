/**
 * Utilidades puras de Configuración IA: enmascarar la llave, nombre del
 * proveedor, estado de conexión del perfil activo y validación del formulario.
 */

/** Nunca se muestra la llave completa: solo "••••1234" con sus últimos 4. */
export function llaveEnmascarada(sufijo) {
  return sufijo ? `••••${String(sufijo).slice(-4)}` : '••••'
}

/** Últimos 4 caracteres de una llave recién escrita ('0000' si no hay). */
export function sufijoDeLlave(llave) {
  return llave ? llave.substring(llave.length - 4) : '0000'
}

const NOMBRES = { gemini: 'Google Gemini', deepseek: 'DeepSeek' }
export function nombreProveedor(clave) {
  return NOMBRES[clave] || clave
}

export const PROVEEDORES = [
  { title: 'Google Gemini', value: 'gemini' },
  { title: 'DeepSeek', value: 'deepseek' },
]

const ESTADOS = {
  connected: { icono: 'mdi-check-circle-outline', color: 'success', texto: 'Funcionando bien' },
  invalid_key: { icono: 'mdi-close-circle-outline', color: 'error', texto: 'La llave fue rechazada' },
  quota_exceeded: { icono: 'mdi-alert-circle-outline', color: 'warning', texto: 'Se alcanzó el límite de uso' },
}
export function estadoConexion(clave) {
  return ESTADOS[clave] || { icono: 'mdi-help-circle-outline', color: 'grey', texto: 'Estado desconocido' }
}

/** Deduce el estado del perfil activo a partir del último registro de uso. */
export function deducirEstado(logs, activo) {
  if (!logs.length || !activo) return null
  const ultimo = logs[0]
  if (ultimo.provider !== activo.provider || ultimo.model !== activo.model) return 'connected'
  if (ultimo.status === 'success') return 'connected'
  if (ultimo.error_code === 'INVALID_KEY') return 'invalid_key'
  if (ultimo.error_code === 'QUOTA_EXCEEDED' || ultimo.error_code === 'PREVIEW_RATE_LIMIT') return 'quota_exceeded'
  return null
}

export function formularioValido(f) {
  return !!(f.profileName?.trim() && f.model?.trim() && (f.id || f.apiKey?.trim()))
}
