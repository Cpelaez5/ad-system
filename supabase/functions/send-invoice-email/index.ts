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
  const LOGO_URL = "https://ad-businessgroup.netlify.app/icon-adaptableV2.svg";

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
      <a href="https://ad-businessgroup.netlify.app/cliente/facturacion" style="display:inline-block;background:${PRIMARY};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Ver en AD System</a>
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
