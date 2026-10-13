import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Organización a la que entran los clientes que se registran sin invitación (registro público).
// El navegador NUNCA decide la organización: o viene de una invitación válida o es esta.
// Es la organización de sistema "AD System Directo" (tipo 'directo', sin staff de despachos);
// ver docs/mvp/estrategia/flujo-multiinquilino-contadores.md y la migración 20261013150000.
// Fija en el código a propósito: una variable de entorno vieja no debe poder mandar empresas a un despacho.
const PUBLIC_CLIENT_ORG_ID = '00000000-0000-4000-8000-0000000000d1'

class ErrorRegistro extends Error {}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, first_name, last_name, company_name, rif, phone, address, activity_type, licencia_actividad_economica, estado, municipio, invitation_token } = await req.json()

        if (!email || !password || password.length < 6 || !company_name || !rif) {
            throw new ErrorRegistro('Faltan datos obligatorios (correo, contraseña de al menos 6 caracteres, nombre de la empresa y RIF).')
        }

        // 0. Determinar organización (y empresa existente) a partir de la invitación, nunca del body
        let organization_id = PUBLIC_CLIENT_ORG_ID
        let invitedClientId: string | null = null
        let invitationId: string | null = null

        if (invitation_token) {
            const { data: inv } = await supabaseAdmin
                .from('invitations')
                .select('id, email, role, organization_id, client_id, status, expires_at')
                .eq('token', invitation_token)
                .maybeSingle()

            const vencida = inv?.expires_at && new Date(inv.expires_at) < new Date()
            if (!inv || inv.role !== 'cliente' || (inv.status ?? 'pending') !== 'pending' || vencida
                || inv.email?.toLowerCase() !== String(email).toLowerCase()) {
                throw new ErrorRegistro('La invitación no es válida, ya fue usada o venció.')
            }
            organization_id = inv.organization_id
            invitedClientId = inv.client_id
            invitationId = inv.id
        }

        // 1. Empresa: la de la invitación o una nueva
        let clientData: any
        if (invitedClientId) {
            const { data, error } = await supabaseAdmin
                .from('clients')
                .select()
                .eq('id', invitedClientId)
                .eq('organization_id', organization_id)
                .single()
            if (error || !data) throw new ErrorRegistro('La empresa de la invitación no existe.')
            clientData = data
        } else {
            const { data, error: clientError } = await supabaseAdmin
                .from('clients')
                .insert({
                    organization_id,
                    company_name,
                    rif,
                    address,
                    phone,
                    email,
                    activity_type: activity_type || 'goods', // Default to goods if not provided
                    licencia_actividad_economica,
                    estado: estado || null,
                    municipio_id: municipio || null,
                    taxpayer_type: 'JURIDICA', // Valid value
                    status: 'ACTIVO' // Valid value (uppercase Spanish)
                })
                .select()
                .single()

            if (clientError) {
                console.error('Error creating client:', clientError)
                throw new Error('Error creating client record: ' + clientError.message)
            }
            clientData = data
        }

        const clientId = clientData.id
        const createdClient = !invitedClientId
        const username = email.split('@')[0]

        // 2. Crear usuario de Auth. Rol y organización van en app_metadata (solo service_role puede escribirlo);
        //    handle_new_user los toma de ahí.
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name, last_name, username },
            app_metadata: { role: 'cliente', organization_id, client_id: clientId }
        })

        if (authError) {
            if (createdClient) await supabaseAdmin.from('clients').delete().eq('id', clientId)
            throw authError
        }

        const userId = authData.user.id

        // 3. Datos de prueba gratuita en el perfil público
        const trialStart = new Date().toISOString()
        const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()

        const { error: userUpdateError } = await supabaseAdmin
            .from('users')
            .update({
                role: 'cliente',
                organization_id: organization_id,
                client_id: clientId,
                first_name,
                last_name,
                username: email.split('@')[0],
                trial_start: trialStart,
                trial_end: trialEnd,
                plan_id: 'free_trial',
                storage_limit_bytes: 5368709120 // 5GB
            })
            .eq('id', userId)

        if (userUpdateError) {
            console.error('Error updating public user record:', userUpdateError)
            await supabaseAdmin.auth.admin.deleteUser(userId)
            if (createdClient) await supabaseAdmin.from('clients').delete().eq('id', clientId)
            throw new Error('Error updating user profile: ' + userUpdateError.message)
        }

        if (invitationId) {
            await supabaseAdmin.from('invitations').update({ status: 'accepted' }).eq('id', invitationId)
        }

        return new Response(
            JSON.stringify({ user: authData.user, client: clientData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
