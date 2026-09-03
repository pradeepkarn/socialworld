import { Scene, Engine, Vector3, Color4, Color3 } from '@babylonjs/core';

export interface SceneConfig {
  gravity?: Vector3;
  enableCollisions?: boolean;
}

/**
 * Initializes a new Babylon Scene configured with physics/collisions for open-world exploration.
 */
export function createScene(engine: Engine, config: SceneConfig = {}): Scene {
  const scene = new Scene(engine);

  // Enable world collisions for player movement and buildings
  if (config.enableCollisions !== false) {
    scene.collisionsEnabled = true;
    scene.gravity = config.gravity || new Vector3(0, -9.81, 0);
  }

  // Modern ambient base color
  scene.clearColor = new Color4(0.05, 0.07, 0.12, 1.0);
  scene.ambientColor = new Color3(0.2, 0.22, 0.28);

  // Optimize scene performance flags
  scene.autoClear = true;
  scene.autoClearDepthAndStencil = true;
  scene.blockMaterialDirtyMechanism = false;

  return scene;
}
