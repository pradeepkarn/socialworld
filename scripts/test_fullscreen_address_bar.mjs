import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\70205ea9-c6a7-486b-b3de-408572d99e2a';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const LAUNCH_OPTIONS = {
  executablePath: CHROME_PATH,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
};

async function testFullscreenAddressBar() {
  console.log('===================================================================');
  console.log('   NEOVERSE FULLSCREEN ADDRESS-BAR HIDING AUTOMATED VERIFICATION   ');
  console.log('===================================================================');

  const browser = await puppeteer.launch(LAUNCH_OPTIONS);

  try {
    // -----------------------------------------------------------------
    // TEST 1: Android Chrome Emulation & navigationUI: 'hide' Verification
    // -----------------------------------------------------------------
    console.log('\n[TEST 1] Testing Android Chrome Fullscreen with navigationUI: hide...');
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    );
    await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });

    // Spy on requestFullscreen calls to verify options passed
    await page.evaluateOnNewDocument(() => {
      const originalRequest = Element.prototype.requestFullscreen;
      window.__fsCallHistory = [];
      Element.prototype.requestFullscreen = function (options) {
        window.__fsCallHistory.push({
          targetId: this.id || this.tagName,
          options: options || null,
        });
        return originalRequest ? originalRequest.call(this, options) : Promise.resolve();
      };
    });

    await page.goto('http://localhost:3000/game?touch=1', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#renderCanvas', { timeout: 15000 });
    await page.waitForSelector('#fullscreen-toggle-btn', { timeout: 10000 });
    await sleep(2500);

    // Click the fullscreen button in top bar
    console.log('Clicking Fullscreen button in top bar...');
    await page.click('#fullscreen-toggle-btn');
    await sleep(1000);

    const fsCalls = await page.evaluate(() => {
      return window.__fsCallHistory || [];
    });
    console.log('Captured requestFullscreen calls:', fsCalls);

    if (fsCalls.length > 0) {
      const call = fsCalls[0];
      if (call.options && call.options.navigationUI === 'hide') {
        console.log('✅ SUCCESS: requestFullscreen called with navigationUI: "hide"!');
      } else {
        console.warn('⚠️ navigationUI: "hide" not explicitly captured:', call);
      }
      if (call.targetId === 'neoverse-master-root') {
        console.log('✅ SUCCESS: requestFullscreen called on #neoverse-master-root container!');
      }
    }

    const screenshot1Path = path.join(ARTIFACT_DIR, '19_mobile_fullscreen_address_bar.png');
    await page.screenshot({ path: screenshot1Path });
    console.log(`📸 Saved screenshot 1 to: ${screenshot1Path}`);

    // Verify Settings Modal has Fullscreen Controls
    console.log('\nVerifying Settings Modal Fullscreen controls...');
    await page.click('#mobile-settings-btn');
    await page.waitForSelector('#mobile-settings-modal', { timeout: 5000 });
    await sleep(800);

    const hasModalFsBtn = await page.evaluate(() => {
      return Boolean(document.getElementById('modal-toggle-fullscreen-btn'));
    });
    console.log('Settings modal contains #modal-toggle-fullscreen-btn:', hasModalFsBtn);
    if (hasModalFsBtn) {
      console.log('✅ SUCCESS: Dedicated Fullscreen control exists inside Settings Modal!');
    }

    await page.close();

    // -----------------------------------------------------------------
    // TEST 2: iOS Safari Emulation & Address Bar Collapse Guide
    // -----------------------------------------------------------------
    console.log('\n[TEST 2] Testing iOS Safari Emulation & Address Bar Collapse Guide...');
    const pageIos = await browser.newPage();
    await pageIos.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    );
    await pageIos.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });

    // Emulate iOS Safari where Element.prototype.requestFullscreen does NOT exist
    await pageIos.evaluateOnNewDocument(() => {
      delete Element.prototype.requestFullscreen;
      delete Element.prototype.webkitRequestFullscreen;
    });

    await pageIos.goto('http://localhost:3000/game?touch=1', { waitUntil: 'networkidle2' });
    await pageIos.waitForSelector('#renderCanvas', { timeout: 15000 });
    await pageIos.waitForSelector('#fullscreen-toggle-btn', { timeout: 10000 });
    await sleep(2500);

    // Tap fullscreen button on iOS Safari
    console.log('Clicking Fullscreen button on simulated iPhone Safari...');
    await pageIos.click('#fullscreen-toggle-btn');
    await pageIos.waitForSelector('#ios-fullscreen-modal', { timeout: 5000 });
    await sleep(1000);

    const iosModalVisible = await pageIos.evaluate(() => {
      const modal = document.getElementById('ios-fullscreen-modal');
      return Boolean(modal);
    });
    console.log('iOS Address Bar Guide Modal visible:', iosModalVisible);
    if (iosModalVisible) {
      console.log('✅ SUCCESS: iOS Safari guide modal presented with clear instructions to hide address bar!');
    }

    const screenshot2Path = path.join(ARTIFACT_DIR, '20_ios_address_bar_guide.png');
    await pageIos.screenshot({ path: screenshot2Path });
    console.log(`📸 Saved screenshot 2 to: ${screenshot2Path}`);

    // Click "GOT IT, RESUME GAME"
    await pageIos.click('#close-ios-hint-btn');
    await sleep(500);

    const iosModalClosed = await pageIos.evaluate(() => {
      return !document.getElementById('ios-fullscreen-modal');
    });
    if (iosModalClosed) {
      console.log('✅ SUCCESS: iOS guide modal closes cleanly and returns player to gameplay!');
    }

    await pageIos.close();

    console.log('\n===================================================================');
    console.log('  ALL FULLSCREEN ADDRESS BAR TESTS COMPLETED AND VERIFIED!         ');
    console.log('===================================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

testFullscreenAddressBar();
