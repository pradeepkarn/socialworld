import { Color3 } from '@babylonjs/core';

export interface PlayerAppearance {
  name: string;
  paletteName: string;
  bodyColor: Color3;
  bodyColorHex: string;
  secondaryColor: Color3;
  secondaryColorHex: string;
  accentColor: Color3;
  accentColorHex: string;
  scale: number;        // Overall scale multiplier: 0.94 - 1.06
  heightScale: number;  // Vertical torso/leg scale: 0.95 - 1.07
  widthScale: number;   // Horizontal shoulder width: 0.94 - 1.06
  headScale: number;    // Head diameter scale: 0.96 - 1.04
}

interface ColorPaletteDef {
  name: string;
  bodyHex: string;
  secondaryHex: string;
  accentHex: string;
}

// Curated, visually pleasant, distinct palettes with strong contrast against urban concrete
const PALETTES: ColorPaletteDef[] = [
  {
    name: 'Cobalt Blue',
    bodyHex: '#1d4ed8',      // Rich royal cobalt
    secondaryHex: '#0f172a', // Dark slate armor
    accentHex: '#38bdf8',    // Cyan glow
  },
  {
    name: 'Sunset Orange',
    bodyHex: '#c2410c',      // Warm terracotta orange
    secondaryHex: '#18181b', // Obsidian armor
    accentHex: '#fb923c',    // Coral neon
  },
  {
    name: 'Emerald Jade',
    bodyHex: '#047857',      // Deep forest emerald
    secondaryHex: '#062016', // Dark pine armor
    accentHex: '#34d399',    // Mint glow
  },
  {
    name: 'Royal Purple',
    bodyHex: '#6b21a8',      // Imperial amethyst purple
    secondaryHex: '#1e1b4b', // Deep midnight armor
    accentHex: '#c084fc',    // Lavender neon
  },
  {
    name: 'Crimson Red',
    bodyHex: '#b91c1c',      // Vibrant dark ruby
    secondaryHex: '#1c1917', // Carbon armor
    accentHex: '#f87171',    // Bright red neon
  },
  {
    name: 'Cyber Teal',
    bodyHex: '#0f766e',      // Dark cyan ocean teal
    secondaryHex: '#022c22', // Deep hunter armor
    accentHex: '#2dd4bf',    // Aqua neon
  },
  {
    name: 'Warm Amber',
    bodyHex: '#b45309',      // Deep golden honey
    secondaryHex: '#1c1917', // Dark bronze armor
    accentHex: '#facc15',    // Electric gold
  },
  {
    name: 'Rose Pink',
    bodyHex: '#be185d',      // Vivid magenta rose
    secondaryHex: '#18181b', // Dark onyx armor
    accentHex: '#f472b6',    // Hot pink neon
  },
];

/**
 * Standard integer hash function (FNV-1a) for deterministic seed generation.
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Derives a stable, deterministic set of appearance parameters from a player's ID.
 */
export function getDeterministicAppearance(playerId: string): PlayerAppearance {
  const seed = hashString(playerId || 'player_default');

  // Deterministically select palette
  const paletteIndex = seed % PALETTES.length;
  const p = PALETTES[paletteIndex];

  // Subtle variations in body proportions
  // Height: 0.95 to 1.07 (subtle tall vs compact silhouette)
  const heightScale = 0.95 + ((seed >> 3) % 13) * 0.01;

  // Width: 0.94 to 1.06 (subtle broad vs slender build)
  const widthScale = 0.94 + ((seed >> 7) % 13) * 0.01;

  // Head: 0.96 to 1.04
  const headScale = 0.96 + ((seed >> 11) % 9) * 0.01;

  // Scale: 0.96 to 1.04
  const overallScale = 0.96 + ((seed >> 15) % 9) * 0.01;

  return {
    name: p.name,
    paletteName: p.name,
    bodyColor: Color3.FromHexString(p.bodyHex),
    bodyColorHex: p.bodyHex,
    secondaryColor: Color3.FromHexString(p.secondaryHex),
    secondaryColorHex: p.secondaryHex,
    accentColor: Color3.FromHexString(p.accentHex),
    accentColorHex: p.accentHex,
    scale: Number(overallScale.toFixed(3)),
    heightScale: Number(heightScale.toFixed(3)),
    widthScale: Number(widthScale.toFixed(3)),
    headScale: Number(headScale.toFixed(3)),
  };
}
