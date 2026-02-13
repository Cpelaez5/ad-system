import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Read .env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) envConfig[key.trim()] = val.trim();
    });
}

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL || 'https://ybeippdhlvjzfgpbcoqy.supabase.co';
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Missing VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

// Users
const ADMIN_EMAIL = 'cpelaez0811@gmail.com';
const ADMIN_PASS = 'admin123';
const CLIENT_EMAIL = 'carlosleonelpelaez@gmail.com';
const CLIENT_PASS = 'cliente123';

async function runTest() {
    console.log('🚀 Starting Inventory Client Isolation Test...');

    // --- CLIENT SESSION ---
    console.log('\n👤 Logging in as CLIENT...');
    const clientSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { session: clientSession }, error: clientLoginError } = await clientSupabase.auth.signInWithPassword({
        email: CLIENT_EMAIL,
        password: CLIENT_PASS
    });

    if (clientLoginError) {
        console.error('❌ Client Login Failed:', clientLoginError.message);
        process.exit(1);
    }
    console.log('✅ Client Logged In. User ID:', clientSession.user.id);

    // Fetch user details to get client_id and org_id
    const { data: clientUser } = await clientSupabase
        .from('users')
        .select('organization_id, client_id')
        .eq('id', clientSession.user.id)
        .single();

    const CLIENT_ID = clientUser.client_id;
    const ORG_ID = clientUser.organization_id;
    console.log('   DB Client ID:', CLIENT_ID);
    console.log('   DB Org ID:', ORG_ID);

    if (!CLIENT_ID) {
        console.error('❌ Client User has no Client ID. Cannot test isolation.');
        process.exit(1);
    }

    // Create Product
    const testProductCode = `TEST-${Date.now()}`;
    console.log(`\n📦 Creating Product (Code: ${testProductCode})...`);

    // Insert with client_id explicit
    const { data: product, error: createError } = await clientSupabase
        .from('inventory_products')
        .insert({
            organization_id: ORG_ID,
            client_id: CLIENT_ID,
            name: `Test Product ${testProductCode}`,
            code: testProductCode,
            stock: 10,
            cost_price: 100,
            sale_price: 150,
            unit: 'UND',
            status: 'ACTIVE'
        })
        .select()
        .single();

    if (createError) {
        console.error('❌ Product Creation Failed:', createError);
        process.exit(1);
    }
    console.log('✅ Product Created:', product.id);

    // Verify Visibility for Client
    const { count: clientCount } = await clientSupabase
        .from('inventory_products')
        .select('*', { count: 'exact' })
        .eq('client_id', CLIENT_ID)
        .eq('id', product.id);

    if (clientCount === 1) {
        console.log('✅ Client sees their own product.');
    } else {
        console.error('❌ Client CANNOT see their own product.');
    }

    // --- ADMIN SESSION ---
    console.log('\n👮 Logging in as ADMIN...');
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { session: adminSession }, error: adminLoginError } = await adminSupabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS
    });

    if (adminLoginError) {
        console.error('❌ Admin Login Failed:', adminLoginError.message);
        process.exit(1);
    }
    console.log('✅ Admin Logged In.');

    // 1. Admin sees the product when filtering by Client ID
    const { data: adminSeeProduct } = await adminSupabase
        .from('inventory_products')
        .select('id, name')
        .eq('client_id', CLIENT_ID)
        .eq('code', testProductCode);

    if (adminSeeProduct && adminSeeProduct.length > 0) {
        console.log('✅ Admin CAN see the product when filtering by Correct Client ID.');
    } else {
        console.error('❌ Admin CANNOT see the product (RLS Issue?).');
    }

    // 2. Admin searches with WRONG Client ID
    const { data: adminWrongClient } = await adminSupabase
        .from('inventory_products')
        .select('id')
        .eq('client_id', '11111111-1111-1111-1111-111111111111') // Random valid UUID
        .eq('code', testProductCode);

    if (adminWrongClient && adminWrongClient.length === 0) {
        console.log('✅ Admin sees NO products when filtering by WRONG Client ID.');
    } else {
        console.error('❌ Admin SAW product with wrong Client ID (Logic Error).');
    }

    // Clean up
    console.log('\n🧹 Cleaning up test product...');
    await adminSupabase.from('inventory_products').delete().eq('id', product.id);
    console.log('Done.');
}

runTest();
