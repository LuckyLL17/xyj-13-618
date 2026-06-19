import type { Stats, GameTime } from '../types';

export class UIManager {
  private lastWarning: number | null = null;

  showGameScreen(playerName: string): void {
    document.getElementById('loginScreen')!.classList.add('hidden');
    document.getElementById('gameScreen')!.classList.remove('hidden');
    document.getElementById('playerNameDisplay')!.textContent = playerName;
  }

  showMessage(text: string): void {
    const messageBox = document.getElementById('messageBox')!;
    messageBox.textContent = text;
    messageBox.classList.remove('hidden');

    setTimeout(() => {
      messageBox.classList.add('hidden');
    }, 2000);
  }

  showModal(modalId: string): void {
    document.getElementById(modalId)!.classList.remove('hidden');
  }

  hideModal(modalId: string): void {
    document.getElementById(modalId)!.classList.add('hidden');
  }

  showConfirmModal(title: string, message: string): void {
    document.getElementById('confirmTitle')!.textContent = title;
    document.getElementById('confirmMessage')!.textContent = message;
    this.showModal('confirmModal');
  }

  updateUI(stats: Stats, gameTime: GameTime): void {
    document.getElementById('energyValue')!.textContent = Math.round(stats.energy).toString();
    document.getElementById('hygieneValue')!.textContent = Math.round(stats.hygiene).toString();
    document.getElementById('funValue')!.textContent = Math.round(stats.fun).toString();
    document.getElementById('socialValue')!.textContent = Math.round(stats.social).toString();
    document.getElementById('hungerValue')!.textContent = Math.round(stats.hunger).toString();

    document.getElementById('energyBar')!.style.width = stats.energy + '%';
    document.getElementById('hygieneBar')!.style.width = stats.hygiene + '%';
    document.getElementById('funBar')!.style.width = stats.fun + '%';
    document.getElementById('socialBar')!.style.width = stats.social + '%';
    document.getElementById('hungerBar')!.style.width = stats.hunger + '%';

    const hours = String(Math.floor(gameTime.hours)).padStart(2, '0');
    const minutes = String(Math.floor(gameTime.minutes)).padStart(2, '0');
    document.getElementById('gameTime')!.textContent = `${hours}:${minutes}`;
    document.getElementById('gameDay')!.textContent = `第 ${gameTime.day} 天`;
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

    const moodElement = document.getElementById('moodText')!;
    moodElement.textContent = moodText;
    moodElement.style.color = moodColor;

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

  getPlayerNameInput(): string {
    return (document.getElementById('playerName') as HTMLInputElement).value.trim();
  }
}
