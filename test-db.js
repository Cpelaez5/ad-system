import { supabase } from './src/lib/supabaseClient.js';

async function run() {
  const { data: users } = await supabase.from('users').select('email, client_id, plan_id, trial_end');
  const { data: subs } = await supabase.from('client_subscriptions').select('*');
  console.log('USERS:', JSON.stringify(users, null, 2));
  console.log('SUBS:', JSON.stringify(subs, null, 2));
  process.exit(0);
}

run();
