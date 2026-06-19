import type { Stats, GameTime } from '@/types';

type MessageCallback = () => void;
type ActionCallback = (action: string) => void;
type FoodCallback = (food: string) => void;
type ConfirmCallback = (confirmed: boolean) => void;

export class UIManager {
  private lastWarningTime: number | null = null;

  setupEventListeners(
    onStart: (name: string) => void,
    onLoad: () => void,
    onSave: () => void,
    onAction: ActionCallback,
    onFoodSelect: FoodCallback,
    onConfirm: ConfirmCallback
  ): void {
    document.getElementById('startBtn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('playerName') as HTMLInputElement;
      const name = nameInput.value.trim();
      if (name) {
        onStart(name);
      } else {
        this.showMessage('请输入你的名字！');
      }
    });

    document.getElementById('loadBtn')?.addEventListener('click', () => {
      onLoad();
    });

    document.getElementById('saveBtn')?.addEventListener('click', () => {
      onSave();
    });

    document.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        if (action) {
          onAction(action);
        }
      });
    });

    document.querySelectorAll('.food-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const food = target.dataset.food;
        if (food) {
          onFoodSelect(food);
          this.hideModal('cookingModal');
        }
      });
    });

    document.getElementById('closeCooking')?.addEventListener('click', () => {
      this.hideModal('cookingModal');
    });

    document.getElementById('confirmYes')?.addEventListener('click', () => {
      onConfirm(true);
    });

    document.getElementById('confirmNo')?.addEventListener('click', () => {
      onConfirm(false);
    });
  }

  setupResizeHandler(onResize: () => void): void {
    window.addEventListener('resize', onResize);
  }

  showGameScreen(playerName: string): void {
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('gameScreen')?.classList.remove('hidden');

    const nameDisplay = document.getElementById('playerNameDisplay');
    if (nameDisplay) {
      nameDisplay.textContent = playerName;
    }
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

  updateTime(gameTime: GameTime): void {
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

    if (warnings.length > 0 && !this.lastWarningTime) {
      this.showMessage('警告：' + warnings.join(' '));
      this.lastWarningTime = Date.now();
    } else if (this.lastWarningTime && Date.now() - this.lastWarningTime > 5000) {
      this.lastWarningTime = null;
    }
  }

  showMessage(text: string): void {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;

    messageBox.textContent = text;
    messageBox.classList.remove('hidden');

    setTimeout(() => {
      messageBox.classList.add('hidden');
    }, 2000);
  }

  showModal(modalId: string): void {
    document.getElementById(modalId)?.classList.remove('hidden');
  }

  hideModal(modalId: string): void {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  showConfirmModal(title: string, message: string): void {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    this.showModal('confirmModal');
  }
}
