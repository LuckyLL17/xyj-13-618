import type { Stats, GameTime, UIManagerCallbacks, ActionType, FoodType } from '../types';

export class UIManager {
  private callbacks: UIManagerCallbacks;
  private messageTimeout: number | null = null;
  private lastWarning: number | null = null;

  constructor(callbacks: UIManagerCallbacks) {
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const startBtn = document.getElementById('startBtn');
    const loadBtn = document.getElementById('loadBtn');
    const saveBtn = document.getElementById('saveBtn');

    startBtn?.addEventListener('click', () => {
      const nameInput = document.getElementById('playerName') as HTMLInputElement;
      const name = nameInput.value.trim();
      if (name) {
        this.callbacks.onStart(name);
      } else {
        this.showMessage('请输入你的名字！');
      }
    });

    loadBtn?.addEventListener('click', () => {
      if (!this.callbacks.onLoad()) {
        this.showMessage('没有找到存档！');
      }
    });

    saveBtn?.addEventListener('click', () => {
      this.callbacks.onSave();
    });

    document.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action as ActionType;
        if (action) {
          this.callbacks.onAction(action);
        }
      });
    });

    document.querySelectorAll('.food-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const food = (e.currentTarget as HTMLElement).dataset.food as FoodType;
        if (food) {
          this.callbacks.onFood(food);
          this.hideModal('cookingModal');
        }
      });
    });

    const closeCooking = document.getElementById('closeCooking');
    closeCooking?.addEventListener('click', () => {
      this.hideModal('cookingModal');
    });

    const confirmYes = document.getElementById('confirmYes');
    confirmYes?.addEventListener('click', () => {
      this.callbacks.onConfirmInterrupt(true);
    });

    const confirmNo = document.getElementById('confirmNo');
    confirmNo?.addEventListener('click', () => {
      this.callbacks.onConfirmInterrupt(false);
    });
  }

  showGameScreen(playerName: string): void {
    const loginScreen = document.getElementById('loginScreen');
    const gameScreen = document.getElementById('gameScreen');
    loginScreen?.classList.add('hidden');
    gameScreen?.classList.remove('hidden');

    const nameDisplay = document.getElementById('playerNameDisplay');
    if (nameDisplay) {
      nameDisplay.textContent = playerName;
    }
  }

  showMessage(text: string): void {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;

    messageBox.textContent = text;
    messageBox.classList.remove('hidden');

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.messageTimeout = window.setTimeout(() => {
      messageBox.classList.add('hidden');
    }, 2000);
  }

  showModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    modal?.classList.remove('hidden');
  }

  hideModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    modal?.classList.add('hidden');
  }

  showConfirmModal(title: string, message: string): void {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    this.showModal('confirmModal');
  }

  updateStats(stats: Stats): void {
    const setValue = (id: string, value: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(Math.round(value));
    };

    const setBar = (id: string, value: number) => {
      const el = document.getElementById(id);
      if (el) el.style.width = `${value}%`;
    };

    setValue('energyValue', stats.energy);
    setValue('hygieneValue', stats.hygiene);
    setValue('funValue', stats.fun);
    setValue('socialValue', stats.social);
    setValue('hungerValue', stats.hunger);

    setBar('energyBar', stats.energy);
    setBar('hygieneBar', stats.hygiene);
    setBar('funBar', stats.fun);
    setBar('socialBar', stats.social);
    setBar('hungerBar', stats.hunger);
  }

  updateGameTime(gameTime: GameTime): void {
    const hours = String(Math.floor(gameTime.hours)).padStart(2, '0');
    const minutes = String(Math.floor(gameTime.minutes)).padStart(2, '0');

    const timeEl = document.getElementById('gameTime');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;

    const dayEl = document.getElementById('gameDay');
    if (dayEl) dayEl.textContent = `第 ${gameTime.day} 天`;
  }

  updateMood(stats: Stats): void {
    const avgStats = (stats.energy + stats.hygiene + stats.fun + stats.social + stats.hunger) / 5;

    let moodText = '';
    let moodColor = '';

    if (avgStats >= 80) {
      moodText = '心情：非常开心 😃';
      moodColor = '#4CAF50';
    } else if (avgStats >= 60) {
      moodText = '心情：不错 🙂';
      moodColor = '#8BC34A';
    } else if (avgStats >= 40) {
      moodText = '心情：一般 😐';
      moodColor = '#FFC107';
    } else if (avgStats >= 20) {
      moodText = '心情：不太好 😕';
      moodColor = '#FF9800';
    } else {
      moodText = '心情：很糟糕 😢';
      moodColor = '#F44336';
    }

    const moodElement = document.getElementById('moodText');
    if (moodElement) {
      moodElement.textContent = moodText;
      moodElement.style.color = moodColor;
    }

    this.checkCriticalStats(stats);
  }

  private checkCriticalStats(stats: Stats): void {
    const warnings: string[] = [];

    if (stats.hunger < 10) warnings.push('非常饿！');
    if (stats.energy < 10) warnings.push('非常累！');
    if (stats.hygiene < 10) warnings.push('非常脏！');
    if (stats.fun < 10) warnings.push('非常无聊！');
    if (stats.social < 10) warnings.push('非常孤独！');

    if (warnings.length > 0 && !this.lastWarning) {
      this.showMessage('警告：' + warnings.join(' '));
      this.lastWarning = Date.now();
    } else if (this.lastWarning && Date.now() - this.lastWarning > 5000) {
      this.lastWarning = null;
    }
  }

  handleResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
