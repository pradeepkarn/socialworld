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
  GlowLayer,
} from '@babylonjs/core';

export class Environment {
  public scene: Scene;
  public sunLight: DirectionalLight;
  public ambientLight: HemisphericLight;
  public shadowGenerator: ShadowGenerator | null = null;
  public glowLayer: GlowLayer | null = null;
  public skyDome: AbstractMesh;

  constructor(scene: Scene) {
    this.scene = scene;

    // 1. Ambient Fill Light (sky / ground)
    this.ambientLight = new HemisphericLight('ambient_sky_light', new Vector3(0, 1, 0), this.scene);
    this.ambientLight.intensity = 0.65;
    this.ambientLight.diffuse = new Color3(0.85, 0.9, 1.0);
    this.ambientLight.groundColor = new Color3(0.2, 0.22, 0.26);

    // 2. Main Directional Sun Light
    this.sunLight = new DirectionalLight(
      'sun_light',
      new Vector3(-0.5, -0.85, -0.4).normalize(),
      this.scene
    );
    this.sunLight.position = new Vector3(50, 80, 40);
    this.sunLight.intensity = 1.35;
    this.sunLight.diffuse = new Color3(1.0, 0.96, 0.88);
    this.sunLight.specular = new Color3(0.9, 0.9, 0.9);

    // 3. Realistic Soft Shadows
    try {
      this.shadowGenerator = new ShadowGenerator(2048, this.sunLight);
      this.shadowGenerator.useBlurExponentialShadowMap = true;
      this.shadowGenerator.blurKernel = 32;
      this.shadowGenerator.setDarkness(0.35);
      this.shadowGenerator.transparencyShadow = true;
    } catch (e) {
      console.warn('[Environment] ShadowGenerator failed to initialize:', e);
    }

    // 4. Glow Layer for Cyberpunk Neon & Streetlights
    try {
      this.glowLayer = new GlowLayer('glow_layer', this.scene, {
        mainTextureRatio: 0.5,
        blurKernelSize: 24,
      });
      this.glowLayer.intensity = 0.55;
    } catch (e) {
      console.warn('[Environment] GlowLayer failed to initialize:', e);
    }

    // 5. Atmospheric Fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0012;
    this.scene.fogColor = new Color3(0.55, 0.65, 0.8);

    // 6. Sky Dome
    this.skyDome = this.createSkyDome();
  }

  private createSkyDome(): AbstractMesh {
    const dome = MeshBuilder.CreateSphere(
      'sky_dome',
      { diameter: 600, segments: 16, sideOrientation: 1 },
      this.scene
    );
    const mat = new StandardMaterial('sky_dome_mat', this.scene);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.fogEnabled = false; // Prevent scene fog from washing out the sky
    mat.emissiveColor = new Color3(0.25, 0.45, 0.75);
    dome.material = mat;
    dome.isPickable = false;
    dome.checkCollisions = false;
    return dome;
  }

  /**
   * Register a mesh to cast dynamic shadows.
   */
  public addShadowCaster(mesh: AbstractMesh): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(mesh, true);
    }
  }

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
