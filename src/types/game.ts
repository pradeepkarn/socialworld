export type AnimationState = 'idle' | 'walk' | 'run' | 'jump' | 'handshake';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export interface IVector3 {
  x: number;
  y: number;
  z: number;
}

export interface IQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface IPlayerState {
  id: string;
  name: string;
  position: IVector3;
  rotation: IQuaternion;
  animationState: AnimationState;
  velocity: IVector3;
  isGrounded: boolean;
  credits: number;
  inventory: IInventoryItem[];
}

export interface IInventoryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'tech' | 'apparel' | 'consumable' | 'vehicle';
  icon: string;
  quantity: number;
  equipped?: boolean;
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'tech' | 'apparel' | 'consumable' | 'vehicle';
  icon: string;
  stock?: number;
}

export interface IShop {
  id: string;
  name: string;
  tagline: string;
  category: string;
  position: IVector3;
  triggerRadius: number;
  products: IProduct[];
  bannerColor: string;
}

export interface IInteractionPrompt {
  visible: boolean;
  message: string;
  targetName?: string;
  actionKey: string;
  shopId?: string;
}

export interface IGameSettings {
  shadows: boolean;
  bloom: boolean;
  fog: boolean;
  antialiasing: boolean;
  soundEnabled: boolean;
  cameraSensitivity: number;
}

export interface IMinimapEntity {
  id: string;
  type: 'player' | 'shop' | 'npc' | 'poi';
  name: string;
  x: number;
  z: number;
  rotationY?: number;
  color?: string;
}
