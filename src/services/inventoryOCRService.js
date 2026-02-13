/**
 * Inventory OCR Service - Análisis de Listas de Inventario y Consumo
 * 
 * Especializado en extraer items y cantidades de:
 * - Listas manuscritas
 * - Fotos de estantes
 * - Notas de entrega / Tickets
 */

import BaseOCRService from './baseOcrService'

const INVENTORY_PROMPT = `Analiza la siguiente imagen o texto que representa una lista de productos, inventario o nota de consumo.
Extrae los items y sus cantidades en formato JSON estricto.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional.

Estructura requerida:
{
  "items": [
    {
      "name": "nombre descriptivo del producto",
      "quantity": número (puede ser decimal, ej: 1.5),
      "unit": "unidad detectada (ej: kg, und, lts, caja) o null",
      "code": "código del producto si es visible o null",
      "notes": "información adicional (marca, color, etc) o null"
    }
  ],
  "summary": "Breve resumen de lo detectado (ej: 'Lista de limpieza con 5 items')",
  "confidence": "Nivel de confianza 0-100"
}

Reglas de Extracción:
- Busca patrones como "2 Café", "Café x 2", "2.5kg Azucar".
- Si la cantidad no es explícita pero es un item de lista, asume 1.
- Ignora precios si aparecen, céntrate en CANTIDADES.
- Si hay tachaduras, ignora el item tachado.
- Convierte fracciones (1/2) a decimales (0.5).
`

class InventoryOCRService extends BaseOCRService {
    constructor() {
        super()
        this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions'
    }

    /**
     * Analiza una imagen de inventario/lista
     * @param {File} file 
     * @returns {Promise<Object>} Datos extraídos items: []
     */
    async analyzeImage(file) {
        try {
            console.log('📦 Iniciando análisis de inventario IA:', file.name)

            // 1. Validar y Pre-procesar
            this.validateFile(file)

            let imageFile = file
            // Si es PDF (poco probable para una foto de lista, pero posible)
            if (file.type === 'application/pdf') {
                imageFile = await this.convertPdfToImage(file)
            }

            // Comprimir
            const compressedImage = await this.compressImage(imageFile)
            const base64 = await this.fileToBase64(compressedImage)

            // 2. DeepSeek Vision
            try {
                console.log('🤖 Consultando modelo de visión...')
                const response = await this.callDeepSeekVision(base64)
                return this.parseResponse(response)

            } catch (visionError) {
                console.warn('⚠️ Falló visión, intentando OCR texto...', visionError)

                // Fallback OCR
                const text = await this.performLocalOCR(compressedImage)
                return await this.analyzeTextWithDeepSeek(text)
            }

        } catch (error) {
            console.error('❌ Error en análisis de inventario:', error)
            throw error
        }
    }

    async analyzeTextWithDeepSeek(text) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'user',
                            content: `Analiza este texto de una lista de inventario y extrae JSON.
                            
                            ${INVENTORY_PROMPT}
                            
                            TEXTO:
                            ${text.substring(0, 5000)}`
                        }
                    ],
                    temperature: 0.1
                })
            })

            if (!response.ok) throw new Error('API Error')
            const data = await response.json()
            return this.parseResponse(data.choices[0].message.content)

        } catch (error) {
            console.error('Error análisis texto:', error)
            throw error
        }
    }

    async callDeepSeekVision(imageBase64) {
        // Reutilizamos lógica de llamada, pero con prompt de inventario
        // Copiamos la lógica porque el prompt es distinto
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`
                                }
                            },
                            {
                                type: 'text',
                                text: INVENTORY_PROMPT
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            })
        })

        if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error?.message || 'API Error')
        }

        const data = await response.json()
        return data.choices[0].message.content
    }

    parseResponse(text) {
        try {
            let jsonStr = text.trim()
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('No JSON found')

            const data = JSON.parse(jsonMatch[0])
            if (!data.items) data.items = []

            return data
        } catch (e) {
            console.error('JSON Parse Error:', e)
            throw new Error('Formato inválido de IA')
        }
    }
}

export default new InventoryOCRService()
