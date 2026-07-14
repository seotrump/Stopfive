const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const files = ['.env.local', '.env.production', '.env.test.local', '.env'];

async function checkAll() {
  for (const file of files) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) continue;
    
    console.log(`\n--- Checking env file: ${file} ---`);
    const envFile = fs.readFileSync(filePath, 'utf8');
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

    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('Missing Supabase URL or Key');
      continue;
    }

    console.log('Supabase URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
      const { data: list, error } = await supabase.from('scheduled_emails').select('*');
      if (error) {
        console.error('Error fetching from this DB:', error.message);
      } else {
        console.log(`Found ${list.length} rows in scheduled_emails:`);
        list.forEach(item => {
          console.log({
            id: item.id,
            receiver: item.receiver_virtual_email,
            subject: item.subject,
            scheduled_at: item.scheduled_at,
            status: item.status
          });
        });
      }
    } catch (e) {
      console.error('Crash:', e.message);
    }
  }
}

checkAll();
