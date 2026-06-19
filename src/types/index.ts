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

export interface CharacterPosition {
  x: number;
  y: number;
  z: number;
}

export interface SessionData {
  playerName: string;
  startTime: number;
}

export interface SaveData {
  playerName: string;
  stats: Stats;
  gameTime: GameTime;
  characterPosition: CharacterPosition | null;
  savedAt: number;
}

export type ActionType = 'eat' | 'sleep' | 'phone' | 'work' | 'shower' | 'chat' | 'watch' | 'sit';

export type FurnitureType = 'kitchen' | 'sofa' | 'bed' | 'desk' | 'shower' | 'tv';

export type FoodType = 'snack' | 'meal' | 'gourmet';

export interface Collider {
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WallBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const ACTION_NAMES: Record<ActionType, string> = {
  eat: '吃饭',
  sleep: '睡觉',
  phone: '玩手机',
  work: '工作',
  shower: '洗澡',
  chat: '聊天',
  watch: '看电视',
  sit: '休息',
};

export const FURNITURE_ACTION_NAMES: Record<FurnitureType, string> = {
  kitchen: '做饭',
  sofa: '休息',
  bed: '睡觉',
  desk: '工作',
  shower: '洗澡',
  tv: '看电视',
};
