// api-productos — API pública para que una empresa cargue y consulte su catálogo
// desde otros sistemas (tienda en línea, punto de venta, hoja de cálculo…).
//
// Autenticación: encabezado `x-api-key: ads_...` (se crea en Mi negocio → Conexiones;
// aquí solo se compara su hash SHA-256 contra public.api_keys, nunca la llave).
//
//   GET  /api-productos?pagina=1&por_pagina=100&codigo=ABC
//        → { productos: [...], pagina, por_pagina }
//   POST /api-productos  { productos: [ { nombre, codigo?, codigo_barras?, tipo?, categoria?,
//        marca?, descripcion?, precio?, costo?, moneda?, iva?, unidad?, existencias?,
//        existencias_minimas?, atributos? } ] }   (máx. 500 por llamada)
//        → { creados, actualizados, errores: [{ fila, mensaje }] }
//
// Reglas: se actualiza el producto si coincide `codigo` o `codigo_barras` dentro de la
// empresa; si no, se crea. `existencias` solo se usa al CREAR (queda como movimiento
// INITIAL); para cambiar existencias de un producto que ya existe se usa la app.
// verify_jwt = false a propósito: la autenticación es la llave de API.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const MAX_LOTE = 500;
const IVA: Record<string, string> = { general: 'IVA_G', reducido: 'IVA_R', lujo: 'IVA_A', exento: 'EXENTO' };
const IVA_INVERSO = Object.fromEntries(Object.entries(IVA).map(([k, v]) => [v, k]));
const UNIDADES = ['UND', 'KG', 'LT', 'MT', 'PAQ', 'CAJA'];

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fallo = (status: number, code: string, message: string) => json(status, { error: { code, message } });

async function sha256(texto: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const txt = (v: unknown, max = 200) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim().slice(0, max));

/** Valida y traduce un producto de la API a columnas de inventory_products. */
function aColumnas(p: any): { fila?: Record<string, unknown>; error?: string; existencias?: number } {
  if (!p || typeof p !== 'object') return { error: 'Producto vacío' };
  const nombre = txt(p.nombre, 160);
  if (!nombre) return { error: 'Falta "nombre"' };
  const tipo = p.tipo === 'servicio' ? 'servicio' : 'producto';
  const precio = num(p.precio), costo = num(p.costo), exist = num(p.existencias), minimo = num(p.existencias_minimas);
  for (const [k, v] of [['precio', precio], ['costo', costo], ['existencias', exist], ['existencias_minimas', minimo]] as const) {
    if (Number.isNaN(v)) return { error: `"${k}" debe ser un número` };
    if (v !== undefined && v < 0) return { error: `"${k}" no puede ser negativo` };
  }
  const moneda = p.moneda ? String(p.moneda).toUpperCase() : undefined;
  if (moneda && !['VES', 'USD', 'EUR'].includes(moneda)) return { error: '"moneda" debe ser VES, USD o EUR' };
  const iva = p.iva ? IVA[String(p.iva).toLowerCase()] : undefined;
  if (p.iva && !iva) return { error: '"iva" debe ser general, reducido, lujo o exento' };
  const unidad = p.unidad ? String(p.unidad).toUpperCase() : undefined;
  if (unidad && !UNIDADES.includes(unidad)) return { error: `"unidad" debe ser ${UNIDADES.join(', ')}` };
  if (p.atributos !== undefined && (typeof p.atributos !== 'object' || Array.isArray(p.atributos))) return { error: '"atributos" debe ser un objeto' };

  const fila: Record<string, unknown> = { name: nombre, tipo };
  if (p.codigo !== undefined) fila.code = txt(p.codigo, 60);
  if (p.codigo_barras !== undefined) fila.codigo_barras = txt(p.codigo_barras, 60);
  if (p.categoria !== undefined) fila.categoria = txt(p.categoria, 80);
  if (p.marca !== undefined) fila.marca = txt(p.marca, 80);
  if (p.descripcion !== undefined) fila.description = txt(p.descripcion, 1000);
  if (precio !== undefined) fila.sale_price = precio;
  if (costo !== undefined && tipo === 'producto') fila.cost_price = costo;
  if (minimo !== undefined && tipo === 'producto') fila.min_stock = minimo;
  if (moneda) fila.currency = moneda;
  if (iva) fila.tax_type = iva;
  if (unidad) fila.unit = unidad;
  if (p.atributos) fila.atributos = p.atributos;
  return { fila, existencias: tipo === 'producto' ? exist : undefined };
}

function aSalida(r: any) {
  return {
    id: r.id, nombre: r.name, codigo: r.code, codigo_barras: r.codigo_barras, tipo: r.tipo,
    categoria: r.categoria, marca: r.marca, descripcion: r.description, precio: Number(r.sale_price ?? 0),
    costo: Number(r.cost_price ?? 0), moneda: r.currency, iva: IVA_INVERSO[r.tax_type] ?? r.tax_type,
    unidad: r.unit, existencias: r.tipo === 'servicio' ? null : Number(r.stock ?? 0),
    existencias_minimas: Number(r.min_stock ?? 0), atributos: r.atributos ?? {}, actualizado: r.updated_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const llave = req.headers.get('x-api-key') ?? '';
  if (!/^ads_[0-9a-f]{48}$/.test(llave)) return fallo(401, 'LLAVE', 'Falta la llave de API (encabezado x-api-key) o no es válida.');

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: registro } = await supabase
    .from('api_keys').select('id, client_id, organization_id, revocada_en').eq('hash', await sha256(llave)).maybeSingle();
  if (!registro || registro.revocada_en) return fallo(401, 'LLAVE', 'La llave de API no es válida o fue revocada.');
  const { client_id, organization_id } = registro;
  await supabase.from('api_keys').update({ ultimo_uso: new Date().toISOString() }).eq('id', registro.id);

  const columnas = 'id, name, code, codigo_barras, tipo, categoria, marca, description, sale_price, cost_price, currency, tax_type, unit, stock, min_stock, atributos, updated_at';

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const porPagina = Math.min(500, Math.max(1, Number(url.searchParams.get('por_pagina')) || 100));
    let q = supabase.from('inventory_products').select(columnas)
      .eq('client_id', client_id).is('deleted_at', null).order('name')
      .range((pagina - 1) * porPagina, pagina * porPagina - 1);
    const codigo = url.searchParams.get('codigo');
    if (codigo) q = q.or(`code.eq.${codigo.replace(/[,()]/g, '')},codigo_barras.eq.${codigo.replace(/[,()]/g, '')}`);
    const { data, error } = await q;
    if (error) return fallo(500, 'CONSULTA', 'No pudimos leer los productos.');
    return json(200, { productos: (data ?? []).map(aSalida), pagina, por_pagina: porPagina });
  }

  if (req.method !== 'POST') return fallo(405, 'METODO', 'Usa GET o POST.');

  let body: any;
  try { body = await req.json(); } catch { return fallo(400, 'CUERPO', 'El cuerpo debe ser JSON.'); }
  const lote = Array.isArray(body?.productos) ? body.productos : null;
  if (!lote?.length) return fallo(400, 'VACIO', 'Envía { "productos": [ ... ] } con al menos un producto.');
  if (lote.length > MAX_LOTE) return fallo(413, 'LOTE', `Máximo ${MAX_LOTE} productos por llamada.`);

  // Existentes de la empresa, para decidir crear o actualizar por código o código de barras.
  const { data: actuales } = await supabase.from('inventory_products')
    .select('id, code, codigo_barras').eq('client_id', client_id).is('deleted_at', null);
  const porCodigo = new Map<string, string>(), porBarras = new Map<string, string>();
  for (const a of actuales ?? []) {
    if (a.code) porCodigo.set(String(a.code).toLowerCase(), a.id);
    if (a.codigo_barras) porBarras.set(String(a.codigo_barras), a.id);
  }

  let creados = 0, actualizados = 0;
  const errores: { fila: number; mensaje: string }[] = [];
  const idsCreados: string[] = [];

  for (let i = 0; i < lote.length; i++) {
    const { fila, error, existencias } = aColumnas(lote[i]);
    if (error || !fila) { errores.push({ fila: i + 1, mensaje: error ?? 'Producto inválido' }); continue; }
    const id = (fila.code && porCodigo.get(String(fila.code).toLowerCase()))
      || (fila.codigo_barras && porBarras.get(String(fila.codigo_barras)));
    if (id) {
      const { error: e } = await supabase.from('inventory_products')
        .update({ ...fila, updated_at: new Date().toISOString() }).eq('id', id).eq('client_id', client_id);
      if (e) errores.push({ fila: i + 1, mensaje: 'No pudimos actualizarlo' }); else actualizados++;
      continue;
    }
    const stockInicial = existencias && existencias > 0 ? existencias : 0;
    const { data: nuevo, error: e } = await supabase.from('inventory_products')
      .insert({ ...fila, client_id, organization_id, stock: stockInicial }).select('id').single();
    if (e || !nuevo) { errores.push({ fila: i + 1, mensaje: 'No pudimos crearlo' }); continue; }
    creados++; idsCreados.push(nuevo.id);
    if (fila.code) porCodigo.set(String(fila.code).toLowerCase(), nuevo.id);
    if (fila.codigo_barras) porBarras.set(String(fila.codigo_barras), nuevo.id);
    if (stockInicial > 0) {
      await supabase.from('inventory_movements').insert({
        organization_id, client_id, product_id: nuevo.id, movement_type: 'INITIAL',
        quantity: stockInicial, cost_price: Number(fila.cost_price ?? 0), description: 'Existencias iniciales (API)',
      });
    }
  }

  await supabase.from('importaciones_productos').insert({
    client_id, organization_id, origen: 'api', total: lote.length, creados, actualizados,
    con_error: errores.length, ids_creados: idsCreados,
  });

  return json(200, { creados, actualizados, errores });
});
