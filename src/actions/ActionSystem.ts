import * as THREE from 'three';
import type { ActionType, FoodType, Stats, DecayRates } from '@/types';
import { ACTION_NAMES } from '@/types';
import type { Character } from '@/character/Character';
import type { UIManager } from '@/ui/UIManager';

type ActionCompleteCallback = () => void;

interface FoodEffect {
  hunger: number;
  fun: number;
  energyCost: number;
  message: string;
}

const FOOD_EFFECTS: Record<FoodType, FoodEffect> = {
  snack: {
    hunger: 15,
    fun: 0,
    energyCost: 5,
    message: '吃了零食，恢复了一点饥饿值',
  },
  meal: {
    hunger: 40,
    fun: 0,
    energyCost: 5,
    message: '吃了正餐，恢复了较多饥饿值',
  },
  gourmet: {
    hunger: 60,
    fun: 20,
    energyCost: 5,
    message: '享用了美食，恢复了大量饥饿值和娱乐值',
  },
};

export class ActionSystem {
  private currentAction: ActionType | null = null;
  private actionTimer: number = 0;
  private stats: Stats;
  private decayRates: DecayRates;
  private character: Character;
  private uiManager: UIManager;
  private onActionComplete?: ActionCompleteCallback;

  constructor(character: Character, uiManager: UIManager, initialStats: Stats, decayRates: DecayRates) {
    this.character = character;
    this.uiManager = uiManager;
    this.stats = { ...initialStats };
    this.decayRates = { ...decayRates };
  }

  getStats(): Stats {
    return { ...this.stats };
  }

  setStats(stats: Stats): void {
    this.stats = { ...stats };
  }

  getCurrentAction(): ActionType | null {
    return this.currentAction;
  }

  isPerformingAction(): boolean {
    return this.currentAction !== null || this.character.isInSittingState() || this.character.isInSleepingState();
  }

  performAction(action: ActionType, onComplete?: ActionCompleteCallback): void {
    if (this.currentAction) {
      return;
    }
    this.executeAction(action, onComplete);
  }

  private executeAction(action: ActionType, onComplete?: ActionCompleteCallback): void {
    this.currentAction = action;
    this.actionTimer = 0;
    this.onActionComplete = onComplete;

    switch (action) {
      case 'eat':
        this.uiManager.showModal('cookingModal');
        break;
      case 'sleep':
        this.startSleep();
        break;
      case 'phone':
        this.startPhone();
        break;
      case 'work':
        this.startWork();
        break;
      case 'shower':
        this.startShower();
        break;
      case 'chat':
        this.startChat();
        break;
      case 'sit':
        this.startSit();
        break;
      case 'watch':
        this.startWatch();
        break;
    }
  }

  eatFood(foodType: FoodType): void {
    const effect = FOOD_EFFECTS[foodType];

    this.stats.hunger = Math.min(100, this.stats.hunger + effect.hunger);
    if (effect.fun > 0) {
      this.stats.fun = Math.min(100, this.stats.fun + effect.fun);
    }
    this.stats.energy = Math.max(0, this.stats.energy - effect.energyCost);

    this.uiManager.showMessage(effect.message);
    this.currentAction = null;
    this.onActionComplete = undefined;
  }

  private startSleep(): void {
    this.character.lieOnBed();
    this.actionTimer = 5;
    this.uiManager.showMessage('躺在床上睡觉...');
  }

  private startPhone(): void {
    this.uiManager.showMessage('开始玩手机...');
    this.actionTimer = 4;
  }

  private startWork(): void {
    this.uiManager.showMessage('开始工作...');
    this.actionTimer = 6;
  }

  private startShower(): void {
    this.uiManager.showMessage('开始洗澡...');
    this.actionTimer = 3;
  }

  private startChat(): void {
    this.uiManager.showMessage('开始聊天...');
    this.actionTimer = 4;
  }

  private startSit(): void {
    this.character.sitOnSofa();
    this.uiManager.showMessage('坐在沙发上休息...');
  }

  private startWatch(): void {
    this.uiManager.showMessage('开始看电视...');
    this.actionTimer = 4;
  }

  interruptAction(): void {
    if (!this.currentAction && !this.character.isInSittingState() && !this.character.isInSleepingState()) {
      return;
    }

    this.character.standUp();
    this.currentAction = null;
    this.actionTimer = 0;
    this.onActionComplete = undefined;
    this.uiManager.showMessage('已打断当前动作');
  }

  completeAction(message: string): void {
    this.character.standUp();
    this.currentAction = null;
    this.actionTimer = 0;
    this.uiManager.showMessage(message);
    if (this.onActionComplete) {
      this.onActionComplete();
      this.onActionComplete = undefined;
    }
  }

  update(deltaTime: number): void {
    if (!this.currentAction) return;

    switch (this.currentAction) {
      case 'sleep':
        this.updateSleep(deltaTime);
        break;
      case 'phone':
        this.updatePhone(deltaTime);
        break;
      case 'work':
        this.updateWork(deltaTime);
        break;
      case 'shower':
        this.updateShower(deltaTime);
        break;
      case 'chat':
        this.updateChat(deltaTime);
        break;
      case 'watch':
        this.updateWatch(deltaTime);
        break;
    }
  }

  private updateSleep(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.energy = Math.min(100, this.stats.energy + 2 * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.completeAction('睡醒了，精力充沛！');
    }
  }

  private updatePhone(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.fun = Math.min(100, this.stats.fun + 1.5 * deltaTime);
    this.stats.social = Math.min(100, this.stats.social + 0.5 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.completeAction('玩手机结束，心情不错！');
    }
  }

  private updateWork(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.energy = Math.max(0, this.stats.energy - 1 * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - 0.5 * deltaTime);
    this.stats.fun = Math.max(0, this.stats.fun - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.completeAction('工作完成！虽然有点累但很有成就感。');
    }
  }

  private updateShower(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.hygiene = Math.min(100, this.stats.hygiene + 3 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.2 * deltaTime);

    if (this.actionTimer <= 0) {
      this.completeAction('洗完澡，干干净净！');
    }
  }

  private updateChat(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.social = Math.min(100, this.stats.social + 2 * deltaTime);
    this.stats.fun = Math.min(100, this.stats.fun + 1 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.completeAction('聊天结束，很开心！');
    }
  }

  private updateWatch(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.fun = Math.min(100, this.stats.fun + 2 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.2 * deltaTime);

    if (this.actionTimer <= 0) {
      this.completeAction('电视看完了！');
    }
  }

  updateStatsDecay(deltaTime: number): void {
    this.stats.energy = Math.max(0, this.stats.energy - this.decayRates.energy * deltaTime);
    this.stats.hygiene = Math.max(0, this.stats.hygiene - this.decayRates.hygiene * deltaTime);
    this.stats.fun = Math.max(0, this.stats.fun - this.decayRates.fun * deltaTime);
    this.stats.social = Math.max(0, this.stats.social - this.decayRates.social * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - this.decayRates.hunger * deltaTime);
  }

  applyOfflineDecay(seconds: number): void {
    const decayMultiplier = 0.5;

    this.stats.energy = Math.max(0, this.stats.energy - this.decayRates.energy * seconds * decayMultiplier);
    this.stats.hygiene = Math.max(0, this.stats.hygiene - this.decayRates.hygiene * seconds * decayMultiplier);
    this.stats.fun = Math.max(0, this.stats.fun - this.decayRates.fun * seconds * decayMultiplier);
    this.stats.social = Math.max(0, this.stats.social - this.decayRates.social * seconds * decayMultiplier);
    this.stats.hunger = Math.max(0, this.stats.hunger - this.decayRates.hunger * seconds * decayMultiplier);
  }

  getActionName(action: ActionType): string {
    return ACTION_NAMES[action];
  }

  getCurrentActionName(): string {
    if (this.currentAction) {
      return ACTION_NAMES[this.currentAction];
    }
    if (this.character.isInSleepingState()) {
      return '睡觉';
    }
    if (this.character.isInSittingState()) {
      return '休息';
    }
    return '当前动作';
  }
}
