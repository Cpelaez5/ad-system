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
        this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
        this.apiUrl = 'https://api.deepseek.com/chat/completions';
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

            // Seleccionar prompt según tipo
            const prompt = PAYMENT_PROMPTS[paymentType] || PAYMENT_PROMPTS.default;

            // Procesar archivo (hereda PDF parse / compresión de imagen)
            const text = await this.processFile(file);

            console.log('📝 Analizando comprobante con DeepSeek (temperatura 0.0)...');
            const response = await this.analyzeWithDeepSeek(text, prompt);

            const data = this.parseJSONResponse(response);
            console.log('🤖 Datos extraídos del comprobante:', data);

            // Calcular confianza
            const requiredFields = ['reference', 'amount'];
            data.confidence = this.calculateConfidence(data, requiredFields);

            console.log(`✅ [Payment OCR] Extracción completada. Tipo: ${data.type}, Confianza: ${Math.round(data.confidence * 100)}%`);

            return data;
        } catch (error) {
            console.error('❌ [Payment OCR] Error en extracción:', error);
            throw new Error(`Error al extraer datos del comprobante: ${error.message}`);
        }
    }

    /**
     * Analiza texto con DeepSeek usando temperatura 0.0 (máxima precisión).
     */
    async analyzeWithDeepSeek(text, prompt) {
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
                            content: `${prompt}\n\nTEXTO DEL COMPROBANTE:\n${text}`
                        }
                    ],
                    temperature: 0.0,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API Error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error en análisis DeepSeek:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
export default new PaymentOCRService();
