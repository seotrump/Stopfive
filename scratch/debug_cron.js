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

async function debug() {
  console.log('Fetching pending scheduled emails...');
  const now = new Date().toISOString();
  
  const { data: pending, error } = await supabase.from('scheduled_emails')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching scheduled emails:', error.message);
    return;
  }

  console.log(`Found ${pending.length} pending scheduled emails total.`);
  for (const item of pending) {
    console.log(`\nProcessing item ID: ${item.id}`);
    console.log(`Receiver: ${item.receiver_virtual_email}`);
    console.log(`Scheduled At: ${item.scheduled_at} (Compare now: ${now})`);
    console.log(`Is Timeout Limit: ${item.is_timeout_limit}`);

    // Check user
    const { data: user, error: userError } = await supabase.from('users')
      .select('id')
      .eq('virtual_email', item.receiver_virtual_email)
      .single();

    if (userError) {
      console.error(`User Error for ${item.receiver_virtual_email}:`, userError.message);
      continue;
    }

    console.log(`Found User ID: ${user.id}. Attempting insert into emails...`);

    const insertObj = {
      user_id: user.id,
      sender: 'team@stopfive.com',
      receiver: item.receiver_virtual_email,
      subject: item.subject,
      body: item.body,
      status: 'unread',
      is_system_mission: false,
      is_timeout_limit: item.is_timeout_limit
    };
    console.log('Payload:', insertObj);

    const { data: inserted, error: insertError } = await supabase.from('emails')
      .insert([insertObj])
      .select();

    if (insertError) {
      console.error('Insert into emails failed:', insertError.message);
      console.error('Error Code:', insertError.code);
      console.error('Details:', insertError.details);
      console.error('Hint:', insertError.hint);
    } else {
      console.log('Successfully inserted into emails! Row:', inserted);
      
      const { error: updateError } = await supabase.from('scheduled_emails')
        .update({ status: 'sent' })
        .eq('id', item.id);
        
      if (updateError) {
        console.error('Failed to update scheduled_emails status:', updateError.message);
      } else {
        console.log('Successfully marked scheduled_email as sent!');
      }
    }
  }
}

debug();
