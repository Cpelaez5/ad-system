/**
 * Admin OCR Service - Extracción completa de facturas para admin/contador
 * 
 * Extrae todos los datos de la factura sin restricciones:
 * - Datos del emisor
 * - Datos del cliente
 * - Items detallados
 * - Información financiera completa
 * 
 * El análisis se delega a la Edge Function `ai-chat`; la temperatura y el
 * proveedor activo se configuran en el servidor (`ai_provider_profiles`).
 */

import BaseOCRService from './baseOcrService'
import { callAiGenerate } from './ai/aiGenerateClient'

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

            console.log('📝 Analizando texto con la IA (ai-chat, máxima precisión)...')
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
     * Analiza texto extraído usando la IA (Edge Function `ai-chat`).
     * Nota: se conserva el nombre `analyzeTextWithDeepSeek` por compatibilidad
     * con tests y llamadores; el proveedor real lo decide el servidor.
     */
    async analyzeTextWithDeepSeek(text) {
        try {
            const prompt = `${FULL_EXTRACTION_PROMPT}\n\nTEXTO DE LA FACTURA:\n${text}`
            return await callAiGenerate({ prompt, responseFormat: 'json' })

        } catch (error) {
            console.error('Error en análisis de texto:', error)
            throw error
        }
    }
}

// Exportar instancia singleton
export default new AdminOCRService()
