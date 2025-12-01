/**
 * Admin OCR Service - Extracción completa de facturas para admin/contador
 * 
 * Extrae todos los datos de la factura sin restricciones:
 * - Datos del emisor
 * - Datos del cliente
 * - Items detallados
 * - Información financiera completa
 * 
 * Usa temperatura 0.0 para máxima precisión en extracción de datos
 */

import BaseOCRService from './baseOcrService'

// Prompt optimizado para extracción completa
const FULL_EXTRACTION_PROMPT = `Analiza esta factura y extrae TODOS los datos disponibles.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional, sin markdown, sin explicaciones.

Estructura requerida:
{
  "invoiceNumber": "número de factura completo",
  "controlNumber": "número de control o null",
  "issueDate": "fecha de emisión en formato YYYY-MM-DD",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "issuer": {
    "companyName": "nombre completo de la empresa EMISORA",
    "rif": "RIF del EMISOR en formato J-12345678-9",
    "address": "dirección completa del EMISOR",
    "phone": "teléfono del EMISOR o null",
    "email": "email del EMISOR o null"
  },
  "client": {
    "companyName": "nombre completo de la empresa CLIENTE",
    "rif": "RIF del CLIENTE en formato J-12345678-9",
    "address": "dirección completa del CLIENTE",
    "phone": "teléfono del CLIENTE o null",
    "email": "email del CLIENTE o null"
  },
  "items": [
    {
      "code": "código del producto o null",
      "description": "descripción del producto o servicio",
      "quantity": número,
      "unitPrice": número,
      "amount": número
    }
  ],
  "subtotal": número,
  "tax": número del impuesto,
  "taxRate": porcentaje del impuesto (ej: 16 para 16%),
  "total": número total,
  "currency": "VES" o "USD",
  "paymentMethod": "método de pago o null",
  "notes": "observaciones o null"
}

Reglas:
- Si un campo no está presente en la factura, usa null
- Los números deben ser sin formato (sin puntos, comas, símbolos)
- Las fechas deben estar en formato YYYY-MM-DD
- El RIF debe incluir el prefijo (J-, V-, G-, etc.)
- Si hay múltiples items, incluye todos en el array
- Extrae TODOS los datos disponibles, tanto del emisor como del cliente
- Retorna SOLO el JSON, nada más`

class AdminOCRService extends BaseOCRService {
    constructor() {
        super()
        this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
        this.apiUrl = 'https://api.deepseek.com/chat/completions'
    }

    /**
     * Extrae datos completos de una factura
     * @param {File} file - Archivo PDF o imagen
     * @returns {Promise<Object>} Datos extraídos completos
     */
    async extractInvoiceData(file) {
        try {
            console.log('📄 [Admin] Extrayendo factura completa:', file.name)

            // Procesar archivo y obtener texto
            const text = await this.processFile(file)

            console.log('📝 Analizando texto con DeepSeek (temperatura 0.0 para máxima precisión)...')
            const response = await this.analyzeTextWithDeepSeek(text)

            const data = this.parseJSONResponse(response)

            // Calcular confianza
            const requiredFields = [
                'invoiceNumber',
                'issueDate',
                'issuer.companyName',
                'issuer.rif',
                'client.companyName',
                'client.rif',
                'items',
                'total'
            ]

            data.confidence = this.calculateConfidence(data, requiredFields)

            console.log(`✅ [Admin] Extracción completada con confianza: ${Math.round(data.confidence * 100)}%`)

            return data

        } catch (error) {
            console.error('❌ [Admin] Error en extracción:', error)
            throw new Error(`Error al extraer datos: ${error.message}`)
        }
    }

    /**
     * Analiza texto extraído usando DeepSeek
     * Usa temperatura 0.0 para máxima precisión (recomendado para Data Analysis)
     */
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
                            content: `${FULL_EXTRACTION_PROMPT}\n\nTEXTO DE LA FACTURA:\n${text}`
                        }
                    ],
                    temperature: 0.0, // Máxima precisión para extracción de datos
                    max_tokens: 3000
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`API Error: ${error.error?.message || response.statusText}`)
            }

            const data = await response.json()
            return data.choices[0].message.content

        } catch (error) {
            console.error('Error en análisis de texto:', error)
            throw error
        }
    }
}

// Exportar instancia singleton
export default new AdminOCRService()
