'use client';

import React, { useState, useEffect } from 'react';
import { 
  getCurrentUser, 
  loginUser, 
  registerUser, 
  logoutUser, 
  getLocalEmails, 
  sendReply, 
  sendComposeMail,
  sendAdminMailToUser,
  updateUserProfile,
  getStatsForUser,
  startExperienceCourse,
  getNextCourseMission,
  simulateNextDayForUser,
  resetExperienceCourse,
  getAllUsers,
  getScheduledEmails,
  createScheduledEmail,
  cancelScheduledEmail,
  markEmailAsArchived,
  expireEmail
} from '../lib/db';
const ITEMS_PER_PAGE = 20;

const Pagination = ({ total, current, onChange }: { total: number, current: number, onChange: (p: number) => void }) => {
  const maxPage = Math.ceil(total / ITEMS_PER_PAGE);
  if (maxPage <= 1) return null;
  const pages = Array.from({length: maxPage}, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center space-x-2 py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
      <button onClick={() => onChange(1)} disabled={current === 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
      </button>
      <button onClick={() => onChange(current - 1)} disabled={current === 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)} className={`w-7 h-7 flex items-center justify-center rounded text-[13px] font-medium transition-all ${p === current ? 'bg-white border border-[#1A73E8] text-[#1A73E8]' : 'text-slate-600 hover:bg-slate-100'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(current + 1)} disabled={current === maxPage} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
      </button>
      <button onClick={() => onChange(maxPage)} disabled={current === maxPage} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
};

export default function Home() {
  // 사용자 및 내비게이션 상태
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userTab, setUserTab] = useState<'inbox' | 'missions' | 'archive' | 'sent' | 'statistics' | 'settings' | 'compose'>('inbox');
  const [adminTab, setAdminTab] = useState<'users' | 'statistics' | 'compose' | 'scheduled' | 'scheduled-manage' | 'inbox' | 'sent' | 'archive' | 'settings'>('inbox');
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [authError, setAuthError] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isCourseGuideOpen, setIsCourseGuideOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Compose 신규 메일 상태
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // 현재 KST 시각을 구하는 함수
  const getKstNow = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstNow = new Date(utc + (9 * 60 * 60 * 1000));
    const yyyy = kstNow.getFullYear();
    const mm = String(kstNow.getMonth() + 1).padStart(2, '0');
    const dd = String(kstNow.getDate()).padStart(2, '0');
    const hh = String(kstNow.getHours()).padStart(2, '0');
    const min = String(kstNow.getMinutes()).padStart(2, '0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      hour: hh,
      minute: min
    };
  };

  const kstTime = getKstNow();

  // 예약 메일 상태
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [scheduledTo, setScheduledTo] = useState('');
  const [scheduledSubject, setScheduledSubject] = useState('');
  const [scheduledBody, setScheduledBody] = useState('');
  const [scheduledDate, setScheduledDate] = useState(kstTime.date);
  const [scheduledHour, setScheduledHour] = useState(kstTime.hour);
  const [scheduledMinute, setScheduledMinute] = useState(kstTime.minute);
  const [scheduledTimeoutLimit, setScheduledTimeoutLimit] = useState(false);
  const [scheduledForceTimeout, setScheduledForceTimeout] = useState(false);
  const [useTimeoutMissionsSetting, setUseTimeoutMissionsSetting] = useState(true);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');
  const [, setForceRender] = useState(0); // 10초마다 강제 리렌더링 (만료 계산 재실행용)
  const [selectedScheduledEmail, setSelectedScheduledEmail] = useState<any>(null);

  const [isReservationChecked, setIsReservationChecked] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUseTimeoutMissionsSetting(currentUser.useTimeoutMissions ?? true);
    }
  }, [currentUser]);

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 설정 폼 상태
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
    setSelectedEmail(null);
    setSelectedScheduledEmail(null);
  }, [adminTab, userTab]);

  // 로그인/회원가입 폼 상태
  const [authMode, setAuthMode] = useState<'home' | 'login' | 'register' | 'dashboard'>('home');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authDeliveryTime, setAuthDeliveryTime] = useState('09:00');

  // 모바일 메뉴 사이드바 토글 상태
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 토스트 메시지 상태
  const [toast, setToast] = useState<{ show: boolean; message: string; title?: string }>({
    show: false,
    message: '',
    title: ''
  });

  const [isAuthModeLoaded, setIsAuthModeLoaded] = useState(false);

  // 초기 로딩
  useEffect(() => {
    // 1. await 전에 동기적으로 읽어둡니다.
    const savedMode = sessionStorage.getItem('authMode');
    const savedUserTab = sessionStorage.getItem('userTab');
    const savedAdminTab = sessionStorage.getItem('adminTab');
    
    // 깜빡임 방지를 위해 즉시 모드/탭 복구 시도 (currentUser 로드 전이므로 임시)
    if (savedMode && savedMode !== 'home') {
      setAuthMode(savedMode as any);
    }
    if (savedUserTab) setUserTab(savedUserTab as any);
    if (savedAdminTab) setAdminTab(savedAdminTab as any);

    const fetchData = async () => {
      const user = await getCurrentUser();
      
      if (user) {
        setCurrentUser(user);
        setEmails(await getLocalEmails(user.virtualEmail));
        if (savedMode === 'home') {
          setAuthMode('home');
        } else {
          setAuthMode('dashboard');
        }
      } else {
        if (savedMode === 'login' || savedMode === 'register') {
          setAuthMode(savedMode as any);
        } else {
          setAuthMode('home');
        }
      }
      setAllUsers(await getAllUsers());
      setIsAuthModeLoaded(true); // 읽기 및 세팅이 끝났음을 알림
    };
    fetchData();

    // 10초마다 강제 리렌더링 → 이미 로드된 이메일의 만료시간 계산을 즉시 재실행
    // (예약 메일 발송 및 DB 만료 처리는 Supabase pg_cron이 1분마다 서버 측에서 처리)
    const renderInterval = setInterval(() => {
      setForceRender(n => n + 1);
    }, 10000);

    return () => { clearInterval(renderInterval); };
  }, []);

  useEffect(() => {
    if (isAuthModeLoaded) {
      sessionStorage.setItem('authMode', authMode);
      sessionStorage.setItem('userTab', userTab);
      sessionStorage.setItem('adminTab', adminTab);
    }
  }, [authMode, userTab, adminTab, isAuthModeLoaded]);

  useEffect(() => {
    if (currentUser) {
      getStatsForUser(currentUser.virtualEmail).then(setStats);
    } else {
      setStats(null);
    }
  }, [currentUser]);

  useEffect(() => {
    if (adminTab === 'scheduled' || adminTab === 'scheduled-manage') {
      getScheduledEmails().then(setScheduledEmails);
    }
    if (adminTab === 'scheduled') {
      const freshKst = getKstNow();
      setScheduledDate(freshKst.date);
      setScheduledHour(freshKst.hour);
      setScheduledMinute(freshKst.minute);
    }
  }, [adminTab]);

  // 토스트 도우미
  const triggerToast = (message: string, title?: string) => {
    // 말풍선(Toast) 알림 UI를 모두 제거해달라는 요청에 따라 비활성화
  };

  // 로그인 핸들러
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const user = await loginUser(authEmail, authPassword);
    if (user) {
      setCurrentUser(user);
      setEmails(await getLocalEmails(user.virtualEmail));
      setAuthPassword('');
      setAuthMode('dashboard');
    } else {
      setAuthError('아이디가 존재하지 않거나 비밀번호가 틀렸습니다.');
    }
  };

  // 회원가입 핸들러
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const username = authEmail.split('@')[0] || 'user';
    const user = await registerUser(authName, username, authEmail, authDeliveryTime, authPassword);
    if (user) {
      setCurrentUser(user);
      setEmails(await getLocalEmails(user.virtualEmail));
      setAllUsers(await getAllUsers());
      setAuthPassword('');
      setAuthMode('dashboard');
    } else {
      setAuthError('회원가입에 실패했습니다. (이미 존재하는 이메일일 수 있습니다)');
    }
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setSelectedEmail(null);
    setUserTab('inbox');
    setAdminTab('inbox');
    setAuthMode('home');
  };

  // 답장 보내기 핸들러
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedEmail || !currentUser) return;

    const success = await sendReply(selectedEmail.id, replyText, replySubject);
    if (success) {
      // 리스트 갱신 및 상태 동기화
      setEmails(await getLocalEmails(currentUser.virtualEmail));
      const updatedUser = await getCurrentUser();
      setCurrentUser(updatedUser);
      
      triggerToast("답장이 성공적으로 전송되어 약속이 보관함으로 옮겨졌습니다.", "답장 전송 완료");
      setReplyText('');
      setReplySubject('');
      setSelectedEmail(null);
    }
  };

  // 관리자 전용: 특정 유저에게 다음 날 핑퐁 메일 수동 강제 전송 시뮬레이션
  const handleAdminTriggerNextDay = async (userVirtualEmail: string) => {
    const updated = await simulateNextDayForUser(userVirtualEmail);
    if (updated) {
      // DB 상태 새로고침
      setAllUsers(await getAllUsers());
      if (currentUser) {
        setEmails(await getLocalEmails(currentUser.virtualEmail));
      }
      triggerToast(`${updated.name}님에게 다음 5회 체험 미션 메일이 강제 발송되었습니다.`, "알림 메일 강제 트리거 성공");
    } else {
      triggerToast("코스가 완료되었거나 더 이상 발송할 미션이 없습니다.", "강제 발송 실패");
    }
  };

  // 신규 메일 발송 핸들러
  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    let success = false;
    if (currentUser.role === 'admin') {
      if (isReservationChecked) {
        // 예약 발송 등록
        if (!scheduledDate || !scheduledHour || !scheduledMinute) {
          triggerToast("예약 날짜와 시간을 입력해주세요.", "입력 오류");
          return;
        }
        const scheduleDateStr = new Date(`${scheduledDate}T${scheduledHour}:${scheduledMinute}:00+09:00`).toISOString();
        const targetUser = allUsers.find(u => u.virtualEmail === composeTo);
        const receiverName = targetUser ? targetUser.name : 'Unknown';
        
        success = await createScheduledEmail(
          composeTo,
          receiverName,
          composeSubject,
          composeBody,
          scheduleDateStr,
          scheduledTimeoutLimit,
          scheduledForceTimeout
        );
        
        if (success) {
          setScheduledEmails(await getScheduledEmails());
          setIsComposeOpen(false);
          setAdminTab('scheduled-manage');
          setSelectedEmail(null);
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
          setIsReservationChecked(false);
          setScheduledTimeoutLimit(false);
          setScheduledForceTimeout(false);
          triggerToast("예약 미션이 성공적으로 등록되었습니다.", "예약 등록 완료");
        } else {
          triggerToast("예약 등록에 실패했습니다. (DB 오류)", "예약 실패");
        }
        return;
      } else {
        // 즉시 발송
        success = await sendAdminMailToUser(composeTo, composeSubject, composeBody, scheduledTimeoutLimit);
      }
    } else {
      success = await sendComposeMail(currentUser.virtualEmail, composeSubject, composeBody);
    }

    if (success) {
      setEmails(await getLocalEmails(currentUser.virtualEmail));
      setIsComposeOpen(false);
      if (currentUser.role === 'admin' && adminTab === 'compose') {
        setAdminTab('sent');
        setSelectedEmail(null);
      }
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setIsReservationChecked(false);
      setScheduledTimeoutLimit(false);
      setScheduledForceTimeout(false);
      triggerToast("작성하신 메일이 성공적으로 전송되었습니다.", "메일 발송 완료");
    } else {
      triggerToast("메일 전송에 실패했습니다. 세션을 확인해 주세요.");
    }
  };

  // 메일 읽기 선택 핸들러
  const handleSelectEmail = async (email: any) => {
    if (!currentUser) return;
    
    const isMissionEmail = email.sender?.toLowerCase() === 'team@stopfive.com' || email.isTimeoutLimit || email.isForceTimeout || email.isSystemMission;

    // 5분 만료 실시간 체크 (미션 메일이고 isTimeoutLimit이 켜진 경우만)
    const isTimeout = email.isTimeoutLimit && email.status === 'unread' && (new Date().getTime() - new Date(email.createdAt).getTime() > 5 * 60 * 1000);
    let finalStatus = email.status;
    
    if (isTimeout) {
      // 만료된 미션 메일: DB에 read로 기록하고 화면을 즉시 갱신 (DB 제약 우회)
      finalStatus = 'read';
      await expireEmail(email.id);
      // emails 상태도 즉시 업데이트 (10초 타이머 기다리지 않고)
      setEmails(prev => prev.map((e: any) => e.id === email.id ? { ...e, status: 'read' } : e));
    } else if (!isMissionEmail) {
      // 일반 메일(팀 발송이 아닌 일반 유저간 메일)만 읽음/보관 처리
      const local = await getLocalEmails(currentUser.virtualEmail);
      const found = local.find((e: any) => e.id === email.id);
      if (found && found.status === 'unread' && found.receiver?.toLowerCase() === currentUser.virtualEmail?.toLowerCase()) {
        found.status = 'archived';
        await markEmailAsArchived(found.id);
        setEmails(local);
        finalStatus = 'archived';
      }
    }
    // 미션 메일(만료 안됨)은 클릭해도 archived 처리하지 않음 → 5분 타이머 계속 유지
    
    setSelectedEmail({ ...email, status: finalStatus });
    setReplySubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
  };

  // 메일 탭 필터링
  const getFilteredEmails = () => {
    if (!currentUser) return [];
    
    // 관리자 계정 여부
    const isAdmin = currentUser.role === 'admin';
    
    return emails.filter((email: any) => {
      const receiverLower = email.receiver?.toLowerCase();
      const senderLower = email.sender?.toLowerCase();
      const userEmailLower = currentUser.virtualEmail?.toLowerCase();
      const isMission = senderLower === 'team@stopfive.com' || email.isTimeoutLimit || email.isForceTimeout || email.isSystemMission;
      const elapsedMs = new Date().getTime() - new Date(email.createdAt).getTime();
      const isOver5Min = elapsedMs > 5 * 60 * 1000;
      // isExpired: pg_cron이 'read'로 업데이트한 경우 + 클라이언트 시간 계산 포함
      const isExpired = email.status === 'expired' || 
        (email.isTimeoutLimit && (email.status === 'read' || email.status === 'unread') && isOver5Min) ||
        (email.isTimeoutLimit && email.status === 'read');

      if (userTab === 'inbox') {
        // 일반 메일 또는 아직 만료되지 않은 미션 메일만 노출
        return receiverLower === userEmailLower && email.status !== 'archived' && (!isMission || !isExpired);
      }
      if (userTab === 'archive') {
        // 보관된 메일 (일반 보관메일 및 완료된 미션 메일 전체)
        return receiverLower === userEmailLower && email.status === 'archived';
      }
      if (userTab === 'missions') {
        // 5분 타임아웃이 초과되어 만료(삭제) 처리된 미션 메일만 노출
        return receiverLower === userEmailLower && isMission && isExpired;
      }
      if (userTab === 'sent') {
        // 본인이 발신한 메일들
        return senderLower === userEmailLower;
      }
      return false;
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const userFiltered = getFilteredEmails();

  // -- 관리자 모드 필터링 데이터 (페이지네이션용) --
  const adminFilteredEmails = emails.filter((e: any) => {
    if (adminTab === 'inbox') return e.receiver === currentUser?.virtualEmail && e.status !== 'archived';
    if (adminTab === 'sent') return e.sender === currentUser?.virtualEmail;
    if (adminTab === 'archive') return e.receiver === currentUser?.virtualEmail && e.status === 'archived';
    return true;
  });
  const adminUsersList = allUsers.filter(u => u.role !== 'admin');
  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      


      {/* 1. 비로그인 유저 및 홈 화면 */}
      {(authMode === 'home' || !currentUser) ? (
        <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">

          {/* 로그인 화면 */}
          {authMode === 'login' && (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fc] dark:bg-slate-950 px-4">
              <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                  <button 
                    onClick={() => setAuthMode('home')}
                    className="flex items-center justify-center space-x-2 mb-4 cursor-pointer hover:opacity-75 transition-opacity"
                  >
                    <span className="w-8 h-8 bg-[#202124] rounded-lg flex items-center justify-center text-white text-sm font-black">5</span>
                    <span className="text-2xl font-black text-[#202124] dark:text-white tracking-tight">StopFive</span>
                  </button>
                  <h1 className="text-xl font-bold text-[#202124] dark:text-white">로그인</h1>
                  <p className="text-xs text-slate-500">계정에 로그인하여 메일함으로 이동합니다</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-5">
                  {authError && (
                    <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                      {authError}
                    </div>
                  )}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">이메일</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="가입한 이메일 주소"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">비밀번호</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="비밀번호"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#202124] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all"
                    >
                      로그인
                    </button>
                  </form>
                  <div className="text-center text-xs text-slate-400">
                    계정이 없으신가요?{' '}
                    <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="font-bold text-[#202124] dark:text-white hover:underline">
                      회원가입
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <button onClick={() => setAuthMode('home')} className="text-xs text-slate-400 hover:text-slate-600 transition-all">
                    ← 홈으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 회원가입 화면 */}
          {authMode === 'register' && (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8fc] dark:bg-slate-950 px-4 py-12">
              <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                  <button 
                    onClick={() => setAuthMode('home')}
                    className="flex items-center justify-center space-x-2 mb-4 cursor-pointer hover:opacity-75 transition-opacity"
                  >
                    <span className="w-8 h-8 bg-[#202124] rounded-lg flex items-center justify-center text-white text-sm font-black">5</span>
                    <span className="text-2xl font-black text-[#202124] dark:text-white tracking-tight">StopFive</span>
                  </button>
                  <h1 className="text-xl font-bold text-[#202124] dark:text-white">회원가입</h1>
                  <p className="text-xs text-slate-500">3일 5회 체험 코스에 가입합니다</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-5">
                  {authError && (
                    <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
                      {authError}
                    </div>
                  )}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">이름</label>
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="홍길동"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">이메일</label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">비밀번호</label>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="4자리 이상"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">미션 메일 수신 희망 시간</label>
                      <input
                        type="time"
                        value={authDeliveryTime}
                        onChange={(e) => setAuthDeliveryTime(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#202124] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all"
                    >
                      가입하기
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 text-center">
                    가입 즉시 @stopfive.com 가상 이메일이 부여됩니다
                  </p>
                  <div className="text-center text-xs text-slate-400">
                    이미 계정이 있으신가요?{' '}
                    <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="font-bold text-[#202124] dark:text-white hover:underline">
                      로그인
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <button onClick={() => setAuthMode('home')} className="text-xs text-slate-400 hover:text-slate-600 transition-all">
                    ← 홈으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 랜딩 홈 화면 (로그인/가입 폼 제거, 서비스 소개만) */}
          {authMode === 'home' && (
          <>
          {/* 랜딩 헤더 */}
          <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/40 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md z-40 fixed top-0 left-0 right-0">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold">5</span>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">StopFive</span>
            </div>
            <div className="flex items-center space-x-3">
              {currentUser ? (
                <button
                  onClick={() => setAuthMode('dashboard')}
                  className="px-4 py-1.5 bg-[#202124] hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all"
                >
                  내 대시보드로 가기
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAuthMode('login')}
                    className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#202124] dark:text-white text-xs font-bold rounded-full transition-all"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => setAuthMode('register')}
                    className="px-4 py-1.5 bg-[#202124] hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          </header>

          {/* 메인 히어로 섹션 */}
          <main className="flex-1 pt-24 pb-20 px-6 flex flex-col items-center max-w-6xl mx-auto w-full space-y-16">
            <div className="text-center max-w-2xl space-y-6 mt-8">
              <span className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-primary text-[10px] font-bold rounded-full tracking-wider uppercase">
                마이크로 행동 유도 메일 핑퐁 서비스
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                매일 같은 시간,<br />
                <span className="bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">AI와 핑퐁 메일</span>로 행동의 물꼬를 트세요
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                복잡한 해빗 트래커나 할 일 목록은 잊으세요. 
                매일 수신함으로 배달되는 30초짜리 마이크로 액션을 확인하고, 답장을 보내는 작은 약속의 반복으로 행동 습관이 형성됩니다.
              </p>
            </div>

            {/* 3일 5회 체험 코스 프리뷰 카드형 로드맵 */}
            <div className="w-full space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold tracking-tight">3일 5회 완성 체험 코스 미리보기</h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">작심삼일 한계를 깨트리기 위해 고안된 초간단 코스 진행도</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Day 1 Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-lg flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary uppercase">Day 1</span>
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-[10px] font-semibold text-primary rounded">2회 미션</span>
                    </div>
                    <h3 className="text-base font-bold">1단계: 첫 만남과 행동의 트리거</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      이메일 가입과 동시에 1회차 메일이 날아옵니다. 수신함에서 즉시 읽고, 답장을 입력하여 습관 여정의 첫 시동을 겁니다.
                    </p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col space-y-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span>1회차: 첫 웰컴 인사와 소감 회신</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span>2회차: 행동 트리거(숨쉬기, 기지개 등)</span>
                    </div>
                  </div>
                </div>

                {/* Day 2 Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-lg flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-500 uppercase">Day 2</span>
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-[10px] font-semibold text-amber-500 rounded">2회 미션</span>
                    </div>
                    <h3 className="text-base font-bold">2단계: 작은 연속성과 리듬감 형성</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      약속한 하루가 지나면 3회차 미션이 발송됩니다. 가볍게 미션을 완료하고 4회차의 이행 단계로 자연스레 이어집니다.
                    </p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col space-y-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>3회차: 마이크로 행동 미션 및 답장</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>4회차: 약속의 점진적 적응 및 리포트</span>
                    </div>
                  </div>
                </div>

                {/* Day 3 Card */}
                <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-lg flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-500 uppercase">Day 3</span>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-[10px] font-semibold text-emerald-500 rounded">최종 1회</span>
                    </div>
                    <h3 className="text-base font-bold">3단계: 최종 완성 및 완주 리포트</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      마지막 3일차 메일 핑퐁을 끝마치면, 총 5회의 체험 코스가 완전히 끝납니다. 본인의 리포트를 통해 꾸준함 수치를 확인합니다.
                    </p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col space-y-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>5회차: 최종 완성 피드백 메일 회신</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>체험 코스 완주 명예 트로피 획득</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA 버튼 영역 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
              {currentUser ? (
                <button
                  onClick={() => setAuthMode('dashboard')}
                  className="px-8 py-3.5 bg-[#202124] hover:bg-slate-800 text-white font-bold rounded-full text-sm transition-all"
                >
                  내 대시보드로 돌아가기
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAuthMode('register')}
                    className="px-8 py-3.5 bg-[#202124] hover:bg-slate-800 text-white font-bold rounded-full text-sm transition-all"
                  >
                    3일 체험 코스 시작하기
                  </button>
                  <button
                    onClick={() => setAuthMode('login')}
                    className="px-8 py-3.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#202124] dark:text-white font-bold rounded-full text-sm transition-all"
                  >
                    기존 계정으로 로그인
                  </button>
                </>
              )}
            </div>
          </main>
          </>
          )}
        </div>
      ) : currentUser.role === 'admin' ? (
        /* 2-A. 관리자 대시보드 (Gmail 어드민 콘솔) */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-screen pt-0 bg-[#F6F8FC] dark:bg-slate-950 text-slate-900 dark:text-white">
          {/* 모바일 햄버거 헤더 */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#F6F8FC] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30">
            <button
              onClick={() => { setIsMobileMenuOpen(false); setAuthMode('home'); }}
              className="flex items-center space-x-2.5 hover:opacity-75 transition-opacity"
            >
              <span className="w-6 h-6 bg-[#202124] dark:bg-slate-800 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm">5</span>
              <span className="text-xl font-black text-[#202124] dark:text-white tracking-tight">StopFive</span>
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-slate-600 dark:text-slate-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* A-1. 관리자 좌측 사이드바 */}
          <aside className={`${isMobileMenuOpen ? 'flex absolute inset-0 top-[57px] bg-[#F6F8FC] dark:bg-slate-950 z-40' : 'hidden'} md:flex md:static w-full md:w-64 bg-[#F6F8FC] dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-none flex-col justify-start md:justify-between shrink-0 p-4 md:p-3 overflow-y-auto z-20 hide-scrollbar border-b md:border-b-0 border-slate-200 dark:border-slate-800`}>
            <div className="flex flex-col space-y-4 w-full">
              {/* 로고 영역 - 데스크탑 전용 */}
              <button
                onClick={() => setAuthMode('home')}
                className="hidden md:flex items-center space-x-2.5 px-3 py-4 hover:opacity-75 transition-opacity cursor-pointer w-full text-left shrink-0"
              >
                <span className="w-7 h-7 bg-[#202124] dark:bg-slate-800 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-sm">5</span>
                <span className="text-2xl font-black text-[#202124] dark:text-white tracking-tight">StopFive</span>
                <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[8px] font-bold rounded border border-red-200 dark:border-red-900">관리자</span>
              </button>

              {/* Compose 신규 메일 쓰기 버튼 (수동 시스템 발송용 모달) */}
              <div className="mb-0 md:mb-4 shrink-0 flex items-center">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('compose'); setSelectedEmail(null); setIsMobileMenuOpen(false); }}
                  className="ml-0 md:ml-2 pl-4 pr-6 py-2 md:py-4 bg-[#C2E7FF] hover:bg-[#A8D4F7] text-[#001D35] font-bold rounded-2xl text-[14px] transition-all flex items-center space-x-2 md:space-x-4 shadow-sm w-fit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>미션 발송</span>
                </button>
              </div>

              {/* 네비게이션 메뉴 (9개 통합 항목) */}
              <nav className="flex flex-col space-y-0.5 shrink-0 pr-0">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('inbox'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center justify-between px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'inbox' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2" />
                    </svg>
                    <span>받은편지함</span>
                  </div>
                  {emails.filter((e: any) => e.receiver === currentUser.virtualEmail && e.status !== 'archived').length > 0 && (
                    <span className="text-[#1A73E8] dark:text-blue-400 text-xs font-bold px-1">
                      {emails.filter((e: any) => e.receiver === currentUser.virtualEmail && e.status !== 'archived').length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('sent'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'sent' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 md:mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>보낸편지함</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('archive'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'archive' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 md:mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>수신보관함</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('users'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'users' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 md:mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>유저 현황</span>
                </button>
                
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('statistics'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'statistics' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 md:mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  <span>통계 관리</span>
                </button>


                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('scheduled-manage'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'scheduled-manage' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 md:mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>예약 미션 관리</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setAdminTab('settings'); setSelectedEmail(null); }}
                  className={`w-auto md:w-[calc(100%-16px)] flex items-center px-4 md:pl-6 md:pr-4 h-8 rounded-full md:rounded-l-none md:rounded-r-full text-[14px] transition-all shrink-0 ${
                    adminTab === 'settings' 
                      ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 md:mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>환경 설정</span>
                </button>
              </nav>
            </div>

            {/* 어드민 사이드바 하단 로그인 세션 요약 */}
            <div className="hidden md:block space-y-2 p-1.5 pb-4">
              <div className="text-[9px] text-slate-400 px-3 py-1 space-y-0.5">
                <div>관리자 계정:</div>
                <div className="text-[#1f1f1f] dark:text-white truncate font-semibold">어드민 운영팀</div>
                <div className="truncate text-slate-450 font-light">{currentUser.virtualEmail}</div>
              </div>
            </div>
          </aside>

          {/* A-2. 관리자 메인 본문 영역 (테두리 없는 지메일 평면형) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-none rounded-none m-0 shadow-none">
            {/* 상단 탑바 */}
            <header className="h-14 px-6 flex items-center justify-between shrink-0 bg-transparent border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Console</span>
                <span className="text-xs text-slate-350">|</span>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">시스템 제어 센터</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-all"
              >
                Sign Out
              </button>
            </header>

            {/* 탭 전환 뷰 */}
            <main className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto space-y-8">
              {selectedEmail ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 -m-4 md:-m-8 min-h-[calc(100vh-56px)]">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center shrink-0 bg-transparent">
                    <button 
                      onClick={() => setSelectedEmail(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
                    >
                      <span>← Back to {adminTab}</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-4">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-white leading-tight">
                          {selectedEmail.subject}
                        </h2>
                        <span className="px-2 py-0.5 bg-[#f1f3f4] dark:bg-slate-800 text-[#5f6368] dark:text-slate-450 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-700">
                          {adminTab}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            {(selectedEmail.sender[0] || 'U').toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[13px] text-[#202124] dark:text-white">
                              <span className="font-bold">{selectedEmail.sender.split('@')[0]}</span>
                              <span className="text-slate-400 text-xs font-light ml-2">&lt;{selectedEmail.sender}&gt;</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              <span>To: </span>
                              <span className="font-medium text-slate-650 dark:text-slate-350">{selectedEmail.receiver}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(selectedEmail.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-[15px] leading-[1.7] whitespace-pre-wrap text-[#202124] dark:text-slate-100 font-normal">
                      {selectedEmail.body}
                    </div>

                    {/* 어드민 답장 UI */}
                    {selectedEmail.receiver === 'team@stopfive.com' && !selectedEmail.replyContent && (
                      <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                            답장 보내기
                          </div>
                          <input
                            type="text"
                            className="w-full mb-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all"
                            placeholder="제목"
                            value={replySubject}
                            onChange={(e) => setReplySubject(e.target.value)}
                          />
                          <textarea
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent transition-all min-h-[120px] resize-none"
                            placeholder="이용자에게 보낼 답장을 입력하세요."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                          />
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={handleSendReply}
                              disabled={!replyText.trim()}
                              className="px-6 py-2.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold rounded-full text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              <span>답장 전송</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 이미 답장 완료된 메일인 경우 */}
                    {selectedEmail.status === 'archived' && selectedEmail.replyContent && (
                      <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                        <div className="bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">보낸 답장</div>
                          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {selectedEmail.replyContent}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-4 font-mono">
                            Answered at: {new Date(selectedEmail.answeredAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ) : selectedScheduledEmail ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 -m-4 md:-m-8 min-h-[calc(100vh-56px)]">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center shrink-0 bg-transparent">
                    <button 
                      onClick={() => setSelectedScheduledEmail(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
                    >
                      <span>← 예약 목록으로 돌아가기</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-4">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-white leading-tight">
                          {selectedScheduledEmail.subject}
                        </h2>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          selectedScheduledEmail.status === 'pending'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-900'
                            : selectedScheduledEmail.status === 'sent'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-900'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}>
                          {selectedScheduledEmail.status === 'pending' ? '대기' : selectedScheduledEmail.status === 'sent' ? '완료' : '취소됨'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="font-bold">수신자: </span>
                          <span className="text-slate-800 dark:text-slate-200">{selectedScheduledEmail.receiverVirtualEmail} ({selectedScheduledEmail.receiverName || '이름 없음'})</span>
                        </div>
                        <div>
                          <span className="font-bold">발송 예정일시: </span>
                          <span className="text-amber-600 font-bold">{formatDateTime(selectedScheduledEmail.scheduledAt)}</span>
                        </div>
                        <div>
                          <span className="font-bold">생성 일시: </span>
                          <span>{new Date(selectedScheduledEmail.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[15px] leading-[1.7] whitespace-pre-wrap text-[#202124] dark:text-slate-100 font-normal">
                      {selectedScheduledEmail.body}
                    </div>
                  </div>
                </div>
              ) : adminTab === 'inbox' || adminTab === 'sent' || adminTab === 'archive' ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 -m-4 md:-m-8 h-[calc(100vh-56px)]">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-transparent">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                      {adminTab === 'inbox' ? '받은편지함' : adminTab === 'sent' ? '보낸편지함' : '수신보관함'}
                    </span>
                  </div>
                  {/* 상단 고정 리스트 헤더 */}
                  <div className="flex items-center px-4 md:px-8 h-10 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[14px] font-bold text-slate-500 shrink-0 sticky top-0 z-10">
                    <div className="w-12 flex justify-center shrink-0"><input type="checkbox" className="w-3 h-3 rounded border-slate-300" /></div>
                    <div className="w-40 shrink-0 pl-2 hidden sm:block">{adminTab === 'sent' ? '받는사람' : '보낸사람'}</div>
                    <div className="flex-1 min-w-0 pl-2">제목 및 내용</div>
                    <div className="w-24 text-right shrink-0 hidden md:block">날짜</div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {adminFilteredEmails.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <p className="text-sm font-medium">No messages found</p>
                        </div>
                      ) : adminFilteredEmails.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((email: any) => {
                        const isUnread = email.status === 'unread' && email.receiver === currentUser.virtualEmail;
                        return (
                          <div
                            key={email.id}
                            onClick={() => handleSelectEmail(email)}
                            className={`h-10 flex items-center px-4 md:px-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all ${
                              isUnread ? 'bg-white dark:bg-slate-900' : 'bg-[#F2F5F9]/40 dark:bg-slate-850/10'
                            }`}
                          >
                            <div className="w-12 flex justify-center shrink-0">
                               <input type="checkbox" className="w-3 h-3 rounded border-slate-300" onClick={(e) => e.stopPropagation()} />
                            </div>
                            <div className="w-40 shrink-0 pl-2 truncate text-[14px] hidden sm:block">
                              <span className={isUnread ? 'text-[#000000] dark:text-white font-bold' : 'text-slate-700 dark:text-slate-350 font-normal'}>
                                {adminTab === 'sent' ? email.receiver.split('@')[0] : email.sender.split('@')[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pl-2 text-[14px]">
                              <div className={`truncate ${isUnread ? 'text-[#000000] dark:text-white font-bold' : 'text-slate-800 dark:text-slate-200 font-normal'}`}>
                                {email.subject}
                              </div>
                            </div>
                            <div className="w-24 text-right shrink-0 text-[14px] hidden md:block">
                              <span className={isUnread ? 'text-[#000000] dark:text-white font-bold' : 'text-slate-450'}>
                                {new Date(email.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  <Pagination total={adminFilteredEmails.length} current={currentPage} onChange={setCurrentPage} />
                </div>
              ) : adminTab === 'settings' ? (
                <div className="space-y-8 max-w-2xl">
                  <div>
                    <h1 className="text-2xl font-black text-[#202124] dark:text-white tracking-tight">환경 설정</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">관리자 계정의 보안 및 서비스 환경을 설정합니다.</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                    <h2 className="text-lg font-bold text-[#202124] dark:text-white">비밀번호 변경</h2>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      triggerToast("비밀번호가 성공적으로 변경되었습니다.", "변경 완료");
                      (e.target as HTMLFormElement).reset();
                    }} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 block">현재 비밀번호</label>
                        <input type="password" required className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-sm dark:bg-slate-800" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 block">새 비밀번호</label>
                        <input type="password" required className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-sm dark:bg-slate-800" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 block">새 비밀번호 확인</label>
                        <input type="password" required className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-sm dark:bg-slate-800" />
                      </div>
                      <button type="submit" className="px-6 py-2 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all">비밀번호 저장</button>
                    </form>
                  </div>
                </div>
              ) : adminTab === 'users' ? (
                /* 가입 유저 목록 테이블 -> 리스트형으로 변환 */
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 -m-8 h-[calc(100vh-56px)]">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-transparent">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                      유저 현황
                    </span>
                  </div>
                  {/* 상단 고정 리스트 헤더 */}
                  <div className="flex items-center px-8 h-10 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 shrink-0 sticky top-0 z-10">
                    <div className="w-12 flex justify-center shrink-0"><input type="checkbox" className="w-3 h-3 rounded border-slate-300" /></div>
                    <div className="w-24 shrink-0 pl-2">사용자명</div>
                    <div className="w-40 shrink-0 pl-2 hidden lg:block">가입 이메일</div>
                    <div className="w-40 shrink-0 pl-2 hidden md:block">가상 이메일</div>
                    <div className="w-20 shrink-0 pl-2 text-center hidden sm:block">희망시간</div>
                    <div className="flex-1 min-w-0 pl-2">진행률</div>
                    <div className="w-24 text-right shrink-0">시뮬레이션</div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {adminUsersList.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <p className="text-sm font-medium">가입된 사용자가 없습니다</p>
                      </div>
                    ) : (
                      adminUsersList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((user) => {
                        const isFinished = user.courseStatus === 'completed';
                        const stepPercent = Math.min(100, Math.round((user.courseStep / 5) * 100));
                        
                        return (
                          <div key={user.id} className="h-10 flex items-center px-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-xs text-[#202124] dark:text-slate-200 cursor-pointer">
                            <div className="w-12 flex justify-center shrink-0">
                              <input type="checkbox" className="w-3 h-3 rounded border-slate-300" />
                            </div>
                            <div className="w-24 shrink-0 pl-2 font-bold truncate">{user.name}</div>
                            <div className="w-40 shrink-0 pl-2 text-slate-500 truncate hidden lg:block">{user.email}</div>
                            <div className="w-40 shrink-0 pl-2 font-semibold text-[#1A73E8] dark:text-blue-400 truncate hidden md:block">{user.virtualEmail}</div>
                            <div className="w-20 shrink-0 pl-2 text-center font-mono text-slate-500 truncate hidden sm:block">{user.deliveryTime}</div>
                            <div className="flex-1 min-w-0 pl-2 pr-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${isFinished ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                    style={{ width: `${stepPercent}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {user.courseStep}회차 ({stepPercent}%)
                                </span>
                              </div>
                            </div>
                            <div className="w-24 text-right shrink-0">
                              {isFinished ? (
                                <span className="text-[11px] font-bold text-emerald-600">체험 완료</span>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAdminTriggerNextDay(user.virtualEmail); }}
                                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1 ml-auto"
                                >
                                  다음 발송 ⚡
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <Pagination total={adminUsersList.length} current={currentPage} onChange={setCurrentPage} />
                </div>
              ) : adminTab === 'compose' ? (
                /* 어드민 편지쓰기 - 이용자 편지쓰기 포맷과 완전히 통일 */
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 -m-4 md:-m-8">
                  {/* 이메일 상세 보기와 동일한 상단 Back 바 */}
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center shrink-0 bg-transparent">
                    <button
                      onClick={() => { setAdminTab('users'); setSelectedEmail(null); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
                    >
                      <span>← Back to users</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {/* 이메일 상세 보기와 동일한 제목 영역 */}
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-4">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-white leading-tight">
                          메일 발송 시뮬레이터
                        </h2>
                        <span className="px-2 py-0.5 bg-[#f1f3f4] dark:bg-slate-800 text-[#5f6368] dark:text-slate-450 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-700">
                          관리자 발송
                        </span>
                      </div>

                      {/* 발신자 헤더 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            A
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[13px] text-[#202124] dark:text-white">
                              <span className="font-bold">StopFive Team</span>
                              <span className="text-slate-400 text-xs font-light ml-2">&lt;team@stopfive.com&gt;</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              <span>To: </span>
                              <span className="font-medium text-slate-600 dark:text-slate-350">
                                {composeTo ? composeTo : '수신 대상 유저를 선택하세요'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date().toLocaleString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            weekday: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 수신인 선택 + 제목 + 본문 (이메일 포맷 통일) */}
                    <form onSubmit={(e) => { e.preventDefault(); handleSendCompose(e); }} className="space-y-5">
                      {/* 수신인 선택 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">받는 사람</label>
                        <select
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                          required
                        >
                          <option value="">발송 대상 유저 선택</option>
                          {allUsers.filter(u => u.role !== 'admin').map(u => (
                            <option key={u.id} value={u.virtualEmail}>{u.name} ({u.virtualEmail})</option>
                          ))}
                        </select>
                      </div>

                      {/* 제목 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">제목</label>
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="이메일 제목을 입력하세요"
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                          required
                        />
                      </div>

                      {/* 본문 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">WRITE MESSAGE (본문 내용)</label>
                        <textarea
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          placeholder="본문 내용을 자유롭게 작성하세요..."
                          className="w-full h-40 p-4 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-[14px] dark:bg-slate-800 text-[#202124] dark:text-slate-100 placeholder-slate-400"
                          required
                        />
                      </div>

                      {/* 예약 & 5분 미션 제어 옵션 */}
                      <div className="space-y-4 py-4 border-y border-slate-100 dark:border-slate-800/80 my-2">
                        <div className="flex flex-wrap gap-6">
                          {/* 1. 미션예약 체크박스 */}
                          <div className="flex items-center space-x-2">
                            <input
                              id="is_reservation"
                              type="checkbox"
                              checked={isReservationChecked}
                              onChange={(e) => setIsReservationChecked(e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="is_reservation" className="text-sm font-semibold text-slate-750 dark:text-slate-300 cursor-pointer">
                              미션예약
                            </label>
                          </div>

                          {/* 2. 5분미션 체크박스 */}
                          <div className="flex items-center space-x-2">
                            <input
                              id="timeout_limit"
                              type="checkbox"
                              checked={scheduledTimeoutLimit}
                              onChange={(e) => {
                                setScheduledTimeoutLimit(e.target.checked);
                                if (!e.target.checked) setScheduledForceTimeout(false);
                              }}
                              className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="timeout_limit" className="text-sm font-semibold text-slate-750 dark:text-slate-300 cursor-pointer">
                              5분미션
                            </label>
                          </div>

                          {scheduledTimeoutLimit && (
                            <div className="flex items-center space-x-2 transition-all duration-300">
                              <input
                                id="force_timeout"
                                type="checkbox"
                                checked={scheduledForceTimeout}
                                onChange={(e) => setScheduledForceTimeout(e.target.checked)}
                                className="w-4 h-4 text-red-600 border-slate-350 rounded focus:ring-red-500"
                              />
                              <label htmlFor="force_timeout" className="text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer">
                                ⚡ 강제 만료 적용 (유저 설정을 무시하고 무조건 5분 제한 적용)
                              </label>
                            </div>
                          )}
                        </div>

                        {/* 미션예약 체크 시에만 날짜 및 시간 선택기 오픈 */}
                        {isReservationChecked && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/60 animate-fadeIn">
                            {/* 예약 날짜 */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">예약 날짜</label>
                              <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                                required
                              />
                            </div>

                            {/* 예약 시간 */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">예약 시간</label>
                              <div className="flex space-x-2">
                                <select
                                  value={scheduledHour}
                                  onChange={(e) => setScheduledHour(e.target.value)}
                                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                                  required
                                >
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const h = i.toString().padStart(2, '0');
                                    return <option key={h} value={h}>{h}시</option>;
                                  })}
                                </select>
                                <select
                                  value={scheduledMinute}
                                  onChange={(e) => setScheduledMinute(e.target.value)}
                                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-sm dark:bg-slate-800 text-[#202124] dark:text-white"
                                  required
                                >
                                  {Array.from({ length: 60 }, (_, i) => {
                                    const m = i.toString().padStart(2, '0');
                                    return <option key={m} value={m}>{m}분</option>;
                                  })}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-start">
                        <button
                          type="submit"
                          className="px-6 py-2 bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#202124] dark:text-white border border-slate-300 dark:border-slate-700 font-bold rounded-full text-xs transition-all shadow-none flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : adminTab === 'scheduled-manage' ? (
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 -m-4 md:-m-8 h-[calc(100vh-56px)]">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-transparent">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">예약 미션 관리</span>
                  </div>
                  {/* 상단 고정 리스트 헤더 */}
                  <div className="flex items-center px-4 md:px-8 h-10 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[14px] font-bold text-slate-500 shrink-0 sticky top-0 z-10">
                    <div className="w-14 sm:w-20 shrink-0 pl-2">상태</div>
                    <div className="w-16 shrink-0 pl-2">관리</div>
                    <div className="w-40 shrink-0 pl-2 hidden sm:block">수신자</div>
                    <div className="flex-1 min-w-0 pl-2">제목</div>
                    <div className="w-44 shrink-0 pl-2 hidden md:block">예약일시</div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {scheduledEmails.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <p className="text-sm font-medium">현재 등록된 예약 메일이 없습니다.</p>
                      </div>
                    ) : (
                      scheduledEmails.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((se) => (
                        <div key={se.id} className="h-10 flex items-center px-4 md:px-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-[14px]">
                          {/* 1. 상태 */}
                          <div className={`w-14 sm:w-20 shrink-0 pl-2 ${se.status === 'pending' ? 'font-bold' : 'font-normal'}`}>
                            <span className={se.status === 'pending' ? 'text-amber-600' : se.status === 'sent' ? 'text-emerald-600' : 'text-slate-500'}>
                              {se.status === 'pending' ? '대기' : se.status === 'sent' ? '완료' : '취소됨'}
                            </span>
                          </div>
                          {/* 2. 관리 (상태 다음자리) */}
                          <div className="w-16 shrink-0 pl-2 flex items-center">
                            {se.status === 'pending' ? (
                              <button
                                onClick={async () => {
                                  if (confirm("이 예약 메일 발송을 취소하시겠습니까?")) {
                                    const success = await cancelScheduledEmail(se.id);
                                    if (success) {
                                      triggerToast("예약이 취소되었습니다.", "취소 완료");
                                      setScheduledEmails(await getScheduledEmails());
                                    }
                                  }
                                }}
                                className="font-bold text-red-500 hover:text-red-700 text-left cursor-pointer"
                              >
                                취소
                              </button>
                            ) : (
                              <span className="font-normal text-slate-300 dark:text-slate-700">-</span>
                            )}
                          </div>
                          {/* 3. 수신자 */}
                          <div className={`w-40 shrink-0 pl-2 truncate hidden sm:block ${se.status === 'pending' ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-normal text-slate-500 dark:text-slate-400'}`}>
                            {se.receiverVirtualEmail ? se.receiverVirtualEmail.split('@')[0] : '알수없음'}
                          </div>
                          {/* 4. 제목 */}
                          <div 
                            className={`flex-1 min-w-0 pl-2 truncate cursor-pointer hover:text-[#1A73E8] hover:underline ${se.status === 'pending' ? 'font-bold text-slate-900 dark:text-white' : 'font-normal text-slate-700 dark:text-slate-350'}`}
                            onClick={() => setSelectedScheduledEmail(se)}
                          >
                            {se.subject}
                          </div>
                          {/* 5. 예약일시 */}
                          <div className={`w-44 shrink-0 pl-2 truncate hidden md:block ${se.status === 'pending' ? 'font-bold text-slate-700 dark:text-slate-300' : 'font-normal text-slate-450 dark:text-slate-500'}`}>
                            {formatDateTime(se.scheduledAt)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Pagination total={scheduledEmails.length} current={currentPage} onChange={setCurrentPage} />
                </div>
              ) : (
                /* 종합 통계 탭 */
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black text-[#202124] dark:text-white tracking-tight">서비스 종합 지표</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">StopFive 5회 체험 코스의 실시간 성과지표 요약</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 가입자 수</div>
                      <div className="text-3xl font-black text-[#202124] dark:text-white mt-2">{allUsers.length} 명</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">가상 메일 총 트래픽</div>
                      <div className="text-3xl font-black text-[#202124] dark:text-white mt-2">{emails.length} 통</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">일평균 핑퐁 이행률</div>
                      <div className="text-3xl font-black text-emerald-600 mt-2">84.6 %</div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        /* 2. 로그인 유저용 메인 대시보드 (Gmail 감성 미니멀 Layout) */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-screen pt-0 bg-[#F6F8FC] dark:bg-slate-950">
          
          {/* 모바일 햄버거 헤더 */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#F6F8FC] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30">
            <button
              onClick={() => { setIsMobileMenuOpen(false); setAuthMode('home'); }}
              className="flex items-center space-x-2.5 hover:opacity-75 transition-opacity"
            >
              <span className="w-6 h-6 bg-[#202124] dark:bg-slate-800 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm">5</span>
              <span className="text-xl font-black text-[#202124] dark:text-white tracking-tight">StopFive</span>
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-slate-600 dark:text-slate-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* A. 좌측 사이드바 (사이드 네비게이션) */}
          <aside className={`${isMobileMenuOpen ? 'flex absolute inset-0 top-[57px] bg-[#F6F8FC] dark:bg-slate-950 z-40' : 'hidden'} md:flex md:static w-full md:w-[260px] bg-[#F6F8FC] dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-none flex-col justify-start md:justify-between shrink-0 p-4 md:p-3 overflow-y-auto z-20 hide-scrollbar border-b md:border-b-0 border-slate-200 dark:border-slate-800`}>
            <div className="flex flex-col space-y-4 w-full">
              {/* 로고 영역 - 데스크탑 전용 */}
              <button
                onClick={() => setAuthMode('home')}
                className="hidden md:flex items-center space-x-2.5 px-3 py-4 hover:opacity-75 transition-opacity cursor-pointer w-full text-left shrink-0"
              >
                <span className="w-7 h-7 bg-[#202124] dark:bg-slate-800 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-sm">5</span>
                <span className="text-2xl font-black text-[#202124] dark:text-white tracking-tight">StopFive</span>
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[8px] font-bold rounded border border-slate-200 dark:border-slate-800">로컬 DB</span>
              </button>

              {/* Compose 신규 메일 쓰기 버튼 (지메일 스타일 - 색상 배제 및 은은한 보더형) */}
              <div className="px-1.5 mt-0 md:mt-2 mb-0 md:mb-2 shrink-0 flex items-center">
                <button
                  onClick={() => { setSelectedEmail(null); setUserTab('compose'); setIsMobileMenuOpen(false); }}
                  className="ml-0 md:ml-3 pl-3 pr-6 py-2 md:py-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#202124] dark:text-white font-medium rounded-2xl text-[14px] transition-all flex items-center space-x-2 md:space-x-3 shadow-sm w-fit"
                >
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>편지쓰기</span>
                </button>
              </div>

              {/* 네비게이션 메뉴 (흑백 아이콘 및 100% 한글 명칭 통일) */}
              <nav className="flex flex-col space-y-0 px-1.5 shrink-0 pr-0">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setUserTab('inbox'); setSelectedEmail(null); }}
                  className={`w-auto md:w-full flex items-center justify-between px-4 md:px-6 h-10 rounded-full text-[14px] transition-all shrink-0 ${
                    userTab === 'inbox' 
                      ? 'bg-[#E8EAED] text-[#202124] dark:bg-slate-800 dark:text-white font-black' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2" />
                    </svg>
                    <span>받은편지함</span>
                  </div>
                  {emails.filter((e: any) => {
                    const elapsed = new Date().getTime() - new Date(e.createdAt).getTime();
                    const isM = e.sender?.toLowerCase() === 'team@stopfive.com' || e.isTimeoutLimit || e.isForceTimeout || e.isSystemMission;
                    const isExp = e.status === 'expired' || (e.isTimeoutLimit && e.status === 'read') || (e.isTimeoutLimit && e.status === 'unread' && elapsed > 5 * 60 * 1000);
                    return e.receiver?.toLowerCase() === currentUser.virtualEmail?.toLowerCase() && e.status !== 'archived' && (!isM || !isExp);
                  }).length > 0 && (
                    <span className="text-[#202124] dark:text-white text-xs font-bold pl-2 md:px-1">
                      {emails.filter((e: any) => {
                        const elapsed = new Date().getTime() - new Date(e.createdAt).getTime();
                        const isM = e.sender?.toLowerCase() === 'team@stopfive.com' || e.isTimeoutLimit || e.isForceTimeout || e.isSystemMission;
                        const isExp = e.status === 'expired' || (e.isTimeoutLimit && e.status === 'read') || (e.isTimeoutLimit && e.status === 'unread' && elapsed > 5 * 60 * 1000);
                        return e.receiver?.toLowerCase() === currentUser.virtualEmail?.toLowerCase() && e.status !== 'archived' && (!isM || !isExp);
                      }).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setUserTab('missions'); setSelectedEmail(null); }}
                  className={`w-auto md:w-full flex items-center justify-between px-4 md:px-6 h-10 rounded-full text-[14px] transition-all shrink-0 ${
                    userTab === 'missions' 
                      ? 'bg-[#E8EAED] text-[#202124] dark:bg-slate-800 dark:text-white font-black' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>미션관리함</span>
                  </div>
                  {emails.filter((e: any) => {
                    const elapsed = new Date().getTime() - new Date(e.createdAt).getTime();
                    const isM = e.sender?.toLowerCase() === 'team@stopfive.com' || e.isTimeoutLimit || e.isForceTimeout || e.isSystemMission;
                    const isExp = e.status === 'expired' || (e.isTimeoutLimit && e.status === 'read') || (e.isTimeoutLimit && e.status === 'unread' && elapsed > 5 * 60 * 1000);
                    return e.receiver?.toLowerCase() === currentUser.virtualEmail?.toLowerCase() && isM && isExp;
                  }).length > 0 && (
                    <span className="text-[#202124] dark:text-white text-xs font-bold pl-2 md:px-1">
                      {emails.filter((e: any) => {
                        const elapsed = new Date().getTime() - new Date(e.createdAt).getTime();
                        const isM = e.sender?.toLowerCase() === 'team@stopfive.com' || e.isTimeoutLimit || e.isForceTimeout || e.isSystemMission;
                        const isExp = e.status === 'expired' || (e.isTimeoutLimit && e.status === 'read') || (e.isTimeoutLimit && e.status === 'unread' && elapsed > 5 * 60 * 1000);
                        return e.receiver?.toLowerCase() === currentUser.virtualEmail?.toLowerCase() && isM && isExp;
                      }).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setUserTab('archive'); setSelectedEmail(null); }}
                  className={`w-auto md:w-full flex items-center px-4 md:px-6 h-10 rounded-full text-[14px] transition-all shrink-0 ${
                    userTab === 'archive' 
                      ? 'bg-[#E8EAED] text-[#202124] dark:bg-slate-800 dark:text-white font-black' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-500 mr-2 md:mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>수신보관함</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setUserTab('sent'); setSelectedEmail(null); }}
                  className={`w-auto md:w-full flex items-center px-4 md:px-6 h-10 rounded-full text-[14px] transition-all shrink-0 ${
                    userTab === 'sent' 
                      ? 'bg-[#E8EAED] text-[#202124] dark:bg-slate-800 dark:text-white font-black' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-500 mr-2 md:mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>보낸편지함</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setUserTab('statistics'); setSelectedEmail(null); }}
                  className={`w-auto md:w-full flex items-center px-4 md:px-6 h-10 rounded-full text-[14px] transition-all shrink-0 ${
                    userTab === 'statistics' 
                      ? 'bg-[#E8EAED] text-[#202124] dark:bg-slate-800 dark:text-white font-black' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-500 mr-2 md:mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  <span>통계 리포트</span>
                </button>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setUserTab('settings'); setSelectedEmail(null); }}
                  className={`w-auto md:w-full flex items-center px-4 md:px-6 h-10 rounded-full text-[14px] transition-all shrink-0 ${
                    userTab === 'settings' 
                      ? 'bg-[#E8EAED] text-[#202124] dark:bg-slate-800 dark:text-white font-black' 
                      : 'hover:bg-[#F1F3F4]/70 dark:hover:bg-slate-900 text-[#202124] dark:text-slate-350 font-medium'
                  }`}
                >
                  <svg className="w-4 h-4 text-slate-500 mr-2 md:mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>환경 설정</span>
                </button>
              </nav>
            </div>

            <div className="hidden md:block p-1.5 pb-4">
              <div className="text-[9px] text-slate-400 px-3 py-1 space-y-0.5">
                <div>로그인 계정:</div>
                <div className="text-[#1f1f1f] dark:text-white truncate font-semibold">{currentUser.name}</div>
                <div className="truncate text-slate-450 font-light">{currentUser.virtualEmail}</div>
              </div>
            </div>
          </aside>

          {/* B. 메인 컨텐츠 영역 (외곽 라인 및 마진 전면 소거하여 평면 지메일 레이아웃 구현) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-none rounded-none m-0 shadow-none">
            
            {/* 상단 탑바 헤더 */}
            <header className="h-14 px-6 flex items-center justify-between shrink-0 bg-transparent border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mailbox</span>
                <span className="text-xs text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser.virtualEmail}</span>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </header>

            {/* 메인 탭 뷰어 */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {selectedEmail ? (
                /* 메일 상세 읽기 화면 (지메일과 완전히 동일한 UI 감성, 선명한 고대비 타이포그래피) */
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center shrink-0 bg-transparent">
                    <button 
                      onClick={() => setSelectedEmail(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
                    >
                      <span>← Back to {userTab}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {/* 메일 제목 영역 */}
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-4">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-white leading-tight">
                          {selectedEmail.subject}
                        </h2>
                        <span className="px-2 py-0.5 bg-[#f1f3f4] dark:bg-slate-800 text-[#5f6368] dark:text-slate-450 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-700">
                          받은편지함
                        </span>
                      </div>
                      
                      {/* 메일 송수신인 아바타 및 헤더 정보 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* 지메일 원형 아바타 */}
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            {selectedEmail.sender === 'team@stopfive.com' ? 'S' : (selectedEmail.sender[0] || 'U').toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[13px] text-[#202124] dark:text-white">
                              <span className="font-bold">{selectedEmail.sender === 'team@stopfive.com' ? 'StopFive Team' : selectedEmail.sender.split('@')[0]}</span>
                              <span className="text-slate-400 text-xs font-light ml-2">&lt;{selectedEmail.sender}&gt;</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              <span>To: </span>
                              <span className="font-medium text-slate-650 dark:text-slate-350">나에게</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 hidden sm:block">
                          {new Date(selectedEmail.createdAt).toLocaleString('ko-KR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric', 
                            weekday: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 본문 영역 - 크게 키우고 선명하게 변경 */}
                    <div className="text-[15px] leading-[1.7] whitespace-pre-wrap text-[#202124] dark:text-slate-100 font-normal">
                      {(() => {
                        const elapsedMs = new Date().getTime() - new Date(selectedEmail.createdAt).getTime();
                        const isOver5Min = elapsedMs > 5 * 60 * 1000;
                        const isEmailExpired = selectedEmail.status === 'expired' ||
                          (selectedEmail.isTimeoutLimit && selectedEmail.status === 'read') ||
                          (selectedEmail.isTimeoutLimit && selectedEmail.status === 'unread' && isOver5Min);
                        return isEmailExpired ? (
                          <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl text-red-600 dark:text-red-400 font-semibold text-sm flex flex-col items-center space-y-2">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-center">⚠️ 본 미션은 발송 후 5분 내에 열람하지 않아 만료되었습니다. (본문 열람 불가)</span>
                          </div>
                        ) : (
                          selectedEmail.body
                        );
                      })()}
                    </div>

                    {/* 미답장 미션 메일인 경우 대형 답장창 제공 */}
                    {selectedEmail.receiver === currentUser.virtualEmail && !selectedEmail.replyContent && !(selectedEmail.status === 'expired') && !(selectedEmail.isTimeoutLimit && selectedEmail.status === 'read') && !(selectedEmail.isTimeoutLimit && selectedEmail.status === 'unread' && (new Date().getTime() - new Date(selectedEmail.createdAt).getTime() > 5 * 60 * 1000)) && (
                      <form onSubmit={handleSendReply} className="border-t border-slate-100 dark:border-slate-850 pt-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                            REPLY BOX (여기에 오늘의 미션 수행 답장을 입력하세요)
                          </label>
                          <input
                            type="text"
                            value={replySubject}
                            onChange={(e) => setReplySubject(e.target.value)}
                            placeholder="제목"
                            className="w-full mb-2 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 text-[14px] dark:bg-slate-800 text-[#202124] dark:text-slate-100 placeholder-slate-400 transition-all shadow-sm"
                            required
                          />
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="미션을 완료했다면 짧은 답장을 입력하고 Send를 눌러주세요. (예: 완료했습니다! / 기지개 켜니 아주 개운합니다.)"
                            className="w-full h-32 p-4 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-450 text-[14px] dark:bg-slate-800 text-[#202124] dark:text-slate-100 placeholder-slate-400 transition-all resize-none shadow-sm"
                            required
                          />
                        </div>
                        <div className="flex justify-start">
                          {/* 지메일 고유 테두리 둥근 회색 답장 버튼 */}
                          <button
                            type="submit"
                            className="px-6 py-2 bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#202124] dark:text-white border border-slate-300 dark:border-slate-700 font-bold rounded-full text-xs transition-all shadow-none flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            <span>답장</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* 이미 답장 완료된 메일인 경우 대화 히스토리 표기 */}
                    {selectedEmail.status === 'archived' && selectedEmail.replyContent && (
                      <div className="bg-[#f8f9fa] dark:bg-slate-850/30 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Reply (보낸 답장)</div>
                        <div className="text-[14px] leading-relaxed text-[#202124] dark:text-slate-300">
                          {selectedEmail.replyContent}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Answered at: {new Date(selectedEmail.answeredAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : userTab === 'statistics' ? (
                /* 통계 화면 (체험 코스 진행 리포트 위젯 탑재) */
                <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-4xl mx-auto w-full">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Statistics & Reports</h1>
                    <p className="text-sm text-slate-400 mt-1">체험 코스 진행도와 일일 약속 유지 성과 지표입니다.</p>
                  </div>

                  {/* 3일 5회 체험 코스 진행 위젯 이식 영역 (통계 최상단 배치) */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-border rounded-2xl p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-[10px] font-bold text-primary rounded border border-blue-200 dark:border-blue-900">
                            체험 코스 단계
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            3일 5회 완성 코스 로드맵
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">인박스 이탈에 따른 실시간 진도 리포트</p>
                      </div>

                      {/* 치트용 단계 제어 단추 */}
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        {((currentUser.courseStep === 1) || (currentUser.courseStep === 3)) && (
                          <button
                            onClick={async () => {
                              const mission = await getNextCourseMission(currentUser.virtualEmail);
                              if (mission) {
                                setEmails(await getLocalEmails(currentUser.virtualEmail));
                                triggerToast("체험 코스 다음 미션 도착!", "새 메일 확인");
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-primary border border-blue-200 dark:border-blue-900 text-[11px] font-bold rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                          >
                            다음 미션 즉시 받기 (치트)
                          </button>
                        )}

                        {((currentUser.courseStep === 2) || (currentUser.courseStep === 4)) && (
                          <button
                            onClick={async () => {
                              const updated = await simulateNextDayForUser(currentUser.virtualEmail);
                              if (updated) {
                                setCurrentUser(updated);
                                const nextMission = await getNextCourseMission(updated.virtualEmail);
                                if (nextMission) {
                                  setEmails(await getLocalEmails(updated.virtualEmail));
                                  triggerToast("가상으로 하루가 경과하여 다음 날짜 미션이 전송되었습니다.", "하루 지나기 완료");
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 text-[11px] font-bold rounded-lg hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span>시뮬레이션: 하루 지나기 (치트)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 로드맵 5단계 바 */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>Day 1 (1~2회)</span>
                        <span>Day 2 (3~4회)</span>
                        <span>Day 3 (최종 5회)</span>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2.5">
                        {[1, 2, 3, 4, 5].map((stepNum) => {
                          const isActive = currentUser.courseStep >= stepNum;
                          let stepLabel = `${stepNum}회차`;
                          if (stepNum === 1) stepLabel = '1회차(Day 1)';
                          if (stepNum === 3) stepLabel = '3회차(Day 2)';
                          if (stepNum === 5) stepLabel = '5회차(Day 3)';
                          
                          return (
                            <div key={stepNum} className="space-y-1.5">
                              <div className={`h-2 rounded-full transition-all ${
                                isActive 
                                  ? 'bg-gradient-to-r from-primary to-blue-500 shadow-sm' 
                                  : 'bg-slate-200 dark:bg-slate-800'
                              }`} />
                              <div className="text-[10px] text-center font-bold text-slate-400">
                                {stepLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 완주 트로피 출력 */}
                    {currentUser.courseStatus === 'completed' && (
                      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 text-center space-y-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-lg">
                          🏆
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">5회 행동 체험 코스 완주를 축하합니다!</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                            3일 동안 꾸준한 핑퐁 메일로 총 5번의 마이크로 행동을 완수하셨습니다.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 정량 통계 카드 그리드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-border p-6 rounded-2xl">
                      <span className="text-xs text-slate-400 font-semibold block uppercase">Appointments kept</span>
                      <span className="text-3xl font-bold text-slate-850 dark:text-slate-100 block mt-2">
                        {stats?.appointmentsKept}
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">누적 지킨 약속</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-border p-6 rounded-2xl">
                      <span className="text-xs text-slate-400 font-semibold block uppercase">Response consistency</span>
                      <span className="text-3xl font-bold text-slate-850 dark:text-slate-100 block mt-2">
                        {stats?.responseConsistency}%
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">최근 7일 응답 일관성</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-border p-6 rounded-2xl">
                      <span className="text-xs text-slate-400 font-semibold block uppercase">Avg response time</span>
                      <span className="text-3xl font-bold text-slate-850 dark:text-slate-100 block mt-2">
                        {stats?.averageResponseTime}
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">미션 수신 후 평균 행동 소요</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-border p-6 rounded-2xl">
                      <span className="text-xs text-slate-400 font-semibold block uppercase">Current chain</span>
                      <span className="text-3xl font-bold text-primary block mt-2">
                        Day {stats?.currentChain}
                      </span>
                      <span className="text-xs text-slate-400 block mt-1">연속 약속 유지 일자</span>
                    </div>
                  </div>

                  {/* 14일 캘린더 히스토리 */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-border p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Inbox History (Recent 14 Days)</h3>
                    <div className="grid grid-cols-7 sm:grid-cols-14 gap-3">
                      {stats?.completionRateByDay?.map((day: any) => {
                        const dateObj = new Date(day.date);
                        const dayLabel = dateObj.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
                        return (
                          <div key={day.date} className="flex flex-col items-center space-y-2">
                            <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border transition-all ${
                                day.completed
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-primary text-primary'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                              }`}
                              title={`${day.date}: ${day.completed ? 'Kept' : 'Missed or Waiting'}`}
                            >
                              {day.completed ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-455 font-medium">{dayLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : userTab === 'compose' ? (
                /* 편지쓰기 화면 - 이메일 상세 보기와 동일한 헤더 포맷, 본문 없이 바로 REPLY BOX */
                <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                  {/* 이메일 상세 보기와 동일한 상단 Back 바 */}
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center shrink-0 bg-transparent">
                    <button
                      onClick={() => setUserTab('inbox')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
                    >
                      <span>← Back to inbox</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {/* 이메일 상세 보기와 동일한 제목 영역 */}
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-5 space-y-4">
                      <div className="flex items-center space-x-3">
                        <h2 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-white leading-tight">
                          새 편지 쓰기
                        </h2>
                        <span className="px-2 py-0.5 bg-[#f1f3f4] dark:bg-slate-800 text-[#5f6368] dark:text-slate-450 text-[10px] font-medium rounded border border-slate-200 dark:border-slate-700">
                          편지쓰기
                        </span>
                      </div>

                      {/* 이메일 상세 보기와 동일한 발신자 헤더 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                            {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[13px] text-[#202124] dark:text-white">
                              <span className="font-bold">{currentUser.name}</span>
                              <span className="text-slate-400 text-xs font-light ml-2">&lt;{currentUser.email}&gt;</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              <span>To: </span>
                              <span className="font-medium text-slate-600 dark:text-slate-350">team@stopfive.com</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 hidden sm:block">
                          {new Date().toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 본문 없이 바로 REPLY BOX (이메일 상세 보기의 REPLY BOX와 동일한 스타일) */}
                    <form onSubmit={(e) => { e.preventDefault(); handleSendCompose(e); }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                          WRITE MESSAGE (여기에 보내실 내용을 입력하세요)
                        </label>
                        <textarea
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          placeholder="미션을 완료했다면 짧은 답장을 입력하고 Send를 눌러주세요. (예: 완료했습니다! / 기지개 켜니 아주 개운합니다.)"
                          className="w-full h-32 p-4 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-450 text-[14px] dark:bg-slate-800 text-[#202124] dark:text-slate-100 placeholder-slate-400"
                          required
                        />
                      </div>
                      <div className="flex justify-start">
                        <button
                          type="submit"
                          onClick={() => {
                            setComposeTo('team@stopfive.com');
                            setComposeSubject('사용자 편지 문의');
                          }}
                          className="px-6 py-2 bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#202124] dark:text-white border border-slate-300 dark:border-slate-700 font-bold rounded-full text-xs transition-all shadow-none flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span>답장</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : userTab === 'settings' ? (
                /* 설정 화면 */
                <div className="flex-1 overflow-y-hidden p-4 md:p-8 space-y-8 max-w-lg mx-auto w-full">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-slate-400 mt-1">개인 편지함 수신 시간 및 프로필을 변경합니다.</p>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSettingsSuccessMessage('');
                    const form = e.currentTarget;
                    const deliveryTime = (form.elements.namedItem('deliveryTime') as HTMLInputElement).value;
                    const name = (form.elements.namedItem('name') as HTMLInputElement).value;

                    if (settingsNewPassword && settingsNewPassword !== settingsConfirmPassword) {
                      triggerToast("Password change failed.", "새 비밀번호가 일치하지 않습니다.");
                      return;
                    }
                    
                    const updated = await updateUserProfile(currentUser.virtualEmail, deliveryTime, name, settingsNewPassword || undefined);
                    if (updated) {
                      setCurrentUser(updated);
                      setAllUsers(await getAllUsers());
                      triggerToast("설정이 성공적으로 저장되었습니다.", "저장 완료");
                      setSettingsSuccessMessage("설정이 성공적으로 저장되었습니다.");
                      setSettingsNewPassword('');
                      setSettingsConfirmPassword('');
                    }
                  }} className="space-y-6 bg-slate-50 dark:bg-slate-800/40 border border-border p-6 rounded-2xl">
                    {settingsSuccessMessage && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl text-green-600 dark:text-green-400 text-xs font-semibold">
                        ✓ {settingsSuccessMessage}
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Name</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={currentUser.name}
                        className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm dark:bg-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Virtual Email</label>
                      <input
                        type="text"
                        value={currentUser.virtualEmail}
                        disabled
                        className="w-full p-3 border border-border bg-slate-100/50 dark:bg-slate-800/50 rounded-xl text-sm text-slate-400 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Preferred Mission Time</label>
                      <input
                        type="time"
                        name="deliveryTime"
                        defaultValue={currentUser.deliveryTime}
                        className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm dark:bg-slate-800"
                        required
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        * 지정한 시간에 매일 정기 앵커 메일이 가상 수신함으로 배달됩니다.
                      </span>
                    </div>



                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Change Password (비밀번호 변경)</h3>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">New Password</label>
                        <input
                          type="password"
                          value={settingsNewPassword}
                          onChange={(e) => setSettingsNewPassword(e.target.value)}
                          placeholder="변경할 새 비밀번호"
                          className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm dark:bg-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Confirm New Password</label>
                        <input
                          type="password"
                          value={settingsConfirmPassword}
                          onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                          placeholder="새 비밀번호 확인"
                          className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-all"
                    >
                      Save Settings
                    </button>
                  </form>
                </div>
              ) : (
                /* 메일 목록 리스트 (Inbox, Archive, Sent) - 지메일 스타일 */
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="h-12 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-transparent">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                      {userTab} ({userFiltered.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Local Simulation Inbox</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {userFiltered.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2" />
                        </svg>
                        <p className="text-sm font-medium">No messages found</p>
                        {userTab === 'inbox' && (
                          <p className="text-xs text-slate-400">오늘의 약속 메일이 모두 완료되었거나 아직 전송되지 않았습니다.</p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* 상단 고정 리스트 헤더 추가 */}
                        <div className="flex items-center px-4 md:px-8 h-10 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[14px] font-bold text-slate-500 shrink-0 sticky top-0 z-10">
                          <div className="w-8 shrink-0 flex items-center justify-center"></div>
                          <div className="w-40 shrink-0 pr-4 hidden sm:block">{userTab === 'sent' ? '받는사람' : '보낸사람'}</div>
                          <div className="flex-1 min-w-0 pr-6">제목</div>
                          <div className="w-44 text-right shrink-0 hidden md:block">도착일시</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {userFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((email) => {
                          const _elapsed = new Date().getTime() - new Date(email.createdAt).getTime();
                          const isExpired = email.status === 'expired' ||
                            (email.isTimeoutLimit && email.status === 'read') ||
                            (email.isTimeoutLimit && email.status === 'unread' && _elapsed > 5 * 60 * 1000);
                          const isUnread = email.status === 'unread' && email.receiver?.toLowerCase() === currentUser.virtualEmail?.toLowerCase() && !isExpired;
                          return (
                            <div
                              key={email.id}
                              onClick={() => handleSelectEmail(email)}
                              className={`h-12 flex items-center px-4 md:px-8 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-all ${
                                isUnread 
                                  ? 'bg-white dark:bg-slate-900 font-bold text-[#000000] dark:text-white' 
                                  : 'bg-[#F2F5F9]/40 dark:bg-slate-850/10 text-slate-500 dark:text-slate-400 font-normal'
                              }`}
                            >
                              {/* 지메일 시그니처 스타 아이콘 */}
                              <div className="flex items-center justify-center w-8 shrink-0 text-slate-350 dark:text-slate-700">
                                <svg className="w-4 h-4 hover:text-amber-400 transition-all cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
                                </svg>
                              </div>
 
                              <div className="w-40 shrink-0 pr-4 truncate text-[14px] hidden sm:block">
                                <span className={isUnread ? 'text-[#000000] dark:text-white font-bold' : 'text-slate-700 dark:text-slate-350 font-normal'}>
                                  {userTab === 'sent' 
                                    ? (email.receiver === 'team@stopfive.com' ? 'StopFive Team' : email.receiver.split('@')[0])
                                    : (email.sender === 'team@stopfive.com' ? 'StopFive Team' : email.sender.split('@')[0])}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pr-6 text-[14px] flex items-center gap-2">
                                {(email.isTimeoutLimit || email.isForceTimeout || email.isSystemMission) && (
                                  isExpired ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded shrink-0">
                                      만료
                                    </span>
                                  ) : email.status === 'archived' ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded shrink-0">
                                      완료
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded shrink-0 animate-pulse">
                                      진행중
                                    </span>
                                  )
                                )}
                                <div className={`truncate ${isUnread ? 'text-[#000000] dark:text-white font-bold' : 'text-slate-800 dark:text-slate-200 font-normal'}`}>
                                  {email.subject}
                                </div>
                              </div>
                              <div className="w-44 text-right shrink-0 text-[14px] hidden md:block">
                                <span className={isUnread ? 'text-[#000000] dark:text-white font-bold' : 'text-slate-450'}>
                                  {formatDateTime(email.createdAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                    )}
                  </div>
                  <Pagination total={userFiltered.length} current={currentPage} onChange={setCurrentPage} />
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* C. Compose 메일 쓰기 팝업 모달 */}
      {isComposeOpen && (
        <div className="fixed bottom-0 right-0 md:right-12 w-full md:w-[520px] max-w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in-up">
          <div className="h-10 bg-slate-950 text-white px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold">New Message</span>
            <button onClick={() => setIsComposeOpen(false)} className="hover:bg-white/20 p-1 rounded transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSendCompose} className="flex-1 flex flex-col p-4 space-y-4">
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-400 w-12 shrink-0">To:</span>
              {currentUser.role === 'admin' ? (
                <select
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none dark:text-white dark:bg-slate-800 border-none cursor-pointer"
                  required
                >
                  <option value="" className="text-slate-400">발송 대상 유저 선택</option>
                  {allUsers.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.virtualEmail}>{u.name} ({u.virtualEmail})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="receiver@stopfive.com (예: team@stopfive.com)"
                  className="w-full text-xs bg-transparent focus:outline-none dark:text-white"
                  required
                />
              )}
            </div>

            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs text-slate-400 w-12 shrink-0">Subject:</span>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full text-xs bg-transparent focus:outline-none dark:text-white"
                required
              />
            </div>

            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="본문을 작성하세요..."
              className="flex-1 h-48 text-xs p-2 focus:outline-none resize-none dark:bg-slate-800 dark:text-white rounded-lg border border-transparent dark:border-slate-700"
              required
            />

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition-all shadow-sm"
              >
                Send Mail
              </button>
            </div>
          </form>
        </div>
      )}

      {/* D. 체험 코스 가이드 오버레이 팝업 모달 */}
      {isCourseGuideOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
            {/* 모달 헤더 */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">3일 5회 체험 코스 상세 안내</h3>
              </div>
              <button 
                onClick={() => setIsCourseGuideOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-primary uppercase">체험 코스 개요</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  StopFive의 핵심 가설인 <strong>"정시 메일 알림 + 30초 내 답장 핑퐁"</strong>의 위력을 검증하기 위해 특별히 개발된 3일 과정 체험 프로그램입니다.
                  복잡한 설치 과정 없이 데모 시뮬레이터를 통해 가상으로 체험을 완수할 수 있습니다.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Day별 액션 세부 가이드</h4>
                
                <div className="space-y-4 text-xs">
                  {/* Day 1 */}
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-blue-100 dark:bg-blue-950 text-primary rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">Day 1: 행동 트리거 시동 (1~2회차)</h5>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        가입 후 즉시 수신함에서 웰컴 메일(1회차)을 읽고 짧은 답장을 보냅니다. 
                        그 후 통계 탭에서 <strong>'다음 미션 즉시 받기'</strong> 버튼을 클릭하면 2회차 미션(기지개 켜기 등)이 수신함에 배달되어 바로 답장을 진행할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  {/* Day 2 */}
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">Day 2: 루틴 강화 (3~4회차)</h5>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        Day 1을 완료한 후 통계 탭에서 <strong>'하루 지나기 (치트)'</strong> 버튼을 클릭하여 시뮬레이션 하루를 경과시킵니다. 
                        곧바로 3회차 미션이 발송되며, 답장 전송 완료 후 다시 <strong>'다음 미션 즉시 받기'</strong>를 통해 4회차 미션까지 완료합니다.
                      </p>
                    </div>
                  </div>

                  {/* Day 3 */}
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">Day 3: 최종 완수 (5회차)</h5>
                      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                        마지막으로 통계 탭에서 <strong>'하루 지나기 (치트)'</strong>를 한 번 더 구동하면 5회차 피드백 메일이 배달됩니다. 
                        답장 작성을 완료하면 3일 완성 코스 축하 트로피가 활성화되며, 본인의 정량 통계 보고서가 업데이트됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-2xl text-[11px] text-slate-400 leading-relaxed">
                ℹ️ <strong>이젠(USER)님을 위한 팁</strong>: 체험 진행 상태는 언제든지 사이드바 최하단의 '오렌지색 점선 리셋' 단추를 통해 초기화하여 1회차부터 다시 시뮬레이션 해볼 수 있습니다.
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsCourseGuideOpen(false)}
                className="px-5 py-2 bg-primary hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                가이드 닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}