import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../logger'

describe('logger utility', () => {
  let consoleDebugSpy, consoleInfoSpy, consoleWarnSpy, consoleErrorSpy

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('debug and info log when import.meta.env.DEV is true', () => {
    vi.stubEnv('DEV', true)
    
    logger.debug('[Test]', 'debug message')
    expect(consoleDebugSpy).toHaveBeenCalledWith('[Test]', 'debug message')

    logger.info('[Test]', 'info message')
    expect(consoleInfoSpy).toHaveBeenCalledWith('[Test]', 'info message')
  })

  it('debug and info do NOT log when import.meta.env.DEV is false', () => {
    vi.stubEnv('DEV', false)
    
    logger.debug('[Test]', 'debug message')
    expect(consoleDebugSpy).not.toHaveBeenCalled()

    logger.info('[Test]', 'info message')
    expect(consoleInfoSpy).not.toHaveBeenCalled()
  })

  it('warn and error log regardless of import.meta.env.DEV being false', () => {
    vi.stubEnv('DEV', false)

    logger.warn('[Test]', 'warn message')
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Test]', 'warn message')

    logger.error('[Test]', 'error message')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Test]', 'error message')
  })

  it('warn and error log regardless of import.meta.env.DEV being true', () => {
    vi.stubEnv('DEV', true)

    logger.warn('[Test]', 'warn message')
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Test]', 'warn message')

    logger.error('[Test]', 'error message')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Test]', 'error message')
  })
})
