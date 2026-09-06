import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Pkarn\\.gemini\\antigravity-ide\\brain\\70205ea9-c6a7-486b-b3de-408572d99e2a';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function captureGeometricShapesShowcase() {
  console.log('Launching browser to capture geometric torso shapes showcase...');
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

    const shapes = await page.evaluate(() => {
      const rpm = window.__remotePlayerManager;
      const p = window.__player;
      if (!rpm || !p) return null;

      // Position player along the clear open central boulevard facing North
      p.rootMesh.position.set(0, 1.0, 16.5);
      p.camera.camera.alpha = -Math.PI / 2; // Look North
      p.camera.camera.beta = 1.34;
      p.camera.camera.radius = 6.2;

      const shapeConfigs = [
        { id: 'runner_shape_18', name: 'Cylinder Chassis' }, // cylinder (Narrow)
        { id: 'runner_shape_4',  name: 'Spherical Mech' },   // sphere (Short)
        { id: 'runner_shape_1',  name: 'Aero Capsule' },     // capsule (Aero Capsule)
        { id: 'runner_shape_11', name: 'Athletic Wedge' },   // wedge (Athletic)
        { id: 'runner_shape_77', name: 'Hex Carapace' },     // hexagonal (Hex Carapace)
        { id: 'runner_shape_3',  name: 'Box Runner' },       // box (Slim)
      ];

      const spawned = [];
      shapeConfigs.forEach((cfg, idx) => {
        const xPos = (idx - 2.5) * 1.55;
        const state = {
          id: cfg.id,
          name: cfg.name,
          position: { x: xPos, y: 1.0, z: 22.0 },
          rotation: Math.PI, // Facing South towards camera
          animationState: 'idle',
          timestamp: Date.now(),
        };
        const remote = rpm.spawnPlayer(state);
        if (remote) {
          spawned.push({
            id: remote.id,
            name: remote.name,
            torsoShape: remote.appearance?.torsoShape,
            bodyType: remote.appearance?.bodyTypeName,
          });
        }
      });
      return spawned;
    });

    console.log('Spawned geometric shapes lineup:', shapes);
    await sleep(2500);

    const shotPath = path.join(ARTIFACT_DIR, '05_geometric_body_shapes.png');
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);
  } finally {
    await browser.close();
  }
}

captureGeometricShapesShowcase().catch(console.error);
