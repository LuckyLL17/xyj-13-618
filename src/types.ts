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

export interface FurnitureUserData {
  type: FurnitureType;
  action: string;
}

export interface SaveData {
  playerName: string;
  stats: Stats;
  gameTime: GameTime;
  characterPosition: { x: number; y: number; z: number } | null;
  savedAt: number;
}

export interface SessionData {
  playerName: string;
  startTime: number;
}

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export interface GameState {
  playerName: string;
  gameStarted: boolean;
  stats: Stats;
  gameTime: GameTime;
  gameSpeed: number;
  currentAction: ActionType | null;
  actionTimer: number;
  isSitting: boolean;
  isSleeping: boolean;
  isMoving: boolean;
  targetPosition: THREE.Vector3 | null;
  afterMoveCallback: (() => void) | null;
  pendingAction: ActionType | null;
  pendingFurniture: THREE.Mesh | null;
}
