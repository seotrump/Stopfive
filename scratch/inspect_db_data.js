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

async function inspect() {
  console.log('Inspecting last 5 emails in database...');
  const { data: emails, error } = await supabase.from('emails')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching emails:', error.message);
  } else {
    emails.forEach(e => {
      console.log(`\nEmail ID: ${e.id}`);
      console.log(`Subject: ${e.subject}`);
      console.log(`Status: ${e.status}`);
      console.log(`Created At: ${e.created_at}`);
      console.log(`Is Timeout Limit: ${e.is_timeout_limit}`);
      console.log(`Is Force Timeout: ${e.is_force_timeout}`);
    });
  }

  console.log('\nInspecting scheduled_emails...');
  const { data: scheduled, error: error2 } = await supabase.from('scheduled_emails')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error2) {
    console.error('Error fetching scheduled:', error2.message);
  } else {
    scheduled.forEach(s => {
      console.log(`\nScheduled Email ID: ${s.id}`);
      console.log(`Subject: ${s.subject}`);
      console.log(`Status: ${s.status}`);
      console.log(`Scheduled At: ${s.scheduled_at}`);
      console.log(`Is Timeout Limit: ${s.is_timeout_limit}`);
      console.log(`Is Force Timeout: ${s.is_force_timeout}`);
    });
  }
}

inspect();
