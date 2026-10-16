import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lista blanca estricta de orígenes permitidos para redirección (prevención de Open Redirect)
const ALLOWED_ORIGINS = [
    'https://adsystemapp.com',
    'http://localhost:5173',
    'http://localhost:3000'
]

/**
 * Mapea roles internos a nombres legibles para el correo de invitación.
 */
function formatRoleName(role: string): string {
    const roleMap: Record<string, string> = {
        super_admin: 'Super Administrador',
        admin: 'Contador Administrador',
        contador: 'Contador',
        cliente: 'Cliente'
    }
    return roleMap[role] || role
}

function escHtml(t: unknown): string {
    return String(t ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

/**
 * Genera el HTML del correo de invitación con la marca de AD System
 * (mismo estilo que despachar-notificacion: logo PNG, granate #8E1818, carbón #2A2A2E).
 */
function buildInvitationEmailHtml(firstName: string, role: string, actionLink: string): string {
    const GRANATE = '#8E1818'
    const CARBON = '#2A2A2E'
    const LOGO_URL = 'https://adsystemapp.com/ADSystem/png/logo-correo.png' // PNG 480x103: los correos no muestran SVG
    const roleName = escHtml(formatRoleName(role))
    const nombre = escHtml(firstName)
    const enlace = escHtml(actionLink)
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:Montserrat,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:20px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 24px;background-color:#FFFFFF;border-bottom:4px solid ${GRANATE};">
    <a href="https://adsystemapp.com" style="text-decoration:none;"><img src="${LOGO_URL}" alt="AD System" width="168" height="36" style="display:block;width:168px;height:36px;border:0;outline:none;"></a>
  </td></tr>
  <tr><td style="padding:24px 24px 8px;">
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:${CARBON};">¡Hola, ${nombre}!</h1>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${CARBON};">Te invitaron a formar parte de <strong>AD System</strong> como <strong>${roleName}</strong>.</p>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:${CARBON};">Para empezar, activa tu cuenta y crea tu contraseña:</p>
  </td></tr>
  <tr><td style="padding:8px 24px 20px;" align="center">
    <a href="${enlace}" style="display:inline-block;background-color:${GRANATE};color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;">Aceptar invitación y crear contraseña</a>
  </td></tr>
  <tr><td style="padding:0 24px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;border-radius:8px;border-left:4px solid ${GRANATE};">
      <tr><td style="padding:12px 16px;font-size:14px;line-height:1.5;color:${CARBON};"><strong>Por tu seguridad:</strong> este enlace es personal y vence en 24 horas.</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 24px 20px;">
    <p style="margin:0;font-size:13px;line-height:1.5;color:#52525B;word-break:break-all;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${enlace}" style="color:${GRANATE};">${enlace}</a></p>
  </td></tr>
  <tr><td style="padding:16px 24px;background-color:#F4F4F5;border-top:1px solid #E4E4E7;">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#52525B;">Si no esperabas esta invitación, puedes ignorar este mensaje. © ${new Date().getFullYear()} AD System.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

serve(async (req) => {
    // Manejo de preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // --- Configuración de servicios ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'AD System <onboarding@resend.dev>'

        if (!resendApiKey) {
            return new Response(
                JSON.stringify({ code: 'MISSING_CONFIG', message: 'RESEND_API_KEY no está configurada en el servidor' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // --- 1. Autenticación y Autorización (super_admin o admin) ---
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ code: 'MISSING_AUTH', message: 'Cabecera de autorización requerida' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        
        const token = authHeader.replace('Bearer ', '')
        const { data: { user: callerUser }, error: callerAuthError } = await supabaseAdmin.auth.getUser(token)
        
        if (callerAuthError || !callerUser) {
            return new Response(
                JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token inválido o expirado' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
            .from('users')
            .select('role, organization_id')
            .eq('id', callerUser.id)
            .single()

        if (callerProfileError || !['super_admin', 'admin'].includes(callerProfile?.role)) {
            return new Response(
                JSON.stringify({ code: 'FORBIDDEN', message: 'Requiere rol administrativo para invitar usuarios' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // --- 2. Validación del payload ---
        const { email, role, first_name, last_name, redirect_url } = await req.json()

        if (!email || !role || !first_name || !last_name || !redirect_url) {
            return new Response(
                JSON.stringify({ code: 'MISSING_FIELDS', message: 'Campos obligatorios: email, role, first_name, last_name, redirect_url' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Solo super_admin puede invitar super_admins
        if (callerProfile.role !== 'super_admin' && role === 'super_admin') {
            return new Response(
                JSON.stringify({ code: 'FORBIDDEN', message: 'Solo un Super Administrador puede invitar a otro Super Administrador' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Validación estricta de redirect_url contra whitelist
        let origin = ''
        try {
            origin = new URL(redirect_url).origin
        } catch (_e) {
            return new Response(
                JSON.stringify({ code: 'INVALID_URL', message: 'URL de redirección con formato inválido' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!ALLOWED_ORIGINS.includes(origin)) {
            return new Response(
                JSON.stringify({ code: 'INVALID_REDIRECT', message: 'Origen de redirección no permitido: ' + origin }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // --- 3. Generar Link de Invitación (type: 'invite', nunca 'recovery') ---
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
                redirectTo: redirect_url,
                data: { first_name, last_name, role }
            }
        })

        if (linkError) {
            console.error('Error generando link:', linkError)
            return new Response(
                JSON.stringify({ code: 'LINK_ERROR', message: 'Error al generar link de invitación: ' + linkError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const actionLink = linkData.properties?.action_link
        const invitedUser = linkData.user

        if (!invitedUser || !actionLink) {
            return new Response(
                JSON.stringify({ code: 'LINK_INCOMPLETE', message: 'No se pudo generar el enlace de invitación correctamente' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // --- 4. Persistencia en BD (upsert idempotente para soportar re-invitaciones) ---
        const username = email.split('@')[0]
        const orgId = callerProfile.role === 'super_admin' ? null : callerProfile.organization_id

        const upsertPayload: Record<string, any> = {
            id: invitedUser.id,
            email: email,
            username: username,
            first_name: first_name,
            last_name: last_name,
            role: role,
            is_active: false,
            invited_at: new Date().toISOString()
        }

        if (orgId) {
            upsertPayload.organization_id = orgId
        }

        let { error: dbError } = await supabaseAdmin.from('users').upsert(
            upsertPayload,
            { onConflict: 'id' }
        )

        // Fallback defensivo si la columna invited_at no existe aún en el schema remoto
        if (dbError && (dbError.message?.includes('invited_at') || (dbError as any).code === '42703')) {
            console.warn('⚠️ invited_at no existe en BD, reintentando upsert sin invited_at:', dbError.message)
            delete upsertPayload.invited_at
            const retryRes = await supabaseAdmin.from('users').upsert(
                upsertPayload,
                { onConflict: 'id' }
            )
            dbError = retryRes.error
        }

        if (dbError) {
            console.error('Error en upsert de usuario:', dbError)
            return new Response(
                JSON.stringify({ code: 'DB_ERROR', message: 'Error guardando perfil del usuario invitado' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // --- 5. Enviar Correo con Resend (fire-and-forget amigable: si falla, no bloquea la respuesta) ---
        const emailHtml = buildInvitationEmailHtml(first_name, role, actionLink)

        const resendPayload = {
            from: fromEmail,
            to: [email],
            subject: 'Invitación a AD System — Activa tu cuenta',
            html: emailHtml
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resendPayload)
        })

        if (!resendResponse.ok) {
            const errorText = await resendResponse.text()
            console.error('Error de Resend API:', errorText)
            // El usuario ya fue creado en BD, informar al admin que el correo no se envió
            return new Response(
                JSON.stringify({
                    code: 'EMAIL_SEND_ERROR',
                    message: 'El usuario fue registrado pero el correo de invitación no se pudo enviar. Reintenta con "Reenviar Invitación".',
                    details: errorText
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 207 }
            )
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Invitación enviada exitosamente' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('admin-invite-user error inesperado:', error)
        return new Response(
            JSON.stringify({ code: 'INTERNAL_ERROR', message: error.message || 'Error interno del servidor' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
