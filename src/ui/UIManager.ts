import type { CharacterStats, GameTime } from '@/types';

/**
 * UI 管理器：所有 DOM 操作集中于此，业务模块通过它操作界面。
 */
export class UIManager {
  private lastWarning: number | null = null;

  showLogin(): void {
    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('gameScreen')?.classList.add('hidden');
  }

  showGame(playerName: string): void {
    document.getElementById('loginScreen')?.classList.add('hidden');
    document.getElementById('gameScreen')?.classList.remove('hidden');
    const nameEl = document.getElementById('playerNameDisplay');
    if (nameEl) nameEl.textContent = playerName;
  }

  getGameCanvasContainer(): HTMLElement {
    const el = document.getElementById('gameCanvas');
    if (!el) throw new Error('找不到 #gameCanvas 容器');
    return el;
  }

  getPlayerNameInput(): string {
    const input = document.getElementById('playerName') as HTMLInputElement | null;
    return input?.value.trim() ?? '';
  }

  bindStartButton(handler: () => void): void {
    document.getElementById('startBtn')?.addEventListener('click', handler);
  }

  bindLoadButton(handler: () => void): void {
    document.getElementById('loadBtn')?.addEventListener('click', handler);
  }

  bindSaveButton(handler: () => void): void {
    document.getElementById('saveBtn')?.addEventListener('click', handler);
  }

  bindActionButtons(handler: (action: string) => void): void {
    document.querySelectorAll<HTMLButtonElement>('.action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action) handler(action);
      });
    });
  }

  bindFoodButtons(handler: (food: string) => void): void {
    document.querySelectorAll<HTMLButtonElement>('.food-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const food = (e.currentTarget as HTMLElement).dataset.food;
        if (food) {
          handler(food);
          this.hideModal('cookingModal');
        }
      });
    });
  }

  bindCloseCookingButton(handler: () => void): void {
    document.getElementById('closeCooking')?.addEventListener('click', handler);
  }

  bindConfirmButtons(onYes: () => void, onNo: () => void): void {
    document.getElementById('confirmYes')?.addEventListener('click', onYes);
    document.getElementById('confirmNo')?.addEventListener('click', onNo);
  }

  showModal(modalId: string): void {
    document.getElementById(modalId)?.classList.remove('hidden');
  }

  hideModal(modalId: string): void {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  showConfirmModal(title: string, message: string): void {
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    this.showModal('confirmModal');
  }

  showMessage(text: string, durationMs = 2000): void {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.classList.remove('hidden');
    setTimeout(() => messageBox.classList.add('hidden'), durationMs);
  }

  updateStats(stats: CharacterStats): void {
    const set = (id: string, value: number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(Math.round(value));
    };
    const setBar = (id: string, value: number) => {
      const el = document.getElementById(id);
      if (el) (el as HTMLElement).style.width = `${value}%`;
    };

    set('energyValue', stats.energy);
    set('hygieneValue', stats.hygiene);
    set('funValue', stats.fun);
    set('socialValue', stats.social);
    set('hungerValue', stats.hunger);

    setBar('energyBar', stats.energy);
    setBar('hygieneBar', stats.hygiene);
    setBar('funBar', stats.fun);
    setBar('socialBar', stats.social);
    setBar('hungerBar', stats.hunger);
  }

  updateTime(gameTime: GameTime): void {
    const hours = String(Math.floor(gameTime.hours)).padStart(2, '0');
    const minutes = String(Math.floor(gameTime.minutes)).padStart(2, '0');
    const tEl = document.getElementById('gameTime');
    const dEl = document.getElementById('gameDay');
    if (tEl) tEl.textContent = `${hours}:${minutes}`;
    if (dEl) dEl.textContent = `第 ${gameTime.day} 天`;
  }

  updateMood(stats: CharacterStats): void {
    const avg = (stats.energy + stats.hygiene + stats.fun + stats.social + stats.hunger) / 5;

    let text: string;
    let color: string;
    if (avg >= 80) {
      text = '心情：非常开心 😃';
      color = '#4CAF50';
    } else if (avg >= 60) {
      text = '心情：不错 🙂';
      color = '#8BC34A';
    } else if (avg >= 40) {
      text = '心情：一般 😐';
      color = '#FFC107';
    } else if (avg >= 20) {
      text = '心情：不太好 😕';
      color = '#FF9800';
    } else {
      text = '心情：很糟糕 😢';
      color = '#F44336';
    }

    const el = document.getElementById('moodText');
    if (el) {
      el.textContent = text;
      (el as HTMLElement).style.color = color;
    }
    this.checkCriticalStats(stats);
  }

  private checkCriticalStats(stats: CharacterStats): void {
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
}
