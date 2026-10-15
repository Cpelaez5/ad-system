import { describe, it, expect, vi, beforeEach } from 'vitest'

const ai = vi.hoisted(() => ({ callAiGenerate: vi.fn() }))
vi.mock('@/services/ai/aiGenerateClient', () => ai)
vi.mock('@/services/ayudaService', () => ({ contextoAyudaParaChat: vi.fn(async () => '\n\nGUÍAS DE AYUDA DE AD SYSTEM:\nuna guía') }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }))

import chatService, { VIEW_CONTEXT_MAP } from '@/services/chatService'
import { MARCA_ESCALAR } from '@/utils/soporte.js'

describe('chatService (soporte)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ya no tiene mensajes predefinidos desactualizados', () => {
    expect(chatService.getQuickActions).toBeUndefined()
    expect(JSON.stringify(VIEW_CONTEXT_MAP)).not.toContain('predefinedResponse')
  })

  it('el mensaje de sistema lleva las guías y la instrucción de terminar con la marca cuando no sabe', async () => {
    ai.callAiGenerate.mockResolvedValue('ok')
    await chatService.sendMessage('hola', [], { routeName: 'ClienteInicio', routeTitle: 'Inicio' })
    const { system } = ai.callAiGenerate.mock.calls[0][0]
    expect(system).toContain('GUÍAS DE AYUDA DE AD SYSTEM')
    expect(system).toContain(MARCA_ESCALAR)
  })

  it('propaga el código SIN_CREDITOS para que la pantalla ofrezca guías y al equipo', async () => {
    ai.callAiGenerate.mockRejectedValue({ code: 'SIN_CREDITOS', message: 'x' })
    await expect(chatService.sendMessage('hola')).rejects.toMatchObject({ code: 'SIN_CREDITOS' })
  })

  it('un fallo cualquiera conserva el código y un mensaje amable', async () => {
    ai.callAiGenerate.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'x' })
    await expect(chatService.sendMessage('hola')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})
