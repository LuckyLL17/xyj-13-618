import type { SaveData, SessionData, Stats, GameTime } from '../types';

const SESSION_KEY = 'simGameSession';
const SAVE_KEY = 'simGameSave';

export interface SaveLoadResult {
  success: boolean;
  data?: SaveData;
}

export class SaveManager {
  saveSession(playerName: string): void {
    const sessionData: SessionData = {
      playerName,
      startTime: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }

  loadSession(): SessionData | null {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      return JSON.parse(sessionData) as SessionData;
    }
    return null;
  }

  clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }

  saveGame(
    playerName: string,
    stats: Stats,
    gameTime: GameTime,
    characterPosition: { x: number; y: number; z: number } | null
  ): void {
    const saveData: SaveData = {
      playerName,
      stats: { ...stats },
      gameTime: { ...gameTime },
      characterPosition,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  loadGame(): SaveLoadResult {
    const saveData = localStorage.getItem(SAVE_KEY);
    if (saveData) {
      return {
        success: true,
        data: JSON.parse(saveData) as SaveData,
      };
    }
    return { success: false };
  }

  hasSaveData(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  applyOfflineDecay(
    stats: Stats,
    gameTime: GameTime,
    gameSpeed: number,
    decayRates: Stats,
    savedAt: number
  ): { stats: Stats; gameTime: GameTime } {
    const offlineSeconds = (Date.now() - savedAt) / 1000;
    const decayMultiplier = 0.5;

    const updatedStats = { ...stats };
    updatedStats.energy = Math.max(0, updatedStats.energy - decayRates.energy * offlineSeconds * decayMultiplier);
    updatedStats.hygiene = Math.max(0, updatedStats.hygiene - decayRates.hygiene * offlineSeconds * decayMultiplier);
    updatedStats.fun = Math.max(0, updatedStats.fun - decayRates.fun * offlineSeconds * decayMultiplier);
    updatedStats.social = Math.max(0, updatedStats.social - decayRates.social * offlineSeconds * decayMultiplier);
    updatedStats.hunger = Math.max(0, updatedStats.hunger - decayRates.hunger * offlineSeconds * decayMultiplier);

    const updatedGameTime = { ...gameTime };
    const gameMinutes = offlineSeconds * gameSpeed;
    updatedGameTime.minutes += gameMinutes;

    while (updatedGameTime.minutes >= 60) {
      updatedGameTime.minutes -= 60;
      updatedGameTime.hours++;

      if (updatedGameTime.hours >= 24) {
        updatedGameTime.hours = 0;
        updatedGameTime.day++;
      }
    }

    return { stats: updatedStats, gameTime: updatedGameTime };
  }
}
