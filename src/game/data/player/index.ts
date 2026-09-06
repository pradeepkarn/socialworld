import bodyTypesData from './bodyTypes.json';
import facesData from './faces.json';
import hairstylesData from './hairstyles.json';
import colorsData from './colors.json';
import armorData from './armor.json';
import accessoriesData from './accessories.json';

export interface IBodyTypePreset {
  id: string;
  name: string;
  torsoShape?: string;
  width: number;
  height: number;
  depth: number;
  shoulder: number;
  arm: number;
  leg: number;
}

export interface IFacePreset {
  id: string;
  name: string;
  jawWidthMod?: number;
  chinLengthMod?: number;
  hasCyberPlating?: boolean;
}

export interface IOpticPreset {
  id: string;
  name: string;
  meshStyle: string;
  emissive: boolean;
}

export interface IHairstylePreset {
  id: string;
  name: string;
  meshType: string;
  height: number;
  volume: number;
}

export interface IColorPreset {
  id: string;
  name: string;
  hex: string;
}

export interface IArmorPreset {
  id: string;
  name: string;
  coverage: string;
  platingThickness: number;
}

export interface IAccessoryPreset {
  id: string;
  name: string;
  slot: string;
  meshType: string;
}

/**
 * Formal interface decoupling appearance catalog data from avatar generation code.
 * Enables zero-touch migration from static JSON files to dynamic API / database fetching.
 */
export interface IAppearanceCatalog {
  bodyTypes: IBodyTypePreset[];
  faceTypes: IFacePreset[];
  eyeStyles: IOpticPreset[];
  hairStyles: IHairstylePreset[];
  skinTones: IColorPreset[];
  hairColors: IColorPreset[];
  topColors: IColorPreset[];
  pantsColors: IColorPreset[];
  shoeColors: IColorPreset[];
  armorColors: IColorPreset[];
  accentColors: IColorPreset[];
  armorTypes: IArmorPreset[];
  accessories: IAccessoryPreset[];
}

/**
 * Canonical default appearance catalog composed directly from modular JSON definitions.
 */
export const defaultAppearanceCatalog: IAppearanceCatalog = {
  bodyTypes: bodyTypesData.types,
  faceTypes: facesData.types,
  eyeStyles: facesData.optics,
  hairStyles: hairstylesData.styles,
  skinTones: colorsData.skinTones,
  hairColors: colorsData.hairColors,
  topColors: colorsData.topColors,
  pantsColors: colorsData.pantsColors,
  shoeColors: colorsData.shoeColors,
  armorColors: colorsData.armorColors,
  accentColors: colorsData.accentColors,
  armorTypes: armorData.types,
  accessories: accessoriesData.items,
};
