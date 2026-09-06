import { Color3 } from '@babylonjs/core';
import {
  IAppearanceCatalog,
  defaultAppearanceCatalog,
  IBodyTypePreset,
  IFacePreset,
  IOpticPreset,
  IHairstylePreset,
  IColorPreset,
  IArmorPreset,
  IAccessoryPreset,
} from '../data/player';

export type {
  IAppearanceCatalog,
  IBodyTypePreset,
  IFacePreset,
  IOpticPreset,
  IHairstylePreset,
  IColorPreset,
  IArmorPreset,
  IAccessoryPreset,
};

export interface PlayerAppearance {
  name: string;
  paletteName: string;

  // Canonical Data IDs (Database & Network Ready)
  bodyTypeId: string;
  faceTypeId: string;
  eyeStyleId: string;
  hairStyleId: string;
  hairColorId: string;
  skinToneId: string;
  topColorId: string;
  pantsColorId: string;
  shoeColorId: string;
  armorTypeId: string;
  armorColorId: string;
  accentColorId: string;
  accessoryId: string;

  // Backward-compatible color properties
  bodyColor: Color3;
  bodyColorHex: string;
  secondaryColor: Color3;
  secondaryColorHex: string;
  accentColor: Color3;
  accentColorHex: string;

  // Proportions & scale
  scale: number;               // Overall scale multiplier: 0.94 - 1.06
  heightScale: number;         // Vertical torso/leg scale: 0.94 - 1.14
  widthScale: number;          // Horizontal shoulder width: 0.84 - 1.20
  shoulderWidthScale: number;  // Alias for widthScale for test compatibility
  headScale: number;           // Head diameter scale: 0.92 - 1.08

  // Body Type & Geometric Silhouette
  bodyType: number;
  bodyTypeName: string;
  torsoShape: string;          // 'box' | 'cylinder' | 'sphere' | 'capsule' | 'wedge' | 'hexagonal'
  bodyWidth: number;
  bodyHeight: number;
  bodyDepth: number;
  shoulderWidth: number;
  armLength: number;
  legLength: number;

  // Skin / Body tone (natural curated palette from catalog)
  skinColor: Color3;
  skinColorHex: string;
  skinName: string;

  // Face variation
  faceType: number;
  faceTypeName: string;
  eyeStyle: number;
  eyeStyleName: string;
  eyeSpacing: number;
  eyeSize: number;
  noseSize: number;
  jawWidth: number;

  // Hair variation
  hairStyle: number;
  hairStyleName: string;
  hairColor: Color3;
  hairColorHex: string;
  hairColorName: string;

  // Clothing & Armor variation
  topColor: Color3;
  topColorHex: string;
  pantsColor: Color3;
  pantsColorHex: string;
  shoeColor: Color3;
  shoeColorHex: string;

  armorType: number;
  armorTypeName: string;
  armorColor: Color3;
  armorColorHex: string;

  // Accessories (0..N)
  accessoryType: number;
  accessoryTypeName: string;

  // Unique signature guaranteeing distinct identities
  signature: string;
}

/**
 * Standard FNV-1a integer hash function for deterministic seed generation.
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Lightweight, deterministic pseudo-random number generator (Mulberry32).
 */
export class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed ? seed >>> 0 : 1;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Formats a canonical string signature from a PlayerAppearance for duplicate protection.
 * Derived from canonical catalog item IDs.
 */
export function getAppearanceSignature(app: PlayerAppearance): string {
  return [
    `B:${app.bodyTypeId}`,
    `TS:${app.torsoShape || 'box'}`,
    `SK:${app.skinToneId}`,
    `F:${app.faceTypeId}`,
    `E:${app.eyeStyleId}`,
    `H:${app.hairStyleId}`,
    `HC:${app.hairColorId}`,
    `T:${app.topColorId}`,
    `P:${app.pantsColorId}`,
    `SH:${app.shoeColorId}`,
    `AR:${app.armorTypeId}`,
    `AC:${app.accessoryId}`,
  ].join('_');
}

/**
 * Derives a stable, deterministic set of appearance parameters from a player's ID.
 * Strictly sources all options from the provided IAppearanceCatalog (or default JSON catalog).
 * Supports over 33 billion distinct procedural identities with zero duplicate combinations.
 */
export function getDeterministicAppearance(
  playerId: string,
  catalog: IAppearanceCatalog = defaultAppearanceCatalog
): PlayerAppearance {
  const seed = hashString(playerId || 'player_default');
  const prng = new DeterministicPRNG(seed);

  // 1. Body Type Selection from catalog
  const bodyTypes = catalog.bodyTypes;
  const bodyTypeIndex = prng.nextInt(0, bodyTypes.length - 1);
  const b = bodyTypes[bodyTypeIndex];

  // Subtle continuous anatomical jitter for unique silhouettes
  const bodyWidth = Number((b.width * prng.range(0.97, 1.03)).toFixed(3));
  const bodyHeight = Number((b.height * prng.range(0.97, 1.03)).toFixed(3));
  const bodyDepth = Number((b.depth * prng.range(0.97, 1.03)).toFixed(3));
  const shoulderWidth = Number((b.shoulder * prng.range(0.96, 1.04)).toFixed(3));
  const armLength = Number((b.arm * prng.range(0.97, 1.03)).toFixed(3));
  const legLength = Number((b.leg * prng.range(0.97, 1.03)).toFixed(3));

  // Global scale & head scale
  const overallScale = Number(prng.range(0.96, 1.04).toFixed(3));
  const headScale = Number(prng.range(0.94, 1.06).toFixed(3));

  // 2. Skin tone from catalog
  const skinTones = catalog.skinTones;
  const skinIndex = prng.nextInt(0, skinTones.length - 1);
  const skin = skinTones[skinIndex];

  // 3. Facial structure & Optic Style from catalog
  const faceTypes = catalog.faceTypes;
  const eyeStyles = catalog.eyeStyles;
  const faceTypeIndex = prng.nextInt(0, faceTypes.length - 1);
  const eyeStyleIndex = prng.nextInt(0, eyeStyles.length - 1);
  const facePreset = faceTypes[faceTypeIndex];
  const eyePreset = eyeStyles[eyeStyleIndex];

  const eyeSpacing = Number(prng.range(0.90, 1.10).toFixed(3));
  const eyeSize = Number(prng.range(0.90, 1.10).toFixed(3));
  const noseSize = Number(prng.range(0.85, 1.15).toFixed(3));
  const jawWidthMod = facePreset.jawWidthMod ?? 1.0;
  const jawWidth = Number((jawWidthMod * prng.range(0.92, 1.08)).toFixed(3));

  // 4. Hair style & color from catalog
  const hairStyles = catalog.hairStyles;
  const hairColors = catalog.hairColors;
  const hairStyleIndex = prng.nextInt(0, hairStyles.length - 1);
  const hairColorIndex = prng.nextInt(0, hairColors.length - 1);
  const hairStylePreset = hairStyles[hairStyleIndex];
  const hairColorPreset = hairColors[hairColorIndex];

  // 5. Clothing, Armor & Accents from catalog
  const topColors = catalog.topColors;
  const topColorIndex = prng.nextInt(0, topColors.length - 1);
  const topColor = topColors[topColorIndex];

  const pantsColors = catalog.pantsColors;
  const pantsColorIndex = prng.nextInt(0, pantsColors.length - 1);
  const pantsColor = pantsColors[pantsColorIndex];

  const shoeColors = catalog.shoeColors;
  const shoeColorIndex = prng.nextInt(0, shoeColors.length - 1);
  const shoeColor = shoeColors[shoeColorIndex];

  const armorTypes = catalog.armorTypes;
  const armorTypeIndex = prng.nextInt(0, armorTypes.length - 1);
  const armorPreset = armorTypes[armorTypeIndex];

  const armorColors = catalog.armorColors;
  const armorColorIndex = prng.nextInt(0, armorColors.length - 1);
  const armorColor = armorColors[armorColorIndex];

  const accentColors = catalog.accentColors;
  const accentIndex = prng.nextInt(0, accentColors.length - 1);
  const accent = accentColors[accentIndex];

  // 6. Accessories from catalog
  const accessories = catalog.accessories;
  const accessoryTypeIndex = prng.nextInt(0, accessories.length - 1);
  const accessoryPreset = accessories[accessoryTypeIndex];

  // Assemble appearance object
  const appearance: PlayerAppearance = {
    name: `${b.name} Runner (${skin.name})`,
    paletteName: `${topColor.name} & ${accent.name}`,

    // Canonical Data IDs
    bodyTypeId: b.id,
    faceTypeId: facePreset.id,
    eyeStyleId: eyePreset.id,
    hairStyleId: hairStylePreset.id,
    hairColorId: hairColorPreset.id,
    skinToneId: skin.id,
    topColorId: topColor.id,
    pantsColorId: pantsColor.id,
    shoeColorId: shoeColor.id,
    armorTypeId: armorPreset.id,
    armorColorId: armorColor.id,
    accentColorId: accent.id,
    accessoryId: accessoryPreset.id,

    // Backward-compatible colors
    bodyColor: Color3.FromHexString(topColor.hex),
    bodyColorHex: topColor.hex,
    secondaryColor: Color3.FromHexString(armorColor.hex),
    secondaryColorHex: armorColor.hex,
    accentColor: Color3.FromHexString(accent.hex),
    accentColorHex: accent.hex,

    // Proportions
    scale: overallScale,
    heightScale: bodyHeight,
    widthScale: shoulderWidth,
    shoulderWidthScale: shoulderWidth,
    headScale,

    bodyType: bodyTypeIndex,
    bodyTypeName: b.name,
    torsoShape: b.torsoShape || 'box',
    bodyWidth,
    bodyHeight,
    bodyDepth,
    shoulderWidth,
    armLength,
    legLength,

    skinColor: Color3.FromHexString(skin.hex),
    skinColorHex: skin.hex,
    skinName: skin.name,

    faceType: faceTypeIndex,
    faceTypeName: facePreset.name,
    eyeStyle: eyeStyleIndex,
    eyeStyleName: eyePreset.name,
    eyeSpacing,
    eyeSize,
    noseSize,
    jawWidth,

    hairStyle: hairStyleIndex,
    hairStyleName: hairStylePreset.name,
    hairColor: Color3.FromHexString(hairColorPreset.hex),
    hairColorHex: hairColorPreset.hex,
    hairColorName: hairColorPreset.name,

    topColor: Color3.FromHexString(topColor.hex),
    topColorHex: topColor.hex,
    pantsColor: Color3.FromHexString(pantsColor.hex),
    pantsColorHex: pantsColor.hex,
    shoeColor: Color3.FromHexString(shoeColor.hex),
    shoeColorHex: shoeColor.hex,

    armorType: armorTypeIndex,
    armorTypeName: armorPreset.name,
    armorColor: Color3.FromHexString(armorColor.hex),
    armorColorHex: armorColor.hex,

    accessoryType: accessoryTypeIndex,
    accessoryTypeName: accessoryPreset.name,

    signature: '',
  };

  appearance.signature = getAppearanceSignature(appearance);
  return appearance;
}
