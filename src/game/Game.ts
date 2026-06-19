import * as THREE from 'three';
import type { Stats, DecayRates, GameTime, ActionType, FurnitureType, FoodType } from '@/types';
import { FURNITURE_ACTION_NAMES } from '@/types';
import { SceneManager } from '@/scene/SceneManager';
import { Character } from '@/character/Character';
import { ActionSystem } from '@/actions/ActionSystem';
import { UIManager } from '@/ui/UIManager';
import { StorageManager } from '@/storage';

export class Game {
  private playerName: string = '';
  private gameStarted: boolean = false;

  private sceneManager!: SceneManager;
  private character!: Character;
  private actionSystem!: ActionSystem;
  private uiManager!: UIManager;

  private gameTime: GameTime = {
    hours: 8,
    minutes: 0,
    day: 1,
  };

  private gameSpeed: number = 1;
  private lastUpdateTime: number = 0;

  private targetPosition: THREE.Vector3 | null = null;
  private isMoving: boolean = false;
  private moveSpeed: number = 0.1;
  private afterMoveCallback?: () => void;

  private pendingAction: ActionType | null = null;
  private pendingFurniture: THREE.Mesh | null = null;

  private initialStats: Stats = {
    energy: 100,
    hygiene: 100,
    fun: 80,
    social: 70,
    hunger: 90,
  };

  private decayRates: DecayRates = {
    energy: 0.5,
    hygiene: 0.3,
    fun: 0.4,
    social: 0.25,
    hunger: 0.6,
  };

  constructor() {
    this.uiManager = new UIManager();
    this.init();
  }

  private init(): void {
    this.uiManager.setupEventListeners(
      (name: string) => this.onStart(name),
      () => this.onLoad(),
      () => this.onSave(),
      (action: string) => this.onAction(action as ActionType),
      (food: string) => this.onFoodSelect(food as FoodType),
      (confirmed: boolean) => this.onConfirm(confirmed)
    );
    this.uiManager.setupResizeHandler(() => this.onResize());
    this.checkSession();
  }

  private checkSession(): void {
    const sessionData = StorageManager.getSession();
    if (sessionData) {
      this.playerName = sessionData.playerName;
      this.showGameScreen();
    }
  }

  private onStart(name: string): void {
    this.playerName = name;
    StorageManager.saveSession(this.playerName);
    this.showGameScreen();
  }

  private onLoad(): boolean {
    const saveData = StorageManager.loadGame();
    if (saveData) {
      this.playerName = saveData.playerName;
      this.gameTime = saveData.gameTime;

      if (this.actionSystem) {
        this.actionSystem.setStats(saveData.stats);
      } else {
        this.initialStats = saveData.stats;
      }

      if (saveData.savedAt) {
        const offlineSeconds = StorageManager.calculateOfflineSeconds(saveData.savedAt);
        if (this.actionSystem) {
          this.actionSystem.applyOfflineDecay(offlineSeconds);
        } else {
          this.applyOfflineDecayToInitialStats(offlineSeconds);
        }
        this.applyOfflineTime(offlineSeconds);
      }

      StorageManager.saveSession(this.playerName);
      this.showGameScreen();

      if (saveData.characterPosition && this.character) {
        this.character.setPosition(
          saveData.characterPosition.x,
          saveData.characterPosition.y,
          saveData.characterPosition.z
        );
      }

      this.uiManager.showMessage('存档已加载！');
      return true;
    }
    this.uiManager.showMessage('没有找到存档！');
    return false;
  }

  private applyOfflineDecayToInitialStats(seconds: number): void {
    const decayMultiplier = 0.5;
    this.initialStats.energy = Math.max(
      0,
      this.initialStats.energy - this.decayRates.energy * seconds * decayMultiplier
    );
    this.initialStats.hygiene = Math.max(
      0,
      this.initialStats.hygiene - this.decayRates.hygiene * seconds * decayMultiplier
    );
    this.initialStats.fun = Math.max(
      0,
      this.initialStats.fun - this.decayRates.fun * seconds * decayMultiplier
    );
    this.initialStats.social = Math.max(
      0,
      this.initialStats.social - this.decayRates.social * seconds * decayMultiplier
    );
    this.initialStats.hunger = Math.max(
      0,
      this.initialStats.hunger - this.decayRates.hunger * seconds * decayMultiplier
    );
  }

  private applyOfflineTime(seconds: number): void {
    const gameMinutes = seconds * this.gameSpeed;
    this.gameTime.minutes += gameMinutes;

    while (this.gameTime.minutes >= 60) {
      this.gameTime.minutes -= 60;
      this.gameTime.hours++;
      if (this.gameTime.hours >= 24) {
        this.gameTime.hours = 0;
        this.gameTime.day++;
      }
    }
  }

  private onSave(): void {
    if (!this.character) return;

    const pos = this.character.getPosition();
    const position = {
      x: pos.x,
      y: pos.y,
      z: pos.z,
    };

    StorageManager.saveGame(
      this.playerName,
      this.actionSystem.getStats(),
      this.gameTime,
      position
    );
    this.uiManager.showMessage('游戏已保存！');
  }

  private onAction(action: ActionType): void {
    if (this.actionSystem.isPerformingAction()) {
      const currentActionName = this.actionSystem.getCurrentActionName();
      const newActionName = this.actionSystem.getActionName(action);

      this.pendingAction = action;

      const title = '⚠️ 正在进行动作';
      const message = `角色正在"${currentActionName}"，确定要打断并开始"${newActionName}"吗？\n\n打断后角色将从当前状态恢复。`;

      this.uiManager.showConfirmModal(title, message);
      return;
    }

    this.actionSystem.performAction(action);
  }

  private onFoodSelect(food: FoodType): void {
    this.actionSystem.eatFood(food);
  }

  private onConfirm(confirmed: boolean): void {
    this.uiManager.hideModal('confirmModal');

    if (confirmed) {
      this.actionSystem.interruptAction();

      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        this.actionSystem.performAction(action);
      } else if (this.pendingFurniture) {
        const furniture = this.pendingFurniture;
        this.pendingFurniture = null;
        this.executeFurnitureInteraction(furniture);
      }
    } else {
      this.pendingAction = null;
      this.pendingFurniture = null;
    }
  }

  private onResize(): void {
    if (this.sceneManager) {
      this.sceneManager.handleResize();
    }
  }

  private showGameScreen(): void {
    if (!this.gameStarted) {
      const container = document.getElementById('gameCanvas');
      if (container) {
        this.sceneManager = new SceneManager(container);
        this.character = new Character();
        this.actionSystem = new ActionSystem(
          this.character,
          this.uiManager,
          this.initialStats,
          this.decayRates
        );

        this.sceneManager.addToScene(this.character.getMesh());
        this.sceneManager.setupClickHandler(
          (type: FurnitureType | 'floor', point: THREE.Vector3, object?: THREE.Mesh) => {
            this.handleSceneClick(type, point, object);
          }
        );
      }

      this.gameStarted = true;
      this.lastUpdateTime = Date.now();
      this.animate();
    }

    this.uiManager.showGameScreen(this.playerName);
  }

  private handleSceneClick(type: FurnitureType | 'floor', point: THREE.Vector3, object?: THREE.Mesh): void {
    if (type === 'floor') {
      this.moveTo(point.x, point.z);
    } else if (object) {
      this.handleFurnitureClick(object);
    }
  }

  private handleFurnitureClick(furniture: THREE.Mesh): void {
    const type = furniture.userData.type as FurnitureType;

    if (this.actionSystem.isPerformingAction()) {
      const currentActionName = this.actionSystem.getCurrentActionName();
      const newActionName = FURNITURE_ACTION_NAMES[type];

      this.pendingFurniture = furniture;
      this.uiManager.showConfirmModal(
        '⚠️ 正在进行动作',
        `角色正在"${currentActionName}"，确定要打断并开始"${newActionName}"吗？`
      );
      return;
    }

    this.executeFurnitureInteraction(furniture);
  }

  private executeFurnitureInteraction(furniture: THREE.Mesh): void {
    const type = furniture.userData.type as FurnitureType;

    switch (type) {
      case 'kitchen':
        this.moveToFurniture(furniture, () => {
          this.uiManager.showModal('cookingModal');
        });
        break;
      case 'sofa':
        this.moveToFurniture(furniture, () => {
          this.actionSystem.performAction('sit');
        });
        break;
      case 'bed':
        this.moveToFurniture(furniture, () => {
          this.actionSystem.performAction('sleep');
        });
        break;
      case 'desk':
        this.moveToFurniture(furniture, () => {
          this.actionSystem.performAction('work');
        });
        break;
      case 'shower':
        this.moveToFurniture(furniture, () => {
          this.actionSystem.performAction('shower');
        });
        break;
      case 'tv':
        this.moveTo(3, 2);
        this.actionSystem.performAction('watch');
        break;
    }
  }

  private moveToFurniture(furniture: THREE.Mesh, callback: () => void): void {
    const { x, z, isInteraction } = this.sceneManager.getFurnitureInteractionPosition(furniture);
    const type = furniture.userData.type as FurnitureType;

    if (isInteraction) {
      this.moveToInteraction(x, z, type, callback);
    } else {
      const targetPos = new THREE.Vector3(x, 0, z);
      const currentPos = this.character.getPosition().clone();
      const validPos = this.sceneManager.getValidPosition(currentPos, targetPos);

      if (validPos) {
        this.targetPosition = validPos;
        this.isMoving = true;
        this.character.standUp();
        this.afterMoveCallback = callback;
      } else {
        this.uiManager.showMessage('无法到达该位置！');
      }
    }
  }

  private moveToInteraction(targetX: number, targetZ: number, furnitureType: FurnitureType, callback: () => void): void {
    const currentPos = this.character.getPosition().clone();
    const approachTarget = this.sceneManager.getApproachPosition(
      furnitureType,
      targetX,
      targetZ,
      currentPos
    );
    const validPos = this.sceneManager.getValidPosition(currentPos, approachTarget);

    if (validPos) {
      this.targetPosition = validPos;
      this.isMoving = true;
      this.character.standUp();
      this.afterMoveCallback = () => {
        this.character.setPosition(targetX, 0, targetZ);
        this.targetPosition = null;
        this.isMoving = false;
        callback();
      };
    } else {
      this.character.setPosition(targetX, 0, targetZ);
      callback();
    }
  }

  private moveTo(x: number, z: number): void {
    x = Math.max(-9, Math.min(9, x));
    z = Math.max(-9, Math.min(9, z));

    const targetPos = new THREE.Vector3(x, 0, z);
    const currentPos = this.character.getPosition().clone();
    const validPos = this.sceneManager.getValidPosition(currentPos, targetPos);

    if (validPos) {
      this.character.standUp();
      this.targetPosition = validPos;
      this.isMoving = true;
    }
  }

  private animate(): void {
    if (!this.gameStarted) return;

    requestAnimationFrame(() => this.animate());

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    this.updateGame(deltaTime);
    this.sceneManager.render();
  }

  private updateGame(deltaTime: number): void {
    if (this.isMoving && this.targetPosition) {
      this.updateMovement(deltaTime);
    }

    this.actionSystem.update(deltaTime);
    this.updateGameTime(deltaTime);

    if (!this.actionSystem.getCurrentAction()) {
      this.actionSystem.updateStatsDecay(deltaTime);
    }

    this.updateUI();
  }

  private updateMovement(deltaTime: number): void {
    if (!this.targetPosition) return;

    const characterPos = this.character.getPosition();
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, characterPos);
    direction.y = 0;

    const distance = direction.length();

    if (distance < 0.1) {
      this.isMoving = false;
      this.targetPosition = null;
      this.character.resetWalkAnimation();

      if (this.afterMoveCallback) {
        this.afterMoveCallback();
        this.afterMoveCallback = undefined;
      }
      return;
    }

    direction.normalize();
    const moveAmount = this.moveSpeed * deltaTime * 60;

    const newPos = new THREE.Vector3(
      characterPos.x + direction.x * moveAmount,
      0,
      characterPos.z + direction.z * moveAmount
    );

    if (!this.sceneManager.checkCollision(newPos)) {
      characterPos.x = newPos.x;
      characterPos.z = newPos.z;
    } else {
      const slidePos = this.sceneManager.tryMove(characterPos.clone(), newPos, this.moveSpeed);
      if (slidePos) {
        characterPos.x = slidePos.x;
        characterPos.z = slidePos.z;
      } else {
        this.isMoving = false;
        this.targetPosition = null;
        this.character.resetWalkAnimation();
        return;
      }
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.character.setRotationY(angle);
    this.character.updateWalkAnimation(Date.now());
  }

  private updateGameTime(deltaTime: number): void {
    this.gameTime.minutes += deltaTime * this.gameSpeed;

    while (this.gameTime.minutes >= 60) {
      this.gameTime.minutes -= 60;
      this.gameTime.hours++;
      if (this.gameTime.hours >= 24) {
        this.gameTime.hours = 0;
        this.gameTime.day++;
      }
    }
  }

  private updateUI(): void {
    this.uiManager.updateStats(this.actionSystem.getStats());
    this.uiManager.updateTime(this.gameTime);
    this.uiManager.updateMood(this.actionSystem.getStats());
  }
}
