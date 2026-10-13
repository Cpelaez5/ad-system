import { describe, it, expect, beforeEach } from 'vitest'
import {
  isChunkLoadError,
  hasPendingChunkReload,
  markChunkReloadPending,
  clearChunkReloadFlag
} from '@/utils/chunkReloadGuard'

function createMemoryStorage() {
  let store = {}
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] }
  }
}

describe('chunkReloadGuard - isChunkLoadError', () => {
  it('detecta los mensajes de error de carga de chunk soportados', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true)
    expect(isChunkLoadError('error loading dynamically imported module')).toBe(true)
  })

  it('no confunde otros errores de navegación o de red con errores de chunk', () => {
    expect(isChunkLoadError(new Error('Network Error'))).toBe(false)
    expect(isChunkLoadError(new Error('No autorizado'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
    expect(isChunkLoadError(new Error(''))).toBe(false)
  })
})

describe('chunkReloadGuard - marca de recarga única', () => {
  let storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('no hay recarga pendiente por defecto', () => {
    expect(hasPendingChunkReload(storage)).toBe(false)
  })

  it('markChunkReloadPending deja la marca activa para la próxima verificación', () => {
    markChunkReloadPending(storage)
    expect(hasPendingChunkReload(storage)).toBe(true)
  })

  it('clearChunkReloadFlag limpia la marca (navegación terminada bien)', () => {
    markChunkReloadPending(storage)
    clearChunkReloadFlag(storage)
    expect(hasPendingChunkReload(storage)).toBe(false)
  })

  it('no revienta si el storage no está disponible', () => {
    expect(() => markChunkReloadPending(null)).not.toThrow()
    expect(() => clearChunkReloadFlag(null)).not.toThrow()
    expect(hasPendingChunkReload(null)).toBe(false)
  })
})
