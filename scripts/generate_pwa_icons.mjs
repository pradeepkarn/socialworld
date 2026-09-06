import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PUBLIC_DIR = path.resolve('public');

const iconHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 512px;
      height: 512px;
      background: radial-gradient(circle at center, #0e1e38 0%, #05070d 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .card {
      width: 440px;
      height: 440px;
      border-radius: 96px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(8, 12, 22, 0.95) 100%);
      border: 6px solid #00e5ff;
      box-shadow: 0 0 60px rgba(0, 229, 255, 0.4), inset 0 0 40px rgba(0, 229, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .logo-diamond {
      width: 160px;
      height: 160px;
      border-radius: 36px;
      background: linear-gradient(135deg, #00e5ff 0%, #0066ff 100%);
      box-shadow: 0 0 50px rgba(0, 229, 255, 0.8);
      transform: rotate(45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    .letter {
      transform: rotate(-45deg);
      font-size: 96px;
      font-weight: 900;
      color: #05070d;
      letter-spacing: -2px;
    }
    .title {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 6px;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(0, 229, 255, 0.8);
    }
    .subtitle {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 3px;
      color: #00e5ff;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-diamond">
      <span class="letter">N</span>
    </div>
    <div class="title">NEOVERSE</div>
    <div class="subtitle">3D VIRTUAL CITY</div>
  </div>
</body>
</html>
`;

async function generateIcons() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
    await page.setContent(iconHtml, { waitUntil: 'networkidle0' });

    const icon512Path = path.join(PUBLIC_DIR, 'icon-512.png');
    await page.screenshot({ path: icon512Path, clip: { x: 0, y: 0, width: 512, height: 512 } });
    console.log(`Created ${icon512Path}`);

    const appleIconPath = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
    await page.screenshot({ path: appleIconPath, clip: { x: 0, y: 0, width: 512, height: 512 } });
    console.log(`Created ${appleIconPath}`);

    await page.setViewport({ width: 192, height: 192, deviceScaleFactor: 1 });
    // Scale body down for 192x192
    await page.evaluate(() => {
      document.body.style.transformOrigin = '0 0';
      document.body.style.transform = 'scale(0.375)';
      document.body.style.width = '192px';
      document.body.style.height = '192px';
    });
    const icon192Path = path.join(PUBLIC_DIR, 'icon-192.png');
    await page.screenshot({ path: icon192Path, clip: { x: 0, y: 0, width: 192, height: 192 } });
    console.log(`Created ${icon192Path}`);

    console.log('Successfully generated all PWA icons!');
  } finally {
    await browser.close();
  }
}

generateIcons().catch(console.error);
