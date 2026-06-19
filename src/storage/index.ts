import type { SessionData, SaveData, Stats, GameTime, CharacterPosition } from '@/types';

const SESSION_KEY = 'simGameSession';
const SAVE_KEY = 'simGameSave';

export class StorageManager {
  static getSession(): SessionData | null {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      return JSON.parse(sessionData) as SessionData;
    }
    return null;
  }

  static saveSession(playerName: string): void {
    const data: SessionData = {
      playerName,
      startTime: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  static saveGame(
    playerName: string,
    stats: Stats,
    gameTime: GameTime,
    characterPosition: CharacterPosition | null
  ): void {
    const saveData: SaveData = {
      playerName,
      stats: { ...stats },
      gameTime: { ...gameTime },
      characterPosition: characterPosition ? { ...characterPosition } : null,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  static loadGame(): SaveData | null {
    const saveData = localStorage.getItem(SAVE_KEY);
    if (saveData) {
      return JSON.parse(saveData) as SaveData;
    }
    return null;
  }

  static calculateOfflineSeconds(savedAt: number): number {
    return (Date.now() - savedAt) / 1000;
  }
}
