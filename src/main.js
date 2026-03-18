import Phaser from 'phaser';
import { SpinePlugin } from '@esotericsoftware/spine-phaser-v3';
import { GameScene } from './scenes/GameScene.js';

const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

const config = {
    type: Phaser.WEBGL,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#0a0a1e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    plugins: {
        scene: [
            { key: 'spine.SpinePlugin', plugin: SpinePlugin, mapping: 'spine' },
        ],
    },
    scene: [GameScene],
};

const game = new Phaser.Game(config);
