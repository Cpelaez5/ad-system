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

// Prompt unificado y mejorado para extracción completa (con instrucciones precisas de formato)
const ENHANCED_EXTRACTION_PROMPT = `Analiza este documento comercial (imagen OCR) y extrae TODOS los datos disponibles con máxima precisión.

OBJETIVO PRINCIPAL:
1. IDENTIFICAR TIPO: Determina si es FACTURA (Fiscal, con Nro Control), NOTA DE ENTREGA/RECIBO (No Fiscal), o NOTA CRÉDITO/DÉBITO.
2. DETECTAR FLUJO: 
   - VENTA: El Usuario (Contexto) es el EMISOR/PROVEEDOR.
   - COMPRA: El Usuario es el CLIENTE y está adquiriendo insumos o productos puntuales.
   - GASTO: El Usuario es el CLIENTE y es un SERVICIO RECURRENTE (Luz, Agua, Internet, Condominio, Teléfono).
3. EXTRAER DATOS: Extrae cada campo posible, incluyendo montos desglosados, impuestos, y validando formatos numéricos.

Contexto del Usuario (quien sube el documento):
- Nombre: {companyName}
- RIF: {rif}

Estructura JSON Requerida (Retorna SOLO esto):
{
  "documentType": "FACTURA|NOTA DE CRÉDITO|NOTA DE DÉBITO|RECIBO|COMPROBANTE",
  "documentCategory": "FACTURA" (si es fiscal/legal) o "RECIBO" (si es nota entrega/interno),
  "detectedFlow": "VENTA|COMPRA|GASTO",
  "impression": "Breve análisis de si la imagen es legible y parece auténtica",

  "invoiceNumber": "Número EXACTO del documento. IMPORTANTE: Preserva ceros a la izquierda, guiones y letras. (Ej: '000045', 'F-12345', 'NE-001'). NO ELIMINES NADA.",
  "controlNumber": "Número de control (formato fiscal serie-número) o null",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD o null",
  
  "issuer": {
    "companyName": "Nombre/Razón Social del EMISOR",
    "rif": "RIF del EMISOR (ej: J-12345678-9)",
    "address": "Dirección fiscal del EMISOR o null",
    "phone": "Teléfono del EMISOR o null",
    "email": "Correo del EMISOR o null",
    "website": "Web del EMISOR o null"
  },
  
  "client": {
    "companyName": "Nombre/Razón Social del CLIENTE/RECEPTOR",
    "rif": "RIF del CLIENTE (ej: J-12345678-9) o null",
    "address": "Dirección del CLIENTE o null",
    "phone": "Teléfono del CLIENTE o null",
    "email": "Correo del CLIENTE o null"
  },
  
  "items": [
    {
      "description": "Descripción del item",
      "quantity": 1.0,
      "unitPrice": 0.00,
      "amount": 0.00
    }
  ],
  
  "financial": {
    "subtotal": 0.00,
    "exemptAmount": 0.00,
    "taxableAmount": 0.00,
    "taxRate": 16.00,
    "taxAmount": 0.00,
    "igtf": 0.00,
    "total": 0.00,
    "ivaRetention": 0.00,
    "islrRetention": 0.00
  },
  
  "currency": "VES|USD|EUR",
  "notes": "Observaciones adicionales o null"
}

REGLAS DE EXTRACCIÓN:
- Si el documento menciona "CONTROL N°" o "NRO CONTROL", es CASI SEGURO una FACTURA FISCAL.
- Si dice "NOTA DE ENTREGA" o no tiene control, suele ser RECIBO.
- IMPORTANTE NÚMEROS: Usa formato estándar JSON (punto para decimales). Ej: 1250.50. NO uses separadores de miles ni formato español con coma.
- MONEDA: Si el símbolo es "Bs", "Bolívares" o ambiguo, asume "VES". Solo usa "USD" o "EUR" si es explícito.
- Retorna SOLO el JSON válido.`;

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
      console.log(`📄 [Cliente] Procesando documento. Contexto:`, userContext);

      // Procesar archivo y obtener texto
      const text = await this.processFile(file)

      // Preparar el prompt con el contexto del usuario (para ayudar a detectar el flujo)
      const prompt = ENHANCED_EXTRACTION_PROMPT
        .replace('{companyName}', userContext?.companyName || 'Desconocido')
        .replace('{rif}', userContext?.rif || 'Desconocido');

      console.log('📝 Analizando texto con DeepSeek (temperatura 0.0)...')
      const response = await this.analyzeTextWithDeepSeek(text, prompt)

      const rawData = this.parseJSONResponse(response)
      console.log('🤖 Respuesta IA Cruda:', rawData);

      // El resultado ya viene estructurado según el prompt unificado
      let data = rawData;

      // Calcular confianza
      // Campos mínimos para considerar válida la extracción
      const requiredFields = ['invoiceNumber', 'issueDate', 'total', 'items'];
      if (data.detectedFlow === 'VENTA') requiredFields.push('client.companyName');
      else requiredFields.push('issuer.companyName');

      data.confidence = this.calculateConfidence(data, requiredFields)

      console.log(`✅ [Cliente] Extracción completada. Tipo: ${data.documentType}, Flujo: ${data.detectedFlow}, Confianza: ${Math.round(data.confidence * 100)}%`)

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
