import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: send-invoice-email
 * Envía correo de notificación al cliente cuando registra un documento en facturación.
 * Usa la API REST de Resend (no requiere SDK — compatible con Deno).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Marca AD System (mismo estilo que despachar-notificacion) ────────────────
const GRANATE = "#8E1818";
const CARBON = "#2A2A2E";
const LOGO_URL = "https://adsystemapp.com/ADSystem/png/logo-correo.png"; // PNG 480x103: los correos no muestran SVG
const APP_URL = "https://adsystemapp.com";

function esc(texto: unknown): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 104036.77 -> "104.036,77" (punto de miles, coma decimal; nunca depende del idioma del servidor). */
function fmtNum(n: unknown): string {
  const v = Number(n);
  const x = Number.isFinite(v) ? v : 0;
  const [ent, dec] = Math.abs(x).toFixed(2).split(".");
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${x < 0 && Number(Math.abs(x).toFixed(2)) !== 0 ? "-" : ""}${miles},${dec}`;
}

/** Monto con su símbolo: Bs 104.036,77 · $ 1.234,56 · € 10,00 */
function fmtMonto(n: unknown, moneda = "VES"): string {
  const simbolo = moneda === "USD" ? "$" : moneda === "EUR" ? "€" : moneda === "VES" || !moneda ? "Bs" : moneda;
  return `${simbolo} ${fmtNum(n)}`;
}

/** 'AAAA-MM-DD' (o ISO) -> 'dd/mm/aaaa' sin correrse de día. */
function fmtFecha(d: string | null | undefined): string {
  if (!d) return "—";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const solo = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) || /T00:00:00(\.0+)?(Z|[+-]00:?00)?$/.test(String(d));
    if (solo) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const f = new Date(d);
  if (isNaN(f.getTime())) return "—";
  const partes = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Caracas" }).formatToParts(f);
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${g("day")}/${g("month")}/${g("year")}`;
}

/** Marco común: logo, línea granate, contenido, pie. Ancho fluido hasta 560 px (sirve en el teléfono). */
function envolverCorreo(contenido: string, pie: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:Montserrat,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:20px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 24px;background-color:#FFFFFF;border-bottom:4px solid ${GRANATE};">
    <a href="${APP_URL}" style="text-decoration:none;"><img src="${LOGO_URL}" alt="AD System" width="168" height="36" style="display:block;width:168px;height:36px;border:0;outline:none;"></a>
  </td></tr>
${contenido}
  <tr><td style="padding:16px 24px;background-color:#F4F4F5;border-top:1px solid #E4E4E7;">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#52525B;">${pie}</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

function boton(url: string, texto: string): string {
  return `  <tr><td style="padding:8px 24px 28px;" align="center">
    <a href="${esc(url)}" style="display:inline-block;background-color:${GRANATE};color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;">${esc(texto)}</a>
  </td></tr>`;
}

const PIE_AUTOMATICO = `Este correo lo generó <strong>AD System</strong> automáticamente. Si no lo esperabas, puedes ignorarlo.`;

// ─── Plantilla: documento registrado ──────────────────────────────────────────
function buildEmailHtml(payload: {
  clientName: string;
  documentType: string;
  invoiceNumber: string;
  controlNumber: string;
  flow: string;
  issueDate: string;
  dueDate: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  subtotal: number;
  taxAmount: number;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  issuer: { name: string; rif: string; address: string };
}) {
  const {
    clientName, documentType, invoiceNumber, controlNumber,
    flow, issueDate, dueDate, status, currency,
    totalAmount, subtotal, taxAmount, issuer,
  } = payload;
  const items = Array.isArray(payload.items) ? payload.items : [];

  const docLabels: Record<string, string> = {
    FACTURA: "Factura", NOTA_ENTREGA: "Nota de entrega", NOTA_CREDITO: "Nota de crédito", NOTA_DEBITO: "Nota de débito",
  };
  const flowLabels: Record<string, string> = { VENTA: "venta", COMPRA: "compra", GASTO: "gasto" };
  const estados: Record<string, string> = { PAGADA: "Pagada", EMITIDA: "Emitida", ENVIADA: "Enviada", BORRADOR: "Borrador", VENCIDA: "Vencida", ANULADA: "Anulada" };
  const docLabel = docLabels[documentType] || esc(documentType || "Documento");
  const flowLabel = flowLabels[flow] || esc(flow || "");
  const moneda = currency || "VES";

  const filas = items.map((item, i) => `
      <tr style="background-color:${i % 2 === 0 ? "#FFFFFF" : "#F7F7F8"};">
        <td style="padding:10px 12px;border-bottom:1px solid #E4E4E7;font-size:14px;line-height:1.4;color:#2A2A2E;">${esc(item.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #E4E4E7;font-size:14px;color:#2A2A2E;text-align:center;">${esc(String(item.quantity ?? 0).replace(".", ","))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E4E7;font-size:14px;color:#2A2A2E;text-align:right;white-space:nowrap;">${fmtNum(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E4E7;font-size:14px;color:#2A2A2E;text-align:right;font-weight:700;white-space:nowrap;">${fmtNum(item.total)}</td>
      </tr>`).join("");

  const emisor = issuer?.name ? `
  <tr><td style="padding:0 24px 16px;">
    <p style="margin:0 0 4px;font-size:12px;color:#52525B;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Emisor</p>
    <p style="margin:0;font-size:15px;line-height:1.5;color:#2A2A2E;">${esc(issuer.name)}${issuer.rif ? ` — ${esc(issuer.rif)}` : ""}</p>
    ${issuer.address ? `<p style="margin:2px 0 0;font-size:13px;line-height:1.5;color:#52525B;">${esc(issuer.address)}</p>` : ""}
  </td></tr>` : "";

  const tabla = items.length > 0 ? `
  <tr><td style="padding:0 24px 16px;">
    <p style="margin:0 0 8px;font-size:12px;color:#52525B;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Detalle</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E4E4E7;border-collapse:collapse;">
      <tr style="background-color:${CARBON};">
        <th align="left" style="padding:10px 12px;font-size:12px;color:#FFFFFF;font-weight:700;">Descripción</th>
        <th style="padding:10px 8px;font-size:12px;color:#FFFFFF;font-weight:700;">Cant.</th>
        <th align="right" style="padding:10px 12px;font-size:12px;color:#FFFFFF;font-weight:700;">P. unit.</th>
        <th align="right" style="padding:10px 12px;font-size:12px;color:#FFFFFF;font-weight:700;">Total</th>
      </tr>${filas}
    </table>
  </td></tr>` : "";

  const contenido = `  <tr><td style="padding:24px 24px 8px;">
    <p style="margin:0 0 6px;font-size:16px;line-height:1.55;color:#2A2A2E;">Hola <strong>${esc(clientName)}</strong>,</p>
    <p style="margin:0;font-size:16px;line-height:1.55;color:#2A2A2E;">Registraste este documento en AD System:</p>
  </td></tr>
  <tr><td style="padding:12px 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${GRANATE};border-radius:8px;">
      <tr><td style="padding:14px 18px;">
        <span style="color:#FFFFFF;font-size:18px;font-weight:700;">${docLabel}${flowLabel ? ` de ${flowLabel}` : ""}</span><br>
        <span style="color:#FFFFFF;font-size:14px;">N.º ${esc(invoiceNumber || "—")}${controlNumber ? ` · Control ${esc(controlNumber)}` : ""}</span>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;">
      <tr>
        <td style="padding:12px 14px;font-size:14px;color:#2A2A2E;"><strong>Emisión</strong><br>${fmtFecha(issueDate)}</td>
        <td style="padding:12px 14px;font-size:14px;color:#2A2A2E;"><strong>Vencimiento</strong><br>${fmtFecha(dueDate)}</td>
        <td style="padding:12px 14px;font-size:14px;color:#2A2A2E;"><strong>Estado</strong><br>${esc(estados[status] || status || "—")}</td>
      </tr>
    </table>
  </td></tr>${emisor}${tabla}
  <tr><td style="padding:0 24px 20px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;">
      <tr>
        <td style="padding:10px 16px;font-size:15px;color:#2A2A2E;">Subtotal</td>
        <td align="right" style="padding:10px 16px;font-size:15px;color:#2A2A2E;white-space:nowrap;">${fmtMonto(subtotal, moneda)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:15px;color:#2A2A2E;border-top:1px solid #E4E4E7;">IVA</td>
        <td align="right" style="padding:10px 16px;font-size:15px;color:#2A2A2E;border-top:1px solid #E4E4E7;white-space:nowrap;">${fmtMonto(taxAmount, moneda)}</td>
      </tr>
      <tr style="background-color:${CARBON};">
        <td style="padding:12px 16px;font-size:16px;color:#FFFFFF;font-weight:700;">TOTAL</td>
        <td align="right" style="padding:12px 16px;font-size:16px;color:#FFFFFF;font-weight:700;white-space:nowrap;">${fmtMonto(totalAmount, moneda)}</td>
      </tr>
    </table>
  </td></tr>
${boton(`${APP_URL}/cliente/facturacion`, "Ver en AD System")}`;

  return envolverCorreo(contenido, PIE_AUTOMATICO);
}

// ─── Plantilla: estado del pago (aprobado / rechazado) al cliente ─────────────
function buildPaymentStatusHtml(payload: {
  clientName: string;
  invoiceNumber: string;
  status: "approved" | "rejected";
  rejectionReason?: string;
  amount: number;
}) {
  const { clientName, invoiceNumber, status, rejectionReason, amount } = payload;
  const aprobado = status === "approved";
  const estado = aprobado ? "aprobado" : "rechazado";

  const detalle = aprobado
    ? `<p style="margin:0;font-size:16px;line-height:1.55;color:#2A2A2E;">La factura quedó marcada como pagada (o abonada). Entra a AD System para ver el estado de tu cuenta y tus recibos.</p>`
    : `${rejectionReason ? `<p style="margin:0 0 10px;font-size:16px;line-height:1.55;color:#2A2A2E;"><strong style="color:${GRANATE};">Motivo:</strong> ${esc(rejectionReason)}</p>` : ""}<p style="margin:0;font-size:16px;line-height:1.55;color:#2A2A2E;">Revisa el motivo, corrige lo que haga falta y vuelve a reportar el pago desde tu portal.</p>`;

  const contenido = `  <tr><td style="padding:24px 24px 8px;">
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#2A2A2E;">Tu pago fue ${estado}</h1>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2A2A2E;">Hola <strong>${esc(clientName)}</strong>, tu reporte de pago por <strong>${fmtMonto(amount, "USD")}</strong> de la factura <strong>${esc(invoiceNumber)}</strong> fue <strong>${estado}</strong>.</p>
  </td></tr>
  <tr><td style="padding:4px 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;border-left:4px solid ${aprobado ? CARBON : GRANATE};">
      <tr><td style="padding:14px 16px;">${detalle}</td></tr>
    </table>
  </td></tr>
${boton(`${APP_URL}/`, "Ir a AD System")}`;
  return envolverCorreo(contenido, PIE_AUTOMATICO);
}

function filaDetalle(etiqueta: string, valor: string, ultima = false): string {
  return `      <tr><td style="padding:12px 16px;font-size:15px;line-height:1.5;color:#2A2A2E;${ultima ? "" : "border-bottom:1px solid #E4E4E7;"}"><strong>${etiqueta}:</strong> ${valor}</td></tr>`;
}

// ─── Plantilla: reporte de pago (al super admin) ──────────────────────────────
function buildPaymentReportHtml(payload: {
  clientName: string;
  planName: string;
  billingPeriod: string;
  amountUsd: number;
  amountBs: number | null;
  bcvRate: number | null;
  paymentMethod: string;
  reference: string;
  reportId: string;
}) {
  const { clientName, planName, billingPeriod, amountUsd, amountBs, bcvRate, paymentMethod, reference, reportId } = payload;
  const filas = [
    filaDetalle("Plan", `${esc(planName)}${billingPeriod ? ` (${esc(billingPeriod)})` : ""}`),
    filaDetalle("Monto reportado", fmtMonto(amountUsd, "USD")),
    amountBs ? filaDetalle("Equivale a", `${fmtMonto(amountBs, "VES")}${bcvRate ? `<br><span style="font-size:13px;color:#52525B;">Tasa BCV usada: ${fmtMonto(bcvRate, "VES")} por dólar</span>` : ""}`) : "",
    filaDetalle("Método", esc(paymentMethod || "—")),
    filaDetalle("Referencia", esc(reference || "—"), true),
  ].filter(Boolean).join("\n");

  const contenido = `  <tr><td style="padding:24px 24px 8px;">
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#2A2A2E;">Nuevo pago reportado</h1>
    <p style="margin:0;font-size:16px;line-height:1.55;color:#2A2A2E;"><strong>${esc(clientName)}</strong> reportó el pago de una suscripción.</p>
  </td></tr>
  <tr><td style="padding:12px 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;">
${filas}
    </table>
  </td></tr>
${boton(`${APP_URL}/admin/facturacion-sistema?report_id=${encodeURIComponent(String(reportId ?? ""))}`, "Ver reporte y aprobar")}`;
  return envolverCorreo(contenido, PIE_AUTOMATICO);
}

// ─── Plantilla: recibimos tu reporte de pago (al cliente) ─────────────────────
function buildPaymentReceivedHtml(payload: {
  clientName: string;
  planName: string;
  amountUsd: number;
  amountBs: number | null;
  paymentMethod: string;
  reference: string;
}) {
  const { clientName, planName, amountUsd, amountBs, paymentMethod, reference } = payload;
  const filas = [
    filaDetalle("Plan", esc(planName || "—")),
    filaDetalle("Monto", fmtMonto(amountUsd, "USD")),
    amountBs ? filaDetalle("Equivale a", fmtMonto(amountBs, "VES")) : "",
    filaDetalle("Método", esc(paymentMethod || "—")),
    filaDetalle("Referencia", esc(reference || "—"), true),
  ].filter(Boolean).join("\n");

  const contenido = `  <tr><td style="padding:24px 24px 8px;">
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.35;color:#2A2A2E;">Recibimos tu reporte de pago</h1>
    <p style="margin:0;font-size:16px;line-height:1.55;color:#2A2A2E;">Hola <strong>${esc(clientName)}</strong>, ya tenemos tu reporte. Lo revisamos y te avisamos por aquí cuando esté aprobado.</p>
  </td></tr>
  <tr><td style="padding:12px 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;">
${filas}
    </table>
  </td></tr>
${boton(`${APP_URL}/`, "Ir a AD System")}`;
  return envolverCorreo(contenido, PIE_AUTOMATICO);
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY no está configurada en los secrets de la Edge Function");
    }

    // Determinar remitente: usar dominio verificado si existe, o fallback a onboarding
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "AD System <onboarding@resend.dev>";

    const payload = await req.json();
    const mode = payload.mode || "invoice"; // invoice, payment_report

    if (mode === "payment_report") {
      // ─── Modo: Reporte de Pago al Super Admin ────────────────────────────────
      const { report_id, client_name, plan_name, billing_period, amount_usd, amount_bs, bcv_rate, payment_method, reference } = payload;
      
      // Buscar super admins y sus correos
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Obtener todos los super_admin
      const { data: superAdmins } = await supabaseAdmin.from("users").select("id, email").eq("role", "super_admin");
      
      if (!superAdmins || superAdmins.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No super admins found" }), { headers: corsHeaders, status: 200 });
      }

      let emailsToNotify = new Set<string>();

      // Por cada super admin, buscar sus user_preferences
      for (const admin of superAdmins) {
        const { data: prefs } = await supabaseAdmin
          .from("user_preferences")
          .select("preference_value")
          .eq("user_id", admin.id)
          .eq("preference_key", "user_settings")
          .maybeSingle();
        
        const settings = prefs?.preference_value || {};
        if (settings.notifyOnPaymentReport !== false) {
           emailsToNotify.add(admin.email);
        }
        
        if (settings.paymentReportEmails && Array.isArray(settings.paymentReportEmails)) {
          settings.paymentReportEmails.forEach((e: any) => {
            if (e.email) emailsToNotify.add(e.email);
          });
        }
      }

      const toEmails = Array.from(emailsToNotify);
      if (toEmails.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No emails configured to receive" }), { headers: corsHeaders, status: 200 });
      }

      const html = buildPaymentReportHtml({
         clientName: client_name,
         planName: plan_name,
         billingPeriod: billing_period,
         amountUsd: amount_usd,
         amountBs: amount_bs,
         bcvRate: bcv_rate,
         paymentMethod: payment_method,
         reference: reference,
         reportId: report_id
      });
      const subject = `Nuevo pago reportado: ${client_name}`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: toEmails, subject, html }),
      });

      const resendResult = await resendResponse.json();
      if (!resendResponse.ok) throw new Error(`Resend error: ${resendResult?.message}`);

      return new Response(JSON.stringify({ success: true, message: "Report notification sent" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (mode === "payment_status_update") {
      // ─── Modo: Actualización del Estado del Pago (Aprobado/Rechazado) al Cliente ────────────────
      const { to, client_name, invoice_number, status, rejection_reason, amount } = payload;
      
      if (!to) {
        throw new Error("Campo 'to' (email destino) es requerido");
      }

      const html = buildPaymentStatusHtml({
         clientName: client_name,
         invoiceNumber: invoice_number,
         status: status,
         rejectionReason: rejection_reason,
         amount: amount
      });
      
      const statusLabel = status === 'approved' ? 'Aprobado' : 'Rechazado';
      const subject = `El estado de tu pago ha cambiado: ${statusLabel}`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
      });

      const resendResult = await resendResponse.json();
      if (!resendResponse.ok) throw new Error(`Resend error: ${resendResult?.message}`);

      return new Response(JSON.stringify({ success: true, message: "Payment status update sent to client" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    if (mode === "payment_received") {
      // ─── Modo: Reporte de Pago Recibido (Al Cliente) ──────────────────────
      const { to, client_name, plan_name, amount_usd, amount_bs, payment_method, reference } = payload;
      
      if (!to) {
        throw new Error("Campo 'to' (email destino) es requerido");
      }

      const html = buildPaymentReceivedHtml({
         clientName: client_name,
         planName: plan_name,
         amountUsd: amount_usd,
         amountBs: amount_bs,
         paymentMethod: payment_method,
         reference: reference
      });
      
      const subject = `Recibimos tu reporte de pago — AD System`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
      });

      const resendResult = await resendResponse.json();
      if (!resendResponse.ok) throw new Error(`Resend error: ${resendResult?.message}`);

      return new Response(JSON.stringify({ success: true, message: "Payment received notification sent to client" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // ─── Modo: Factura Normal (por defecto) ───────────────────────────────────
    const { to, attachments: attachmentUrls, ...emailData } = payload;

    if (!to) {
      throw new Error("Campo 'to' (email destino) es requerido");
    }

    // Construir HTML del correo
    const html = buildEmailHtml(emailData);
    const subject = `${emailData.documentType || "Documento"} ${emailData.invoiceNumber || ""} registrado en AD System`;

    // Preparar adjuntos: descargar cada URL y convertir a base64
    const resendAttachments: { filename: string; content: string }[] = [];

    if (attachmentUrls && Array.isArray(attachmentUrls)) {
      for (const att of attachmentUrls) {
        if (!att.url) continue;
        try {
          console.log(`📎 Descargando adjunto: ${att.name} desde ${att.url}`);
          const fileResponse = await fetch(att.url);
          if (fileResponse.ok) {
            const buffer = await fileResponse.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
            );
            resendAttachments.push({
              filename: att.name || "adjunto",
              content: base64,
            });
            console.log(`✅ Adjunto procesado: ${att.name} (${buffer.byteLength} bytes)`);
          } else {
            console.warn(`⚠️ No se pudo descargar adjunto ${att.name}: ${fileResponse.status}`);
          }
        } catch (err) {
          console.warn(`⚠️ Error descargando adjunto ${att.name}:`, err);
        }
      }
    }

    // Enviar vía Resend REST API
    const resendPayload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    };

    if (resendAttachments.length > 0) {
      resendPayload.attachments = resendAttachments;
    }

    console.log(`📧 Enviando correo a ${to} vía Resend...`);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("❌ Error de Resend:", resendResult);
      throw new Error(`Resend error: ${resendResult?.message || JSON.stringify(resendResult)}`);
    }

    console.log("✅ Correo enviado exitosamente:", resendResult);

    return new Response(
      JSON.stringify({ success: true, emailId: resendResult.id, message: "Correo enviado" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error en Edge Function send-invoice-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
