import type {
  ActionType,
  FoodType,
  FurnitureType,
  ActionSystemCallbacks,
  Stats,
  FoodEffect,
} from '../types';

export class ActionSystem {
  private currentAction: ActionType | null = null;
  private actionTimer = 0;
  private pendingAction: ActionType | null = null;
  private pendingFurnitureType: FurnitureType | null = null;

  public actionNames: Record<ActionType, string> = {
    eat: '吃饭',
    sleep: '睡觉',
    phone: '玩手机',
    work: '工作',
    shower: '洗澡',
    chat: '聊天',
    watch: '看电视',
    sit: '休息',
  };

  private foodEffects: Record<FoodType, FoodEffect> = {
    snack: { hunger: 15, fun: 0, message: '吃了零食，恢复了一点饥饿值' },
    meal: { hunger: 40, fun: 0, message: '吃了正餐，恢复了较多饥饿值' },
    gourmet: { hunger: 60, fun: 20, message: '享用了美食，恢复了大量饥饿值和娱乐值' },
  };

  private furnitureTypeNames: Record<FurnitureType, string> = {
    kitchen: '做饭',
    sofa: '休息',
    bed: '睡觉',
    desk: '工作',
    shower: '洗澡',
    tv: '看电视',
  };

  private callbacks: ActionSystemCallbacks;
  private stats: Stats;

  constructor(callbacks: ActionSystemCallbacks, stats: Stats) {
    this.callbacks = callbacks;
    this.stats = stats;
  }

  get CurrentAction(): ActionType | null {
    return this.currentAction;
  }

  get IsActive(): boolean {
    return this.currentAction !== null;
  }

  updateStatsRef(stats: Stats): void {
    this.stats = stats;
  }

  requestAction(action: ActionType): boolean {
    if (this.currentAction) {
      this.pendingAction = action;
      this.pendingFurnitureType = null;
      return false;
    }
    this.executeAction(action);
    return true;
  }

  requestFurnitureInteraction(furnitureType: FurnitureType, isBusy: boolean): boolean {
    if (isBusy) {
      this.pendingAction = null;
      this.pendingFurnitureType = furnitureType;
      return false;
    }
    return true;
  }

  getPendingAction(): ActionType | null {
    return this.pendingAction;
  }

  getPendingFurnitureType(): FurnitureType | null {
    return this.pendingFurnitureType;
  }

  getInterruptInfo(): { currentName: string; newName: string; message: string } {
    let currentActionName = '当前动作';
    if (this.currentAction) {
      currentActionName = this.actionNames[this.currentAction];
    }

    let newActionName = '';
    if (this.pendingAction) {
      newActionName = this.actionNames[this.pendingAction] || this.pendingAction;
    } else if (this.pendingFurnitureType) {
      newActionName = this.furnitureTypeNames[this.pendingFurnitureType];
    }

    return {
      currentName: currentActionName,
      newName: newActionName,
      message: `角色正在"${currentActionName}"，确定要打断并开始"${newActionName}"吗？${this.pendingAction ? '\n\n打断后角色将从当前状态恢复。' : ''}`,
    };
  }

  confirmInterrupt(confirmed: boolean): { action: ActionType | null; furniture: FurnitureType | null } {
    if (confirmed) {
      this.interruptCurrentAction();
      const action = this.pendingAction;
      const furniture = this.pendingFurnitureType;
      this.pendingAction = null;
      this.pendingFurnitureType = null;
      return { action, furniture };
    } else {
      this.pendingAction = null;
      this.pendingFurnitureType = null;
      return { action: null, furniture: null };
    }
  }

  interruptCurrentAction(): void {
    if (!this.currentAction) return;

    this.callbacks.onStandUp();

    this.currentAction = null;
    this.actionTimer = 0;

    this.callbacks.onShowMessage('已打断当前动作');
  }

  executeAction(action: ActionType): void {
    this.currentAction = action;
    this.actionTimer = 0;

    switch (action) {
      case 'eat':
        this.callbacks.onShowModal('cookingModal');
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
        this.sitOnSofa();
        break;
      case 'watch':
        this.startWatch();
        break;
    }
  }

  eatFood(foodType: FoodType): void {
    const effect = this.foodEffects[foodType];

    this.stats.hunger = Math.min(100, this.stats.hunger + effect.hunger);
    if (effect.fun > 0) {
      this.stats.fun = Math.min(100, this.stats.fun + effect.fun);
    }
    this.stats.energy = Math.max(0, this.stats.energy - 5);

    this.callbacks.onUpdateStats({ ...this.stats });
    this.callbacks.onShowMessage(effect.message);
    this.currentAction = null;
  }

  private startSleep(): void {
    this.callbacks.onShowMessage('躺在床上睡觉...');
    this.actionTimer = 5;
  }

  private startPhone(): void {
    this.callbacks.onShowMessage('开始玩手机...');
    this.actionTimer = 4;
  }

  private startWork(): void {
    this.callbacks.onShowMessage('开始工作...');
    this.actionTimer = 6;
  }

  private startShower(): void {
    this.callbacks.onShowMessage('开始洗澡...');
    this.actionTimer = 3;
  }

  private startChat(): void {
    this.callbacks.onShowMessage('开始聊天...');
    this.actionTimer = 4;
  }

  private startWatch(): void {
    this.callbacks.onShowMessage('开始看电视...');
  }

  private sitOnSofa(): void {
    this.callbacks.onShowMessage('坐在沙发上休息...');
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
    }
  }

  private updateSleep(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.energy = Math.min(100, this.stats.energy + 2 * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.callbacks.onStandUp();
      this.currentAction = null;
      this.callbacks.onUpdateStats({ ...this.stats });
      this.callbacks.onShowMessage('睡醒了，精力充沛！');
    }
  }

  private updatePhone(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.fun = Math.min(100, this.stats.fun + 1.5 * deltaTime);
    this.stats.social = Math.min(100, this.stats.social + 0.5 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.currentAction = null;
      this.callbacks.onUpdateStats({ ...this.stats });
      this.callbacks.onShowMessage('玩手机结束，心情不错！');
    }
  }

  private updateWork(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.energy = Math.max(0, this.stats.energy - 1 * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - 0.5 * deltaTime);
    this.stats.fun = Math.max(0, this.stats.fun - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.currentAction = null;
      this.callbacks.onUpdateStats({ ...this.stats });
      this.callbacks.onShowMessage('工作完成！虽然有点累但很有成就感。');
    }
  }

  private updateShower(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.hygiene = Math.min(100, this.stats.hygiene + 3 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.2 * deltaTime);

    if (this.actionTimer <= 0) {
      this.currentAction = null;
      this.callbacks.onUpdateStats({ ...this.stats });
      this.callbacks.onShowMessage('洗完澡，干干净净！');
    }
  }

  private updateChat(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    this.stats.social = Math.min(100, this.stats.social + 2 * deltaTime);
    this.stats.fun = Math.min(100, this.stats.fun + 1 * deltaTime);
    this.stats.energy = Math.max(0, this.stats.energy - 0.3 * deltaTime);

    if (this.actionTimer <= 0) {
      this.currentAction = null;
      this.callbacks.onUpdateStats({ ...this.stats });
      this.callbacks.onShowMessage('聊天结束，很开心！');
    }
  }

  completeSitAction(): void {
    if (this.currentAction === 'sit') {
      this.currentAction = null;
    }
  }

  completeWatchAction(): void {
    if (this.currentAction === 'watch') {
      this.currentAction = null;
    }
  }

  clearAction(): void {
    this.currentAction = null;
    this.actionTimer = 0;
    this.pendingAction = null;
    this.pendingFurnitureType = null;
  }
}
