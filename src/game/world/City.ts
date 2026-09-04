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
import { TreePlacementManager, IPlacementZone, IPlacedTree } from './TreePlacementManager';

export class City {
  private scene: Scene;
  private assetManager: AssetManager;
  private environment: Environment;
  private buildingManager: BuildingManager;
  private treePlacementManager: TreePlacementManager;

  private cityMeshes: AbstractMesh[] = [];
  private streetLights: PointLight[] = [];
  private streetLightBulbs: AbstractMesh[] = [];
  private buildingDefs: IBuildingDef[] = [];

  constructor(scene: Scene, assetManager: AssetManager, environment: Environment) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.environment = environment;
    this.buildingManager = new BuildingManager(scene, assetManager, environment);
    this.treePlacementManager = new TreePlacementManager();
  }

  /**
   * =========================================================================
   * MASTER FUNCTION: generate()
   * =========================================================================
   * This is the "boss" function that orchestrates the entire city build.
   * When the game starts, it calls each helper function one after another
   * in a logical layer-by-layer order (from the floor up to the sky):
   *
   *   1. Base Ground (foundation plate)
   *   2. Roads (asphalt cross streets)
   *   3. Sidewalks (elevated curbs for pedestrians)
   *   4. Central Plaza (spawn area with monument)
   *   5. Buildings & Shops (skyscrapers and interactive stores)
   *   6. Street Lamps & Benches (lights and furniture)
   *   7. Trees & Greenery (planters and foliage)
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
   * =========================================================================
   * 1. createGround() - The Foundation Slab
   * =========================================================================
   * WHAT IT DOES:
   * - Creates a huge flat 260m x 260m square ground mesh at y = 0.
   *
   * KEY CONCEPTS:
   * - checkCollisions = true: Gives the floor solid physics so the player's
   *   feet walk on top of it instead of falling into endless empty void.
   * - receiveShadows = true: Allows buildings and trees to cast dark shadows
   *   onto the floor for realism.
   * - PBRMaterial: "Physically Based Rendering" material. It reacts to light
   *   like real dark asphalt concrete (high roughness, very low metallic shine).
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
    groundMat.albedoColor = new Color3(0.24, 0.54, 0.28); // Vibrant, lush park lawn green
    groundMat.roughness = 0.85;                           // Soft natural matte grass
    groundMat.metallic = 0.02;                            // Non-metallic organic earth
    ground.material = groundMat;

    this.cityMeshes.push(ground);
  }

  /**
   * =========================================================================
   * 2. createRoadNetwork() - Boulevards (Streets)
   * =========================================================================
   * WHAT IT DOES:
   * - Creates two intersecting wide avenues:
   *   1. North-South (Z-axis) road: 14 meters wide, 220 meters long.
   *   2. East-West (X-axis) road: 220 meters long, 14 meters wide.
   *
   * KEY CONCEPTS:
   * - Why y = 0.02 and y = 0.025 instead of 0?
   *   In 3D graphics, if two flat meshes share the exact same height (y = 0),
   *   their pixels fight over which one to show. This glitch is called "Z-fighting"
   *   (flickering). By lifting the roads by just 2 centimeters (0.02m), the road
   *   cleanly sits right on top of the ground with zero flickering.
   */
  private createRoadNetwork(): void {
    const roadMat = this.assetManager.getRoadMaterial();

    // North-South Main Boulevard (length along Z axis)
    const nsRoad = MeshBuilder.CreateGround(
      'road_ns',
      { width: 14, height: 220 },
      this.scene
    );
    nsRoad.position = new Vector3(0, 0.02, 0); // Raised 2cm above base ground
    nsRoad.checkCollisions = true;
    nsRoad.receiveShadows = true;
    nsRoad.material = roadMat;

    // East-West Main Boulevard (length along X axis)
    const ewRoad = MeshBuilder.CreateGround(
      'road_ew',
      { width: 220, height: 14 },
      this.scene
    );
    ewRoad.position = new Vector3(0, 0.025, 0); // Raised slightly above NS road
    ewRoad.checkCollisions = true;
    ewRoad.receiveShadows = true;
    ewRoad.material = roadMat;

    this.cityMeshes.push(nsRoad, ewRoad);
  }

  /**
   * =========================================================================
   * 3. createSidewalks() - Elevated Curbs for Pedestrians
   * =========================================================================
   * WHAT IT DOES:
   * - Builds 4 long raised sidewalks that flank the edges of the roads.
   *
   * KEY CONCEPTS:
   * - Height = 0.25m (25 cm tall curb): Just like real-life city streets,
   *   the sidewalk is a physical step up from the road level.
   * - We place them at x = +9 and x = -9 (for the 14m road + curbs),
   *   and z = +9 and z = -9.
   * - Players can step up onto the sidewalk thanks to the player camera/capsule
   *   collision handling.
   */
  private createSidewalks(): void {
    const sidewalkMat = this.assetManager.getSidewalkMaterial();

    // Coordinates placing sidewalks along both sides of each boulevard:
    const sidewalkConfigs = [
      // Along North-South road: Left/West side (x = -9)
      { width: 4, depth: 220, x: -9, z: 0 },
      // Along North-South road: Right/East side (x = +9)
      { width: 4, depth: 220, x: 9, z: 0 },
      // Along East-West road: Top/North side (z = +9)
      { width: 220, depth: 4, x: 0, z: 9 },
      // Along East-West road: Bottom/South side (z = -9)
      { width: 220, depth: 4, x: 0, z: -9 },
    ];

    sidewalkConfigs.forEach((cfg, idx) => {
      const sw = MeshBuilder.CreateBox(
        `sidewalk_${idx}`,
        { width: cfg.width, depth: cfg.depth, height: 0.25 },
        this.scene
      );
      // y = 0.125 places the bottom of this 0.25m tall box flat on the floor at y = 0
      sw.position = new Vector3(cfg.x, 0.125, cfg.z);
      sw.checkCollisions = true;
      sw.receiveShadows = true;
      sw.material = sidewalkMat;
      this.cityMeshes.push(sw);
    });
  }

  /**
   * =========================================================================
   * 4. createCentralPlaza() - The Player Spawn Hub & Monument
   * =========================================================================
   * WHAT IT DOES:
   * - Creates the central circular roundabout plaza where the player spawns (0,0,0).
   * - Places a futuristic landmark: a 7-meter-tall obelisk monument with a glowing
   *   cyber neon ring at its base and a glowing beacon light on top.
   *
   * KEY CONCEPTS:
   * - Cylinder: Creates a smooth 32-sided circular stone platform (diameter: 22m).
   * - StandardMaterial with emissiveColor: Makes the neon ring and beacon shine
   *   with bright blue self-illuminated light (even in the dark).
   */
  private createCentralPlaza(): void {
    // 1. Circular raised plaza platform slab (warm sandstone piazza)
    const plaza = MeshBuilder.CreateCylinder(
      'central_plaza_slab',
      { height: 0.35, diameter: 24, tessellation: 36 },
      this.scene
    );
    plaza.position = new Vector3(0, 0.175, 0);
    plaza.checkCollisions = true;
    plaza.receiveShadows = true;

    const plazaMat = new PBRMaterial('mat_plaza', this.scene);
    plazaMat.albedoColor = new Color3(0.82, 0.78, 0.72); // Warm sunlit sandstone paving
    plazaMat.roughness = 0.55;
    plazaMat.metallic = 0.1;
    plaza.material = plazaMat;

    // 2. Decorative outer marble ring paver border
    const outerBorder = MeshBuilder.CreateTorus(
      'plaza_outer_border',
      { diameter: 23.6, thickness: 0.4, tessellation: 36 },
      this.scene
    );
    outerBorder.position = new Vector3(0, 0.35, 0);
    const borderMat = new PBRMaterial('mat_plaza_border', this.scene);
    borderMat.albedoColor = new Color3(0.92, 0.94, 0.96); // Polished white marble border
    borderMat.roughness = 0.3;
    borderMat.metallic = 0.2;
    outerBorder.material = borderMat;

    // 3. Center Obelisk / Landmark Monument (white crystalline marble)
    const monument = MeshBuilder.CreateCylinder(
      'plaza_monument',
      { height: 7.5, diameterTop: 0.4, diameterBottom: 1.6, tessellation: 8 },
      this.scene
    );
    monument.position = new Vector3(0, 3.9, 0);
    monument.checkCollisions = true;
    const monMat = new PBRMaterial('mat_monument', this.scene);
    monMat.albedoColor = new Color3(0.92, 0.94, 0.96); // Gleaming white Carrara marble
    monMat.metallic = 0.3;
    monMat.roughness = 0.2;
    monument.material = monMat;
    this.environment.addShadowCaster(monument);

    // 4. Cyan accent ring around monument base
    const groundRing = MeshBuilder.CreateTorus('monument_base_ring', { diameter: 3.6, thickness: 0.08 }, this.scene);
    groundRing.position = new Vector3(0, 0.36, 0);
    const ringMat = new StandardMaterial('mat_holo_ring', this.scene);
    ringMat.emissiveColor = new Color3(0.0, 0.85, 1.0); // Bright turquoise cyan ring
    groundRing.material = ringMat;

    // 5. Golden sun prism beacon sphere at the very tip (y = 8.0)
    const beacon = MeshBuilder.CreateSphere('monument_beacon', { diameter: 0.85 }, this.scene);
    beacon.position = new Vector3(0, 8.0, 0);
    const beaconMat = new StandardMaterial('mat_beacon', this.scene);
    beaconMat.emissiveColor = new Color3(1.0, 0.78, 0.2); // Golden sun prism beacon
    beacon.material = beaconMat;

    this.cityMeshes.push(plaza, outerBorder, monument, groundRing, beacon);
  }

  /**
   * =========================================================================
   * 5. generateCityBuildings() - City Architecture & Interactive Shops
   * =========================================================================
   * WHAT IT DOES:
   * - Acts as the "city planner map" defining the blueprint for every building:
   *   - Which shop is where (e.g. CyberMart, Neon Cafe)
   *   - North/South/East/West district skyscrapers
   *   - Width, depth, height, building type, colors, and orientation
   * - Hands this list of definitions to BuildingManager to generate the 3D meshes.
   *
   * KEY CONCEPTS:
   * - rotationY: Math.PI / 2 (90 degrees) or -Math.PI / 2 (-90 degrees):
   *   Rotates the entire building so its storefront entrance and neon sign
   *   face directly toward the main central avenue sidewalk where the player walks!
   * - isShop: true:
   *   Tells BuildingManager to attach glass doors, a canopy awning, and the
   *   illuminated neon sign with proximity triggers.
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
        facadeColor: new Color3(0.12, 0.68, 0.82), // Radiant electric teal / cyan storefront
        accentColor: new Color3(0.0, 0.95, 1.0),
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
        facadeColor: new Color3(0.92, 0.42, 0.38), // Warm coral pink / Tuscan terracotta cafe
        accentColor: new Color3(1.0, 0.35, 0.65),
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
        facadeColor: new Color3(0.22, 0.52, 0.92), // Azure sky blue crystalline glass tower
      },
      {
        id: 'tower_nexus',
        name: 'Nexus Pinnacle',
        archetype: 'skyscraper',
        position: new Vector3(24, 0, 52),
        width: 22,
        depth: 18,
        height: 58,
        facadeColor: new Color3(0.18, 0.72, 0.48), // Rich emerald jade green spire
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
        facadeColor: new Color3(0.35, 0.78, 0.65), // Fresh spring mint green tech pavilion
      },
      {
        id: 'bld_arcade',
        name: 'Holo Arcade & VR',
        archetype: 'commercial',
        position: new Vector3(22, 0, -26),
        width: 16,
        depth: 16,
        height: 22,
        facadeColor: new Color3(0.68, 0.32, 0.82), // Playful vibrant violet / purple arcade
      },
      {
        id: 'tower_vertex',
        name: 'Vertex Financial Center',
        archetype: 'skyscraper',
        position: new Vector3(0, 0, -56),
        width: 26,
        depth: 22,
        height: 64,
        facadeColor: new Color3(0.28, 0.45, 0.78), // Majestic royal sapphire blue skyscraper
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
        facadeColor: new Color3(0.92, 0.62, 0.24), // Warm golden amber / sun-kissed highrise
      },
      {
        id: 'tower_aurora',
        name: 'Aurora Spire',
        archetype: 'skyscraper',
        position: new Vector3(55, 0, 0),
        width: 20,
        depth: 24,
        height: 50,
        facadeColor: new Color3(0.78, 0.42, 0.72), // Radiant rose lilac / lavender tower
      },
    ];

    this.buildingDefs = buildings;
    this.buildingManager.generateBuildings(buildings);
    this.treePlacementManager.registerBuildings(buildings);
  }

  /**
   * =========================================================================
   * 6. createStreetFurnitureAndLights() - Street Lighting & Benches
   * =========================================================================
   * WHAT IT DOES:
   * - Plants modern curved LED streetlights along the sidewalks.
   * - Adds physical PointLights so the lamps actually illuminate the pavement at night.
   * - Calls createBenches() to place seating on sidewalks.
   *
   * KEY CONCEPTS:
   * - GPU Instancing (Why masterLamp is at y = -50):
   *   Creating 16 separate 3D lamp meshes would force the GPU to draw 16 distinct
   *   objects (16 draw calls).
   *   Instead, we build ONE "master template" hidden 50 meters underground (y = -50),
   *   and use `masterLamp.createInstance()`.
   *   Instancing tells the graphics card: "Reuse the exact same geometry in memory,
   *   just render it at these different XYZ positions." This delivers super high FPS!
   * - PointLight: A 3D light bulb that casts warm golden light (range: 16m)
   *   onto surrounding sidewalks and buildings.
   */
  private createStreetFurnitureAndLights(): void {
    // 1. Build Master Lamp Post template (hidden underground at y = -50)
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

    // 2. Master Lamp Arm & Head
    const masterHead = MeshBuilder.CreateBox(
      'master_lamp_head',
      { width: 0.35, depth: 1.2, height: 0.2 },
      this.scene
    );
    masterHead.position = new Vector3(0, -50 + 3.25, 0.5);
    masterHead.parent = masterLamp;

    // 3. Master Glowing Bulb (self-emissive downward-facing face)
    const masterBulb = MeshBuilder.CreatePlane(
      'master_lamp_bulb',
      { width: 0.3, height: 0.9 },
      this.scene
    );
    masterBulb.rotation.x = Math.PI / 2; // Flat horizontal facing down
    masterBulb.position = new Vector3(0, -50 + 3.14, 0.5);
    masterBulb.parent = masterLamp;
    const bulbMat = new StandardMaterial('mat_lamp_bulb', this.scene);
    bulbMat.emissiveColor = new Color3(1.0, 0.9, 0.7); // Warm halogen glow
    masterBulb.material = bulbMat;

    // 4. Lamp Coordinates along Main Streets (8 along NS road, 8 along EW road)
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
      // Create GPU instance of the master lamp
      const lampInstance = masterLamp.createInstance(`lamp_${idx}`);
      lampInstance.position = new Vector3(pos.x, 3.25, pos.z);
      lampInstance.checkCollisions = true;

      // Realistic warm point light for street illumination
      const pointLight = new PointLight(`lamp_light_${idx}`, new Vector3(pos.x, 5.8, pos.z), this.scene);
      pointLight.diffuse = new Color3(1.0, 0.88, 0.65); // Warm golden light
      pointLight.specular = new Color3(0.8, 0.7, 0.5);
      pointLight.intensity = 0.85;
      pointLight.range = 16; // Illuminates a 16-meter radius

      this.streetLights.push(pointLight);
      this.cityMeshes.push(lampInstance);
    });

    // Modern Sidewalk Benches
    this.createBenches();
  }

  /**
   * =========================================================================
   * createBenches() - Sidewalk Seating Furniture
   * =========================================================================
   * WHAT IT DOES:
   * - Places 4 wooden pedestrian rest benches along the sidewalks near the plaza.
   * - Benches have collision so players bump into them rather than walking through.
   */
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
   * =========================================================================
   * 7. createTreesAndFoliage() - Intelligent Urban Landscape Planting
   * =========================================================================
   * WHAT IT DOES:
   * - Uses the TreePlacementManager to procedurally validate and plant trees:
   *   1. ZERO trees on roads, intersections, or vehicular turning corners.
   *   2. ZERO trees blocking pedestrian sidewalk walking lanes.
   *   3. ZERO trees covering shopfronts, doors, or interaction trigger zones.
   *   4. ZERO foliage or trunks clipping/merging into building walls.
   *   5. Real organic green bark & leaf speckles with species variety
   *      (street trees, park oaks, conifers, and flowering trees).
   *   6. Controlled natural spacing, rotation, and scale variation.
   */
  private createTreesAndFoliage(): void {
    // Define the designated urban landscaping zones
    const landscapeZones: IPlacementZone[] = [
      // 1. Central Plaza Perimeter Garden Quadrants (landscaped park pockets around the circular plaza)
      {
        id: 'plaza_nw',
        name: 'Plaza North-West Garden',
        type: 'plaza_garden',
        minX: -15,
        maxX: -11,
        minZ: 11,
        maxZ: 15,
        allowedTypes: ['flowering_tree', 'park_oak'],
        density: 2,
        minTreeDistance: 5.5,
      },
      {
        id: 'plaza_ne',
        name: 'Plaza North-East Garden',
        type: 'plaza_garden',
        minX: 11,
        maxX: 15,
        minZ: 11,
        maxZ: 15,
        allowedTypes: ['flowering_tree', 'park_oak'],
        density: 2,
        minTreeDistance: 5.5,
      },
      {
        id: 'plaza_sw',
        name: 'Plaza South-West Garden',
        type: 'plaza_garden',
        minX: -15,
        maxX: -11,
        minZ: -15,
        maxZ: -11,
        allowedTypes: ['flowering_tree', 'park_oak'],
        density: 2,
        minTreeDistance: 5.5,
      },
      {
        id: 'plaza_se',
        name: 'Plaza South-East Garden',
        type: 'plaza_garden',
        minX: 11,
        maxX: 15,
        minZ: -15,
        maxZ: -11,
        allowedTypes: ['flowering_tree', 'park_oak'],
        density: 2,
        minTreeDistance: 5.5,
      },

      // 2. Open Park Lawns (spacious lawns well clear of buildings)
      // North-West Park (behind CyberMart)
      {
        id: 'park_nw',
        name: 'North-West Park Lawns',
        type: 'park_lawn',
        minX: -45,
        maxX: -18,
        minZ: 20,
        maxZ: 45,
        allowedTypes: ['park_oak', 'park_pine', 'flowering_tree'],
        density: 5,
        minTreeDistance: 6.5,
      },
      // North-East Park (behind Neon Cafe)
      {
        id: 'park_ne',
        name: 'North-East Park Lawns',
        type: 'park_lawn',
        minX: 18,
        maxX: 45,
        minZ: 20,
        maxZ: 45,
        allowedTypes: ['park_oak', 'park_pine', 'flowering_tree'],
        density: 5,
        minTreeDistance: 6.5,
      },
      // South-West Park (near Synergy Labs)
      {
        id: 'park_sw',
        name: 'South-West Park Lawns',
        type: 'park_lawn',
        minX: -42,
        maxX: -14,
        minZ: -45,
        maxZ: -14,
        allowedTypes: ['park_oak', 'park_pine', 'flowering_tree'],
        density: 5,
        minTreeDistance: 6.5,
      },
      // South-East Park (near Holo Arcade)
      {
        id: 'park_se',
        name: 'South-East Park Lawns',
        type: 'park_lawn',
        minX: 14,
        maxX: 42,
        minZ: -45,
        maxZ: -14,
        allowedTypes: ['park_oak', 'park_pine', 'flowering_tree'],
        density: 5,
        minTreeDistance: 6.5,
      },

      // 3. Curbside Street Planters (North-South Boulevard outside shop sightline corridors)
      // North Avenue (z >= 34 past the shops up to corporate towers)
      {
        id: 'curb_north_west',
        name: 'North Avenue West Curbside Planters',
        type: 'curbside_planter',
        minX: -7.8,
        maxX: -7.6,
        minZ: 34,
        maxZ: 50,
        allowedTypes: ['street_tree'],
        density: 3,
        minTreeDistance: 7.0,
      },
      {
        id: 'curb_north_east',
        name: 'North Avenue East Curbside Planters',
        type: 'curbside_planter',
        minX: 7.6,
        maxX: 7.8,
        minZ: 34,
        maxZ: 50,
        allowedTypes: ['street_tree'],
        density: 3,
        minTreeDistance: 7.0,
      },
      // South Avenue (z <= -18 past the plaza)
      {
        id: 'curb_south_west',
        name: 'South Avenue West Curbside Planters',
        type: 'curbside_planter',
        minX: -7.8,
        maxX: -7.6,
        minZ: -45,
        maxZ: -18,
        allowedTypes: ['street_tree'],
        density: 3,
        minTreeDistance: 7.0,
      },
      {
        id: 'curb_south_east',
        name: 'South Avenue East Curbside Planters',
        type: 'curbside_planter',
        minX: 7.6,
        maxX: 7.8,
        minZ: -45,
        maxZ: -18,
        allowedTypes: ['street_tree'],
        density: 3,
        minTreeDistance: 7.0,
      },

      // 4. Curbside Street Planters (East-West Boulevard outside plaza)
      {
        id: 'curb_ew_west_north',
        name: 'West Boulevard North Curbside Planters',
        type: 'curbside_planter',
        minX: -50,
        maxX: -24,
        minZ: 7.6,
        maxZ: 7.8,
        allowedTypes: ['street_tree', 'flowering_tree'],
        density: 3,
        minTreeDistance: 7.5,
      },
      {
        id: 'curb_ew_west_south',
        name: 'West Boulevard South Curbside Planters',
        type: 'curbside_planter',
        minX: -50,
        maxX: -24,
        minZ: -7.8,
        maxZ: -7.6,
        allowedTypes: ['street_tree', 'flowering_tree'],
        density: 3,
        minTreeDistance: 7.5,
      },
      {
        id: 'curb_ew_east_north',
        name: 'East Boulevard North Curbside Planters',
        type: 'curbside_planter',
        minX: 24,
        maxX: 50,
        minZ: 7.6,
        maxZ: 7.8,
        allowedTypes: ['street_tree', 'flowering_tree'],
        density: 3,
        minTreeDistance: 7.5,
      },
      {
        id: 'curb_ew_east_south',
        name: 'East Boulevard South Curbside Planters',
        type: 'curbside_planter',
        minX: 24,
        maxX: 50,
        minZ: -7.8,
        maxZ: -7.6,
        allowedTypes: ['street_tree', 'flowering_tree'],
        density: 3,
        minTreeDistance: 7.5,
      },

      // 5. Nature Greenways (North & South District Perimeter Greenbelts)
      {
        id: 'greenway_north',
        name: 'North District Greenway',
        type: 'park_lawn',
        minX: -35,
        maxX: 35,
        minZ: 70,
        maxZ: 95,
        allowedTypes: ['park_oak', 'park_pine'],
        density: 6,
        minTreeDistance: 7.5,
      },
      {
        id: 'greenway_south',
        name: 'South District Greenway',
        type: 'park_lawn',
        minX: -35,
        maxX: 35,
        minZ: -95,
        maxZ: -70,
        allowedTypes: ['park_oak', 'park_pine'],
        density: 6,
        minTreeDistance: 7.5,
      },
    ];

    // Generate trees via intelligent spatial clearance validation
    const placedTrees = this.treePlacementManager.generateTrees(landscapeZones);

    // Instantiate 3D meshes for every validated tree
    placedTrees.forEach((tree) => {
      this.createTree(tree);
    });
  }

  /**
   * Helper function to construct a realistic 3D tree with real leaves and proper architectural clearance.
   */
  private createTree(tree: IPlacedTree): void {
    const { id, position, type, scale, rotationY, isCylinderPlanter } = tree;

    // 1. Planter Box (scaled cleanly for urban sidewalks: 1.35m wide or circular park bed)
    let planter: AbstractMesh;
    if (isCylinderPlanter) {
      planter = MeshBuilder.CreateCylinder(
        `${id}_planter`,
        { diameter: 1.8 * scale, height: 0.42, tessellation: 20 },
        this.scene
      );
    } else {
      planter = MeshBuilder.CreateBox(
        `${id}_planter`,
        { width: 1.35 * scale, depth: 1.35 * scale, height: 0.42 },
        this.scene
      );
    }
    planter.position = new Vector3(position.x, 0.21, position.z);
    planter.checkCollisions = true;
    planter.receiveShadows = true;
    planter.material = this.assetManager.getSidewalkMaterial();

    // 2. Dark Garden Soil
    const soilMat = new PBRMaterial(`${id}_soil_mat`, this.scene);
    soilMat.albedoColor = new Color3(0.18, 0.12, 0.08); // Dark rich loam
    soilMat.roughness = 0.95;
    const soil = MeshBuilder.CreateCylinder(
      `${id}_soil`,
      { diameter: (isCylinderPlanter ? 1.6 : 1.15) * scale, height: 0.06 },
      this.scene
    );
    soil.position = new Vector3(position.x, 0.41, position.z);
    soil.material = soilMat;

    // 3. Tree Root Container Node (with rotation & scale)
    const treeRoot = MeshBuilder.CreateBox(`${id}_root`, { size: 0.05 }, this.scene);
    treeRoot.isVisible = false;
    treeRoot.position = new Vector3(position.x, 0.42, position.z);
    treeRoot.rotation.y = rotationY;
    treeRoot.scaling = new Vector3(scale, scale, scale);

    const barkMat = this.assetManager.getTreeBarkMaterial();
    const lushMat = this.assetManager.getTreeFoliageMaterial('lush');
    const brightMat = this.assetManager.getTreeFoliageMaterial('bright');
    const forestMat = this.assetManager.getTreeFoliageMaterial('forest');
    const floweringMat = this.assetManager.getTreeFoliageMaterial('flowering');

    if (type === 'street_tree') {
      // Manicured urban street tree: high vertical trunk clearance and compact canopy
      const trunk = MeshBuilder.CreateCylinder(
        `${id}_trunk`,
        { height: 3.6, diameterTop: 0.2, diameterBottom: 0.36, tessellation: 10 },
        this.scene
      );
      trunk.position.y = 1.8;
      trunk.parent = treeRoot;
      trunk.material = barkMat;
      trunk.checkCollisions = true;
      this.environment.addShadowCaster(trunk);

      // Main compact canopy
      const mainCanopy = MeshBuilder.CreateSphere(
        `${id}_canopy_main`,
        { diameterX: 2.5, diameterY: 2.4, diameterZ: 2.5, segments: 8 },
        this.scene
      );
      mainCanopy.position = new Vector3(0, 3.4, 0);
      mainCanopy.parent = treeRoot;
      mainCanopy.material = lushMat;
      this.environment.addShadowCaster(mainCanopy);

      // Upper sunlit crown
      const crown = MeshBuilder.CreateSphere(
        `${id}_canopy_crown`,
        { diameter: 1.8, segments: 8 },
        this.scene
      );
      crown.position = new Vector3(0, 4.3, 0);
      crown.parent = treeRoot;
      crown.material = brightMat;
      this.environment.addShadowCaster(crown);

      this.cityMeshes.push(planter, soil, treeRoot, trunk, mainCanopy, crown);
    } else if (type === 'park_oak') {
      // Park Oak Tree (for open park lawns with plenty of breathing room)
      const trunk = MeshBuilder.CreateCylinder(
        `${id}_trunk`,
        { height: 4.0, diameterTop: 0.26, diameterBottom: 0.46, tessellation: 10 },
        this.scene
      );
      trunk.position.y = 2.0;
      trunk.parent = treeRoot;
      trunk.material = barkMat;
      trunk.checkCollisions = true;
      this.environment.addShadowCaster(trunk);

      const mainCanopy = MeshBuilder.CreateSphere(
        `${id}_canopy_main`,
        { diameterX: 3.2, diameterY: 2.7, diameterZ: 3.2, segments: 8 },
        this.scene
      );
      mainCanopy.position = new Vector3(0, 3.6, 0);
      mainCanopy.parent = treeRoot;
      mainCanopy.material = lushMat;
      this.environment.addShadowCaster(mainCanopy);

      const crown = MeshBuilder.CreateSphere(
        `${id}_canopy_crown`,
        { diameter: 2.2, segments: 8 },
        this.scene
      );
      crown.position = new Vector3(0, 4.8, 0);
      crown.parent = treeRoot;
      crown.material = brightMat;
      this.environment.addShadowCaster(crown);

      this.cityMeshes.push(planter, soil, treeRoot, trunk, mainCanopy, crown);
    } else if (type === 'flowering_tree') {
      // Ornamental flowering spring tree with soft blossom accents
      const trunk = MeshBuilder.CreateCylinder(
        `${id}_trunk`,
        { height: 3.8, diameterTop: 0.22, diameterBottom: 0.38, tessellation: 10 },
        this.scene
      );
      trunk.position.y = 1.9;
      trunk.parent = treeRoot;
      trunk.material = barkMat;
      trunk.checkCollisions = true;
      this.environment.addShadowCaster(trunk);

      const mainCanopy = MeshBuilder.CreateSphere(
        `${id}_canopy_main`,
        { diameterX: 2.8, diameterY: 2.4, diameterZ: 2.8, segments: 8 },
        this.scene
      );
      mainCanopy.position = new Vector3(0, 3.4, 0);
      mainCanopy.parent = treeRoot;
      mainCanopy.material = floweringMat;
      this.environment.addShadowCaster(mainCanopy);

      const crown = MeshBuilder.CreateSphere(
        `${id}_canopy_crown`,
        { diameter: 1.9, segments: 8 },
        this.scene
      );
      crown.position = new Vector3(0, 4.4, 0);
      crown.parent = treeRoot;
      crown.material = brightMat;
      this.environment.addShadowCaster(crown);

      this.cityMeshes.push(planter, soil, treeRoot, trunk, mainCanopy, crown);
    } else {
      // Park Pine / Conifer (3 tiered conical skirts)
      const trunk = MeshBuilder.CreateCylinder(
        `${id}_trunk`,
        { height: 4.6, diameterTop: 0.18, diameterBottom: 0.38, tessellation: 10 },
        this.scene
      );
      trunk.position.y = 2.3;
      trunk.parent = treeRoot;
      trunk.material = barkMat;
      trunk.checkCollisions = true;
      this.environment.addShadowCaster(trunk);

      const skirt1 = MeshBuilder.CreateCylinder(
        `${id}_sk1`,
        { height: 1.6, diameterTop: 0.5, diameterBottom: 2.6, tessellation: 10 },
        this.scene
      );
      skirt1.position = new Vector3(0, 2.4, 0);
      skirt1.parent = treeRoot;
      skirt1.material = forestMat;
      this.environment.addShadowCaster(skirt1);

      const skirt2 = MeshBuilder.CreateCylinder(
        `${id}_sk2`,
        { height: 1.4, diameterTop: 0.3, diameterBottom: 2.0, tessellation: 10 },
        this.scene
      );
      skirt2.position = new Vector3(0, 3.4, 0);
      skirt2.parent = treeRoot;
      skirt2.material = forestMat;
      this.environment.addShadowCaster(skirt2);

      const skirt3 = MeshBuilder.CreateCylinder(
        `${id}_sk3`,
        { height: 1.2, diameterTop: 0.05, diameterBottom: 1.2, tessellation: 8 },
        this.scene
      );
      skirt3.position = new Vector3(0, 4.3, 0);
      skirt3.parent = treeRoot;
      skirt3.material = lushMat;
      this.environment.addShadowCaster(skirt3);

      this.cityMeshes.push(planter, soil, treeRoot, trunk, skirt1, skirt2, skirt3);
    }
  }

  /**
   * =========================================================================
   * setNightMode() - Day / Night Cycle Lighting Switcher
   * =========================================================================
   * WHAT IT DOES:
   * - Called when the player toggles time of day.
   * - Night time: Powers up streetlight intensity to 1.4 (bright warm glow).
   * - Day time: Dims streetlights to 0.15 (ambient daylight handles the scene).
   */
  public setNightMode(isNight: boolean): void {
    const intensity = isNight ? 1.4 : 0.15;
    this.streetLights.forEach((light) => {
      light.intensity = intensity;
    });
  }

  /**
   * Returns all meshes created for the city (useful for collision queries or minimap).
   */
  public getMeshes(): AbstractMesh[] {
    return this.cityMeshes;
  }

  /**
   * =========================================================================
   * dispose() - Memory Clean Up
   * =========================================================================
   * WHAT IT DOES:
   * - When the player leaves or the game unmounts, this removes all meshes,
   *   lights, and textures from the GPU memory to prevent memory leaks.
   */
  public dispose(): void {
    this.cityMeshes.forEach((m) => m.dispose());
    this.cityMeshes = [];
    this.streetLights.forEach((l) => l.dispose());
    this.streetLights = [];
    this.buildingManager.dispose();
  }
}
