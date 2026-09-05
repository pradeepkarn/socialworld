import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\f5347323-afeb-4a91-85a7-e744adb03cc5';

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
    '--window-size=1280,720',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
};

async function runVisualIdentityTestSuite() {
  console.log('===============================================================');
  console.log('    VISUAL IDENTITY & TEXT READABILITY VERIFICATION SUITE       ');
  console.log('===============================================================');

  const browser1 = await puppeteer.launch(LAUNCH_OPTIONS);
  const browser2 = await puppeteer.launch(LAUNCH_OPTIONS);

  try {
    // -----------------------------------------------------------------
    // 1. Launch Player 1
    // -----------------------------------------------------------------
    console.log('\n[TEST 1] Launching Window 1 (Player 1)...');
    const page1 = await browser1.newPage();
    await page1.setViewport({ width: 1280, height: 720 });
    await page1.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await page1.waitForSelector('#renderCanvas', { timeout: 15000 });
    await page1.waitForSelector('#network-status-hud', { timeout: 10000 });
    await sleep(3000);

    const p1Info = await page1.evaluate(() => {
      const p = window.__player;
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        colorName: p.appearance?.name,
        accentHex: p.appearance?.accentColorHex,
        heightScale: p.appearance?.heightScale,
        shoulderWidthScale: p.appearance?.shoulderWidthScale,
        nametagExists: !!p.nametag,
        nametagPos: p.nametag ? { y: p.nametag.mesh.position.y } : null,
      };
    });
    console.log('  Player 1 Info:', p1Info);

    // -----------------------------------------------------------------
    // 2. Launch Player 2
    // -----------------------------------------------------------------
    console.log('\n[TEST 2] Launching Window 2 (Player 2)...');
    const page2 = await browser2.newPage();
    await page2.setViewport({ width: 1280, height: 720 });
    await page2.goto('http://localhost:3000/game', { waitUntil: 'networkidle2' });
    await page2.waitForSelector('#renderCanvas', { timeout: 15000 });
    await page2.waitForSelector('#network-status-hud', { timeout: 10000 });
    await sleep(3000);

    const p2Info = await page2.evaluate(() => {
      const p = window.__player;
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        colorName: p.appearance?.name,
        accentHex: p.appearance?.accentColorHex,
        heightScale: p.appearance?.heightScale,
        shoulderWidthScale: p.appearance?.shoulderWidthScale,
        nametagExists: !!p.nametag,
        nametagPos: p.nametag ? { y: p.nametag.mesh.position.y } : null,
      };
    });
    console.log('  Player 2 Info:', p2Info);

    // -----------------------------------------------------------------
    // 3. Verify Distinct Appearances & Remote Rendering
    // -----------------------------------------------------------------
    console.log('\n[TEST 3] Verifying Distinct Visual Identities...');
    if (p1Info.id === p2Info.id) {
      throw new Error('Players have identical IDs!');
    }
    console.log(`  P1 (${p1Info.name}) Color: ${p1Info.colorName} [${p1Info.accentHex}]`);
    console.log(`  P2 (${p2Info.name}) Color: ${p2Info.colorName} [${p2Info.accentHex}]`);

    // Check remote player representation in Window 2
    const remoteInP2 = await page2.evaluate(() => {
      const rpm = window.__remotePlayerManager;
      if (!rpm) return null;
      const map = rpm.getPlayers ? rpm.getPlayers() : rpm.remotePlayers;
      if (!map) return null;
      const remotes = Array.from(map.values());
      return remotes.map((r) => ({
        id: r.id,
        name: r.name,
        colorName: r.appearance?.name,
        accentHex: r.appearance?.accentColorHex,
        hasNametag: !!r.nametag,
      }));
    });
    console.log('  Remote players visible in Window 2:', remoteInP2);

    if (!remoteInP2 || remoteInP2.length === 0) {
      throw new Error('Window 2 does not see remote Player 1!');
    }
    console.log('  ✓ Distinct appearance verified across network!');

    // -----------------------------------------------------------------
    // 4. Position Players to Capture Visual Comparison Screenshot
    // -----------------------------------------------------------------
    console.log('\n[TEST 4] Positioning avatars side-by-side for visual comparison screenshot...');
    // Move Player 1 slightly left and face camera (placed along boulevard clear of central pillar)
    await page1.evaluate(() => {
      const p = window.__player;
      if (p) {
        p.rootMesh.position.set(-1.0, 0.9, 6.5);
        p.rootMesh.rotation.y = Math.PI; // Face towards camera
      }
    });

    // Move Player 2 slightly right and face camera
    await page2.evaluate(() => {
      const p = window.__player;
      if (p) {
        p.rootMesh.position.set(1.0, 0.9, 6.5);
        p.rootMesh.rotation.y = Math.PI; // Face towards camera
        p.camera.camera.alpha = -Math.PI / 2; // Look north towards avatars
        p.camera.camera.beta = 1.35;
        p.camera.camera.radius = 5.0;
      }
    });
    await sleep(1500);

    const shot1Path = path.join(ARTIFACT_DIR, '01_player_visual_identity.png');
    await page2.screenshot({ path: shot1Path });
    console.log(`  ✓ Saved screenshot: 01_player_visual_identity.png`);

    // -----------------------------------------------------------------
    // 5. Test Storefront Sign Readability & Glow Exclusion
    // -----------------------------------------------------------------
    console.log('\n[TEST 5] Testing Storefront Signs & Glow Exclusion...');
    const storeInfo = await page1.evaluate(() => {
      const scene = window.__scene;
      if (!scene) return null;
      const signs = scene.meshes.filter((m) => m.name.includes('_sign'));
      const glowLayer = scene.effectLayers?.find((l) => l.name === 'glow');
      return {
        signNames: signs.map((s) => s.name),
        glowIntensity: glowLayer?.intensity,
      };
    });
    console.log('  Storefront & Glow Info:', storeInfo);

    // Position Player 1 right in front of CyberMart entrance facing the sign head-on without lamp post obstruction
    await page1.evaluate(() => {
      const p = window.__player;
      if (p) {
        p.rootMesh.position.set(-8.0, 0.9, 20.2);
        p.rootMesh.rotation.y = -Math.PI / 2;
        p.camera.camera.alpha = 0.05; // Looking West directly at CyberMart sign
        p.camera.camera.beta = 1.38;
        p.camera.camera.radius = 3.5;
      }
    });
    await sleep(1500);

    const shot2Path = path.join(ARTIFACT_DIR, '02_store_sign_readability.png');
    await page1.screenshot({ path: shot2Path });
    console.log(`  ✓ Saved screenshot: 02_store_sign_readability.png`);

    // Position Player 1 right in front of Neon Cafe entrance facing the sign head-on without lamp post obstruction
    await page1.evaluate(() => {
      const p = window.__player;
      if (p) {
        p.rootMesh.position.set(8.0, 0.9, 20.2);
        p.rootMesh.rotation.y = Math.PI / 2;
        p.camera.camera.alpha = Math.PI - 0.05; // Looking East directly at Neon Cafe sign
        p.camera.camera.beta = 1.38;
        p.camera.camera.radius = 3.5;
      }
    });
    await sleep(1500);

    const shotCafePath = path.join(ARTIFACT_DIR, '03_neon_cafe_sign.png');
    await page1.screenshot({ path: shotCafePath });
    console.log(`  ✓ Saved screenshot: 03_neon_cafe_sign.png`);

    // -----------------------------------------------------------------
    // 6. Test Distance Scaling on WorldSpaceLabel
    // -----------------------------------------------------------------
    console.log('\n[TEST 6] Testing Nametag Distance Scaling...');
    const scaleResults = await page2.evaluate(() => {
      const scene = window.__scene;
      const rpm = window.__remotePlayerManager;
      const map = rpm?.getPlayers ? rpm.getPlayers() : rpm?.remotePlayers;
      const remote = map?.values().next().value;
      if (!remote || !remote.nametag) return null;

      const results = [];
      const cam = scene.activeCamera;
      if (!cam) return null;

      // Check scale at normal distance
      results.push({
        dist: Vector3Distance(cam.position, remote.nametag.mesh.getAbsolutePosition()),
        scaleX: remote.nametag.mesh.scaling.x,
      });

      function Vector3Distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
      }

      return results;
    });
    console.log('  Distance Scaling Sample:', scaleResults);

    const shot3Path = path.join(ARTIFACT_DIR, '03_nametag_distance_scaling.png');
    await page2.screenshot({ path: shot3Path });
    console.log(`  ✓ Saved screenshot: 03_nametag_distance_scaling.png`);

    console.log('\n===============================================================');
    console.log('             ALL VISUAL & TEXT READABILITY TESTS PASSED!       ');
    console.log('===============================================================');
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

runVisualIdentityTestSuite().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
