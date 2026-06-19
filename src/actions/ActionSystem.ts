import type { ActionType, FoodType, Stats } from '../types';

export interface ActionEffects {
  energy?: number;
  hygiene?: number;
  fun?: number;
  social?: number;
  hunger?: number;
}

export type MessageCallback = (message: string) => void;
export type StatsUpdateCallback = () => void;

export class ActionSystem {
  private stats: Stats;
  private actionNames: Record<ActionType, string> = {
    eat: '吃饭',
    sleep: '睡觉',
    phone: '玩手机',
    work: '工作',
    shower: '洗澡',
    chat: '聊天',
    watch: '看电视',
    sit: '休息',
  };

  private onMessage: MessageCallback;
  private onStatsUpdate: StatsUpdateCallback;

  constructor(
    stats: Stats,
    onMessage: MessageCallback,
    onStatsUpdate: StatsUpdateCallback
  ) {
    this.stats = stats;
    this.onMessage = onMessage;
    this.onStatsUpdate = onStatsUpdate;
  }

  getActionName(action: ActionType): string {
    return this.actionNames[action] || action;
  }

  getFurnitureActionName(type: string): string {
    const furnitureNames: Record<string, string> = {
      kitchen: '做饭',
      sofa: '休息',
      bed: '睡觉',
      desk: '工作',
      shower: '洗澡',
      tv: '看电视',
    };
    return furnitureNames[type] || type;
  }

  eatFood(foodType: FoodType): { effects: ActionEffects; message: string } {
    let effects: ActionEffects = {};
    let message = '';

    switch (foodType) {
      case 'snack':
        effects = { hunger: 15 };
        message = '吃了零食，恢复了一点饥饿值';
        break;
      case 'meal':
        effects = { hunger: 40 };
        message = '吃了正餐，恢复了较多饥饿值';
        break;
      case 'gourmet':
        effects = { hunger: 60, fun: 20 };
        message = '享用了美食，恢复了大量饥饿值和娱乐值';
        break;
    }

    this.applyEffects(effects);
    this.stats.energy = Math.max(0, this.stats.energy - 5);
    this.onMessage(message);
    this.onStatsUpdate();

    return { effects, message };
  }

  updateSleep(deltaTime: number): { finished: boolean; effects: ActionEffects } {
    const effects: ActionEffects = {
      energy: 2 * deltaTime,
      hunger: -0.3 * deltaTime,
    };
    this.applyEffects(effects);

    return { finished: false, effects };
  }

  finishSleep(): void {
    this.onMessage('睡醒了，精力充沛！');
  }

  updatePhone(deltaTime: number): { finished: boolean; effects: ActionEffects } {
    const effects: ActionEffects = {
      fun: 1.5 * deltaTime,
      social: 0.5 * deltaTime,
      energy: -0.3 * deltaTime,
    };
    this.applyEffects(effects);

    return { finished: false, effects };
  }

  finishPhone(): void {
    this.onMessage('玩手机结束，心情不错！');
  }

  updateWork(deltaTime: number): { finished: boolean; effects: ActionEffects } {
    const effects: ActionEffects = {
      energy: -1 * deltaTime,
      hunger: -0.5 * deltaTime,
      fun: -0.3 * deltaTime,
    };
    this.applyEffects(effects);

    return { finished: false, effects };
  }

  finishWork(): void {
    this.onMessage('工作完成！虽然有点累但很有成就感。');
  }

  updateShower(deltaTime: number): { finished: boolean; effects: ActionEffects } {
    const effects: ActionEffects = {
      hygiene: 3 * deltaTime,
      energy: -0.2 * deltaTime,
    };
    this.applyEffects(effects);

    return { finished: false, effects };
  }

  finishShower(): void {
    this.onMessage('洗完澡，干干净净！');
  }

  updateChat(deltaTime: number): { finished: boolean; effects: ActionEffects } {
    const effects: ActionEffects = {
      social: 2 * deltaTime,
      fun: 1 * deltaTime,
      energy: -0.3 * deltaTime,
    };
    this.applyEffects(effects);

    return { finished: false, effects };
  }

  finishChat(): void {
    this.onMessage('聊天结束，很开心！');
  }

  updateWatch(): void {
    this.onMessage('开始看电视...');
  }

  private applyEffects(effects: ActionEffects): void {
    if (effects.energy !== undefined) {
      this.stats.energy = Math.max(0, Math.min(100, this.stats.energy + effects.energy));
    }
    if (effects.hygiene !== undefined) {
      this.stats.hygiene = Math.max(0, Math.min(100, this.stats.hygiene + effects.hygiene));
    }
    if (effects.fun !== undefined) {
      this.stats.fun = Math.max(0, Math.min(100, this.stats.fun + effects.fun));
    }
    if (effects.social !== undefined) {
      this.stats.social = Math.max(0, Math.min(100, this.stats.social + effects.social));
    }
    if (effects.hunger !== undefined) {
      this.stats.hunger = Math.max(0, Math.min(100, this.stats.hunger + effects.hunger));
    }
  }
}
