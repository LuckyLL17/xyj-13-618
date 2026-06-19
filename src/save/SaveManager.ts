import type { Stats, GameTime, SaveData, SessionData, DecayRates } from '../types';

const SESSION_KEY = 'simGameSession';
const SAVE_KEY = 'simGameSave';

export class SaveManager {
  saveSession(playerName: string): void {
    const data: SessionData = {
      playerName,
      startTime: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  checkSession(): string | null {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const data: SessionData = JSON.parse(sessionData);
      return data.playerName;
    }
    return null;
  }

  saveGame(playerName: string, stats: Stats, gameTime: GameTime, characterPosition: THREE.Vector3 | null): void {
    const saveData: SaveData = {
      playerName,
      stats: { ...stats },
      gameTime: { ...gameTime },
      characterPosition: characterPosition
        ? {
            x: characterPosition.x,
            y: characterPosition.y,
            z: characterPosition.z,
          }
        : null,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  loadGame(): SaveData | null {
    const saveData = localStorage.getItem(SAVE_KEY);
    if (saveData) {
      return JSON.parse(saveData) as SaveData;
    }
    return null;
  }

  applyOfflineDecay(
    stats: Stats,
    gameTime: GameTime,
    decayRates: DecayRates,
    gameSpeed: number,
    seconds: number
  ): void {
    const decayMultiplier = 0.5;

    stats.energy = Math.max(0, stats.energy - decayRates.energy * seconds * decayMultiplier);
    stats.hygiene = Math.max(0, stats.hygiene - decayRates.hygiene * seconds * decayMultiplier);
    stats.fun = Math.max(0, stats.fun - decayRates.fun * seconds * decayMultiplier);
    stats.social = Math.max(0, stats.social - decayRates.social * seconds * decayMultiplier);
    stats.hunger = Math.max(0, stats.hunger - decayRates.hunger * seconds * decayMultiplier);

    const gameMinutes = seconds * gameSpeed;
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
