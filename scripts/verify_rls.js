
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test credentials
const ADMIN_EMAIL = 'cpelaez0811@gmail.com'
const ADMIN_PASSWORD = 'admin123'
const CLIENT_EMAIL = 'carlosleonelpelaez@gmail.com'
const CLIENT_PASSWORD = 'cliente123'

async function runTest() {
    console.log('🔒 Starting Security Verification for Fiscal360...\n')

    try {
        // 1. Login as ADMIN
        console.log('1️⃣  Logging in as ADMIN...')
        const { data: adminAuth, error: adminLoginError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        })

        if (adminLoginError) throw new Error(`Admin login failed: ${adminLoginError.message}`)
        console.log('✅ Admin logged in:', adminAuth.user.email)

        // Get Admin Org ID
        const { data: adminUser } = await supabase.from('users').select('organization_id').eq('id', adminAuth.user.id).single()
        const orgId = adminUser.organization_id
        console.log(`   Organization ID: ${orgId}`)

        // 2. Create a "Secret" Document (simulate another client's doc)
        // We'll use a random UUID for client_id to ensure it doesn't belong to our test client
        const otherClientId = '00000000-0000-0000-0000-000000000000'

        console.log('\n2️⃣  Creating a "Secret Doc" (belongs to other client)...')
        const { data: secretDoc, error: createError } = await supabase
            .from('fiscal_docs')
            .insert({
                organization_id: orgId,
                client_id: otherClientId, // Verify this client_id is NOT the test client's ID
                name: 'SECRET_DOC_FOR_VERIFICATION',
                category: 'LEGAL',
                status: 'VIGENTE'
            })
            .select()
            .single()

        if (createError) throw new Error(`Failed to create secret doc: ${createError.message}`)
        console.log('✅ Secret Doc created with ID:', secretDoc.id)

        // 3. Logout Admin
        await supabase.auth.signOut()

        // 4. Login as CLIENT
        console.log('\n3️⃣  Logging in as CLIENT...')
        const { data: clientAuth, error: clientLoginError } = await supabase.auth.signInWithPassword({
            email: CLIENT_EMAIL,
            password: CLIENT_PASSWORD
        })

        if (clientLoginError) throw new Error(`Client login failed: ${clientLoginError.message}`)
        console.log('✅ Client logged in:', clientAuth.user.email)

        // Verify Client's ID is different from otherClientId
        const { data: clientUser } = await supabase.from('users').select('client_id').eq('id', clientAuth.user.id).single()
        console.log(`   Client ID: ${clientUser.client_id}`)

        if (clientUser.client_id === otherClientId) {
            console.warn('⚠️ Test setup warning: Client ID matches the "other" client ID. Test might be invalid.')
        }

        // 5. Attempt to fetch all docs
        console.log('\n4️⃣  Client attempting to fetch ALL fiscal docs...')
        const { data: clientDocs, error: fetchError } = await supabase
            .from('fiscal_docs')
            .select('*')
            .eq('organization_id', orgId) // Even if we filter by Org, RLS should hide the secret doc

        if (fetchError) throw new Error(`Client fetch failed: ${fetchError.message}`)

        // 6. Verify Visibility
        const canSeeSecret = clientDocs.some(d => d.id === secretDoc.id)
        console.log(`   Fetched ${clientDocs.length} documents.`)

        if (canSeeSecret) {
            console.error('❌ CRITICAL FAILURE: Client CAN see the secret document!')
            console.error('   RLS Policy is NOT working correctly.')
        } else {
            console.log('✅ SUCCESS: Client CANNOT see the secret document.')
            console.log('   RLS Policy is working correctly.')
        }

        // 7. Cleanup (Login as Admin again to delete)
        await supabase.auth.signOut()
        console.log('\n5️⃣  Cleaning up...')
        await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        await supabase.from('fiscal_docs').delete().eq('id', secretDoc.id)
        console.log('✅ Secret doc deleted.')

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message)
        // Try to cleanup if secretDoc exists? (Hard to know scope here without more complex code, skipping for simplicity)
    }
}

runTest()
