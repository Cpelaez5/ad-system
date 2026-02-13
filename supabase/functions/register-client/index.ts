import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, first_name, last_name, company_name, rif, phone, address, organization_id, activity_type } = await req.json()

        // 1. Create Client Record FIRST
        // This generates the client_id needed for the user record
        const { data: clientData, error: clientError } = await supabaseAdmin
            .from('clients')
            .insert({
                organization_id,
                company_name,
                rif,
                address,
                phone,
                email,
                activity_type: activity_type || 'goods', // Default to goods if not provided
                taxpayer_type: 'JURIDICA', // Valid value
                status: 'ACTIVO' // Valid value (uppercase Spanish)
            })
            .select()
            .single()

        if (clientError) {
            console.error('Error creating client:', clientError)
            throw new Error('Error creating client record: ' + clientError.message)
        }

        const clientId = clientData.id
        const username = email.split('@')[0]

        // 2. Create Auth User
        // Now we can provide client_id in metadata, satisfying the CHECK constraint in public.users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name,
                last_name,
                username,
                role: 'cliente',
                organization_id,
                client_id: clientId
            }
        })

        if (authError) {
            // Rollback client creation if user creation fails
            await supabaseAdmin.from('clients').delete().eq('id', clientId)
            throw authError
        }

        const userId = authData.user.id

        // 3. Update Public User Record DIRECTLY
        // Initialize Trial Data
        const trialStart = new Date().toISOString()
        const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()

        const { error: userUpdateError } = await supabaseAdmin
            .from('users')
            .update({
                role: 'cliente',
                organization_id: organization_id,
                client_id: clientData.id,
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
            // Attempt rollback
            await supabaseAdmin.auth.admin.deleteUser(userId)
            await supabaseAdmin.from('clients').delete().eq('id', clientData.id)
            throw new Error('Error updating user profile: ' + userUpdateError.message)
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
