import { describe, it, expect } from 'vitest'
import { resolveProfileRedirect } from '@/router/profileRedirect'

function createMemoryStorage(initial = {}) {
  let store = { ...initial }
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] }
  }
}

describe('resolveProfileRedirect', () => {
  it('redirige a /cliente/mi-area cuando el usuario cacheado es rol cliente', () => {
    const storage = createMemoryStorage({
      currentUser: JSON.stringify({ id: '1', role: 'cliente' })
    })
    expect(resolveProfileRedirect(storage)).toEqual({ path: '/cliente/mi-area' })
  })

  it('redirige a /settings para cualquier otro rol (admin, contador, super_admin)', () => {
    for (const role of ['admin', 'contador', 'super_admin']) {
      const storage = createMemoryStorage({
        currentUser: JSON.stringify({ id: '1', role })
      })
      expect(resolveProfileRedirect(storage)).toEqual({ path: '/settings' })
    }
  })

  it('cae a /settings si no hay usuario cacheado o el JSON es inválido', () => {
    expect(resolveProfileRedirect(createMemoryStorage())).toEqual({ path: '/settings' })
    expect(resolveProfileRedirect(createMemoryStorage({ currentUser: '{invalido' }))).toEqual({ path: '/settings' })
    expect(resolveProfileRedirect(null)).toEqual({ path: '/settings' })
  })
})
