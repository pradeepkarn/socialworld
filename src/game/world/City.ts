import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Vector3,
  AbstractMesh,
  InstancedMesh,
  PointLight,
} from '@babylonjs/core';
import { AssetManager } from '../assets/AssetManager';
import { Environment } from './Environment';
import { BuildingManager } from '../buildings/BuildingManager';
import { IBuildingDef } from '../buildings/BuildingTypes';

export class City {
  private scene: Scene;
  private assetManager: AssetManager;
  private environment: Environment;
  private buildingManager: BuildingManager;

  private cityMeshes: AbstractMesh[] = [];
  private streetLights: PointLight[] = [];
  private streetLightBulbs: AbstractMesh[] = [];

  constructor(scene: Scene, assetManager: AssetManager, environment: Environment) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.environment = environment;
    this.buildingManager = new BuildingManager(scene, assetManager, environment);
  }

  /**
   * Generates the entire city environment.
   */
  public generate(): void {
    this.createGround();
    this.createRoadNetwork();
    this.createSidewalks();
    this.createCentralPlaza();
    this.generateCityBuildings();
    this.createStreetFurnitureAndLights();
    this.createTreesAndFoliage();
  }

  /**
   * 1. Ground District Slab
   */
  private createGround(): void {
    const ground = MeshBuilder.CreateGround(
      'city_ground',
      { width: 260, height: 260, subdivisions: 2 },
      this.scene
    );
    ground.position.y = 0;
    ground.checkCollisions = true;
    ground.receiveShadows = true;

    const groundMat = new PBRMaterial('mat_city_ground', this.scene);
    groundMat.albedoColor = new Color3(0.1, 0.11, 0.13);
    groundMat.roughness = 0.9;
    groundMat.metallic = 0.05;
    ground.material = groundMat;

    this.cityMeshes.push(ground);
  }

  /**
   * 2. Road Network (East-West & North-South Boulevards)
   */
  private createRoadNetwork(): void {
    const roadMat = this.assetManager.getRoadMaterial();

    // North-South Main Boulevard
    const nsRoad = MeshBuilder.CreateGround(
      'road_ns',
      { width: 14, height: 220 },
      this.scene
    );
    nsRoad.position = new Vector3(0, 0.02, 0);
    nsRoad.checkCollisions = true;
    nsRoad.receiveShadows = true;
    nsRoad.material = roadMat;

    // East-West Main Boulevard
    const ewRoad = MeshBuilder.CreateGround(
      'road_ew',
      { width: 220, height: 14 },
      this.scene
    );
    ewRoad.position = new Vector3(0, 0.025, 0);
    ewRoad.checkCollisions = true;
    ewRoad.receiveShadows = true;
    ewRoad.material = roadMat;

    this.cityMeshes.push(nsRoad, ewRoad);
  }

  /**
   * 3. Sidewalks & Elevated Curbs
   */
  private createSidewalks(): void {
    const sidewalkMat = this.assetManager.getSidewalkMaterial();

    const sidewalkConfigs = [
      // Along NS road: West side
      { width: 4, depth: 220, x: -9, z: 0 },
      // Along NS road: East side
      { width: 4, depth: 220, x: 9, z: 0 },
      // Along EW road: North side
      { width: 220, depth: 4, x: 0, z: 9 },
      // Along EW road: South side
      { width: 220, depth: 4, x: 0, z: -9 },
    ];

    sidewalkConfigs.forEach((cfg, idx) => {
      const sw = MeshBuilder.CreateBox(
        `sidewalk_${idx}`,
        { width: cfg.width, depth: cfg.depth, height: 0.25 },
        this.scene
      );
      sw.position = new Vector3(cfg.x, 0.125, cfg.z);
      sw.checkCollisions = true;
      sw.receiveShadows = true;
      sw.material = sidewalkMat;
      this.cityMeshes.push(sw);
    });
  }

  /**
   * 4. Central Plaza / Spawn Area
   */
  private createCentralPlaza(): void {
    const plaza = MeshBuilder.CreateCylinder(
      'central_plaza_slab',
      { height: 0.35, diameter: 22, tessellation: 32 },
      this.scene
    );
    plaza.position = new Vector3(0, 0.175, 0);
    plaza.checkCollisions = true;
    plaza.receiveShadows = true;

    const plazaMat = new PBRMaterial('mat_plaza', this.scene);
    plazaMat.albedoColor = new Color3(0.18, 0.2, 0.25);
    plazaMat.roughness = 0.5;
    plazaMat.metallic = 0.3;
    plaza.material = plazaMat;

    // Center Holographic Monument / Obelisk
    const monument = MeshBuilder.CreateCylinder(
      'plaza_monument',
      { height: 7, diameterTop: 0.4, diameterBottom: 1.6, tessellation: 8 },
      this.scene
    );
    monument.position = new Vector3(0, 3.8, 0);
    monument.checkCollisions = true;
    const monMat = new PBRMaterial('mat_monument', this.scene);
    monMat.albedoColor = new Color3(0.1, 0.12, 0.18);
    monMat.metallic = 0.9;
    monMat.roughness = 0.15;
    monument.material = monMat;
    this.environment.addShadowCaster(monument);

    // Ground cyber ring around monument base
    const groundRing = MeshBuilder.CreateTorus('monument_base_ring', { diameter: 3.6, thickness: 0.06 }, this.scene);
    groundRing.position = new Vector3(0, 0.36, 0);
    const ringMat = new StandardMaterial('mat_holo_ring', this.scene);
    ringMat.emissiveColor = new Color3(0.0, 0.85, 1.0);
    groundRing.material = ringMat;

    // Glowing spire pinnacle beacon at monument tip
    const beacon = MeshBuilder.CreateSphere('monument_beacon', { diameter: 0.8 }, this.scene);
    beacon.position = new Vector3(0, 7.5, 0);
    beacon.material = ringMat;

    this.cityMeshes.push(plaza, monument, groundRing, beacon);
  }

  /**
   * 5. City Buildings & Interactive Shops
   */
  private generateCityBuildings(): void {
    const buildings: IBuildingDef[] = [
      // --- INTERACTIVE SHOPS (Facing Main Central Avenue) ---
      {
        id: 'shop_cybermart',
        name: 'CyberMart Tech & Gear',
        archetype: 'shop',
        position: new Vector3(-16, 0, 20),
        width: 14,
        depth: 10,
        height: 12,
        rotationY: Math.PI / 2, // Facing East directly towards main avenue sidewalk
        facadeColor: new Color3(0.12, 0.16, 0.22),
        accentColor: new Color3(0.0, 0.85, 1.0),
        isShop: true,
        shopId: 'cybermart',
        shopSignText: 'CyberMart',
      },
      {
        id: 'shop_neoncafe',
        name: 'Neon Cafe & Lounge',
        archetype: 'shop',
        position: new Vector3(16, 0, 20),
        width: 14,
        depth: 10,
        height: 12,
        rotationY: -Math.PI / 2, // Facing West directly towards main avenue sidewalk
        facadeColor: new Color3(0.18, 0.12, 0.18),
        accentColor: new Color3(1.0, 0.2, 0.6),
        isShop: true,
        shopId: 'neoncafe',
        shopSignText: 'Neon Cafe',
      },

      // --- NORTH DISTRICT TOWERS ---
      {
        id: 'tower_quantum',
        name: 'Quantum Corp Tower',
        archetype: 'skyscraper',
        position: new Vector3(-24, 0, 52),
        width: 20,
        depth: 20,
        height: 52,
        facadeColor: new Color3(0.14, 0.18, 0.26),
      },
      {
        id: 'tower_nexus',
        name: 'Nexus Pinnacle',
        archetype: 'skyscraper',
        position: new Vector3(24, 0, 52),
        width: 22,
        depth: 18,
        height: 58,
        facadeColor: new Color3(0.18, 0.22, 0.28),
      },

      // --- SOUTH DISTRICT BUILDINGS ---
      {
        id: 'bld_synergy',
        name: 'Synergy Labs',
        archetype: 'commercial',
        position: new Vector3(-22, 0, -26),
        width: 16,
        depth: 16,
        height: 24,
        facadeColor: new Color3(0.2, 0.24, 0.28),
      },
      {
        id: 'bld_arcade',
        name: 'Holo Arcade & VR',
        archetype: 'commercial',
        position: new Vector3(22, 0, -26),
        width: 16,
        depth: 16,
        height: 22,
        facadeColor: new Color3(0.22, 0.18, 0.24),
      },
      {
        id: 'tower_vertex',
        name: 'Vertex Financial Center',
        archetype: 'skyscraper',
        position: new Vector3(0, 0, -56),
        width: 26,
        depth: 22,
        height: 64,
        facadeColor: new Color3(0.12, 0.15, 0.2),
      },

      // --- EAST & WEST DISTRICT TOWERS ---
      {
        id: 'tower_helios',
        name: 'Helios Heights',
        archetype: 'skyscraper',
        position: new Vector3(-55, 0, 0),
        width: 22,
        depth: 22,
        height: 48,
        facadeColor: new Color3(0.16, 0.2, 0.25),
      },
      {
        id: 'tower_aurora',
        name: 'Aurora Spire',
        archetype: 'skyscraper',
        position: new Vector3(55, 0, 0),
        width: 20,
        depth: 24,
        height: 50,
        facadeColor: new Color3(0.18, 0.2, 0.28),
      },
    ];

    this.buildingManager.generateBuildings(buildings);
  }

  /**
   * 6. Modern Curved LED Street Lamps (Instanced)
   */
  private createStreetFurnitureAndLights(): void {
    // Build Master Lamp Post
    const masterLamp = MeshBuilder.CreateCylinder(
      'master_lamp_pole',
      { height: 6.5, diameterTop: 0.12, diameterBottom: 0.22 },
      this.scene
    );
    masterLamp.position = new Vector3(0, -50, 0); // Hide master template below ground
    const poleMat = new PBRMaterial('mat_lamp_pole', this.scene);
    poleMat.albedoColor = new Color3(0.15, 0.17, 0.2);
    poleMat.metallic = 0.85;
    masterLamp.material = poleMat;

    // Master Lamp Arm & Head
    const masterHead = MeshBuilder.CreateBox(
      'master_lamp_head',
      { width: 0.35, depth: 1.2, height: 0.2 },
      this.scene
    );
    masterHead.position = new Vector3(0, -50 + 3.25, 0.5);
    masterHead.parent = masterLamp;

    // Master Glowing Bulb
    const masterBulb = MeshBuilder.CreatePlane(
      'master_lamp_bulb',
      { width: 0.3, height: 0.9 },
      this.scene
    );
    masterBulb.rotation.x = Math.PI / 2;
    masterBulb.position = new Vector3(0, -50 + 3.14, 0.5);
    masterBulb.parent = masterLamp;
    const bulbMat = new StandardMaterial('mat_lamp_bulb', this.scene);
    bulbMat.emissiveColor = new Color3(1.0, 0.9, 0.7);
    masterBulb.material = bulbMat;

    // Lamp Coordinates along Main Streets
    const lampPositions = [
      // Along North-South Boulevard (West curb)
      new Vector3(-8.5, 0.2, 16),
      new Vector3(-8.5, 0.2, 34),
      new Vector3(-8.5, 0.2, -16),
      new Vector3(-8.5, 0.2, -34),
      // Along North-South Boulevard (East curb)
      new Vector3(8.5, 0.2, 16),
      new Vector3(8.5, 0.2, 34),
      new Vector3(8.5, 0.2, -16),
      new Vector3(8.5, 0.2, -34),
      // Along East-West Boulevard (North curb)
      new Vector3(-24, 0.2, 8.5),
      new Vector3(-42, 0.2, 8.5),
      new Vector3(24, 0.2, 8.5),
      new Vector3(42, 0.2, 8.5),
      // Along East-West Boulevard (South curb)
      new Vector3(-24, 0.2, -8.5),
      new Vector3(-42, 0.2, -8.5),
      new Vector3(24, 0.2, -8.5),
      new Vector3(42, 0.2, -8.5),
    ];

    lampPositions.forEach((pos, idx) => {
      const lampInstance = masterLamp.createInstance(`lamp_${idx}`);
      lampInstance.position = new Vector3(pos.x, 3.25, pos.z);
      lampInstance.checkCollisions = true;

      // Realistic warm point light for street illumination
      const pointLight = new PointLight(`lamp_light_${idx}`, new Vector3(pos.x, 5.8, pos.z), this.scene);
      pointLight.diffuse = new Color3(1.0, 0.88, 0.65);
      pointLight.specular = new Color3(0.8, 0.7, 0.5);
      pointLight.intensity = 0.85;
      pointLight.range = 16;

      this.streetLights.push(pointLight);
      this.cityMeshes.push(lampInstance);
    });

    // Modern Sidewalk Benches
    this.createBenches();
  }

  private createBenches(): void {
    const benchMat = new PBRMaterial('mat_bench', this.scene);
    benchMat.albedoColor = new Color3(0.25, 0.18, 0.12); // Teak wood finish
    benchMat.roughness = 0.6;

    const benchPositions = [
      new Vector3(-9.2, 0.35, 10),
      new Vector3(9.2, 0.35, 10),
      new Vector3(-9.2, 0.35, -10),
      new Vector3(9.2, 0.35, -10),
    ];

    benchPositions.forEach((pos, idx) => {
      const bench = MeshBuilder.CreateBox(`bench_${idx}`, { width: 1.8, depth: 0.6, height: 0.45 }, this.scene);
      bench.position = pos;
      bench.checkCollisions = true;
      bench.material = benchMat;
      this.cityMeshes.push(bench);
    });
  }

  /**
   * 7. Stylized Trees and Foliage (Instanced)
   */
  private createTreesAndFoliage(): void {
    // Master Trunk
    const masterTrunk = MeshBuilder.CreateCylinder(
      'master_tree_trunk',
      { height: 3.5, diameterTop: 0.35, diameterBottom: 0.55 },
      this.scene
    );
    masterTrunk.position = new Vector3(0, -50, 0);
    const trunkMat = new PBRMaterial('mat_tree_trunk', this.scene);
    trunkMat.albedoColor = new Color3(0.22, 0.16, 0.12);
    trunkMat.roughness = 0.9;
    masterTrunk.material = trunkMat;

    // Master Foliage (Layered Stylized Spheres)
    const masterFoliage = MeshBuilder.CreateSphere(
      'master_tree_foliage',
      { diameter: 3.4, segments: 10 },
      this.scene
    );
    masterFoliage.position = new Vector3(0, -50 + 3.0, 0);
    masterFoliage.parent = masterTrunk;
    const foliageMat = new PBRMaterial('mat_tree_foliage', this.scene);
    foliageMat.albedoColor = new Color3(0.12, 0.45, 0.22);
    foliageMat.roughness = 0.75;
    masterFoliage.material = foliageMat;

    // Planter Box Positions along Avenues
    const treePositions = [
      new Vector3(-9.5, 0.2, 24),
      new Vector3(-9.5, 0.2, 42),
      new Vector3(-9.5, 0.2, -24),
      new Vector3(-9.5, 0.2, -42),
      new Vector3(9.5, 0.2, 24),
      new Vector3(9.5, 0.2, 42),
      new Vector3(9.5, 0.2, -24),
      new Vector3(9.5, 0.2, -42),
    ];

    treePositions.forEach((pos, idx) => {
      // Concrete planter box
      const planter = MeshBuilder.CreateBox(`planter_${idx}`, { width: 1.6, depth: 1.6, height: 0.5 }, this.scene);
      planter.position = new Vector3(pos.x, 0.35, pos.z);
      planter.checkCollisions = true;
      planter.material = this.assetManager.getSidewalkMaterial();

      // Tree instance
      const treeInstance = masterTrunk.createInstance(`tree_${idx}`);
      treeInstance.position = new Vector3(pos.x, 2.0, pos.z);
      treeInstance.checkCollisions = true;

      this.cityMeshes.push(planter, treeInstance);
    });
  }

  /**
   * Adjust streetlights when time of day changes.
   */
  public setNightMode(isNight: boolean): void {
    const intensity = isNight ? 1.4 : 0.15;
    this.streetLights.forEach((light) => {
      light.intensity = intensity;
    });
  }

  public getMeshes(): AbstractMesh[] {
    return this.cityMeshes;
  }

  public dispose(): void {
    this.cityMeshes.forEach((m) => m.dispose());
    this.cityMeshes = [];
    this.streetLights.forEach((l) => l.dispose());
    this.streetLights = [];
    this.buildingManager.dispose();
  }
}
