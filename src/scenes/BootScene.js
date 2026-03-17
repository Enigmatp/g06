import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Dark gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);

        // Subtle border frame
        const border = this.add.graphics();
        border.lineStyle(2, 0x0f3460, 0.6);
        border.strokeRect(8, 8, width - 16, height - 16);

        // Title text
        this.add.text(width / 2, height / 2 - 40, 'G05 DISCOVERY', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#e94560',
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#e94560',
                blur: 12,
                fill: true,
            },
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height / 2 + 20, '— 探索模式 —', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '18px',
            color: '#a0a0b8',
        }).setOrigin(0.5);

        // Version info at bottom
        this.add.text(width / 2, height - 30, 'v0.1.0', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '14px',
            color: '#555570',
        }).setOrigin(0.5);
    }
}
