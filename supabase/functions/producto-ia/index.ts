// producto-ia — IA para fotos de productos (Mi mercancía).
//
//   POST { accion: 'identificar', foto_path, campos? } → datos sugeridos del producto
//        campos: [{ clave, etiqueta }] propios del rubro (talla, vencimiento…); la IA los llena si se ven
//   POST { accion: 'mejorar',     foto_path }  → foto "de estudio" (Nano Banana)
//
// `foto_path` es una ruta del bucket PRIVADO `productos`:
//   {organization_id}/{client_id}/{archivo}
// La función verifica con el JWT que la ruta pertenece a la empresa de quien llama
// (un cliente solo puede usar fotos de su propia carpeta). La llave de Gemini sale
// del perfil de IA activo (ai_provider_profiles), igual que gemini-ocr; nunca va al
// navegador. Archivo único a propósito: el deploy con imports relativos falla.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { encodeBase64, decodeBase64 } from 'jsr:@std/encoding/base64';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'productos';
const MAX_BYTES = 8 * 1024 * 1024;
// Nano Banana (edición de imagen de Gemini). Se puede cambiar sin redeploy.
const MODELO_IMAGEN = Deno.env.get('PRODUCTO_IMAGEN_MODEL') ?? 'gemini-2.5-flash-image';

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const error = (status: number, code: string, message: string) => respuesta(status, { error: { code, message } });

const mimeDe = (ruta: string) => {
  const r = ruta.toLowerCase();
  if (r.endsWith('.png')) return 'image/png';
  if (r.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const PROMPT_IDENTIFICAR = `Eres un asistente de inventario para pequeños comercios en Venezuela.
Mira la foto de UN producto y devuelve sus datos para registrarlo en el inventario.
Reglas:
- "nombre": cómo lo pediría un cliente en la tienda, corto y claro (ej. "Harina PAN 1 kg", "Aceite Mazeite 1 L").
- "marca": solo si se ve en el empaque; si no, null.
- "categoria": una sola palabra o frase corta en español (ej. "Víveres", "Bebidas", "Limpieza", "Ferretería", "Ropa", "Electrónica", "Farmacia", "Papelería").
- "presentacion": tamaño o contenido si se ve (ej. "1 kg", "500 ml", "Talla M", "Paquete de 12").
- "unidad": una de UND, KG, LT, MT, PAQ, CAJA.
- "codigo_barras": solo si el código numérico es legible completo; si no, null.
- "descripcion": una frase útil (color, sabor, modelo), sin inventar.
- "confianza": "alta" si identificas claramente el producto, "media" si dudas, "baja" si la foto no permite identificarlo.
No inventes precios ni datos que no se vean.`;

const SCHEMA_PRODUCTO = {
  type: 'OBJECT',
  properties: {
    nombre: { type: 'STRING' },
    marca: { type: 'STRING', nullable: true },
    categoria: { type: 'STRING', nullable: true },
    presentacion: { type: 'STRING', nullable: true },
    unidad: { type: 'STRING', enum: ['UND', 'KG', 'LT', 'MT', 'PAQ', 'CAJA'] },
    codigo_barras: { type: 'STRING', nullable: true },
    descripcion: { type: 'STRING', nullable: true },
    confianza: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
  },
  required: ['nombre', 'unidad', 'confianza'],
};

const PROMPT_MEJORAR = `Convierte esta foto en una foto de producto profesional para catálogo:
el MISMO producto, idéntico (forma, colores, etiqueta, texto y logotipos sin cambios),
centrado, sobre fondo blanco limpio, con luz de estudio suave y una sombra sutil debajo.
Quita manos, mesas y objetos del fondo. No agregues texto, marcas de agua ni otros productos.
Formato cuadrado.`;

async function llamarGemini(apiKey: string, modelo: string, payload: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = cuerpo?.error?.message ?? `HTTP ${r.status}`;
      const code = r.status === 429 ? 'CUPO_IA' : r.status === 401 || r.status === 403 ? 'LLAVE_IA' : 'ERROR_IA';
      throw { code, message: msg };
    }
    return cuerpo;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw { code: 'TIEMPO_IA', message: 'La IA tardó demasiado en responder.' };
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return error(405, 'METODO', 'Solo POST');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Quién llama
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return error(401, 'NO_AUTORIZADO', 'Inicia sesión de nuevo.');

  const { data: perfil } = await supabase
    .from('users').select('role, organization_id, client_id').eq('id', user.id).maybeSingle();
  if (!perfil?.organization_id) return error(403, 'SIN_EMPRESA', 'Tu usuario no tiene empresa asignada.');

  // 2. Qué pide
  let body: any;
  try { body = await req.json(); } catch { return error(400, 'CUERPO', 'El cuerpo debe ser JSON.'); }
  const { accion, foto_path } = body ?? {};
  // Campos propios del rubro (máx. 12, claves seguras) para pedirle a la IA que los llene.
  const campos: { clave: string; etiqueta: string }[] = Array.isArray(body?.campos)
    ? body.campos
        .filter((c: any) => typeof c?.clave === 'string' && /^[a-z_]{1,30}$/.test(c.clave))
        .slice(0, 12)
        .map((c: any) => ({ clave: c.clave, etiqueta: String(c.etiqueta ?? c.clave).slice(0, 60) }))
    : [];
  if (!['identificar', 'mejorar'].includes(accion)) return error(400, 'ACCION', 'Acción no válida.');
  if (typeof foto_path !== 'string' || foto_path.includes('..')) return error(400, 'RUTA', 'Ruta de foto no válida.');

  // 3. La foto debe ser de SU empresa: {org}/{client}/...
  const [org, cliente] = foto_path.split('/');
  const esStaff = perfil.role === 'admin' || perfil.role === 'contador' || perfil.role === 'super_admin';
  const suya = perfil.role === 'super_admin'
    || (org === perfil.organization_id && (esStaff || cliente === perfil.client_id));
  if (!suya) return error(403, 'AJENA', 'Esa foto no pertenece a tu negocio.');

  const log: Record<string, unknown> = { user_id: user.id, provider: 'gemini', status: 'error' };

  try {
    // 4. Leer la foto
    const { data: archivo, error: errArchivo } = await supabase.storage.from(BUCKET).download(foto_path);
    if (errArchivo || !archivo) throw { code: 'FOTO', message: 'No encontramos la foto. Vuelve a subirla.' };
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw { code: 'FOTO_GRANDE', message: 'La foto pesa más de 8 MB.' };
    const imagen = { inlineData: { mimeType: mimeDe(foto_path), data: encodeBase64(bytes) } };

    // 5. Llave del perfil de IA activo (igual que gemini-ocr)
    const { data: ia } = await supabase
      .from('ai_provider_profiles').select('provider, model, encrypted_api_key').eq('is_active', true).maybeSingle();
    if (!ia || ia.provider !== 'gemini' || !ia.encrypted_api_key) {
      throw { code: 'SIN_IA', message: 'La IA no está configurada. Avísale al administrador.' };
    }

    if (accion === 'identificar') {
      log.model = ia.model;
      const schema: any = structuredClone(SCHEMA_PRODUCTO);
      let prompt = PROMPT_IDENTIFICAR;
      if (campos.length) {
        schema.properties.atributos = {
          type: 'OBJECT',
          properties: Object.fromEntries(campos.map((c) => [c.clave, { type: 'STRING', nullable: true }])),
        };
        prompt += `

Además, en "atributos" llena SOLO lo que se vea en la foto (si no se ve, null): `
          + campos.map((c) => `"${c.clave}" = ${c.etiqueta}`).join('; ') + '.';
      }
      const datos = await llamarGemini(ia.encrypted_api_key, ia.model, {
        contents: [{ parts: [{ text: prompt }, imagen] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
      });
      const texto = datos?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
      let producto: any;
      try { producto = JSON.parse(texto); } catch { throw { code: 'RESPUESTA_IA', message: 'No pudimos leer la respuesta de la IA.' }; }
      log.status = 'success';
      log.tokens_prompt = datos?.usageMetadata?.promptTokenCount;
      log.tokens_completion = datos?.usageMetadata?.candidatesTokenCount;
      await supabase.from('ai_usage_logs').insert(log).then(() => {}, () => {});
      return respuesta(200, { producto });
    }

    // accion === 'mejorar' (Nano Banana)
    log.model = MODELO_IMAGEN;
    const datos = await llamarGemini(ia.encrypted_api_key, MODELO_IMAGEN, {
      contents: [{ parts: [{ text: PROMPT_MEJORAR }, imagen] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    });
    const parte = datos?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data || p.inline_data?.data);
    const generada = parte?.inlineData ?? parte?.inline_data;
    if (!generada?.data) throw { code: 'SIN_IMAGEN', message: 'La IA no devolvió una foto. Intenta con otra toma más clara.' };

    const mime = generada.mimeType ?? generada.mime_type ?? 'image/png';
    const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
    const destino = `${org}/${cliente}/pro-${crypto.randomUUID()}.${ext}`;
    const { error: errSubida } = await supabase.storage.from(BUCKET)
      .upload(destino, decodeBase64(generada.data), { contentType: mime, upsert: false });
    if (errSubida) throw { code: 'GUARDAR', message: 'No pudimos guardar la foto mejorada.' };

    log.status = 'success';
    await supabase.from('ai_usage_logs').insert(log).then(() => {}, () => {});
    return respuesta(200, { foto_path: destino });
  } catch (e: any) {
    log.error_code = e?.code ?? 'ERROR';
    await supabase.from('ai_usage_logs').insert(log).then(() => {}, () => {});
    const status = e?.code === 'CUPO_IA' ? 429 : e?.code === 'FOTO' ? 404 : 502;
    return error(status, e?.code ?? 'ERROR', e?.message ?? 'Algo salió mal con la IA.');
  }
});
