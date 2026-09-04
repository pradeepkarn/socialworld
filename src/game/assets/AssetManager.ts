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
 * =========================================================================
 * AssetManager - Procedural Materials, Textures & 3D Model Loader
 * =========================================================================
 * WHAT IT DOES:
 * - Serves as the "Art Department" and GPU Cache of the game.
 * - Instead of downloading heavy, slow-loading external image files (which can
 *   fail or lag over slow internet), it PROCEDURALLY PAINTS realistic materials
 *   using HTML5 2D Canvas in milliseconds!
 *
 * KEY CONCEPTS:
 * - Caching (`materialCache`): If 10 buildings need the same material, it creates
 *   it ONCE and shares it, saving hundreds of megabytes of GPU memory.
 * - Texture Tiling (`uScale`, `vScale`): Repeating a small 256x256 texture across
 *   a 200m road so it looks crisp without requiring a giant 8K image file!
 */
export class AssetManager {
  private scene: Scene;
  private materialCache: Map<string, PBRMaterial | StandardMaterial> = new Map();
  private textureCache: Map<string, Texture | DynamicTexture> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * =========================================================================
   * loadModel() - Async 3D Mesh Loader
   * =========================================================================
   * Loads external GLB, GLTF, or OBJ 3D character models and animations.
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
   * =========================================================================
   * getRoadMaterial() - Procedural Asphalt Highway
   * =========================================================================
   * HOW IT WORKS:
   * 1. Checks cache: if already built, returns immediately.
   * 2. Creates a 512x512 DynamicTexture canvas.
   * 3. Fills with dark asphalt `#1e2024`.
   * 4. Loops 4,000 times stamping randomized gray specks for realistic pebble grain.
   * 5. Paints white outer lane borders.
   * 6. Paints double yellow dashed lines down the center.
   * 7. Sets `vScale = 8` to tile this pattern seamlessly along the 220m road.
   */
  public getRoadMaterial(): PBRMaterial {
    const key = 'mat_road_pbr';
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.metallic = 0.05;
    mat.roughness = 0.8;
    mat.albedoColor = new Color3(0.22, 0.24, 0.28);

    // Create clean modern road texture with bright yellow center stripes and white edge lanes
    const texture = new DynamicTexture('dt_road', { width: 512, height: 512 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      // Clean modern boulevard grey asphalt
      ctx.fillStyle = '#2c313a';
      ctx.fillRect(0, 0, 512, 512);

      // Fine stone grain
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(40 + Math.random() * 25);
        ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }

      // Crisp white lane borders (left & right edges)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(18, 0, 10, 512);
      ctx.fillRect(512 - 28, 0, 10, 512);

      // Bright vibrant yellow dashed divider in center
      ctx.fillStyle = '#fbbf24';
      for (let y = 0; y < 512; y += 48) {
        ctx.fillRect(248, y, 5, 30);
        ctx.fillRect(258, y, 5, 30);
      }

      texture.update();
    }

    texture.uScale = 1;
    texture.vScale = 8; // Repeat 8 times along road length
    mat.albedoTexture = texture;
    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * =========================================================================
   * getSidewalkMaterial() - Warm Sunlit Paving Tiles
   * =========================================================================
   * Paints a 2x2 grid of bright limestone / sandstone paver slabs with mortar joints,
   * then tiles it 4x4 times across sidewalks.
   */
  public getSidewalkMaterial(): PBRMaterial {
    const key = 'mat_sidewalk_pbr';
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.metallic = 0.08;
    mat.roughness = 0.65;
    mat.albedoColor = new Color3(0.72, 0.75, 0.8);

    const texture = new DynamicTexture('dt_sidewalk', { width: 256, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      // Warm bright limestone paver base
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 256, 256);

      // Subtle paving texture variation
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(4, 4, 120, 120);
      ctx.fillRect(132, 132, 120, 120);

      // Clean grooved mortar joints
      ctx.strokeStyle = '#94a3b8';
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
   * =========================================================================
   * getBuildingMaterial() - Glass & Colorful Facades with Window Grids
   * =========================================================================
   * Paints glowing reflective sky-blue windows with sunny highlights onto
   * structural colorful skyscraper walls.
   */
  public getBuildingMaterial(baseColor: Color3, isGlass: boolean = false): PBRMaterial {
    const key = `mat_bld_${baseColor.toHexString()}_${isGlass}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.albedoColor = baseColor;
    mat.metallic = isGlass ? 0.85 : 0.3;
    mat.roughness = isGlass ? 0.15 : 0.5;

    // Window grid texture
    const texture = new DynamicTexture(`dt_bld_${key}`, { width: 256, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      // Base vibrant wall color
      ctx.fillStyle = baseColor.toHexString();
      ctx.fillRect(0, 0, 256, 256);

      // Draw rows and columns of reflective sky-blue window panes
      for (let x = 16; x < 256; x += 48) {
        for (let y = 16; y < 256; y += 64) {
          // Bright sky blue glass reflection
          ctx.fillStyle = isGlass ? '#38bdf8' : '#7dd3fc';
          ctx.fillRect(x, y, 32, 48);

          // Subtle sunbeam gradient / specular corner gleam
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 2, y + 2, 9, 9);

          // Golden warmth gleam on bottom edge
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(x + 22, y + 38, 8, 8);
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
   * =========================================================================
   * getTreeBarkMaterial() - Organic Wood Grain Bark
   * =========================================================================
   * Paints vertical tree bark furrows and natural wood texture.
   */
  public getTreeBarkMaterial(): PBRMaterial {
    const key = 'mat_tree_bark_natural';
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.roughness = 0.95;
    mat.metallic = 0.02;
    mat.albedoColor = new Color3(0.32, 0.22, 0.15);

    const texture = new DynamicTexture('dt_bark', { width: 256, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      ctx.fillStyle = '#3a2618';
      ctx.fillRect(0, 0, 256, 256);

      // Vertical bark furrows and wood grain
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const h = 10 + Math.random() * 40;
        const w = 1 + Math.random() * 3;
        const shade = Math.random() > 0.5 ? '#24170e' : '#4d3320';
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, w, h);
      }
      texture.update();
    }
    texture.uScale = 1;
    texture.vScale = 3;
    mat.albedoTexture = texture;
    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * getTreeFoliageMaterial() - Realistic Leaf Dappled Green Canopy
   */
  public getTreeFoliageMaterial(variant: 'forest' | 'lush' | 'bright' | 'flowering' = 'lush'): PBRMaterial {
    const key = `mat_foliage_${variant}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as PBRMaterial;
    }

    const mat = new PBRMaterial(key, this.scene);
    mat.roughness = 0.82;
    mat.metallic = 0.02;

    const baseHex = variant === 'forest' ? '#1b4d24' : variant === 'lush' ? '#236e2f' : variant === 'bright' ? '#2e8b3b' : '#2d6a4f';
    mat.albedoColor = Color3.FromHexString(baseHex);

    const texture = new DynamicTexture(`dt_foliage_${variant}`, { width: 256, height: 256 }, this.scene, true);
    const ctx = texture.getContext();
    if (ctx) {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 256, 256);

      // Procedural leaf dapples (thousands of varied green leaf dots and blossom patterns)
      const palette = variant === 'forest'
        ? ['#143d1a', '#1e5426', '#2d7a3a', '#3e9c4c']
        : variant === 'lush'
        ? ['#1b5e20', '#2e7d32', '#388e3c', '#4caf50', '#66bb6a']
        : variant === 'bright'
        ? ['#2e7d32', '#388e3c', '#4caf50', '#81c784', '#a5d6a7']
        : ['#2e7d32', '#4caf50', '#f472b6', '#fbcfe8', '#fda4af', '#f43f5e', '#ffffff'];

      for (let i = 0; i < 2500; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 1.5 + Math.random() * 3.5;
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      texture.update();
    }

    texture.uScale = 2;
    texture.vScale = 2;
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
