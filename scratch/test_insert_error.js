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

async function test() {
  console.log('Testing insert with is_timeout_limit: true...');
  const { error } = await supabase.from('scheduled_emails').insert([{
    receiver_virtual_email: 'test@stopfive.com',
    receiver_name: 'Test',
    subject: 'Test',
    body: 'Test',
    scheduled_at: new Date().toISOString(),
    is_timeout_limit: true
  }]);

  if (error) {
    console.log('Error with is_timeout_limit: true:');
    console.log('Message:', error.message);
    console.log('Code:', error.code);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('Insert with is_timeout_limit: true SUCCEEDED!');
    // Clean up
    await supabase.from('scheduled_emails').delete().eq('receiver_virtual_email', 'test@stopfive.com');
    return;
  }

  console.log('\nTesting insert WITHOUT is_timeout_limit...');
  const { error: error2 } = await supabase.from('scheduled_emails').insert([{
    receiver_virtual_email: 'test@stopfive.com',
    receiver_name: 'Test',
    subject: 'Test',
    body: 'Test',
    scheduled_at: new Date().toISOString()
  }]);

  if (error2) {
    console.log('Error without is_timeout_limit:');
    console.log('Message:', error2.message);
    console.log('Code:', error2.code);
  } else {
    console.log('Insert without is_timeout_limit SUCCEEDED!');
    await supabase.from('scheduled_emails').delete().eq('receiver_virtual_email', 'test@stopfive.com');
  }
}

test();
