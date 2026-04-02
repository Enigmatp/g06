import Phaser from 'phaser';

// -- Grid config --
const GRID_SIZE = 8;

// Colors
const COLOR_GRASS = 0x6dd06d;
const COLOR_FOG = 0x4a4a6e;
const COLOR_DISCOVERABLE = 0x7878a8;
const COLOR_DISC_BORDER = 0xaabb55;
const COLOR_LOCKED = 0x8b2222;
const COLOR_LOCKED_BORDER = 0xff3333;
const COLOR_HOVER = 0xffee88;
const PLAYER_SCALE = 0.26;
const SKELETON_SCALE = 0.22;
const ITEM_SCALE = 0.45;
const SOLDIER_SCALE = 0.28;


// Center tiles (player starts here)
const CENTER = Math.floor(GRID_SIZE / 2);
const PLAYER_START_COL = CENTER - 1;
const PLAYER_START_ROW = CENTER - 1;

// Soldier panel
const SOLDIER_ROWS = 5;
const SOLDIER_COLS = 3;
const SOLDIER_COUNT = SOLDIER_ROWS * SOLDIER_COLS;
const SOLDIER_MAX_HP = 100;
const ENEMY_MAX_HP = 10;         // 1/10 of player
const ATTACK_DMG_MIN = 8;
const ATTACK_DMG_MAX = 20;
const ENEMY_DMG_MIN = 16;       // 2x player
const ENEMY_DMG_MAX = 40;
const HP_BAR_Y_OFFSET = -60;   // pixels above spine origin to reach head

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.spineBinary('king-data', 'spine/King/King.skel');
        this.load.spineAtlas('king-atlas', 'spine/King/King.atlas');
        this.load.spineBinary('skeleton-data', 'spine/Skeleton/Skeleton.skel');
        this.load.spineAtlas('skeleton-atlas', 'spine/Skeleton/Skeleton.atlas');
        this.load.spineBinary('warrior-data', 'spine/Warrior/Warrior.skel');
        this.load.spineAtlas('warrior-atlas', 'spine/Warrior/Warrior.atlas');
        this.load.image('home', 'sprite/home.png');
        this.load.image('gem', 'sprite/gem.png');
        this.load.image('book', 'sprite/book.png');
        this.load.image('tower', 'sprite/tower.png');
        this.load.image('ticket', 'sprite/ticket.png');
        this.load.image('well', 'sprite/well.png');
        this.load.image('cross', 'sprite/cross.png');
        this.load.image('chest', 'sprite/chest.png');
        this.load.image('bg_tile', 'sprite/bg_tile.png');
    }

    create() {
        const { width, height } = this.scale;

        // ── Layout: grid in middle, panel above, bottom bar below ──
        const BOTTOM_BAR_H = 80; // space below grid for evacuate/backpack buttons
        // Grid sized to fit screen width
        this.tileSize = Math.floor(width / GRID_SIZE);
        const gridW = this.tileSize * GRID_SIZE;
        const gridH = this.tileSize * GRID_SIZE;
        this.offsetX = (width - gridW) / 2;
        // Grid sits above bottom bar
        this.offsetY = height - gridH - BOTTOM_BAR_H;
        // Panel height = space above grid, reduced by 10%
        this.panelHeight = Math.floor(this.offsetY * 0.9);

        // Grid state
        this.grid = [];
        this.tileContent = [];
        this.contentObjects = [];
        this.locked = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            this.grid[r] = [];
            this.tileContent[r] = [];
            this.contentObjects[r] = [];
            this.locked[r] = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                this.grid[r][c] = 'fog';
                this.tileContent[r][c] = null;
                this.contentObjects[r][c] = null;
                this.locked[r][c] = false;
            }
        }

        // Pre-determine home position (ring distance >= 3 from center)
        this.homeCol = -1;
        this.homeRow = -1;
        this.placeHomePosition();

        // Pre-determine 2 tower positions
        this.towerPositions = [];
        this.placeTowerPositions(2);

        // Player starts near center
        this.playerCol = PLAYER_START_COL;
        this.playerRow = PLAYER_START_ROW;
        this.grid[this.playerRow][this.playerCol] = 'grass';

        // Tile containers
        this.tileObjects = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            this.tileObjects[r] = [];
        }

        this.hoveredTile = null;
        this.isBusy = false;
        this.isMarching = false;

        // Inventory — persisted across levels
        this.tickets = this.registry.get('tickets') || 0;
        this.collectedBooks = this.registry.get('collectedBooks') || 0;
        this.collectedGems = this.registry.get('collectedGems') || 0;
        this.revivalCrosses = this.registry.get('revivalCrosses') || 0;
        this.currentLevel = (this.registry.get('currentLevel') || 0) + 1;
        this.registry.set('currentLevel', this.currentLevel);

        // Pre-place special tiles
        this.ticketCol = -1; this.ticketRow = -1;
        this.wellCol = -1; this.wellRow = -1;
        this.crossCol = -1; this.crossRow = -1;
        this.placeTicketPosition();
        this.placeWellPosition();
        this.placeCrossPosition();

        this.createSoldierPanel();

        // Store original dwarf positions for battle returning
        this.soldierStartPositions = this.soldiers.map(s => ({ x: s.x, y: s.y }));

        this.drawGrid();
        this.refreshDiscoverable();
        this.drawPlayer();
        this.createBottomBar();

        this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
        this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    // ── Soldier status panel ────────────────────────────────────

    createSoldierPanel() {
        const { width } = this.scale;
        const ph = this.panelHeight;

        // ── Tiling background using TileSprite (seamless, no gaps) ──
        const bgTex = this.textures.get('bg_tile');
        const bgFrame = bgTex.getSourceImage();
        const bgH = bgFrame.height;
        this.bgTileSprite = this.add.tileSprite(0, 0, width, ph, 'bg_tile');
        this.bgTileSprite.setOrigin(0, 0);
        this.bgTileSprite.setDepth(0);
        this.bgTileSprite.setTileScale(ph / bgH, ph / bgH);

        // Panel border / separator
        const border = this.add.graphics().setDepth(0.5);
        border.lineStyle(2, 0x444466, 0.8);
        border.lineBetween(0, ph, width, ph);

        // Level label top-center of panel
        if (this.levelLabel) this.levelLabel.destroy();
        this.levelLabel = this.add.text(width / 2, 14, `第 ${this.currentLevel} 层`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffdd88',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(10);

        // Scrolling ground stripes for marching effect
        this.groundStripes = this.add.graphics().setDepth(0.1);
        this.groundScrollX = 0;

        // ── Load persisted soldier states from registry ──
        const savedStates = this.registry.get('soldierStates') || [];

        // ── Create 15 soldiers in 3 cols x 5 rows on LEFT half, facing RIGHT ──
        if (this.soldiers) {
            this.soldiers.forEach(s => { if (s && s.destroy) s.destroy(); });
        }
        this.soldiers = [];
        this.soldierStartPositions = [];
        const colSpacing = 70;
        const rowSpacing = 45;
        const formationH = (SOLDIER_ROWS - 1) * rowSpacing;
        const startX = width * 0.15;
        const startY = ph - formationH - 20;

        for (let row = 0; row < SOLDIER_ROWS; row++) {
            for (let col = 0; col < SOLDIER_COLS; col++) {
                const idx = row * SOLDIER_COLS + col;
                const x = startX + col * colSpacing + (row % 2 === 0 ? 0 : colSpacing * 0.3);
                const y = startY + row * rowSpacing - 20;
                const depth = 1 + row * 0.1;

                const savedState = savedStates[idx];
                const savedHp = savedState ? savedState.hp : SOLDIER_MAX_HP;
                const isDead = savedState ? savedState.dead : false;

                if (isDead) {
                    // Place tombstone, no spine, no hp bar
                    const tomb = this.add.text(x, y, '🪦', { fontSize: '28px' })
                        .setOrigin(0.5, 1).setDepth(5);
                    // Push a dummy object so array indices stay aligned
                    const dummy = {
                        x, y, hp: 0, maxHp: SOLDIER_MAX_HP, hpBar: null, dead: true, tombstone: tomb,
                        setVisible: () => { }, destroy: () => { if (dummy.tombstone) dummy.tombstone.destroy(); }
                    };
                    this.soldiers.push(dummy);
                } else {
                    const soldier = this.add.spine(x, y, 'warrior-data', 'warrior-atlas');
                    const skin = soldier.skeleton.data.findSkin('矮人战士');
                    if (skin) { soldier.skeleton.setSkin(skin); soldier.skeleton.setSlotsToSetupPose(); }
                    soldier.setScale(SOLDIER_SCALE, SOLDIER_SCALE);
                    soldier.setDepth(depth);
                    try { soldier.animationState.setAnimation(0, 'Idle', true); } catch (e) {
                        try { soldier.animationState.setAnimation(0, 'idle', true); } catch (e2) { }
                    }
                    soldier.animationState.timeScale = 1.5;

                    soldier.hp = savedHp;
                    soldier.maxHp = SOLDIER_MAX_HP;
                    soldier.dead = false;
                    soldier.hpBar = this.createHpBar(x, y, soldier.hp, soldier.maxHp, 0x33dd55);

                    this.soldiers.push(soldier);
                }
                this.soldierStartPositions.push({ x, y });
            }
        }
    }

    createHpBar(x, y, hp, maxHp, color = 0x33dd55) {
        const bar = this.add.graphics();
        bar.setDepth(10);
        this.refreshHpBar(bar, x, y + HP_BAR_Y_OFFSET, hp, maxHp, color);
        return bar;
    }

    refreshHpBar(bar, x, y, hp, maxHp, color = 0x33dd55) {
        bar.clear();
        const w = 40;
        const h = 5;
        // Background
        bar.fillStyle(0x220000);
        bar.fillRect(x - w / 2, y, w, h);
        // Foreground
        const pct = Math.max(0, hp / maxHp);
        bar.fillStyle(pct > 0.5 ? 0x33dd55 : pct > 0.25 ? 0xffaa00 : 0xff2222);
        bar.fillRect(x - w / 2, y, Math.floor(w * pct), h);
    }

    drawGroundStripes() {
        // Ground stripes removed — background image covers the panel
    }

    scrollBgTiles() {
        if (!this.bgTileSprite) return;
        this.bgTileSprite.tilePositionX += 6;
    }

    setSoldiersMarching() {
        if (this.isMarching) return;
        this.isMarching = true;

        for (const soldier of this.soldiers) {
            try {
                soldier.animationState.setAnimation(0, 'Run', true);
            } catch (e) {
                try { soldier.animationState.setAnimation(0, 'Move', true); } catch (e2) { }
            }
        }

        // Start background scrolling
        if (this.groundScrollTween) this.groundScrollTween.stop();
        this.groundScrollTween = this.tweens.addCounter({
            from: 0,
            to: 1000,
            duration: 5000,
            repeat: -1,
            onUpdate: () => {
                this.scrollBgTiles();
            }
        });
    }

    setSoldiersIdle() {
        if (!this.isMarching) return;
        this.isMarching = false;

        for (const soldier of this.soldiers) {
            try {
                soldier.animationState.setAnimation(0, 'Idle', true);
            } catch (e) {
                try { soldier.animationState.setAnimation(0, 'idle', true); } catch (e2) { }
            }
        }

        // Stop ground scrolling
        if (this.groundScrollTween) {
            this.groundScrollTween.stop();
            this.groundScrollTween = null;
        }
    }

    // ── Placement ───────────────────────────────────────────────

    ringDistance(col, row) {
        return Math.max(Math.abs(col - PLAYER_START_COL), Math.abs(row - PLAYER_START_ROW));
    }

    placeHomePosition() {
        const candidates = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.ringDistance(c, r) >= 3) {
                    candidates.push({ col: c, row: r });
                }
            }
        }
        if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            this.homeCol = pick.col;
            this.homeRow = pick.row;
        }
    }

    // Returns true if {col,row} is adjacent (incl. diagonal) to any already-placed building
    _isBuildingNearby(col, row) {
        const occupied = [];
        if (this.homeCol >= 0) occupied.push({ col: this.homeCol, row: this.homeRow });
        for (const tp of (this.towerPositions || [])) occupied.push(tp);
        for (const b of occupied) {
            if (Math.abs(b.col - col) <= 1 && Math.abs(b.row - row) <= 1) return true;
        }
        return false;
    }

    placeTowerPositions(count) {
        const candidates = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (c === PLAYER_START_COL && r === PLAYER_START_ROW) continue;
                if (c === this.homeCol && r === this.homeRow) continue;
                if (this._isBuildingNearby(c, r)) continue;  // no adjacent buildings
                if (this.ringDistance(c, r) >= 2) {
                    candidates.push({ col: c, row: r });
                }
            }
        }
        // Shuffle, then pick greedily with spacing
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        this.towerPositions = [];
        for (const c of candidates) {
            if (this.towerPositions.length >= count) break;
            if (!this._isBuildingNearby(c.col, c.row)) {
                this.towerPositions.push(c);
            }
        }
    }

    placeTicketPosition() {
        // 30% chance to spawn a ticket this level
        if (Math.random() > 0.30) return;
        const excluded = new Set();
        excluded.add(`${PLAYER_START_COL},${PLAYER_START_ROW}`);
        if (this.homeCol >= 0) excluded.add(`${this.homeCol},${this.homeRow}`);
        for (const tp of (this.towerPositions || [])) excluded.add(`${tp.col},${tp.row}`);
        const candidates = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!excluded.has(`${c},${r}`)) candidates.push({ col: c, row: r });
            }
        }
        if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            this.ticketCol = pick.col;
            this.ticketRow = pick.row;
        }
    }

    _pickRandomTile(alsoExclude = []) {
        const excluded = new Set();
        excluded.add(`${PLAYER_START_COL},${PLAYER_START_ROW}`);
        if (this.homeCol >= 0) excluded.add(`${this.homeCol},${this.homeRow}`);
        for (const tp of (this.towerPositions || [])) excluded.add(`${tp.col},${tp.row}`);
        if (this.ticketCol >= 0) excluded.add(`${this.ticketCol},${this.ticketRow}`);
        for (const { col, row } of alsoExclude) excluded.add(`${col},${row}`);
        const candidates = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!excluded.has(`${c},${r}`)) candidates.push({ col: c, row: r });
            }
        }
        return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    }

    placeWellPosition() {
        const pick = this._pickRandomTile();
        if (pick) { this.wellCol = pick.col; this.wellRow = pick.row; }
    }

    placeCrossPosition() {
        // 30% chance to spawn a revival cross this level
        if (Math.random() > 0.30) return;
        const pick = this._pickRandomTile(
            this.wellCol >= 0 ? [{ col: this.wellCol, row: this.wellRow }] : []
        );
        if (pick) { this.crossCol = pick.col; this.crossRow = pick.row; }
    }

    // ── Coordinate conversion ───────────────────────────────────

    gridToScreen(col, row) {
        const x = this.offsetX + col * this.tileSize + this.tileSize / 2;
        const y = this.offsetY + row * this.tileSize + this.tileSize / 2;
        return { x, y };
    }

    screenToGrid(screenX, screenY) {
        const col = Math.floor((screenX - this.offsetX) / this.tileSize);
        const row = Math.floor((screenY - this.offsetY) / this.tileSize);
        return { col, row };
    }

    isValid(col, row) {
        return col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE;
    }

    isAdjacentToGrass(col, row) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dc, dr] of dirs) {
            const nc = col + dc;
            const nr = row + dr;
            if (this.isValid(nc, nr) && this.grid[nr][nc] === 'grass') {
                return true;
            }
        }
        return false;
    }

    // ── Grid drawing ────────────────────────────────────────────

    drawGrid() {
        if (this.tileLayer) this.tileLayer.destroy();
        this.tileLayer = this.add.container(0, 0);

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const { x, y } = this.gridToScreen(c, r);
                const state = this.grid[r][c];
                const container = this.drawTile(x, y, state, c, r);
                container.setDepth(r + 2);
                this.tileLayer.add(container);
                this.tileObjects[r][c] = container;
            }
        }
    }

    drawTile(x, y, state, col, row, discoverable = false) {
        const container = this.add.container(x, y);
        const isLocked = this.locked[row][col];
        const s = this.tileSize;
        const gap = 2;

        let fillColor;
        if (state === 'grass') {
            fillColor = COLOR_GRASS;
        } else if (isLocked) {
            fillColor = COLOR_LOCKED;
        } else if (discoverable) {
            fillColor = COLOR_DISCOVERABLE;
        } else {
            fillColor = COLOR_FOG;
        }

        const g = this.add.graphics();

        const half = (s - gap) / 2;
        g.fillStyle(fillColor, 1);
        g.fillRoundedRect(-half, -half, s - gap, s - gap, 6);

        if (isLocked) {
            g.lineStyle(2, COLOR_LOCKED_BORDER, 0.8);
        } else if (discoverable) {
            g.lineStyle(2, COLOR_DISC_BORDER, 0.8);
        } else {
            g.lineStyle(1, 0x000000, 0.12);
        }
        g.strokeRoundedRect(-half, -half, s - gap, s - gap, 6);

        // Fog pattern
        if (state === 'fog' && !discoverable && !isLocked) {
            g.fillStyle(0x222244, 0.3);
            g.fillCircle(0, 0, 6);
            g.fillCircle(-10, -4, 4);
            g.fillCircle(10, 4, 4);
        }

        // X mark on locked tiles
        if (isLocked) {
            const xSize = half * 0.4;
            g.lineStyle(3, 0xff4444, 0.7);
            g.lineBetween(-xSize, -xSize, xSize, xSize);
            g.lineBetween(-xSize, xSize, xSize, -xSize);
        }

        container.add(g);
        container.setData('col', col);
        container.setData('row', row);
        container.setData('graphics', g);
        container.setData('discoverable', discoverable);

        return container;
    }

    redrawTile(col, row) {
        if (!this.isValid(col, row)) return;
        const old = this.tileObjects[row][col];
        if (old) old.destroy();

        const { x, y } = this.gridToScreen(col, row);
        const state = this.grid[row][col];
        const discoverable = state === 'fog' && !this.locked[row][col] && this.isAdjacentToGrass(col, row);
        const container = this.drawTile(x, y, state, col, row, discoverable);
        container.setDepth(row + 2);
        this.tileLayer.add(container);
        this.tileObjects[row][col] = container;
    }

    refreshDiscoverable() {
        const toRefresh = new Set();
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (this.grid[r][c] === 'fog') {
                    const isLockedTile = this.locked[r][c];
                    const shouldBe = !isLockedTile && this.isAdjacentToGrass(c, r);
                    const currentlyIs = this.tileObjects[r][c]?.getData('discoverable') || false;
                    if (shouldBe !== currentlyIs || isLockedTile) {
                        toRefresh.add(`${r},${c}`);
                    }
                }
            }
        }
        for (const key of toRefresh) {
            const [r, c] = key.split(',').map(Number);
            this.redrawTile(c, r);
        }
    }

    highlightTile(col, row) {
        const obj = this.tileObjects[row]?.[col];
        if (!obj) return;
        const g = obj.getData('graphics');
        if (!g) return;
        const s = this.tileSize;
        const gap = 2;
        const half = (s - gap) / 2;
        g.fillStyle(COLOR_HOVER, 0.3);
        g.fillRoundedRect(-half, -half, s - gap, s - gap, 6);
    }

    clearHighlight(col, row) {
        if (this.isValid(col, row)) {
            this.redrawTile(col, row);
        }
    }

    // ── Player ──────────────────────────────────────────────────

    drawPlayer() {
        if (this.playerSpine) this.playerSpine.destroy();

        const { x, y } = this.gridToScreen(this.playerCol, this.playerRow);
        this.playerSpine = this.add.spine(x, y, 'king-data', 'king-atlas');
        this.playerSpine.setDepth(this.playerRow + 2.5);

        const skeleton = this.playerSpine.skeleton;
        const skin = skeleton.data.findSkin('元帅');
        if (skin) {
            skeleton.setSkin(skin);
            skeleton.setSlotsToSetupPose();
        }
        this.playerSpine.setScale(PLAYER_SCALE);
        this.playerSpine.animationState.setAnimation(0, 'Idle', true);
        this.playerSpine.animationState.timeScale = 2;
    }

    faceToward(col, row) {
        const { x: targetX } = this.gridToScreen(col, row);
        const currentX = this.playerSpine.x;
        if (targetX < currentX) {
            this.playerSpine.setScale(-PLAYER_SCALE, PLAYER_SCALE);
        } else if (targetX > currentX) {
            this.playerSpine.setScale(PLAYER_SCALE, PLAYER_SCALE);
        }
    }

    // ── Tile content system ─────────────────────────────────────

    rollTileContent(col, row) {
        if (col === this.homeCol && row === this.homeRow) return 'home';
        for (const tp of this.towerPositions) {
            if (col === tp.col && row === tp.row) return 'tower';
        }
        if (col === this.ticketCol && row === this.ticketRow) return 'ticket';
        if (col === this.wellCol && row === this.wellRow) return 'well';
        if (col === this.crossCol && row === this.crossRow) return 'cross';

        // Base random roll (no chest here)
        const roll = Math.random();
        let content;
        if (roll < 0.25) content = null;
        else if (roll < 0.50) content = 'gem';
        else if (roll < 0.75) content = 'skeleton';
        else content = 'book';

        // Adjacent-skeleton check: if a revealed neighbour is a skeleton, 20% → chest
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const hasAdjacentSkeleton = dirs.some(([dr, dc]) => {
            const nr = row + dr, nc = col + dc;
            return this.isValid(nc, nr) &&
                this.grid[nr] && this.grid[nr][nc] === 'grass' &&
                this.tileContent[nr] && this.tileContent[nr][nc] === 'skeleton';
        });
        if (hasAdjacentSkeleton && Math.random() < 0.20) content = 'chest';

        return content;
    }

    placeContentOnTile(col, row, content) {
        if (!content) return;

        const { x, y } = this.gridToScreen(col, row);
        const depth = row + 2.3;

        if (content === 'skeleton') {
            const spine = this.add.spine(x, y, 'skeleton-data', 'skeleton-atlas');
            const skinName = Math.random() < 0.5 ? '骷髅兵' : '骷髅勇士';
            const skin = spine.skeleton.data.findSkin(skinName);
            if (skin) {
                spine.skeleton.setSkin(skin);
                spine.skeleton.setSlotsToSetupPose();
            }
            spine.setScale(SKELETON_SCALE);
            spine.setDepth(depth);
            spine.animationState.setAnimation(0, 'Idle', true);
            spine.animationState.timeScale = 2;
            spine.skeletonName = skinName; // Store skin name for panel use
            this.contentObjects[row][col] = spine;
        } else if (content === 'tower') {
            // Tower sprite + "瞭望塔" label
            const container = this.add.container(x, y - 10);
            const sprite = this.add.image(0, 0, 'tower');
            sprite.setScale(ITEM_SCALE);
            const label = this.add.text(0, -sprite.displayHeight * ITEM_SCALE / 2 - 12, '瞭望塔', {
                fontSize: '11px',
                fontFamily: 'Arial',
                color: '#88ccff',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([sprite, label]);
            container.setDepth(depth);
            this.contentObjects[row][col] = container;
        } else if (content === 'ticket') {
            const container = this.add.container(x, y - 10);
            const sprite = this.add.image(0, 0, 'ticket');
            sprite.setScale(ITEM_SCALE);
            const label = this.add.text(0, -sprite.displayHeight * ITEM_SCALE / 2 - 12, '撤离卷', {
                fontSize: '11px',
                fontFamily: 'Arial',
                color: '#ffdd44',
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([sprite, label]);
            container.setDepth(depth);
            this.contentObjects[row][col] = container;
        } else if (content === 'well') {
            const container = this.add.container(x, y);
            const ts = this.tileSize;
            // Semi-transparent circle background
            const bg = this.add.graphics();
            bg.fillStyle(0x3388cc, 0.55);
            bg.fillCircle(0, 0, ts * 0.36);
            // Emoji icon
            const icon = this.add.text(0, -4, '🪣', { fontSize: `${Math.floor(ts * 0.42)}px` }).setOrigin(0.5);
            // Label
            const label = this.add.text(0, ts * 0.3, '水井', {
                fontSize: '11px', fontFamily: 'Arial', color: '#88ddff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([bg, icon, label]);
            container.setDepth(depth);
            this.contentObjects[row][col] = container;
        } else if (content === 'cross') {
            const container = this.add.container(x, y);
            const ts = this.tileSize;
            // Semi-transparent circle background
            const bg = this.add.graphics();
            bg.fillStyle(0xddaa44, 0.55);
            bg.fillCircle(0, 0, ts * 0.36);
            // Emoji icon
            const icon = this.add.text(0, -4, '✝️', { fontSize: `${Math.floor(ts * 0.40)}px` }).setOrigin(0.5);
            // Label
            const label = this.add.text(0, ts * 0.3, '复活十字架', {
                fontSize: '11px', fontFamily: 'Arial', color: '#ffddaa',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([bg, icon, label]);
            container.setDepth(depth);
            this.contentObjects[row][col] = container;
        } else if (content === 'home') {
            // Home tile — labeled container
            const container = this.add.container(x, y - 10);
            const sprite = this.add.image(0, 0, 'home');
            sprite.setScale(ITEM_SCALE);
            const label = this.add.text(0, -sprite.displayHeight * ITEM_SCALE / 2 - 12, '下一关', {
                fontSize: '11px', fontFamily: 'Arial', color: '#ffdd44',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([sprite, label]);
            container.setDepth(depth);
            this.contentObjects[row][col] = container;
        } else if (content === 'chest') {
            // Chest tile — sprite + label
            const container = this.add.container(x, y - 10);
            const sprite = this.add.image(0, 0, 'chest');
            sprite.setScale(ITEM_SCALE);
            const label = this.add.text(0, -sprite.displayHeight * ITEM_SCALE / 2 - 12, '宝箱', {
                fontSize: '11px', fontFamily: 'Arial', color: '#ffcc44',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5);
            container.add([sprite, label]);
            container.setDepth(depth);
            this.contentObjects[row][col] = container;
        } else {
            const sprite = this.add.image(x, y - 10, content);
            sprite.setScale(ITEM_SCALE);
            sprite.setDepth(depth);
            this.contentObjects[row][col] = sprite;
        }
    }

    removeContentObject(col, row) {
        const obj = this.contentObjects[row]?.[col];
        if (obj) {
            obj.destroy();
            this.contentObjects[row][col] = null;
        }
    }

    // ── Tower auto-reveal ───────────────────────────────────────

    autoRevealAroundTower(col, row) {
        const tilesToReveal = [];
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dc === 0 && dr === 0) continue;
                const nc = col + dc;
                const nr = row + dr;
                if (this.isValid(nc, nr) && this.grid[nr][nc] === 'fog') {
                    tilesToReveal.push({ col: nc, row: nr });
                }
            }
        }

        let delay = 0;
        for (const tile of tilesToReveal) {
            this.time.delayedCall(delay, () => {
                if (this.grid[tile.row][tile.col] !== 'fog') return;
                this.locked[tile.row][tile.col] = false;
                this.grid[tile.row][tile.col] = 'grass';
                const content = this.rollTileContent(tile.col, tile.row);
                this.tileContent[tile.row][tile.col] = content;
                this.redrawTile(tile.col, tile.row);
                this.placeContentOnTile(tile.col, tile.row, content);
                if (content === 'skeleton') {
                    this.lockTilesAroundSkeleton(tile.col, tile.row);
                }
            });
            delay += 60;
        }

        this.time.delayedCall(delay + 100, () => {
            this.refreshDiscoverable();
            // Chain activation: if revealed tiles contain towers, activate them
            for (const tile of tilesToReveal) {
                if (this.tileContent[tile.row]?.[tile.col] === 'tower') {
                    this.time.delayedCall(200, () => {
                        this.autoRevealAroundTower(tile.col, tile.row);
                    });
                }
            }
        });

        this.showFloatingText(col, row, '🗼 Tower!', '#88ccff');
    }

    // ── Skeleton locking ────────────────────────────────────────

    lockTilesAroundSkeleton(col, row) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dc, dr] of dirs) {
            const nc = col + dc;
            const nr = row + dr;
            if (this.isValid(nc, nr) && this.grid[nr][nc] === 'fog') {
                this.locked[nr][nc] = true;
            }
        }
        this.refreshDiscoverable();
    }

    unlockTilesAroundSkeleton(col, row) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dc, dr] of dirs) {
            const nc = col + dc;
            const nr = row + dr;
            if (this.isValid(nc, nr) && this.grid[nr][nc] === 'fog') {
                let stillLocked = false;
                const dirs4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dc2, dr2] of dirs4) {
                    const sc = nc + dc2;
                    const sr = nr + dr2;
                    if (this.isValid(sc, sr) && this.tileContent[sr][sc] === 'skeleton'
                        && !(sc === col && sr === row)) {
                        stillLocked = true;
                        break;
                    }
                }
                if (!stillLocked) {
                    this.locked[nr][nc] = false;
                }
            }
        }
        this.refreshDiscoverable();
    }

    findNearestGrassTile(col, row) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let best = null;
        let bestDist = Infinity;
        // Candidate tiles must be grass, with no blocking content and adjacent to the player
        const blocked = new Set(['skeleton', 'tower', 'home']);
        for (const [dc, dr] of dirs) {
            const nc = col + dc;
            const nr = row + dr;
            if (this.isValid(nc, nr) && this.grid[nr][nc] === 'grass' && !blocked.has(this.tileContent[nr][nc])) {
                const dist = Math.abs(nc - this.playerCol) + Math.abs(nr - this.playerRow);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { col: nc, row: nr };
                }
            }
        }
        return best || { col: this.playerCol, row: this.playerRow };
    }

    // ── Input handling ──────────────────────────────────────────

    onPointerMove(pointer) {
        const { col, row } = this.screenToGrid(pointer.x, pointer.y);

        if (this.hoveredTile) {
            this.clearHighlight(this.hoveredTile.col, this.hoveredTile.row);
            this.hoveredTile = null;
        }

        if (!this.isValid(col, row)) return;

        if (this.grid[row][col] === 'fog' && !this.locked[row][col] && this.isAdjacentToGrass(col, row)) {
            this.highlightTile(col, row);
            this.hoveredTile = { col, row };
        } else if (this.grid[row][col] === 'grass' && (col !== this.playerCol || row !== this.playerRow)) {
            this.highlightTile(col, row);
            this.hoveredTile = { col, row };
        }
    }

    onPointerDown(pointer) {
        if (this.isBusy) return;
        const { col, row } = this.screenToGrid(pointer.x, pointer.y);
        if (!this.isValid(col, row)) return;

        if (this.grid[row][col] === 'fog' && !this.locked[row][col] && this.isAdjacentToGrass(col, row)) {
            this.attackTile(col, row);
        } else if (this.grid[row][col] === 'grass') {
            this.interactWithTile(col, row);
        }
    }

    // ── Attack / Reveal ─────────────────────────────────────────

    attackTile(col, row) {
        this.isBusy = true;
        this.faceToward(col, row);

        this.playerSpine.animationState.setAnimation(0, 'Attack', false);

        // Fire magic ball after a short delay (mid-attack animation)
        this.time.delayedCall(200, () => {
            this.fireMagicBall(col, row);
        });

        this.playerSpine.animationState.addListener({
            complete: (entry) => {
                if (entry.animation.name === 'Attack') {
                    this.playerSpine.animationState.clearListeners();
                    this.playerSpine.animationState.setAnimation(0, 'Idle', true);
                }
            }
        });
    }

    fireMagicBall(targetCol, targetRow) {
        // Start position: near the player's staff (offset up and forward)
        const facingRight = this.playerSpine.scaleX > 0;
        const startX = this.playerSpine.x + (facingRight ? 20 : -20);
        const startY = this.playerSpine.y - 40;

        const { x: endX, y: endY } = this.gridToScreen(targetCol, targetRow);

        // Create magic ball
        const ball = this.add.graphics().setDepth(9000);
        ball.x = startX;
        ball.y = startY;

        // Outer glow
        ball.fillStyle(0x44aaff, 0.3);
        ball.fillCircle(0, 0, 14);
        // Inner glow
        ball.fillStyle(0x88ddff, 0.6);
        ball.fillCircle(0, 0, 9);
        // Core
        ball.fillStyle(0xffffff, 1);
        ball.fillCircle(0, 0, 5);

        // Fly to target
        this.tweens.add({
            targets: ball,
            x: endX,
            y: endY,
            duration: 150,
            ease: 'Quad.easeIn',
            onUpdate: () => {
                // Spawn trail particles
                const trail = this.add.graphics().setDepth(8999);
                trail.x = ball.x;
                trail.y = ball.y;
                trail.fillStyle(0x88ddff, 0.5);
                trail.fillCircle(0, 0, 4);
                this.tweens.add({
                    targets: trail,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 200,
                    onComplete: () => trail.destroy()
                });
            },
            onComplete: () => {
                // Impact flash
                const flash = this.add.graphics().setDepth(9001);
                flash.x = endX;
                flash.y = endY;
                flash.fillStyle(0xffffff, 0.8);
                flash.fillCircle(0, 0, 20);
                this.tweens.add({
                    targets: flash,
                    alpha: 0,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 200,
                    onComplete: () => flash.destroy()
                });

                ball.destroy();
                this.revealTile(targetCol, targetRow);
            }
        });
    }

    revealTile(col, row) {
        const tileObj = this.tileObjects[row][col];
        if (!tileObj) { this.isBusy = false; return; }

        this.tweens.add({
            targets: tileObj,
            scaleX: 0,
            scaleY: 0.5,
            duration: 150,
            ease: 'Sine.easeIn',
            onComplete: () => {
                this.grid[row][col] = 'grass';
                const content = this.rollTileContent(col, row);
                this.tileContent[row][col] = content;

                this.redrawTile(col, row);
                const newObj = this.tileObjects[row][col];
                newObj.setScale(0, 0.5);

                this.refreshDiscoverable();

                this.tweens.add({
                    targets: newObj,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.placeContentOnTile(col, row, content);
                        if (content === 'skeleton') {
                            this.lockTilesAroundSkeleton(col, row);
                        }
                        if (content === 'tower') {
                            this.time.delayedCall(300, () => {
                                this.autoRevealAroundTower(col, row);
                            });
                        }
                        this.isBusy = false;
                    }
                });
            }
        });
    }

    // ── Tile interaction ────────────────────────────────────────

    interactWithTile(col, row) {
        if (col === this.playerCol && row === this.playerRow) return;
        try {
            const content = this.tileContent[row][col];

            if (content === 'skeleton') {
                this.fightSkeleton(col, row);
                return;
            }

            const path = this.findPath(this.playerCol, this.playerRow, col, row);
            if (!path || path.length === 0) {
                this.showFloatingText(col, row, '🚫 No Path!', '#ff6666');
                return;
            }

            this.walkAlongPath(path);
        } catch (e) {
            console.error('[interactWithTile ERROR]', e.message);
            this.isBusy = false;
        }
    }

    // BFS pathfinding — cardinal directions only, skeletons/towers/home block
    findPath(startCol, startRow, endCol, endRow) {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const visited = {};
        const queue = [{ col: startCol, row: startRow, path: [] }];
        visited[`${startCol},${startRow}`] = true;

        while (queue.length > 0) {
            const { col, row, path } = queue.shift();

            for (const [dc, dr] of dirs) {
                const nc = col + dc;
                const nr = row + dr;
                const key = `${nc},${nr}`;

                if (!this.isValid(nc, nr)) continue;
                if (visited[key]) continue;
                if (this.grid[nr][nc] !== 'grass') continue;
                // Block any building content (skeleton, tower, home) unless it's the destination
                const content = this.tileContent[nr][nc];
                const isDest = (nc === endCol && nr === endRow);
                if (!isDest && (content === 'skeleton' || content === 'tower' || content === 'home')) continue;

                const newPath = [...path, { col: nc, row: nr }];

                if (nc === endCol && nr === endRow) {
                    return newPath;
                }

                visited[key] = true;
                queue.push({ col: nc, row: nr, path: newPath });
            }
        }

        return null;
    }

    // Walk step by step, collecting resources along the way
    walkAlongPath(path) {
        if (path.length === 0) return;

        this.isBusy = true;
        this.setSoldiersMarching();
        this.playerSpine.animationState.setAnimation(0, 'Move', true);

        const stepThrough = (index) => {
            if (index >= path.length) {
                this.setSoldiersIdle();
                this.playerSpine.animationState.setAnimation(0, 'Idle', true);
                this.isBusy = false;
                return;
            }

            const step = path[index];
            this.faceToward(step.col, step.row);
            this.playerCol = step.col;
            this.playerRow = step.row;
            const { x, y } = this.gridToScreen(step.col, step.row);
            this.playerSpine.setDepth(step.row + 2.5);

            this.tweens.add({
                targets: this.playerSpine,
                x: x,
                y: y,
                duration: 120,
                ease: 'Linear',
                onComplete: () => {
                    // Collect resources on every tile
                    const content = this.tileContent[step.row][step.col];
                    if (content === 'gem') {
                        this.collectItem(step.col, step.row, 'gem');
                    } else if (content === 'book') {
                        this.collectItem(step.col, step.row, 'book');
                    } else if (content === 'ticket') {
                        this.collectItem(step.col, step.row, 'ticket');
                    } else if (content === 'well') {
                        this.collectItem(step.col, step.row, 'well');
                    } else if (content === 'cross') {
                        this.collectItem(step.col, step.row, 'cross');
                    } else if (content === 'chest') {
                        this.collectItem(step.col, step.row, 'chest');
                    } else if (content === 'home') {
                        this.collectHome(step.col, step.row);
                        return; // Stop walking, level restarting
                    }
                    stepThrough(index + 1);
                }
            });
        };

        stepThrough(0);
    }

    collectItem(col, row, type) {
        this.removeContentObject(col, row);
        this.tileContent[row][col] = null;

        const { x: startX, y: startY } = this.gridToScreen(col, row);

        if (type === 'book') {
            this.collectedBooks++;
            this.registry.set('collectedBooks', this.collectedBooks);
            const sprite = this.add.text(startX, startY, '📖', { fontSize: '28px' })
                .setOrigin(0.5).setDepth(10000);
            // Fly to backpack button
            const tx = this.backpackBtn ? this.backpackBtn.x : startX;
            const ty = this.backpackBtn ? this.backpackBtn.y : startY;
            this.tweens.add({
                targets: sprite, x: tx, y: ty, duration: 400, ease: 'Quad.easeInOut',
                onComplete: () => {
                    sprite.destroy();
                    this.showFloatingText(col, row, '📖 +1', '#88ddff');
                    this.updateBottomBarCounts();
                }
            });
        } else if (type === 'gem') {
            this.collectedGems++;
            this.registry.set('collectedGems', this.collectedGems);
            const gemSprite = this.add.image(startX, startY, 'gem').setScale(0.4).setDepth(10000);
            const tx = this.backpackBtn ? this.backpackBtn.x : startX;
            const ty = this.backpackBtn ? this.backpackBtn.y : startY;
            this.tweens.add({
                targets: gemSprite, x: tx, y: ty, duration: 400, ease: 'Quad.easeInOut',
                onComplete: () => {
                    gemSprite.destroy();
                    this.showFloatingText(col, row, '💎 +1', '#ffffff');
                    this.updateBottomBarCounts();
                }
            });
        } else if (type === 'ticket') {
            this.tickets++;
            this.registry.set('tickets', this.tickets);
            const sprite = this.add.image(startX, startY, 'ticket').setScale(0.4).setDepth(10000);
            const tx = this.ticketCountLabel ? this.ticketCountLabel.x : startX;
            const ty = this.ticketCountLabel ? this.ticketCountLabel.y : startY;
            this.tweens.add({
                targets: sprite, x: tx, y: ty, duration: 500, ease: 'Quad.easeInOut',
                onComplete: () => {
                    sprite.destroy();
                    this.showFloatingText(col, row, '🎫 +1', '#ffdd44');
                    this.updateBottomBarCounts();
                }
            });
        } else if (type === 'well') {
            // Heal all living soldiers 25% of max HP
            const healed = [];
            this.soldiers.forEach(s => {
                if (!s.dead && s.hp > 0) {
                    const gain = Math.floor(s.maxHp * 0.25);
                    s.hp = Math.min(s.maxHp, s.hp + gain);
                    if (s.hpBar) this.refreshHpBar(s.hpBar, s.x, s.y + HP_BAR_Y_OFFSET, s.hp, s.maxHp, 0x33dd55);
                    healed.push(gain);
                }
            });
            this.showFloatingText(col, row, '💧 全员+25%血', '#88ddff');
        } else if (type === 'cross') {
            this.revivalCrosses++;
            this.registry.set('revivalCrosses', this.revivalCrosses);
            const sprite = this.add.text(startX, startY, '✝️', { fontSize: '28px' })
                .setOrigin(0.5).setDepth(10000);
            const tx = this.backpackBtn ? this.backpackBtn.x : startX;
            const ty = this.backpackBtn ? this.backpackBtn.y : startY;
            this.tweens.add({
                targets: sprite, x: tx, y: ty, duration: 500, ease: 'Quad.easeInOut',
                onComplete: () => {
                    sprite.destroy();
                    this.showFloatingText(col, row, '✝️ +1', '#ffddaa');
                }
            });
        } else if (type === 'chest') {
            // Burst: 5 gems + 3 books fly to backpack with staggered delay
            this.removeContentObject(col, row);
            this.tileContent[row][col] = null;
            const GEMS = 5, BOOKS = 3;
            this.collectedGems += GEMS;
            this.collectedBooks += BOOKS;
            this.registry.set('collectedGems', this.collectedGems);
            this.registry.set('collectedBooks', this.collectedBooks);
            const tx = this.backpackBtn ? this.backpackBtn.x : startX;
            const ty = this.backpackBtn ? this.backpackBtn.y : startY;
            const spawnBurst = (icon, count, color) => {
                for (let i = 0; i < count; i++) {
                    const sx = startX + (Math.random() - 0.5) * 40;
                    const sy = startY + (Math.random() - 0.5) * 40;
                    const s = this.add.text(sx, sy, icon, { fontSize: '22px' })
                        .setOrigin(0.5).setDepth(10001);
                    this.tweens.add({
                        targets: s, x: tx, y: ty,
                        delay: i * 80,
                        duration: 500, ease: 'Quad.easeInOut',
                        onComplete: () => { s.destroy(); }
                    });
                }
            };
            spawnBurst('💎', GEMS, '#ffffff');
            spawnBurst('📖', BOOKS, '#88ddff');
            this.time.delayedCall(600, () => {
                this.showFloatingText(col, row, `📦 大丰收!`, '#ffcc44');
                this.updateBottomBarCounts();
            });
            return; // already removed content above
        }
    }


    collectHome(col, row) {
        this.removeContentObject(col, row);
        this.tileContent[row][col] = null;

        // ── Save soldier states before restart ──
        const soldierStates = this.soldiers.map(s => ({
            hp: s.hp ?? 0,
            dead: s.dead ?? (s.hp <= 0)
        }));
        this.registry.set('soldierStates', soldierStates);

        const { width, height } = this.scale;
        // Show level-complete text prominently in screen center
        const text = this.add.text(width / 2, height / 2, '下一层', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffdd44',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5).setDepth(99999);

        this.tweens.add({
            targets: text,
            y: height / 2 - 100,
            alpha: 0,
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => {
                text.destroy();
                this.scene.restart();
            },
        });
    }

    showFloatingText(col, row, message, color) {
        const { x, y } = this.gridToScreen(col, row);
        const text = this.add.text(x, y - 40, message, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(9999);

        this.tweens.add({
            targets: text,
            y: y - 90,
            alpha: 0,
            duration: 800,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy(),
        });
    }

    // ── Skeleton combat ─────────────────────────────────────────

    fightSkeleton(skeletonCol, skeletonRow) {
        this.isBusy = true;

        const target = this.findNearestGrassTile(skeletonCol, skeletonRow);
        if (!target) {
            // No adjacent grass tile found — abort fight
            this.isBusy = false;
            return;
        }

        // Path to adjacent tile, then fight
        const path = this.findPath(this.playerCol, this.playerRow, target.col, target.row);

        const startFight = () => {
            this.faceToward(skeletonCol, skeletonRow);
            try { this.playerSpine.animationState.setAnimation(0, 'Attack', false); } catch (e) { }

            const gridSkel = this.contentObjects[skeletonRow][skeletonCol];
            const skinName = gridSkel && gridSkel.skeletonName ? gridSkel.skeletonName : '骷髅兵';

            const { width } = this.scale;
            const ph = this.panelHeight;

            // ── Spawn enemy army matching our soldier layout ──────────
            const colSpacing = 70;
            const rowSpacing = 45;
            const formationH = (SOLDIER_ROWS - 1) * rowSpacing;
            const enemyBaseX = width * 0.87;
            const enemyBaseY = ph - formationH - 20;

            const enemies = [];
            for (let r = 0; r < SOLDIER_ROWS; r++) {
                for (let c = 0; c < SOLDIER_COLS; c++) {
                    const ex = enemyBaseX + c * colSpacing + (r % 2 === 0 ? 0 : colSpacing * 0.3);
                    const ey = enemyBaseY + r * rowSpacing - 20;
                    const spine = this.add.spine(ex, ey, 'skeleton-data', 'skeleton-atlas');
                    const skinObj = spine.skeleton.data.findSkin(skinName);
                    if (skinObj) { spine.skeleton.setSkin(skinObj); spine.skeleton.setSlotsToSetupPose(); }
                    spine.setScale(-SOLDIER_SCALE, SOLDIER_SCALE);
                    spine.setDepth(1 + r * 0.1);
                    try { spine.animationState.setAnimation(0, 'Idle', true); } catch (e) { }

                    const hpBar = this.createHpBar(ex, ey, ENEMY_MAX_HP, ENEMY_MAX_HP, 0xff4444);
                    enemies.push({ spine, hp: ENEMY_MAX_HP, maxHp: ENEMY_MAX_HP, hpBar, startX: ex, startY: ey, dead: false });
                }
            }

            // ── Soldiers stay in place. Enemies march in from the right. ─────
            // Enemy col 0 (front, faces left) marches to just right of the soldiers' right edge
            const soldierRightEdgeX = this.soldierStartPositions[2].x + 20; // col 2 right edge
            const enemyFrontX = soldierRightEdgeX + 30;
            const MARCH_MS = 230;

            // Soldiers: just play Idle / switch to Attack stance — no movement
            this.soldiers.forEach(soldier => {
                if (soldier.dead || !soldier.animationState) return;
                try { soldier.animationState.setAnimation(0, 'Idle', true); } catch (e) { }
            });

            // Enemies march left to meet soldiers
            enemies.forEach(enemy => {
                try { enemy.spine.animationState.setAnimation(0, 'Move', true); } catch (e) { }
                const dx = enemy.startX - enemyBaseX; // col offset: 0, 70, 140
                this.tweens.add({
                    targets: enemy.spine,
                    x: enemyFrontX + dx,
                    duration: MARCH_MS,
                    ease: 'Linear',
                    onUpdate: () => {
                        if (enemy.hpBar) {
                            this.refreshHpBar(enemy.hpBar, enemy.spine.x, enemy.spine.y + HP_BAR_Y_OFFSET, enemy.hp, enemy.maxHp, 0xff4444);
                        }
                    },
                    onComplete: () => {
                        try { enemy.spine.animationState.setAnimation(0, 'Idle', true); } catch (e) { }
                    }
                });
            });

            // Start combat after march finishes (reliable timer instead of onComplete counting)
            this.time.delayedCall(MARCH_MS + 50, () => { startCombatLoop(); });

            // ── HP-based combat loop ──────────────────────────────────
            const killUnit = (unit, isEnemy) => {
                if (unit.dead) return;
                unit.dead = true;
                unit.hp = 0;
                if (isEnemy) {
                    try { unit.spine.animationState.setAnimation(0, 'Dead', false); } catch (e) { }
                    this.tweens.add({
                        targets: unit.spine, alpha: 0, duration: 600, delay: 400,
                        onComplete: () => { try { unit.spine.destroy(); } catch (e) { } }
                    });
                    if (unit.hpBar) { unit.hpBar.destroy(); unit.hpBar = null; }
                } else {
                    // Soldier dies: hide spine, destroy hp bar, place tombstone
                    unit.hp = 0;
                    this.tweens.add({
                        targets: unit, alpha: 0, duration: 400,
                        onComplete: () => { unit.setVisible(false); }
                    });
                    if (unit.hpBar) { unit.hpBar.destroy(); unit.hpBar = null; }
                    // Tombstone in place
                    const tomb = this.add.text(unit.x, unit.y, '🪦', {
                        fontSize: '28px'
                    }).setOrigin(0.5, 1).setDepth(5);
                    unit.tombstone = tomb;
                }
            };

            const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            let combatStarted = false;
            const startCombatLoop = () => {
                if (combatStarted) return;
                combatStarted = true;

                const endBattle = (playerWon) => {
                    // Clean up all enemy hp bars
                    enemies.forEach(e => { if (e.hpBar) { e.hpBar.destroy(); e.hpBar = null; } });

                    if (playerWon) {
                        if (gridSkel && gridSkel.active) {
                            try { gridSkel.animationState.setAnimation(0, 'Dead', false); } catch (e) { }
                            this.tweens.add({
                                targets: gridSkel, alpha: 0, duration: 500, delay: 200,
                                onComplete: () => {
                                    this.removeContentObject(skeletonCol, skeletonRow);
                                    this.tileContent[skeletonRow][skeletonCol] = null;
                                    this.unlockTilesAroundSkeleton(skeletonCol, skeletonRow);
                                }
                            });
                        }
                        this.showFloatingText(skeletonCol, skeletonRow, '⚔️ 胜利!', '#44ff44');
                    } else {
                        this.showFloatingText(skeletonCol, skeletonRow, '💀 败退!', '#ff4444');
                        enemies.forEach(e => {
                            if (!e.dead) {
                                this.tweens.add({
                                    targets: e.spine, alpha: 0, duration: 400, delay: 300,
                                    onComplete: () => { try { e.spine.destroy(); } catch (err) { } }
                                });
                            }
                        });
                    }

                    // Surviving soldiers go back to start positions
                    this.time.delayedCall(800, () => {
                        const liveSoldiers = this.soldiers.filter(s => s.hp > 0 && s.animationState);
                        liveSoldiers.forEach(soldier => {
                            const origIdx = this.soldiers.indexOf(soldier);
                            soldier.scaleX = -Math.abs(soldier.scaleX);
                            try { soldier.animationState.setAnimation(0, 'Move', true); } catch (e) { }
                            this.tweens.add({
                                targets: soldier,
                                x: this.soldierStartPositions[origIdx].x,
                                y: this.soldierStartPositions[origIdx].y,
                                duration: 500,
                                ease: 'Linear',
                                onUpdate: () => {
                                    if (soldier.hpBar) this.refreshHpBar(soldier.hpBar, soldier.x, soldier.y + HP_BAR_Y_OFFSET, soldier.hp, soldier.maxHp);
                                },
                                onComplete: () => {
                                    soldier.scaleX = Math.abs(soldier.scaleX);
                                    try { soldier.animationState.setAnimation(0, 'Idle', true); } catch (e) { }
                                }
                            });
                        });
                        try { this.playerSpine.animationState.setAnimation(0, 'Idle', true); } catch (e) { }
                        this.time.delayedCall(600, () => {
                            this.isBusy = false;
                            this.checkDeath();
                        });
                    });
                };

                const battleLoop = this.time.addEvent({
                    delay: 800,
                    loop: true,
                    callback: () => {
                        const liveSoldiers = this.soldiers.filter(s => s.hp > 0 && !s.dead);
                        const liveEnemies = enemies.filter(e => !e.dead);

                        if (liveSoldiers.length === 0 || liveEnemies.length === 0) {
                            battleLoop.remove();
                            endBattle(liveSoldiers.length > 0);
                            return;
                        }

                        // Each living soldier attacks a random enemy
                        liveSoldiers.forEach(soldier => {
                            if (!soldier.animationState) return;
                            const target = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
                            if (!target || target.dead) return;
                            const dmg = rng(ATTACK_DMG_MIN, ATTACK_DMG_MAX);
                            target.hp = Math.max(0, target.hp - dmg);
                            if (target.hpBar) this.refreshHpBar(target.hpBar, target.spine.x, target.spine.y + HP_BAR_Y_OFFSET, target.hp, target.maxHp, 0xff4444);
                            try { soldier.animationState.setAnimation(0, 'Attack', false); } catch (e) { }
                            if (target.hp <= 0) killUnit(target, true);
                        });

                        // Each living enemy attacks a random soldier
                        liveEnemies.filter(e => !e.dead).forEach(enemy => {
                            const livingNow = this.soldiers.filter(s => s.hp > 0 && !s.dead);
                            if (livingNow.length === 0) return;
                            const target = livingNow[Math.floor(Math.random() * livingNow.length)];
                            const dmg = rng(ENEMY_DMG_MIN, ENEMY_DMG_MAX);
                            target.hp = Math.max(0, target.hp - dmg);
                            if (target.hpBar) this.refreshHpBar(target.hpBar, target.x, target.y + HP_BAR_Y_OFFSET, target.hp, target.maxHp, 0x33dd55);
                            try { enemy.spine.animationState.setAnimation(0, 'Attack', false); } catch (e2) { }
                            if (target.hp <= 0) killUnit(target, false);
                        });
                    }
                });
            };  // closes startCombatLoop

        };  // closes startFight

        // ── Walk player to adjacent tile, THEN start fight ───────────
        if (path && path.length > 0) {
            this.setSoldiersMarching();
            this.playerSpine.animationState.setAnimation(0, 'Move', true);

            const stepToFight = (index) => {
                if (index >= path.length) {
                    this.setSoldiersIdle();
                    startFight();
                    return;
                }
                const step = path[index];
                this.faceToward(step.col, step.row);
                this.playerCol = step.col;
                this.playerRow = step.row;
                const { x, y } = this.gridToScreen(step.col, step.row);
                this.playerSpine.setDepth(step.row + 2.5);
                this.tweens.add({
                    targets: this.playerSpine,
                    x, y,
                    duration: 120,
                    ease: 'Linear',
                    onComplete: () => {
                        const midContent = this.tileContent[step.row][step.col];
                        if (midContent === 'gem') this.collectItem(step.col, step.row, 'gem');
                        else if (midContent === 'book') this.collectItem(step.col, step.row, 'book');
                        else if (midContent === 'ticket') this.collectItem(step.col, step.row, 'ticket');
                        else if (midContent === 'well') this.collectItem(step.col, step.row, 'well');
                        else if (midContent === 'cross') this.collectItem(step.col, step.row, 'cross');
                        else if (midContent === 'chest') this.collectItem(step.col, step.row, 'chest');
                        stepToFight(index + 1);
                    }
                });
            };
            stepToFight(0);
        } else {
            startFight();
        }
    }

    // ── Movement ────────────────────────────────────────────────

    movePlayerTo(col, row, onArrive = null) {
        this.isBusy = true;
        this.faceToward(col, row);

        this.playerCol = col;
        this.playerRow = row;
        const { x, y } = this.gridToScreen(col, row);

        this.setSoldiersMarching();
        this.playerSpine.animationState.setAnimation(0, 'Move', true);
        this.playerSpine.setDepth(row + 2.5);

        this.tweens.add({
            targets: this.playerSpine,
            x: x,
            y: y,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.setSoldiersIdle();
                this.playerSpine.animationState.setAnimation(0, 'Idle', true);
                if (onArrive) {
                    onArrive();
                }
                this.isBusy = false;
            }
        });
    }

    // ── Bottom Bar ───────────────────────────────────────────────

    createBottomBar() {
        const { width, height } = this.scale;
        const barY = this.offsetY + this.tileSize * GRID_SIZE; // top of bottom-bar area
        const midY = barY + (height - barY) / 2;
        const D = 9999; // base depth

        // Background strip
        const bg = this.add.graphics().setDepth(D);
        bg.fillStyle(0x111122, 0.92);
        bg.fillRect(0, barY, width, height - barY);
        bg.lineStyle(1, 0x444466, 0.6);
        bg.lineBetween(0, barY, width, barY);

        const BW = 74, BH = 36, BR = 8;

        const makeBtn = (bx, label, color, borderColor, onClick) => {
            const g = this.add.graphics().setDepth(D + 1);
            g.fillStyle(color, 1);
            g.fillRoundedRect(bx - BW / 2, midY - BH / 2, BW, BH, BR);
            g.lineStyle(2, borderColor, 1);
            g.strokeRoundedRect(bx - BW / 2, midY - BH / 2, BW, BH, BR);
            const t = this.add.text(bx, midY, label, {
                fontSize: '16px', fontFamily: 'Arial', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(D + 2);
            const hit = this.add.rectangle(bx, midY, BW, BH)
                .setInteractive({ useHandCursor: true }).setDepth(D + 3).setAlpha(0.001);
            hit.on('pointerover', () => g.setAlpha(0.75));
            hit.on('pointerout', () => g.setAlpha(1));
            hit.on('pointerdown', onClick);
            return { x: bx, y: midY };
        };

        // ── 撤离 (far left) ──────────────────────────────────────
        this.evacBtn = makeBtn(width * 0.10, '撤离', 0xcc3333, 0xff6666, () => this.onEvacuate());

        // ── Ticket count (center-left) ───────────────────────────
        const ticketX = width * 0.36;
        const ticketIcon = this.add.image(ticketX - 24, midY, 'ticket').setScale(0.28).setDepth(D + 1);
        this.ticketCountLabel = this.add.text(ticketX + 8, midY, `撤离卷：${this.tickets}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0, 0.5).setDepth(D + 2);

        // ── 图鉴 (center-right) ──────────────────────────────────
        this.compendiumBtn = makeBtn(width * 0.64, '图鉴', 0x447733, 0x88cc44, () => this.onCompendium());

        // ── 背包 (far right) ─────────────────────────────────────
        this.backpackBtn = makeBtn(width * 0.90, '背包', 0x336699, 0x66aaff, () => this.onBackpack());
    }

    updateBottomBarCounts() {
        if (this.ticketCountLabel) {
            this.ticketCountLabel.setText(`撤离卷：${this.tickets}`);
        }
    }

    // ── Modal ────────────────────────────────────────────────────

    showModal(title, message, confirmText, cancelText, onConfirm, onCancel) {
        const { width, height } = this.scale;
        const D = 99990;

        // Overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(D).setInteractive();

        // Dialog box
        const boxW = Math.min(340, width - 40);
        const boxH = 220;
        const boxX = width / 2;
        const boxY = height / 2;

        const box = this.add.graphics().setDepth(D + 1);
        box.fillStyle(0x1a1a2e, 1);
        box.fillRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 14);
        box.lineStyle(2, 0x6666aa, 1);
        box.strokeRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 14);

        const titleTxt = this.add.text(boxX, boxY - boxH / 2 + 28, title, {
            fontSize: '17px', fontFamily: 'Arial', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(D + 2);

        const msgTxt = this.add.text(boxX, boxY - 10, message, {
            fontSize: '14px', fontFamily: 'Arial', color: '#dddddd',
            stroke: '#000000', strokeThickness: 1,
            wordWrap: { width: boxW - 30 }, align: 'center',
        }).setOrigin(0.5).setDepth(D + 2);

        // Buttons — cancel on LEFT, confirm on RIGHT
        const btnY = boxY + boxH / 2 - 36;
        const hasCancel = !!cancelText;
        const confirmBtnX = hasCancel ? boxX + 60 : boxX;
        const cancelBtnX = boxX - 60;

        const drawBtn = (x, y, label, color) => {
            const bw = 100, bh = 34, r = 8;
            const g = this.add.graphics().setDepth(D + 2);
            g.fillStyle(color, 1);
            g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, r);
            const t = this.add.text(x, y, label, {
                fontSize: '15px', fontFamily: 'Arial', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(D + 3);
            const hit = this.add.rectangle(x, y, bw, bh).setInteractive({ useHandCursor: true }).setDepth(D + 4).setAlpha(0.001);
            return { g, t, hit };
        };

        const confirmBtn = drawBtn(confirmBtnX, btnY, confirmText, 0x33aa33);
        const cancelBtn = hasCancel ? drawBtn(cancelBtnX, btnY, cancelText, 0x884444) : null;

        const cleanup = () => {
            const toDestroy = [overlay, box, titleTxt, msgTxt,
                confirmBtn.g, confirmBtn.t, confirmBtn.hit];
            if (cancelBtn) toDestroy.push(cancelBtn.g, cancelBtn.t, cancelBtn.hit);
            toDestroy.forEach(o => o.destroy());
        };

        confirmBtn.hit.on('pointerdown', () => { cleanup(); onConfirm(); });
        if (cancelBtn) cancelBtn.hit.on('pointerdown', () => { cleanup(); if (onCancel) onCancel(); });
    }

    onEvacuate() {
        if (this.tickets <= 0) {
            this.showModal(
                '撤离',
                '确定撤离并放弃所有收益吗？',
                '确认',
                '取消',
                () => {
                    // Reset all progress and restart
                    this.registry.set('tickets', 0);
                    this.registry.set('collectedBooks', 0);
                    this.registry.set('collectedGems', 0);
                    this.registry.set('currentLevel', 0);
                    this.registry.set('soldierStates', []);
                    this.scene.restart();
                }
            );
        } else {
            const books = this.collectedBooks;
            const gems = this.collectedGems;
            this.showModal(
                '撤离',
                `确定撤离吗？\n您将获得 📖×${books}  💎×${gems}`,
                '确认',
                '取消',
                () => {
                    // Keep items, reset level/tickets back as desired
                    this.registry.set('tickets', this.tickets - 1);
                    this.registry.set('currentLevel', 0);
                    this.registry.set('soldierStates', []);
                    this.scene.restart();
                }
            );
        }
    }

    onBackpack() {
        const { width, height } = this.scale;
        const D = 99990;

        // Full-screen overlay — click outside box to close
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
            .setDepth(D).setInteractive();

        const boxW = Math.min(320, width - 40);
        const boxH = 220;
        const boxX = width / 2;
        const boxY = height / 2;

        const box = this.add.graphics().setDepth(D + 1);
        box.fillStyle(0x1a1a2e, 1);
        box.fillRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 14);
        box.lineStyle(2, 0x6666aa, 1);
        box.strokeRoundedRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH, 14);

        // Block click-through on the box itself
        const boxHit = this.add.rectangle(boxX, boxY, boxW, boxH)
            .setInteractive().setDepth(D + 1).setAlpha(0.001);
        boxHit.on('pointerdown', (p) => p.event.stopPropagation());

        const titleTxt = this.add.text(boxX, boxY - boxH / 2 + 28, '背包', {
            fontSize: '17px', fontFamily: 'Arial', color: '#ffdd44',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(D + 2);

        // Icon grid: books and gems as big icons with counts
        const items = [
            { icon: '📖', label: `书  x${this.collectedBooks}` },
            { icon: '💎', label: `宝石 x${this.collectedGems}` },
            { icon: '🎫', label: `撤离卷 x${this.tickets}` },
            { icon: '✝️', label: `复活書 x${this.revivalCrosses}` },
        ];
        const cols = 2;
        const cellW = boxW / cols;
        const startY2 = boxY - boxH / 2 + 70;
        const objs = [];
        items.forEach((item, i) => {
            const cx = boxX - boxW / 2 + cellW * (i % cols) + cellW / 2;
            const cy = startY2 + Math.floor(i / cols) * 66;
            objs.push(this.add.text(cx, cy, item.icon, { fontSize: '32px' })
                .setOrigin(0.5).setDepth(D + 3));
            objs.push(this.add.text(cx, cy + 36, item.label, {
                fontSize: '13px', fontFamily: 'Arial', color: '#eeeeee',
                stroke: '#000000', strokeThickness: 1,
            }).setOrigin(0.5).setDepth(D + 3));
        });

        const cleanup = () => {
            [overlay, box, boxHit, titleTxt, ...objs].forEach(o => o.destroy());
        };

        // Click anywhere outside box to close
        overlay.on('pointerdown', () => cleanup());
    }

    // ── Death detection ─────────────────────────────────────────

    checkDeath() {
        const allDead = this.soldiers.every(s => s.dead || s.hp <= 0);
        if (!allDead) return;

        // All soldiers dead — trigger death modal
        if (this.revivalCrosses > 0) {
            this.showModal(
                '全军覆没!',
                `是否使用复活十字架复活？\n(剩余 ${this.revivalCrosses} 个)`,
                '复活',
                '重新开始',
                () => {
                    // Use one cross, revive all soldiers at 50% HP
                    this.revivalCrosses--;
                    this.registry.set('revivalCrosses', this.revivalCrosses);
                    this.soldiers.forEach((s, idx) => {
                        s.dead = false;
                        s.hp = Math.floor(SOLDIER_MAX_HP * 0.5);
                        if (s.tombstone) { s.tombstone.destroy(); s.tombstone = null; }
                        // Redraw as alive at start position
                        const pos = this.soldierStartPositions[idx];
                        if (s.animationState) {
                            s.setVisible(true);
                            s.setAlpha(1);
                            try { s.animationState.setAnimation(0, 'Idle', true); } catch (e) { }
                            s.hpBar = this.createHpBar(pos.x, pos.y, s.hp, s.maxHp, 0x33dd55);
                        }
                    });
                    this.isBusy = false;
                },
                () => {
                    // Cancel — restart
                    this.registry.set('soldierStates', []);
                    this.registry.set('revivalCrosses', 0);
                    this.registry.set('currentLevel', 0);
                    this.scene.restart();
                }
            );
        } else {
            this.showModal(
                '全军覆没!',
                '所有己方已阵亡\n没有复活十字架，游戏将重新开始',
                '重新开始',
                '',
                () => {
                    this.registry.set('soldierStates', []);
                    this.registry.set('revivalCrosses', 0);
                    this.registry.set('currentLevel', 0);
                    this.scene.restart();
                }
            );
        }
    }

    // ── Compendium (图鉴) ────────────────────────────────────────

    onCompendium() {
        const { width, height } = this.scale;
        const D = 99990;
        const chapter = Math.ceil(this.currentLevel / 2); // current chapter

        // All tile entries: existing + 20 locked future ones
        const ALL_TILES = [
            // ── Currently available ──────────────────────────────
            { icon: '💎', name: '宝石', desc: '收集后存入背包，增加收益', unlockCh: 0 },
            { icon: '📖', name: '书', desc: '收集后存入背包，增加收益', unlockCh: 0 },
            { icon: '💀', name: '骷髅兵', desc: '触发战斗，消灭可获奖励', unlockCh: 0 },
            { icon: '🏠', name: '营地', desc: '踏上后进入下一层', unlockCh: 0 },
            { icon: '🎫', name: '撤离卷', desc: '用于安全撤离，保留所有收益', unlockCh: 0 },
            { icon: '🪣', name: '水井', desc: '全员立即回复25%最大生命值', unlockCh: 0 },
            { icon: '✝️', name: '复活十字架', desc: '全员阵亡时可用于复活', unlockCh: 0 },
            { icon: '🏰', name: '瞭望塔', desc: '自动探索周围2格范围', unlockCh: 0 },
            { icon: '📦', name: '宝箱', desc: '弹出5宝石+3本书，全部飞入背包', unlockCh: 0 },
            // ── Locked future tiles ──────────────────────────────
            { icon: '🗺️', name: '古老地图', desc: '使用后显示全部地图内容', unlockCh: 3 },
            { icon: '💰', name: '藏宝箱', desc: '随机获得3种不同物品', unlockCh: 3 },
            { icon: '⚗️', name: '炼金炉', desc: '消耗2本书合成1枚宝石', unlockCh: 5 },
            { icon: '🌿', name: '草药从', desc: '全员回复50%最大生命值', unlockCh: 5 },
            { icon: '🔮', name: '水晶球', desc: '预览周围3格隐藏内容', unlockCh: 7 },
            { icon: '⚔️', name: '武器架', desc: '全员本层攻击+15%', unlockCh: 7 },
            { icon: '🛡️', name: '护甲架', desc: '全员本层防御+15%', unlockCh: 9 },
            { icon: '🌀', name: '传送阵', desc: '随机传送至未探索区域', unlockCh: 9 },
            { icon: '👹', name: '精英骷髅', desc: '强力敌人，胜利获丰厚奖励', unlockCh: 11 },
            { icon: '🏺', name: '神秘图腾', desc: '下一场战斗己方免受伤害', unlockCh: 11 },
            { icon: '🌟', name: '星愿池', desc: '消耗1本书获得随机祝福效果', unlockCh: 13 },
            { icon: '🥚', name: '龙蛋', desc: '孵化后获得龙骑手助战一次', unlockCh: 13 },
            { icon: '🗡️', name: '暗杀契约', desc: '直接消灭任意一个骷髅兵', unlockCh: 15 },
            { icon: '🏛️', name: '古老圣殿', desc: '全员获得一次战斗免死效果', unlockCh: 15 },
            { icon: '🌊', name: '洪水遗迹', desc: '随机消除3格迷雾', unlockCh: 17 },
            { icon: '📜', name: '古籍残页', desc: '一次获得5本书存入背包', unlockCh: 17 },
            { icon: '🎁', name: '神秘礼盒', desc: '触发完全随机效果', unlockCh: 19 },
            { icon: '👑', name: '王室徽章', desc: '获得双倍撤离卷', unlockCh: 19 },
            { icon: '🔑', name: '命运之门', desc: '选择一个隐藏强力奖励', unlockCh: 21 },
            { icon: '⚡', name: '雷霆神器', desc: '下一战己方攻击+50%', unlockCh: 21 },
        ];

        // ── Overlay (click outside panel to close) ──────────────
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65)
            .setDepth(D).setInteractive();

        // ── Panel (fixed on screen, content scrolls inside) ──────
        const panelW = Math.min(360, width - 32);
        const panelH = height * 0.78;
        const panelX = width / 2 - panelW / 2;
        const panelY = height / 2 - panelH / 2;

        // Panel background
        const panelBg = this.add.graphics().setDepth(D + 1);
        panelBg.fillStyle(0x111828, 0.97);
        panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 14);
        panelBg.lineStyle(2, 0x6688aa, 1);
        panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 14);

        // Absorb clicks on panel so overlay doesn't close it
        const panelHit = this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH)
            .setInteractive().setDepth(D + 1).setAlpha(0.001);
        panelHit.on('pointerdown', (p) => p.event.stopPropagation());

        // Title
        const titleTxt = this.add.text(panelX + panelW / 2, panelY + 24, '图鉴', {
            fontSize: '18px', fontFamily: 'Arial', color: '#88ddff',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(D + 2);

        // ── Scrollable content using a RenderTexture mask approach ─
        // We use a container + mask to clip scroll
        const HEADER_H = 48;
        const scrollAreaY = panelY + HEADER_H;
        const scrollAreaH = panelH - HEADER_H;
        const ITEM_H = 64;
        const PAD = 10;

        // Create all row objects inside a container
        const scrollContainer = this.add.container(panelX + PAD, scrollAreaY).setDepth(D + 3);
        const allObjs = []; // track for cleanup

        ALL_TILES.forEach((tile, i) => {
            const isUnlocked = tile.unlockCh === 0 || chapter >= tile.unlockCh;
            const iy = i * ITEM_H;

            // Row background
            const rowBg = this.add.graphics();
            const rowColor = isUnlocked ? 0x1a2a3a : 0x0a0a0a;
            rowBg.fillStyle(rowColor, 0.9);
            rowBg.fillRoundedRect(0, iy + 2, panelW - PAD * 2, ITEM_H - 4, 6);
            if (!isUnlocked) {
                rowBg.lineStyle(1, 0x334455, 0.5);
                rowBg.strokeRoundedRect(0, iy + 2, panelW - PAD * 2, ITEM_H - 4, 6);
            }

            const iconTxt = this.add.text(28, iy + ITEM_H / 2,
                isUnlocked ? tile.icon : '🔒', { fontSize: '26px' }).setOrigin(0.5);
            const nameTxt = this.add.text(58, iy + 14, tile.name, {
                fontSize: '14px', fontFamily: 'Arial',
                color: isUnlocked ? '#ffffff' : '#556677',
                stroke: '#000000', strokeThickness: 1,
            });
            const descTxt = this.add.text(58, iy + 34, isUnlocked ? tile.desc : `第${tile.unlockCh}章节解锁`, {
                fontSize: '11px', fontFamily: 'Arial',
                color: isUnlocked ? '#aabbcc' : '#445566',
            });

            scrollContainer.add([rowBg, iconTxt, nameTxt, descTxt]);
            allObjs.push(rowBg, iconTxt, nameTxt, descTxt);
        });

        const totalH = ALL_TILES.length * ITEM_H;

        // Mask to clip scrollable area
        const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(panelX, scrollAreaY, panelW, scrollAreaH);
        const mask = maskShape.createGeometryMask();
        scrollContainer.setMask(mask);

        // ── Drag to scroll ───────────────────────────────────────
        let dragStartY = 0;
        let containerStartY = 0;
        let scrollY = 0;
        const minScroll = -(totalH - scrollAreaH + PAD);
        const maxScroll = 0;

        const clampScroll = (v) => Math.max(minScroll, Math.min(maxScroll, v));

        panelHit.on('pointerdown', (p) => {
            dragStartY = p.y;
            containerStartY = scrollY;
        });
        panelHit.on('pointermove', (p) => {
            if (!p.isDown) return;
            const delta = p.y - dragStartY;
            scrollY = clampScroll(containerStartY + delta);
            scrollContainer.y = scrollAreaY + scrollY;
        });

        // ── Cleanup ──────────────────────────────────────────────
        const cleanup = () => {
            [overlay, panelBg, panelHit, titleTxt, scrollContainer, maskShape]
                .forEach(o => { try { o.destroy(); } catch (e) { } });
        };
        overlay.on('pointerdown', () => cleanup());
    }
}

