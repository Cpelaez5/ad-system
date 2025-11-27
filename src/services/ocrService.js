/**
 * OCR Service - Extracción de datos de facturas
 * 
 * Estrategia Híbrida:
 * 1. Intenta usar DeepSeek Vision API directamente (si el modelo lo soporta)
 * 2. Si falla (ej. modelo no soporta imágenes), usa Tesseract.js para OCR local
 * 3. Envía el texto extraído a DeepSeek para análisis y estructuración JSON
 */

// Prompt optimizado para extracción de facturas
const INVOICE_EXTRACTION_PROMPT = `Analiza esta factura y extrae los siguientes datos en formato JSON estricto.

IMPORTANTE: Retorna SOLO el objeto JSON, sin texto adicional, sin markdown, sin explicaciones.

Estructura requerida:
{
  "invoiceNumber": "número de factura completo",
  "issueDate": "fecha de emisión en formato YYYY-MM-DD",
  "dueDate": "fecha de vencimiento en formato YYYY-MM-DD o null",
  "client": {
    "companyName": "nombre completo de la empresa cliente",
    "rif": "RIF del cliente en formato J-12345678-9 o similar",
    "address": "dirección completa del cliente",
    "phone": "teléfono del cliente o null",
    "email": "email del cliente o null"
  },
  "issuer": {
    "companyName": "nombre del emisor de la factura",
    "rif": "RIF del emisor"
  },
  "items": [
    {
      "description": "descripción del producto o servicio",
      "quantity": número (sin formato, solo el número),
      "unitPrice": número (sin formato, solo el número),
      "amount": número (sin formato, solo el número)
    }
  ],
  "subtotal": número (sin formato, solo el número),
  "tax": número del impuesto (sin formato, solo el número),
  "taxRate": porcentaje del impuesto como número (ej: 16 para 16%),
  "total": número total (sin formato, solo el número),
  "currency": "VES" o "USD" o "BS" (detectar de la factura),
  "notes": "observaciones o notas adicionales o null"
}

Reglas:
- Si un campo no está presente en la factura, usa null
- Los números deben ser sin formato (sin puntos, comas, símbolos)
- Las fechas deben estar en formato YYYY-MM-DD
- El RIF debe incluir el prefijo (J-, V-, G-, etc.)
- Si hay múltiples items, incluye todos en el array
- Retorna SOLO el JSON, nada más`

class OCRService {
    constructor() {
        this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions'
        this.maxImageSize = 1024 // Max width/height en pixels
    }

    /**
     * Extrae datos de una factura (PDF o imagen)
     * @param {File} file - Archivo PDF o imagen
     * @returns {Promise<Object>} Datos extraídos de la factura
     */
    async extractInvoiceData(file) {
        try {
            console.log('📄 Iniciando extracción de factura:', file.name)

            // Validar archivo
            this.validateFile(file)

            // Convertir a imagen si es PDF
            let imageFile = file
            if (file.type === 'application/pdf') {
                console.log('📑 Convirtiendo PDF a imagen...')
                imageFile = await this.convertPdfToImage(file)
            }

            // Comprimir imagen
            console.log('🗜️ Comprimiendo imagen...')
            const compressedImage = await this.compressImage(imageFile)

            // Convertir a base64
            const base64Image = await this.fileToBase64(compressedImage)

            try {
                // Intentar primero con DeepSeek Vision
                console.log('🤖 Intentando DeepSeek Vision API...')
                const response = await this.callDeepSeekVision(base64Image)
                console.log('✅ DeepSeek Vision respondió correctamente')
                return this.parseInvoiceResponse(response)
            } catch (apiError) {
                console.warn('⚠️ DeepSeek Vision falló, intentando fallback con Tesseract:', apiError.message)

                // Fallback: Tesseract OCR + DeepSeek Text Analysis
                console.log('👁️ Ejecutando OCR local con Tesseract...')
                const text = await this.performLocalOCR(compressedImage)

                console.log('📝 Texto extraído, analizando con DeepSeek...')
                const analysisResponse = await this.analyzeTextWithDeepSeek(text)

                return this.parseInvoiceResponse(analysisResponse)
            }

        } catch (error) {
            console.error('❌ Error en extracción:', error)
            throw new Error(`Error al extraer datos: ${error.message}`)
        }
    }

    /**
     * Realiza OCR local usando Tesseract.js
     */
    async performLocalOCR(imageFile) {
        const Tesseract = await import('tesseract.js')
        const worker = await Tesseract.createWorker('spa')

        const { data: { text } } = await worker.recognize(imageFile)
        await worker.terminate()

        return text
    }

    /**
     * Analiza texto extraído usando DeepSeek (solo texto)
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
                            content: `Analiza el siguiente texto extraído de una factura y extrae los datos en JSON:
                            
                            ${INVOICE_EXTRACTION_PROMPT}
                            
                            TEXTO DE LA FACTURA:
                            ${text}`
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

    /**
     * Valida que el archivo sea del tipo correcto
     */
    validateFile(file) {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
        const maxSize = 10 * 1024 * 1024 // 10MB

        if (!validTypes.includes(file.type)) {
            throw new Error('Tipo de archivo no válido. Use PDF, JPG o PNG.')
        }

        if (file.size > maxSize) {
            throw new Error('El archivo es demasiado grande. Máximo 10MB.')
        }
    }

    /**
     * Convierte PDF a imagen usando PDF.js
     */
    async convertPdfToImage(file) {
        try {
            // Importar PDF.js y worker
            const pdfjsLib = await import('pdfjs-dist')

            // En Vite, necesitamos importar el worker explícitamente para obtener su URL
            const workerUrl = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url
            ).href

            // Configurar worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

            // Leer archivo como ArrayBuffer
            const arrayBuffer = await file.arrayBuffer()

            // Cargar PDF
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

            // Obtener primera página
            const page = await pdf.getPage(1)

            // Configurar canvas
            const viewport = page.getViewport({ scale: 2.0 })
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.width = viewport.width
            canvas.height = viewport.height

            // Renderizar página
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise

            // Convertir canvas a blob
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(new File([blob], 'converted.jpg', { type: 'image/jpeg' }))
                }, 'image/jpeg', 0.9)
            })

        } catch (error) {
            console.error('Error convirtiendo PDF:', error)
            throw new Error('No se pudo convertir el PDF a imagen')
        }
    }

    /**
     * Comprime imagen para reducir tamaño
     */
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                const img = new Image()

                img.onload = () => {
                    // Calcular nuevo tamaño manteniendo aspect ratio
                    let width = img.width
                    let height = img.height

                    if (width > this.maxImageSize || height > this.maxImageSize) {
                        if (width > height) {
                            height = (height / width) * this.maxImageSize
                            width = this.maxImageSize
                        } else {
                            width = (width / height) * this.maxImageSize
                            height = this.maxImageSize
                        }
                    }

                    // Crear canvas y comprimir
                    const canvas = document.createElement('canvas')
                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0, width, height)

                    // Convertir a blob
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
                    }, 'image/jpeg', 0.85)
                }

                img.onerror = reject
                img.src = e.target.result
            }

            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    /**
     * Convierte archivo a base64
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                // Remover el prefijo "data:image/jpeg;base64,"
                const base64 = reader.result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    /**
     * Llama a DeepSeek Vision API
     */
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
                                    text: INVOICE_EXTRACTION_PROMPT
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
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
            console.error('Error llamando a DeepSeek API:', error)
            throw error
        }
    }

    /**
     * Parsea la respuesta de DeepSeek y extrae el JSON
     */
    parseInvoiceResponse(response) {
        try {
            // Limpiar respuesta (remover markdown, espacios, etc.)
            let jsonStr = response.trim()

            // Remover bloques de código markdown si existen
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')

            // Buscar el JSON en la respuesta
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('No se encontró JSON en la respuesta')
            }

            // Parsear JSON
            const data = JSON.parse(jsonMatch[0])

            // Validar estructura básica
            if (!data.invoiceNumber && !data.total) {
                throw new Error('Respuesta JSON no contiene datos válidos de factura')
            }

            // Normalizar moneda
            if (data.currency) {
                data.currency = data.currency.toUpperCase()
                if (data.currency === 'BS' || data.currency === 'BSF' || data.currency === 'BSS') {
                    data.currency = 'VES'
                }
            }

            // Agregar metadata
            data.extractedAt = new Date().toISOString()
            data.confidence = this.calculateConfidence(data)

            return data

        } catch (error) {
            console.error('Error parseando respuesta:', error)
            console.log('Respuesta original:', response)
            throw new Error('No se pudo parsear la respuesta de la API')
        }
    }

    /**
     * Calcula un score de confianza basado en campos completados
     */
    calculateConfidence(data) {
        const requiredFields = [
            'invoiceNumber',
            'issueDate',
            'client.companyName',
            'client.rif',
            'items',
            'total'
        ]

        let score = 0
        const total = requiredFields.length

        requiredFields.forEach(field => {
            const value = field.includes('.')
                ? field.split('.').reduce((obj, key) => obj?.[key], data)
                : data[field]

            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value) && value.length > 0) {
                    score++
                } else if (!Array.isArray(value)) {
                    score++
                }
            }
        })

        return Math.round((score / total) * 100) / 100 // 0-1
    }
}

// Exportar instancia singleton
export default new OCRService()
