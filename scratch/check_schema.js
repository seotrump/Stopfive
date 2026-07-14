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

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'scheduled_emails' });
  if (error) {
    // If RPC doesn't exist, let's try direct query on information_schema (might fail due to security)
    console.log('RPC failed:', error.message);
    
    // Let's just select one row or inspect a query response
    const { data: list, error: err2 } = await supabase.from('scheduled_emails').select('*').limit(1);
    if (err2) {
      console.error('Error:', err2);
    } else {
      console.log('Sample row:', list[0]);
    }
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
