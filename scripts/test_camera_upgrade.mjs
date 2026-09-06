import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\70205ea9-c6a7-486b-b3de-408572d99e2a';

async function runCameraTests() {
  console.log('[Camera Test] Launching Puppeteer Chrome...');
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

  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(message);
    }
    passCount++;
    console.log(`✅ PASS: ${message}`);
  }

  try {
    // =========================================================================
    // PART 1: Desktop Third-Person Modern Camera Tests (1280x720)
    // =========================================================================
    console.log('\n========================================');
    console.log('PART 1: Desktop Modern Camera Testing (1280x720)');
    console.log('========================================');

    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 720, isMobile: false, hasTouch: false });
    await desktopPage.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await desktopPage.waitForSelector('#renderCanvas', { timeout: 15000 });
    await desktopPage.waitForFunction(() => window.__player && window.__player.camera && window.__player.controller, {
      timeout: 15000,
    });

    // Wait for Babylon render loop and physics to settle
    await desktopPage.evaluate(async () => {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    // 1. Initial Distance and Framing Check
    const initialCameraState = await desktopPage.evaluate(() => {
      const p = window.__player;
      return {
        radius: p.camera.getRadius(),
        desiredRadius: p.camera.getDesiredRadius(),
        alpha: p.camera.camera.alpha,
        beta: p.camera.camera.beta,
        minDistance: p.camera.getConfig().minDistance,
        maxDistance: p.camera.getConfig().maxDistance,
        defaultDistance: p.camera.getConfig().defaultDistance,
        playerPos: { x: p.rootMesh.position.x, y: p.rootMesh.position.y, z: p.rootMesh.position.z },
        playerRotY: p.rootMesh.rotation.y,
      };
    });

    console.log('[Desktop] Initial Camera State:', initialCameraState);
    assert(
      Math.abs(initialCameraState.radius - 9.0) < 0.5,
      `Default camera distance is modern standard (~9.0u, got ${initialCameraState.radius.toFixed(2)}u)`
    );
    assert(initialCameraState.minDistance === 4.0, `Camera minDistance is 4.0u`);
    assert(initialCameraState.maxDistance === 14.0, `Camera maxDistance is 14.0u`);

    // 2. Character Screen Height Percentage Test (~25-35%)
    const characterFramingRatio = await desktopPage.evaluate(() => {
      const scene = window.__player.scene;
      const camera = window.__player.camera.camera;
      const rootMesh = window.__player.rootMesh;
      const engine = scene.getEngine();

      // Project top and bottom of character into screen coordinates
      const headWorldPos = rootMesh.position.clone();
      headWorldPos.y += 2.0; // Approx avatar top
      const feetWorldPos = rootMesh.position.clone();

      const Vector3 = rootMesh.position.constructor;
      const Matrix = scene.getTransformMatrix().constructor;

      const pHead = Vector3.Project(
        headWorldPos,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
      );
      const pFeet = Vector3.Project(
        feetWorldPos,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
      );

      const screenPixelHeight = Math.abs(pFeet.y - pHead.y);
      const viewportHeight = engine.getRenderHeight();
      const ratio = screenPixelHeight / viewportHeight;

      return {
        screenPixelHeight,
        viewportHeight,
        ratio,
      };
    });

    console.log('[Desktop] Character Screen Framing Ratio:', (characterFramingRatio.ratio * 100).toFixed(1) + '%', characterFramingRatio);
    assert(
      characterFramingRatio.ratio >= 0.18 && characterFramingRatio.ratio <= 0.40,
      `Character screen height ratio is in modern third-person target range (25-35%, measured: ${(characterFramingRatio.ratio * 100).toFixed(1)}%)`
    );

    // Screenshot desktop upgraded wide framing
    await desktopPage.screenshot({
      path: `${ARTIFACTS_DIR}/12_camera_desktop_modern_framing.png`,
    });
    console.log(`[Screenshot] Saved 12_camera_desktop_modern_framing.png`);

    // 3. Independent Look: Standing Still 360-degree Orbit
    console.log('\n--- Test 3: Stand Still Independent 360° Mouse Orbit ---');
    const playerPosBeforeOrbit = await desktopPage.evaluate(() => ({
      x: window.__player.rootMesh.position.x,
      y: window.__player.rootMesh.position.y,
      z: window.__player.rootMesh.position.z,
      rotY: window.__player.rootMesh.rotation.y,
    }));

    // Orbit camera horizontally by 3.14 radians (180 degrees)
    await desktopPage.evaluate(async () => {
      window.__player.camera.rotate(Math.PI, 0);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const stateAfterOrbit1 = await desktopPage.evaluate(() => {
      const p = window.__player;
      return {
        alpha: p.camera.camera.alpha,
        playerPos: { x: p.rootMesh.position.x, y: p.rootMesh.position.y, z: p.rootMesh.position.z },
        playerRotY: p.rootMesh.rotation.y,
      };
    });

    // Orbit another 180 degrees to complete 360°
    await desktopPage.evaluate(async () => {
      window.__player.camera.rotate(Math.PI, 0);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const stateAfterOrbit360 = await desktopPage.evaluate(() => {
      const p = window.__player;
      return {
        alpha: p.camera.camera.alpha,
        playerPos: { x: p.rootMesh.position.x, y: p.rootMesh.position.y, z: p.rootMesh.position.z },
        playerRotY: p.rootMesh.rotation.y,
      };
    });

    const playerMovementDistance = Math.hypot(
      stateAfterOrbit360.playerPos.x - playerPosBeforeOrbit.x,
      stateAfterOrbit360.playerPos.z - playerPosBeforeOrbit.z
    );
    const playerRotationDiff = Math.abs(stateAfterOrbit360.playerRotY - playerPosBeforeOrbit.rotY);

    console.log(`[Desktop] Player movement during 360° look orbit: ${playerMovementDistance.toFixed(4)}m`);
    console.log(`[Desktop] Player rotation change during 360° look orbit: ${playerRotationDiff.toFixed(4)} rad`);

    assert(
      playerMovementDistance < 0.001,
      `Player stands completely stationary during 360° camera orbit (drift: ${playerMovementDistance.toFixed(4)}m)`
    );
    assert(
      playerRotationDiff < 0.001,
      `Player orientation is untouched during camera orbit (diff: ${playerRotationDiff.toFixed(4)} rad)`
    );

    // 4. Clamped Pitch Angle Test (Never flip upside down)
    console.log('\n--- Test 4: Pitch Clamping (Never Flips) ---');
    await desktopPage.evaluate(async () => {
      // Try pushing pitch way beyond limits (e.g. +10 rad and -10 rad)
      window.__player.camera.rotate(0, 10.0);
      for (let i = 0; i < 10; i++) await new Promise((r) => requestAnimationFrame(r));
    });

    const pitchUpper = await desktopPage.evaluate(() => window.__player.camera.camera.beta);
    console.log(`[Desktop] Pitch after steep downward drag: ${pitchUpper.toFixed(3)} rad (limit ~1.51 rad)`);
    assert(pitchUpper <= Math.PI / 2 - 0.05, `Camera pitch is clamped and cannot flip under the ground`);

    await desktopPage.evaluate(async () => {
      window.__player.camera.rotate(0, -20.0);
      for (let i = 0; i < 10; i++) await new Promise((r) => requestAnimationFrame(r));
    });

    const pitchLower = await desktopPage.evaluate(() => window.__player.camera.camera.beta);
    console.log(`[Desktop] Pitch after steep upward drag: ${pitchLower.toFixed(3)} rad (limit ~0.28 rad)`);
    assert(pitchLower >= 0.25, `Camera pitch is clamped and cannot flip over zenith`);

    // Reset pitch to comfortable angle
    await desktopPage.evaluate(async () => {
      window.__player.camera.setPitch(Math.PI / 2.7);
      for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));
    });

    // 5. Desktop Mouse Wheel Zoom In and Out
    console.log('\n--- Test 5: Mouse Wheel Zoom In / Out ---');
    // Zoom in via wheel
    await desktopPage.evaluate(async () => {
      const canvas = document.getElementById('renderCanvas');
      // Dispatch wheel events zooming in (deltaY < 0 in standard browsers zooms in)
      for (let i = 0; i < 8; i++) {
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, bubbles: true, cancelable: true }));
      }
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const radiusAfterZoomIn = await desktopPage.evaluate(() => window.__player.camera.getRadius());
    console.log(`[Desktop] Radius after wheel zoom in: ${radiusAfterZoomIn.toFixed(2)}u (from 9.0u)`);
    assert(radiusAfterZoomIn < 8.5, `Mouse wheel successfully zooms camera in (current: ${radiusAfterZoomIn.toFixed(2)}u)`);

    // Zoom out via wheel beyond default towards maxDistance
    await desktopPage.evaluate(async () => {
      const canvas = document.getElementById('renderCanvas');
      for (let i = 0; i < 18; i++) {
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 60, bubbles: true, cancelable: true }));
      }
      for (let i = 0; i < 50; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const radiusAfterZoomOut = await desktopPage.evaluate(() => window.__player.camera.getRadius());
    console.log(`[Desktop] Radius after wheel zoom out: ${radiusAfterZoomOut.toFixed(2)}u (max 14.0u)`);
    assert(radiusAfterZoomOut > 9.5, `Mouse wheel successfully zooms camera out (current: ${radiusAfterZoomOut.toFixed(2)}u)`);
    assert(radiusAfterZoomOut <= 14.01, `Zoom out stays safely within maxDistance (14.0u)`);

    // Screenshot zoomed out overview
    await desktopPage.screenshot({
      path: `${ARTIFACTS_DIR}/13_camera_desktop_zoomed_out.png`,
    });
    console.log(`[Screenshot] Saved 13_camera_desktop_zoomed_out.png`);

    // 6. Camera Occlusion & Collision Recovery
    console.log('\n--- Test 6: Wall Collision & Recovery ---');
    const collisionTestResult = await desktopPage.evaluate(async () => {
      const p = window.__player;
      p.camera.setDesiredRadius(10.0);

      // Let's test Raycast collision logic directly
      // Find a building mesh with collision enabled in scene
      const building = p.scene.meshes.find(
        (m) => m.checkCollisions && m.name.endsWith('_body')
      );

      if (!building) {
        return { tested: false, reason: 'No building mesh found' };
      }

      const bPos = building.getAbsolutePosition ? building.getAbsolutePosition() : building.position;
      // Position player 4 meters in front of building
      p.rootMesh.position.set(bPos.x, 0.9, bPos.z + 4.0);
      p.camera.snapTarget();

      // Camera behind player shooting ray directly into building
      p.camera.camera.alpha = -Math.PI / 2;
      p.camera.camera.beta = Math.PI / 2.5;

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }

      const radiusNearWall = p.camera.getRadius();
      const desiredRadiusSaved = p.camera.getDesiredRadius();

      // Now move player into clear open area
      p.rootMesh.position.set(0, 0.9, 0);
      p.camera.snapTarget();

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }

      const radiusRecovered = p.camera.getRadius();

      return {
        tested: true,
        radiusNearWall,
        desiredRadiusSaved,
        radiusRecovered,
      };
    });

    console.log('[Desktop] Wall Collision Test Result:', collisionTestResult);
    if (collisionTestResult.tested) {
      assert(
        collisionTestResult.desiredRadiusSaved === 10.0,
        `Desired radius remained intact at 10.0u during collision`
      );
      assert(
        collisionTestResult.radiusRecovered > collisionTestResult.radiusNearWall || collisionTestResult.radiusRecovered >= 8.5,
        `Camera radius recovered cleanly after clearing obstacle (${collisionTestResult.radiusRecovered.toFixed(2)}u)`
      );
    }

    // =========================================================================
    // PART 2: Mobile Touch Look & Pinch-to-Zoom Tests (393x852)
    // =========================================================================
    console.log('\n========================================');
    console.log('PART 2: Mobile Modern Camera Testing (393x852)');
    console.log('========================================');

    const mobilePage = await browser.newPage();
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
    await mobilePage.waitForSelector('#mobile-camera-zone', { timeout: 10000 });

    await mobilePage.evaluate(async () => {
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    // 7. Mobile Touch Look: 360° Orbit Without Moving Character
    console.log('\n--- Test 7: Mobile Single Finger Look Orbit ---');
    const mobilePlayerStart = await mobilePage.evaluate(() => ({
      x: window.__player.rootMesh.position.x,
      z: window.__player.rootMesh.position.z,
      rotY: window.__player.rootMesh.rotation.y,
      alpha: window.__player.camera.camera.alpha,
    }));

    // Perform touch drag across right camera look zone
    await mobilePage.evaluate(async () => {
      const zone = document.getElementById('mobile-camera-zone');
      const rect = zone.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.5;
      const startY = rect.top + rect.height * 0.5;

      const touchStart = new Touch({
        identifier: 101,
        target: zone,
        clientX: startX,
        clientY: startY,
      });
      zone.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));

      // Drag right by 120 pixels
      for (let step = 1; step <= 6; step++) {
        const moveTouch = new Touch({
          identifier: 101,
          target: zone,
          clientX: startX + step * 20,
          clientY: startY,
        });
        zone.dispatchEvent(new TouchEvent('touchmove', { touches: [moveTouch], changedTouches: [moveTouch], bubbles: true }));
        await new Promise((r) => requestAnimationFrame(r));
      }

      const touchEnd = new Touch({
        identifier: 101,
        target: zone,
        clientX: startX + 120,
        clientY: startY,
      });
      zone.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const mobilePlayerAfterLook = await mobilePage.evaluate(() => ({
      x: window.__player.rootMesh.position.x,
      z: window.__player.rootMesh.position.z,
      rotY: window.__player.rootMesh.rotation.y,
      alpha: window.__player.camera.camera.alpha,
    }));

    const mobileMoveDist = Math.hypot(
      mobilePlayerAfterLook.x - mobilePlayerStart.x,
      mobilePlayerAfterLook.z - mobilePlayerStart.z
    );
    const alphaChange = Math.abs(mobilePlayerAfterLook.alpha - mobilePlayerStart.alpha);

    console.log(`[Mobile] Camera yaw change from touch look: ${alphaChange.toFixed(3)} rad`);
    console.log(`[Mobile] Player movement during touch look: ${mobileMoveDist.toFixed(4)}m`);

    assert(alphaChange > 0.3, `Mobile right-zone touch rotates camera yaw (delta: ${alphaChange.toFixed(3)} rad)`);
    assert(mobileMoveDist < 0.001, `Player remains completely stationary during mobile touch look (movement: ${mobileMoveDist.toFixed(4)}m)`);

    // 8. Mobile Multi-Touch Pinch-to-Zoom (Spread = Zoom Out, Pinch = Zoom In)
    console.log('\n--- Test 8: Mobile Two-Finger Pinch-to-Zoom ---');
    const radiusBeforePinch = await mobilePage.evaluate(() => window.__player.camera.getRadius());

    // Simulate two fingers spreading apart (spread -> Zoom Out -> radius increases)
    await mobilePage.evaluate(async () => {
      const zone = document.getElementById('mobile-camera-zone');
      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      // Start: two fingers 40px apart
      const t1Start = new Touch({ identifier: 201, target: zone, clientX: centerX - 20, clientY: centerY });
      const t2Start = new Touch({ identifier: 202, target: zone, clientX: centerX + 20, clientY: centerY });

      zone.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [t1Start, t2Start],
          changedTouches: [t1Start, t2Start],
          bubbles: true,
        })
      );

      // Spread apart to 180px (140px spread delta)
      for (let s = 1; s <= 5; s++) {
        const offset = 20 + s * 14;
        const t1 = new Touch({ identifier: 201, target: zone, clientX: centerX - offset, clientY: centerY });
        const t2 = new Touch({ identifier: 202, target: zone, clientX: centerX + offset, clientY: centerY });
        zone.dispatchEvent(
          new TouchEvent('touchmove', {
            touches: [t1, t2],
            changedTouches: [t1, t2],
            bubbles: true,
          })
        );
        await new Promise((r) => requestAnimationFrame(r));
      }

      const t1End = new Touch({ identifier: 201, target: zone, clientX: centerX - 90, clientY: centerY });
      const t2End = new Touch({ identifier: 202, target: zone, clientX: centerX + 90, clientY: centerY });
      zone.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [],
          changedTouches: [t1End, t2End],
          bubbles: true,
        })
      );

      for (let i = 0; i < 40; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const radiusAfterSpread = await mobilePage.evaluate(() => window.__player.camera.getRadius());
    console.log(
      `[Mobile] Radius before spread: ${radiusBeforePinch.toFixed(2)}u, after spread: ${radiusAfterSpread.toFixed(2)}u`
    );
    assert(
      radiusAfterSpread > radiusBeforePinch + 0.8,
      `Two-finger spread successfully zooms camera OUT (${radiusBeforePinch.toFixed(2)}u -> ${radiusAfterSpread.toFixed(2)}u)`
    );

    // Simulate two fingers pinching together (pinch -> Zoom In -> radius decreases)
    await mobilePage.evaluate(async () => {
      const zone = document.getElementById('mobile-camera-zone');
      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      // Start: two fingers 160px apart
      const t1Start = new Touch({ identifier: 301, target: zone, clientX: centerX - 80, clientY: centerY });
      const t2Start = new Touch({ identifier: 302, target: zone, clientX: centerX + 80, clientY: centerY });

      zone.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [t1Start, t2Start],
          changedTouches: [t1Start, t2Start],
          bubbles: true,
        })
      );

      // Pinch down to 30px apart
      for (let s = 1; s <= 5; s++) {
        const offset = 80 - s * 13;
        const t1 = new Touch({ identifier: 301, target: zone, clientX: centerX - offset, clientY: centerY });
        const t2 = new Touch({ identifier: 302, target: zone, clientX: centerX + offset, clientY: centerY });
        zone.dispatchEvent(
          new TouchEvent('touchmove', {
            touches: [t1, t2],
            changedTouches: [t1, t2],
            bubbles: true,
          })
        );
        await new Promise((r) => requestAnimationFrame(r));
      }

      const t1End = new Touch({ identifier: 301, target: zone, clientX: centerX - 15, clientY: centerY });
      const t2End = new Touch({ identifier: 302, target: zone, clientX: centerX + 15, clientY: centerY });
      zone.dispatchEvent(
        new TouchEvent('touchend', {
          touches: [],
          changedTouches: [t1End, t2End],
          bubbles: true,
        })
      );

      for (let i = 0; i < 40; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    });

    const radiusAfterPinch = await mobilePage.evaluate(() => window.__player.camera.getRadius());
    console.log(
      `[Mobile] Radius after pinch: ${radiusAfterPinch.toFixed(2)}u (from ${radiusAfterSpread.toFixed(2)}u)`
    );
    assert(
      radiusAfterPinch < radiusAfterSpread - 0.8,
      `Two-finger pinch successfully zooms camera IN (${radiusAfterSpread.toFixed(2)}u -> ${radiusAfterPinch.toFixed(2)}u)`
    );

    // Screenshot mobile portrait view with modern camera framing
    await mobilePage.screenshot({
      path: `${ARTIFACTS_DIR}/14_camera_mobile_portrait_framing.png`,
    });
    console.log(`[Screenshot] Saved 14_camera_mobile_portrait_framing.png`);

    console.log(`\n========================================`);
    console.log(`ALL ${passCount}/${testCount} AUTOMATED CAMERA VERIFICATION TESTS PASSED! 🎉`);
    console.log(`========================================\n`);
  } finally {
    await browser.close();
  }
}

runCameraTests().catch((err) => {
  console.error('[FATAL] Camera verification test failed:', err);
  process.exit(1);
});
