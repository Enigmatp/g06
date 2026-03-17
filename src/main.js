import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';

const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#0a0a1e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
};

const game = new Phaser.Game(config);
