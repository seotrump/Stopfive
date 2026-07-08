-- StopFive Supabase 데이터베이스 스키마

-- 1. 사용자 테이블 (users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    virtual_email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    delivery_time TIME WITHOUT TIME ZONE DEFAULT '09:00:00'::time NOT NULL,
    current_chain INTEGER DEFAULT 0 NOT NULL,
    last_completed_date DATE,
    total_appointments INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) 설정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 정보를 조회할 수 있습니다." ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "사용자는 자신의 정보를 수정할 수 있습니다." ON public.users
    FOR UPDATE USING (auth.uid() = id);


-- 2. 이메일 스레드 테이블 (emails)
CREATE TABLE public.emails (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    sender TEXT NOT NULL, -- 'team@stopfive.com' 또는 유저 가상 메일
    receiver TEXT NOT NULL, -- 유저 가상 메일 또는 'team@stopfive.com'
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT CHECK (status IN ('unread', 'read', 'archived')) DEFAULT 'unread' NOT NULL,
    is_system_mission BOOLEAN DEFAULT false NOT NULL,
    mission_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE,
    reply_content TEXT
);

-- RLS 설정
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신과 관련된 이메일만 조회할 수 있습니다." ON public.emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신과 관련된 이메일 상태만 수정할 수 있습니다." ON public.emails
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "사용자는 관리자에게 메일을 보낼 수 있습니다." ON public.emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. 행동 미션 질문 라이브러리 풀 (mission_pool)
CREATE TABLE public.mission_pool (
    id SERIAL PRIMARY KEY,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 기본 미션 데이터 삽입
INSERT INTO public.mission_pool (body) VALUES
('하던 일을 잠시 멈추고 박수를 3번 쳐 보세요. 완료하셨다면 답장을 보내주세요.'),
('자리에서 일어나 가볍게 기지개를 켜고 깊은 호흡을 3번 해보세요. 완료하셨다면 답장을 보내주세요.'),
('지금 마실 수 있는 물 한 잔을 준비해 천천히 한 모금 마셔보세요. 완료하셨다면 답장을 보내주세요.'),
('눈을 감고 열을 셀 동안 아무 생각도 하지 않고 가만히 멈춰보세요. 완료하셨다면 답장을 보내주세요.'),
('주변을 둘러보고 가장 눈에 띄는 파란색이나 초록색 물건 하나를 5초간 가만히 바라보세요. 완료하셨다면 답장을 보내주세요.'),
('두 손을 모아 손바닥을 서로 10초 동안 빠르게 비벼 따뜻한 열감을 느껴보세요. 완료하셨다면 답장을 보내주세요.'),
('허리를 곧게 펴고 양어깨를 귀 가까이 올렸다가 아래로 툭 떨어트리는 동작을 3번 반복해 보세요. 완료하셨다면 답장을 보내주세요.'),
('창밖을 바라보거나 방의 가장 먼 모서리를 10초 동안 가만히 응시해 보세요. 완료하셨다면 답장을 보내주세요.'),
('가볍게 주먹을 쥐었다가 쫙 펴는 동작을 양손으로 5번 천천히 반복해 보세요. 완료하셨다면 답장을 보내주세요.'),
('눈을 감고 주변에서 들리는 가장 작은 소리 하나에 10초 동안 조용히 귀 기울여 보세요. 완료하셨다면 답장을 보내주세요.');
