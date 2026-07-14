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
  // Register a new test user
  const email = `test_column_${Date.now()}@stopfive.com`;
  const password = 'test_password123';
  
  console.log('Registering test user...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    console.error('Sign up error:', authError.message);
    return;
  }

  console.log('Signed up! User ID:', authData.user.id);

  // Insert profile
  const { error: profileError } = await supabase.from('users').insert([{
    id: authData.user.id,
    name: 'Test Col',
    email: email,
    virtual_email: email
  }]);

  if (profileError) {
    console.error('Insert profile error:', profileError.message);
    return;
  }

  // Query profile
  const { data: userProfile, error: queryError } = await supabase.from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (queryError) {
    console.error('Query error:', queryError.message);
  } else {
    console.log('Profile columns:', Object.keys(userProfile));
    if ('use_timeout_missions' in userProfile) {
      console.log('[+] use_timeout_missions column exists in users table!');
    } else {
      console.log('[-] use_timeout_missions column DOES NOT exist in users table.');
    }
  }

  // Cleanup
  console.log('Cleaning up profile...');
  await supabase.from('users').delete().eq('id', authData.user.id);
  // (We cannot delete the auth user programmatically with anon key, but profile deletion is enough for cleaning database).
}

check();
