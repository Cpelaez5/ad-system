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

// ─── Plantilla HTML del correo ────────────────────────────────────────────────
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
    totalAmount, subtotal, taxAmount, items, issuer,
  } = payload;

  // Etiqueta legible del tipo de documento
  const docLabels: Record<string, string> = {
    FACTURA: "Factura",
    NOTA_ENTREGA: "Nota de Entrega",
    NOTA_CREDITO: "Nota de Crédito",
    NOTA_DEBITO: "Nota de Débito",
  };
  const docLabel = docLabels[documentType] || documentType;

  const flowLabels: Record<string, string> = {
    VENTA: "Venta",
    COMPRA: "Compra",
    GASTO: "Gasto",
  };
  const flowLabel = flowLabels[flow] || flow;

  // Formateo de montos
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("es-VE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  // Colores corporativos
  const PRIMARY = "#A81C22";
  const SECONDARY = "#1F355C";
  const ACCENT = "#E0B04F";
  const BG = "#f7f7f7";
  const LOGO_URL = "https://adsystemapp.com/icon-adaptableV2.svg";

  // Filas de ítems
  const itemRows = items
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? "#ffffff" : "#f9f9f9"};">
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#333;">${item.description}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;">${fmt(item.unitPrice)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;font-weight:600;">${fmt(item.total)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:${SECONDARY};padding:28px 32px;text-align:center;">
      <img src="${LOGO_URL}" alt="AD System" height="48" style="display:inline-block;vertical-align:middle;margin-right:12px;">
      <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">AD System</span>
    </td>
  </tr>

  <!-- Línea decorativa dorada -->
  <tr><td style="background:${ACCENT};height:4px;"></td></tr>

  <!-- Saludo -->
  <tr>
    <td style="padding:28px 32px 12px;">
      <p style="margin:0;font-size:16px;color:#333;">Hola <strong>${clientName}</strong>,</p>
      <p style="margin:8px 0 0;font-size:15px;color:#555;">Se ha registrado el siguiente documento exitosamente en AD System:</p>
    </td>
  </tr>

  <!-- Badge del documento -->
  <tr>
    <td style="padding:8px 32px 20px;">
      <table cellpadding="0" cellspacing="0" style="background:${PRIMARY};border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:14px 24px;">
            <span style="color:#fff;font-size:18px;font-weight:700;">${docLabel} de ${flowLabel}</span>
            <br>
            <span style="color:rgba(255,255,255,0.85);font-size:14px;">N° ${invoiceNumber}${controlNumber ? ` — Control: ${controlNumber}` : ""}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Info general -->
  <tr>
    <td style="padding:0 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;font-size:13px;color:#666;border-right:1px solid #e0e0e0;">
            <strong style="color:${SECONDARY};">Fecha Emisión</strong><br>${fmtDate(issueDate)}
          </td>
          <td style="padding:14px 18px;font-size:13px;color:#666;border-right:1px solid #e0e0e0;">
            <strong style="color:${SECONDARY};">Vencimiento</strong><br>${fmtDate(dueDate)}
          </td>
          <td style="padding:14px 18px;font-size:13px;color:#666;">
            <strong style="color:${SECONDARY};">Estado</strong><br>
            <span style="display:inline-block;background:${status === "PAGADA" ? "#27ae60" : status === "EMITIDA" ? PRIMARY : "#888"};color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${status}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${issuer.name ? `
  <!-- Datos del emisor -->
  <tr>
    <td style="padding:0 32px 20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Emisor</p>
      <p style="margin:0;font-size:14px;color:#333;">${issuer.name}${issuer.rif ? ` — ${issuer.rif}` : ""}</p>
      ${issuer.address ? `<p style="margin:2px 0 0;font-size:13px;color:#666;">${issuer.address}</p>` : ""}
    </td>
  </tr>` : ""}

  <!-- Tabla de ítems -->
  ${items.length > 0 ? `
  <tr>
    <td style="padding:0 32px 20px;">
      <p style="margin:0 0 10px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Detalle de conceptos</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
        <tr style="background:${SECONDARY};">
          <th style="padding:10px 14px;text-align:left;font-size:12px;color:#fff;font-weight:600;text-transform:uppercase;">Descripción</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;color:#fff;font-weight:600;text-transform:uppercase;">Cant.</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;color:#fff;font-weight:600;text-transform:uppercase;">P. Unit.</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;color:#fff;font-weight:600;text-transform:uppercase;">Total</th>
        </tr>
        ${itemRows}
      </table>
    </td>
  </tr>` : ""}

  <!-- Resumen financiero -->
  <tr>
    <td style="padding:0 32px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%"></td>
          <td width="50%">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#555;">Subtotal</td>
                <td style="padding:10px 16px;font-size:14px;color:#333;text-align:right;">${currency} ${fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#555;border-top:1px solid #e0e0e0;">IVA</td>
                <td style="padding:10px 16px;font-size:14px;color:#333;text-align:right;border-top:1px solid #e0e0e0;">${currency} ${fmt(taxAmount)}</td>
              </tr>
              <tr style="background:${PRIMARY};">
                <td style="padding:12px 16px;font-size:16px;color:#fff;font-weight:700;">TOTAL</td>
                <td style="padding:12px 16px;font-size:16px;color:#fff;font-weight:700;text-align:right;">${currency} ${fmt(totalAmount)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 32px 28px;text-align:center;">
      <a href="https://adsystemapp.com/cliente/facturacion" style="display:inline-block;background:${PRIMARY};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver en AD System</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:${SECONDARY};padding:20px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);">Este correo fue generado automáticamente por <strong style="color:${ACCENT};">AD System</strong>.</p>
      <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">AD Business Group LLC — info@adbusinessgroup.com</p>
    </td>
  </tr>

</table>
</td></tr></table>
</body>
</html>`;
}

// ─── Plantilla HTML para Notificación de Estado de Pago (Aprobado/Rechazado) al Cliente ──────────────
function buildPaymentStatusHtml(payload: {
  clientName: string;
  invoiceNumber: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  amount: number;
}) {
  const { clientName, invoiceNumber, status, rejectionReason, amount } = payload;
  
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const PRIMARY = "#A81C22";
  const SECONDARY = "#1F355C";
  const ACCENT = "#E0B04F";
  const BG = "#f7f7f7";
  const LOGO_URL = "https://adsystemapp.com/icon-adaptableV2.svg";

  const isApproved = status === 'approved';
  const statusColor = isApproved ? "#4CAF50" : PRIMARY;
  const statusText = isApproved ? "Aprobado" : "Rechazado";
  const iconUrl = isApproved 
    ? "https://cdn-icons-png.flaticon.com/512/190/190411.png" 
    : "https://cdn-icons-png.flaticon.com/512/190/190406.png";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  
  <!-- Header -->
  <tr>
    <td style="background:${SECONDARY};padding:28px 32px;text-align:center;">
      <img src="${LOGO_URL}" alt="AD System" height="48" style="display:inline-block;vertical-align:middle;margin-right:12px;">
      <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">AD System</span>
    </td>
  </tr>
  <!-- Línea decorativa dorada -->
  <tr><td style="background:${ACCENT};height:4px;"></td></tr>

  <!-- Contenido -->
  <tr>
    <td style="padding:32px 32px 12px;text-align:center;">
      <img src="${iconUrl}" width="64" style="margin-bottom:16px;">
      <h2 style="margin:0;font-size:24px;color:${statusColor};">Pago ${statusText}</h2>
      <p style="margin:16px 0 0;font-size:16px;color:#444;line-height:1.5;text-align:left;">
        Hola <strong>${clientName}</strong>, tu reporte de pago por <strong>$${fmt(amount)}</strong> asociado a la factura <strong>${invoiceNumber}</strong> ha sido <strong>${statusText.toLowerCase()}</strong>.
      </p>
    </td>
  </tr>

  <!-- Detalles -->
  <tr>
    <td style="padding:10px 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;border-radius:8px;">
        ${!isApproved && rejectionReason ? `
        <tr>
          <td style="padding:16px 18px;font-size:15px;color:#333;">
            <strong style="color:${PRIMARY};">Motivo del rechazo:</strong><br>
            <span style="display:block;margin-top:4px;color:#555;">${rejectionReason}</span>
          </td>
        </tr>
        ` : ''}
        ${isApproved ? `
        <tr>
          <td style="padding:16px 18px;font-size:15px;color:#333;">
            La factura ha sido marcada como pagada (o abonada). Puedes iniciar sesión para ver el estado de tu cuenta y acceder a tus recibos.
          </td>
        </tr>
        ` : `
        <tr>
          <td style="padding:16px 18px;font-size:15px;color:#333;border-top:1px solid #e0e0e0;">
            Por favor, revisa el motivo, corrige cualquier información necesaria y vuelve a reportar el pago desde tu portal de cliente.
          </td>
        </tr>
        `}
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 32px 32px;text-align:center;">
      <a href="https://adsystemapp.com/" style="display:inline-block;background:${isApproved ? SECONDARY : PRIMARY};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Ir al Portal</a>
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`;
}

// ─── Plantilla HTML para Notificación de Reporte de Pago ──────────────
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
  
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const fmtBs = (n: number) =>
    new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

  const PRIMARY = "#A81C22";
  const SECONDARY = "#1F355C";
  const ACCENT = "#E0B04F";
  const BG = "#f7f7f7";
  const LOGO_URL = "https://adsystemapp.com/icon-adaptableV2.svg";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  
  <!-- Header -->
  <tr>
    <td style="background:${SECONDARY};padding:28px 32px;text-align:center;">
      <img src="${LOGO_URL}" alt="AD System" height="48" style="display:inline-block;vertical-align:middle;margin-right:12px;">
      <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">AD System</span>
    </td>
  </tr>
  <!-- Línea decorativa dorada -->
  <tr><td style="background:${ACCENT};height:4px;"></td></tr>

  <!-- Contenido -->
  <tr>
    <td style="padding:28px 32px 12px;">
      <h2 style="margin:0;font-size:20px;color:${SECONDARY};">¡Nuevo Pago Reportado!</h2>
      <p style="margin:12px 0 0;font-size:15px;color:#555;">El cliente <strong>${clientName}</strong> ha reportado el pago de una suscripción.</p>
    </td>
  </tr>

  <!-- Detalles -->
  <tr>
    <td style="padding:10px 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;border-radius:8px;">
        <tr>
          <td style="padding:14px 18px;font-size:14px;color:#333;border-bottom:1px solid #e0e0e0;">
            <strong style="color:${SECONDARY};">Plan:</strong> ${planName} (${billingPeriod})
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;font-size:14px;color:#333;border-bottom:1px solid #e0e0e0;">
            <strong style="color:${SECONDARY};">Monto Reportado (USD):</strong> $${fmt(amountUsd)}
          </td>
        </tr>
        ${amountBs ? `
        <tr>
          <td style="padding:14px 18px;font-size:14px;color:#333;border-bottom:1px solid #e0e0e0;">
            <strong style="color:${SECONDARY};">Monto en Bolívares (Pago Móvil):</strong> Bs. ${fmtBs(amountBs)} <br/>
            <span style="font-size:12px;color:#777;">Tasa BCV usada: Bs. ${bcvRate}</span>
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding:14px 18px;font-size:14px;color:#333;border-bottom:1px solid #e0e0e0;">
            <strong style="color:${SECONDARY};">Método:</strong> ${paymentMethod}
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;font-size:14px;color:#333;">
            <strong style="color:${SECONDARY};">Referencia:</strong> ${reference}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 32px 28px;text-align:center;">
      <a href="https://adsystemapp.com/admin/facturacion-sistema?report_id=${reportId}" style="display:inline-block;background:${PRIMARY};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver Reporte y Aprobar</a>
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`;
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
      const subject = `💰 Nuevo Pago Reportado: ${client_name}`;

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
      
      const subject = `Recibimos tu reporte de pago - AD System`;

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
    const subject = `📄 ${emailData.documentType || "Documento"} ${emailData.invoiceNumber || ""} registrado en AD System`;

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
