const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log('BAD RESPONSE:', resp.status(), resp.url());
    }
  });
  await page.goto('http://127.0.0.1:5173/04_materialdatabase/');
  await page.waitForTimeout(3000);
  const root = await page.$eval('#root', el => el.innerHTML);
  console.log('ROOT HTML LENGTH:', root.length);
  await browser.close();
})();
