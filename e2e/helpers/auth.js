import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Archivos de storageState generados una sola vez por global-setup.js (login
// real vía UI) y reutilizados por los specs con `test.use({ storageState })`.
// Viven en e2e/.auth/ (gitignored: contienen tokens de sesión).
export const CLIENTE_STORAGE = path.resolve(__dirname, '../.auth/cliente.json')
export const SUPERADMIN_STORAGE = path.resolve(__dirname, '../.auth/superadmin.json')
