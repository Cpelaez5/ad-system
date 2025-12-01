/**
 * Client OCR Service - Extracción de facturas para clientes
 * 
 * Lógica específica para clientes:
 * - VENTA: Solo extrae datos del comprador (cliente en la factura)
 * - COMPRA/GASTO: Solo extrae datos del proveedor (emisor en la factura)
 * 
 * Usa temperatura 0.0 para máxima precisión en extracción de datos
 */

import BaseOCRService from './baseOcrService'

// Prompt optimizado para extracción según tipo de factura
const VENTA_EXTRACTION_PROMPT = `Analiza esta factura y extrae SOLO los datos del COMPRADOR/CLIENTE.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional, sin markdown, sin explicaciones.

Estructura requerida:
{
  "invoiceNumber": "número de factura completo",
  "issueDate": "fecha de emisión en formato YYYY-MM-DD",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "client": {
    "companyName": "nombre completo de la empresa COMPRADORA",
    "rif": "RIF del COMPRADOR en formato J-12345678-9",
    "address": "dirección completa del COMPRADOR",
    "phone": "teléfono del COMPRADOR o null",
    "email": "email del COMPRADOR o null"
  },
  "items": [
    {
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
  "notes": "observaciones o null"
}

Reglas:
- Si un campo no está presente, usa null
- Los números deben ser sin formato (sin puntos, comas, símbolos)
- Las fechas en formato YYYY-MM-DD
- El RIF debe incluir el prefijo (J-, V-, G-, etc.)
- Retorna SOLO el JSON`

const COMPRA_EXTRACTION_PROMPT = `Analiza esta factura y extrae SOLO los datos del EMISOR/PROVEEDOR.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional, sin markdown, sin explicaciones.

Estructura requerida:
{
  "invoiceNumber": "número de factura completo",
  "issueDate": "fecha de emisión en formato YYYY-MM-DD",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "issuer": {
    "companyName": "nombre completo de la empresa EMISORA/PROVEEDORA",
    "rif": "RIF del EMISOR en formato J-12345678-9",
    "address": "dirección completa del EMISOR",
    "phone": "teléfono del EMISOR o null",
    "email": "email del EMISOR o null"
  },
  "items": [
    {
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
  "notes": "observaciones o null"
}

Reglas:
- Si un campo no está presente, usa null
- Los números deben ser sin formato (sin puntos, comas, símbolos)
- Las fechas en formato YYYY-MM-DD
- El RIF debe incluir el prefijo (J-, V-, G-, etc.)
- Retorna SOLO el JSON`

const AUTO_DETECT_PROMPT = `Analiza esta factura y determina si es una factura de VENTA o de COMPRA basándote en los datos del usuario proporcionados.

Contexto del Usuario (quien sube la factura):
- Nombre Empresa: {companyName}
- RIF: {rif}

Reglas de Detección:
1. Si el EMISOR de la factura coincide con el Contexto del Usuario (Nombre o RIF) -> Es VENTA
2. Si el CLIENTE de la factura coincide con el Contexto del Usuario -> Es COMPRA
3. Si no coincide ninguno, asume COMPRA (gasto genérico)

Retorna SOLO un objeto JSON con esta estructura:
{
  "detectedFlow": "VENTA" o "COMPRA",
  "reasoning": "breve explicación",
  "data": {
    // Si es VENTA, extrae datos del CLIENTE/COMPRADOR
    // Si es COMPRA, extrae datos del EMISOR/PROVEEDOR
    "invoiceNumber": "...",
    "issueDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD",
    "party": { // Datos de la contraparte (Cliente en Venta, Emisor en Compra)
      "companyName": "...",
      "rif": "...",
      "address": "...",
      "phone": "...",
      "email": "..."
    },
    "items": [...],
    "subtotal": 0.0,
    "tax": 0.0,
    "total": 0.0,
    "currency": "VES"
  }
}
`

class ClientOCRService extends BaseOCRService {
  constructor() {
    super()
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
    this.apiUrl = 'https://api.deepseek.com/chat/completions'
  }

  /**
   * Extrae datos de factura según el tipo (VENTA o COMPRA/GASTO)
   * @param {File} file - Archivo PDF o imagen
   * @param {string|null} flowType - 'VENTA', 'COMPRA' o null (auto-detectar)
   * @param {Object} userContext - Datos del usuario para detección {companyName, rif}
   * @returns {Promise<Object>} Datos extraídos
   */
  async extractInvoiceData(file, flowType = null, userContext = null) {
    try {
      console.log(`📄 [Cliente] Procesando factura. Tipo: ${flowType || 'AUTO-DETECTAR'}`)

      // Procesar archivo y obtener texto
      const text = await this.processFile(file)

      let prompt = '';

      if (flowType) {
        // Flujo manual
        prompt = flowType === 'VENTA' ? VENTA_EXTRACTION_PROMPT : COMPRA_EXTRACTION_PROMPT;
      } else {
        // Auto-detección
        const contextStr = userContext
          ? `Nombre: ${userContext.companyName || 'N/A'}, RIF: ${userContext.rif || 'N/A'}`
          : 'No especificado';

        prompt = AUTO_DETECT_PROMPT
          .replace('{companyName}', userContext?.companyName || 'Desconocido')
          .replace('{rif}', userContext?.rif || 'Desconocido');
      }

      console.log('📝 Analizando texto con DeepSeek (temperatura 0.0)...')
      const response = await this.analyzeTextWithDeepSeek(text, prompt)

      const rawData = this.parseJSONResponse(response)

      // Normalizar respuesta si viene de auto-detección
      let data = rawData;
      if (!flowType && rawData.detectedFlow) {
        console.log(`🤖 Flujo detectado: ${rawData.detectedFlow} (${rawData.reasoning})`);

        // Reestructurar datos para coincidir con el formato esperado por el frontend
        data = {
          ...rawData.data,
          detectedFlow: rawData.detectedFlow,
          reasoning: rawData.reasoning
        };

        // Mapear 'party' al campo correcto
        if (rawData.detectedFlow === 'VENTA') {
          data.client = rawData.data.party;
        } else {
          data.issuer = rawData.data.party;
        }

        // Asignar flowType detectado para cálculo de confianza
        flowType = rawData.detectedFlow;
      }

      // Calcular confianza según tipo
      const requiredFields = flowType === 'VENTA'
        ? ['invoiceNumber', 'issueDate', 'client.companyName', 'client.rif', 'total']
        : ['invoiceNumber', 'issueDate', 'issuer.companyName', 'issuer.rif', 'total']

      data.confidence = this.calculateConfidence(data, requiredFields)
      data.flowType = flowType

      console.log(`✅ [Cliente] Extracción completada con confianza: ${Math.round(data.confidence * 100)}%`)

      return data

    } catch (error) {
      console.error('❌ [Cliente] Error en extracción:', error)
      throw new Error(`Error al extraer datos: ${error.message}`)
    }
  }

  /**
   * Analiza texto extraído usando DeepSeek
   * Usa temperatura 0.0 para máxima precisión (recomendado para Data Analysis)
   */
  async analyzeTextWithDeepSeek(text, prompt) {
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
              content: `${prompt}\n\nTEXTO DE LA FACTURA:\n${text}`
            }
          ],
          temperature: 0.0, // Máxima precisión para extracción de datos
          max_tokens: 2000
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
export default new ClientOCRService()


