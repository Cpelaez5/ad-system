/**
 * Fiscal OCR Service - Análisis de Documentos Legales y Fiscales
 * 
 * Especializado en clasificar y extraer datos de documentos venezolanos:
 * - RIF, Patentes, Solvencias, Declaraciones ISLR/IVA
 * - Detecta fechas de emisión y vencimiento
 * - Clasifica en categorías (LEGAL, MUNICIPAL, SENIAT, NOMINA)
 */

import BaseOCRService from './baseOcrService'

const FISCAL_PROMPT = `Analiza el siguiente documento legal/fiscal venezolano y extrae los datos en formato JSON estricto.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional.

Estructura requerida:
{
  "docName": "Nombre estandarizado del documento (ver lista abajo)",
  "category": "Una de estas: LEGAL, MUNICIPAL, SENIAT, NOMINA, OTROS",
  "entity": "Entidad emisora (ej: SENIAT, Alcaldía de Chacao, IVSS, Banavih)",
  "emissionDate": "Fecha de emisión en formato YYYY-MM-DD o null (BUSCAR: 'Fecha de emisión', 'Fecha', 'Emitido el', 'Última actualización', 'Fecha de expedición')",
  "expirationDate": "Fecha de vencimiento en formato YYYY-MM-DD o null (BUSCAR: 'Válido hasta', 'Vence', 'Vigencia hasta', 'Fecha de vencimiento')",
  "number": "Número de certificado, licencia, planilla o documento si es visible",
  "notes": "Información clave del documento (RIF, montos, período fiscal, contribuyente, etc.)",
  "confidence": "Nivel de confianza 0-100 en la clasificación"
}

IMPORTANTE - EXTRACCIÓN DE FECHAS:
- SIEMPRE busca fechas en el documento, aunque tengan formatos diferentes (DD/MM/YYYY, DD-MM-YYYY, etc.)
- CONVIERTE las fechas al formato YYYY-MM-DD (ej: "22/03/2025" → "2025-03-22")
- Si encuentras "Última actualización" o "Fecha de expedición", úsala como emissionDate
- Para RIF: La fecha de "Última actualización" es la fecha de emisión

LISTA DE DOCUMENTOS CONOCIDOS:
- LEGAL: Acta Constitutiva, RIF, Publicación Mercantil, Acta de Asamblea.
- MUNICIPAL: Conformidad de Uso, Conformidad de Bomberos, Permiso Sanitario, Publicidad y Propaganda, Solvencia de Inmueble, Contrato Arrendamiento, Licencia Actividad Económica, Declaración Ingresos Brutos, Declaración Retención Municipal.
- SENIAT: Declaración IVA, Declaración Retención ISLR, Declaración ISLR Anual, Declaración Estimada ISLR, Declaración de Pensiones, Declaración Retención IVA, Anticipo ISLR, IGTF, Impuesto Grandes Patrimonios.
- NOMINA: Solvencia IVSS, Solvencia INCES, Solvencia BANAVIH, Solvencia MINTRAPP, RUPDAE, FONACIT.

Reglas adicionales:
- Si no hay fecha de vencimiento explícita pero dice "Válido por un año", calcula 1 año desde emisión.
- Para declaraciones (IVA/ISLR), expirationDate puede ser null.
- Incluye RIF, montos y períodos importantes en "notes".
`

class FiscalOCRService extends BaseOCRService {
    constructor() {
        super()
        this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions'
    }

    /**
     * Analiza un documento fiscal
     * Estrategia: OCR local (Tesseract) + Análisis de texto con DeepSeek
     * Nota: DeepSeek deepseek-chat NO soporta contenido multimodal (image_url),
     * por lo que usamos directamente el flujo de OCR + análisis de texto.
     * 
     * @param {File} file 
     * @returns {Promise<Object>} Datos extraídos
     */
    async analyzeDocument(file) {
        try {
            console.log('🕵️‍♂️ Iniciando análisis fiscal IA:', file.name)

            // 1. Pre-procesamiento (Validar, Convertir PDF->Img, Comprimir)
            this.validateFile(file)

            let imageFile = file
            if (file.type === 'application/pdf') {
                // Intentar primero extracción directa de texto del PDF
                console.log('📑 Intentando extracción directa de texto del PDF...')
                const directText = await this.extractTextFromPdf(file)
                
                if (directText && directText.length > 100) {
                    // PDF digital con texto suficiente — analizar directamente
                    console.log('✨ Texto extraído digitalmente del PDF (sin OCR). Longitud:', directText.length)
                    console.log('🧠 Analizando texto con IA...')
                    const response = await this.analyzeTextWithDeepSeek(directText)
                    const data = this.parseResponse(response)
                    console.log('✅ Análisis fiscal completado (PDF digital):', data)
                    return data
                }

                // PDF escaneado — convertir a imagen para OCR
                console.log('📑 PDF escaneado detectado, convirtiendo a imagen...')
                imageFile = await this.convertPdfToImage(file)
            }

            // 2. Comprimir imagen
            console.log('🗜️ Optimizando imagen...')
            const compressedImage = await this.compressImage(imageFile)

            // 3. OCR Local con Tesseract
            console.log('👁️ Ejecutando OCR local con Tesseract...')
            const text = await this.performLocalOCR(compressedImage)
            console.log('📝 Texto extraído (longitud):', text.length)

            if (!text || text.trim().length < 20) {
                throw new Error('No se pudo extraer texto suficiente del documento. Intente con una imagen más nítida.')
            }

            // 4. Análisis de Texto con DeepSeek
            console.log('🧠 Analizando texto extraído con IA...')
            const response = await this.analyzeTextWithDeepSeek(text)

            const data = this.parseResponse(response)
            console.log('✅ Análisis fiscal completado:', data)
            return data

        } catch (error) {
            console.error('❌ Error en análisis fiscal:', error)
            throw error // Re-lanzar para manejo en UI
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
                            content: `Analiza el siguiente texto extraído de un documento legal/fiscal y extrae los datos en JSON.
                            
                            ${FISCAL_PROMPT}
                            
                            TEXTO EXTRAÍDO:
                            ${text.substring(0, 15000)}` // Limitar caracteres para no exceder tokens
                        }
                    ],
                    temperature: 0.1
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

    async callDeepSeekVision(imageBase64) {
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
                            content: [
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/jpeg;base64,${imageBase64}`
                                    }
                                },
                                {
                                    type: 'text',
                                    text: FISCAL_PROMPT
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1000
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(`API Error: ${error.error?.message || response.statusText}`)
            }

            const data = await response.json()
            return data.choices[0].message.content

        } catch (error) {
            console.warn('Error llamando a Vision API:', error.message)
            throw error
        }
    }

    parseResponse(text) {
        try {
            let jsonStr = text.trim()
            // Limpiar markdown
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')

            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('No se encontró JSON en respuesta')

            const data = JSON.parse(jsonMatch[0])

            // Normalizar fechas vacías
            if (data.expirationDate === 'null') data.expirationDate = null
            if (data.emissionDate === 'null') data.emissionDate = null

            return data
        } catch (error) {
            console.error('Error parseando JSON:', error)
            throw new Error('La IA no devolvió un formato válido')
        }
    }
}

export default new FiscalOCRService()
