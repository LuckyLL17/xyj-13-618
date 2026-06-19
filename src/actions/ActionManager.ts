import type { Character } from '@/character/Character';
import { ACTION_DURATIONS, ACTION_NAMES } from '@/config/constants';
import type { ActionType, CharacterStats } from '@/types';
import {
  ACTION_FINISH_MESSAGES,
  ACTION_START_MESSAGES,
  ACTION_TICK_EFFECTS,
} from './actionEffects';

type TickActionKey = keyof typeof ACTION_TICK_EFFECTS;

export interface ActionCallbacks {
  onMessage: (text: string) => void;
  onShowCookingModal: () => void;
  onActionFinished?: () => void;
}

/**
 * 动作管理器：维护 currentAction、计时器、属性结算与开始/结束消息。
 */
export class ActionManager {
  currentAction: ActionType | null = null;
  private actionTimer = 0;

  constructor(
    private readonly character: Character,
    private readonly stats: CharacterStats,
    private readonly callbacks: ActionCallbacks
  ) {}

  isBusy(): boolean {
    return this.currentAction !== null || this.character.isSitting || this.character.isSleeping;
  }

  getDisplayName(): string {
    if (this.currentAction) {
      return ACTION_NAMES[this.currentAction] ?? this.currentAction;
    }
    if (this.character.isSleeping) return '睡觉';
    if (this.character.isSitting) return '休息';
    return '当前动作';
  }

  /**
   * 启动一个动作。eat 会弹出做饭弹框，其余动作直接进入。
   */
  start(action: ActionType): void {
    this.currentAction = action;
    this.actionTimer = 0;

    switch (action) {
      case 'eat':
        this.callbacks.onShowCookingModal();
        break;
      case 'sleep':
        this.character.lieOnBed();
        this.callbacks.onMessage(ACTION_START_MESSAGES.sleep);
        this.actionTimer = ACTION_DURATIONS.sleep;
        break;
      case 'phone':
        this.callbacks.onMessage(ACTION_START_MESSAGES.phone);
        this.actionTimer = ACTION_DURATIONS.phone;
        break;
      case 'work':
        this.callbacks.onMessage(ACTION_START_MESSAGES.work);
        this.actionTimer = ACTION_DURATIONS.work;
        break;
      case 'shower':
        this.callbacks.onMessage(ACTION_START_MESSAGES.shower);
        this.actionTimer = ACTION_DURATIONS.shower;
        break;
      case 'chat':
        this.callbacks.onMessage(ACTION_START_MESSAGES.chat);
        this.actionTimer = ACTION_DURATIONS.chat;
        break;
      case 'sit':
        this.character.sitOnSofa();
        this.callbacks.onMessage(ACTION_START_MESSAGES.sit);
        break;
      case 'watch':
        this.callbacks.onMessage(ACTION_START_MESSAGES.watch);
        break;
    }
  }

  update(deltaTime: number): void {
    if (!this.currentAction) return;
    const key = this.currentAction;

    if (key in ACTION_TICK_EFFECTS) {
      const tickKey = key as TickActionKey;
      this.applyTick(tickKey, deltaTime);
      this.actionTimer -= deltaTime;
      if (this.actionTimer <= 0) {
        this.finish(tickKey);
      }
    }
  }

  private applyTick(key: TickActionKey, dt: number): void {
    const eff = ACTION_TICK_EFFECTS[key] as Record<keyof CharacterStats, number | undefined>;
    (Object.keys(eff) as Array<keyof CharacterStats>).forEach((stat) => {
      const delta = eff[stat];
      if (typeof delta !== 'number') return;
      const next = this.stats[stat] + delta * dt;
      this.stats[stat] = Math.max(0, Math.min(100, next));
    });
  }

  private finish(key: TickActionKey): void {
    if (key === 'sleep') {
      this.character.standUp();
    }
    this.currentAction = null;
    this.actionTimer = 0;
    this.callbacks.onMessage(ACTION_FINISH_MESSAGES[key]);
    this.callbacks.onActionFinished?.();
  }

  /**
   * 强制打断当前动作（站起来 + 清空状态）。
   */
  interrupt(): void {
    if (!this.currentAction && !this.character.isSitting && !this.character.isSleeping) return;
    this.character.standUp();
    this.currentAction = null;
    this.actionTimer = 0;
  }
}
