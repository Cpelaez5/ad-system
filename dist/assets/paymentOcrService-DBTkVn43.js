import d from"./baseOcrService-BdJ3UaA0.js";import{o as s}from"./ocrService-DRvKBL_m.js";const l={mobile_payment:`Analiza este COMPROBANTE DE PAGO MÓVIL (Venezuela) y extrae los datos.
    
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
    - Si no encuentras un campo, devuélvelo como null. NO INVENTES DATOS.`,bank_transfer:`Analiza este COMPROBANTE DE TRANSFERENCIA BANCARIA y extrae los datos.
    
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
    - Si no encuentras un dato, usa null.`,zelle:`Analiza este COMPROBANTE DE ZELLE y extrae los datos.
    
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
    - Si no encuentras un dato, usa null.`,binance:`Analiza este COMPROBANTE DE BINANCE PAY / TRANSFERENCIA CRYPTO y extrae los datos.
    
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
    - Si no encuentras un dato, usa null.`,default:`Analiza este comprobante de pago genérico y extrae datos.
    
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
    
    REGLAS: Si no encuentras dato, usa null.`};class m extends d{constructor(){super()}async extractPaymentData(o,i="default"){try{console.log(`💳 [Payment OCR] Procesando comprobante (${i})...`);const n=l[i]||l.default;try{this.validateFile(o);let r=o;o.type==="application/pdf"&&(console.log("📑 Convirtiendo PDF a imagen para Vision API..."),r=await this.convertPdfToImage(o));const t=await this.compressImage(r),c=await this.fileToBase64(t);console.log(`🤖 Intentando Vision API (${s.activeProvider}) para comprobante...`);const e=await s.callVisionAPI(c,n);console.log("✅ Vision API respondió correctamente para comprobante");const a=this.parseJSONResponse(e),u=["reference","amount"];return a.confidence=this.calculateConfidence(a,u),console.log(`✅ [Payment OCR] Extracción visual completada. Tipo: ${a.type}, Confianza: ${Math.round(a.confidence*100)}%`),a}catch(r){console.warn(`⚠️ Vision API falló para comprobante (${r.message}), activando fallback OCR Tesseract...`);const t=await this.processFile(o);console.log("📝 Analizando texto extraído del comprobante con API...");const c=await s.analyzeTextAPI(t,n),e=this.parseJSONResponse(c),a=["reference","amount"];return e.confidence=this.calculateConfidence(e,a),console.log(`✅ [Payment OCR] Extracción por texto completada. Tipo: ${e.type}, Confianza: ${Math.round(e.confidence*100)}%`),e}}catch(n){throw console.error("❌ [Payment OCR] Error en extracción:",n),new Error(`Error al extraer datos del comprobante: ${n.message}`)}}}const N=new m;export{N as p};
