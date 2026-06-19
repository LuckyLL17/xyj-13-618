import * as THREE from 'three';
import { ActionManager } from '@/actions/ActionManager';
import { applyFoodEffect } from '@/actions/actionEffects';
import { Character } from '@/character/Character';
import { MovementController } from '@/character/Movement';
import {
  ACTION_NAMES,
  DECAY_RATES,
  GAME_SPEED,
  INITIAL_GAME_TIME,
  INITIAL_STATS,
} from '@/config/constants';
import { SaveManager } from '@/save/SaveManager';
import { SceneManager } from '@/scene/SceneManager';
import type {
  ActionType,
  CharacterStats,
  FoodType,
  FurnitureType,
  FurnitureUserData,
  GameTime,
} from '@/types';
import { UIManager } from '@/ui/UIManager';

const FURNITURE_ACTION_LABELS: Record<FurnitureType, string> = {
  kitchen: '做饭',
  sofa: '休息',
  bed: '睡觉',
  desk: '工作',
  shower: '洗澡',
  tv: '看电视',
};

export class Game {
  private playerName = '';
  private gameStarted = false;
  private lastUpdateTime = 0;

  private readonly stats: CharacterStats = { ...INITIAL_STATS };
  private readonly gameTime: GameTime = { ...INITIAL_GAME_TIME };

  private readonly ui = new UIManager();
  private readonly saveManager = new SaveManager();

  private sceneManager?: SceneManager;
  private character?: Character;
  private movement?: MovementController;
  private actionManager?: ActionManager;

  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();

  private pendingAction: ActionType | null = null;
  private pendingFurniture: THREE.Object3D | null = null;

  init(): void {
    this.bindUIEvents();
    this.checkSession();
  }

  private bindUIEvents(): void {
    this.ui.bindStartButton(() => this.handleStart());
    this.ui.bindLoadButton(() => this.handleLoad());
    this.ui.bindSaveButton(() => this.handleSave());
    this.ui.bindActionButtons((action) => this.performAction(action as ActionType));
    this.ui.bindFoodButtons((food) => this.handleEatFood(food as FoodType));
    this.ui.bindCloseCookingButton(() => {
      this.ui.hideModal('cookingModal');
      if (this.actionManager?.currentAction === 'eat') {
        this.actionManager.currentAction = null;
      }
    });
    this.ui.bindConfirmButtons(
      () => this.confirmInterruptAction(true),
      () => this.confirmInterruptAction(false)
    );
  }

  private checkSession(): void {
    const session = this.saveManager.loadSession();
    if (session) {
      this.playerName = session.playerName;
      this.startGameScreen();
    }
  }

  private handleStart(): void {
    const name = this.ui.getPlayerNameInput();
    if (!name) {
      this.ui.showMessage('请输入你的名字！');
      return;
    }
    this.playerName = name;
    this.saveManager.saveSession(name);
    this.startGameScreen();
  }

  private handleLoad(): void {
    const data = this.saveManager.loadGame();
    if (!data) {
      this.ui.showMessage('没有找到存档！');
      return;
    }
    this.playerName = data.playerName;
    Object.assign(this.stats, data.stats);
    Object.assign(this.gameTime, data.gameTime);
    if (data.savedAt) {
      this.saveManager.applyOfflineDecay(this.stats, this.gameTime, data.savedAt);
    }
    this.saveManager.saveSession(this.playerName);
    this.startGameScreen();
    if (data.characterPosition && this.character) {
      this.character.setPosition(
        data.characterPosition.x,
        data.characterPosition.y,
        data.characterPosition.z
      );
    }
    this.ui.showMessage('存档已加载！');
  }

  private handleSave(): void {
    const pos = this.character
      ? {
          x: this.character.position.x,
          y: this.character.position.y,
          z: this.character.position.z,
        }
      : null;
    this.saveManager.saveGame(this.playerName, this.stats, this.gameTime, pos);
    this.ui.showMessage('游戏已保存！');
  }

  private startGameScreen(): void {
    this.ui.showGame(this.playerName);
    this.initThreeJS();
    this.gameStarted = true;
    this.lastUpdateTime = Date.now();
    this.refreshUI();
    this.animate();
  }

  private initThreeJS(): void {
    const container = this.ui.getGameCanvasContainer();
    this.sceneManager = new SceneManager(container);
    this.character = new Character();
    this.sceneManager.scene.add(this.character.group);

    this.movement = new MovementController(this.character, [
      ...this.sceneManager.furniture.colliders,
    ]);

    this.actionManager = new ActionManager(this.character, this.stats, {
      onMessage: (text) => this.ui.showMessage(text),
      onShowCookingModal: () => this.ui.showModal('cookingModal'),
    });

    this.setupClickHandler();
  }

  private setupClickHandler(): void {
    if (!this.sceneManager) return;
    this.sceneManager.renderer.domElement.addEventListener('click', (event: MouseEvent) =>
      this.onMouseClick(event)
    );
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.sceneManager) return;
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const intersects = this.raycaster.intersectObjects(this.sceneManager.clickableObjects);
    if (intersects.length === 0) return;

    const obj = intersects[0].object;
    const point = intersects[0].point;
    const userData = obj.userData as Partial<FurnitureUserData>;

    if (userData?.type) {
      this.handleFurnitureClick(obj as THREE.Mesh);
    } else if (obj.name === 'floor') {
      this.movement?.cancel();
      this.character?.standUp();
      this.movement?.moveTo(point.x, point.z);
    }
  }

  private handleFurnitureClick(furniture: THREE.Mesh): void {
    if (!this.actionManager) return;
    if (this.actionManager.isBusy()) {
      this.pendingFurniture = furniture;
      const cur = this.actionManager.getDisplayName();
      const ud = furniture.userData as FurnitureUserData;
      const next = FURNITURE_ACTION_LABELS[ud.type];
      this.ui.showConfirmModal(
        '⚠️ 正在进行动作',
        `角色正在“${cur}”，确定要打断并开始“${next}”吗？`
      );
      return;
    }
    this.executeFurnitureInteraction(furniture);
  }

  private executeFurnitureInteraction(furniture: THREE.Mesh): void {
    const ud = furniture.userData as FurnitureUserData;
    switch (ud.type) {
      case 'kitchen':
        this.moveToFurniture(furniture, () => this.ui.showModal('cookingModal'));
        break;
      case 'sofa':
        this.moveToFurniture(furniture, () => this.actionManager?.start('sit'));
        break;
      case 'bed':
        this.moveToFurniture(furniture, () => this.actionManager?.start('sleep'));
        break;
      case 'desk':
        this.moveToFurniture(furniture, () => this.actionManager?.start('work'));
        break;
      case 'shower':
        this.moveToFurniture(furniture, () => this.actionManager?.start('shower'));
        break;
      case 'tv':
        this.movement?.moveTo(3, 2);
        this.actionManager?.start('watch');
        break;
    }
  }

  private moveToFurniture(furniture: THREE.Mesh, callback: () => void): void {
    if (!this.movement || !this.character) return;
    const ud = furniture.userData as FurnitureUserData;
    const pos = furniture.position;
    const targetX = pos.x;
    let targetZ = pos.z;
    let isInteractionPosition = false;

    if (ud.type === 'sofa') {
      targetZ = pos.z + 0.2;
      isInteractionPosition = true;
    } else if (ud.type === 'bed') {
      targetZ = pos.z - 0.5;
      isInteractionPosition = true;
    } else if (ud.type === 'kitchen' || ud.type === 'desk' || ud.type === 'shower') {
      targetZ = pos.z + 1.5;
    }

    if (isInteractionPosition) {
      let approach: THREE.Vector3;
      if (ud.type === 'sofa') {
        approach = new THREE.Vector3(targetX, 0, targetZ - 1.5);
      } else {
        approach = new THREE.Vector3(targetX + 2, 0, targetZ);
      }
      const ok = this.movement.moveToTarget(approach, () => {
        this.character?.setPosition(targetX, 0, targetZ);
        callback();
      });
      if (!ok) {
        this.character.setPosition(targetX, 0, targetZ);
        callback();
      }
    } else {
      const ok = this.movement.moveToTarget(new THREE.Vector3(targetX, 0, targetZ), callback);
      if (!ok) this.ui.showMessage('无法到达该位置！');
    }
  }

  private performAction(action: ActionType): void {
    if (!this.actionManager) return;
    if (this.actionManager.currentAction) {
      this.pendingAction = action;
      const cur =
        ACTION_NAMES[this.actionManager.currentAction] ?? this.actionManager.currentAction;
      const next = ACTION_NAMES[action] ?? action;
      this.ui.showConfirmModal(
        '⚠️ 正在进行动作',
        `角色正在“${cur}”，确定要打断并开始“${next}”吗？\n\n打断后角色将从当前状态恢复。`
      );
      return;
    }
    this.actionManager.start(action);
  }

  private confirmInterruptAction(confirmed: boolean): void {
    this.ui.hideModal('confirmModal');
    if (!confirmed) {
      this.pendingAction = null;
      this.pendingFurniture = null;
      return;
    }
    this.interruptCurrentAction();
    if (this.pendingAction) {
      const action = this.pendingAction;
      this.pendingAction = null;
      this.actionManager?.start(action);
    } else if (this.pendingFurniture) {
      const f = this.pendingFurniture as THREE.Mesh;
      this.pendingFurniture = null;
      this.executeFurnitureInteraction(f);
    }
  }

  private interruptCurrentAction(): void {
    if (!this.actionManager || !this.character || !this.movement) return;
    this.actionManager.interrupt();
    if (this.movement.checkCollision(this.character.position)) {
      this.movement.escapeFromCollider();
    }
    this.ui.showMessage('已打断当前动作');
  }

  private handleEatFood(food: FoodType): void {
    const message = applyFoodEffect(this.stats, food);
    this.ui.showMessage(message);
    if (this.actionManager) this.actionManager.currentAction = null;
    this.refreshUI();
  }

  // ==================== 游戏循环 ====================

  private animate(): void {
    if (!this.gameStarted || !this.sceneManager) return;
    requestAnimationFrame(() => this.animate());

    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.update(deltaTime);
    this.sceneManager.render();
  }

  private update(deltaTime: number): void {
    this.movement?.update(deltaTime);
    this.actionManager?.update(deltaTime);

    this.updateGameTime(deltaTime);

    if (!this.actionManager?.currentAction) {
      this.updateStatsDecay(deltaTime);
    }

    this.refreshUI();
  }

  private updateGameTime(deltaTime: number): void {
    this.gameTime.minutes += deltaTime * GAME_SPEED;
    while (this.gameTime.minutes >= 60) {
      this.gameTime.minutes -= 60;
      this.gameTime.hours++;
      if (this.gameTime.hours >= 24) {
        this.gameTime.hours = 0;
        this.gameTime.day++;
      }
    }
  }

  private updateStatsDecay(deltaTime: number): void {
    this.stats.energy = Math.max(0, this.stats.energy - DECAY_RATES.energy * deltaTime);
    this.stats.hygiene = Math.max(0, this.stats.hygiene - DECAY_RATES.hygiene * deltaTime);
    this.stats.fun = Math.max(0, this.stats.fun - DECAY_RATES.fun * deltaTime);
    this.stats.social = Math.max(0, this.stats.social - DECAY_RATES.social * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - DECAY_RATES.hunger * deltaTime);
  }

  private refreshUI(): void {
    this.ui.updateStats(this.stats);
    this.ui.updateTime(this.gameTime);
    this.ui.updateMood(this.stats);
  }
}
