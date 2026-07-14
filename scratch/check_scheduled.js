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
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: list, error } = await supabase.from('scheduled_emails').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Scheduled Emails in DB:');
  list.forEach(item => {
    console.log({
      id: item.id,
      receiver_virtual_email: item.receiver_virtual_email,
      subject: item.subject,
      scheduled_at: item.scheduled_at,
      status: item.status,
      created_at: item.created_at
    });
  });

  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  const now = (new Date(date.getTime() - offset)).toISOString().slice(0, 19);
  console.log('Current local check time (ISO format string):', now);
  console.log('Current UTC time:', date.toISOString());
}

check();
