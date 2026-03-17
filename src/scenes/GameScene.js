import Phaser from 'phaser';
import { HexTile } from '../objects/HexTile.js';
import { generateHexMap, hexKey, getNeighbors, hexToPixel } from '../utils/HexUtils.js';
import { EventType, rollEventType } from '../data/EventTypes.js';
import { HUD } from '../ui/HUD.js';

const MAP_RADIUS = 5; // number of hex rings around center
const MAX_ACTIONS_PER_DAY = 6;

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.scale;

        // -- State
        this.tileMap = new Map();  // hexKey -> HexTile
        this.day = 1;
        this.actionsLeft = MAX_ACTIONS_PER_DAY;
        this.gold = 0;
        this.gems = 0;
        this.hp = 10;
        this.maxHp = 10;

        // -- Map container (separate from HUD so camera only moves map)
        this.mapContainer = this.add.container(0, 0);

        // -- Generate map
        this.createMap();

        // -- Reveal start tile
        const startTile = this.tileMap.get(hexKey(0, 0));
        if (startTile) {
            startTile.eventType = EventType.START;
            startTile.revealImmediate();
            this.updateClickableTiles();
        }

        // -- Camera setup
        this.setupCamera();

        // -- HUD (fixed to camera)
        this.hud = new HUD(this);

        // -- Event handlers
        this.events.on('tile-tap', this.onTileTap, this);
    }

    createMap() {
        const coords = generateHexMap(MAP_RADIUS);

        coords.forEach(({ q, r }) => {
            // Determine event type (center is start, edges more dangerous)
            let eventType;
            if (q === 0 && r === 0) {
                eventType = EventType.START;
            } else {
                eventType = rollEventType();
            }

            const tile = new HexTile(this, q, r, eventType);
            this.tileMap.set(hexKey(q, r), tile);
            this.mapContainer.add(tile);
        });
    }

    setupCamera() {
        const { width, height } = this.scale;

        // Center camera on the map origin
        this.cameras.main.centerOn(0, 0);

        // Enable drag to pan
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && !this._tappedTile) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            }
        });

        // Track if we're dragging vs tapping
        this.input.on('pointerdown', (pointer) => {
            this._dragStart = { x: pointer.x, y: pointer.y };
            this._tappedTile = false;
        });

        this.input.on('pointerup', (pointer) => {
            const dx = pointer.x - this._dragStart.x;
            const dy = pointer.y - this._dragStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                // It was a drag, not a tap
                this._tappedTile = false;
            }
        });

        // Set camera bounds
        const padding = 200;
        const mapPixelRadius = (MAP_RADIUS + 2) * 36 * 2;
        this.cameras.main.setBounds(
            -mapPixelRadius - padding,
            -mapPixelRadius - padding,
            mapPixelRadius * 2 + padding * 2,
            mapPixelRadius * 2 + padding * 2
        );
    }

    /**
     * Mark tiles adjacent to revealed tiles as clickable
     */
    updateClickableTiles() {
        // First, clear all clickable states
        this.tileMap.forEach(tile => {
            if (!tile.isRevealed) {
                tile.setClickable(false);
            }
        });

        // Then, for each revealed tile, mark its unrevealed neighbors as clickable
        this.tileMap.forEach(tile => {
            if (tile.isRevealed) {
                const neighbors = getNeighbors(tile.q, tile.r);
                neighbors.forEach(({ q, r }) => {
                    const neighbor = this.tileMap.get(hexKey(q, r));
                    if (neighbor && !neighbor.isRevealed) {
                        neighbor.setClickable(true);
                    }
                });
            }
        });
    }

    /**
     * Handle tile tap
     */
    onTileTap(tile) {
        if (this.actionsLeft <= 0) {
            this.showMessage('行动点不足！点击 "下一天" 继续');
            return;
        }

        this._tappedTile = true;
        this.actionsLeft--;

        tile.flip(() => {
            // After flip, handle the event
            this.handleEvent(tile);
            this.updateClickableTiles();
            this.hud.update();

            // Check if out of actions
            if (this.actionsLeft <= 0) {
                this.time.delayedCall(500, () => {
                    this.showMessage('今日行动结束！点击 "下一天" 继续');
                });
            }
        });

        this.hud.update();
    }

    /**
     * Handle event after tile reveal
     */
    handleEvent(tile) {
        switch (tile.eventType) {
            case EventType.TREASURE:
                const goldGain = Phaser.Math.Between(5, 20);
                this.gold += goldGain;
                this.showFloatingText(tile, `+${goldGain} 💰`, 0xffd700);
                break;

            case EventType.ENEMY:
                const damage = Phaser.Math.Between(1, 3);
                const reward = Phaser.Math.Between(3, 10);
                this.hp = Math.max(0, this.hp - damage);
                this.gold += reward;
                this.showFloatingText(tile, `-${damage} ❤️  +${reward} 💰`, 0xff4444);
                if (this.hp <= 0) {
                    this.time.delayedCall(600, () => this.gameOver());
                }
                break;

            case EventType.NPC:
                const heal = Phaser.Math.Between(1, 3);
                this.hp = Math.min(this.maxHp, this.hp + heal);
                this.showFloatingText(tile, `+${heal} ❤️`, 0x44ff44);
                break;

            case EventType.SHRINE:
                this.gems += 1;
                this.maxHp += 1;
                this.hp = Math.min(this.maxHp, this.hp + 2);
                this.showFloatingText(tile, `+1 💎  HP上限+1`, 0xaa66ff);
                break;

            case EventType.RUINS:
                const ruinGold = Phaser.Math.Between(8, 25);
                this.gold += ruinGold;
                this.gems += Phaser.Math.Between(0, 1);
                this.showFloatingText(tile, `+${ruinGold} 💰`, 0xccaa77);
                break;

            default:
                // Grass/Forest/Empty — no special event
                break;
        }
    }

    /**
     * Show floating text above a tile
     */
    showFloatingText(tile, text, color) {
        const pos = hexToPixel(tile.q, tile.r);
        const floatText = this.add.text(pos.x, pos.y - 20, text, {
            fontSize: '16px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            color: `#${color.toString(16).padStart(6, '0')}`,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        this.mapContainer.add(floatText);

        this.tweens.add({
            targets: floatText,
            y: pos.y - 60,
            alpha: 0,
            duration: 1200,
            ease: 'Cubic.easeOut',
            onComplete: () => floatText.destroy(),
        });
    }

    /**
     * Show message banner
     */
    showMessage(msg) {
        // This is handled by HUD
        this.hud.showBanner(msg);
    }

    /**
     * Next day
     */
    nextDay() {
        this.day++;
        this.actionsLeft = MAX_ACTIONS_PER_DAY;
        this.hud.update();
        this.hud.showBanner(`第 ${this.day} 天开始！`);
    }

    /**
     * Game over
     */
    gameOver() {
        this.hud.showBanner('💀 探索结束！');
        // Disable all tiles
        this.tileMap.forEach(tile => tile.setClickable(false));
        // Restart after delay
        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }
}
