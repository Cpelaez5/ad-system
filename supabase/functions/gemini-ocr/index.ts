import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createProvider } from '../_shared/providers/factory.ts';

// --- Configuración ---
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_B  = MAX_FILE_SIZE_MB * 1024 * 1024;

// Costos aproximados por millón de tokens
const COST_INPUT_PER_M  = 2.00;
const COST_OUTPUT_PER_M = 12.00;

interface AiUsageLog {
  user_id:           string;
  provider:          string;
  model:             string;
  status:            'success' | 'error';
  error_code?:       string;
  error_message?:    string;
  tokens_prompt?:    number;
  tokens_completion?: number;
  costo_estimado?:   number;
  comprobante_id?:   string;
  moneda_detectada?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS Headers para llamadas desde Vue
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders() });
  }

  // --- 1. Autenticación JWT ---
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return errorResponse(401, 'UNAUTHORIZED', 'JWT requerido');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return errorResponse(401, 'UNAUTHORIZED', 'JWT inválido o expirado');

  // --- 2. Control de concurrencia ---
  const { data: existingLock } = await supabase
    .from('ai_ocr_locks')
    .select('locked_at')
    .eq('user_id', user.id)
    .single();

  if (existingLock) {
    const lockAge = Date.now() - new Date(existingLock.locked_at).getTime();
    if (lockAge < 5 * 60 * 1000) {
      return errorResponse(409, 'OCR_IN_PROGRESS', 'Ya hay un proceso OCR activo para este usuario. Espera a que termine.');
    }
    await supabase.from('ai_ocr_locks').delete().eq('user_id', user.id);
  }

  let body: { file_path?: string; comprobante_id?: string; userContext?: any; flowType?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'INVALID_BODY', 'El body debe ser JSON válido');
  }

  const { file_path, comprobante_id, userContext, flowType } = body;
  if (!file_path) return errorResponse(400, 'MISSING_FILE_PATH', 'file_path es requerido');

  // --- 3. Adquirir lock ---
  await supabase.from('ai_ocr_locks').upsert({
    user_id: user.id,
    file_path,
    locked_at: new Date().toISOString(),
  });

  const logEntry: Partial<AiUsageLog> = {
    user_id:        user.id,
    comprobante_id: comprobante_id ?? undefined,
    status:         'error', 
  };

  try {
    // --- 4. Validar archivo en Storage ---
    const folder = file_path.split('/').slice(0, -1).join('/');
    const filename = file_path.split('/').pop()!;
    const { data: fileList, error: fileError } = await supabase.storage
      .from('temp_ocr')
      .list(folder, { search: filename });

    if (fileError || !fileList?.length) {
      throw { code: 'FILE_NOT_FOUND', message: 'Archivo no encontrado en Storage' };
    }

    const fileSize = fileList[0].metadata?.size ?? 0;
    if (fileSize > MAX_FILE_SIZE_B) {
      throw { code: 'FILE_TOO_LARGE', message: `El archivo excede ${MAX_FILE_SIZE_MB}MB` };
    }

    // --- 5. Generar Signed URL ---
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('temp_ocr')
      .createSignedUrl(file_path, 120);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw { code: 'SIGNED_URL_ERROR', message: signedUrlError?.message ?? 'No se pudo generar URL firmada' };
    }

    // --- 6. Obtener Perfil IA Activo ---
    const { data: settings, error: settingsError } = await supabase
      .from('ai_provider_profiles')
      .select('provider, model, encrypted_api_key')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw { code: 'NO_ACTIVE_PROFILE', message: 'No hay perfil de IA activo en el sistema' };
    }

    logEntry.provider = settings.provider;
    logEntry.model    = settings.model;

    // Aquí iría la desencriptación real con pgcrypto o vault. 
    // Para el entorno de desarrollo simularemos que encrypted_api_key ya contiene la llave
    const apiKey = settings.encrypted_api_key; 

    const contextText = userContext ? `Contexto del usuario actual (Nuestra empresa):\n${JSON.stringify(userContext, null, 2)}\n\nFlujo contable actual en la app: ${flowType || 'No especificado'}\n\n` : '';

    const providerInstance = createProvider(settings.provider);
    const { data: resultJson, usage } = await providerInstance.process(
      file_path,
      signedUrlData.signedUrl,
      apiKey,
      settings.model,
      contextText + PROMPT_EXTRACCION_CONTABLE,
      SCHEMA_COMPROBANTE
    );

    // --- 8. Validación contable ---
    applyComprobanteValidations(resultJson);

    // --- 9. Logging de éxito ---
    logEntry.status            = 'success';
    logEntry.tokens_prompt     = usage?.promptTokenCount;
    logEntry.tokens_completion = usage?.candidatesTokenCount;
    logEntry.costo_estimado    = estimarCosto(usage);
    logEntry.moneda_detectada  = resultJson.moneda ?? undefined;
    
    const { error: logErr1 } = await supabase.from('ai_usage_logs').insert(logEntry);
    if (logErr1) console.error('Log error:', logErr1);

    return new Response(JSON.stringify({ ok: true, data: resultJson }), {
      status:  200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    });

  } catch (err: any) {
    logEntry.error_code    = err.code    ?? 'UNKNOWN';
    logEntry.error_message = err.message ?? String(err);
    logEntry.provider      = logEntry.provider ?? 'desconocido';
    logEntry.model         = logEntry.model ?? 'desconocido';
    
    const { error: logErr2 } = await supabase.from('ai_usage_logs').insert(logEntry);
    if (logErr2) console.error('Log error:', logErr2);

    const status = err.code === 'UNAUTHORIZED'     ? 401
                 : err.code === 'INVALID_KEY'      ? 401
                 : err.code === 'OCR_IN_PROGRESS'  ? 409
                 : err.code === 'FILE_TOO_LARGE'   ? 413
                 : err.code === 'QUOTA_EXCEEDED'   ? 429
                 : err.code === 'PREVIEW_RATE_LIMIT'? 429
                 : err.code === 'PROVIDER_ERROR'   ? 400
                 : err.code === 'NO_ACTIVE_PROFILE'? 400
                 : err.code === 'UNSUPPORTED_PROVIDER' ? 400
                 : err.code === 'TIMEOUT'          ? 504
                 : 500;
                 
    return errorResponse(status, err.code ?? 'UNKNOWN', err.message ?? 'Error interno');

  } finally {
    await Promise.allSettled([
      supabase.from('ai_ocr_locks').delete().eq('user_id', user.id),
      supabase.storage.from('temp_ocr').remove([file_path]),
    ]);
  }
});

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function errorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
  });
}

function estimarCosto(usage: any): number {
  if (!usage) return 0;
  const inputCost  = (usage.promptTokenCount     / 1_000_000) * COST_INPUT_PER_M;
  const outputCost = (usage.candidatesTokenCount / 1_000_000) * COST_OUTPUT_PER_M;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

function applyComprobanteValidations(data: any): void {
  if (data.es_cashea && !data.currency) {
    data.notas_ocr = (data.notas_ocr ?? '') + ' [ALERTA] Cashea sin moneda detectada.';
  }
  if (data.financial?.total && data.financial?.taxableAmount && data.financial?.taxAmount) {
    const calculado  = data.financial.taxableAmount + data.financial.taxAmount;
    const diferencia = Math.abs(calculado - data.financial.total);
    if (diferencia > 0.05) {
      data.notas_ocr = (data.notas_ocr ?? '') + ` [ALERTA] Inconsistencia matemática.`;
    }
  }
}

const SCHEMA_COMPROBANTE = {
  type: 'OBJECT',
  properties: {
    detectedFlow:    { type: 'STRING', nullable: true, enum: ['VENTA', 'COMPRA', 'GASTO'] },
    flowConfidence:  { type: 'STRING', nullable: true, enum: ['high', 'medium', 'low'] },
    flowReason:      { type: 'STRING', nullable: true },

    invoiceNumber:   { type: 'STRING', nullable: true },
    controlNumber:   { type: 'STRING', nullable: true },
    issueDate:       { type: 'STRING', nullable: true, description: 'ISO 8601: YYYY-MM-DD' },
    documentType:    { type: 'STRING', nullable: true, enum: ['FACTURA', 'RECIBO', 'NOTA DE CRÉDITO', 'NOTA DE DÉBITO'] },
    documentCategory:{ type: 'STRING', nullable: true, enum: ['FACTURA', 'RECIBO'] },
    currency:        { type: 'STRING', nullable: true, enum: ['USD', 'VES', 'EUR'] },

    issuer: {
      type: 'OBJECT', nullable: true,
      properties: {
        companyName: { type: 'STRING', nullable: true },
        rif:         { type: 'STRING', nullable: true },
        address:     { type: 'STRING', nullable: true },
        phone:       { type: 'STRING', nullable: true },
        email:       { type: 'STRING', nullable: true },
        website:     { type: 'STRING', nullable: true },
      }
    },
    client: {
      type: 'OBJECT', nullable: true,
      properties: {
        companyName: { type: 'STRING', nullable: true },
        rif:         { type: 'STRING', nullable: true },
        address:     { type: 'STRING', nullable: true },
        phone:       { type: 'STRING', nullable: true },
        email:       { type: 'STRING', nullable: true },
        website:     { type: 'STRING', nullable: true },
      }
    },

    financial: {
      type: 'OBJECT', nullable: true,
      properties: {
        total:            { type: 'NUMBER', nullable: true },
        taxableAmount:    { type: 'NUMBER', nullable: true },
        taxAmount:        { type: 'NUMBER', nullable: true },
        exemptAmount:     { type: 'NUMBER', nullable: true },
        igtfAmount:       { type: 'NUMBER', nullable: true },
        exchangeRate:     { type: 'NUMBER', nullable: true, description: 'Tasa BCV si está impresa' },
        paymentMethod:    { type: 'STRING', nullable: true, enum: ['EFECTIVO', 'PAGO_MOVIL', 'TRANSFERENCIA', 'ZELLE', 'PUNTO_VENTA', 'CASHEA', 'OTRO'] },
        paymentReference: { type: 'STRING', nullable: true },
      }
    },

    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          code:        { type: 'STRING', nullable: true },
          quantity:    { type: 'NUMBER', nullable: true },
          unitPrice:   { type: 'NUMBER', nullable: true },
          amount:      { type: 'NUMBER', nullable: true },
          unit:        { type: 'STRING', nullable: true },
          currency:    { type: 'STRING', nullable: true },
        },
        required: ['description'],
      }
    },

    es_cashea:    { type: 'BOOLEAN', nullable: false },
    numero_cuota: { type: 'INTEGER', nullable: true, description: '0=inicial, 1/2/3=cuota. null si no se puede determinar.' },

    status:       { type: 'STRING', nullable: true, enum: ['PAGADA', 'POR_COBRAR', 'BORRADOR', 'CRÉDITO'] },
    dueDate:      { type: 'STRING', nullable: true, description: 'ISO 8601: YYYY-MM-DD' },
    
    doubtfulFields: { 
      type: 'ARRAY', 
      nullable: true, 
      description: 'Nombres exactos de las llaves (ej: "total", "invoiceNumber") sobre las que tienes baja certeza de haber extraído correctamente.',
      items: { type: 'STRING' }
    },

    confianza:  { type: 'STRING', enum: ['alta', 'media', 'baja'] },
    notas_ocr:  { type: 'STRING', nullable: true },
    notes:      { type: 'STRING', nullable: true },
  },
  required: ['detectedFlow', 'invoiceNumber', 'issueDate', 'dueDate', 'status', 'documentType', 'issuer', 'client', 'financial', 'items', 'es_cashea', 'confianza', 'doubtfulFields'],
};

const PROMPT_EXTRACCION_CONTABLE = `
Eres un asistente contable experto. Analiza el documento y extrae meticulosamente todos los datos solicitados en formato JSON.

REGLAS DE EXTRACCIÓN:
1. DETECCIÓN DE FLUJO: 
   - Compara el emisor y cliente con este contexto (si existe). Si somos EMISOR = "VENTA". Si somos CLIENTE = "COMPRA". Gasto menor = "GASTO".
2. STATUS Y FECHAS:
   - Busca sellos de "PAGADO", "CANCELADO" o comprobantes de transferencia -> status = "PAGADA".
   - Facturas con "Condición: Crédito" -> status = "CRÉDITO", y extrae la fecha de vencimiento (dueDate).
3. FINANCIERO Y PAGOS:
   - Extrae el método de pago exacto y su referencia si aparece.
   - Si se menciona "Tasa BCV" o similar, extráela a exchangeRate.
   - Si hay cobro de IGTF (3%), ponlo en igtfAmount.
4. CASHEA: Detecta si es Cashea (es_cashea = true). Extrae qué cuota es (0=inicial, 1,2,3).
5. HONESTIDAD Y CERTEZA: 
   - Retorna \`null\` para todo lo que no encuentres. No inventes datos.
   - Lista en el array \`doubtfulFields\` el nombre exacto de cualquier llave (ej: "invoiceNumber") donde el texto era borroso, ilegible o estés dudando de tu propia extracción.
6. CLAVES: Usa los nombres exactos en inglés definidos en el esquema.
`;
