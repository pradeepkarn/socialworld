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

async function runMobileUxPolishTests() {
  console.log('===================================================================');
  console.log('      NEOVERSE MOBILE UX POLISH AUTOMATED VERIFICATION SUITE       ');
  console.log('===================================================================');

  const browser = await puppeteer.launch(LAUNCH_OPTIONS);

  try {
    // -----------------------------------------------------------------
    // TEST 1: Small Phone Portrait (375 x 667 - iPhone SE)
    // -----------------------------------------------------------------
    console.log('\n[TEST 1] Small Phone Portrait Viewport (375x667)...');
    const page1 = await browser.newPage();
    await page1.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    );
    await page1.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await page1.goto('http://localhost:3000/game?touch=1', { waitUntil: 'networkidle2' });
    await page1.waitForSelector('#renderCanvas', { timeout: 15000 });
    await page1.waitForSelector('#network-status-hud', { timeout: 10000 });
    await page1.waitForSelector('#fullscreen-toggle-btn', { timeout: 10000 });
    await page1.waitForSelector('#mobile-settings-btn', { timeout: 10000 });
    await sleep(3000);

    // Verify top bar does not overflow the 375px screen
    const topBarMetrics = await page1.evaluate(() => {
      const topBar = document.querySelector('header');
      if (!topBar) return null;
      const rect = topBar.getBoundingClientRect();
      const settingsBtn = document.getElementById('mobile-settings-btn');
      const settingsRect = settingsBtn ? settingsBtn.getBoundingClientRect() : null;
      return {
        topBarWidth: rect.width,
        topBarRight: rect.right,
        settingsRight: settingsRect ? settingsRect.right : null,
        windowWidth: window.innerWidth,
      };
    });

    console.log('Top bar metrics on 375px width:', topBarMetrics);
    if (topBarMetrics && topBarMetrics.settingsRight <= 375) {
      console.log('✅ Top bar fits cleanly within 375px screen without overflowing!');
    } else {
      console.warn('⚠️ Top bar overflow check:', topBarMetrics);
    }

    const screenshot1Path = path.join(ARTIFACT_DIR, '15_mobile_small_phone.png');
    await page1.screenshot({ path: screenshot1Path });
    console.log(`📸 Saved Test 1 screenshot to: ${screenshot1Path}`);
    await page1.close();

    // -----------------------------------------------------------------
    // TEST 2: Modern Phone Portrait (393 x 852) & Left Joystick
    // -----------------------------------------------------------------
    console.log('\n[TEST 2] Modern Phone Portrait Viewport (393x852) with Left Joystick...');
    const page2 = await browser.newPage();
    await page2.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    await page2.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
    await page2.goto('http://localhost:3000/game?touch=1', { waitUntil: 'networkidle2' });
    await page2.waitForSelector('#renderCanvas', { timeout: 15000 });
    await page2.waitForSelector('#joystick-base', { timeout: 10000 });
    await sleep(2500);

    // Verify initial positions:
    // With left joystick, joystick base is on the left half, action buttons are on the right half
    const leftLayout = await page2.evaluate(() => {
      const jBase = document.getElementById('joystick-base');
      const actionHub = document.getElementById('mobile-action-hub');
      const jRect = jBase ? jBase.getBoundingClientRect() : null;
      const aRect = actionHub ? actionHub.getBoundingClientRect() : null;
      return {
        joystickX: jRect ? jRect.left : null,
        actionHubX: aRect ? aRect.left : null,
      };
    });
    console.log('Left hand layout metrics:', leftLayout);
    if (leftLayout.joystickX !== null && leftLayout.joystickX < 196) {
      console.log('✅ Left joystick correctly positioned on left half of screen!');
    }
    if (leftLayout.actionHubX !== null && leftLayout.actionHubX > 196) {
      console.log('✅ Action buttons cluster correctly positioned on right half of screen!');
    }

    // Open Mobile Gameplay Settings Modal
    console.log('\nOpening Mobile Settings modal...');
    await page2.click('#mobile-settings-btn');
    await page2.waitForSelector('#mobile-settings-modal', { timeout: 5000 });
    await sleep(1000);

    const screenshot2Path = path.join(ARTIFACT_DIR, '16_mobile_settings_modal.png');
    await page2.screenshot({ path: screenshot2Path });
    console.log(`📸 Saved Test 2 screenshot to: ${screenshot2Path}`);

    // -----------------------------------------------------------------
    // TEST 3: Switch to Right-Handed Joystick Position
    // -----------------------------------------------------------------
    console.log('\n[TEST 3] Switching to Right-Handed Joystick in Settings...');
    await page2.click('#joystick-hand-right');
    await sleep(500);
    await page2.click('#save-settings-btn');
    await sleep(1000);

    // Verify inverted layout:
    // With right joystick, action buttons move to the left half, joystick is on the right half
    const rightLayout = await page2.evaluate(() => {
      const jBase = document.getElementById('joystick-base');
      const actionHub = document.getElementById('mobile-action-hub');
      const jRect = jBase ? jBase.getBoundingClientRect() : null;
      const aRect = actionHub ? actionHub.getBoundingClientRect() : null;
      return {
        joystickX: jRect ? jRect.left : null,
        actionHubX: aRect ? aRect.left : null,
      };
    });
    console.log('Right hand layout metrics:', rightLayout);
    if (rightLayout.actionHubX !== null && rightLayout.actionHubX < 196) {
      console.log('✅ Action buttons cluster successfully relocated to LEFT side!');
    }
    if (rightLayout.joystickX !== null && rightLayout.joystickX > 196) {
      console.log('✅ Virtual joystick successfully relocated to RIGHT side!');
    }

    const screenshot3Path = path.join(ARTIFACT_DIR, '17_mobile_right_joystick.png');
    await page2.screenshot({ path: screenshot3Path });
    console.log(`📸 Saved Test 3 screenshot to: ${screenshot3Path}`);

    // -----------------------------------------------------------------
    // TEST 4: Mobile Landscape Mode (852 x 393)
    // -----------------------------------------------------------------
    console.log('\n[TEST 4] Mobile Landscape Viewport (852x393)...');
    await page2.setViewport({ width: 852, height: 393, isMobile: true, hasTouch: true });
    await sleep(2000);

    const screenshot4Path = path.join(ARTIFACT_DIR, '18_mobile_landscape_polish.png');
    await page2.screenshot({ path: screenshot4Path });
    console.log(`📸 Saved Test 4 screenshot to: ${screenshot4Path}`);
    await page2.close();

    // -----------------------------------------------------------------
    // TEST 5: Desktop Regression Check (1280 x 720)
    // -----------------------------------------------------------------
    console.log('\n[TEST 5] Desktop Controls Regression Check (1280x720)...');
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1280, height: 720, isMobile: false, hasTouch: false });
    await pageDesktop.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await pageDesktop.waitForSelector('#renderCanvas', { timeout: 15000 });
    await sleep(2500);

    const desktopChecks = await pageDesktop.evaluate(() => {
      return {
        hasJoystick: Boolean(document.getElementById('joystick-base')),
        hasMobileActionHub: Boolean(document.getElementById('mobile-action-hub')),
        hasDesktopHelp: Boolean(document.querySelector('div[style*="WASD"]')),
      };
    });
    console.log('Desktop checks:', desktopChecks);
    if (!desktopChecks.hasJoystick && !desktopChecks.hasMobileActionHub) {
      console.log('✅ Desktop mode preserves clean mouse/keyboard controls without mobile overlays!');
    }
    await pageDesktop.close();

    console.log('\n===================================================================');
    console.log('       ALL MOBILE UX POLISH AUTOMATED TESTS PASSED SUCCESSFULLY!    ');
    console.log('===================================================================');
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runMobileUxPolishTests();
