import * as THREE from 'three';

export interface Stats {
  energy: number;
  hygiene: number;
  fun: number;
  social: number;
  hunger: number;
}

export interface DecayRates {
  energy: number;
  hygiene: number;
  fun: number;
  social: number;
  hunger: number;
}

export interface GameTime {
  hours: number;
  minutes: number;
  day: number;
}

export interface WallBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Collider {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type ActionType = 'eat' | 'sleep' | 'phone' | 'work' | 'shower' | 'chat' | 'watch' | 'sit';

export type FurnitureType = 'kitchen' | 'sofa' | 'bed' | 'desk' | 'shower' | 'tv';

export type FoodType = 'snack' | 'meal' | 'gourmet';

export interface FoodEffect {
  hunger: number;
  fun: number;
  message: string;
}

export interface SessionData {
  playerName: string;
  startTime: number;
}

export interface SaveData {
  playerName: string;
  stats: Stats;
  gameTime: GameTime;
  characterPosition: { x: number; y: number; z: number } | null;
  savedAt: number;
}

export interface FurnitureInteractionData {
  type: FurnitureType;
  action?: string;
}

export interface UIManagerCallbacks {
  onStart: (name: string) => void;
  onLoad: () => boolean;
  onSave: () => void;
  onAction: (action: ActionType) => void;
  onFood: (food: FoodType) => void;
  onConfirmInterrupt: (confirmed: boolean) => void;
}

export interface ActionSystemCallbacks {
  onShowMessage: (text: string) => void;
  onShowModal: (modalId: string) => void;
  onHideModal: (modalId: string) => void;
  onStandUp: () => void;
  onUpdateStats: (stats: Partial<Stats>) => void;
  onActionComplete: () => void;
}

export interface MovementCallbacks {
  onShowMessage: (text: string) => void;
  onReachTarget: (callback?: () => void) => void;
}

export interface SceneClickCallbacks {
  onFloorClick: (x: number, z: number) => void;
  onFurnitureClick: (furniture: THREE.Mesh) => void;
}
