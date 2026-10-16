// NOTA (centro de notificaciones): papel_por_vencer ahora también crea avisos en la campanita vía
// notificar() (datos.correo_externo=true para que despachar-notificacion no duplique el correo) y respeta
// preferencias_notificacion.correo. Al desplegar: SIEMPRE un solo archivo (sin imports relativos).
// DESPLIEGUE: el deploy por herramienta solo acepta UN archivo y este index.ts importa ./logica.js.
// Por eso NO se despliega este archivo: se genera el paquete de un solo archivo con
//     node scripts/empaquetar-funcion.mjs avisos-vencimiento
// y se despliega supabase/functions/avisos-vencimiento/dist/index.ts (versionado en git).
// Cada vez que cambies index.ts o logica.js, vuelve a correr ese comando antes de desplegar.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  hoyEnCaracas,
  clasificarDocumentoFiscal,
  clasificarFactura,
  agruparPorCliente,
  mensajeDocumentoFiscal,
  mensajeFactura,
  construirAsunto,
} from "./logica.js";

/**
 * Edge Function: avisos-vencimiento
 *
 * Job diario (invocado por pg_cron vía pg_net, ver migración
 * 20261013110000_avisos_vencimiento.sql) que avisa por correo:
 *  a) documentos de `fiscal_docs` VIGENTES que vencen en 30, 7 o 1 días,
 *     o que vencieron ayer (un solo aviso de "vencido").
 *  b) facturas de suscripción (`system_invoices` pendientes) que vencen
 *     en 3 o 0 días.
 *
 * Un correo por cliente por día con todos sus ítems. Idempotencia vía la
 * tabla `avisos_enviados` (índice único client_id+tipo+referencia_id+dias_antes):
 * se inserta el registro ANTES de enviar el correo con ON CONFLICT DO NOTHING
 * y solo se envía si la fila se insertó de verdad (si ya existía, no se reenvía).
 *
 * Protegida: solo puede invocarla el cron (header `x-cron-secret` == secret
 * de la función) o una llamada con el service_role key.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonError(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Los nombres vienen de la BD (empresa, documento): se escapan antes de ir al HTML.
function escaparHtml(texto: string) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Plantilla HTML corta, móvil primero, mismo estilo que despachar-notificacion ─────────
function buildAvisoHtml(payload: {
  nombreCliente: string;
  mensajes: string[];
  appUrl: string;
}) {
  const { nombreCliente, mensajes, appUrl } = payload;

  const GRANATE = "#8E1818"; // granate AD System
  const CARBON = "#2A2A2E"; // carbón AD System
  const LOGO_URL = "https://adsystemapp.com/ADSystem/png/logo-correo.png"; // PNG 480x103 (los correos no muestran SVG)

  const items = (mensajes || [])
    .map(
      (m) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #E4E4E7;font-size:16px;color:${CARBON};line-height:1.5;">
        ${escaparHtml(m)}
      </td>
    </tr>`
    )
    .join("");

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── 1. Autorización: solo el cron (secret) o service_role ────────────
    const authHeader = req.headers.get("authorization") || "";
    const cronSecretHeader = req.headers.get("x-cron-secret") || "";
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const esServiceRole =
      authHeader === `Bearer ${SERVICE_ROLE_KEY}` && SERVICE_ROLE_KEY.length > 0;
    let esCronValido = !!CRON_SECRET && cronSecretHeader === CRON_SECRET;

    // Sin secret en el entorno de la función: se valida contra Vault ('cron_secret')
    // con una RPC que solo puede ejecutar service_role.
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

    // ─── Modo prueba: correo de ejemplo a una sola dirección, sin tocar la BD ──
    let body: { modo?: string; para?: string } = {};
    try { body = await req.json(); } catch { /* sin body: ejecución normal */ }
    if (body?.modo === "prueba" && typeof body.para === "string" && body.para.includes("@")) {
      const nombre = "Carlos";
      const itemsPrueba = [
        { nombre: "Tu RIF", dias_antes: 7 },
        { nombre: "La licencia de actividad económica", dias_antes: 30 },
      ];
      const mensajes = [
        ...itemsPrueba.map((i) => mensajeDocumentoFiscal(nombre, i)),
        mensajeFactura(nombre, { invoice_number: "INV-PRUEBA", dias_antes: 3 }),
      ];
      const html = buildAvisoHtml({
        nombreCliente: nombre,
        mensajes,
        appUrl: `${APP_URL.replace(/\/$/, "")}/cliente/fiscal-360`,
      });
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [body.para], subject: `[Prueba] ${construirAsunto(mensajes)}`, html }),
      });
      const resultado = await resp.json().catch(() => ({}));
      return new Response(JSON.stringify({ success: resp.ok, modo: "prueba", resend: resp.ok ? { id: resultado?.id } : { error: resultado?.message } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: resp.ok ? 200 : 502,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      SERVICE_ROLE_KEY
    );

    const hoyISO = hoyEnCaracas();

    // ─── 2. Candidatos: documentos fiscales VIGENTES y facturas pendientes ─
    const { data: fiscalDocs, error: errFiscal } = await supabaseAdmin
      .from("fiscal_docs")
      .select("id, client_id, name, doc_type, status, expiration_date")
      .eq("status", "VIGENTE")
      .is("deleted_at", null)
      .not("client_id", "is", null)
      .not("expiration_date", "is", null);

    if (errFiscal) {
      console.error("Error consultando fiscal_docs:", errFiscal.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer los documentos fiscales.", 500);
    }

    const { data: invoices, error: errInvoices } = await supabaseAdmin
      .from("system_invoices")
      .select("id, client_id, invoice_number, status, due_date")
      .eq("status", "pending")
      .not("client_id", "is", null);

    if (errInvoices) {
      console.error("Error consultando system_invoices:", errInvoices.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer las facturas.", 500);
    }

    // ─── 3. Clasificar (¿toca avisar hoy?) ─────────────────────────────────
    type ItemAviso = {
      client_id: string;
      tipo: "fiscal" | "factura";
      referencia_id: string;
      dias_antes: number;
      nombre?: string;
      doc_type?: string;
      invoice_number?: string;
    };

    const itemsAviso: ItemAviso[] = [];

    for (const doc of fiscalDocs ?? []) {
      const diasAntes = clasificarDocumentoFiscal(doc, hoyISO);
      if (diasAntes === null) continue;
      itemsAviso.push({
        client_id: doc.client_id,
        tipo: "fiscal",
        referencia_id: doc.id,
        dias_antes: diasAntes,
        nombre: doc.name,
        doc_type: doc.doc_type,
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
        invoice_number: inv.invoice_number,
      });
    }

    const conteos = {
      candidatos_fiscal: itemsAviso.filter((i) => i.tipo === "fiscal").length,
      candidatos_factura: itemsAviso.filter((i) => i.tipo === "factura").length,
      clientes_procesados: 0,
      correos_enviados: 0,
      items_omitidos_duplicados: 0,
      errores: 0,
    };

    if (itemsAviso.length === 0) {
      return new Response(JSON.stringify({ success: true, ...conteos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ─── 4. Idempotencia por ítem: insertar en avisos_enviados ANTES de
    //        enviar. Solo se incluye en el correo el ítem cuya fila se
    //        insertó de verdad (si ya existía, se omite silenciosamente).
    const itemsAEnviar: ItemAviso[] = [];
    for (const item of itemsAviso) {
      const { data: inserted, error: errInsert } = await supabaseAdmin
        .from("avisos_enviados")
        .insert({
          client_id: item.client_id,
          tipo: item.tipo,
          referencia_id: item.referencia_id,
          dias_antes: item.dias_antes,
        })
        .select("id")
        .maybeSingle();

      if (errInsert) {
        // Conflicto de la restricción única = ya se avisó; cualquier otro
        // error se cuenta pero no detiene el resto del job.
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
        status: 200,
      });
    }

    // ─── 5. Agrupar por cliente y resolver destinatario + nombre ──────────
    const grupos = agruparPorCliente(itemsAEnviar);
    const clientIds = Array.from(grupos.keys());

    const { data: clientes, error: errClientes } = await supabaseAdmin
      .from("clients")
      .select("id, company_name, contact_person, email")
      .in("id", clientIds);

    if (errClientes) {
      console.error("Error consultando clients:", errClientes.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer los clientes.", 500);
    }

    const { data: usuariosCliente, error: errUsuarios } = await supabaseAdmin
      .from("users")
      .select("id, client_id, email")
      .eq("role", "cliente")
      .in("client_id", clientIds)
      .eq("is_active", true);

    if (errUsuarios) {
      console.error("Error consultando users:", errUsuarios.message);
      return jsonError("ERROR_CONSULTA", "No se pudieron leer los usuarios.", 500);
    }

    const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));
    const emailUsuarioPorCliente = new Map<string, string>();
    const idUsuarioPorCliente = new Map<string, string>();
    const idsUsuariosPorCliente = new Map<string, string[]>();
    for (const u of usuariosCliente ?? []) {
      if (u.client_id) idsUsuariosPorCliente.set(u.client_id, [...(idsUsuariosPorCliente.get(u.client_id) ?? []), u.id]);
      if (u.client_id && u.email && !idUsuarioPorCliente.has(u.client_id)) idUsuarioPorCliente.set(u.client_id, u.id);
      // Si hay más de un usuario cliente activo, se usa el primero encontrado.
      if (u.client_id && u.email && !emailUsuarioPorCliente.has(u.client_id)) {
        emailUsuarioPorCliente.set(u.client_id, u.email);
      }
    }

    const appUrlFiscal = `${APP_URL.replace(/\/$/, "")}/cliente/fiscal-360`;

    // Preferencia "papel_por_vencer": quien apagó el correo en Configuración → Avisos no lo recibe.
    // La campanita (notificaciones) sí se crea siempre.
    const todosLosUsuarios = Array.from(idsUsuariosPorCliente.values()).flat();
    const sinCorreo = new Set<string>();
    if (todosLosUsuarios.length > 0) {
      const { data: prefs } = await supabaseAdmin
        .from("preferencias_notificacion")
        .select("user_id")
        .eq("tipo", "papel_por_vencer")
        .eq("correo", false)
        .in("user_id", todosLosUsuarios);
      for (const p of prefs ?? []) sinCorreo.add(p.user_id);
    }

    // ─── 6. Enviar un correo por cliente con todos sus ítems ───────────────
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

      const mensajes = items.map((item) =>
        item.tipo === "fiscal"
          ? mensajeDocumentoFiscal(nombreCliente, item)
          : mensajeFactura(nombreCliente, item)
      );

      const html = buildAvisoHtml({
        nombreCliente,
        mensajes,
        appUrl: appUrlFiscal,
      });
      const subject = construirAsunto(items);

      // Campanita: solo papeles (fiscal). datos.correo_externo = true evita que el despachador
      // mande un segundo correo (este correo lo envía esta función). Un fallo aquí nunca frena el correo.
      const mensajesPapeles = items
        .filter((i) => i.tipo === "fiscal")
        .map((i) => mensajeDocumentoFiscal(nombreCliente, i));
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
            p_agrupar: null,
          });
        } catch (err) {
          console.error("No se pudo crear la notificación de papeles:", (err as Error).message);
        }
      }

      const usuarioDestino = idUsuarioPorCliente.get(clientId);
      if (usuarioDestino && sinCorreo.has(usuarioDestino)) continue; // apagó el correo de este aviso

      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: FROM_EMAIL, to: [destinatario], subject, html }),
        });

        if (!resendResponse.ok) {
          const resultado = await resendResponse.json().catch(() => ({}));
          console.error("Error de Resend al enviar aviso de vencimiento:", resultado?.message);
          conteos.errores++;
          continue;
        }

        conteos.correos_enviados++;
      } catch (err) {
        console.error("Error enviando aviso de vencimiento:", (err as Error).message);
        conteos.errores++;
      }
    }

    return new Response(JSON.stringify({ success: true, ...conteos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error en Edge Function avisos-vencimiento:", (error as Error).message);
    return jsonError("ERROR_INTERNO", "Ocurrió un error al procesar los avisos.", 500);
  }
});
