export interface UserProfile {
  id: string;
  email: string;
  virtualEmail: string;
  name: string;
  deliveryTime: string; // "HH:MM"
  currentChain: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
  totalAppointments: number;
  createdAt: string;
  role: 'user' | 'admin';
  password?: string;
  useTimeoutMissions?: boolean;
  
  // 5회 체험 코스 필드
  courseStatus: 'not_started' | 'ongoing' | 'completed';
  courseStep: number; // 0 ~ 5 (현재 성공한 회차)
  courseStartDate: string | null; // YYYY-MM-DD
}

export interface EmailMessage {
  id: string;
  sender: string;
  receiver: string;
  subject: string;
  body: string;
  status: 'unread' | 'read' | 'archived' | 'expired';
  isSystemMission: boolean;
  missionDate: string | null; // YYYY-MM-DD
  createdAt: string;
  answeredAt: string | null;
  replyContent: string | null;
  isCourseMission?: boolean;
  courseStepIndex?: number;
  isTimeoutLimit?: boolean;
  isForceTimeout?: boolean;
}

export interface ScheduledEmail {
  id: string;
  receiverVirtualEmail: string;
  receiverName: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO datetime YYYY-MM-DDTHH:MM
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: string;
  isTimeoutLimit?: boolean;
  isForceTimeout?: boolean;
}

// 5초 ~ 1분 이내에 행동할 수 있는 즉각적인 행동 미션 라이브러리
export const MISSION_POOL = [
  "하던 일을 잠시 멈추고 박수를 3번 쳐 보세요. 완료하셨다면 답장을 보내주세요.",
  "자리에서 일어나 가볍게 기지개를 켜고 깊은 호흡을 3번 해보세요. 완료하셨다면 답장을 보내주세요.",
  "지금 마실 수 있는 물 한 잔을 준비해 천천히 한 모금 마셔보세요. 완료하셨다면 답장을 보내주세요.",
  "눈을 감고 열을 셀 동안 아무 생각도 하지 않고 가만히 멈춰보세요. 완료하셨다면 답장을 보내주세요.",
  "주변을 둘러보고 가장 눈에 띄는 파란색이나 초록색 물건 하나를 5초간 가만히 바라보세요. 완료하셨다면 답장을 보내주세요.",
  "두 손을 모아 손바닥을 서로 10초 동안 빠르게 비벼 따뜻한 열감을 느껴보세요. 완료하셨다면 답장을 보내주세요.",
  "허리를 곧게 펴고 양어깨를 귀 가까이 올렸다가 아래로 툭 떨어트리는 동작을 3번 반복해 보세요. 완료하셨다면 답장을 보내주세요.",
  "창밖을 바라보거나 방의 가장 먼 모서리를 10초 동안 가만히 응시해 보세요. 완료하셨다면 답장을 보내주세요.",
  "가볍게 주먹을 쥐었다가 쫙 펴는 동작을 양손으로 5번 천천히 반복해 보세요. 완료하셨다면 답장을 보내주세요.",
  "눈을 감고 주변에서 들리는 가장 작은 소리 하나에 10초 동안 조용히 귀 기울여 보세요. 완료하셨다면 답장을 보내주세요."
];

// 초기 복수 가입 유저 목록 (테스트 데모용)
const INITIAL_USERS: UserProfile[] = [
  {
    id: "admin_team",
    email: "admin@stopfive.com",
    virtualEmail: "team@stopfive.com",
    name: "StopFive 운영팀",
    deliveryTime: "00:00",
    currentChain: 0,
    lastCompletedDate: null,
    totalAppointments: 0,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    role: 'admin',
    password: "1234",
    courseStatus: 'completed',
    courseStep: 5,
    courseStartDate: null
  },
  {
    id: "user_sky",
    email: "sky@gmail.com",
    virtualEmail: "sky@stopfive.com",
    name: "sky",
    deliveryTime: "09:00",
    currentChain: 3,
    lastCompletedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    totalAppointments: 3,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    role: 'user',
    password: "1234",
    courseStatus: 'not_started',
    courseStep: 0,
    courseStartDate: null
  },
  {
    id: "user_min",
    email: "min@naver.com",
    virtualEmail: "min@stopfive.com",
    name: "min",
    deliveryTime: "21:00",
    currentChain: 12,
    lastCompletedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    totalAppointments: 12,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    role: 'user',
    password: "1234",
    courseStatus: 'completed',
    courseStep: 5,
    courseStartDate: new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0]
  }
];

// 예시 메일 데이터
const getInitialEmails = (): EmailMessage[] => [
  {
    id: "welcome-sky",
    sender: "team@stopfive.com",
    receiver: "sky@stopfive.com",
    subject: "Welcome to StopFive",
    body: `안녕하세요, sky님. StopFive에 오신 것을 진심으로 환영합니다.
매일 지정된 시간에 team@stopfive.com으로부터 간단한 행동 제안이 도착할 것입니다. 
이를 수행하고 답장을 보내는 것만으로 오늘의 약속이 완료됩니다.`,
    status: 'unread',
    isSystemMission: false,
    missionDate: null,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    answeredAt: null,
    replyContent: null
  },
  {
    id: "welcome-min",
    sender: "team@stopfive.com",
    receiver: "min@stopfive.com",
    subject: "Welcome to StopFive",
    body: `안녕하세요, min님. StopFive에 오신 것을 진심으로 환영합니다.
오늘부터 당신의 일상에 작은 행동적 닻을 내리게 됩니다.`,
    status: 'archived',
    isSystemMission: false,
    missionDate: null,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    answeredAt: new Date(Date.now() - 86400000 * 12 + 1000 * 30).toISOString(),
    replyContent: "네, 첫 이메일 확인했습니다. 앞으로 잘 부탁드립니다."
  },
  {
    id: "mission-yesterday-min",
    sender: "team@stopfive.com",
    receiver: "min@stopfive.com",
    subject: "Today's Anchor",
    body: `Good evening. Welcome back.
Today's appointment only takes ten seconds.

Action: 하던 일을 잠시 멈추고 박수를 3번 쳐 보세요. 완료하셨다면 답장을 보내주세요.`,
    status: 'archived',
    isSystemMission: true,
    missionDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    answeredAt: new Date(Date.now() - 86400000 + 1000 * 45).toISOString(),
    replyContent: "박수 3번 신나게 쳤습니다! 기분 환기가 되네요."
  }
];

// 로컬 스토리지 키들
const USER_KEY = 'stopfive_current_user_v2';
const USERS_LIST_KEY = 'stopfive_users_list_v2';
const EMAILS_KEY = 'stopfive_emails_list_v2';
const SCHEDULED_KEY = 'stopfive_scheduled_emails_v1';

// 1. 유저 목록 관리
export const getAllUsers = (): UserProfile[] => {
  if (typeof window === 'undefined') return INITIAL_USERS;
  const list = localStorage.getItem(USERS_LIST_KEY);
  if (!list) {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  
  const parsed = JSON.parse(list) as UserProfile[];
  let dirty = false;
  const migrated = parsed.map(u => {
    if (!u.courseStatus) {
      dirty = true;
      return {
        ...u,
        courseStatus: u.role === 'admin' ? 'completed' as const : 'not_started' as const,
        courseStep: u.role === 'admin' ? 5 : 0,
        courseStartDate: null
      };
    }
    return u;
  });

  if (dirty) {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(migrated));
  }
  return migrated;
};

export const saveAllUsers = (users: UserProfile[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
};

// 2. 현재 로그인한 세션 유저 관리
export const getCurrentUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  const parsed = JSON.parse(user) as UserProfile;
  
  // 구버전 로컬스토리지 복구 (체험 코스 속성 강제 주입)
  if (!parsed.courseStatus) {
    parsed.courseStatus = 'not_started';
    parsed.courseStep = 0;
    parsed.courseStartDate = null;
    localStorage.setItem(USER_KEY, JSON.stringify(parsed));
  }
  return parsed;
};

export const loginUser = (emailOrVirtualEmail: string, passwordInput: string): UserProfile | null => {
  const users = getAllUsers();
  const inputLower = emailOrVirtualEmail.toLowerCase();
  
  // team@stopfive.com (어드민) 로그인 패스워드가 로컬에서 꼬였을 경우 대비 자동 동기화 복구 패치
  if (inputLower === 'team@stopfive.com' || inputLower === 'admin@stopfive.com') {
    const adminIndex = users.findIndex(u => u.virtualEmail.toLowerCase() === 'team@stopfive.com');
    if (adminIndex !== -1 && users[adminIndex].password !== '1234' && passwordInput === '1234') {
      users[adminIndex].password = '1234';
      saveAllUsers(users);
    }
  }

  const found = users.find(u => 
    u.virtualEmail.toLowerCase() === inputLower || 
    u.email.toLowerCase() === inputLower
  );
  if (found) {
    // 비밀번호 매칭 검증
    if (found.password === passwordInput) {
      // 구버전 유저 마이그레이션
      if (!found.courseStatus) {
        found.courseStatus = 'not_started';
        found.courseStep = 0;
        found.courseStartDate = null;
        
        const idx = users.findIndex(u => u.virtualEmail.toLowerCase() === found.virtualEmail.toLowerCase());
        if (idx !== -1) {
          users[idx] = found;
          saveAllUsers(users);
        }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(found));
      return found;
    }
  }
  return null;
};

// 회원가입 (신규 유저 생성)
export const registerUser = (
  name: string,
  username: string,
  actualEmail: string,
  deliveryTime: string,
  passwordInput: string
): UserProfile | null => {
  const users = getAllUsers();
  const virtualEmail = `${username}@stopfive.com`;
  
  // 이미 가입된 가상 메일인지 확인
  const existing = users.find(u => u.virtualEmail.toLowerCase() === virtualEmail.toLowerCase());
  if (existing) {
    return null;
  }

  const newUser: UserProfile = {
    id: `user_${Date.now()}`,
    email: actualEmail,
    virtualEmail,
    name,
    deliveryTime,
    currentChain: 0,
    lastCompletedDate: null,
    totalAppointments: 0,
    createdAt: new Date().toISOString(),
    role: 'user',
    password: passwordInput,
    courseStatus: 'not_started',
    courseStep: 0,
    courseStartDate: null
  };

  const updatedUsers = [...users, newUser];
  saveAllUsers(updatedUsers);
  localStorage.setItem(USER_KEY, JSON.stringify(newUser));

  // 신규 가입자 웰컴 메일 즉시 발송
  const welcomeMail: EmailMessage = {
    id: `welcome-${newUser.id}`,
    sender: "team@stopfive.com",
    receiver: newUser.virtualEmail,
    subject: "Welcome to StopFive",
    body: `안녕하세요, ${name}님. StopFive에 가입해 주셔서 대단히 감사합니다.

StopFive는 '매일 정시'에 유저분들이 가벼운 행동(Action)을 통해 사고를 환기하고 자신과 맺은 약속을 돌보는 플랫폼입니다.

오른쪽 하단의 'Trigger Today's Mail' 버튼을 누르면 매일 정각을 기다리지 않고도 바로 오늘의 행동 앵커 메일을 수신해 볼 수 있습니다. 

도착한 메일을 읽고 행동하신 후 아래 답장 칸에 메일을 작성해 보내주세요.
그것만으로 오늘의 약속이 완료되며, 보관함으로 보관됩니다.`,
    status: 'unread',
    isSystemMission: false,
    missionDate: null,
    createdAt: new Date().toISOString(),
    answeredAt: null,
    replyContent: null
  };

  const emails = getLocalEmails();
  saveLocalEmails([welcomeMail, ...emails]);

  return newUser;
};

export const logoutUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
};

// 유저의 미션 수신 시간 및 비밀번호 변경 등 개인 설정 업데이트
export const updateUserProfile = (
  virtualEmail: string, 
  deliveryTime: string, 
  name?: string,
  newPassword?: string
): UserProfile | null => {
  const users = getAllUsers();
  const index = users.findIndex(u => u.virtualEmail.toLowerCase() === virtualEmail.toLowerCase());
  if (index === -1) return null;

  const updated = {
    ...users[index],
    deliveryTime,
    ...(name ? { name } : {}),
    ...(newPassword ? { password: newPassword } : {})
  };

  users[index] = updated;
  saveAllUsers(users);

  // 현재 세션도 동기화
  const current = getCurrentUser();
  if (current && current.virtualEmail.toLowerCase() === virtualEmail.toLowerCase()) {
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  return updated;
};

// 4. 예약 발송 이메일 관리
export const getScheduledEmails = (): ScheduledEmail[] => {
  if (typeof window === 'undefined') return [];
  const list = localStorage.getItem(SCHEDULED_KEY);
  if (!list) return [];
  return JSON.parse(list);
};

export const saveScheduledEmails = (scheduled: ScheduledEmail[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduled));
};

export const addScheduledEmail = (
  receiverVirtualEmail: string,
  receiverName: string,
  subject: string,
  body: string,
  scheduledAt: string
): ScheduledEmail => {
  const newItem: ScheduledEmail = {
    id: `sched-${Date.now()}`,
    receiverVirtualEmail,
    receiverName,
    subject,
    body,
    scheduledAt,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  const all = getScheduledEmails();
  saveScheduledEmails([...all, newItem]);
  return newItem;
};

export const deleteScheduledEmail = (id: string) => {
  const all = getScheduledEmails();
  saveScheduledEmails(all.filter(s => s.id !== id));
};

// 예약 시간이 도래한 발송 건을 실제 메일로 전환 처리
export const processScheduledEmails = (): number => {
  const now = new Date();
  const scheduled = getScheduledEmails();
  let sent = 0;

  const updated = scheduled.map(item => {
    if (item.status !== 'pending') return item;
    const scheduledTime = new Date(item.scheduledAt);
    if (scheduledTime <= now) {
      // 실제 메일 발송
      const emails = getLocalEmails();
      const mail: EmailMessage = {
        id: `scheduled-mail-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        sender: 'team@stopfive.com',
        receiver: item.receiverVirtualEmail,
        subject: item.subject,
        body: item.body,
        status: 'unread',
        isSystemMission: false,
        missionDate: null,
        createdAt: new Date().toISOString(),
        answeredAt: null,
        replyContent: null
      };
      saveLocalEmails([mail, ...emails]);
      window.dispatchEvent(new Event('stopfive_new_mail'));
      sent++;
      return { ...item, status: 'sent' as const };
    }
    return item;
  });

  saveScheduledEmails(updated);
  return sent;
};

// 3. 이메일 목록 관리
export const getLocalEmails = (): EmailMessage[] => {
  if (typeof window === 'undefined') return [];
  const list = localStorage.getItem(EMAILS_KEY);
  if (!list) {
    const initial = getInitialEmails();
    localStorage.setItem(EMAILS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(list);
};

export const saveLocalEmails = (emails: EmailMessage[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
};

// 특정 유저에게 데일리 미션 메일 발송
export const generateDailyMissionForUser = (userEmail: string, dateStr: string): EmailMessage | null => {
  const emails = getLocalEmails();
  
  // 이미 발송된 미션이 있는지 검증
  const existing = emails.find(e => e.receiver === userEmail && e.isSystemMission && e.missionDate === dateStr);
  if (existing) return null;

  // 날짜 기반 미션 바디 추출
  const dateHash = dateStr.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const missionIndex = dateHash % MISSION_POOL.length;
  const missionBody = MISSION_POOL[missionIndex];

  const newMission: EmailMessage = {
    id: `mission-${userEmail}-${dateStr}`,
    sender: "team@stopfive.com",
    receiver: userEmail,
    subject: "Today's Anchor",
    body: `Good evening. Welcome back.
Today's appointment only takes ten seconds.

Action: ${missionBody}`,
    status: 'unread',
    isSystemMission: true,
    missionDate: dateStr,
    createdAt: new Date().toISOString(),
    answeredAt: null,
    replyContent: null
  };

  saveLocalEmails([newMission, ...emails]);
  return newMission;
};

// 답장(Reply) 보내기 및 완료 처리 (지정 유저 기준)
export const sendReply = (emailId: string, replyText: string): EmailMessage | null => {
  const emails = getLocalEmails();
  const currentUser = getCurrentUser();
  if (!currentUser) return null;
  
  const now = new Date();
  const emailIndex = emails.findIndex(e => e.id === emailId);
  if (emailIndex === -1) return null;

  const email = emails[emailIndex];
  email.status = 'archived';
  email.answeredAt = now.toISOString();
  email.replyContent = replyText;

  // 답장을 보낸 메일에 대해 해당 유저의 체인 및 통계 업데이트
  // (시스템 미션 + 운영자 발송 예약 메일 모두 포함)
  const isTrackable = email.receiver === currentUser.virtualEmail && email.sender === 'team@stopfive.com';
  if (isTrackable) {
    const todayStr = now.toISOString().split('T')[0];
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.virtualEmail === currentUser.virtualEmail);

    if (userIndex !== -1) {
      const u = users[userIndex];
      // 오늘 이미 완료한 경우 중복 집계 방지
      if (u.lastCompletedDate !== todayStr) {
        // 체인 계산
        if (u.lastCompletedDate === null) {
          u.currentChain = 1;
        } else {
          const lastDate = new Date(u.lastCompletedDate);
          const diffTime = Math.abs(now.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 1) {
            u.currentChain += 1;
          } else {
            u.currentChain = 1;
          }
        }
        u.lastCompletedDate = todayStr;
        u.totalAppointments += 1;
      }

      // 체험 코스 진행 상태 업데이트 (중복 여부와 무관하게 핑퐁마다 진도 업데이트 가능하도록 처리)
      if (email.isCourseMission && email.courseStepIndex) {
        // 이미 완료된 단계보다 클 때만 전진
        if (email.courseStepIndex > u.courseStep) {
          u.courseStep = email.courseStepIndex;
          if (u.courseStep >= 5) {
            u.courseStatus = 'completed';
          }
        }
      }
      
      users[userIndex] = u;
      saveAllUsers(users);
      // 세션 유저도 업데이트
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    }
  }

  // 보낸편지함 목록에 저장할 유저가 보낸 답장 메일 객체
  const userReplyMail: EmailMessage = {
    id: `reply-sent-${emailId}-${Date.now()}`,
    sender: currentUser.virtualEmail,
    receiver: email.sender, // team@stopfive.com
    subject: `Re: ${email.subject}`,
    body: replyText,
    status: 'read',
    isSystemMission: false,
    missionDate: null,
    createdAt: now.toISOString(),
    answeredAt: null,
    replyContent: null
  };

  emails[emailIndex] = email;
  const updatedEmails = [userReplyMail, ...emails];
  saveLocalEmails(updatedEmails);

  return email;
};

// 운영자(team@stopfive.com)가 유저에게 답장 또는 신규 메일 작성
export const adminSendMail = (receiverEmail: string, subject: string, body: string): EmailMessage => {
  const emails = getLocalEmails();
  const now = new Date();

  const newMail: EmailMessage = {
    id: `admin-sent-${Date.now()}`,
    sender: "team@stopfive.com",
    receiver: receiverEmail,
    subject: subject,
    body: body,
    status: 'unread',
    isSystemMission: false,
    missionDate: null,
    createdAt: now.toISOString(),
    answeredAt: null,
    replyContent: null
  };

  saveLocalEmails([newMail, ...emails]);
  return newMail;
};

// 유저가 운영팀에게 직접 새 메일 작성 (Compose)
export const sendComposeMail = (subject: string, content: string): EmailMessage | null => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const emails = getLocalEmails();
  const now = new Date();

  const newMail: EmailMessage = {
    id: `compose-${Date.now()}`,
    sender: currentUser.virtualEmail,
    receiver: "team@stopfive.com",
    subject: subject,
    body: content,
    status: 'unread', // 운영자가 안 읽은 메일
    isSystemMission: false,
    missionDate: null,
    createdAt: now.toISOString(),
    answeredAt: null,
    replyContent: null
  };

  saveLocalEmails([newMail, ...emails]);

  // 시뮬레이션을 위해 3초 후 어드민 자동 회신 발송
  setTimeout(() => {
    const list = getLocalEmails();
    const adminReply: EmailMessage = {
      id: `admin-auto-reply-${Date.now()}`,
      sender: "team@stopfive.com",
      receiver: currentUser.virtualEmail,
      subject: `Re: ${subject}`,
      body: `안녕하세요, ${currentUser.name}님. StopFive 운영팀입니다.
보내주신 문의(${subject})는 정상 접수되었습니다.

저희는 가상 메일 교환 시스템을 통해 매일 소중한 약속의 고리를 안전하게 보호해 나가고자 합니다.

감사합니다.`,
      status: 'unread',
      isSystemMission: false,
      missionDate: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
      replyContent: null
    };
    saveLocalEmails([adminReply, ...list]);
    window.dispatchEvent(new Event('stopfive_new_mail'));
  }, 3500);

  return newMail;
};

// 관리자가 특정 유저에게 가상 메일 발송
export const sendAdminMailToUser = (receiverVirtualEmail: string, subject: string, content: string): EmailMessage | null => {
  const admin = getCurrentUser();
  if (!admin || admin.role !== 'admin') return null;

  const emails = getLocalEmails();
  const now = new Date();

  const newMail: EmailMessage = {
    id: `admin-send-${Date.now()}`,
    sender: "team@stopfive.com",
    receiver: receiverVirtualEmail,
    subject: subject,
    body: content,
    status: 'unread',
    isSystemMission: false,
    missionDate: null,
    createdAt: now.toISOString(),
    answeredAt: null,
    replyContent: null
  };

  saveLocalEmails([newMail, ...emails]);
  window.dispatchEvent(new Event('stopfive_new_mail'));
  return newMail;
};

// 특정 유저의 통계 계산
export interface DetailedStats {
  appointmentsKept: number;
  responseConsistency: number; // %
  averageResponseTime: string;
  currentChain: number;
  completionRateByDay: { date: string; completed: boolean }[];
}

export const getStatsForUser = (virtualEmail: string): DetailedStats => {
  const users = getAllUsers();
  const emails = getLocalEmails();
  const u = users.find(user => user.virtualEmail === virtualEmail) || INITIAL_USERS[1];

  // team@stopfive.com이 보낸 메일 전체 (시스템 미션 + 예약 발송 + 수동 발송)
  const userTrackableMails = emails.filter(e => e.receiver === virtualEmail && e.sender === 'team@stopfive.com');
  const completedMails = userTrackableMails.filter(e => e.answeredAt !== null);

  let totalDiffMs = 0;
  let count = 0;

  completedMails.forEach(m => {
    if (m.answeredAt) {
      const created = new Date(m.createdAt).getTime();
      const answered = new Date(m.answeredAt).getTime();
      totalDiffMs += (answered - created);
      count++;
    }
  });

  let avgTimeStr = "0초";
  if (count > 0) {
    const avgMs = totalDiffMs / count;
    const avgSec = Math.round(avgMs / 1000);
    if (avgSec < 60) {
      avgTimeStr = `${avgSec}초`;
    } else {
      const avgMin = Math.round(avgSec / 60);
      avgTimeStr = `${avgMin}분`;
    }
  }

  const last7Mails = userTrackableMails.slice(0, 7);
  const last7Completed = last7Mails.filter(e => e.answeredAt !== null).length;
  const consistency = last7Mails.length > 0 
    ? Math.round((last7Completed / last7Mails.length) * 100) 
    : 100;

  // 14일 캘린더: 날짜별로 team에서 온 메일에 답장했는지 여부 표시
  const completionRateByDay: { date: string; completed: boolean }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    // missionDate 기반 매칭 또는 createdAt 날짜 기반 매칭
    const mail = userTrackableMails.find(e => 
      e.missionDate === dateStr || 
      e.createdAt.split('T')[0] === dateStr
    );
    completionRateByDay.push({
      date: dateStr,
      completed: mail ? mail.answeredAt !== null : false
    });
  }

  return {
    appointmentsKept: u.totalAppointments,
    responseConsistency: consistency,
    averageResponseTime: avgTimeStr,
    currentChain: u.currentChain,
    completionRateByDay
  };
};

// ==========================================
// 5. 3일 5회 체험 코스 시스템
// ==========================================

export interface CourseMissionDef {
  step: number;
  day: number;
  action: string;
}

export const EXPERIENCE_COURSE_MISSIONS: CourseMissionDef[] = [
  {
    step: 1,
    day: 1,
    action: "제자리에서 손바닥을 서로 10초 동안 비비며 따뜻한 열감을 느껴보세요."
  },
  {
    step: 2,
    day: 1,
    action: "가볍게 주먹을 쥐었다가 쫙 펴는 동작을 양손으로 5번 천천히 반복해 보세요."
  },
  {
    step: 3,
    day: 2,
    action: "자리에서 일어나 가볍게 기지개를 켜고 깊은 호흡을 3번 해보세요."
  },
  {
    step: 4,
    day: 2,
    action: "지금 마실 수 있는 물 한 잔을 준비해 천천히 한 모금 마셔보세요."
  },
  {
    step: 5,
    day: 3,
    action: "허리를 곧게 펴고 양어깨를 귀 가까이 올렸다가 아래로 툭 떨어트리는 동작을 3번 반복해 보세요."
  }
];

// 체험 코스 시작
export const startExperienceCourse = (virtualEmail: string): UserProfile | null => {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.virtualEmail.toLowerCase() === virtualEmail.toLowerCase());
  if (userIndex === -1) return null;

  const u = users[userIndex];
  u.courseStatus = 'ongoing';
  u.courseStep = 0;
  u.courseStartDate = new Date().toISOString().split('T')[0];

  users[userIndex] = u;
  saveAllUsers(users);
  localStorage.setItem(USER_KEY, JSON.stringify(u));

  // 1회차 미션 메일 즉시 발송
  sendCourseMissionMail(u, 1);

  return u;
};

// 다음 코스 미션 강제 발송 (유저 핑퐁 후 다음 단계로 이행하기 위함)
const sendCourseMissionMail = (user: UserProfile, step: number): EmailMessage | null => {
  const missionDef = EXPERIENCE_COURSE_MISSIONS.find(m => m.step === step);
  if (!missionDef) return null;

  const emails = getLocalEmails();
  
  // 이미 발송된 동일 단계 코스 미션이 있는지 검증
  const existing = emails.find(e => e.receiver === user.virtualEmail && e.isCourseMission && e.courseStepIndex === step);
  if (existing) return existing;

  const newMail: EmailMessage = {
    id: `course-mission-${user.id}-${step}-${Date.now()}`,
    sender: "team@stopfive.com",
    receiver: user.virtualEmail,
    subject: `[StopFive 5회 체험 코스] Day ${missionDef.day} - ${step}회차 미션`,
    body: `안녕하세요, ${user.name}님. 
행동의 물꼬를 트는 5회 체험 코스(3일 프로그램)를 시작합니다.

행동 가이드: ${missionDef.action}

이 메일을 읽고 위 행동을 완료하셨다면, 아래 답장창에 수행 소감을 작성해 보내주세요.
그것만으로 오늘의 약속이 완료되며, 보관함으로 보관됩니다.`,
    status: 'unread',
    isSystemMission: true, // 통계 연동을 위해 true 처리
    missionDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    answeredAt: null,
    replyContent: null,
    isCourseMission: true,
    courseStepIndex: step
  };

  saveLocalEmails([newMail, ...emails]);
  window.dispatchEvent(new Event('stopfive_new_mail'));
  return newMail;
};

// 다음 미션 즉시 받기
export const getNextCourseMission = (virtualEmail: string): EmailMessage | null => {
  const users = getAllUsers();
  const u = users.find(user => user.virtualEmail.toLowerCase() === virtualEmail.toLowerCase());
  if (!u || u.courseStatus !== 'ongoing') return null;

  // 다음 단계 미션 발송
  const nextStep = u.courseStep + 1;
  if (nextStep > 5) return null;

  return sendCourseMissionMail(u, nextStep);
};

// 가상 하루 경과 시뮬레이터 (Day 1 -> Day 2 등으로 전환해 다음 미션을 받을 수 있게 함)
export const simulateNextDayForUser = (virtualEmail: string): UserProfile | null => {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.virtualEmail.toLowerCase() === virtualEmail.toLowerCase());
  if (userIndex === -1) return null;

  const u = users[userIndex];
  if (u.courseStatus !== 'ongoing') return u;

  // 하루 전으로 시작일자를 당김으로써 날짜 경과를 가상 시뮬레이션
  if (u.courseStartDate) {
    const d = new Date(u.courseStartDate);
    d.setDate(d.getDate() - 1);
    u.courseStartDate = d.toISOString().split('T')[0];
  }

  users[userIndex] = u;
  saveAllUsers(users);
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  return u;
};

// 코스 리셋 (처음부터 다시하기)
export const resetExperienceCourse = (virtualEmail: string): UserProfile | null => {
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.virtualEmail.toLowerCase() === virtualEmail.toLowerCase());
  if (userIndex === -1) return null;

  const u = users[userIndex];
  u.courseStatus = 'not_started';
  u.courseStep = 0;
  u.courseStartDate = null;

  users[userIndex] = u;
  saveAllUsers(users);
  localStorage.setItem(USER_KEY, JSON.stringify(u));

  // 기존 코스 미션 메일 삭제 처리 (깔끔한 리셋을 위해)
  const emails = getLocalEmails();
  const filtered = emails.filter(e => !(e.receiver === virtualEmail && e.isCourseMission));
  saveLocalEmails(filtered);
  window.dispatchEvent(new Event('stopfive_new_mail'));

  return u;
};
