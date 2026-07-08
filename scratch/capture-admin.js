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
    console.log('StopFive 접속 중...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    // 1. 관리자 계정 로그인 진행
    console.log('관리자 계정 로그인 진행 중...');
    await page.locator('input[placeholder="you@example.com"]').fill('team@stopfive.com');
    await page.locator('input[placeholder="비밀번호 (4자리 이상)"]').fill('1234');
    await page.click('button[type="submit"]:has-text("로그인")');
    await page.waitForTimeout(2500);

    // 2. 관리자 메인 대시보드(가입 유저 현황) 캡처
    console.log('관리자 메인화면 캡처 중...');
    const adminMainPath = path.join('C:\\Users\\User\\.gemini\\antigravity\\brain\\f242612b-5561-4ff7-9969-e9571ffa3f94', 'admin_dashboard.png');
    await page.screenshot({ path: adminMainPath });
    console.log(`관리자 화면 캡처 완료: ${adminMainPath}`);

    // 3. 메일 발송 시뮬 모달 실행 및 캡처
    console.log('메일 발송 시뮬 모달 실행 중...');
    await page.click('button:has-text("메일 발송 시뮬")');
    await page.waitForTimeout(1000);

    const adminComposePath = path.join('C:\\Users\\User\\.gemini\\antigravity\\brain\\f242612b-5561-4ff7-9969-e9571ffa3f94', 'admin_compose_modal.png');
    await page.screenshot({ path: adminComposePath });
    console.log(`관리자 메일 발송 모달 캡처 완료: ${adminComposePath}`);

  } catch (error) {
    console.error('관리자 화면 캡처 중 오류 발생:', error);
  } finally {
    await browser.close();
    console.log('브라우저가 닫혔습니다.');
  }
})();
