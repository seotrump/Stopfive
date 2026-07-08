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
    console.error('Login failed:', authError);
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
  deliveryTime: string,
  passwordInput: string
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
    delivery_time: deliveryTime + ':00'
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
  return data.map(mapEmailFromDb);
};

export const sendReply = async (emailId: string, replyText: string): Promise<boolean> => {
  const { error } = await supabase.from('emails')
    .update({ 
      status: 'archived', 
      answered_at: new Date().toISOString(), 
      reply_content: replyText 
    })
    .eq('id', emailId);
    
  return !error;
};

export const sendComposeMail = async (senderVirtualEmail: string, subject: string, content: string): Promise<boolean> => {
  const { error } = await supabase.from('emails').insert([{
    sender: senderVirtualEmail,
    receiver: 'team@stopfive.com',
    subject,
    body: content,
    status: 'unread'
  }]);
  return !error;
};

// 추가된 Mock Stub 함수들
export const sendAdminMailToUser = async (receiverVirtualEmail: string, subject: string, content: string): Promise<EmailMessage | null> => {
  return null;
};

export const updateUserProfile = async (virtualEmail: string, deliveryTime: string, name?: string, newPassword?: string): Promise<UserProfile | null> => {
  return null;
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
    replyContent: row.reply_content
  };
}
