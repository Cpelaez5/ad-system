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

/**
 * Genera el HTML del correo de invitación con branding de AD System.
 */
function buildInvitationEmailHtml(firstName: string, role: string, actionLink: string): string {
    const roleName = formatRoleName(role)
    const currentYear = new Date().getFullYear()
    return `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1F355C; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <div style="text-align: center; padding: 36px 20px 24px; background: linear-gradient(135deg, #1F355C 0%, #162846 100%);">
            <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 30px; letter-spacing: 2px; font-weight: 800;">AD SYSTEM</h1>
            <p style="color: #E0B04F; font-weight: 600; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Gestión Contable y Administrativa</p>
        </div>
        
        <div style="padding: 36px 28px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="font-size: 22px; color: #1F355C; margin-top: 0; font-weight: 700;">¡Hola, ${firstName}!</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #374151;">Has sido invitado a formar parte de <strong>AD System</strong> como <strong>${roleName}</strong>.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #374151;">Para comenzar, solo necesitas activar tu cuenta y configurar tu contraseña de acceso personal:</p>
            
            <div style="text-align: center; margin: 34px 0;">
                <a href="${actionLink}" style="background-color: #A81C22; color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(168, 28, 34, 0.3);">Aceptar Invitación y Crear Contraseña</a>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 24px; border-left: 4px solid #E0B04F;">
                <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">
                    <strong>ℹ️ Nota de seguridad:</strong> Este enlace es personal e intransferible, y vencerá en 24 horas.
                </p>
            </div>

            <div style="margin-top: 24px; font-size: 12px; color: #64748b; line-height: 1.5; word-break: break-all;">
                Si el botón no funciona en tu correo, copia y pega el siguiente enlace directo en tu navegador web:<br>
                <a href="${actionLink}" style="color: #1F355C; text-decoration: underline;">${actionLink}</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 4px;">Si no esperabas esta invitación, puedes desestimar este mensaje con total tranquilidad.</p>
            <p style="font-size: 11px; color: #cbd5e1; text-align: center; margin: 0;">© ${currentYear} AD System. Todos los derechos reservados.</p>
        </div>
    </div>
    `
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
