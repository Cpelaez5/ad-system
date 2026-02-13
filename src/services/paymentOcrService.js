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
const PAYMENT_PROOF_PROMPT = `Analiza este comprobante de pago (captura de pantalla o PDF) y extrae TODOS los datos disponibles con máxima precisión.

CONTEXTO: Este documento es un COMPROBANTE DE PAGO (transferencia bancaria, pago móvil, Zelle o Binance). Necesitamos extraer los datos para reportar el pago.

Estructura JSON Requerida (Retorna SOLO el JSON):
{
  "type": "PAGO_MOVIL|TRANSFERENCIA|ZELLE|BINANCE|DESCONOCIDO",
  "reference": "Número de referencia, confirmación o transacción",
  "amount": 0.00,
  "currency": "VES|USD",
  "date": "YYYY-MM-DD",
  
  "sender": {
    "phone": "Teléfono del emisor (ej: 0412-1234567) o null",
    "document": "Cédula o RIF del emisor (ej: V-12345678) o null",
    "bank": "Banco del emisor o null",
    "name": "Nombre del emisor o null",
    "email": "Email del emisor o null"
  },
  
  "receiver": {
    "phone": "Teléfono del receptor o null",
    "document": "Cédula o RIF del receptor o null",
    "bank": "Banco del receptor o null",
    "name": "Nombre del receptor o null",
    "email": "Email del receptor o null"
  },
  
  "status": "EXITOSO|PENDIENTE|FALLIDO|DESCONOCIDO",
  "notes": "Cualquier nota adicional encontrada o null"
}

REGLAS:
- Si ves "Pago Móvil", "P2P", "C2P" → type: "PAGO_MOVIL"
- Si ves "Transferencia", "Bancaria" → type: "TRANSFERENCIA"
- Si ves "Zelle" → type: "ZELLE"
- Si ves "Binance", "Pay" → type: "BINANCE"
- IMPORTANTE NÚMEROS: Usa formato estándar JSON (punto para decimales). Ej: 1250.50
- MONEDA: Si es "Bs" o "Bolívares" → "VES". Si es "$" o "USD" → "USD"
- Referencia: Busca "Ref", "Nro", "Confirmación", "Transaction", "ID"
- Retorna SOLO el JSON válido, sin texto adicional.`;

class PaymentOCRService extends BaseOCRService {
    constructor() {
        super();
        this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
        this.apiUrl = 'https://api.deepseek.com/chat/completions';
    }

    /**
     * Extrae datos de un comprobante de pago.
     * @param {File} file - Archivo imagen o PDF del comprobante
     * @returns {Promise<Object>} Datos extraídos del comprobante
     */
    async extractPaymentData(file) {
        try {
            console.log('💳 [Payment OCR] Procesando comprobante de pago...');

            // Procesar archivo (hereda PDF parse / compresión de imagen)
            const text = await this.processFile(file);

            console.log('📝 Analizando comprobante con DeepSeek (temperatura 0.0)...');
            const response = await this.analyzeWithDeepSeek(text, PAYMENT_PROOF_PROMPT);

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
