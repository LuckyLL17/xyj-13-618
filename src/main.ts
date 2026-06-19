import { GameEngine } from './core/GameEngine';
import './styles.css';

window.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  game.init();
});
