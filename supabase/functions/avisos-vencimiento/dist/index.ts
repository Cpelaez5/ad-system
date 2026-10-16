// ARCHIVO GENERADO por scripts/empaquetar-funcion.mjs a partir de index.ts + sus imports locales.
// NO editar a mano: cambia el origen y vuelve a correr "node scripts/empaquetar-funcion.mjs avisos-vencimiento".
// Este es el archivo que se despliega (un solo archivo).

// supabase/functions/avisos-vencimiento/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// supabase/functions/avisos-vencimiento/logica.js
var ZONA_CARACAS = "America/Caracas";
var DIAS_AVISO_FISCAL = [30, 7, 1];
var DIAS_VENCIDO_FISCAL = -1;
var DIAS_AVISO_FACTURA = [3, 0];
function hoyEnCaracas(referencia = /* @__PURE__ */ new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_CARACAS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(referencia);
  const obtener = (tipo) => partes.find((p) => p.type === tipo)?.value;
  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}
function diferenciaEnDias(fechaISO, hoyISO) {
  if (!fechaISO || !hoyISO) return null;
  const fecha = /* @__PURE__ */ new Date(`${fechaISO}T00:00:00Z`);
  const hoy = /* @__PURE__ */ new Date(`${hoyISO}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || Number.isNaN(hoy.getTime())) return null;
  const MS_POR_DIA = 1e3 * 60 * 60 * 24;
  return Math.round((fecha.getTime() - hoy.getTime()) / MS_POR_DIA);
}
function clasificarDocumentoFiscal(doc, hoyISO) {
  if (!doc || doc.status !== "VIGENTE" || !doc.expiration_date) return null;
  const diff = diferenciaEnDias(doc.expiration_date, hoyISO);
  if (diff === null) return null;
  if (DIAS_AVISO_FISCAL.includes(diff)) return diff;
  if (diff === DIAS_VENCIDO_FISCAL) return DIAS_VENCIDO_FISCAL;
  return null;
}
function clasificarFactura(invoice, hoyISO) {
  if (!invoice || invoice.status !== "pending" || !invoice.due_date) return null;
  const diff = diferenciaEnDias(invoice.due_date, hoyISO);
  if (diff === null) return null;
  if (DIAS_AVISO_FACTURA.includes(diff)) return diff;
  return null;
}
function agruparPorCliente(items) {
  const grupos = /* @__PURE__ */ new Map();
  for (const item of items) {
    if (!item?.client_id) continue;
    if (!grupos.has(item.client_id)) grupos.set(item.client_id, []);
    grupos.get(item.client_id).push(item);
  }
  return grupos;
}
function textoVencimiento(diasAntes) {
  if (diasAntes === DIAS_VENCIDO_FISCAL) return "venció ayer";
  if (diasAntes === 0) return "vence hoy";
  if (diasAntes === 1) return "vence en 1 día";
  return `vence en ${diasAntes} días`;
}
function mensajeDocumentoFiscal(nombreCliente, item) {
  const nombreDoc = item.nombre || item.doc_type || "tu documento";
  const accion = item.dias_antes === DIAS_VENCIDO_FISCAL ? "Renuévalo lo antes posible para evitar multas." : "Renovarlo a tiempo evita multas.";
  const doc = nombreDoc.charAt(0).toUpperCase() + nombreDoc.slice(1);
  return `${doc} ${textoVencimiento(item.dias_antes)}. ${accion}`;
}
function mensajeFactura(nombreCliente, item) {
  const ref = item.invoice_number ? ` (${item.invoice_number})` : "";
  return `Tu factura de suscripción${ref} ${textoVencimiento(item.dias_antes)}.`;
}
function construirAsunto(items) {
  if (items.length === 1) return "Aviso de vencimiento — AD System";
  return `Tienes ${items.length} avisos de vencimiento — AD System`;
}

// supabase/functions/avisos-vencimiento/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret"
};
function jsonError(code, message, status = 400) {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
function escaparHtml(texto) {
  return String(texto ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function buildAvisoHtml(payload) {
  const { nombreCliente, mensajes, appUrl } = payload;
  const GRANATE = "#8E1818";
  const CARBON = "#2A2A2E";
  const LOGO_URL = "https://adsystemapp.com/ADSystem/png/logo-correo.png";
  const items = (mensajes || []).map(
    (m) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #E4E4E7;font-size:16px;color:${CARBON};line-height:1.5;">
        ${escaparHtml(m)}
      </td>
    </tr>`
  ).join("");
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:Montserrat,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:20px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 24px;background-color:#FFFFFF;border-bottom:4px solid ${GRANATE};">
    <a href="${escaparHtml(appUrl)}" style="text-decoration:none;"><img src="${LOGO_URL}" alt="AD System" width="168" height="36" style="display:block;width:168px;height:36px;border:0;outline:none;"></a>
  </td></tr>
  <tr><td style="padding:24px 24px 8px;">
    <p style="margin:0 0 8px;font-size:16px;line-height:1.55;color:${CARBON};">Hola <strong>${escaparHtml(nombreCliente)}</strong>,</p>
    <p style="margin:0;font-size:16px;line-height:1.55;color:${CARBON};">Tienes pendientes de atender:</p>
  </td></tr>
  <tr><td style="padding:8px 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;">
      ${items}
    </table>
  </td></tr>
  <tr><td style="padding:8px 24px 28px;" align="center">
    <a href="${escaparHtml(appUrl)}" style="display:inline-block;background-color:${GRANATE};color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;">Ver mis papeles</a>
  </td></tr>
  <tr><td style="padding:16px 24px;background-color:#F4F4F5;border-top:1px solid #E4E4E7;">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#52525B;">Aviso automático de <strong>AD System</strong>. Puedes cambiar estos avisos en Configuración → Avisos.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("authorization") || "";
    const cronSecretHeader = req.headers.get("x-cron-secret") || "";
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const esServiceRole = authHeader === `Bearer ${SERVICE_ROLE_KEY}` && SERVICE_ROLE_KEY.length > 0;
    let esCronValido = !!CRON_SECRET && cronSecretHeader === CRON_SECRET;
    if (!esCronValido && !CRON_SECRET && cronSecretHeader) {
      const clienteVerificacion = createClient(Deno.env.get("SUPABASE_URL") ?? "", SERVICE_ROLE_KEY);
      const { data: coincide } = await clienteVerificacion.rpc("verificar_cron_secret", { p_secret: cronSecretHeader });
      esCronValido = coincide === true;
    }
    if (!esServiceRole && !esCronValido) {
      return jsonError(
        "NO_AUTORIZADO",
        "Esta función solo puede invocarla el job programado.",
        401
      );
    }
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return jsonError(
        "CONFIG_FALTANTE",
        "RESEND_API_KEY no está configurada en los secrets de la función.",
        500
      );
    }
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "AD System <onboarding@resend.dev>";
    const APP_URL = Deno.env.get("APP_URL") || "https://adsystemapp.com";
    let body = {};
    try {
      body = await req.json();
    } catch {
    }
    if (body?.modo === "prueba" && typeof body.para === "string" && body.para.includes("@")) {
      const nombre = "Carlos";
      const itemsPrueba = [
        { nombre: "Tu RIF", dias_antes: 7 },
        { nombre: "La licencia de actividad económica", dias_antes: 30 }
      ];
      const mensajes = [
        ...itemsPrueba.map((i) => mensajeDocumentoFiscal(nombre, i)),
        mensajeFactura(nombre, { invoice_number: "INV-PRUEBA", dias_antes: 3 })
      ];
      const html = buildAvisoHtml({
        nombreCliente: nombre,
        mensajes,
        appUrl: `${APP_URL.replace(/\/$/, "")}/cliente/fiscal-360`
      });
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [body.para], subject: `[Prueba] ${construirAsunto(mensajes)}`, html })
      });
      const resultado = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify({ success: resp.ok, modo: "prueba", resend: resp.ok ? { id: resultado?.id } : { error: resultado?.message } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: resp.ok ? 200 : 502
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      SERVICE_ROLE_KEY
    );
    const hoyISO = hoyEnCaracas();
    const { data: fiscalDocs, error: errFiscal } = await supabaseAdmin.from("fiscal_docs").select("id, client_id, name, doc_type, status, expiration_date").eq("status", "VIGENTE").is("deleted_at", null).not("client_id", "is", null).not("expiration_date", "is", null);
    if (errFiscal) {
      console.error("Error consultando fiscal_docs:", errFiscal.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer los documentos fiscales.", 500);
    }
    const { data: invoices, error: errInvoices } = await supabaseAdmin.from("system_invoices").select("id, client_id, invoice_number, status, due_date").eq("status", "pending").not("client_id", "is", null);
    if (errInvoices) {
      console.error("Error consultando system_invoices:", errInvoices.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer las facturas.", 500);
    }
    const itemsAviso = [];
    for (const doc of fiscalDocs ?? []) {
      const diasAntes = clasificarDocumentoFiscal(doc, hoyISO);
      if (diasAntes === null) continue;
      itemsAviso.push({
        client_id: doc.client_id,
        tipo: "fiscal",
        referencia_id: doc.id,
        dias_antes: diasAntes,
        nombre: doc.name,
        doc_type: doc.doc_type
      });
    }
    for (const inv of invoices ?? []) {
      const diasAntes = clasificarFactura(inv, hoyISO);
      if (diasAntes === null) continue;
      itemsAviso.push({
        client_id: inv.client_id,
        tipo: "factura",
        referencia_id: inv.id,
        dias_antes: diasAntes,
        invoice_number: inv.invoice_number
      });
    }
    const conteos = {
      candidatos_fiscal: itemsAviso.filter((i) => i.tipo === "fiscal").length,
      candidatos_factura: itemsAviso.filter((i) => i.tipo === "factura").length,
      clientes_procesados: 0,
      correos_enviados: 0,
      items_omitidos_duplicados: 0,
      errores: 0
    };
    if (itemsAviso.length === 0) {
      return new Response(JSON.stringify({ success: true, ...conteos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }
    const itemsAEnviar = [];
    for (const item of itemsAviso) {
      const { data: inserted, error: errInsert } = await supabaseAdmin.from("avisos_enviados").insert({
        client_id: item.client_id,
        tipo: item.tipo,
        referencia_id: item.referencia_id,
        dias_antes: item.dias_antes
      }).select("id").maybeSingle();
      if (errInsert) {
        if (errInsert.code === "23505") {
          conteos.items_omitidos_duplicados++;
        } else {
          console.error("Error insertando avisos_enviados:", errInsert.message);
          conteos.errores++;
        }
        continue;
      }
      if (inserted) {
        itemsAEnviar.push(item);
      } else {
        conteos.items_omitidos_duplicados++;
      }
    }
    if (itemsAEnviar.length === 0) {
      return new Response(JSON.stringify({ success: true, ...conteos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }
    const grupos = agruparPorCliente(itemsAEnviar);
    const clientIds = Array.from(grupos.keys());
    const { data: clientes, error: errClientes } = await supabaseAdmin.from("clients").select("id, company_name, contact_person, email").in("id", clientIds);
    if (errClientes) {
      console.error("Error consultando clients:", errClientes.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer los clientes.", 500);
    }
    const { data: usuariosCliente, error: errUsuarios } = await supabaseAdmin.from("users").select("id, client_id, email").eq("role", "cliente").in("client_id", clientIds).eq("is_active", true);
    if (errUsuarios) {
      console.error("Error consultando users:", errUsuarios.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer los usuarios.", 500);
    }
    const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));
    const emailUsuarioPorCliente = /* @__PURE__ */ new Map();
    const idUsuarioPorCliente = /* @__PURE__ */ new Map();
    const idsUsuariosPorCliente = /* @__PURE__ */ new Map();
    for (const u of usuariosCliente ?? []) {
      if (u.client_id) idsUsuariosPorCliente.set(u.client_id, [...idsUsuariosPorCliente.get(u.client_id) ?? [], u.id]);
      if (u.client_id && u.email && !idUsuarioPorCliente.has(u.client_id)) idUsuarioPorCliente.set(u.client_id, u.id);
      if (u.client_id && u.email && !emailUsuarioPorCliente.has(u.client_id)) {
        emailUsuarioPorCliente.set(u.client_id, u.email);
      }
    }
    const appUrlFiscal = `${APP_URL.replace(/\/$/, "")}/cliente/fiscal-360`;
    const todosLosUsuarios = Array.from(idsUsuariosPorCliente.values()).flat();
    const sinCorreo = /* @__PURE__ */ new Set();
    if (todosLosUsuarios.length > 0) {
      const { data: prefs } = await supabaseAdmin.from("preferencias_notificacion").select("user_id").eq("tipo", "papel_por_vencer").eq("correo", false).in("user_id", todosLosUsuarios);
      for (const p of prefs ?? []) sinCorreo.add(p.user_id);
    }
    for (const [clientId, items] of grupos) {
      conteos.clientes_procesados++;
      const cliente = clientePorId.get(clientId);
      const destinatario = emailUsuarioPorCliente.get(clientId) || cliente?.email;
      if (!destinatario) {
        console.warn("Cliente sin correo de destino disponible, se omite el aviso.");
        conteos.errores++;
        continue;
      }
      const nombreCliente = cliente?.contact_person || cliente?.company_name || "cliente";
      const mensajes = items.map(
        (item) => item.tipo === "fiscal" ? mensajeDocumentoFiscal(nombreCliente, item) : mensajeFactura(nombreCliente, item)
      );
      const html = buildAvisoHtml({
        nombreCliente,
        mensajes,
        appUrl: appUrlFiscal
      });
      const subject = construirAsunto(items);
      const mensajesPapeles = items.filter((i) => i.tipo === "fiscal").map((i) => mensajeDocumentoFiscal(nombreCliente, i));
      const idsCampanita = idsUsuariosPorCliente.get(clientId) ?? [];
      if (mensajesPapeles.length > 0 && idsCampanita.length > 0) {
        try {
          await supabaseAdmin.rpc("notificar", {
            p_user_ids: idsCampanita,
            p_tipo: "papel_por_vencer",
            p_titulo: mensajesPapeles.length === 1 ? mensajesPapeles[0] : `Tienes ${mensajesPapeles.length} papeles por atender`,
            p_cuerpo: mensajesPapeles.join(" "),
            p_url: "/cliente/fiscal-360",
            p_datos: { correo_externo: true },
            p_agrupar: null
          });
        } catch (err) {
          console.error("No se pudo crear la notificación de papeles:", err.message);
        }
      }
      const usuarioDestino = idUsuarioPorCliente.get(clientId);
      if (usuarioDestino && sinCorreo.has(usuarioDestino)) continue;
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ from: FROM_EMAIL, to: [destinatario], subject, html })
        });
        if (!resendResponse.ok) {
          const resultado = await resendResponse.json().catch(() => ({}));
          console.error("Error de Resend al enviar aviso de vencimiento:", resultado?.message);
          conteos.errores++;
          continue;
        }
        conteos.correos_enviados++;
      } catch (err) {
        console.error("Error enviando aviso de vencimiento:", err.message);
        conteos.errores++;
      }
    }
    return new Response(JSON.stringify({ success: true, ...conteos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error("Error en Edge Function avisos-vencimiento:", error.message);
    return jsonError("ERROR_INTERNO", "Ocurrió un error al procesar los avisos.", 500);
  }
});
