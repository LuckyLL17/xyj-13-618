export type ActionType = 'eat' | 'sleep' | 'phone' | 'work' | 'shower' | 'chat' | 'sit' | 'watch';

export type FurnitureType = 'kitchen' | 'sofa' | 'bed' | 'desk' | 'shower' | 'tv';

export type FoodType = 'snack' | 'meal' | 'gourmet';

export interface CharacterStats {
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

export interface Vector3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface SaveData {
  playerName: string;
  stats: CharacterStats;
  gameTime: GameTime;
  characterPosition: Vector3Tuple | null;
  savedAt: number;
}

export interface SessionData {
  playerName: string;
  startTime: number;
}

export interface AABBCollider {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface FurnitureUserData {
  type: FurnitureType;
  action: ActionType | 'cook';
}
