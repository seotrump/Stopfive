const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('브라우저 실행 중...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  try {
    // 1. Localhost 접속 및 로그인 전 랜딩 페이지 리셋 상태 로드
    console.log('StopFive 접속 중...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // 로컬 스토리지 초기화로 로그인 세션 초기화
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // 2. 신규 사용자 가입 시나리오 가동 (코스 신선한 확인을 위해)
    console.log('임시 유저 회원가입 진행 중...');
    // Register 폼 탭 클릭
    const registerTab = await page.getByRole('button', { name: /Get Started/i });
    await registerTab.click();
    await page.waitForTimeout(500);

    // 폼 값 입력
    const emailStr = `testuser_${Date.now()}@gmail.com`;
    await page.locator('input[placeholder="이젠"]').fill('이젠');
    await page.locator('input[placeholder="you@example.com"]').fill(emailStr);
    await page.locator('input[placeholder="비밀번호 설정 (4자리 이상)"]').fill('1234');
    await page.locator('input[type="time"]').fill('09:00');
    
    // 가입 버튼 클릭
    await page.click('button[type="submit"]:has-text("가입 및 3일 체험 코스 즉시 가동")');
    await page.waitForTimeout(2500); // 가상 데이터베이스 빌드 대기
    
    // 3. 로그인 후 첫 진입한 수신함(Inbox) 화면 캡처
    console.log('수신함 캡처 중...');
    const inboxPath = path.join('C:\\Users\\User\\.gemini\\antigravity\\brain\\f242612b-5561-4ff7-9969-e9571ffa3f94', 'inbox_minimal.png');
    await page.screenshot({ path: inboxPath });
    console.log(`수신함 캡처 완료: ${inboxPath}`);

    // 4. 통계(Statistics) 탭으로 이동하여 로드맵 진행 바 확인 및 캡처
    console.log('통계 탭 이동 중...');
    await page.click('button:has-text("통계 리포트")');
    await page.waitForTimeout(1000);
    
    const statsPath = path.join('C:\\Users\\User\\.gemini\\antigravity\\brain\\f242612b-5561-4ff7-9969-e9571ffa3f94', 'statistics_roadmap.png');
    await page.screenshot({ path: statsPath });
    console.log(`통계 로드맵 캡처 완료: ${statsPath}`);

    // 5. '체험 코스 가이드' 버튼 클릭하여 오버레이 모달 가이드 확인 및 캡처
    console.log('체험 코스 가이드 팝업 실행 중...');
    await page.click('button:has-text("체험 코스 가이드")');
    await page.waitForTimeout(1000);

    const guidePath = path.join('C:\\Users\\User\\.gemini\\antigravity\\brain\\f242612b-5561-4ff7-9969-e9571ffa3f94', 'course_guide_modal.png');
    await page.screenshot({ path: guidePath });
    console.log(`가이드 모달 캡처 완료: ${guidePath}`);

  } catch (error) {
    console.error('캡처 중 오류 발생:', error);
  } finally {
    await browser.close();
    console.log('브라우저가 닫혔습니다.');
  }
})();
