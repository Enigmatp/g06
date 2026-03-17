import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';

// Design size: 1080x1920 (9:16 portrait)
// We scale it down to fit nicely on screen
const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene],
};

const game = new Phaser.Game(config);
