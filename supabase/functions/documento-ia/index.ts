// documento-ia — "Llenar con un documento": la IA lee un RIF, una cédula u otro documento
// de identificación (foto o PDF) y devuelve SOLO los datos que necesitan los formularios
// (proveedor, cliente, datos de la empresa). Ver docs/mvp/diseno/llenar-con-documento.md.
//
//   POST { archivo: { base64, mime }, tipo_esperado?: 'rif' | 'cedula' | 'auto' }
//     → { documento: { tipo, tipo_persona, nombre, rif, cedula, domicilio_fiscal, estado,
//                       fecha_inscripcion, fecha_vencimiento, telefono, correo, confianza, legible } }
//
// Privacidad: el archivo NO se guarda (ni en Storage ni en la BD); se procesa y se descarta.
// Minimización: de una cédula nunca se extraen fecha de nacimiento, estado civil ni firma.
// En ai_usage_logs solo quedan el modelo, los tokens y el resultado (sin contenido).
// Archivo único a propósito: el deploy con imports relativos falla.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 8 * 1024 * 1024;

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const error = (status: number, code: string, message: string) => respuesta(status, { error: { code, message } });

const PROMPT = `Eres un asistente que lee documentos de identificación de Venezuela para llenar un formulario.
Puede ser:
- un comprobante de RIF del SENIAT ("Registro Único de Información Fiscal"), de persona natural (V-, E-, P-) o jurídica (J-, G-, C-);
- una cédula de identidad venezolana (V- o E-);
- otro documento (pasaporte, registro mercantil, factura…).
Devuelve SOLO estos datos, tal como aparecen (sin inventar):
- "tipo": "rif", "cedula", "pasaporte" u "otro".
- "tipo_persona": "natural" (RIF V/E/P o cédula), "juridica" (RIF J o C) o "gobierno" (RIF G). Si no se sabe, null.
- "nombre": razón social de la empresa, o nombres y apellidos de la persona, en mayúsculas y minúsculas normales (ej. "Distribuidora El Sol, C.A.", "María José Pérez").
- "rif": con formato LETRA-8DÍGITOS-DÍGITO (ej. "J-12345678-9"); si es cédula sin RIF, null.
- "cedula": con formato LETRA-NÚMERO (ej. "V-12345678") si aparece; si no, null.
- "domicilio_fiscal": la dirección completa del RIF; null si no aparece.
- "estado": el estado de Venezuela de la dirección (ej. "Zulia"); null si no aparece.
- "fecha_inscripcion" y "fecha_vencimiento": del RIF, en formato AAAA-MM-DD; null si no aparecen.
- "telefono" y "correo": solo si aparecen impresos; si no, null.
- "legible": false si la imagen está borrosa, cortada o no es un documento.
- "confianza": "alta", "media" o "baja".
NUNCA devuelvas fecha de nacimiento, estado civil, firma, huella ni otros datos que no estén en esta lista.`;

const NUL = (t: string) => ({ type: t, nullable: true });
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    tipo: { type: 'STRING', enum: ['rif', 'cedula', 'pasaporte', 'otro'] },
    tipo_persona: { type: 'STRING', enum: ['natural', 'juridica', 'gobierno'], nullable: true },
    nombre: NUL('STRING'),
    rif: NUL('STRING'),
    cedula: NUL('STRING'),
    domicilio_fiscal: NUL('STRING'),
    estado: NUL('STRING'),
    fecha_inscripcion: NUL('STRING'),
    fecha_vencimiento: NUL('STRING'),
    telefono: NUL('STRING'),
    correo: NUL('STRING'),
    legible: { type: 'BOOLEAN' },
    confianza: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
  },
  required: ['tipo', 'legible', 'confianza'],
};

/** Normaliza un RIF a "L-NNNNNNNN-N"; null si no tiene un formato válido. */
function normalizarRif(v: unknown): string | null {
  const s = String(v ?? '').toUpperCase().replace(/[^VEJPGC0-9]/g, '');
  // Siempre 9 dígitos (8 + verificador): con 8 no se puede adivinar el verificador.
  const m = s.match(/^([VEJPGC])(\d{9})$/);
  if (!m) return null;
  return `${m[1]}-${m[2].slice(0, 8)}-${m[2].slice(8)}`;
}

function normalizarCedula(v: unknown): string | null {
  const s = String(v ?? '').toUpperCase().replace(/[^VE0-9]/g, '');
  const m = s.match(/^([VE])(\d{5,9})$/);
  return m ? `${m[1]}-${Number(m[2])}` : null;
}

const fechaISO = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const texto = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return error(405, 'METODO', 'Solo POST');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return error(401, 'NO_AUTORIZADO', 'Inicia sesión de nuevo.');
  const { data: perfil } = await supabase.from('users').select('organization_id').eq('id', user.id).maybeSingle();
  if (!perfil?.organization_id) return error(403, 'SIN_EMPRESA', 'Tu usuario no tiene empresa asignada.');

  let body: any;
  try { body = await req.json(); } catch { return error(400, 'CUERPO', 'El cuerpo debe ser JSON.'); }
  const mime = String(body?.archivo?.mime ?? '');
  const base64 = String(body?.archivo?.base64 ?? '').replace(/^data:[^,]+,/, '');
  if (!MIMES.includes(mime)) return error(400, 'TIPO', 'Sube una foto (JPG, PNG o WebP) o un PDF.');
  if (!base64 || Math.floor(base64.length * 3 / 4) > MAX_BYTES) return error(413, 'GRANDE', 'El archivo pesa más de 8 MB.');
  const esperado = ['rif', 'cedula'].includes(body?.tipo_esperado) ? body.tipo_esperado : 'auto';

  const log: Record<string, unknown> = { user_id: user.id, provider: 'gemini', status: 'error' };
  try {
    const { data: ia } = await supabase
      .from('ai_provider_profiles').select('provider, model, encrypted_api_key').eq('is_active', true).maybeSingle();
    if (!ia || ia.provider !== 'gemini' || !ia.encrypted_api_key) {
      throw { code: 'SIN_IA', message: 'La IA no está configurada. Avísale al administrador.' };
    }
    log.model = ia.model;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let datos: any;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ia.model}:generateContent?key=${ia.encrypted_api_key}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT + (esperado !== 'auto' ? `\nSe espera un documento de tipo "${esperado}".` : '') },
            { inlineData: { mimeType: mime, data: base64 } },
          ] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.1 },
        }),
      });
      datos = await r.json().catch(() => ({}));
      if (!r.ok) {
        const code = r.status === 429 ? 'CUPO_IA' : r.status === 401 || r.status === 403 ? 'LLAVE_IA' : 'ERROR_IA';
        throw { code, message: datos?.error?.message ?? `HTTP ${r.status}` };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') throw { code: 'TIEMPO_IA', message: 'La IA tardó demasiado en responder.' };
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    const textoIA = datos?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
    let d: any;
    try { d = JSON.parse(textoIA); } catch { throw { code: 'RESPUESTA_IA', message: 'No pudimos leer la respuesta de la IA.' }; }

    // Saneo y minimización: solo los campos permitidos, con formatos válidos.
    const rif = normalizarRif(d.rif);
    const documento = {
      tipo: ['rif', 'cedula', 'pasaporte', 'otro'].includes(d.tipo) ? d.tipo : 'otro',
      tipo_persona: ['natural', 'juridica', 'gobierno'].includes(d.tipo_persona) ? d.tipo_persona
        : rif ? (/^[JC]/.test(rif) ? 'juridica' : rif.startsWith('G') ? 'gobierno' : 'natural') : null,
      nombre: texto(d.nombre, 160),
      rif,
      cedula: normalizarCedula(d.cedula),
      domicilio_fiscal: texto(d.domicilio_fiscal, 300),
      estado: texto(d.estado, 60),
      fecha_inscripcion: fechaISO(d.fecha_inscripcion),
      fecha_vencimiento: fechaISO(d.fecha_vencimiento),
      telefono: texto(d.telefono, 30),
      correo: typeof d.correo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim()) ? d.correo.trim().slice(0, 120) : null,
      legible: d.legible !== false,
      confianza: ['alta', 'media', 'baja'].includes(d.confianza) ? d.confianza : 'baja',
    };

    log.status = 'success';
    log.tokens_prompt = datos?.usageMetadata?.promptTokenCount;
    log.tokens_completion = datos?.usageMetadata?.candidatesTokenCount;
    await supabase.from('ai_usage_logs').insert(log).then(() => {}, () => {});
    return respuesta(200, { documento });
  } catch (e: any) {
    log.error_code = e?.code ?? 'ERROR';
    await supabase.from('ai_usage_logs').insert(log).then(() => {}, () => {});
    const status = e?.code === 'CUPO_IA' ? 429 : 502;
    return error(status, e?.code ?? 'ERROR', e?.message ?? 'Algo salió mal con la IA.');
  }
});
