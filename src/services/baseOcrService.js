/**
 * Base OCR Service - Funcionalidades compartidas
 * 
 * Proporciona utilidades comunes para OCR:
 * - Conversión de PDF a imagen
 * - Compresión de imágenes
 * - OCR con Tesseract
 * - Conversión a base64
 */

class BaseOCRService {
    constructor() {
        this.maxImageSize = 1024 // Max width/height en pixels
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
            const pdfjsLib = await import('pdfjs-dist')

            const workerUrl = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url
            ).href

            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            const page = await pdf.getPage(1)

            const viewport = page.getViewport({ scale: 2.0 })
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.width = viewport.width
            canvas.height = viewport.height

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise

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

                    const canvas = document.createElement('canvas')
                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0, width, height)

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
                const base64 = reader.result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    /**
     * Post-procesamiento de texto para corregir errores comunes de OCR
     */
    postProcessText(text) {
        if (!text) return '';

        // Mapa de correcciones comunes
        const corrections = {
            'Blso': 'Piso',
            'BIso': 'Piso',
            'Plso': 'Piso',
            'B1so': 'Piso',
            'P1so': 'Piso',
            'Av.': 'Avenida',
            'Edif.': 'Edificio',
            'Urb.': 'Urbanización'
        };

        let corrected = text;

        // Aplicar correcciones
        Object.entries(corrections).forEach(([error, fix]) => {
            // Reemplazo global insensible a mayúsculas/minúsculas para palabras completas o partes
            // Usamos una expresión regular simple
            corrected = corrected.replace(new RegExp(error, 'g'), fix);
        });

        return corrected;
    }

    /**
     * Realiza OCR local usando Tesseract.js
     */
    async performLocalOCR(imageFile) {
        const Tesseract = await import('tesseract.js')
        const worker = await Tesseract.createWorker('spa')

        const { data: { text } } = await worker.recognize(imageFile)
        await worker.terminate()

        return this.postProcessText(text)
    }

    /**
     * Procesa archivo: PDF → Imagen → Compresión → OCR
     */
    async processFile(file) {
        console.log('📄 Procesando archivo:', file.name)

        this.validateFile(file)

        let imageFile = file
        if (file.type === 'application/pdf') {
            console.log('📑 Convirtiendo PDF a imagen...')
            imageFile = await this.convertPdfToImage(file)
        }

        console.log('🗜️ Comprimiendo imagen...')
        const compressedImage = await this.compressImage(imageFile)

        console.log('👁️ Ejecutando OCR con Tesseract...')
        const text = await this.performLocalOCR(compressedImage)

        return text
    }

    /**
     * Calcula un score de confianza basado en campos completados
     */
    calculateConfidence(data, requiredFields) {
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

    /**
     * Parsea respuesta JSON de DeepSeek
     */
    parseJSONResponse(response) {
        try {
            let jsonStr = response.trim()

            // Remover bloques de código markdown
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')

            // Buscar el JSON
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('No se encontró JSON en la respuesta')
            }

            const data = JSON.parse(jsonMatch[0])

            // Normalizar moneda
            if (data.currency) {
                data.currency = data.currency.toUpperCase()
                if (data.currency === 'BS' || data.currency === 'BSF' || data.currency === 'BSS') {
                    data.currency = 'VES'
                }
            }

            data.extractedAt = new Date().toISOString()

            return data

        } catch (error) {
            console.error('Error parseando respuesta:', error)
            console.log('Respuesta original:', response)
            throw new Error('No se pudo parsear la respuesta de la API')
        }
    }
}

export default BaseOCRService
