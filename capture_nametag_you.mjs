import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\70205ea9-c6a7-486b-b3de-408572d99e2a';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function captureLocalPlayerNametag() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--window-size=1280,720',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#renderCanvas', { timeout: 15000 });
    await sleep(3500);

    // Position camera close behind player and slightly above to see the overhead nametag clearly
    await page.evaluate(() => {
      const p = window.__player;
      if (p) {
        p.camera.camera.radius = 4.2;
        p.camera.camera.beta = 1.35;
        p.camera.camera.alpha = -Math.PI / 2;
      }
    });
    await sleep(1500);

    const shotPath = path.join(ARTIFACT_DIR, '04_local_player_you_indicator.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);
  } finally {
    await browser.close();
  }
}

captureLocalPlayerNametag().catch(console.error);
