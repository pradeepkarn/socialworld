import {
  Scene,
  DirectionalLight,
  HemisphericLight,
  ShadowGenerator,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  AbstractMesh,
  Mesh,
  GlowLayer,
} from '@babylonjs/core';

/**
 * =========================================================================
 * Environment - Lighting, Sky, Fog, Shadows & Cyber Bloom
 * =========================================================================
 * WHAT IT DOES:
 * - Controls the visual mood and atmosphere of the entire 3D world:
 *   1. Ambient Sky Light (Hemispheric): Fills shadows with soft ambient light.
 *   2. Directional Sun: Simulates bright sunlight streaming from the sky.
 *   3. Dynamic Shadow Generator: Casts soft, realistic shadows on the streets.
 *   4. Post-Processing Glow Layer: Makes neon signs, lamps, and spires BLOOM.
 *   5. Exponential Fog: Gives the distant skyline depth and atmospheric haze.
 *   6. Sky Dome: A massive 600m celestial sphere surrounding the city.
 */
export class Environment {
  public scene: Scene;
  public sunLight: DirectionalLight;
  public ambientLight: HemisphericLight;
  public shadowGenerator: ShadowGenerator | null = null;
  public glowLayer: GlowLayer | null = null;
  public skyDome: AbstractMesh;

  constructor(scene: Scene) {
    this.scene = scene;

    // 1. Ambient Fill Light (simulates sky bounce down and lush green ground reflection up)
    this.ambientLight = new HemisphericLight('ambient_sky_light', new Vector3(0, 1, 0), this.scene);
    this.ambientLight.intensity = 0.75;
    this.ambientLight.diffuse = new Color3(0.9, 0.95, 1.0);       // Crisp clear daylight sky fill
    this.ambientLight.groundColor = new Color3(0.28, 0.45, 0.28); // Warm grass & earth reflection

    // 2. Main Directional Sun Light (parallel warm sunbeams from high above)
    this.sunLight = new DirectionalLight(
      'sun_light',
      new Vector3(-0.45, -0.85, -0.35).normalize(), // Sun shining diagonally downwards
      this.scene
    );
    this.sunLight.position = new Vector3(50, 90, 40);
    this.sunLight.intensity = 1.45;
    this.sunLight.diffuse = new Color3(1.0, 0.98, 0.92); // Warm sunny brilliance
    this.sunLight.specular = new Color3(0.95, 0.95, 0.9);

    // 3. Realistic Soft Shadows (2048x2048 depth texture)
    try {
      this.shadowGenerator = new ShadowGenerator(2048, this.sunLight);
      this.shadowGenerator.useBlurExponentialShadowMap = true; // Ultra-soft shadow penumbra
      this.shadowGenerator.blurKernel = 32;                   // Smooth blur radius
      this.shadowGenerator.setDarkness(0.3);                  // Soft transparent shadows
      this.shadowGenerator.transparencyShadow = true;
    } catch (e) {
      console.warn('[Environment] ShadowGenerator failed to initialize:', e);
    }

    // 4. Glow Layer for Neon Storefront Signs & Streetlights
    try {
      this.glowLayer = new GlowLayer('glow_layer', this.scene, {
        mainTextureRatio: 0.5,
        blurKernelSize: 24,
      });
      this.glowLayer.intensity = 0.22; // Tasteful, controlled bloom that never washes out text
    } catch (e) {
      console.warn('[Environment] GlowLayer failed to initialize:', e);
    }

    // 5. Atmospheric Fog (soft sunny horizon mist)
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0009; // Clear visibility across the colorful city
    this.scene.fogColor = new Color3(0.72, 0.82, 0.94);

    // 6. 600-Meter Celestial Sky Dome
    this.skyDome = this.createSkyDome();
  }

  /**
   * =========================================================================
   * createSkyDome() - The Horizon Enclosure
   * =========================================================================
   * WHAT IT DOES:
   * - Creates an immense 600m diameter sphere centered around the city.
   * - Sets `sideOrientation: 1` (BACKSIDE) so the inside surfaces face inward
   *   toward the player, creating an immersive sky dome.
   */
  private createSkyDome(): AbstractMesh {
    const dome = MeshBuilder.CreateSphere(
      'sky_dome',
      { diameter: 600, segments: 16, sideOrientation: 1 },
      this.scene
    );
    const mat = new StandardMaterial('sky_dome_mat', this.scene);
    mat.backFaceCulling = false;
    mat.disableLighting = true; // Ignores sun shadows; self-illuminated sky
    mat.fogEnabled = false;     // Prevent scene fog from washing out the sky
    mat.emissiveColor = new Color3(0.32, 0.62, 0.96); // Vibrant clear blue daytime sky
    dome.material = mat;
    dome.isPickable = false;
    dome.checkCollisions = false;
    return dome;
  }

  /**
   * Registers a 3D building or prop to cast real-time shadows onto the street.
   */
  public addShadowCaster(mesh: AbstractMesh): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(mesh, true);
    }
  }

  /**
   * Excludes a mesh (such as a text sign or nametag) from the GlowLayer to prevent bloom washout.
   */
  public addExcludedGlowMesh(mesh: Mesh): void {
    if (this.glowLayer) {
      this.glowLayer.addExcludedMesh(mesh);
    }
  }

  /**
   * Frees lights, shaders, and shadow maps from memory when destroying scene.
   */
  public dispose(): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
    }
    if (this.glowLayer) {
      this.glowLayer.dispose();
    }
    this.sunLight.dispose();
    this.ambientLight.dispose();
    this.skyDome.dispose();
  }
}
