import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Vector3,
  AbstractMesh,
  DynamicTexture,
} from '@babylonjs/core';
import { IBuildingDef } from './BuildingTypes';
import { AssetManager } from '../assets/AssetManager';
import { Environment } from '../world/Environment';

export class BuildingManager {
  private scene: Scene;
  private assetManager: AssetManager;
  private environment: Environment;
  private buildingMeshes: AbstractMesh[] = [];
  private nightLights: AbstractMesh[] = [];

  constructor(scene: Scene, assetManager: AssetManager, environment: Environment) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.environment = environment;
  }

  /**
   * =========================================================================
   * generateBuildings()
   * =========================================================================
   * Iterates over an array of building blueprints and constructs each one.
   */
  public generateBuildings(defs: IBuildingDef[]): void {
    defs.forEach((def) => {
      this.createBuilding(def);
    });
  }

  /**
   * =========================================================================
   * createBuilding() - The Building Construction Factory
   * =========================================================================
   * WHAT IT DOES:
   * - Takes one building blueprint (`IBuildingDef`) and procedurally builds:
   *   1. An invisible `root` anchor node (handles position and Y-rotation).
   *   2. Main tower body box (with windowed building material and collisions).
   *   3. Foundation pedestal trim (dark base border at the ground level).
   *   4. Rooftop equipment (HVAC vents, communication antenna, blinking light).
   *   5. Shop entrance facade (if `isShop === true`).
   *
   * KEY CONCEPTS:
   * - Invisible Root Node (`root`):
   *   Acts like a group folder. By parenting all parts (walls, foundation,
   *   signs, roof antenna) to `root`, we can rotate or move the whole building
   *   with one single command without having to compute trigonometry for every piece!
   * - Y Position of Boxes (`mainBody.position.y = height / 2`):
   *   In Babylon.js, `CreateBox` places the mesh origin in its geometric center.
   *   If a building is 20m tall, its center is at y = 0, so half sinks underground!
   *   Setting `position.y = height / 2` rests its bottom flat on the ground.
   */
  public createBuilding(def: IBuildingDef): AbstractMesh {
    const { id, position, width, depth, height, archetype, isShop, shopSignText } = def;

    // Root parent node for building assembly (group container)
    const root = MeshBuilder.CreateBox(`${id}_root`, { size: 0.1 }, this.scene);
    root.isVisible = false;
    root.position = position.clone();
    if (def.rotationY) {
      root.rotation.y = def.rotationY; // Rotates the entire building assembly
    }

    // 1. Main Structural Tower Box
    const mainBody = MeshBuilder.CreateBox(
      `${id}_body`,
      { width, depth, height },
      this.scene
    );
    mainBody.position.y = height / 2; // Elevate so bottom rests on ground at y = 0
    mainBody.checkCollisions = true;  // Player cannot walk through walls
    mainBody.parent = root;

    const baseColor = def.facadeColor || (isShop ? new Color3(0.2, 0.65, 0.75) : new Color3(0.82, 0.85, 0.9));
    mainBody.material = this.assetManager.getBuildingMaterial(baseColor, archetype === 'skyscraper');
    this.environment.addShadowCaster(mainBody);
    mainBody.receiveShadows = true;

    // 2. Base Pedestal / Foundation Trim (slightly wider than tower for architectural realism)
    const foundation = MeshBuilder.CreateBox(
      `${id}_foundation`,
      { width: width + 0.6, depth: depth + 0.6, height: 1.2 },
      this.scene
    );
    foundation.position.y = 0.6; // Half of 1.2m height rests it on the ground
    foundation.checkCollisions = true;
    foundation.parent = root;
    const foundMat = new PBRMaterial(`${id}_found_mat`, this.scene);
    foundMat.albedoColor = new Color3(0.42, 0.45, 0.48); // Warm modern architectural stone trim
    foundMat.roughness = 0.7;
    foundation.material = foundMat;

    // 3. Rooftop Equipment (for skyscrapers and towers taller than 25m)
    if (archetype === 'skyscraper' || height > 25) {
      this.createRooftopDetails(root, width, depth, height);
    }

    // 4. Shop Entrance & Neon Signage (for interactive shops)
    if (isShop) {
      this.createShopFront(root, width, depth, shopSignText || def.name, def.accentColor || new Color3(0.0, 0.8, 1.0));
    }

    this.buildingMeshes.push(mainBody, foundation);
    return root;
  }

  /**
   * =========================================================================
   * createRooftopDetails() - HVAC Units, Antenna & Warning Beacon
   * =========================================================================
   * WHAT IT DOES:
   * - Gives skyscrapers a realistic skyline silhouette:
   *   1. Air conditioning HVAC ventilation box on the roof.
   *   2. A tall communication antenna mast (8m cylinder).
   *   3. A glowing red aviation beacon sphere at the tip of the mast.
   */
  private createRooftopDetails(parent: AbstractMesh, width: number, depth: number, height: number): void {
    // 1. Rooftop Air Conditioning Unit
    const acUnit = MeshBuilder.CreateBox(
      `${parent.name}_ac`,
      { width: 3.5, depth: 3.5, height: 2 },
      this.scene
    );
    acUnit.position = new Vector3(width * 0.2, height + 1, depth * 0.2);
    acUnit.parent = parent;
    const acMat = new PBRMaterial(`${parent.name}_ac_mat`, this.scene);
    acMat.albedoColor = new Color3(0.3, 0.32, 0.35);
    acMat.metallic = 0.8;
    acUnit.material = acMat;

    // 2. Communications Antenna Mast
    const mast = MeshBuilder.CreateCylinder(
      `${parent.name}_mast`,
      { height: 8, diameterTop: 0.1, diameterBottom: 0.4 },
      this.scene
    );
    mast.position = new Vector3(-width * 0.25, height + 4, -depth * 0.25);
    mast.parent = parent;
    const mastMat = new PBRMaterial(`${parent.name}_mast_mat`, this.scene);
    mastMat.albedoColor = new Color3(0.8, 0.2, 0.2);
    mastMat.metallic = 0.9;
    mast.material = mastMat;

    // 3. Red Aviation Warning Beacon Light at mast tip
    const beacon = MeshBuilder.CreateSphere(`${parent.name}_beacon`, { diameter: 0.5 }, this.scene);
    beacon.position = new Vector3(-width * 0.25, height + 8, -depth * 0.25);
    beacon.parent = parent;
    const beaconMat = new StandardMaterial(`${parent.name}_beacon_mat`, this.scene);
    beaconMat.emissiveColor = new Color3(1, 0.1, 0.1); // Glowing red warning light
    beacon.material = beaconMat;
    this.nightLights.push(beacon);
  }

  /**
   * =========================================================================
   * createShopFront() - Storefront Entrance, Neon Sign & Holograms
   * =========================================================================
   * WHAT IT DOES:
   * - Turns a generic building block into an interactive shopping destination:
   *   1. Glass Doorway: Translucent tinted glass entrance.
   *   2. Canopy Awning: Metallic overhang above the door.
   *   3. Glowing Signboard: Dynamic HTML5 2D canvas rendered to a 3D plane.
   *   4. Floating Holographic Diamond: Spinning waypoint marker above entrance.
   *   5. Ground Hologram Ring: Cyber ring projected onto the floor.
   *
   * KEY CONCEPTS:
   * - DynamicTexture: Allows writing 2D text, drawing glowing borders, and
   *   rendering crisp vector-like graphics in real-time onto a 3D surface!
   * - sign.rotation.y = Math.PI (180 degrees):
   *   Rotates the plane so its front face faces outward toward approaching players,
   *   ensuring text is read normally from left to right.
   * - disableLighting = true on sign:
   *   Guarantees the neon letters always shine bright even during dark nights.
   */
  private createShopFront(
    parent: AbstractMesh,
    width: number,
    depth: number,
    signText: string,
    neonColor: Color3
  ): void {
    const frontZ = depth / 2 + 0.1;

    // Entrance Glass Doorway (Translucent)
    const glass = MeshBuilder.CreatePlane(`${parent.name}_glass`, { width: 5, height: 3.2 }, this.scene);
    glass.position = new Vector3(0, 1.6, frontZ + 0.05);
    glass.rotation.y = Math.PI;
    glass.parent = parent;
    const glassMat = new PBRMaterial(`${parent.name}_glass_mat`, this.scene);
    glassMat.albedoColor = new Color3(0.1, 0.3, 0.45);
    glassMat.alpha = 0.65;
    glassMat.metallic = 0.9;
    glassMat.roughness = 0.1;
    glass.material = glassMat;

    // Overhanging Canopy / Awning
    const awning = MeshBuilder.CreateBox(`${parent.name}_awning`, { width: 6.5, depth: 2.2, height: 0.3 }, this.scene);
    awning.position = new Vector3(0, 3.4, frontZ + 1.0);
    awning.parent = parent;
    const awningMat = new PBRMaterial(`${parent.name}_awning_mat`, this.scene);
    awningMat.albedoColor = new Color3(0.32, 0.36, 0.42);
    awning.material = awningMat;

    // Glowing Neon Shop Sign Backing Panel (prevents z-fighting and adds a sleek cyber mount)
    const signBacking = MeshBuilder.CreateBox(
      `${parent.name}_sign_back`,
      { width: 6.0, depth: 0.1, height: 1.4 },
      this.scene
    );
    signBacking.position = new Vector3(0, 4.35, frontZ + 0.08);
    signBacking.parent = parent;
    const signBackMat = new PBRMaterial(`${parent.name}_sign_back_mat`, this.scene);
    signBackMat.albedoColor = new Color3(0.04, 0.05, 0.08);
    signBackMat.metallic = 0.9;
    signBackMat.roughness = 0.3;
    signBacking.material = signBackMat;

    // Glowing Neon Shop Sign Face
    // Note: Plane rotation.y = Math.PI is required so the front face faces outward towards the street/player,
    // ensuring text is correctly oriented (left-to-right) instead of horizontally inverted (mirrored).
    const sign = MeshBuilder.CreatePlane(`${parent.name}_sign`, { width: 5.8, height: 1.3 }, this.scene);
    sign.position = new Vector3(0, 4.35, frontZ + 0.14);
    sign.rotation.y = Math.PI;
    sign.parent = parent;

    const signTexture = new DynamicTexture(
      `${parent.name}_dt_sign`,
      { width: 1024, height: 256 },
      this.scene,
      true
    );
    const ctx = signTexture.getContext() as unknown as CanvasRenderingContext2D;
    if (ctx) {
      // High-tech dark panel base
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, 1024, 256);

      const hexNeon = neonColor.toHexString();

      // Outer cyber accent border
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = hexNeon;
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, 996, 228);

      // Inner thin accent frame
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, 972, 204);

      // Corner accent brackets
      ctx.fillStyle = hexNeon;
      const cornerSize = 14;
      ctx.fillRect(14, 14, cornerSize, cornerSize);
      ctx.fillRect(1024 - 14 - cornerSize, 14, cornerSize, cornerSize);
      ctx.fillRect(14, 256 - 14 - cornerSize, cornerSize, cornerSize);
      ctx.fillRect(1024 - 14 - cornerSize, 256 - 14 - cornerSize, cornerSize, cornerSize);

      // Dynamic text sizing to ensure perfect visibility without clipping
      const upperText = signText.toUpperCase();
      let fontSize = 76;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      let textMetrics = ctx.measureText(upperText);
      while (textMetrics.width > 880 && fontSize > 36) {
        fontSize -= 4;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        textMetrics = ctx.measureText(upperText);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Sharp, readable text with dark drop shadow (NO excessive neon bloom halo)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;

      // Clean outline for contrast
      ctx.strokeStyle = hexNeon;
      ctx.lineWidth = 3;
      ctx.strokeText(upperText, 512, 128);

      // Crisp white fill
      ctx.fillStyle = '#ffffff';
      ctx.fillText(upperText, 512, 128);

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      signTexture.update();
    }

    const signMat = new StandardMaterial(`${parent.name}_sign_mat`, this.scene);
    signMat.emissiveTexture = signTexture;
    signMat.diffuseTexture = signTexture;
    signMat.diffuseColor = new Color3(1, 1, 1);
    signMat.emissiveColor = new Color3(0.85, 0.85, 0.85);
    signMat.disableLighting = true; // Guarantees consistent readability in all lighting conditions
    signMat.backFaceCulling = false;
    sign.material = signMat;

    // Exclude sign from GlowLayer to guarantee razor-sharp text readability without bloom blowout
    this.environment.addExcludedGlowMesh(sign);

    // Floating Hologram Waypoint Marker above Entrance
    const waypoint = MeshBuilder.CreatePolyhedron(
      `${parent.name}_waypoint`,
      { type: 1, size: 0.8 },
      this.scene
    );
    waypoint.position = new Vector3(0, 6.2, frontZ + 1.2);
    waypoint.parent = parent;
    const wpMat = new StandardMaterial(`${parent.name}_wp_mat`, this.scene);
    wpMat.emissiveColor = neonColor.scale(1.5);
    waypoint.material = wpMat;

    // Idle rotation for waypoint marker
    this.scene.onBeforeRenderObservable.add(() => {
      waypoint.rotation.y += 0.02;
    });

    // Ground Entrance Hologram Ring
    const holoRing = MeshBuilder.CreateTorus(
      `${parent.name}_holo_ring`,
      { diameter: 4.2, thickness: 0.1, tessellation: 32 },
      this.scene
    );
    holoRing.position = new Vector3(0, 0.08, frontZ + 1.6);
    holoRing.parent = parent;
    const holoMat = new StandardMaterial(`${parent.name}_holo_mat`, this.scene);
    holoMat.emissiveColor = neonColor;
    holoMat.alpha = 0.85;
    holoRing.material = holoMat;

    this.nightLights.push(sign, holoRing, waypoint);
  }

  public getMeshes(): AbstractMesh[] {
    return this.buildingMeshes;
  }

  public dispose(): void {
    this.buildingMeshes.forEach((m) => m.dispose());
    this.buildingMeshes = [];
    this.nightLights = [];
  }
}
