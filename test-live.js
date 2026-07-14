const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Catch console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('https://www.stopfive.com');
  
  // Wait for the register button and click it
  await page.waitForSelector('button');
  
  await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const regBtn = btns.find(b => b.textContent.includes('회원가입') && !b.textContent.includes('시작하기'));
      if(regBtn) regBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));

  // Type info
  await page.type('input[placeholder="홍길동"]', 'AgentTest5');
  await page.type('input[type="email"]', 'test_agent5@stopfive.com');
  await page.type('input[type="password"]', 'password1234');
  
  // Submit
  await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.click();
  });
  
  // Wait for toast or network
  await new Promise(r => setTimeout(r, 4000));
  
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  if (bodyHTML.includes('가입 완료') || bodyHTML.includes('계정이 생성되었으며')) {
    console.log('SUCCESS: Registration works on live site!');
  } else if (bodyHTML.includes('회원가입 오류')) {
    console.log('ERROR: Registration failed on live site! (Toast showed error)');
  } else {
    console.log('UNKNOWN: Could not determine result.');
  }
  
  await browser.close();
})();
