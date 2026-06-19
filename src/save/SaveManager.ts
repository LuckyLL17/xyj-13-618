import { STORAGE_KEYS, DECAY_RATES, GAME_SPEED } from '@/config/constants';
import type { CharacterStats, GameTime, SaveData, SessionData, Vector3Tuple } from '@/types';

export class SaveManager {
  saveSession(playerName: string): void {
    const data: SessionData = {
      playerName,
      startTime: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(data));
  }

  loadSession(): SessionData | null {
    const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

  saveGame(
    playerName: string,
    stats: CharacterStats,
    gameTime: GameTime,
    characterPosition: Vector3Tuple | null
  ): void {
    const saveData: SaveData = {
      playerName,
      stats,
      gameTime,
      characterPosition,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.SAVE, JSON.stringify(saveData));
  }

  loadGame(): SaveData | null {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  }

  /**
   * 应用离线衰减：根据上次保存时间到现在的间隔，按一半速率扣减属性，
   * 同时推进游戏内时间。
   */
  applyOfflineDecay(stats: CharacterStats, gameTime: GameTime, savedAt: number): void {
    const offlineSeconds = (Date.now() - savedAt) / 1000;
    const decayMultiplier = 0.5;

    stats.energy = Math.max(
      0,
      stats.energy - DECAY_RATES.energy * offlineSeconds * decayMultiplier
    );
    stats.hygiene = Math.max(
      0,
      stats.hygiene - DECAY_RATES.hygiene * offlineSeconds * decayMultiplier
    );
    stats.fun = Math.max(0, stats.fun - DECAY_RATES.fun * offlineSeconds * decayMultiplier);
    stats.social = Math.max(
      0,
      stats.social - DECAY_RATES.social * offlineSeconds * decayMultiplier
    );
    stats.hunger = Math.max(
      0,
      stats.hunger - DECAY_RATES.hunger * offlineSeconds * decayMultiplier
    );

    const gameMinutes = offlineSeconds * GAME_SPEED;
    gameTime.minutes += gameMinutes;

    while (gameTime.minutes >= 60) {
      gameTime.minutes -= 60;
      gameTime.hours++;
      if (gameTime.hours >= 24) {
        gameTime.hours = 0;
        gameTime.day++;
      }
    }
  }
}
