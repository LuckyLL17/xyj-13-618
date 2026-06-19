import * as THREE from 'three';
import type { ActionType, FoodType, FurnitureType, Stats, DecayRates, GameTime } from '../types';
import { SceneManager } from '../scene/SceneManager';
import { Character } from '../character/Character';
import { MovementSystem } from '../character/MovementSystem';
import { ActionSystem } from '../actions/ActionSystem';
import { SaveManager } from '../save/SaveManager';
import { UIManager } from '../ui/UIManager';

export class GameEngine {
  private playerName = '';
  private gameStarted = false;
  private lastUpdateTime = 0;
  private gameSpeed = 1;

  private stats: Stats = {
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

  private gameTime: GameTime = {
    hours: 8,
    minutes: 0,
    day: 1,
  };

  private sceneManager: SceneManager;
  private character!: Character;
  private movementSystem!: MovementSystem;
  private actionSystem!: ActionSystem;
  private saveManager: SaveManager;
  private uiManager!: UIManager;

  constructor() {
    this.sceneManager = new SceneManager();
    this.saveManager = new SaveManager();
  }

  init(): void {
    this.uiManager = new UIManager({
      onStart: (name: string) => this.startGame(name),
      onLoad: () => this.loadGame(),
      onSave: () => this.saveGame(),
      onAction: (action: ActionType) => this.onActionRequested(action),
      onFood: (food: FoodType) => this.onFoodSelected(food),
      onConfirmInterrupt: (confirmed: boolean) => this.onInterruptConfirmed(confirmed),
    });

    const savedName = this.saveManager.checkSession();
    if (savedName) {
      this.playerName = savedName;
      this.showGameAndInit();
    }
  }

  private startGame(name: string): void {
    this.playerName = name;
    this.saveManager.saveSession(name);
    this.showGameAndInit();
  }

  private showGameAndInit(): void {
    this.uiManager.showGameScreen(this.playerName);
    this.initThreeJS();
    this.gameStarted = true;
    this.lastUpdateTime = Date.now();
    this.updateUI();
    this.animate();
  }

  private initThreeJS(): void {
    const container = document.getElementById('gameCanvas');
    if (!container) return;

    this.sceneManager.init(container, {
      onFloorClick: (x: number, z: number) => this.onFloorClick(x, z),
      onFurnitureClick: (furniture: THREE.Mesh) => this.onFurnitureClick(furniture),
    });

    this.character = new Character();
    this.sceneManager.addCharacter(this.character.group);

    this.movementSystem = new MovementSystem(this.character, {
      onShowMessage: (text: string) => this.uiManager.showMessage(text),
      onReachTarget: (callback?: () => void) => {
        if (callback) callback();
      },
    });

    this.actionSystem = new ActionSystem(
      {
        onShowMessage: (text: string) => this.uiManager.showMessage(text),
        onShowModal: (modalId: string) => this.uiManager.showModal(modalId),
        onHideModal: (modalId: string) => this.uiManager.hideModal(modalId),
        onStandUp: () => this.character.standUp(),
        onUpdateStats: (newStats: Partial<Stats>) => {
          Object.assign(this.stats, newStats);
          this.uiManager.updateStats(this.stats);
        },
        onActionComplete: () => {
          this.uiManager.updateStats(this.stats);
        },
      },
      this.stats
    );

    window.addEventListener('resize', () => {
      this.sceneManager.handleResize();
    });
  }

  private saveGame(): void {
    this.saveManager.saveGame(
      this.playerName,
      this.stats,
      this.gameTime,
      this.character ? this.character.position : null
    );
    this.uiManager.showMessage('游戏已保存！');
  }

  private loadGame(): boolean {
    const saveData = this.saveManager.loadGame();
    if (saveData) {
      this.playerName = saveData.playerName;
      this.stats = { ...saveData.stats };
      this.gameTime = { ...saveData.gameTime };

      if (saveData.savedAt) {
        const offlineSeconds = (Date.now() - saveData.savedAt) / 1000;
        this.saveManager.applyOfflineDecay(
          this.stats,
          this.gameTime,
          this.decayRates,
          this.gameSpeed,
          offlineSeconds
        );
      }

      this.saveManager.saveSession(this.playerName);
      this.showGameAndInit();

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
    return false;
  }

  private onFloorClick(x: number, z: number): void {
    if (this.actionSystem.IsActive) {
      this.actionSystem.interruptCurrentAction();
    }
    if (this.character.isInPose()) {
      this.character.standUp();
    }
    if (this.movementSystem.isInCollision()) {
      this.movementSystem.escapeFromCollider();
    }
    this.movementSystem.cancelMovement();
    this.movementSystem.moveTo(x, z);
  }

  private onFurnitureClick(furniture: THREE.Mesh): void {
    const furnitureType = furniture.userData.type as FurnitureType;
    const isBusy = this.actionSystem.IsActive || this.character.isInPose();

    if (isBusy) {
      const canProceed = this.actionSystem.requestFurnitureInteraction(furnitureType, true);
      if (!canProceed) {
        const info = this.actionSystem.getInterruptInfo();
        this.uiManager.showConfirmModal('⚠️ 正在进行动作', info.message);
        return;
      }
    }

    this.executeFurnitureInteraction(furniture, furnitureType);
  }

  private executeFurnitureInteraction(furniture: THREE.Mesh, furnitureType: FurnitureType): void {
    switch (furnitureType) {
      case 'kitchen':
        this.movementSystem.moveToFurniture(furniture, () => {
          this.uiManager.showModal('cookingModal');
        });
        break;
      case 'sofa':
        this.movementSystem.moveToFurniture(furniture, () => {
          this.character.sitOnSofa();
          this.actionSystem.executeAction('sit');
        });
        break;
      case 'bed':
        this.movementSystem.moveToFurniture(furniture, () => {
          this.character.lieOnBed();
          this.actionSystem.executeAction('sleep');
        });
        break;
      case 'desk':
        this.movementSystem.moveToFurniture(furniture, () => {
          this.actionSystem.executeAction('work');
        });
        break;
      case 'shower':
        this.movementSystem.moveToFurniture(furniture, () => {
          this.actionSystem.executeAction('shower');
        });
        break;
      case 'tv':
        this.movementSystem.moveTo(3, 2);
        this.actionSystem.executeAction('watch');
        break;
    }
  }

  private onActionRequested(action: ActionType): void {
    const canProceed = this.actionSystem.requestAction(action);
    if (!canProceed) {
      const info = this.actionSystem.getInterruptInfo();
      this.uiManager.showConfirmModal('⚠️ 正在进行动作', info.message);
    }
  }

  private onFoodSelected(food: FoodType): void {
    this.actionSystem.eatFood(food);
    this.uiManager.updateStats(this.stats);
  }

  private onInterruptConfirmed(confirmed: boolean): void {
    this.uiManager.hideModal('confirmModal');

    if (confirmed) {
      const { action, furniture } = this.actionSystem.confirmInterrupt(true);

      if (this.character.isInPose()) {
        this.character.standUp();
      }
      if (this.movementSystem.isInCollision()) {
        this.movementSystem.escapeFromCollider();
      }

      this.movementSystem.cancelMovement();

      if (action) {
        this.actionSystem.executeAction(action);
      } else if (furniture) {
        const furnitureMesh = this.sceneManager.getFurnitureByName(furniture);
        if (furnitureMesh) {
          this.executeFurnitureInteraction(furnitureMesh, furniture);
        }
      }
    } else {
      this.actionSystem.confirmInterrupt(false);
    }
  }

  private animate(): void {
    if (!this.gameStarted) return;

    requestAnimationFrame(() => this.animate());

    const currentTime = Date.now();
    const deltaTime = Math.min((currentTime - this.lastUpdateTime) / 1000, 0.1);
    this.lastUpdateTime = currentTime;

    this.updateGame(deltaTime);
    this.sceneManager.render();
  }

  private updateGame(deltaTime: number): void {
    this.movementSystem.update(deltaTime);

    this.actionSystem.update(deltaTime);

    this.updateGameTime(deltaTime);

    if (!this.actionSystem.IsActive) {
      this.updateStatsDecay(deltaTime);
    }

    this.updateUI();
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

  private updateStatsDecay(deltaTime: number): void {
    this.stats.energy = Math.max(0, this.stats.energy - this.decayRates.energy * deltaTime);
    this.stats.hygiene = Math.max(0, this.stats.hygiene - this.decayRates.hygiene * deltaTime);
    this.stats.fun = Math.max(0, this.stats.fun - this.decayRates.fun * deltaTime);
    this.stats.social = Math.max(0, this.stats.social - this.decayRates.social * deltaTime);
    this.stats.hunger = Math.max(0, this.stats.hunger - this.decayRates.hunger * deltaTime);
  }

  private updateUI(): void {
    this.uiManager.updateStats(this.stats);
    this.uiManager.updateGameTime(this.gameTime);
    this.uiManager.updateMood(this.stats);
  }
}
