import type { CharacterStats, DecayRates, GameTime, ActionType } from '@/types';

export const INITIAL_STATS: CharacterStats = {
  energy: 100,
  hygiene: 100,
  fun: 80,
  social: 70,
  hunger: 90,
};

export const DECAY_RATES: DecayRates = {
  energy: 0.5,
  hygiene: 0.3,
  fun: 0.4,
  social: 0.25,
  hunger: 0.6,
};

export const INITIAL_GAME_TIME: GameTime = {
  hours: 8,
  minutes: 0,
  day: 1,
};

export const GAME_SPEED = 1;

export const CHARACTER_RADIUS = 0.6;
export const MOVE_SPEED = 0.1;

export const WALL_BOUNDS = {
  minX: -9.5,
  maxX: 9.5,
  minZ: -9.5,
  maxZ: 9.5,
};

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

export const ACTION_DURATIONS: Record<Exclude<ActionType, 'eat' | 'sit' | 'watch'>, number> = {
  sleep: 5,
  phone: 4,
  work: 6,
  shower: 3,
  chat: 4,
};

export const STORAGE_KEYS = {
  SAVE: 'simGameSave',
  SESSION: 'simGameSession',
} as const;
