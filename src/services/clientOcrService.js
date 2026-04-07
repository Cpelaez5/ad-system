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

// Prompt optimizado para extracción precisa de documentos comerciales
const ENHANCED_EXTRACTION_PROMPT = `Analiza este documento comercial y extrae TODOS los datos con MÁXIMA PRECISIÓN.

═══════════════════════════════════════════════════════════════
CONTEXTO DEL USUARIO (quien sube el documento)
═══════════════════════════════════════════════════════════════
- Nombre de SU empresa: {companyName}
- RIF de SU empresa: {rif}

═══════════════════════════════════════════════════════════════
PASO 1: IDENTIFICAR QUIÉN ES QUIÉN
═══════════════════════════════════════════════════════════════
En el documento encontrarás DOS partes:
- EMISOR: Quien EMITE/GENERA el documento (proveedor, vendedor)
- CLIENTE/RECEPTOR: Quien RECIBE el documento (comprador, pagador)

Compara el Nombre/RIF del EMISOR y del CLIENTE con el contexto del usuario:
- Si el Nombre/RIF del usuario coincide con el EMISOR → El usuario VENDIÓ (es VENTA)
- Si el Nombre/RIF del usuario coincide con el CLIENTE → El usuario COMPRÓ (es COMPRA o GASTO)
- Si no hay coincidencia clara → Usa heurísticas:
  * Si el documento parece una factura de venta de un tercero → COMPRA
  * Si el usuario aparece como vendedor → VENTA

═══════════════════════════════════════════════════════════════
PASO 2: DETERMINAR EL FLUJO
═══════════════════════════════════════════════════════════════
- VENTA: El usuario EMITE el documento (es el proveedor/vendedor).
  La contraparte es el CLIENTE que aparece en el documento.

- COMPRA: El usuario RECIBE el documento de un proveedor por BIENES TANGIBLES.
  (mercancía, inventario, equipos, materiales, productos para reventa)
  La contraparte es el EMISOR del documento.

- GASTO: El usuario RECIBE el documento por SERVICIOS o INTANGIBLES.
  (luz, agua, alquiler, honorarios, servicios, suscripciones)
  La contraparte es el EMISOR del documento.

═══════════════════════════════════════════════════════════════
PASO 3: IDENTIFICAR TIPO DE DOCUMENTO
═══════════════════════════════════════════════════════════════
- FACTURA: Documento fiscal con "Nro. Control", "NCF", o similar
- NOTA DE ENTREGA/RECIBO: Documento simple sin control fiscal
- NOTA DE CRÉDITO: Documento de ajuste/devolución
- NOTA DE DÉBITO: Documento de cargo adicional

═══════════════════════════════════════════════════════════════
ESTRUCTURA JSON REQUERIDA (Retorna SOLO esto)
═══════════════════════════════════════════════════════════════
{
  "documentType": "FACTURA|NOTA DE CRÉDITO|NOTA DE DÉBITO|RECIBO",
  "documentCategory": "FACTURA" (si tiene Nro. Control fiscal) o "RECIBO" (si es documento simple),
  "detectedFlow": "VENTA|COMPRA|GASTO",
  "flowConfidence": "alta|media|baja",
  "flowReason": "Explicación breve de por qué se determinó este flujo",

  "invoiceNumber": "Número EXACTO del documento (preserva ceros, guiones, letras)",
  "controlNumber": "Número de control fiscal o null",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD o null",

  "issuer": {
    "companyName": "Nombre completo del EMISOR (quien genera el documento)",
    "rif": "RIF del EMISOR (con formato: J-12345678-9)",
    "address": "Dirección del EMISOR o null",
    "phone": "Teléfono del EMISOR o null",
    "email": "Correo del EMISOR o null"
  },

  "client": {
    "companyName": "Nombre completo del CLIENTE/RECEPTOR (quien recibe el documento)",
    "rif": "RIF del CLIENTE o null",
    "address": "Dirección del CLIENTE o null",
    "phone": "Teléfono del CLIENTE o null",
    "email": "Correo del CLIENTE o null"
  },

  "items": [
    {
      "code": "Código/SKU del producto si aparece, o null",
      "description": "Descripción completa del producto o servicio",
      "quantity": 1.0,
      "unitPrice": 0.00,
      "unit": "Und|Kg|Lts|Mts o null",
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
    "total": 0.00
  },

  "currency": "VES|USD|EUR",
  "notes": "Observaciones o null"
}

═══════════════════════════════════════════════════════════════
REGLAS CRÍTICAS DE EXTRACCIÓN
═══════════════════════════════════════════════════════════════
1. NÚMEROS: Usa formato JSON estándar (punto decimal, sin separador de miles).
   Ejemplo: "1,250.50" → 1250.50   |   "Bs. 35.000,00" → 35000.00

2. MONEDA:
   - "Bs", "Bolívares", "Bs.S" → "VES"
   - "USD", "$", "Dólares" → "USD"
   - Si es ambiguo → "VES"

3. PRODUCTOS:
   - Extrae TODOS los productos que aparezcan
   - Si hay código/SKU visible, inclúyelo en "code"
   - "amount" = cantidad × precio unitario

4. FLUJO:
   - Compara Nombre/RIF del contexto con EMISOR y CLIENTE del documento
   - Si el usuario es el EMISOR → VENTA
   - Si el usuario es el CLIENTE → COMPRA o GASTO
   - Si hay productos tangibles en una compra → COMPRA
   - Si son servicios (electricidad, alquiler, etc.) → GASTO

5. DOCUMENTO:
   - "FACTURA" si tiene Nro. Control fiscal
   - "RECIBO" si es nota de entrega o documento simple

Retorna SOLO el JSON válido, sin explicaciones adicionales.`;

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
