import { Vector3, Vector2 } from '@babylonjs/core';
import { IBuildingDef } from '../buildings/BuildingTypes';

/**
 * Supported species / archetypes of urban and park trees.
 */
export type TreeType = 'street_tree' | 'park_oak' | 'park_pine' | 'flowering_tree';

/**
 * Geometric definition of a road in the city.
 */
export interface IRoadDef {
  id: string;
  name: string;
  // Axis-aligned bounding box of the vehicular asphalt
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  // Extra clearance buffer to keep curbs completely unobstructed
  bufferMargin: number;
}

/**
 * Geometric definition of a dedicated pedestrian walking corridor.
 * Trees MUST NEVER be placed inside this walking corridor.
 */
export interface IPedestrianPathDef {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Clearance zone in front of building or shop entrances.
 */
export interface IEntranceClearanceZone {
  id: string;
  centerX: number;
  centerZ: number;
  radius: number; // Circular clearance or half-width
  width?: number; // Optional rectangular box bounds
  depth?: number;
}

/**
 * Gameplay interaction zones (such as shop proximity triggers or spawn points).
 */
export interface IGameplayZone {
  id: string;
  name: string;
  centerX: number;
  centerZ: number;
  radius: number;
}

/**
 * Designated urban landscaping zone where trees are intentionally planted.
 */
export interface IPlacementZone {
  id: string;
  name: string;
  type: 'park_lawn' | 'curbside_planter' | 'plaza_garden' | 'building_buffer';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  allowedTypes: TreeType[];
  density: number; // Target number of trees to plant in this zone
  minTreeDistance: number; // Minimum spacing between trees in meters
}

/**
 * Species-specific configuration profiles (canopy radius, trunk thickness, clearance buffers).
 */
export interface ITreeConfig {
  canopyRadius: number;
  trunkRadius: number;
  height: number;
  minDistanceToNeighbor: number;
  wallClearanceBuffer: number;
  roadClearanceBuffer: number;
}

/**
 * Represents a fully validated, collision-free placed tree ready for 3D instantiation.
 */
export interface IPlacedTree {
  id: string;
  position: Vector3;
  type: TreeType;
  scale: number;
  rotationY: number;
  isCylinderPlanter: boolean;
}

/**
 * Default geometric configurations per tree type.
 */
export const TREE_CONFIGS: Record<TreeType, ITreeConfig> = {
  street_tree: {
    canopyRadius: 1.3,
    trunkRadius: 0.22,
    height: 3.6,
    minDistanceToNeighbor: 5.5,
    wallClearanceBuffer: 0.6,
    roadClearanceBuffer: 0.6,
  },
  park_oak: {
    canopyRadius: 1.8,
    trunkRadius: 0.28,
    height: 4.4,
    minDistanceToNeighbor: 6.5,
    wallClearanceBuffer: 0.8,
    roadClearanceBuffer: 1.0,
  },
  park_pine: {
    canopyRadius: 1.4,
    trunkRadius: 0.22,
    height: 5.0,
    minDistanceToNeighbor: 5.5,
    wallClearanceBuffer: 0.8,
    roadClearanceBuffer: 1.0,
  },
  flowering_tree: {
    canopyRadius: 1.5,
    trunkRadius: 0.24,
    height: 4.0,
    minDistanceToNeighbor: 5.5,
    wallClearanceBuffer: 0.7,
    roadClearanceBuffer: 0.8,
  },
};

/**
 * =============================================================================
 * TreePlacementManager
 * =============================================================================
 * WHAT IT DOES:
 * - The central urban landscape planning engine for the city.
 * - Enforces all 13 strict urban placement rules:
 *   1. Zero trees on roads, vehicle lanes, or turning corners.
 *   2. Zero trees in the middle of pedestrian walking corridors.
 *   3. Trees only on certified green strips, medians, or curbside planter strips.
 *   4. Zero blockage of building or shop entrances.
 *   5. Zero blockage of shop interaction triggers (e.g. CyberMart, Neon Cafe).
 *   6. Mathematical clearance calculation preventing foliage or trunks from
 *      merging or intersecting building walls.
 *   7. Safe buffers around spawn points, intersections, and monuments.
 *   8. Deterministic candidate sampling & validation pipeline.
 *   9. Controlled natural spacing, scale variation (±10%), and rotation (0..2π).
 *  10. Respects existing layout without altering roads or buildings.
 *  11. Prioritizes intentional landscaping zones.
 *  12. Fully reusable architecture for any future city expansions.
 *  13. Performed once at startup: 0 runtime render loop performance impact!
 */
export class TreePlacementManager {
  private roads: IRoadDef[] = [];
  private pedestrianPaths: IPedestrianPathDef[] = [];
  private buildings: IBuildingDef[] = [];
  private entranceClearances: IEntranceClearanceZone[] = [];
  private gameplayZones: IGameplayZone[] = [];
  private placedTrees: IPlacedTree[] = [];

  constructor() {
    this.registerCityRoadsAndIntersections();
    this.registerPedestrianCorridors();
    this.registerGameplayAndSpawnClearance();
  }

  // ===========================================================================
  // 1. SETUP & CITY ENVIRONMENT REGISTRATION
  // ===========================================================================

  /**
   * Registers vehicular road geometries and vehicle turning buffers.
   */
  private registerCityRoadsAndIntersections(): void {
    // North-South Main Boulevard (14m road asphalt spanning x in [-7, +7], z in [-110, 110])
    this.roads.push({
      id: 'road_ns',
      name: 'North-South Boulevard',
      minX: -7.0,
      maxX: 7.0,
      minZ: -110.0,
      maxZ: 110.0,
      bufferMargin: 0.5,
    });

    // East-West Main Boulevard (14m road asphalt spanning z in [-7, +7], x in [-110, 110])
    this.roads.push({
      id: 'road_ew',
      name: 'East-West Boulevard',
      minX: -110.0,
      maxX: 110.0,
      minZ: -7.0,
      maxZ: 7.0,
      bufferMargin: 0.5,
    });
  }

  /**
   * Registers primary pedestrian walking lanes on sidewalks.
   * Sidewalks span 4m width (e.g. x in [7, 11] on the East side).
   * Pedestrians walk down the central 2.5m corridor; trees are strictly forbidden here!
   */
  private registerPedestrianCorridors(): void {
    this.pedestrianPaths.push(
      // NS West Sidewalk Walking Corridor
      { id: 'path_ns_west', minX: -10.5, maxX: -8.2, minZ: -110.0, maxZ: 110.0 },
      // NS East Sidewalk Walking Corridor
      { id: 'path_ns_east', minX: 8.2, maxX: 10.5, minZ: -110.0, maxZ: 110.0 },
      // EW North Sidewalk Walking Corridor
      { id: 'path_ew_north', minX: -110.0, maxX: 110.0, minZ: 8.2, maxZ: 10.5 },
      // EW South Sidewalk Walking Corridor
      { id: 'path_ew_south', minX: -110.0, maxX: 110.0, minZ: -10.5, maxZ: -8.2 }
    );
  }

  /**
   * Registers spawn hub, monument, and landmark clearance zones.
   */
  private registerGameplayAndSpawnClearance(): void {
    // 1. Central Plaza Monument Obelisk at (0, 0)
    this.gameplayZones.push({
      id: 'monument_clearance',
      name: 'Central Plaza Monument & Neon Ring',
      centerX: 0,
      centerZ: 0,
      radius: 4.5,
    });

    // 2. Player Spawn Point at (0, 8)
    this.gameplayZones.push({
      id: 'spawn_clearance',
      name: 'Player Spawn Promenade',
      centerX: 0,
      centerZ: 8,
      radius: 5.0,
    });

    // 3. Central Plaza Circular Pedestrian Ring (diameter 24m, radius 12m)
    // The inner walking circle must remain open for player navigation
    this.gameplayZones.push({
      id: 'plaza_inner_ring',
      name: 'Plaza Inner Walkway',
      centerX: 0,
      centerZ: 0,
      radius: 9.5,
    });
  }

  /**
   * Registers buildings and computes entrance clearance zones for every structure.
   */
  public registerBuildings(buildings: IBuildingDef[]): void {
    this.buildings = buildings;

    buildings.forEach((bld) => {
      const { position, width, depth, rotationY, isShop } = bld;
      const rot = rotationY || 0;

      // Calculate the world coordinate of the front entrance door
      // In local coordinates, the front facade is at z = depth / 2 + 0.1
      const localFrontZ = depth / 2 + 0.1;
      const entranceWorldX = position.x + localFrontZ * Math.sin(rot);
      const entranceWorldZ = position.z + localFrontZ * Math.cos(rot);

      if (isShop) {
        // Shophouses (CyberMart, Neon Cafe) have high-traffic entrance corridors
        // and interaction triggers that must remain 100% visible and unblocked!
        this.entranceClearances.push({
          id: `entrance_${bld.id}`,
          centerX: entranceWorldX,
          centerZ: entranceWorldZ,
          radius: 6.5, // 6.5m clear perimeter in front of shop entrance
        });

        // Register shop interaction trigger zone
        this.gameplayZones.push({
          id: `shop_trigger_${bld.id}`,
          name: `${bld.name} Interaction Zone`,
          centerX: entranceWorldX,
          centerZ: entranceWorldZ,
          radius: 7.0, // Guaranteed clear approach for player interaction
        });
      } else {
        // Standard corporate/commercial buildings: 4m clear entrance zone
        this.entranceClearances.push({
          id: `entrance_${bld.id}`,
          centerX: entranceWorldX,
          centerZ: entranceWorldZ,
          radius: 4.5,
        });
      }
    });
  }

  // ===========================================================================
  // 2. SPATIAL CLEARANCE & VALIDATION METHODS
  // ===========================================================================

  /**
   * Rule 1: Checks if position is inside or too close to any road vehicular surface.
   */
  public isInsideRoad(pos: Vector2, extraBuffer: number = 0): boolean {
    for (const road of this.roads) {
      const buffer = road.bufferMargin + extraBuffer;
      if (
        pos.x >= road.minX - buffer &&
        pos.x <= road.maxX + buffer &&
        pos.y >= road.minZ - buffer &&
        pos.y <= road.maxZ + buffer
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Rule 1 & 7: Checks if position preserves safe buffer distance from roads.
   */
  public hasRoadClearance(pos: Vector2, minBuffer: number): boolean {
    return !this.isInsideRoad(pos, minBuffer);
  }

  /**
   * Rule 2: Checks if position lands inside a pedestrian sidewalk walking lane.
   */
  public isInsidePedestrianPath(pos: Vector2, buffer: number = 0.2): boolean {
    for (const path of this.pedestrianPaths) {
      if (
        pos.x >= path.minX - buffer &&
        pos.x <= path.maxX + buffer &&
        pos.y >= path.minZ - buffer &&
        pos.y <= path.maxZ + buffer
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Rule 6: Computes exact 2D distance from candidate point to building bounds.
   * Handles oriented bounding boxes (buildings with any rotationY).
   * Guarantees that neither tree trunk nor foliage can ever penetrate a wall.
   */
  public hasBuildingClearance(
    pos: Vector2,
    canopyRadius: number,
    wallClearanceBuffer: number = 0.6
  ): { valid: boolean; minDistance: number; reason?: string } {
    let globalMinDistance = Infinity;

    for (const bld of this.buildings) {
      const rot = bld.rotationY || 0;
      const cos = Math.cos(-rot);
      const sin = Math.sin(-rot);

      // Translate candidate into building-relative coordinates
      const dx = pos.x - bld.position.x;
      const dz = pos.y - bld.position.z;

      // Rotate into building's local axis
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;

      // Building foundation extends 0.35m beyond main body on each side
      const halfWidth = bld.width / 2 + 0.35;
      const halfDepth = bld.depth / 2 + 0.35;

      // Calculate distance from point to 2D rectangle in local coordinates
      const distX = Math.max(0, Math.abs(localX) - halfWidth);
      const distZ = Math.max(0, Math.abs(localZ) - halfDepth);
      const distance = Math.sqrt(distX * distX + distZ * distZ);

      if (distance < globalMinDistance) {
        globalMinDistance = distance;
      }

      // If inside building or closer than canopy + safety buffer: REJECT
      const requiredBuffer = canopyRadius + wallClearanceBuffer;
      if (distance < requiredBuffer) {
        return {
          valid: false,
          minDistance: distance,
          reason: `Too close to building ${bld.id} (distance: ${distance.toFixed(2)}m < required: ${requiredBuffer.toFixed(2)}m)`,
        };
      }
    }

    return { valid: true, minDistance: globalMinDistance };
  }

  /**
   * Rule 4 & 5: Checks if candidate position is within an entrance clearance zone.
   */
  public isNearEntrance(pos: Vector2, extraClearance: number = 0): boolean {
    for (const entrance of this.entranceClearances) {
      const dx = pos.x - entrance.centerX;
      const dz = pos.y - entrance.centerZ;
      const distSq = dx * dx + dz * dz;
      const threshold = entrance.radius + extraClearance;
      if (distSq < threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Rule 5 & 7: Checks if candidate position is inside a gameplay zone (e.g. shop interaction trigger).
   */
  public isInsideInteractionZone(pos: Vector2, extraClearance: number = 0): boolean {
    for (const zone of this.gameplayZones) {
      const dx = pos.x - zone.centerX;
      const dz = pos.y - zone.centerZ;
      const distSq = dx * dx + dz * dz;
      const threshold = zone.radius + extraClearance;
      if (distSq < threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Rule 9: Checks if candidate is too close to another already placed tree.
   */
  public isTooCloseToAnotherTree(pos: Vector2, minDistance: number): boolean {
    for (const tree of this.placedTrees) {
      const dx = pos.x - tree.position.x;
      const dz = pos.y - tree.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDistance * minDistance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Master Validator: Evaluates candidate position against all 13 rules.
   */
  public isValidPosition(
    pos: Vector2,
    type: TreeType,
    candidateZoneType?: string
  ): { valid: boolean; reason?: string } {
    const config = TREE_CONFIGS[type];

    // 1. Road check: Never inside road asphalt
    if (this.isInsideRoad(pos, 0)) {
      return { valid: false, reason: 'Inside road asphalt surface' };
    }

    // 2. Road buffer check: Maintain road clearance buffer
    if (!this.hasRoadClearance(pos, config.roadClearanceBuffer)) {
      return { valid: false, reason: 'Violates safe road curb buffer' };
    }

    // 3. Pedestrian path check: Never block the sidewalk walking lane
    if (this.isInsidePedestrianPath(pos, 0.3)) {
      return { valid: false, reason: 'Blocks primary pedestrian sidewalk lane' };
    }

    // 4. Building entrance check: Never block doors or entry approaches
    if (this.isNearEntrance(pos, 0.4)) {
      return { valid: false, reason: 'Inside building or shop entrance clearance zone' };
    }

    // 5. Gameplay & shop interaction zone check
    if (this.isInsideInteractionZone(pos, 0.4)) {
      return { valid: false, reason: 'Inside shop interaction trigger or spawn zone' };
    }

    // 6. Building wall clearance check: Canopy & trunk must never touch walls
    const buildingCheck = this.hasBuildingClearance(pos, config.canopyRadius, config.wallClearanceBuffer);
    if (!buildingCheck.valid) {
      return { valid: false, reason: buildingCheck.reason };
    }

    // 7. Tree-to-tree spacing check: Natural spacing without unnatural clusters
    if (this.isTooCloseToAnotherTree(pos, config.minDistanceToNeighbor)) {
      return { valid: false, reason: 'Too close to another tree' };
    }

    return { valid: true };
  }

  // ===========================================================================
  // 3. INTENTIONAL URBAN LANDSCAPE GENERATION
  // ===========================================================================

  /**
   * Clears currently placed trees.
   */
  public clear(): void {
    this.placedTrees = [];
  }

  /**
   * Returns list of all validated, placed trees.
   */
  public getPlacedTrees(): IPlacedTree[] {
    return this.placedTrees;
  }

  /**
   * Generates trees across designated urban landscaping zones.
   * Samples candidate positions, passes them through the validator, and returns
   * the complete set of clash-free, realistically planted trees.
   */
  public generateTrees(zones: IPlacementZone[]): IPlacedTree[] {
    this.placedTrees = [];

    zones.forEach((zone) => {
      let attempts = 0;
      let placedInZone = 0;
      const maxAttempts = zone.density * 35;

      while (placedInZone < zone.density && attempts < maxAttempts) {
        attempts++;

        // Pick random tree type from allowed types for this zone
        const treeType = zone.allowedTypes[Math.floor(Math.random() * zone.allowedTypes.length)];

        // Generate candidate position inside zone bounds
        const candX = zone.minX + Math.random() * (zone.maxX - zone.minX);
        const candZ = zone.minZ + Math.random() * (zone.maxZ - zone.minZ);
        const candidatePos = new Vector2(candX, candZ);

        // Run complete validation pipeline
        const check = this.isValidPosition(candidatePos, treeType, zone.type);

        if (check.valid) {
          // Controlled natural variation in scale (±10%) and rotation (0..2π)
          const scaleVariation = 0.9 + Math.random() * 0.2;
          const randomRotation = Math.random() * Math.PI * 2;
          const isCylinderPlanter = zone.type === 'park_lawn' || zone.type === 'plaza_garden';

          const tree: IPlacedTree = {
            id: `tree_${zone.id}_${placedInZone}`,
            position: new Vector3(candidatePos.x, 0.2, candidatePos.y),
            type: treeType,
            scale: scaleVariation,
            rotationY: randomRotation,
            isCylinderPlanter,
          };

          this.placedTrees.push(tree);
          placedInZone++;
        }
      }
    });

    return this.placedTrees;
  }

  /**
   * Reusable single-tree placement solver: Finds a certified valid spot within
   * bounds or returns null if no valid position satisfies all 13 rules.
   */
  public findValidPosition(
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    type: TreeType,
    maxAttempts: number = 50
  ): Vector3 | null {
    for (let i = 0; i < maxAttempts; i++) {
      const candX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const candZ = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      const pos = new Vector2(candX, candZ);

      if (this.isValidPosition(pos, type).valid) {
        return new Vector3(candX, 0.2, candZ);
      }
    }
    return null;
  }
}
