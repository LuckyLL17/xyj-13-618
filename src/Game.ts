import * as THREE from 'three';
import type { ActionType, Stats, DecayRates, GameTime, FurnitureType, FoodType } from './types';
import { SceneManager } from './scene/SceneManager';
import { Character } from './character/Character';
import { ActionSystem } from './actions/ActionSystem';
import { SaveManager } from './save/SaveManager';
import { CollisionSystem } from './collision/CollisionSystem';
import { UIManager } from './ui/UIManager';

export class Game {
  private sceneManager: SceneManager;
  private character: Character;
  private actionSystem: ActionSystem;
  private saveManager: SaveManager;
  private collisionSystem: CollisionSystem;
  private uiManager: UIManager;

  private playerName = '';
  private gameStarted = false;

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

  private gameSpeed = 1;
  private lastUpdateTime = 0;

  private targetPosition: THREE.Vector3 | null = null;
  private isMoving = false;
  private moveSpeed = 0.1;

  private currentAction: ActionType | null = null;
  private actionTimer = 0;

  private pendingAction: ActionType | null = null;
  private pendingFurniture: THREE.Mesh | null = null;
  private afterMoveCallback: (() => void) | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.saveManager = new SaveManager();
    this.uiManager = new UIManager();

    const container = document.getElementById('gameCanvas') as HTMLElement;
    this.sceneManager = new SceneManager(container);
    this.character = new Character(this.sceneManager.getScene());
    this.actionSystem = new ActionSystem(
      this.stats,
      (msg) => this.uiManager.showMessage(msg),
      () => this.updateUI()
    );
    this.collisionSystem = new CollisionSystem();

    this.setupEventListeners();
    this.checkSession();
  }

  private setupEventListeners(): void {
    document.getElementById('startBtn')!.addEventListener('click', () => {
      const name = this.uiManager.getPlayerNameInput();
      if (name) {
        this.playerName = name;
        this.saveManager.saveSession(name);
        this.showGameScreen();
      } else {
        this.uiManager.showMessage('请输入你的名字！');
      }
    });

    document.getElementById('loadBtn')!.addEventListener('click', () => {
      this.loadGame();
    });

    document.getElementById('saveBtn')!.addEventListener('click', () => {
      this.saveGame();
    });

    document.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action as ActionType;
        this.performAction(action);
      });
    });

    document.querySelectorAll('.food-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const food = (e.currentTarget as HTMLElement).dataset.food as FoodType;
        this.eatFood(food);
        this.uiManager.hideModal('cookingModal');
      });
    });

    document.getElementById('closeCooking')!.addEventListener('click', () => {
      this.uiManager.hideModal('cookingModal');
    });

    document.getElementById('confirmYes')!.addEventListener('click', () => {
      this.confirmInterruptAction(true);
    });

    document.getElementById('confirmNo')!.addEventListener('click', () => {
      this.confirmInterruptAction(false);
    });

    window.addEventListener('resize', () => {
      this.sceneManager.handleResize();
    });

    this.sceneManager.getRenderer().domElement.addEventListener('click', (event) => {
      this.onMouseClick(event as MouseEvent);
    });
  }

  private checkSession(): void {
    const sessionData = this.saveManager.loadSession();
    if (sessionData) {
      this.playerName = sessionData.playerName;
      this.showGameScreen();
    }
  }

  private showGameScreen(): void {
    this.uiManager.showGameScreen(this.playerName);
    this.gameStarted = true;
    this.lastUpdateTime = Date.now();
    this.updateUI();
    this.animate();
  }

  private saveGame(): void {
    const characterPos = this.character.getPosition();
    this.saveManager.saveGame(
      this.playerName,
      this.stats,
      this.gameTime,
      { x: characterPos.x, y: characterPos.y, z: characterPos.z }
    );
    this.uiManager.showMessage('游戏已保存！');
  }

  private loadGame(): boolean {
    const result = this.saveManager.loadGame();
    if (result.success && result.data) {
      const data = result.data;
      this.playerName = data.playerName;
      this.stats = data.stats;
      this.gameTime = data.gameTime;

      if (data.savedAt) {
        const decayResult = this.saveManager.applyOfflineDecay(
          this.stats,
          this.gameTime,
          this.gameSpeed,
          this.decayRates,
          data.savedAt
        );
        Object.assign(this.stats, decayResult.stats);
        Object.assign(this.gameTime, decayResult.gameTime);
      }

      if (data.characterPosition) {
        this.character.setPosition(
          data.characterPosition.x,
          data.characterPosition.y,
          data.characterPosition.z
        );
      }

      this.saveManager.saveSession(this.playerName);
      this.showGameScreen();
      this.uiManager.showMessage('存档已加载！');
      return true;
    }
    this.uiManager.showMessage('没有找到存档！');
    return false;
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.sceneManager.getRenderer().domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.getCamera());
    const intersects = this.raycaster.intersectObjects(this.sceneManager.getClickableObjects());

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      const point = intersects[0].point;

      if (clickedObject.userData && clickedObject.userData.type) {
        this.handleFurnitureClick(clickedObject);
      } else if (clickedObject.name === 'floor') {
        this.moveTo(point.x, point.z);
      }
    }
  }

  private handleFurnitureClick(furniture: THREE.Mesh): void {
    const type = furniture.userData.type as FurnitureType;

    if (this.currentAction || this.character.isInSittingState() || this.character.isInSleepingState()) {
      let currentActionName = '当前动作';
      if (this.currentAction) {
        currentActionName = this.actionSystem.getActionName(this.currentAction);
      } else if (this.character.isInSleepingState()) {
        currentActionName = '睡觉';
      } else if (this.character.isInSittingState()) {
        currentActionName = '休息';
      }

      const newActionName = this.actionSystem.getFurnitureActionName(type);

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
          this.executeAction('sit');
        });
        break;
      case 'bed':
        this.moveToFurniture(furniture, () => {
          this.executeAction('sleep');
        });
        break;
      case 'desk':
        this.moveToFurniture(furniture, () => {
          this.executeAction('work');
        });
        break;
      case 'shower':
        this.moveToFurniture(furniture, () => {
          this.executeAction('shower');
        });
        break;
      case 'tv':
        this.moveTo(3, 2);
        this.executeAction('watch');
        break;
    }
  }

  private moveToFurniture(furniture: THREE.Mesh, callback: () => void): void {
    const pos = furniture.position;
    let targetX = pos.x;
    let targetZ = pos.z;
    let isInteractionPosition = false;

    const type = furniture.userData.type as FurnitureType;
    if (type === 'sofa') {
      targetX = pos.x;
      targetZ = pos.z + 0.2;
      isInteractionPosition = true;
    } else if (type === 'bed') {
      targetX = pos.x;
      targetZ = pos.z - 0.5;
      isInteractionPosition = true;
    } else if (type === 'kitchen') {
      targetZ = pos.z + 1.5;
    } else if (type === 'desk') {
      targetZ = pos.z + 1.5;
    } else if (type === 'shower') {
      targetZ = pos.z + 1.5;
    }

    if (isInteractionPosition) {
      this.moveToInteraction(targetX, targetZ, type, callback);
    } else {
      const targetPos = new THREE.Vector3(targetX, 0, targetZ);
      const validPos = this.collisionSystem.getValidPosition(this.character.getPosition().clone(), targetPos);

      if (validPos) {
        this.targetPosition = validPos;
        this.isMoving = true;
        this.standUp();
        this.currentAction = null;
        this.afterMoveCallback = callback;
      } else {
        this.uiManager.showMessage('无法到达该位置！');
      }
    }
  }

  private moveToInteraction(
    targetX: number,
    targetZ: number,
    furnitureType: FurnitureType,
    callback: () => void
  ): void {
    const targetPos = new THREE.Vector3(targetX, 0, targetZ);
    const currentPos = this.character.getPosition().clone();

    let approachTarget: THREE.Vector3;
    if (furnitureType === 'sofa') {
      approachTarget = new THREE.Vector3(targetX, 0, targetZ - 1.5);
    } else if (furnitureType === 'bed') {
      approachTarget = new THREE.Vector3(targetX + 2, 0, targetZ);
    } else {
      approachTarget = new THREE.Vector3(targetX, 0, targetZ - 1);
    }

    const validPos = this.collisionSystem.getValidPosition(currentPos, approachTarget);

    if (validPos) {
      this.targetPosition = validPos;
      this.isMoving = true;
      this.standUp();
      this.currentAction = null;
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
    const validPos = this.collisionSystem.getValidPosition(this.character.getPosition().clone(), targetPos);

    if (validPos) {
      this.standUp();
      this.targetPosition = validPos;
      this.isMoving = true;
      this.currentAction = null;
    }
  }

  private performAction(action: ActionType): void {
    if (this.currentAction) {
      const currentActionName = this.actionSystem.getActionName(this.currentAction);
      const newActionName = this.actionSystem.getActionName(action);

      this.pendingAction = action;

      this.uiManager.showConfirmModal(
        '⚠️ 正在进行动作',
        `角色正在"${currentActionName}"，确定要打断并开始"${newActionName}"吗？\n\n打断后角色将从当前状态恢复。`
      );
      return;
    }

    this.executeAction(action);
  }

  private executeAction(action: ActionType): void {
    this.currentAction = action;
    this.actionTimer = 0;

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
        this.sitOnSofa();
        break;
      case 'watch':
        this.startWatch();
        break;
    }
  }

  private confirmInterruptAction(confirmed: boolean): void {
    this.uiManager.hideModal('confirmModal');

    if (confirmed) {
      this.interruptCurrentAction();

      if (this.pendingAction) {
        const action = this.pendingAction;
        this.pendingAction = null;
        this.executeAction(action);
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

  private interruptCurrentAction(): void {
    if (!this.currentAction && !this.character.isInSittingState() && !this.character.isInSleepingState()) return;

    this.standUp();

    if (this.collisionSystem.checkCollision(this.character.getPosition())) {
      this.escapeFromCollider();
    }

    this.currentAction = null;
    this.actionTimer = 0;

    this.uiManager.showMessage('已打断当前动作');
  }

  private escapeFromCollider(): void {
    const safePos = this.collisionSystem.escapeFromCollider(this.character.getPosition().clone());
    if (safePos) {
      this.character.setPosition(safePos.x, 0, safePos.z);
    }
  }

  private eatFood(foodType: FoodType): void {
    this.actionSystem.eatFood(foodType);
    this.currentAction = null;
  }

  private startSleep(): void {
    this.character.lieOnBed();
    this.actionTimer = 5;
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

  private sitOnSofa(): void {
    this.character.sitOnSofa();
    this.uiManager.showMessage('坐在沙发上休息...');
  }

  private startWatch(): void {
    this.actionSystem.updateWatch();
  }

  private standUp(): void {
    this.character.standUp();
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

    if (this.currentAction) {
      this.updateCurrentAction(deltaTime);
    }

    this.updateGameTime(deltaTime);

    if (!this.currentAction) {
      this.updateStatsDecay(deltaTime);
    }

    this.updateUI();
    this.uiManager.updateMood(this.stats);
  }

  private updateMovement(deltaTime: number): void {
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition!, this.character.getPosition());
    direction.y = 0;

    const distance = direction.length();

    if (distance < 0.1) {
      this.isMoving = false;
      this.targetPosition = null;

      if (this.afterMoveCallback) {
        this.afterMoveCallback();
        this.afterMoveCallback = null;
      }
      return;
    }

    direction.normalize();
    const moveAmount = this.moveSpeed * deltaTime * 60;

    const newPos = new THREE.Vector3(
      this.character.getPosition().x + direction.x * moveAmount,
      0,
      this.character.getPosition().z + direction.z * moveAmount
    );

    if (!this.collisionSystem.checkCollision(newPos)) {
      this.character.getPosition().x = newPos.x;
      this.character.getPosition().z = newPos.z;
    } else {
      const slidePos = this.collisionSystem.tryMove(
        this.character.getPosition().clone(),
        newPos,
        this.moveSpeed
      );
      if (slidePos) {
        this.character.getPosition().x = slidePos.x;
        this.character.getPosition().z = slidePos.z;
      } else {
        this.isMoving = false;
        this.targetPosition = null;
        return;
      }
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.character.setRotationY(angle);

    this.character.updateWalkAnimation();
  }

  private updateCurrentAction(deltaTime: number): void {
    this.actionTimer -= deltaTime;

    switch (this.currentAction) {
      case 'sleep':
        this.actionSystem.updateSleep(deltaTime);
        if (this.actionTimer <= 0) {
          this.standUp();
          this.currentAction = null;
          this.actionSystem.finishSleep();
        }
        break;
      case 'phone':
        this.actionSystem.updatePhone(deltaTime);
        if (this.actionTimer <= 0) {
          this.currentAction = null;
          this.actionSystem.finishPhone();
        }
        break;
      case 'work':
        this.actionSystem.updateWork(deltaTime);
        if (this.actionTimer <= 0) {
          this.currentAction = null;
          this.actionSystem.finishWork();
        }
        break;
      case 'shower':
        this.actionSystem.updateShower(deltaTime);
        if (this.actionTimer <= 0) {
          this.currentAction = null;
          this.actionSystem.finishShower();
        }
        break;
      case 'chat':
        this.actionSystem.updateChat(deltaTime);
        if (this.actionTimer <= 0) {
          this.currentAction = null;
          this.actionSystem.finishChat();
        }
        break;
    }
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
    this.uiManager.updateUI(this.stats, this.gameTime);
  }
}
