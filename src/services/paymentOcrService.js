/**
 * Payment OCR Service - Extracción de datos de comprobantes de pago
 * 
 * Extiende BaseOCRService para analizar capturas de pantalla o
 * PDFs de comprobantes de pago y extraer datos automáticamente.
 * 
 * Campos que intenta extraer:
 * - reference: Número de referencia del pago
 * - amount: Monto del pago
 * - date: Fecha del pago
 * - senderPhone: Teléfono del emisor (Pago Móvil)
 * - senderDocument: Documento del emisor
 * - senderBank: Banco del emisor
 */

import BaseOCRService from './baseOcrService';
import ocrService from './ocrService';

// Prompt especializado para comprobantes de pago
// Prompts especializados por tipo de pago
const PAYMENT_PROMPTS = {
    // 1. PAGO MÓVIL
    mobile_payment: `Analiza este COMPROBANTE DE PAGO MÓVIL (Venezuela) y extrae los datos.
    
    CONTEXTO: Buscamos validar un pago móvil interbancario.
    
    Estructura JSON Requerida (Si no encuentras un dato, usa null):
    {
      "type": "PAGO_MOVIL",
      "reference": "Número de referencia completo (ej: 12345678, 001234). Prioridad ALTA.",
      "amount": 0.00,
      "currency": "VES",
      "date": "YYYY-MM-DD",
      "sender": {
        "phone": "Teléfono del emisor (ej: 0412-1234567). Busca 'Teléfono', 'Celular', 'Móvil'.",
        "document": "Cédula o RIF del emisor (ej: V12345678). Busca 'Cédula', 'ID', 'Documento'.",
        "bank": "Banco emisor (ej: Banesco, Venezuela, Mercantil). A veces está en el logo o encabezado.",
        "name": "Nombre del emisor."
      },
      "receiver": {
        "phone": "Teléfono receptor",
        "document": "Documento receptor",
        "bank": "Banco receptor"
      },
      "status": "EXITOSO|PENDIENTE|FALLIDO"
    }

    REGLAS:
    - Referencia: A veces llamada 'Ref', 'Secuencia', 'Nro Operación'.
    - Monto: Formato numérico (ej: 1250.50). Ignora 'Bs'.
    - Si no encuentras un campo, devuélvelo como null. NO INVENTES DATOS.`,

    // 2. TRANSFERENCIA BANCARIA
    bank_transfer: `Analiza este COMPROBANTE DE TRANSFERENCIA BANCARIA y extrae los datos.
    
    CONTEXTO: Transferencia entre bancos nacionales.
    
    Estructura JSON Requerida (Si no encuentras un dato, usa null):
    {
      "type": "TRANSFERENCIA",
      "reference": "Número de referencia/operación.",
      "amount": 0.00,
      "currency": "VES",
      "date": "YYYY-MM-DD",
      "sender": {
        "bank": "Banco emisor (ej: Provincial, BNC).",
        "name": "Nombre del titular.",
        "account_last_digits": "Últimos dígitos de cuenta origen (si visibles)."
      },
      "receiver": {
        "bank": "Banco receptor.",
        "name": "Nombre receptor.",
        "document": "Documento receptor."
      },
      "status": "EXITOSO|PENDIENTE"
    }
    
    REGLAS:
    - Referencia es crítica.
    - Si no encuentras un dato, usa null.`,

    // 3. ZELLE
    zelle: `Analiza este COMPROBANTE DE ZELLE y extrae los datos.
    
    CONTEXTO: Pago en dólares vía Zelle.
    
    Estructura JSON Requerida (Si no encuentras un dato, usa null):
    {
      "type": "ZELLE",
      "reference": "Número de confirmación o ID de referencia (ej: 'ppw...', numérico o alfanumérico).",
      "amount": 0.00,
      "currency": "USD",
      "date": "YYYY-MM-DD",
      "sender": {
        "name": "Nombre del emisor (quien envía el dinero).",
        "email": "Correo electrónico del emisor (si aparece)."
      },
      "receiver": {
        "name": "Nombre del receptor (a quien se envió).",
        "email": "Correo o teléfono del receptor."
      },
      "status": "EXITOSO|PENDIENTE|PROCESANDO"
    }
    
    REGLAS:
    - Monto: Números con punto decimal.
    - Si no encuentras un dato, usa null.`,

    // 4. BINANCE
    binance: `Analiza este COMPROBANTE DE BINANCE PAY / TRANSFERENCIA CRYPTO y extrae los datos.
    
    CONTEXTO: Pago en USDT/Cripto.
    
    Estructura JSON Requerida (Si no encuentras un dato, usa null):
    {
      "type": "BINANCE",
      "reference": "TXID, Internal Transfer ID, Order ID o Pay ID.",
      "amount": 0.00,
      "currency": "USDT",
      "date": "YYYY-MM-DD",
      "sender": {
        "binance_id": "Pay ID o User ID del emisor (si visible).",
        "email": "Correo o apodo del emisor."
      },
      "status": "EXITOSO|COMPLETADO"
    }
    
    REGLAS:
    - Busca identificadores únicos largos (TXID) o numéricos (Order ID).
    - Si no encuentras un dato, usa null.`,

    // DEFAULT
    default: `Analiza este comprobante de pago genérico y extrae datos.
    
    Estructura JSON Requerida:
    {
      "type": "DESCONOCIDO",
      "reference": "Referencia del pago",
      "amount": 0.00,
      "currency": "VES|USD",
      "date": "YYYY-MM-DD",
      "sender": {},
      "status": "EXITOSO"
    }
    
    REGLAS: Si no encuentras dato, usa null.`
};

class PaymentOCRService extends BaseOCRService {
    constructor() {
        super();
    }

    /**
     * Extrae datos de un comprobante de pago.
     * @param {File} file - Archivo imagen o PDF del comprobante
     * @param {string} paymentType - Tipo de pago ('mobile_payment', 'bank_transfer', 'zelle', 'binance')
     * @returns {Promise<Object>} Datos extraídos del comprobante
     */
    async extractPaymentData(file, paymentType = 'default') {
        try {
            console.log(`💳 [Payment OCR] Procesando comprobante (${paymentType})...`);
            const prompt = PAYMENT_PROMPTS[paymentType] || PAYMENT_PROMPTS.default;

            try {
                // 1. Intentar Visión directamente
                this.validateFile(file);
                let imageFile = file;
                if (file.type === 'application/pdf') {
                    console.log('📑 Convirtiendo PDF a imagen para Vision API...');
                    imageFile = await this.convertPdfToImage(file);
                }
                const compressedImage = await this.compressImage(imageFile);
                const base64Image = await this.fileToBase64(compressedImage);

                console.log(`🤖 Intentando Vision API (${ocrService.activeProvider}) para comprobante...`);
                const response = await ocrService.callVisionAPI(base64Image, prompt);
                console.log(`✅ Vision API respondió correctamente para comprobante`);
                
                const data = this.parseJSONResponse(response);
                const requiredFields = ['reference', 'amount'];
                data.confidence = this.calculateConfidence(data, requiredFields);
                
                console.log(`✅ [Payment OCR] Extracción visual completada. Tipo: ${data.type}, Confianza: ${Math.round(data.confidence * 100)}%`);
                return data;
                
            } catch (visionError) {
                console.warn(`⚠️ Vision API falló para comprobante (${visionError.message}), activando fallback OCR Tesseract...`);
                
                // 2. Fallback: Procesar con Tesseract localmente y luego API de Texto
                const text = await this.processFile(file);
                
                console.log('📝 Analizando texto extraído del comprobante con API...');
                const response = await ocrService.analyzeTextAPI(text, prompt);
                
                const data = this.parseJSONResponse(response);
                const requiredFields = ['reference', 'amount'];
                data.confidence = this.calculateConfidence(data, requiredFields);
                
                console.log(`✅ [Payment OCR] Extracción por texto completada. Tipo: ${data.type}, Confianza: ${Math.round(data.confidence * 100)}%`);
                return data;
            }
        } catch (error) {
            console.error('❌ [Payment OCR] Error en extracción:', error);
            throw new Error(`Error al extraer datos del comprobante: ${error.message}`);
        }
    }
}

// Exportar instancia singleton
export default new PaymentOCRService();
