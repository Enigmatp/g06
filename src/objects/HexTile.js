import Phaser from 'phaser';
import { HEX_SIZE, getHexPoints, hexToPixel, hexKey, getNeighbors } from '../utils/HexUtils.js';
import { EVENT_CONFIG, EventType } from '../data/EventTypes.js';

/**
 * A single hexagonal tile on the map
 */
export class HexTile extends Phaser.GameObjects.Container {
    constructor(scene, q, r, eventType = EventType.GRASS) {
        const pos = hexToPixel(q, r);
        super(scene, pos.x, pos.y);

        this.q = q;
        this.r = r;
        this.eventType = eventType;
        this.isRevealed = false;
        this.isFlipping = false;
        this.isClickable = false;

        // -- Hidden face (dark card back)
        this.hiddenGraphics = this.createHexGraphic(0x1a1a3e, 0x2a2a5e, 0.95);
        this.add(this.hiddenGraphics);

        // Decorative pattern on hidden face
        this.hiddenPattern = this.createHiddenPattern();
        this.add(this.hiddenPattern);

        // -- Revealed face (terrain/event)
        const cfg = EVENT_CONFIG[eventType] || EVENT_CONFIG[EventType.GRASS];
        this.revealedGraphics = this.createHexGraphic(cfg.color, this.lightenColor(cfg.color, 40), 1);
        this.revealedGraphics.setVisible(false);
        this.add(this.revealedGraphics);

        // Icon text on revealed face
        if (cfg.icon) {
            this.iconText = scene.add.text(0, 0, cfg.icon, {
                fontSize: '22px',
            }).setOrigin(0.5).setVisible(false);
            this.add(this.iconText);
        }

        // -- Highlight ring for clickable tiles
        this.highlightGraphics = this.createHighlightRing();
        this.highlightGraphics.setVisible(false);
        this.add(this.highlightGraphics);

        // Make interactive
        this.setSize(HEX_SIZE * 2, HEX_SIZE * Math.sqrt(3));
        this.setInteractive(
            new Phaser.Geom.Circle(0, 0, HEX_SIZE * 0.85),
            Phaser.Geom.Circle.Contains
        );

        this.on('pointerover', this.onHover, this);
        this.on('pointerout', this.onHoverOut, this);
        this.on('pointerdown', this.onTap, this);

        scene.add.existing(this);
    }

    createHexGraphic(fillColor, strokeColor, alpha) {
        const g = this.scene.add.graphics();
        const points = getHexPoints(0, 0, HEX_SIZE - 1);
        g.fillStyle(fillColor, alpha);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 6; i++) g.lineTo(points[i].x, points[i].y);
        g.closePath();
        g.fillPath();

        g.lineStyle(2, strokeColor, 0.8);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 6; i++) g.lineTo(points[i].x, points[i].y);
        g.closePath();
        g.strokePath();
        return g;
    }

    createHiddenPattern() {
        const g = this.scene.add.graphics();
        // Small decorative inner hex
        const innerPoints = getHexPoints(0, 0, HEX_SIZE * 0.5);
        g.lineStyle(1, 0x3a3a6e, 0.5);
        g.beginPath();
        g.moveTo(innerPoints[0].x, innerPoints[0].y);
        for (let i = 1; i < 6; i++) g.lineTo(innerPoints[i].x, innerPoints[i].y);
        g.closePath();
        g.strokePath();
        // center dot
        g.fillStyle(0x4a4a8e, 0.6);
        g.fillCircle(0, 0, 3);
        return g;
    }

    createHighlightRing() {
        const g = this.scene.add.graphics();
        const points = getHexPoints(0, 0, HEX_SIZE + 1);
        g.lineStyle(3, 0xffcc44, 0.9);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < 6; i++) g.lineTo(points[i].x, points[i].y);
        g.closePath();
        g.strokePath();
        return g;
    }

    lightenColor(color, amount) {
        let r = (color >> 16) & 0xff;
        let g = (color >> 8) & 0xff;
        let b = color & 0xff;
        r = Math.min(255, r + amount);
        g = Math.min(255, g + amount);
        b = Math.min(255, b + amount);
        return (r << 16) | (g << 8) | b;
    }

    setClickable(clickable) {
        this.isClickable = clickable;
        this.highlightGraphics.setVisible(clickable && !this.isRevealed);

        if (clickable && !this.isRevealed) {
            // Pulse animation
            if (!this._pulseTween) {
                this._pulseTween = this.scene.tweens.add({
                    targets: this.highlightGraphics,
                    alpha: { from: 0.4, to: 1 },
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        } else {
            if (this._pulseTween) {
                this._pulseTween.destroy();
                this._pulseTween = null;
            }
        }
    }

    /**
     * Flip animation to reveal the tile
     */
    flip(callback) {
        if (this.isRevealed || this.isFlipping) return;
        this.isFlipping = true;
        this.setClickable(false);

        // Phase 1: compress (hide)
        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            duration: 180,
            ease: 'Sine.easeIn',
            onComplete: () => {
                // Swap faces
                this.hiddenGraphics.setVisible(false);
                this.hiddenPattern.setVisible(false);
                this.revealedGraphics.setVisible(true);
                if (this.iconText) this.iconText.setVisible(true);

                // Phase 2: expand (reveal)
                this.scene.tweens.add({
                    targets: this,
                    scaleX: 1,
                    duration: 180,
                    ease: 'Sine.easeOut',
                    onComplete: () => {
                        this.isRevealed = true;
                        this.isFlipping = false;
                        if (callback) callback(this);
                    },
                });
            },
        });
    }

    /**
     * Immediately reveal without animation (for start tile)
     */
    revealImmediate() {
        this.isRevealed = true;
        this.hiddenGraphics.setVisible(false);
        this.hiddenPattern.setVisible(false);
        this.revealedGraphics.setVisible(true);
        if (this.iconText) this.iconText.setVisible(true);
        this.setClickable(false);
    }

    onHover() {
        if (!this.isClickable || this.isRevealed) return;
        this.setScale(1.08);
    }

    onHoverOut() {
        if (this.isRevealed) return;
        this.setScale(1.0);
    }

    onTap() {
        if (!this.isClickable || this.isRevealed || this.isFlipping) return;
        this.setScale(1.0);
        this.scene.events.emit('tile-tap', this);
    }
}
