import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLIENTE_STORAGE, SUPERADMIN_STORAGE } from './helpers/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '.env.e2e.local') })

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174'

/** Inicia sesión por la UI real (no hay atajo de API: la sesión de
 * Supabase + el perfil en `users` se validan en el router guard) y deja al
 * navegador en la pantalla de inicio del rol correspondiente.
 *
 * Reintenta varias veces: en este sandbox de pruebas, la conexión del
 * navegador al servidor local de Vite falla de forma transitoria con
 * ECONNREFUSED/ERR_NETWORK_ACCESS_DENIED (ver docs/mvp/auditorias/
 * e2e-2026-10-13.md — confirmado que no es un problema de la app ni del
 * propio servidor, que responde bien por `curl` durante toda la sesión).
 * Si falla, es el PRIMER paso de toda la suite (global-setup): sin un
 * reintento generoso aquí, una corrida entera se cae por una sola falla de
 * red transitoria. */
const MAX_LOGIN_ATTEMPTS = 6

async function login(page, usuario, password, attempt = 1) {
  try {
    await page.goto(`${BASE_URL}/login`, { timeout: 20_000 })
    await page.getByLabel('Usuario o Email').fill(usuario)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await page.waitForURL(/\/(cliente\/inicio|dashboard|admin\/inicio|cliente\/mi-area|welcome)/, { timeout: 20_000 })
  } catch (err) {
    if (attempt >= MAX_LOGIN_ATTEMPTS) throw err
    await page.waitForTimeout(2000 * attempt)
    await login(page, usuario, password, attempt + 1)
  }
}

// Una sesión guardada hace menos de 45 min sigue sirviendo (el token de Supabase dura 1 h y el
// cliente lo refresca solo). Reutilizarla evita depender de un login nuevo en cada corrida: en este
// equipo Windows las conexiones locales del navegador fallan a ratos (ver helpers/base.js).
const MAX_EDAD_SESION_MS = 45 * 60 * 1000
function sesionVigente(archivo) {
  try {
    return Date.now() - fs.statSync(archivo).mtimeMs < MAX_EDAD_SESION_MS
  } catch {
    return false
  }
}

export default async function globalSetup() {
  const clienteEmail = process.env.E2E_CLIENTE_EMAIL
  const clientePassword = process.env.E2E_CLIENTE_PASSWORD
  const adminEmail = process.env.E2E_SUPERADMIN_EMAIL
  const adminPassword = process.env.E2E_SUPERADMIN_PASSWORD

  if (!clienteEmail || !clientePassword || !adminEmail || !adminPassword) {
    throw new Error(
      'Faltan credenciales de prueba. Copia e2e/.env.e2e.example a e2e/.env.e2e.local y llena los 4 valores.'
    )
  }

  fs.mkdirSync(path.resolve(__dirname, '.auth'), { recursive: true })

  if (sesionVigente(CLIENTE_STORAGE) && sesionVigente(SUPERADMIN_STORAGE)) return

  const browser = await chromium.launch()

  try {
    const clienteContext = await browser.newContext()
    const clientePage = await clienteContext.newPage()
    await login(clientePage, clienteEmail, clientePassword)
    await clienteContext.storageState({ path: CLIENTE_STORAGE })
    await clienteContext.close()

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await login(adminPage, adminEmail, adminPassword)
    await adminContext.storageState({ path: SUPERADMIN_STORAGE })
    await adminContext.close()
  } finally {
    await browser.close()
  }
}
