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

async function diagnose() {
  console.log('=== 1. emails 테이블 최근 5개 (전체 컬럼) ===');
  const { data: emails, error: emailsError } = await supabase
    .from('emails')
    .select('id, sender, receiver, subject, status, is_timeout_limit, is_force_timeout, is_system_mission, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (emailsError) {
    console.error('emails 조회 실패:', emailsError.message);
  } else {
    emails.forEach(e => {
      console.log('\n---');
      console.log(`ID: ${e.id}`);
      console.log(`Subject: ${e.subject}`);
      console.log(`Sender: ${e.sender}`);
      console.log(`Receiver: ${e.receiver}`);
      console.log(`Status: ${e.status}`);
      console.log(`is_timeout_limit: ${e.is_timeout_limit} (type: ${typeof e.is_timeout_limit})`);
      console.log(`is_force_timeout: ${e.is_force_timeout} (type: ${typeof e.is_force_timeout})`);
      console.log(`is_system_mission: ${e.is_system_mission} (type: ${typeof e.is_system_mission})`);
      console.log(`created_at: ${e.created_at}`);
      const minutesAgo = (Date.now() - new Date(e.created_at).getTime()) / 1000 / 60;
      console.log(`발송 경과 시간: ${minutesAgo.toFixed(2)}분`);
    });
  }

  console.log('\n\n=== 2. scheduled_emails 테이블 최근 5개 ===');
  const { data: scheduled, error: scheduledError } = await supabase
    .from('scheduled_emails')
    .select('id, subject, receiver_virtual_email, status, is_timeout_limit, is_force_timeout, scheduled_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (scheduledError) {
    console.error('scheduled_emails 조회 실패:', scheduledError.message);
  } else {
    scheduled.forEach(s => {
      console.log('\n---');
      console.log(`ID: ${s.id}`);
      console.log(`Subject: ${s.subject}`);
      console.log(`Receiver: ${s.receiver_virtual_email}`);
      console.log(`Status: ${s.status}`);
      console.log(`is_timeout_limit: ${s.is_timeout_limit} (type: ${typeof s.is_timeout_limit})`);
      console.log(`is_force_timeout: ${s.is_force_timeout} (type: ${typeof s.is_force_timeout})`);
      console.log(`scheduled_at: ${s.scheduled_at}`);
    });
  }

  console.log('\n\n=== 3. users 테이블 use_timeout_missions 확인 ===');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, virtual_email, use_timeout_missions')
    .limit(10);

  if (usersError) {
    console.error('users 조회 실패:', usersError.message);
  } else {
    users.forEach(u => {
      console.log(`${u.virtual_email}: use_timeout_missions = ${u.use_timeout_missions} (type: ${typeof u.use_timeout_missions})`);
    });
  }
}

diagnose();
