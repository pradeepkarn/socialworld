import { Vector3, Color3 } from '@babylonjs/core';

/**
 * =========================================================================
 * BuildingArchetype
 * =========================================================================
 * Defines the style category of a building:
 * - 'skyscraper': Very tall corporate towers (has HVAC rooftop units + radio masts).
 * - 'commercial': Medium-height city blocks (arcades, labs, offices).
 * - 'shop': Interactive retail locations with glass doors, awnings & neon signs.
 * - 'plaza_feature': Decorative urban elements (monuments, statues).
 */
export type BuildingArchetype = 'skyscraper' | 'commercial' | 'shop' | 'plaza_feature';

/**
 * =========================================================================
 * IBuildingDef
 * =========================================================================
 * The "Blueprint" contract for constructing any building in the 3D world:
 * - id: Unique string name (e.g. 'shop_cybermart', 'tower_quantum').
 * - name: Human-readable title displayed in UI/minimap.
 * - archetype: The building category (affects roof equipment and materials).
 * - position: 3D coordinates (X, Y, Z) in the city.
 * - width, depth, height: Physical dimensions in meters.
 * - rotationY: Optional heading angle (rotates building to face a street).
 * - facadeColor: Base wall exterior color.
 * - accentColor: Neon trim/glow color (especially for shops).
 * - isShop: If true, BuildingManager creates a storefront with neon signage.
 * - shopId: Connects this 3D building to the inventory/catalog in ShopManager.
 * - shopSignText: Short text written on the glowing neon signboard.
 */
export interface IBuildingDef {
  id: string;
  name: string;
  archetype: BuildingArchetype;
  position: Vector3;
  width: number;
  depth: number;
  height: number;
  rotationY?: number;
  facadeColor?: Color3;
  accentColor?: Color3;
  isShop?: boolean;
  shopId?: string;
  shopSignText?: string;
}
