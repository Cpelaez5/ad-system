import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ═══════════════════════════════════════════════════════════
// Edge Function: bcv-rates
// Obtiene tasas de cambio (Dólar y Euro) usando DolarAPI,
// una API pública y estable para Venezuela, evitando problemas
// de SSL y formato en el portal oficial del BCV.
// (Código traído del despliegue v5 el 2026-10-12; antes no estaba en el repo.)
// ═══════════════════════════════════════════════════════════

const DOLAR_API_USD = 'https://ve.dolarapi.com/v1/dolares/oficial';
const DOLAR_API_EUR = 'https://ve.dolarapi.com/v1/euros';

Deno.serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 minutos de cache
  };

  try {
    // Llamadas en paralelo a DolarAPI
    const [usdRes, eurRes] = await Promise.all([
      fetch(DOLAR_API_USD),
      fetch(DOLAR_API_EUR)
    ]);

    if (!usdRes.ok) throw new Error(`DolarAPI USD retornó HTTP ${usdRes.status}`);
    if (!eurRes.ok) throw new Error(`DolarAPI EUR retornó HTTP ${eurRes.status}`);

    const usdData = await usdRes.json();
    const eurDataList = await eurRes.json();

    // Buscar la tasa oficial del euro en el array The euro response is an array of sources
    const eurOficial = eurDataList.find((e: any) => e.fuente === 'oficial');

    if (!usdData || !usdData.promedio) {
      throw new Error('DolarAPI no retornó una tasa válida para el dólar');
    }

    const result = {
      success: true,
      data: {
        dollar: usdData.promedio,
        euro: eurOficial ? eurOficial.promedio : null,
        date: new Date(usdData.fechaActualizacion).toISOString().split('T')[0],
        source: 'DOLAR-API-OFICIAL',
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(result), { headers: corsHeaders });

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 502, headers: corsHeaders }
    );
  }
});
