const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const timestamp = Date.now();
  const email = `test_timeout_${timestamp}@stopfive.com`;
  const password = 'test_password123';
  
  console.log('Registering test user...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error('Sign up failed:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log('Registered successfully! User ID:', userId);

  // Insert profile to avoid foreign key violation
  const { error: profileError } = await supabase.from('users').insert([{
    id: userId,
    name: 'Test Constraint',
    email,
    virtual_email: email
  }]);

  if (profileError) {
    console.error('Insert profile failed:', profileError.message);
    return;
  }

  console.log('Inserting test mission email...');
  const { data: emailData, error: insertError } = await supabase.from('emails').insert([{
    user_id: userId,
    sender: 'team@stopfive.com',
    receiver: email,
    subject: 'Test Dynamic Timeout Mission',
    body: 'This is a test mission.',
    status: 'unread',
    is_timeout_limit: true
  }]).select().single();

  if (insertError) {
    console.error('Insert failed:', insertError.message);
    return;
  }

  console.log('Successfully inserted email! ID:', emailData.id);
  console.log('Sender:', emailData.sender);
  console.log('Receiver:', emailData.receiver);
  console.log('Status:', emailData.status);
  console.log('Is Timeout Limit:', emailData.is_timeout_limit);

  console.log('\nNow attempting to update status to "expired"...');
  const { error: updateError } = await supabase.from('emails')
    .update({ status: 'expired' })
    .eq('id', emailData.id);

  if (updateError) {
    console.error('UPDATE FAILED!');
    console.error('Message:', updateError.message);
    console.log('Code:', updateError.code);
    console.log('Details:', updateError.details);
  } else {
    console.log('UPDATE SUCCEEDED! (Surprisingly, "expired" status is allowed)');
  }

  // Cleanup
  await supabase.from('emails').delete().eq('id', emailData.id);
  await supabase.from('users').delete().eq('id', userId);
}

run();
