import Phaser from 'phaser';

// -- Grid config --
const GRID_COLS = 11;
const GRID_ROWS = 11;
const TILE_W = 64;   // tile width in isometric space
const TILE_H = 32;   // tile height in isometric space (half of width for 2:1 iso)

// Colors
const COLOR_GRASS = 0x5cb85c;
const COLOR_GRASS_ALT = 0x4cae4c;
const COLOR_GRASS_TOP = 0x6dd06d;
const COLOR_FOG = 0x3a3a5c;
const COLOR_FOG_ALT = 0x2e2e4a;
const COLOR_FOG_TOP = 0x4a4a6e;
const COLOR_HOVER = 0xffee88;
const COLOR_PLAYER = 0xe94560;
const COLOR_PLAYER_DARK = 0xb8354c;
const COLOR_PLAYER_TOP = 0xff6680;
const TILE_DEPTH = 12;
const CUBE_SIZE = 16;

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Offset to center the grid
        this.offsetX = width / 2;
        this.offsetY = height / 2 - GRID_ROWS * TILE_H / 2 + 60;

        // Grid state: 'fog' or 'grass'
        this.grid = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < GRID_COLS; c++) {
                this.grid[r][c] = 'fog';
            }
        }

        // Player starts at center
        this.playerCol = Math.floor(GRID_COLS / 2);
        this.playerRow = Math.floor(GRID_ROWS / 2);
        this.grid[this.playerRow][this.playerCol] = 'grass';

        // Tile graphics containers
        this.tileObjects = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            this.tileObjects[r] = [];
        }

        // Hover state
        this.hoveredTile = null;

        // Draw everything
        this.drawGrid();
        this.drawPlayer();

        // Input
        this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
        this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    /**
     * Convert grid (col, row) to isometric screen position
     */
    gridToIso(col, row) {
        const x = (col - row) * (TILE_W / 2) + this.offsetX;
        const y = (col + row) * (TILE_H / 2) + this.offsetY;
        return { x, y };
    }

    /**
     * Convert screen position to grid (col, row)
     */
    isoToGrid(screenX, screenY) {
        const sx = screenX - this.offsetX;
        const sy = screenY - this.offsetY;
        const col = Math.floor((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
        const row = Math.floor((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
        return { col, row };
    }

    /**
     * Check if grid coords are valid
     */
    isValid(col, row) {
        return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
    }

    /**
     * Check if (col, row) is adjacent to any grass tile
     */
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

    /**
     * Draw the entire grid
     */
    drawGrid() {
        // Clear existing
        if (this.tileLayer) this.tileLayer.destroy();
        this.tileLayer = this.add.container(0, 0);

        // Draw back-to-front for proper layering
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const { x, y } = this.gridToIso(c, r);
                const state = this.grid[r][c];
                const container = this.drawTile(x, y, state, c, r);
                container.setDepth(r + c);
                this.tileLayer.add(container);
                this.tileObjects[r][c] = container;
            }
        }
    }

    /**
     * Draw a single isometric tile (diamond top + side faces)
     */
    drawTile(x, y, state, col, row) {
        const container = this.add.container(x, y);

        let topColor, leftColor, rightColor;
        if (state === 'grass') {
            topColor = COLOR_GRASS_TOP;
            leftColor = COLOR_GRASS;
            rightColor = COLOR_GRASS_ALT;
        } else {
            topColor = COLOR_FOG_TOP;
            leftColor = COLOR_FOG;
            rightColor = COLOR_FOG_ALT;
        }

        const g = this.add.graphics();

        // Left face
        g.fillStyle(leftColor, 1);
        g.beginPath();
        g.moveTo(-TILE_W / 2, 0);
        g.lineTo(0, TILE_H / 2);
        g.lineTo(0, TILE_H / 2 + TILE_DEPTH);
        g.lineTo(-TILE_W / 2, TILE_DEPTH);
        g.closePath();
        g.fillPath();

        // Right face
        g.fillStyle(rightColor, 1);
        g.beginPath();
        g.moveTo(TILE_W / 2, 0);
        g.lineTo(0, TILE_H / 2);
        g.lineTo(0, TILE_H / 2 + TILE_DEPTH);
        g.lineTo(TILE_W / 2, TILE_DEPTH);
        g.closePath();
        g.fillPath();

        // Top face (diamond)
        g.fillStyle(topColor, 1);
        g.beginPath();
        g.moveTo(0, -TILE_H / 2);
        g.lineTo(TILE_W / 2, 0);
        g.lineTo(0, TILE_H / 2);
        g.lineTo(-TILE_W / 2, 0);
        g.closePath();
        g.fillPath();

        // Subtle edge lines
        g.lineStyle(1, 0x000000, 0.15);
        g.beginPath();
        g.moveTo(0, -TILE_H / 2);
        g.lineTo(TILE_W / 2, 0);
        g.lineTo(0, TILE_H / 2);
        g.lineTo(-TILE_W / 2, 0);
        g.closePath();
        g.strokePath();

        // Fog pattern overlay
        if (state === 'fog') {
            g.fillStyle(0x222244, 0.3);
            g.fillCircle(0, 0, 6);
            g.fillCircle(-8, -2, 4);
            g.fillCircle(8, 2, 4);
        }

        container.add(g);
        container.setData('col', col);
        container.setData('row', row);
        container.setData('graphics', g);

        return container;
    }

    /**
     * Draw the player cube at current position
     */
    drawPlayer() {
        if (this.playerContainer) this.playerContainer.destroy();

        const { x, y } = this.gridToIso(this.playerCol, this.playerRow);
        this.playerContainer = this.add.container(x, y - TILE_DEPTH);
        this.playerContainer.setDepth(this.playerRow + this.playerCol + 0.5);

        const s = CUBE_SIZE;
        const g = this.add.graphics();

        // Left face
        g.fillStyle(COLOR_PLAYER_DARK, 1);
        g.beginPath();
        g.moveTo(-s, -s);
        g.lineTo(0, -s + s / 2);
        g.lineTo(0, s / 2);
        g.lineTo(-s, 0);
        g.closePath();
        g.fillPath();

        // Right face
        g.fillStyle(COLOR_PLAYER, 1);
        g.beginPath();
        g.moveTo(s, -s);
        g.lineTo(0, -s + s / 2);
        g.lineTo(0, s / 2);
        g.lineTo(s, 0);
        g.closePath();
        g.fillPath();

        // Top face
        g.fillStyle(COLOR_PLAYER_TOP, 1);
        g.beginPath();
        g.moveTo(0, -s * 1.5);
        g.lineTo(s, -s);
        g.lineTo(0, -s + s / 2);
        g.lineTo(-s, -s);
        g.closePath();
        g.fillPath();

        // Outline
        g.lineStyle(1, 0x000000, 0.3);
        g.beginPath();
        g.moveTo(0, -s * 1.5);
        g.lineTo(s, -s);
        g.lineTo(s, 0);
        g.lineTo(0, s / 2);
        g.lineTo(-s, 0);
        g.lineTo(-s, -s);
        g.closePath();
        g.strokePath();

        this.playerContainer.add(g);
    }

    /**
     * Redraw a single tile
     */
    redrawTile(col, row) {
        const old = this.tileObjects[row][col];
        if (old) old.destroy();

        const { x, y } = this.gridToIso(col, row);
        const state = this.grid[row][col];
        const container = this.drawTile(x, y, state, col, row);
        container.setDepth(row + col);
        this.tileLayer.add(container);
        this.tileObjects[row][col] = container;
    }

    /**
     * Highlight a tile on hover
     */
    highlightTile(col, row) {
        const obj = this.tileObjects[row]?.[col];
        if (!obj) return;
        const g = obj.getData('graphics');
        if (!g) return;

        // Draw highlight overlay on top face
        g.fillStyle(COLOR_HOVER, 0.3);
        g.beginPath();
        g.moveTo(0, -TILE_H / 2);
        g.lineTo(TILE_W / 2, 0);
        g.lineTo(0, TILE_H / 2);
        g.lineTo(-TILE_W / 2, 0);
        g.closePath();
        g.fillPath();
    }

    /**
     * Clear highlight by redrawing the tile
     */
    clearHighlight(col, row) {
        if (this.isValid(col, row)) {
            this.redrawTile(col, row);
        }
    }

    onPointerMove(pointer) {
        const { col, row } = this.isoToGrid(pointer.x, pointer.y);

        // Clear previous hover
        if (this.hoveredTile) {
            this.clearHighlight(this.hoveredTile.col, this.hoveredTile.row);
            this.hoveredTile = null;
        }

        // Highlight if it's a valid fog tile adjacent to grass
        if (this.isValid(col, row) && this.grid[row][col] === 'fog' && this.isAdjacentToGrass(col, row)) {
            this.highlightTile(col, row);
            this.hoveredTile = { col, row };
        }
    }

    onPointerDown(pointer) {
        const { col, row } = this.isoToGrid(pointer.x, pointer.y);

        if (!this.isValid(col, row)) return;
        if (this.grid[row][col] !== 'fog') return;
        if (!this.isAdjacentToGrass(col, row)) return;

        // Reveal tile with animation
        this.revealTile(col, row);
    }

    /**
     * Animate fog tile revealing to grass
     */
    revealTile(col, row) {
        const tileObj = this.tileObjects[row][col];
        if (!tileObj) return;

        // Scale-down-then-up flip animation
        this.tweens.add({
            targets: tileObj,
            scaleX: 0,
            scaleY: 0.5,
            duration: 150,
            ease: 'Sine.easeIn',
            onComplete: () => {
                // Change state
                this.grid[row][col] = 'grass';
                this.redrawTile(col, row);
                const newObj = this.tileObjects[row][col];
                newObj.setScale(0, 0.5);

                // Expand back
                this.tweens.add({
                    targets: newObj,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        // Move player to new tile
                        this.movePlayerTo(col, row);
                    }
                });
            }
        });
    }

    /**
     * Move player to a tile with tween
     */
    movePlayerTo(col, row) {
        this.playerCol = col;
        this.playerRow = row;
        const { x, y } = this.gridToIso(col, row);

        this.playerContainer.setDepth(row + col + 0.5);
        this.tweens.add({
            targets: this.playerContainer,
            x: x,
            y: y - TILE_DEPTH,
            duration: 250,
            ease: 'Quad.easeOut',
        });
    }
}
