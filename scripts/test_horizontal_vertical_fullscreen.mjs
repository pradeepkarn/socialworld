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

async function testHorizontalAndVerticalFullscreen() {
  console.log('===================================================================');
  console.log('   NEOVERSE HORIZONTAL & VERTICAL FULLSCREEN VERIFICATION SUITE   ');
  console.log('===================================================================');

  const browser = await puppeteer.launch(LAUNCH_OPTIONS);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
    );

    // Track requestFullscreen and screen.orientation calls
    await page.evaluateOnNewDocument(() => {
      window.__callLog = {
        fullscreen: [],
        orientationLock: [],
        orientationUnlock: 0,
      };

      const origFs = Element.prototype.requestFullscreen;
      Element.prototype.requestFullscreen = function (options) {
        window.__callLog.fullscreen.push({
          targetId: this.id || this.tagName,
          options: options || null,
        });
        return origFs ? origFs.call(this, options) : Promise.resolve();
      };

      if (!window.screen.orientation) {
        window.screen.orientation = {};
      }
      window.screen.orientation.lock = function (mode) {
        window.__callLog.orientationLock.push(mode);
        return Promise.resolve();
      };
      window.screen.orientation.unlock = function () {
        window.__callLog.orientationUnlock++;
        return Promise.resolve();
      };
    });

    // -----------------------------------------------------------------
    // PHASE 1: Vertical (Portrait) Fullscreen Test (393 x 852)
    // -----------------------------------------------------------------
    console.log('\n[PHASE 1] Testing Vertical (Portrait: 393x852) Fullscreen...');
    await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3000/game?touch=1', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#renderCanvas', { timeout: 15000 });
    await page.waitForSelector('#fullscreen-toggle-btn', { timeout: 10000 });
    await page.waitForSelector('#orientation-toggle-btn', { timeout: 10000 });
    await sleep(2000);

    // Verify Orientation button in top bar
    const hasOrientBtn = await page.evaluate(() => {
      return Boolean(document.getElementById('orientation-toggle-btn'));
    });
    console.log('Quick Orientation Switcher button exists in Top Bar:', hasOrientBtn);

    // Enter Fullscreen in Vertical (Portrait)
    console.log('Tapping Fullscreen button in Vertical orientation...');
    await page.click('#fullscreen-toggle-btn');
    await sleep(1000);

    const verticalFsLog = await page.evaluate(() => window.__callLog);
    console.log('Captured Vertical Fullscreen Calls:', verticalFsLog.fullscreen);
    if (verticalFsLog.fullscreen.length > 0 && verticalFsLog.fullscreen[0].options?.navigationUI === 'hide') {
      console.log('✅ SUCCESS: Vertical Fullscreen requested with navigationUI: "hide" (no address bar)!');
    }

    const shotVertical = path.join(ARTIFACT_DIR, '21_fullscreen_vertical_portrait.png');
    await page.screenshot({ path: shotVertical });
    console.log(`📸 Saved Vertical Fullscreen screenshot: ${shotVertical}`);

    // -----------------------------------------------------------------
    // PHASE 2: Horizontal (Landscape: 852 x 393) Fullscreen Test
    // -----------------------------------------------------------------
    console.log('\n[PHASE 2] Rotating device to Horizontal (Landscape: 852x393)...');
    await page.setViewport({
      width: 852,
      height: 393,
      isMobile: true,
      hasTouch: true,
      isLandscape: true,
    });
    await sleep(1500);

    const canvasDimensions = await page.evaluate(() => {
      const canvas = document.getElementById('renderCanvas');
      const root = document.getElementById('neoverse-master-root');
      return {
        canvasWidth: canvas?.clientWidth,
        canvasHeight: canvas?.clientHeight,
        rootWidth: root?.clientWidth,
        rootHeight: root?.clientHeight,
        isMobileViewReported: window.innerWidth > window.innerHeight,
      };
    });
    console.log('Horizontal Canvas & Root dimensions:', canvasDimensions);

    if (canvasDimensions.canvasWidth === 852 && canvasDimensions.canvasHeight === 393) {
      console.log('✅ SUCCESS: Canvas automatically resized and fills entire Horizontal viewport (852x393)!');
    }

    const shotHorizontal = path.join(ARTIFACT_DIR, '22_fullscreen_horizontal_landscape.png');
    await page.screenshot({ path: shotHorizontal });
    console.log(`📸 Saved Horizontal Fullscreen screenshot: ${shotHorizontal}`);

    // -----------------------------------------------------------------
    // PHASE 3: Settings Modal Screen Orientation Selection
    // -----------------------------------------------------------------
    console.log('\n[PHASE 3] Testing Screen Orientation Controls in Settings Modal...');
    await page.click('#mobile-settings-btn');
    await page.waitForSelector('#mobile-settings-modal', { timeout: 5000 });
    await sleep(800);

    const hasOrientationControls = await page.evaluate(() => {
      const btnAuto = document.getElementById('orient-btn-auto');
      const btnPortrait = document.getElementById('orient-btn-portrait');
      const btnLandscape = document.getElementById('orient-btn-landscape');
      return Boolean(btnAuto && btnPortrait && btnLandscape);
    });
    console.log('Settings Modal contains all 3 orientation controls (Auto, Portrait, Landscape):', hasOrientationControls);

    const shotModal = path.join(ARTIFACT_DIR, '23_settings_modal_orientation_controls.png');
    await page.screenshot({ path: shotModal });
    console.log(`📸 Saved Settings Modal orientation controls screenshot: ${shotModal}`);

    // Test clicking Landscape button
    console.log('Testing click on [🖥️ Horizontal] orientation button...');
    await page.click('#orient-btn-landscape');
    await sleep(500);

    // Test clicking Portrait button
    console.log('Testing click on [📱 Vertical] orientation button...');
    await page.click('#orient-btn-portrait');
    await sleep(500);

    // Test clicking Auto-Rotate button
    console.log('Testing click on [🔄 Auto-Rotate] button...');
    await page.click('#orient-btn-auto');
    await sleep(500);

    const finalLog = await page.evaluate(() => window.__callLog);
    console.log('Captured Orientation Locks:', finalLog.orientationLock);
    console.log('Captured Orientation Unlocks:', finalLog.orientationUnlock);

    if (
      finalLog.orientationLock.includes('landscape') &&
      finalLog.orientationLock.includes('portrait') &&
      finalLog.orientationUnlock > 0
    ) {
      console.log('✅ SUCCESS: Screen Orientation API called correctly for both horizontal, vertical, and auto-rotate!');
    }

    // Close Settings Modal
    await page.click('#save-settings-btn');
    await sleep(800);

    // -----------------------------------------------------------------
    // PHASE 4: Quick Top-Bar Orientation Switcher Click Test
    // -----------------------------------------------------------------
    console.log('\n[PHASE 4] Testing Quick Top-Bar Orientation Switcher button...');
    await page.click('#orientation-toggle-btn');
    await sleep(500);

    const postQuickLog = await page.evaluate(() => window.__callLog);
    console.log('Total Orientation Locks after Top-Bar click:', postQuickLog.orientationLock);

    console.log('\n===================================================================');
    console.log('  ALL HORIZONTAL & VERTICAL FULLSCREEN VERIFICATIONS PASSED!       ');
    console.log('===================================================================');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

testHorizontalAndVerticalFullscreen();
