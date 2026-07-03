const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, ignoreHTTPSErrors: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5290/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1200);
  const landingOk = await page.locator('text=I accepted').count();
  await page.goto('http://localhost:5290/onboarding', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const authOk = await page.locator('text=Create your account').count();
  console.log('landing hero:', landingOk > 0 ? 'OK' : 'MISSING');
  console.log('auth screen:', authOk > 0 ? 'OK' : 'MISSING');
  console.log('page errors:', JSON.stringify(errors));
  await browser.close();
})();
