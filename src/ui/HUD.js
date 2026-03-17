import Phaser from 'phaser';

/**
 * Heads-Up Display — fixed to camera
 */
export class HUD {
    constructor(scene) {
        this.scene = scene;
        const { width } = scene.scale;

        // -- Top bar background
        this.topBar = scene.add.graphics();
        this.topBar.fillStyle(0x0a0a1e, 0.85);
        this.topBar.fillRoundedRect(8, 8, width - 16, 52, 10);
        this.topBar.lineStyle(1, 0x3a3a6e, 0.6);
        this.topBar.strokeRoundedRect(8, 8, width - 16, 52, 10);
        this.topBar.setScrollFactor(0).setDepth(100);

        // Day label
        this.dayText = scene.add.text(24, 20, '', {
            fontSize: '18px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontStyle: 'bold',
            color: '#ffcc44',
        }).setScrollFactor(0).setDepth(101);

        // Actions
        this.actionText = scene.add.text(130, 20, '', {
            fontSize: '16px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            color: '#88bbff',
        }).setScrollFactor(0).setDepth(101);

        // HP
        this.hpText = scene.add.text(260, 20, '', {
            fontSize: '16px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            color: '#ff6666',
        }).setScrollFactor(0).setDepth(101);

        // Gold
        this.goldText = scene.add.text(370, 20, '', {
            fontSize: '16px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            color: '#ffd700',
        }).setScrollFactor(0).setDepth(101);

        // Gems
        this.gemsText = scene.add.text(460, 20, '', {
            fontSize: '16px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            color: '#aa88ff',
        }).setScrollFactor(0).setDepth(101);

        // -- Next Day button (bottom)
        this.createNextDayButton();

        // -- Banner (message display)
        this.bannerText = scene.add.text(width / 2, 80, '', {
            fontSize: '20px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setAlpha(0);

        this.update();
    }

    createNextDayButton() {
        const { width, height } = this.scene.scale;

        // Button background
        this.nextDayBg = this.scene.add.graphics();
        this.nextDayBg.fillStyle(0x1a3a6e, 0.9);
        this.nextDayBg.fillRoundedRect(width / 2 - 70, height - 70, 140, 48, 12);
        this.nextDayBg.lineStyle(2, 0x4488cc, 0.8);
        this.nextDayBg.strokeRoundedRect(width / 2 - 70, height - 70, 140, 48, 12);
        this.nextDayBg.setScrollFactor(0).setDepth(100);

        this.nextDayLabel = this.scene.add.text(width / 2, height - 46, '☀️ 下一天', {
            fontSize: '18px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontStyle: 'bold',
            color: '#88ccff',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        // Interactive zone
        this.nextDayZone = this.scene.add.zone(width / 2, height - 46, 140, 48)
            .setInteractive()
            .setScrollFactor(0)
            .setDepth(103);

        this.nextDayZone.on('pointerdown', () => {
            this.scene.nextDay();
        });

        this.nextDayZone.on('pointerover', () => {
            this.nextDayLabel.setColor('#ffffff');
        });
        this.nextDayZone.on('pointerout', () => {
            this.nextDayLabel.setColor('#88ccff');
        });
    }

    update() {
        const s = this.scene;
        this.dayText.setText(`Day ${s.day}`);
        this.actionText.setText(`⚡${s.actionsLeft}`);
        this.hpText.setText(`❤️${s.hp}/${s.maxHp}`);
        this.goldText.setText(`💰${s.gold}`);
        this.gemsText.setText(`💎${s.gems}`);
    }

    showBanner(msg) {
        this.bannerText.setText(msg);
        this.bannerText.setAlpha(1);

        this.scene.tweens.add({
            targets: this.bannerText,
            alpha: 0,
            duration: 600,
            delay: 1500,
            ease: 'Cubic.easeIn',
        });
    }
}
