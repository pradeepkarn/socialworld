import {
  Scene,
  SceneLoader,
  DynamicTexture,
  StandardMaterial,
  PBRMaterial,
  Color3,
  Texture,
  AbstractMesh,
  ISceneLoaderAsyncResult,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

/**
 * Handles asset loading, model caching, and procedural PBR texture generation.
 */
export class AssetManager {
  private scene: Scene;
  private materialCache: Map<string, PBRMaterial | StandardMaterial> = new Map();
  private textureCache: Map<string, Texture | DynamicTexture> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Load an external 3D model (GLB/GLTF/OBJ) asynchronously.
   */
  public async loadModel(
    rootUrl: string,
    sceneFilename: string
  ): Promise<ISceneLoaderAsyncResult | null> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', rootUrl, sceneFilename, this.scene);
      return result;
    } catch (error) {
      console.warn(`[AssetManager] Failed to load 3D model: ${rootUrl}${sceneFilename}`, error);
      return null;
    }
  }

  /**
   * Create or retrieve a procedural asphalt road PBR material with markings.
   */
  public getRoadMaterial(): PBRMaterial {
    const key = 'mat_road_pbr';
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.metallic = 0.05;
    mat.roughness = 0.85;
    mat.albedoColor = new Color3(0.12, 0.13, 0.15);

    // Create procedural road texture with yellow center stripes and white edge lanes
    const texture = new DynamicTexture('dt_road', { width: 512, height: 512 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      // Dark asphalt base with subtle noise
      ctx.fillStyle = '#1e2024';
      ctx.fillRect(0, 0, 512, 512);

      // Noise grain
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(25 + Math.random() * 20);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // White lane borders
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(20, 0, 8, 512);
      ctx.fillRect(512 - 28, 0, 8, 512);

      // Double yellow dashed divider in center
      ctx.fillStyle = '#f59e0b';
      for (let y = 0; y < 512; y += 48) {
        ctx.fillRect(250, y, 4, 30);
        ctx.fillRect(258, y, 4, 30);
      }

      texture.update();
    }

    texture.uScale = 1;
    texture.vScale = 8;
    mat.albedoTexture = texture;
    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Create or retrieve a concrete sidewalk tile PBR material.
   */
  public getSidewalkMaterial(): PBRMaterial {
    const key = 'mat_sidewalk_pbr';
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.metallic = 0.1;
    mat.roughness = 0.75;
    mat.albedoColor = new Color3(0.45, 0.47, 0.5);

    const texture = new DynamicTexture('dt_sidewalk', { width: 256, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      ctx.fillStyle = '#717882';
      ctx.fillRect(0, 0, 256, 256);

      // Tile grid lines
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 128, 128);
      ctx.strokeRect(128, 0, 128, 128);
      ctx.strokeRect(0, 128, 128, 128);
      ctx.strokeRect(128, 128, 128, 128);

      texture.update();
    }

    texture.uScale = 4;
    texture.vScale = 4;
    mat.albedoTexture = texture;
    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Create or retrieve a modern building glass/metal facade PBR material.
   */
  public getBuildingMaterial(baseColor: Color3, isGlass: boolean = false): PBRMaterial {
    const key = `mat_bld_${baseColor.toHexString()}_${isGlass}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.albedoColor = baseColor;
    mat.metallic = isGlass ? 0.9 : 0.4;
    mat.roughness = isGlass ? 0.15 : 0.55;

    // Window grid texture
    const texture = new DynamicTexture(`dt_bld_${key}`, { width: 256, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      ctx.fillStyle = baseColor.toHexString();
      ctx.fillRect(0, 0, 256, 256);

      // Draw reflective window panes
      for (let x = 16; x < 256; x += 48) {
        for (let y = 16; y < 256; y += 64) {
          ctx.fillStyle = isGlass ? '#38bdf8' : '#64748b';
          ctx.fillRect(x, y, 32, 48);
          // Highlight
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(x + 2, y + 2, 8, 8);
        }
      }
      texture.update();
    }

    texture.uScale = 2;
    texture.vScale = 4;
    mat.albedoTexture = texture;

    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Clean up all cached resources.
   */
  public dispose(): void {
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
    this.textureCache.forEach((tex) => tex.dispose());
    this.textureCache.clear();
  }
}
