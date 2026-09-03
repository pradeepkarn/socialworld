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
   * Constructs all buildings in the city from specifications.
   */
  public generateBuildings(defs: IBuildingDef[]): void {
    defs.forEach((def) => {
      this.createBuilding(def);
    });
  }

  /**
   * Creates a single structured building with architectural details.
   */
  public createBuilding(def: IBuildingDef): AbstractMesh {
    const { id, position, width, depth, height, archetype, isShop, shopSignText } = def;

    // Root parent node for building assembly
    const root = MeshBuilder.CreateBox(`${id}_root`, { size: 0.1 }, this.scene);
    root.isVisible = false;
    root.position = position.clone();
    if (def.rotationY) {
      root.rotation.y = def.rotationY;
    }

    // 1. Main Structural Tower
    const mainBody = MeshBuilder.CreateBox(
      `${id}_body`,
      { width, depth, height },
      this.scene
    );
    mainBody.position.y = height / 2;
    mainBody.checkCollisions = true;
    mainBody.parent = root;

    const baseColor = def.facadeColor || (isShop ? new Color3(0.12, 0.15, 0.2) : new Color3(0.18, 0.22, 0.28));
    mainBody.material = this.assetManager.getBuildingMaterial(baseColor, archetype === 'skyscraper');
    this.environment.addShadowCaster(mainBody);
    mainBody.receiveShadows = true;

    // 2. Base Pedestal / Foundation Trim
    const foundation = MeshBuilder.CreateBox(
      `${id}_foundation`,
      { width: width + 0.6, depth: depth + 0.6, height: 1.2 },
      this.scene
    );
    foundation.position.y = 0.6;
    foundation.checkCollisions = true;
    foundation.parent = root;
    const foundMat = new PBRMaterial(`${id}_found_mat`, this.scene);
    foundMat.albedoColor = new Color3(0.08, 0.09, 0.1);
    foundMat.roughness = 0.9;
    foundation.material = foundMat;

    // 3. Rooftop Equipment (for skyscrapers and large commercial buildings)
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
   * Adds HVAC units, vents, and communications mast on building roofs.
   */
  private createRooftopDetails(parent: AbstractMesh, width: number, depth: number, height: number): void {
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

    // Antenna mast
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

    // Blinking beacon light at mast tip
    const beacon = MeshBuilder.CreateSphere(`${parent.name}_beacon`, { diameter: 0.5 }, this.scene);
    beacon.position = new Vector3(-width * 0.25, height + 8, -depth * 0.25);
    beacon.parent = parent;
    const beaconMat = new StandardMaterial(`${parent.name}_beacon_mat`, this.scene);
    beaconMat.emissiveColor = new Color3(1, 0.1, 0.1);
    beacon.material = beaconMat;
    this.nightLights.push(beacon);
  }

  /**
   * Creates storefront facade, glass entrance, awning, and illuminated neon signage.
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
    awningMat.albedoColor = new Color3(0.08, 0.08, 0.1);
    awning.material = awningMat;

    // Glowing Neon Shop Sign
    const sign = MeshBuilder.CreatePlane(`${parent.name}_sign`, { width: 5.5, height: 1.2 }, this.scene);
    sign.position = new Vector3(0, 4.3, frontZ + 0.1);
    sign.parent = parent;

    const signTexture = new DynamicTexture(`${parent.name}_dt_sign`, { width: 512, height: 128 }, this.scene, true);
    const ctx = signTexture.getContext() as unknown as CanvasRenderingContext2D;
    if (ctx) {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, 512, 128);

      // Border glow
      ctx.strokeStyle = neonColor.toHexString();
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, 496, 112);

      // Cyber Text
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = neonColor.toHexString();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(signText.toUpperCase(), 256, 64);
      signTexture.update();
    }

    const signMat = new StandardMaterial(`${parent.name}_sign_mat`, this.scene);
    signMat.emissiveTexture = signTexture;
    signMat.diffuseColor = new Color3(0, 0, 0);
    signMat.emissiveColor = neonColor.scale(1.3);
    signMat.backFaceCulling = false;
    sign.material = signMat;

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
