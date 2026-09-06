import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\70205ea9-c6a7-486b-b3de-408572d99e2a';

async function runMobileTests() {
  console.log('[Mobile Test] Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  });

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Desktop Regression Protection (Desktop Viewport, No Touch)
    // -----------------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop (1280x720, no touch) ---');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 720, isMobile: false, hasTouch: false });
    await desktopPage.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await desktopPage.waitForSelector('#renderCanvas', { timeout: 15000 });
    await desktopPage.waitForFunction(() => window.__player && window.__player.controller, { timeout: 15000 });

    const desktopState = await desktopPage.evaluate(() => {
      const mobileControls = document.getElementById('mobile-controls-root');
      const timeBtn = document.querySelector('button#time-toggle-btn');
      return {
        hasMobileControls: !!mobileControls,
        hasTimeBtn: !!timeBtn,
      };
    });

    console.log('[Desktop Test] Has Mobile Controls in DOM:', desktopState.hasMobileControls, '(Must be FALSE on desktop)');
    if (desktopState.hasMobileControls) {
      throw new Error('Desktop regression: Mobile controls should NOT be mounted on standard desktop!');
    }

    // Verify desktop keyboard movement works
    await new Promise((r) => setTimeout(r, 1500));
    await desktopPage.click('#renderCanvas');
    const initialPos = await desktopPage.evaluate(() => ({
      x: window.__player.rootMesh.position.x,
      z: window.__player.rootMesh.position.z,
    }));
    await desktopPage.keyboard.down('KeyW');
    await new Promise((r) => setTimeout(r, 800));
    await desktopPage.keyboard.up('KeyW');
    await new Promise((r) => setTimeout(r, 200));
    const movedPos = await desktopPage.evaluate(() => ({
      x: window.__player.rootMesh.position.x,
      z: window.__player.rootMesh.position.z,
    }));
    const movedDist = Math.hypot(movedPos.x - initialPos.x, movedPos.z - initialPos.z);
    console.log(`[Desktop Test] WASD movement verified! Distance traveled: ${movedDist.toFixed(2)}m`);
    if (movedDist < 0.1) {
      throw new Error('Desktop regression: WASD movement failed to move player!');
    }

    // -----------------------------------------------------------------------
    // TEST 2: Mobile Portrait Mode (393x852, touch enabled)
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Testing Mobile Portrait (393x852, iPhone 14 Pro touch) ---');
    const mobilePage = await browser.newPage();
    await mobilePage.bringToFront();
    await mobilePage.setViewport({
      width: 393,
      height: 852,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    await mobilePage.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await mobilePage.waitForSelector('#renderCanvas', { timeout: 15000 });
    await mobilePage.waitForFunction(() => window.__player && window.__player.controller, { timeout: 15000 });
    await mobilePage.waitForSelector('#mobile-controls-root', { timeout: 10000 });

    const mobileHUDState = await mobilePage.evaluate(() => {
      const mobileControls = document.getElementById('mobile-controls-root');
      const joystickZone = document.getElementById('mobile-joystick-zone');
      const cameraZone = document.getElementById('mobile-camera-zone');
      const jumpBtn = document.getElementById('mobile-jump-btn');
      const lockBtn = document.getElementById('mobile-immersive-lock-btn');
      return {
        hasRoot: !!mobileControls,
        hasJoystick: !!joystickZone,
        hasCameraZone: !!cameraZone,
        hasJumpBtn: !!jumpBtn,
        hasLockBtn: !!lockBtn,
      };
    });

    console.log('[Mobile Portrait] Controls Mounted:', mobileHUDState);
    if (!mobileHUDState.hasRoot || !mobileHUDState.hasJoystick || !mobileHUDState.hasJumpBtn || !mobileHUDState.hasLockBtn) {
      throw new Error('Mobile controls failed to mount all required elements!');
    }

    // Capture initial mobile portrait screenshot
    await mobilePage.screenshot({
      path: `${ARTIFACTS_DIR}\\09_mobile_portrait_controls.png`,
    });
    console.log('[Mobile Portrait] Screenshot saved: 09_mobile_portrait_controls.png');

    // -----------------------------------------------------------------------
    // TEST 3: Virtual Joystick Movement on Mobile
    // -----------------------------------------------------------------------
    console.log('\n--- 3. Testing Virtual Joystick Movement ---');
    await mobilePage.bringToFront();
    await new Promise((r) => setTimeout(r, 1000));

    // Trigger virtual joystick touch drag directly on the handle or via touch event
    const joystickRes = await mobilePage.evaluate(async () => {
      const zone = document.getElementById('mobile-joystick-zone');
      if (!zone) return 0;
      const rect = zone.getBoundingClientRect();

      const mobInitPos = {
        x: window.__player.rootMesh.position.x,
        z: window.__player.rootMesh.position.z,
      };

      const touchStart = new Touch({
        identifier: 999,
        target: zone,
        clientX: rect ? rect.left + 50 : 50,
        clientY: rect ? rect.top + 100 : 500,
      });
      zone.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        targetTouches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      // Drag up (forward)
      const touchMove = new Touch({
        identifier: 999,
        target: zone,
        clientX: rect ? rect.left + 50 : 50,
        clientY: rect ? rect.top + 50 : 450,
      });
      zone.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        targetTouches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));

      const joyForwardActive = window.__player.controller['joystickForward'];

      // Advance physics frames while touch is actively applied
      for (let f = 0; f < 25; f++) {
        await new Promise((r) => requestAnimationFrame(r));
      }

      const mobMovedPos = {
        x: window.__player.rootMesh.position.x,
        z: window.__player.rootMesh.position.z,
      };
      const dist = Math.hypot(mobMovedPos.x - mobInitPos.x, mobMovedPos.z - mobInitPos.z);

      // Release joystick
      const touchEnd = new Touch({
        identifier: 999,
        target: zone,
        clientX: rect ? rect.left + 50 : 50,
        clientY: rect ? rect.top + 50 : 450,
      });
      zone.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        targetTouches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));

      return {
        mobInitPos,
        mobMovedPos,
        dist,
        joyForwardActive,
        joyForwardEnded: window.__player.controller['joystickForward'],
        isLocked: window.__player.controller.getIsLocked(),
        isGrounded: window.__player.controller.getIsGrounded(),
      };
    });

    console.log('[Mobile Test] Joystick result:', joystickRes);
    console.log(`[Mobile Test] Joystick movement: Traveled: ${joystickRes.dist.toFixed(2)}m`);
    if (joystickRes.dist < 0.1) {
      throw new Error('Virtual joystick failed to move player character!');
    }

    // -----------------------------------------------------------------------
    // TEST 4: Mobile Camera Touch Orbiting
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Testing Touch Camera Orbiting ---');
    const initCamAlpha = await mobilePage.evaluate(() => window.__player.camera.camera.alpha);

    // Touch drag on right camera zone: (300, 400) -> (220, 400)
    await mobilePage.evaluate(() => {
      const zone = document.getElementById('mobile-camera-zone');
      if (!zone) return;

      const touchStart = new Touch({
        identifier: 2,
        target: zone,
        clientX: 300,
        clientY: 400,
      });
      zone.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        targetTouches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      const touchMove = new Touch({
        identifier: 2,
        target: zone,
        clientX: 220,
        clientY: 400,
      });
      zone.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        targetTouches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));

      const touchEnd = new Touch({
        identifier: 2,
        target: zone,
        clientX: 220,
        clientY: 400,
      });
      zone.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        targetTouches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));
    });

    const newCamAlpha = await mobilePage.evaluate(() => window.__player.camera.camera.alpha);
    const alphaDiff = Math.abs(newCamAlpha - initCamAlpha);
    console.log(`[Mobile Test] Touch camera orbit verified! Alpha changed by: ${alphaDiff.toFixed(3)} rad`);
    if (alphaDiff < 0.05) {
      throw new Error('Touch drag failed to rotate camera!');
    }

    // -----------------------------------------------------------------------
    // TEST 5: Mobile Jump Button
    // -----------------------------------------------------------------------
    console.log('\n--- 5. Testing Mobile Jump Button ---');
    const jumpDebug = await mobilePage.evaluate(() => {
      const btn = document.getElementById('mobile-jump-btn');
      const beforeVel = window.__player.controller.getVelocity().y;
      const beforeGrounded = window.__player.controller.getIsGrounded();
      const beforeLocked = window.__player.controller.getIsLocked();
      if (btn) {
        btn.click();
      }
      return {
        btnFound: !!btn,
        beforeVel,
        beforeGrounded,
        beforeLocked,
        jumpRequested: window.__player.controller['jumpRequested'],
      };
    });
    console.log('[Mobile Test] Jump Debug:', jumpDebug);

    const isJumping = await mobilePage.waitForFunction(() => {
      const vel = window.__player.controller.getVelocity();
      const grounded = window.__player.controller.getIsGrounded();
      return vel.y > 0.5 || !grounded;
    }, { timeout: 4000 }).then(() => true).catch(() => false);

    console.log(`[Mobile Test] Jump button triggered upward velocity: ${isJumping}`);
    if (!isJumping) {
      throw new Error('Mobile jump button failed to trigger upward jump impulse!');
    }

    // -----------------------------------------------------------------------
    // TEST 6: Contextual Action Buttons (Handshake with nearby player)
    // -----------------------------------------------------------------------
    console.log('\n--- 6. Testing Contextual Handshake Button ---');
    const player2Page = await browser.newPage();
    await player2Page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });
    await player2Page.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await player2Page.waitForFunction(() => window.__player && window.__remotePlayerManager && window.__remotePlayerManager.getCount() >= 1, { timeout: 15000 });

    // Position player 1 and player 2 near each other (1.5 meters)
    const p1Pos = await mobilePage.evaluate(() => {
      window.__player.rootMesh.position.set(0, 1.05, 5.0);
      return { x: window.__player.rootMesh.position.x, y: window.__player.rootMesh.position.y, z: window.__player.rootMesh.position.z };
    });

    await player2Page.bringToFront();
    await player2Page.evaluate(() => {
      window.__player.rootMesh.position.set(0, 1.05, 6.2);
      window.__networkClient?.sendPlayerUpdate(
        window.__player.rootMesh.position,
        window.__player.rootMesh.rotation.y,
        'idle'
      );
    });

    // Position players facing each other within 1.2 meters
    await mobilePage.bringToFront();
    await mobilePage.evaluate(() => {
      window.__player.rootMesh.position.set(0, 1.05, 5.0);
      window.__player.rootMesh.rotation.y = 0;
      const rpm = window.__remotePlayerManager;
      if (rpm) {
        for (const rp of rpm['remotePlayers'].values()) {
          rp.rootMesh.position.set(0, 1.05, 6.2);
          rp.targetPosition.set(0, 1.05, 6.2);
        }
      }
    });

    await player2Page.evaluate(() => {
      window.__player.rootMesh.position.set(0, 1.05, 6.2);
      window.__player.rootMesh.rotation.y = Math.PI;
      const rpm = window.__remotePlayerManager;
      if (rpm) {
        for (const rp of rpm['remotePlayers'].values()) {
          rp.rootMesh.position.set(0, 1.05, 5.0);
          rp.targetPosition.set(0, 1.05, 5.0);
        }
      }
    });

    await mobilePage.evaluate(async () => {
      for (let f = 0; f < 20; f++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    // Check if contextual handshake button appeared on mobilePage
    await mobilePage.waitForSelector('#mobile-handshake-btn', { timeout: 10000 });
    console.log('[Mobile Test] Contextual 🤝 HANDSHAKE button appeared!');

    await mobilePage.screenshot({
      path: `${ARTIFACTS_DIR}\\10_mobile_handshake_contextual.png`,
    });
    console.log('[Mobile Test] Screenshot saved: 10_mobile_handshake_contextual.png');

    // Click the mobile handshake button
    await mobilePage.click('#mobile-handshake-btn');
    await new Promise((r) => setTimeout(r, 500));

    await player2Page.close();
    await mobilePage.close();

    // -----------------------------------------------------------------------
    // TEST 7: Mobile Landscape View (852x393, landscape orientation)
    // -----------------------------------------------------------------------
    console.log('\n--- 7. Testing Mobile Landscape View ---');
    const landscapePage = await browser.newPage();
    await landscapePage.bringToFront();
    await landscapePage.setViewport({
      width: 852,
      height: 393,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    await landscapePage.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await landscapePage.waitForSelector('#mobile-controls-root', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    await landscapePage.screenshot({
      path: `${ARTIFACTS_DIR}\\11_mobile_landscape_gameplay.png`,
    });
    console.log('[Mobile Test] Screenshot saved: 11_mobile_landscape_gameplay.png');

    // -----------------------------------------------------------------------
    // TEST 8: Mobile Immersive Mode Button Toggle
    // -----------------------------------------------------------------------
    console.log('\n--- 8. Testing Immersive Mode Lock Toggle ---');
    const initialLockText = await landscapePage.$eval('#mobile-immersive-lock-btn', (el) => el.textContent);
    console.log(`[Mobile Test] Initial Lock Button Text: "${initialLockText}"`);

    await landscapePage.click('#mobile-immersive-lock-btn');
    await new Promise((r) => setTimeout(r, 300));

    const toggledLockText = await landscapePage.$eval('#mobile-immersive-lock-btn', (el) => el.textContent);
    console.log(`[Mobile Test] Toggled Lock Button Text: "${toggledLockText}"`);

    console.log('\nALL MOBILE AND DESKTOP TESTS COMPLETED SUCCESSFULLY!\n');
  } finally {
    await browser.close();
  }
}

runMobileTests().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});
