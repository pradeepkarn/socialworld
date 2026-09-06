import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  AbstractMesh,
  Mesh,
  DynamicTexture,
  Camera,
  GlowLayer,
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
  isSelf?: boolean;
}

/**
 * =========================================================================
 * WorldSpaceLabel - Crisp, High-Visibility 3D Billboard Text Label
 * =========================================================================
 * WHAT IT DOES:
 * - Renders crisp, highly visible nametags above player characters.
 * - Solves the dark text / unlit material problem:
 *   1. Self-illuminated emissive material (`emissiveTexture = dynamicTexture` and
 *      `emissiveColor = Color3(1, 1, 1)` with `disableLighting = true`) so text is
 *      100% pure white regardless of scene ambient darkness.
 *   2. Excluded from scene `GlowLayer` so it never blooms or washes out into a blur.
 *   3. Bold, high-contrast typography (40px bold font) on a sleek dark pill badge
 *      with vibrant accent border.
 *   4. Distance-based scaling clamped between minScale (0.85) and maxScale (1.50)
 *      guaranteeing readability from both close-up and 25m distance.
 *   5. Local player self-identification: renders a distinct `◆ YOU` badge
 *      to immediately distinguish the user's avatar from remote network players.
 */
export class WorldSpaceLabel {
  public readonly mesh: Mesh;
  private scene: Scene;
  private dynamicTexture: DynamicTexture;
  private material: StandardMaterial;
  private currentText: string;
  private accentHex: string;
  private fontSize: number;
  private minScale: number;
  private maxScale: number;
  private isSelf: boolean;

  constructor(scene: Scene, options: WorldSpaceLabelOptions) {
    this.scene = scene;
    this.currentText = options.text;
    this.accentHex = options.accentColorHex || '#00e5ff';
    this.fontSize = options.fontSize || 34;
    this.minScale = options.minScale ?? 0.65;
    this.maxScale = options.maxScale ?? 1.15;
    this.isSelf = options.isSelf ?? false;

    const width = options.width || 1.40;
    const height = options.height || 0.34;
    const offsetY = options.offsetY ?? 2.25;

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

    // 3. Crisp, self-illuminated material
    // Note: emissiveTexture + emissiveColor(1,1,1) with disableLighting=true guarantees
    // the dynamic texture renders with 100% accurate colors without scene ambient darkening!
    this.material = new StandardMaterial(`${this.mesh.name}_mat`, this.scene);
    this.material.diffuseTexture = this.dynamicTexture;
    this.material.emissiveTexture = this.dynamicTexture;
    this.material.emissiveColor = new Color3(1, 1, 1);
    this.material.disableLighting = true;
    this.material.useAlphaFromDiffuseTexture = true;
    this.material.backFaceCulling = false;
    this.material.maxSimultaneousLights = 0;

    this.mesh.material = this.material;

    // 4. Exclude mesh from any scene GlowLayer to prevent bloom washout
    this.excludeFromSceneGlow();

    // Also observe new effect layers in case GlowLayer is created dynamically
    if (this.scene.onNewEffectLayerAddedObservable) {
      this.scene.onNewEffectLayerAddedObservable.add((layer) => {
        if (layer instanceof GlowLayer) {
          layer.addExcludedMesh(this.mesh);
        }
      });
    }

    // Render initial canvas graphics
    this.drawLabel();
  }

  /**
   * Excludes the nametag plane from GlowLayers in the scene.
   */
  public excludeFromSceneGlow(): void {
    if (this.scene.effectLayers) {
      for (const layer of this.scene.effectLayers) {
        if (layer instanceof GlowLayer) {
          layer.addExcludedMesh(this.mesh);
        }
      }
    }
  }

  /**
   * Redraws the badge pill and bold, high-contrast typography.
   */
  private drawLabel(): void {
    const ctx = this.dynamicTexture.getContext() as unknown as CanvasRenderingContext2D;
    if (!ctx) return;

    ctx.clearRect(0, 0, 512, 128);

    // 1. Draw Sleek, Compact Rounded Badge Pill Background
    const pillX = 16;
    const pillY = 28;
    const pillW = 480;
    const pillH = 72;
    const radius = 20;

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

    // Sleek dark badge background (92% opacity) for high contrast without visual clutter
    ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
    ctx.fill();

    // Clean, modern neon accent border
    ctx.strokeStyle = this.isSelf ? '#00f0ff' : (this.accentHex || '#00e5ff');
    ctx.lineWidth = this.isSelf ? 3.0 : 2.2;
    ctx.stroke();

    // 2. Measure and dynamically fit typography
    let fontSize = this.fontSize;
    const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

    if (this.isSelf) {
      const youTag = '◇ YOU';
      const sep = ' · ';
      const nameStr = this.currentText;

      ctx.font = `800 ${fontSize}px ${fontStack}`;
      let tagW = ctx.measureText(youTag).width;
      let sepW = ctx.measureText(sep).width;
      let nameW = ctx.measureText(nameStr).width;
      let totalW = tagW + sepW + nameW;

      while (totalW > pillW - 36 && fontSize > 18) {
        fontSize -= 2;
        ctx.font = `800 ${fontSize}px ${fontStack}`;
        tagW = ctx.measureText(youTag).width;
        sepW = ctx.measureText(sep).width;
        nameW = ctx.measureText(nameStr).width;
        totalW = tagW + sepW + nameW;
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      // Drop shadow behind text for razor-sharp legibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const startX = 256 - totalW / 2;

      // Draw ◇ YOU badge in vibrant neon cyan
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(youTag, startX, 64);

      // Draw subtle divider dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(sep, startX + tagW, 64);

      // Draw player name in crisp bright white
      ctx.fillStyle = '#ffffff';
      ctx.fillText(nameStr, startX + tagW + sepW, 64);
    } else {
      ctx.font = `800 ${fontSize}px ${fontStack}`;
      let textWidth = ctx.measureText(this.currentText).width;

      // If text is long, scale font size down to fit comfortably inside the pill
      while (textWidth > pillW - 48 && fontSize > 22) {
        fontSize -= 2;
        ctx.font = `800 ${fontSize}px ${fontStack}`;
        textWidth = ctx.measureText(this.currentText).width;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Dark drop shadow behind text for razor-sharp legibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      // Pure, bright, solid white text fill
      ctx.fillStyle = '#ffffff';
      ctx.fillText(this.currentText, 256, 64);
    }

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    this.dynamicTexture.update();
  }

  /**
   * Updates text, optional accent color, and self-identification state.
   */
  public setText(text: string, accentHex?: string, isSelf?: boolean): void {
    let changed = false;
    if (this.currentText !== text) {
      this.currentText = text;
      changed = true;
    }
    if (accentHex && this.accentHex !== accentHex) {
      this.accentHex = accentHex;
      changed = true;
    }
    if (isSelf !== undefined && this.isSelf !== isSelf) {
      this.isSelf = isSelf;
      changed = true;
    }
    if (changed) {
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
    // Baseline distance scaling tuned so nametag does not balloon at 9m
    const factor = dist * 0.10;
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
