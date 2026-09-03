import { Vector3, Color3 } from '@babylonjs/core';

export type BuildingArchetype = 'skyscraper' | 'commercial' | 'shop' | 'plaza_feature';

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
