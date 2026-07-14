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

async function check() {
  console.log('Testing column checking...');
  
  // Test 1: scheduled_emails
  const { error: error1 } = await supabase.from('scheduled_emails').insert([{
    receiver_virtual_email: 'check@stopfive.com',
    receiver_name: 'Check',
    subject: 'Check',
    body: 'Check',
    scheduled_at: new Date().toISOString(),
    is_force_timeout: false
  }]);

  if (error1 && error1.message.includes('column "is_force_timeout" of relation "scheduled_emails" does not exist')) {
    console.log('[-] Column "is_force_timeout" DOES NOT exist in scheduled_emails table.');
  } else {
    console.log('[+] Column "is_force_timeout" checking result:', error1 ? error1.message : 'Column exists!');
  }

  // Test 2: users (auth or select)
  // Let's just select the first user profile
  const { data: users, error: error2 } = await supabase.from('users').select('*').limit(1);
  if (error2) {
    console.error('Error selecting users:', error2.message);
  } else if (users && users.length > 0) {
    console.log('[+] User profile columns found:', Object.keys(users[0]));
    if ('use_timeout_missions' in users[0]) {
      console.log('[+] use_timeout_missions column exists in users table!');
    } else {
      console.log('[-] use_timeout_missions column DOES NOT exist in users table.');
    }
  } else {
    console.log('No user row found to check columns.');
  }
}

check();
