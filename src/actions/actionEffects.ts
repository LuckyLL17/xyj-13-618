import type { CharacterStats, FoodType } from '@/types';

/**
 * 集中所有动作对属性的影响，便于配置化与单测。
 */

export interface FoodEffect {
  hunger: number;
  fun: number;
  energy: number;
  message: string;
}

export const FOOD_EFFECTS: Record<FoodType, FoodEffect> = {
  snack: { hunger: 15, fun: 0, energy: -5, message: '吃了零食，恢复了一点饥饿值' },
  meal: { hunger: 40, fun: 0, energy: -5, message: '吃了正餐，恢复了较多饥饿值' },
  gourmet: {
    hunger: 60,
    fun: 20,
    energy: -5,
    message: '享用了美食，恢复了大量饥饿值和娱乐值',
  },
};

export function applyFoodEffect(stats: CharacterStats, food: FoodType): string {
  const effect = FOOD_EFFECTS[food];
  stats.hunger = Math.min(100, stats.hunger + effect.hunger);
  if (effect.fun > 0) {
    stats.fun = Math.min(100, stats.fun + effect.fun);
  }
  stats.energy = Math.max(0, stats.energy + effect.energy);
  return effect.message;
}

/** 每个动作每秒对属性的影响（正值为增加，负值为消耗）。*/
export const ACTION_TICK_EFFECTS = {
  sleep: { energy: +2, hunger: -0.3 },
  phone: { fun: +1.5, social: +0.5, energy: -0.3 },
  work: { energy: -1, hunger: -0.5, fun: -0.3 },
  shower: { hygiene: +3, energy: -0.2 },
  chat: { social: +2, fun: +1, energy: -0.3 },
} as const;

export const ACTION_FINISH_MESSAGES = {
  sleep: '睡醒了，精力充沛！',
  phone: '玩手机结束，心情不错！',
  work: '工作完成！虽然有点累但很有成就感。',
  shower: '洗完澡，干干净净！',
  chat: '聊天结束，很开心！',
} as const;

export const ACTION_START_MESSAGES = {
  phone: '开始玩手机...',
  work: '开始工作...',
  shower: '开始洗澡...',
  chat: '开始聊天...',
  sleep: '躺在床上睡觉...',
  sit: '坐在沙发上休息...',
  watch: '开始看电视...',
} as const;
