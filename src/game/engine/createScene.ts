import { Scene, Engine, Vector3, Color4, Color3 } from '@babylonjs/core';

export interface SceneConfig {
  gravity?: Vector3;
  enableCollisions?: boolean;
}

/**
 * =========================================================================
 * createScene() - 3D World Stage Initializer
 * =========================================================================
 * WHAT IT DOES:
 * - Creates the Babylon.js `Scene` instance where all meshes, cameras, lights,
 *   and physics calculations live.
 *
 * KEY CONCEPTS:
 * - collisionsEnabled = true: Globally enables collision testing so meshes
 *   marked with `checkCollisions = true` physically block each other.
 * - gravity = Vector3(0, -9.81, 0): Standard real-world Earth gravity vector
 *   (9.81 m/s^2 downwards).
 * - clearColor: Dark cyber-space void background color displayed before
 *   the sky dome or buildings render.
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

  // Globally enforce max 4 simultaneous lights per material to avoid GL_MAX_VERTEX_UNIFORM_BUFFERS limit
  scene.onNewMaterialAddedObservable.add((mat) => {
    if ('maxSimultaneousLights' in mat) {
      (mat as { maxSimultaneousLights?: number }).maxSimultaneousLights = 4;
    }
  });

  return scene;
}
