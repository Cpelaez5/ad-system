import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Edge Function: bcv-extra-rates
// Extrae del portal del BCV las tasas de yuan, lira y rublo (y USD/EUR de referencia).
// (Código traído del despliegue v1 el 2026-10-12; antes no estaba en el repo.)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Fetch BCV Website (ignoring SSL errors if possible, though fetch in Deno uses system certs)
    console.log("Fetching BCV website...");

    // Some basic headers to mock a real browser
    const response = await fetch('https://www.bcv.org.ve/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      throw new Error(`BCV website responded with status ${response.status}`);
    }

    const html = await response.text();
    console.log("Successfully fetched HTML. Length:", html.length);

    // 2. Parse HTML using Regex
    // Helper function to extract rate based on container ID
    const extractRate = (htmlStr, containerId) => {
      // Regex looks for <div id="containerId"... then looks for strong-tb class and extracts the number
      const regex = new RegExp(`id="${containerId}"[\\s\\S]*?<strong class="strong-tb">\\s*([\\d,]+)\\s*<\\/strong>`);
      const match = htmlStr.match(regex);
      if (match && match[1]) {
        // Replace comma with dot for valid float parsing
        return parseFloat(match[1].replace(',', '.'));
      }
      return null;
    };

    const cny = extractRate(html, 'yuan');
    const tryRate = extractRate(html, 'lira');
    const rub = extractRate(html, 'rublo');

    // Also extract USD and EUR just in case, but we won't necessarily use them
    const usd = extractRate(html, 'dolar');
    const eur = extractRate(html, 'euro');

    const result = {
      success: true,
      data: {
        yuan: cny,
        lira: tryRate,
        rublo: rub,
        usd_bcv: usd,
        eur_bcv: eur,
        source: 'BCV-WEBSITE-SCRAPER',
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error scraping BCV:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
