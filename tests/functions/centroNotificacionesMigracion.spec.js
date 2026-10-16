// Comprobaciones estáticas de la migración del centro de notificaciones (no toca la base de datos).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261016110000_centro_notificaciones.sql'), 'utf8')
const sinComentarios = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')

describe('migración centro de notificaciones', () => {
  it('no crea ninguna llave foránea (rompería los embeds del login)', () => {
    expect(sinComentarios).not.toMatch(/\breferences\b/i)
    expect(sinComentarios).not.toMatch(/foreign\s+key/i)
  })
  it('solo soporte y papel_por_vencer quedan activos en el catálogo', () => {
    const activos = [...sinComentarios.matchAll(/\('([a-z_]+)',[^\n]*?, (true|false), (\d+)\)/g)]
      .filter((m) => m[2] === 'true').map((m) => m[1])
    expect(activos.sort()).toEqual(['papel_por_vencer', 'soporte_estado', 'soporte_mensaje_cliente', 'soporte_nueva', 'soporte_respuesta'])
  })
  it('notificar() es SECURITY DEFINER y no es ejecutable por usuarios', () => {
    expect(sinComentarios).toMatch(/function public\.notificar\([\s\S]*?security definer/)
    expect(sinComentarios).toMatch(/revoke all on function public\.notificar\(uuid\[\], text, text, text, text, jsonb, text\) from public, anon, authenticated/)
  })
  it('sin insert directo en notificaciones para usuarios', () => {
    expect(sinComentarios).not.toMatch(/on public\.notificaciones for insert/)
    expect(sinComentarios).toMatch(/grant update \(leida_en\) on public\.notificaciones to authenticated/)
  })
  it('los triggers de soporte no bloquean el original (exception handler)', () => {
    expect(sinComentarios.match(/exception when others then/g).length).toBeGreaterThanOrEqual(3)
  })
  it('reemplaza el push directo anterior', () => {
    expect(sinComentarios).toMatch(/drop function if exists public\.soporte_push_mensaje\(\)/)
  })
})
