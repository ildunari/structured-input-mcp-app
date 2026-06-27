const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Light mode, wide
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto('http://127.0.0.1:5173/harness.html');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-light-wide.png' });

  // Dark mode, wide
  await page.click('#themeToggle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-dark-wide.png' });

  // Light mode, narrow (triggers media query inside iframe if iframe is responsive, but iframe is fixed to min(100%, 480px))
  // Let's just resize the viewport to 400px to force the iframe to 400px
  await page.click('#themeToggle'); // back to light
  await page.setViewportSize({ width: 400, height: 800 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-light-narrow.png' });

  await browser.close();
})();
