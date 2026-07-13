-- Supabase pg_cron & pg_net을 이용한 예약 메일 자동 발송 크론(Cron) 설정
-- 아래 SQL 스크립트를 Supabase 대시보드의 'SQL Editor'에서 실행하시면 됩니다.

-- 1. 필요한 확장 기능(Extensions) 활성화
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 기존 동일한 이름의 크론 작업이 존재할 경우 안전하게 제거
SELECT cron.unschedule('stopfive-email-cron');

-- 3. 5분 주기로 백엔드 크론 API(/api/cron) 호출 예약 등록
-- 배포 주소(https://stopfive.com)와 사전에 설정한 CRON_SECRET 보안 키가 쿼리 스트링으로 포함됩니다.
SELECT cron.schedule(
    'stopfive-email-cron', -- 크론 작업 고유 식별 명칭
    '*/5 * * * *',         -- 5분마다 실행 (cron expression)
    $$
    SELECT net.http_get(
        url := 'https://stopfive.com/api/cron?key=stopfive_cron_secret_2026_safe_key_z9x8c7'
    );
    $$
);
