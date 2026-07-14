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
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'team@stopfive.com',
    password: '1234'
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }

  console.log('Logged in successfully as admin!');

  const { data: list, error } = await supabase.from('scheduled_emails').select('*');
  if (error) {
    console.error('Error fetching scheduled emails:', error.message);
    return;
  }
  
  console.log('Scheduled Emails in DB:', list.length);
  list.forEach(item => {
    console.log({
      id: item.id,
      receiver: item.receiver_virtual_email,
      subject: item.subject,
      scheduled_at: item.scheduled_at,
      status: item.status,
      created_at: item.created_at
    });
  });
}

check();
