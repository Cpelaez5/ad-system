import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createProvider } from '../_shared/providers/factory.ts';

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
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    // CORS Headers
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

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'INVALID_BODY', 'El body debe ser JSON válido');
  }

  const { prompt } = body;
  if (!prompt) return errorResponse(400, 'MISSING_PROMPT', 'prompt es requerido');

  const logEntry: Partial<AiUsageLog> = {
    user_id: user.id,
    status:  'error', 
  };

  try {
    // --- 2. Obtener Perfil IA Activo ---
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

    const apiKey = settings.encrypted_api_key; 

    // --- 3. Procesar Chat usando el Patrón Adaptador ---
    const providerInstance = createProvider(settings.provider);
    const { text, usage } = await providerInstance.generateText(prompt, apiKey, settings.model);

    // --- 4. Logging de éxito ---
    logEntry.status            = 'success';
    logEntry.tokens_prompt     = usage?.promptTokenCount;
    logEntry.tokens_completion = usage?.candidatesTokenCount;
    logEntry.costo_estimado    = estimarCosto(usage);
    
    const { error: logErr } = await supabase.from('ai_usage_logs').insert(logEntry);
    if (logErr) console.error('Log error:', logErr);

    return new Response(JSON.stringify({ ok: true, data: { text } }), {
      status:  200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    });

  } catch (err: any) {
    logEntry.error_code    = err.code    ?? 'UNKNOWN';
    logEntry.error_message = err.message ?? String(err);
    logEntry.provider      = logEntry.provider ?? 'desconocido';
    logEntry.model         = logEntry.model ?? 'desconocido';
    
    if (supabase) {
      const { error: logErr } = await supabase.from('ai_usage_logs').insert(logEntry);
      if (logErr) console.error('Log error:', logErr);
    }

    const status = err.code === 'UNAUTHORIZED'     ? 401
                 : err.code === 'INVALID_KEY'      ? 401
                 : err.code === 'QUOTA_EXCEEDED'   ? 429
                 : err.code === 'PREVIEW_RATE_LIMIT'? 429
                 : err.code === 'PROVIDER_ERROR'   ? 400
                 : err.code === 'NO_ACTIVE_PROFILE'? 400
                 : err.code === 'UNSUPPORTED_PROVIDER' ? 400
                 : err.code === 'TIMEOUT'          ? 504
                 : 500;
                 
    return errorResponse(status, err.code ?? 'UNKNOWN', err.message ?? 'Error interno');
  }
  } catch (globalError: any) {
    console.error("Global Error:", globalError);
    return new Response(JSON.stringify({ ok: false, error: { code: 'FATAL_ERROR', message: String(globalError.stack || globalError) } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders() },
    });
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
