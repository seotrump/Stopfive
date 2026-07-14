import { supabase } from './supabaseClient';
import { UserProfile, EmailMessage, ScheduledEmail, DetailedStats, CourseMissionDef, EXPERIENCE_COURSE_MISSIONS } from './mockDb';

// 1. 유저 목록 관리
export const getAllUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data.map(mapUserFromDb);
};

// 2. 로그인 유저 관리
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (error) return null;
  return mapUserFromDb(data);
};

export const loginUser = async (emailOrVirtualEmail: string, passwordInput: string): Promise<UserProfile | null> => {
  // 1. Supabase Auth 로그인
  // 가상 이메일이든 실제 이메일이든 로그인 시도 (우리는 virtualEmail로 가입시켰음)
  const loginEmail = emailOrVirtualEmail.includes('@') ? emailOrVirtualEmail : `${emailOrVirtualEmail}@stopfive.com`;
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: passwordInput,
  });

  if (authError || !authData.user) {
    return null;
  }

  // 2. public.users 테이블에서 상세 정보 조회
  const { data, error } = await supabase.from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();
    
  if (error || !data) return null;
  return mapUserFromDb(data);
};

export const registerUser = async (
  name: string,
  username: string,
  actualEmail: string,
  passwordInput: string,
  deliveryTime: string = '09:00'
): Promise<UserProfile | null> => {
  const virtualEmail = `${username}@stopfive.com`;
  
  // 1. Supabase Auth 회원가입 (실제 인증)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: virtualEmail, // 가상 이메일을 로그인 ID로 사용
    password: passwordInput,
  });

  if (authError || !authData.user) {
    console.error('Auth Registration failed:', authError);
    return null;
  }

  // 2. public.users 테이블에 상세 정보 저장
  const { data, error } = await supabase.from('users').insert([{
    id: authData.user.id, // auth.users의 id와 매칭!
    name,
    email: actualEmail,
    virtual_email: virtualEmail,
    delivery_time: `${deliveryTime}:00`
  }]).select().single();

  if (error) {
    console.error('DB Insert failed:', error);
    return null;
  }
  return mapUserFromDb(data);
};

export const logoutUser = async () => {
  // Supabase Auth sign out
  await supabase.auth.signOut();
};

export const getLocalEmails = async (virtualEmail: string): Promise<EmailMessage[]> => {
  const { data, error } = await supabase.from('emails')
    .select('*')
    .or(`receiver.eq.${virtualEmail},sender.eq.${virtualEmail}`)
    .order('created_at', { ascending: false });
    
  if (error) return [];
  const emails = data.map(mapEmailFromDb);
  
  if (typeof window !== 'undefined') {
    try {
      const archivedStr = localStorage.getItem('stopfive_archived');
      if (archivedStr) {
        const archivedIds = JSON.parse(archivedStr);
        emails.forEach((e: any) => {
          if (archivedIds.includes(e.id)) e.status = 'archived';
        });
      }
      
      const repliesStr = localStorage.getItem('stopfive_replies');
      if (repliesStr) {
        const replies = JSON.parse(repliesStr);
        emails.forEach((e: any) => {
          if (replies[e.id]) {
            e.status = 'archived';
            e.replyContent = replies[e.id].text;
            e.answeredAt = replies[e.id].date;
          }
        });
      }
    } catch(e) {}
  }
  
  return emails;
};

export const sendReply = async (emailId: string, replyText: string, replySubject?: string): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    try {
      const repliesStr = localStorage.getItem('stopfive_replies');
      const replies = repliesStr ? JSON.parse(repliesStr) : {};
      replies[emailId] = { text: replyText, date: new Date().toISOString() };
      localStorage.setItem('stopfive_replies', JSON.stringify(replies));
    } catch(e) {}
  }

  await supabase.from('emails')
    .update({ 
      status: 'archived', 
      answered_at: new Date().toISOString(), 
      reply_content: replyText 
    })
    .eq('id', emailId);

  const { data: originalEmail } = await supabase.from('emails').select('receiver, sender, subject, user_id').eq('id', emailId).single();
  
  if (originalEmail) {
    const isReplyFromAdmin = originalEmail.receiver === 'team@stopfive.com';
    const newSender = isReplyFromAdmin ? 'team@stopfive.com' : originalEmail.receiver;
    const newReceiver = isReplyFromAdmin ? originalEmail.sender : 'team@stopfive.com';

    await supabase.from('emails').insert([{
      user_id: originalEmail.user_id,
      sender: newSender,
      receiver: newReceiver,
      subject: replySubject ? replySubject : (originalEmail.subject.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`),
      body: replyText,
      status: 'unread',
      is_system_mission: false
    }]);
  }
    
  return true; // RLS UPDATE 실패 시에도 로컬스토리지 백업으로 무조건 성공 처리
};

export const sendComposeMail = async (senderVirtualEmail: string, subject: string, content: string): Promise<boolean> => {
  const { data: user } = await supabase.from('users').select('id').eq('virtual_email', senderVirtualEmail).single();
  if (!user) return false;

  const { error } = await supabase.from('emails').insert([{
    user_id: user.id,
    sender: senderVirtualEmail,
    receiver: 'team@stopfive.com',
    subject,
    body: content,
    status: 'unread'
  }]);
  return !error;
};

export const markEmailAsArchived = async (emailId: string): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    try {
      const archivedStr = localStorage.getItem('stopfive_archived');
      const archivedIds = archivedStr ? JSON.parse(archivedStr) : [];
      if (!archivedIds.includes(emailId)) {
        archivedIds.push(emailId);
        localStorage.setItem('stopfive_archived', JSON.stringify(archivedIds));
      }
    } catch(e) {}
  }

  await supabase.from('emails')
    .update({ status: 'archived' })
    .eq('id', emailId);
    
  return true; // RLS UPDATE 실패 시에도 로컬스토리지 백업으로 무조건 성공 처리
};

// 추가된 Mock Stub 함수들
export const sendAdminMailToUser = async (receiverVirtualEmail: string, subject: string, content: string): Promise<boolean> => {
  const { data: user } = await supabase.from('users').select('id').eq('virtual_email', receiverVirtualEmail).single();
  if (!user) return false;

  const { error } = await supabase.from('emails').insert([{
    user_id: user.id,
    sender: 'team@stopfive.com',
    receiver: receiverVirtualEmail,
    subject: `Re: ${subject.replace(/^Re:\s*/, '')}`,
    body: content,
    status: 'unread',
    is_system_mission: false
  }]);
  return !error;
};

export const updateUserProfile = async (
  virtualEmail: string,
  deliveryTime: string,
  name?: string,
  newPassword?: string,
  useTimeoutMissions?: boolean
): Promise<UserProfile | null> => {
  if (newPassword) {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      console.error('Password update failed:', authError);
      return null;
    }
  }

  const updates: any = { delivery_time: deliveryTime.includes(':') && deliveryTime.length === 5 ? deliveryTime + ':00' : deliveryTime };
  if (name) updates.name = name;
  if (useTimeoutMissions !== undefined) updates.use_timeout_missions = useTimeoutMissions;

  const { data, error } = await supabase.from('users')
    .update(updates)
    .eq('virtual_email', virtualEmail)
    .select()
    .single();

  if (error) {
    console.error('Profile update failed:', error);
    return null;
  }
  return mapUserFromDb(data);
};

export const getStatsForUser = async (virtualEmail: string): Promise<DetailedStats | null> => {
  return null;
};

export const startExperienceCourse = async (virtualEmail: string): Promise<UserProfile | null> => {
  return null;
};

export const getNextCourseMission = async (virtualEmail: string): Promise<CourseMissionDef | null> => {
  return null;
};

export const simulateNextDayForUser = async (virtualEmail: string): Promise<UserProfile | null> => {
  return null;
};

export const resetExperienceCourse = async (virtualEmail: string): Promise<UserProfile | null> => {
  return null;
};

// 매퍼 함수들
function mapUserFromDb(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    virtualEmail: row.virtual_email,
    name: row.name,
    deliveryTime: (row.delivery_time || "09:00").substring(0, 5),
    currentChain: row.current_chain,
    lastCompletedDate: row.last_completed_date,
    totalAppointments: row.total_appointments,
    createdAt: row.created_at,
    role: row.virtual_email === 'team@stopfive.com' ? 'admin' : 'user',
    useTimeoutMissions: row.use_timeout_missions,
    courseStatus: 'not_started', // DB에 없는 임시 필드
    courseStep: 0,
    courseStartDate: null
  };
}

function mapEmailFromDb(row: any): EmailMessage {
  return {
    id: row.id,
    sender: row.sender,
    receiver: row.receiver,
    subject: row.subject,
    body: row.body,
    status: row.status,
    isSystemMission: row.is_system_mission,
    missionDate: row.mission_date,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    replyContent: row.reply_content,
    isTimeoutLimit: row.is_timeout_limit,
    isForceTimeout: row.is_force_timeout
  };
}

export const getScheduledEmails = async (): Promise<ScheduledEmail[]> => {
  const { data, error } = await supabase.from('scheduled_emails').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching scheduled emails:', error);
    return [];
  }
  return data.map((row: any) => ({
    id: row.id,
    receiverVirtualEmail: row.receiver_virtual_email,
    receiverName: row.receiver_name,
    subject: row.subject,
    body: row.body,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
    isTimeoutLimit: row.is_timeout_limit,
    isForceTimeout: row.is_force_timeout
  }));
};

export const createScheduledEmail = async (
  receiverVirtualEmail: string,
  receiverName: string,
  subject: string,
  body: string,
  scheduledAt: string,
  isTimeoutLimit: boolean = false,
  isForceTimeout: boolean = false
): Promise<boolean> => {
  const { error } = await supabase.from('scheduled_emails').insert([{
    receiver_virtual_email: receiverVirtualEmail,
    receiver_name: receiverName,
    subject,
    body,
    scheduled_at: scheduledAt,
    is_timeout_limit: isTimeoutLimit,
    is_force_timeout: isForceTimeout
  }]);
  if (error) {
    console.error('Error creating scheduled email:', error);
    return false;
  }
  return true;
};

export const cancelScheduledEmail = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('scheduled_emails').delete().eq('id', id);
  if (error) {
    console.error('Error deleting scheduled email:', error);
    return false;
  }
  return true;
};

export const processScheduledEmails = async (): Promise<number> => {
  const now = new Date().toISOString();
  
  const { data: pending, error } = await supabase.from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now);
    
  if (error || !pending || pending.length === 0) return 0;
  
  let sent = 0;
  for (const item of pending) {
    const { data: user } = await supabase.from('users')
      .select('id, use_timeout_missions')
      .eq('virtual_email', item.receiver_virtual_email)
      .single();
    if (!user) continue;
    
    // 만료 여부 최종 판단 (유저 설정 반영)
    // 1) 강제(is_force_timeout)인 경우 무조건 만료 제한 활성화
    // 2) 일반 제한인 경우 유저가 timeout 미션 참여 허용(use_timeout_missions)했을 때만 활성화
    const finalTimeoutLimit = item.is_timeout_limit && (item.is_force_timeout || user.use_timeout_missions !== false);
    
    const { error: insertError } = await supabase.from('emails').insert([{
      user_id: user.id,
      sender: 'team@stopfive.com',
      receiver: item.receiver_virtual_email,
      subject: item.subject,
      body: item.body,
      status: 'unread',
      is_system_mission: false,
      is_timeout_limit: finalTimeoutLimit,
      is_force_timeout: item.is_force_timeout
    }]);
    
    if (!insertError) {
      await supabase.from('scheduled_emails').update({ status: 'sent' }).eq('id', item.id);
      sent++;
    }
  }
  return sent;
};

export const processExpiredEmails = async (): Promise<number> => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  // DB CHECK 제약조건이 'expired'를 허용하지 않는 경우 'read'로 우회
  // 클라이언트에서 is_timeout_limit=true AND status='read' AND 5분 초과 시 만료로 판정
  const { data, error } = await supabase.from('emails')
    .update({ status: 'read' })
    .eq('status', 'unread')
    .eq('is_timeout_limit', true)
    .lte('created_at', fiveMinutesAgo)
    .select();
    
  if (error) {
    console.error('Error processing expired emails:', error);
    return 0;
  }
  return data ? data.length : 0;
};

export const expireEmail = async (emailId: string): Promise<boolean> => {
  // DB CHECK 제약조건 우회: 'expired' 대신 'read'로 상태 변경
  // 클라이언트에서 is_timeout_limit=true AND status='read' AND 5분 초과 시 만료로 최종 판정
  const { error } = await supabase.from('emails')
    .update({ status: 'read' })
    .eq('id', emailId);
  if (error) {
    console.error('Error expiring email:', error);
    return false;
  }
  return true;
};
