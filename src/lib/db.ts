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
  // 실제 환경에서는 Supabase Auth (signInWithPassword)를 사용해야 하지만, 
  // 기존 가짜 패스워드 방식을 임시로 유지하려면 users 테이블에 password 칼럼이 있어야 합니다.
  // 스키마에 없으므로 Supabase Auth를 통한 로그인이 필요하지만, 프론트엔드 마이그레이션 최소화를 위해 
  // 여기서는 단순히 email 매칭만 임시로 처리합니다 (실무 보안상 위험).
  const { data, error } = await supabase.from('users')
    .select('*')
    .or(`email.eq.${emailOrVirtualEmail},virtual_email.eq.${emailOrVirtualEmail}`)
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
  // Supabase Auth 연동이 필요하지만, 임시로 users 테이블에 직접 insert 시도
  // 주의: RLS 정책상 auth.users에 없는 ID로 insert하면 실패할 수 있습니다. 
  // 본 마이그레이션은 전체 구조(Auth 포함) 개편이 필요함을 보여주는 뼈대 코드입니다.
  const virtualEmail = `${username}@stopfive.com`;
  
  const { data, error } = await supabase.from('users').insert([{
    id: crypto.randomUUID(), // 원래는 auth.uid()
    name,
    email: actualEmail,
    virtual_email: virtualEmail,
    delivery_time: deliveryTime + ':00'
  }]).select().single();

  if (error) {
    console.error('Registration failed:', error);
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
