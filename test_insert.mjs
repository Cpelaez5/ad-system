import { createClient } from '@supabase/supabase-js'
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const VITE_SUPABASE_ANON_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabaseUrl = VITE_SUPABASE_URL
const supabaseKey = VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  const invoiceRecord = {
      organization_id: 'e6a8e8e7-1234-4000-8000-000000000000', // random uuid
      client_id: null,
      invoice_number: 'SYS-TEST',
      document_type: 'FACTURA',
      flow: 'COMPRA',
      expense_type: 'GASTO',
      issue_date: '2024-05-01',
      due_date: '2024-05-31',
      status: 'EMITIDA',
      issuer: { name: 'AD System', rif: '' },
      client_info: { company_name: 'Test', rif: 'J-123' },
      financial: {
          currency: 'USD',
          subtotal: 10,
          total: 10
      },
      items: [{
          description: 'Suscripción al sistema',
          quantity: 1,
          unitPrice: 10,
          total: 10
      }],
      notes: `Factura de Suscripción al Sistema - Ref: SYS-TEST`
  };

  const { data, error } = await supabase.from('invoices').insert([invoiceRecord]);
  console.log('Error:', JSON.stringify(error, null, 2));
}

testInsert();
