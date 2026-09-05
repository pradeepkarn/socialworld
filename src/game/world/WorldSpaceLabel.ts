import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  AbstractMesh,
  DynamicTexture,
  Camera,
} from '@babylonjs/core';

export interface WorldSpaceLabelOptions {
  text: string;
  parent?: AbstractMesh;
  offsetY?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  accentColorHex?: string;
  minScale?: number;
  maxScale?: number;
}

/**
 * =========================================================================
 * WorldSpaceLabel - Crisp, Non-Blooming 3D Billboard Text Label
 * =========================================================================
 * WHAT IT DOES:
 * - Renders crisp, readable text inside the 3D game world.
 * - Solves the glowing text problem:
 *   1. High-contrast dark badge pill background (88% opacity).
 *   2. Razor-sharp drop shadow under text for readability in any lighting.
 *   3. Excluded from scene Bloom/GlowLayer so it never blows out into white boxes.
 *   4. Distance scaling: Clamps between minScale and maxScale so text stays
 *      legible at 15-20 meters without becoming enormous up close.
 */
export class WorldSpaceLabel {
  public readonly mesh: AbstractMesh;
  private scene: Scene;
  private dynamicTexture: DynamicTexture;
  private material: StandardMaterial;
  private currentText: string;
  private accentHex: string;
  private fontSize: number;
  private minScale: number;
  private maxScale: number;

  constructor(scene: Scene, options: WorldSpaceLabelOptions) {
    this.scene = scene;
    this.currentText = options.text;
    this.accentHex = options.accentColorHex || '#38bdf8';
    this.fontSize = options.fontSize || 28;
    this.minScale = options.minScale ?? 0.75;
    this.maxScale = options.maxScale ?? 1.45;

    const width = options.width || 1.8;
    const height = options.height || 0.42;
    const offsetY = options.offsetY ?? 2.3;

    // 1. Create billboard plane
    this.mesh = MeshBuilder.CreatePlane(
      `ws_label_${Math.random().toString(36).substring(2, 7)}`,
      { width, height },
      this.scene
    );
    this.mesh.isPickable = false;
    this.mesh.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;
    this.mesh.position.y = offsetY;

    if (options.parent) {
      this.mesh.parent = options.parent;
    }

    // 2. High-res 512x128 Dynamic Texture for sharp vector-like text
    this.dynamicTexture = new DynamicTexture(
      `${this.mesh.name}_tex`,
      { width: 512, height: 128 },
      this.scene,
      false
    );
    this.dynamicTexture.hasAlpha = true;

    // 3. Crisp, non-blooming material
    this.material = new StandardMaterial(`${this.mesh.name}_mat`, this.scene);
    this.material.diffuseTexture = this.dynamicTexture;
    this.material.emissiveTexture = this.dynamicTexture;
    this.material.emissiveColor = new Color3(0.9, 0.9, 0.9);
    this.material.disableLighting = true; // Guarantees consistent readability in bright sun, sunset, or dark night
    this.material.useAlphaFromDiffuseTexture = true;
    this.material.backFaceCulling = false;
    this.material.maxSimultaneousLights = 0; // Does not consume WebGL uniform buffer lights

    this.mesh.material = this.material;

    // Render initial canvas graphics
    this.drawLabel();
  }

  /**
   * Redraws the badge pill and sharp typography.
   */
  private drawLabel(): void {
    const ctx = this.dynamicTexture.getContext() as unknown as CanvasRenderingContext2D;
    if (!ctx) return;

    ctx.clearRect(0, 0, 512, 128);

    // 1. Draw High-Contrast Rounded Badge Pill Background
    const pillX = 12;
    const pillY = 12;
    const pillW = 488;
    const pillH = 104;
    const radius = 24;

    ctx.beginPath();
    ctx.moveTo(pillX + radius, pillY);
    ctx.lineTo(pillX + pillW - radius, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + radius);
    ctx.lineTo(pillX + pillW, pillY + pillH - radius);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - radius, pillY + pillH);
    ctx.lineTo(pillX + radius, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - radius);
    ctx.lineTo(pillX, pillY + radius);
    ctx.quadraticCurveTo(pillX, pillY, pillX + radius, pillY);
    ctx.closePath();

    // Dark sleek pill fill with strong opacity (88%)
    ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
    ctx.fill();

    // Subtle crisp border
    ctx.strokeStyle = this.accentHex;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 2. Draw Sharp Typography with crisp drop shadow
    ctx.font = `bold ${this.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow for instant contrast separation against bright sky or shiny walls
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.currentText, 256, 64);

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    this.dynamicTexture.update();
  }

  /**
   * Updates text and optional accent color.
   */
  public setText(text: string, accentHex?: string): void {
    if (this.currentText !== text || (accentHex && this.accentHex !== accentHex)) {
      this.currentText = text;
      if (accentHex) this.accentHex = accentHex;
      this.drawLabel();
    }
  }

  /**
   * Distance-based scaling: called every frame with camera to prevent
   * text from becoming gigantic up-close or unreadable at distance.
   */
  public update(camera?: Camera): void {
    if (!camera) return;

    const dist = Vector3.Distance(camera.position, this.mesh.absolutePosition);
    // Baseline distance is ~6 meters
    const factor = dist * 0.14;
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, factor));

    this.mesh.scaling.set(clampedScale, clampedScale, clampedScale);
  }

  /**
   * Disposes of mesh, texture, and material cleanly.
   */
  public dispose(): void {
    if (this.dynamicTexture) {
      this.dynamicTexture.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    this.mesh.dispose(false, true);
  }
}
