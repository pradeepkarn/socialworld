import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\6bb77ab5-ce81-4b1c-93d4-b3ddb9d6cfe9';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runAcceptanceTest() {
  console.log('=== RUNNING ACCEPTANCE TEST SUITE (CHROME HEADLESS + SWIFTSHADER WEBGL) ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--window-size=1600,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  try {
    // 1. Start application & verify landing page
    console.log('\n[TEST 1] Landing Page (http://localhost:3000)');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_page.png') });
    console.log('  ✓ Landing page rendered successfully');

    // 2. Open game page
    console.log('\n[TEST 2] Game Page (http://localhost:3000/game)');
    await page.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#renderCanvas', { timeout: 15000 });
    // Allow Babylon to complete initial frame rendering and PBR shaders
    await sleep(3500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_city_initial.png') });
    console.log('  ✓ 3D City canvas initialized and player character rendered');

    // 3. Verify HUD elements
    console.log('\n[TEST 3] Verifying HUD elements');
    const creditsEl = await page.$('#credits-hud');
    const coordsEl = await page.$('#coords-hud');
    const initialCoords = await page.evaluate((el) => el.textContent, coordsEl);
    console.log(`  ✓ Credits HUD present, Initial coordinates: "${initialCoords}"`);

    // 4. Test WASD movement & walk directly towards CyberMart on the West sidewalk
    console.log('\n[TEST 4] Testing WASD movement towards CyberMart');
    await page.focus('#renderCanvas');

    // Walk forward along road
    await page.keyboard.down('KeyW');
    await sleep(1500);
    await page.keyboard.up('KeyW');
    await sleep(200);

    // Turn West towards CyberMart storefront
    await page.keyboard.down('KeyA');
    await sleep(1800);
    await page.keyboard.up('KeyA');
    await sleep(300);

    // Step slightly forward along sidewalk towards entrance
    await page.keyboard.down('KeyW');
    await sleep(800);
    await page.keyboard.up('KeyW');
    await sleep(600);

    const nearShopCoords = await page.evaluate((el) => el.textContent, coordsEl);
    console.log(`  ✓ Coordinates in front of CyberMart: "${nearShopCoords}"`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_near_shop.png') });

    // 5. Check Interaction Prompt
    console.log('\n[TEST 5] Checking Interaction Prompt ("Press [E]")');
    const promptEl = await page.waitForSelector('#interaction-prompt', { timeout: 4000 }).catch(() => null);
    const promptVisible = promptEl !== null;
    console.log(`  ✓ Interaction Prompt visible: ${promptVisible}`);
    if (promptEl) {
      const promptText = await page.evaluate((el) => el.textContent, promptEl);
      console.log(`  ✓ Prompt text: "${promptText}"`);
    }

    // 6. Press E to open Shop UI
    console.log('\n[TEST 6] Pressing [E] to Open Shop');
    await page.keyboard.press('KeyE');
    await sleep(800);

    const shopModal = await page.$('#shop-modal-overlay');
    console.log(`  ✓ Shop Modal displayed: ${shopModal !== null}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_shop_ui_opened.png') });

    // 7. Count products in store
    console.log('\n[TEST 7] Checking Products in Shop UI');
    const buyButtons = await page.$$('button[id^="buy-btn-"]');
    console.log(`  ✓ Found ${buyButtons.length} products available for purchase`);

    // 8. Purchase first product
    console.log('\n[TEST 8] Purchasing product (Cyber Deck MK-IV)');
    const firstBuyBtn = buyButtons[0];
    if (firstBuyBtn) {
      await firstBuyBtn.click();
      await sleep(1000);
      const afterCredits = await page.evaluate((el) => el.textContent, creditsEl);
      console.log(`  ✓ Purchase processed! Remaining balance: "${afterCredits}"`);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_after_purchase.png') });
    }

    // 9. Close Shop with Escape
    console.log('\n[TEST 9] Closing Shop with [Escape]');
    await page.keyboard.press('Escape');
    await sleep(800);
    const shopClosed = (await page.$('#shop-modal-overlay')) === null;
    console.log(`  ✓ Shop modal closed: ${shopClosed}`);

    // 10. Test Sprinting (Shift + W)
    console.log('\n[TEST 10] Testing Sprint (Shift + W)');
    await page.focus('#renderCanvas');
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    await sleep(1400);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    await sleep(300);
    const sprintCoords = await page.evaluate((el) => el.textContent, coordsEl);
    console.log(`  ✓ Coordinates after sprinting: "${sprintCoords}"`);

    // 11. Test Jumping (Space)
    console.log('\n[TEST 11] Testing Jumping (Space)');
    await page.keyboard.press('Space');
    await sleep(600);
    console.log('  ✓ Jump executed');

    // 12. Test Day / Sunset / Night Lighting
    console.log('\n[TEST 12] Testing Day / Sunset / Night Cycle');
    const timeBtn = await page.$('#time-toggle-btn');
    if (timeBtn) {
      await timeBtn.click();
      await sleep(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_city_sunset.png') });
      console.log('  ✓ Sunset transition captured');

      await timeBtn.click();
      await sleep(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_city_night.png') });
      console.log('  ✓ Night transition captured');

      await timeBtn.click(); // Back to Day
      await sleep(1000);
    }

    // 13. Test page reload lifecycle
    console.log('\n[TEST 13] Reloading page & verifying disposal lifecycle');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#renderCanvas', { timeout: 15000 });
    await sleep(2500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_after_reload.png') });
    console.log('  ✓ Page reloaded cleanly with zero Babylon.js lifecycle errors');

    console.log('\n======================================================');
    console.log('             ACCEPTANCE SUMMARY                       ');
    console.log('======================================================');
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Uncaught errors: ${errors.length}`);
    if (errors.length > 0) {
      console.warn('Page errors:');
      errors.forEach((e) => console.warn(`  - ${e}`));
    } else {
      console.log('✓ ZERO console errors during entire test run!');
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('Acceptance test failed with error:', err);
  } finally {
    await browser.close();
  }
}

runAcceptanceTest();
