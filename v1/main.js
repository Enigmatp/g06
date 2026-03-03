const GRID_COLS = 7;
const GRID_ROWS = 3;

// --- Phase 2: Battle Constants ---
const BUILDING_CD_MAX = 4500; // ms (reduced speed by 200% / 3x slower)
const ENEMY_SPAWN_CD = 1500;  // ms (was 4000)
const WALL_MAX_HP = 1000;

// Game State
const state = {
    grid: Array(GRID_COLS * GRID_ROWS).fill(null), // null means empty, object means building
    dragData: {
        active: false,
        element: null,
        sourceType: 'grid', // 'grid' or 'card'
        startIndex: -1, // index in grid or hand
        buildingData: null,
        offsetX: 0,
        offsetY: 0,
        isOverSellZone: false
    },

    battle: {
        wallHP: WALL_MAX_HP,
        entities: [], // Enemies, Allies, Projectiles
        enemySpawnTimer: 0,
        phase: 'day', // 'day' or 'night'
        dayCounter: 1,
        enemiesSpawnedThisDay: 0,
        enemiesDefeatedThisDay: 0,
        nightTimer: 0,
        waveBreakTimer: 0,
        lastTime: performance.now()
    },
    gold: 0,
    maxEnergy: 10,
    regenRate: 1.0, // Multiplier for speed
    energyRegenTimer: 0,
    cardLevels: {
        angel: 1, archer: 1, fireball: 1, mine: 1, titan: 1, mage: 1, dragon: 1, gaze: 1
    },
    // Dynamic Stats (Upgradable)
    wallMaxHP: WALL_MAX_HP,
    buildingSpeedMult: 1.0,
    allyStatMult: 1.0,
    costOffset: 0,
    cards: {
        hand: [],
        next: null
    },
    isChoosingReward: false
};

const BUILDING_TYPES = {
    angel: { icon: '👼', cost: 2, quality: 1 },
    archer: { icon: '🏹', cost: 3, quality: 1 },
    mine: { icon: '⛏️', cost: 9, quality: 2 },
    fireball: { icon: '🔥', cost: 4, quality: 2 },
    titan: { icon: '🧌', cost: 5, quality: 3 },
    mage: { icon: '🧙', cost: 7, quality: 3 },
    dragon: { icon: '🐉', cost: 8, quality: 3 },
    gaze: { icon: '👁️', cost: 10, quality: 4 }
};

const DOM = {
    gameContainer: document.querySelector('.game-container'),
    grid: document.getElementById('grid'),
    ghost: document.getElementById('drag-ghost'),
    buyBtns: document.querySelectorAll('.buy-btn'),
    battleArea: document.getElementById('battle-area'),
    managementArea: document.getElementById('management-area'),
    entitiesLayer: document.getElementById('entities-layer'),
    wallHpFill: document.getElementById('wall-hp-fill'),
    goldDisplay: document.getElementById('energy-number'),
    phaseText: document.getElementById('phase-text'),
    sellZone: document.getElementById('sell-zone')
};

function init() {
    createGrid();
    // Initialize lifespan for any starting mines
    state.grid.forEach((b, idx) => {
        if (b && b.type === 'mine' && b.productionsLeft === undefined) {
            b.productionsLeft = 18;
        }
    });
    initCardSystem();
    setupDragEvents();

    // Set initial HP fill
    updateWallHP();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function getCellSpeedMultiplier(idx) {
    const r = Math.floor(idx / GRID_COLS);
    const c = idx % GRID_COLS;

    const neighbors = [];
    if (r > 0) neighbors.push(idx - GRID_COLS); // Up
    if (r < GRID_ROWS - 1) neighbors.push(idx + GRID_COLS); // Down
    if (c > 0) neighbors.push(idx - 1); // Left
    if (c < GRID_COLS - 1) neighbors.push(idx + 1); // Right

    let bonus = 0;
    neighbors.forEach(n => {
        const neighbor = state.grid[n];
        if (neighbor && neighbor.type === 'gaze') {
            bonus += 0.5 * neighbor.level;
        }
    });

    return 1.0 + bonus;
}

function updateGazeVisuals() {
    // Remove old standalone indicators
    document.querySelectorAll('.standalone-buff-indicator').forEach(el => el.remove());

    const gazePositions = [];
    state.grid.forEach((b, idx) => {
        if (b && b.type === 'gaze' && (!state.dragData.active || state.dragData.startIndex !== idx)) {
            gazePositions.push(idx);
        }
    });

    // If dragging a gaze tower, calculate its hovered grid cell
    DOM.ghost.style.visibility = 'hidden';
    if (state.dragData.active && state.dragData.buildingData.type === 'gaze') {
        const ghostRect = DOM.ghost.getBoundingClientRect();
        const targetEl = document.elementFromPoint(
            ghostRect.left + ghostRect.width / 2,
            ghostRect.top + ghostRect.height / 2
        );
        if (targetEl) {
            const targetCell = targetEl.closest('.cell:not(.locked)');
            if (targetCell) {
                gazePositions.push(parseInt(targetCell.dataset.index));
            }
        }
    }
    DOM.ghost.style.visibility = 'visible';

    const buffedIndices = new Set();
    gazePositions.forEach(idx => {
        const r = Math.floor(idx / GRID_COLS);
        const c = idx % GRID_COLS;
        if (r > 0) buffedIndices.add(idx - GRID_COLS);
        if (r < GRID_ROWS - 1) buffedIndices.add(idx + GRID_COLS);
        if (c > 0) buffedIndices.add(idx - 1);
        if (c < GRID_COLS - 1) buffedIndices.add(idx + 1);
    });

    buffedIndices.forEach(idx => {
        const cell = DOM.grid.children[idx];
        if (cell && !cell.querySelector('.standalone-buff-indicator')) {
            const ind = document.createElement('div');
            ind.className = 'cell-buff-indicator standalone-buff-indicator';
            cell.appendChild(ind);
        }
    });
}

function createGrid() {
    DOM.grid.innerHTML = '';
    state.grid = []; // Clear state.grid before populating

    // 7x3 = 21 slots
    // Place Gaze Tower at index 10 (center of 7x3)
    // Place 4 combat units up, down, left, right of index 10: 3 (up), 17 (down), 9 (left), 11 (right)
    const combatIndices = [3, 9, 11, 17];
    const combatTypes = ['titan', 'dragon', 'angel', 'fireball'];

    const gazeIndex = 10;

    // Place mine outside on the far right, e.g. at index 6 (r0 c6)
    const mineIndex = 6;

    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        let b = null;
        if (i === mineIndex) {
            b = { id: `b_${Math.random().toString(36).substr(2, 9)}`, type: 'mine', level: 1, buffed: false, timer: 0 };
        } else if (i === gazeIndex) {
            b = { id: `b_${Math.random().toString(36).substr(2, 9)}`, type: 'gaze', level: 1, buffed: false, timer: 0 };
        } else if (combatIndices.includes(i)) {
            const startType = combatTypes[combatIndices.indexOf(i)];
            b = { id: `b_${Math.random().toString(36).substr(2, 9)}`, type: startType, level: 1, buffed: false, timer: 0 };
        }
        state.grid.push(b);
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        DOM.grid.appendChild(cell);
    }

    // Render initial grid
    state.grid.forEach((_, i) => renderCell(i));
}
function initCardSystem() {
    updateShopUI(); // still handles gold display

    // Initial draw to fill hand and next
    for (let i = 0; i < 4; i++) {
        state.cards.hand.push(drawRandomCard());
    }
    state.cards.next = drawRandomCard();

    renderCardHand();
}


function drawRandomCard() {
    const types = Object.keys(BUILDING_TYPES);
    return types[Math.floor(Math.random() * types.length)];
}

function playCard(index) {
    const cardType = state.cards.hand[index];
    if (!cardType) return; // Empty slot or invalid

    const baseCost = BUILDING_TYPES[cardType].cost;
    const cost = Math.max(1, baseCost - (state.costOffset || 0));
    if (state.gold < cost) {
        showToast(`能量不足！(需要${cost}点)`, "error");
        return;
    }

    // Find empty slots
    const emptySlots = [];
    state.grid.forEach((b, idx) => {
        if (!b) emptySlots.push(idx);
    });

    if (emptySlots.length < 1) {
        showToast("网格已满，无法放置！", "error");
        return;
    }

    // Pay cost
    state.gold -= cost;
    updateShopUI();

    // Sort empty slots: Top-to-Bottom, then Left-to-Right
    emptySlots.sort((a, b) => {
        const rA = Math.floor(a / GRID_COLS);
        const cA = a % GRID_COLS;
        const rB = Math.floor(b / GRID_COLS);
        const cB = b % GRID_COLS;

        if (rA !== rB) return rA - rB;
        return cA - cB;
    });

    const targetSlot = emptySlots[0];

    // Place building
    placeBuilding(targetSlot, {
        id: `b_${Math.random().toString(36).substr(2, 9)}`,
        type: cardType,
        level: state.cardLevels[cardType] || 1,
        buffed: false,
        timer: 0
    });

    // Shift cards
    state.cards.hand.splice(index, 1);
    state.cards.hand.push(state.cards.next);
    state.cards.next = drawRandomCard();

    renderCardHand(index); // pass played index to animate new card
}

function renderCardHand(playedIndex = -1) {
    const handContainer = document.getElementById('hand-cards');
    const nextContainer = document.getElementById('next-card');

    if (!handContainer || !nextContainer) return;

    // Render Next Card
    const nextType = state.cards.next;
    const nextQuality = BUILDING_TYPES[nextType].quality;
    nextContainer.className = `card-slot next-slot quality-${nextQuality}`;
    nextContainer.innerHTML = `
        <div class="icon">${BUILDING_TYPES[nextType].icon}</div>
        <div class="price-tag">${BUILDING_TYPES[nextType].cost} ⚡</div>
    `;

    // Render Hand
    handContainer.innerHTML = '';
    state.cards.hand.forEach((cardType, idx) => {
        const cardEl = document.createElement('div');
        const config = BUILDING_TYPES[cardType];
        const cost = Math.max(1, config.cost - (state.costOffset || 0));
        cardEl.className = `card-slot play-card quality-${config.quality}`;
        cardEl.dataset.index = idx; // Essential for drag-and-drop recognition
        if (state.gold < cost) cardEl.classList.add('unaffordable');

        // If this is the card that just shifted into the end of the hand (index 3) after a play, animate it
        if (playedIndex !== -1 && idx === 3) {
            cardEl.classList.add('card-entering');
        }

        cardEl.innerHTML = `
            <div class="icon">${config.icon}</div>
            <div class="price-tag">${cost} ⚡</div>
        `;

        cardEl.addEventListener('click', () => playCard(idx));
        handContainer.appendChild(cardEl);
    });

    renderEnergySegments();
}

function renderEnergySegments() {
    const container = document.getElementById('energy-segments');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < state.maxEnergy; i++) {
        container.appendChild(document.createElement('span'));
    }
}

function updateShopUI() {
    // Re-render card hand to update unaffordable state visually
    if (state.cards.hand.length > 0) { // check if initialized
        renderCardHand();
    }
}

function highlightEnergyBar() {
    const el = document.getElementById('energy-bar-container');
    if (!el) return;
    el.classList.remove('highlight');
    void el.offsetWidth; // trigger reflow
    el.classList.add('highlight');
}

function showToast(msg, type = "info") {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = msg;
    if (type === 'error') toast.style.color = '#ef4444';
    if (type === 'success') toast.style.color = '#4ade80';
    DOM.gameContainer.appendChild(toast);

    // Animate and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function restartGame() {
    showToast("城堡被毁！游戏重新开始！", "error");

    // Reset state
    state.grid.fill(null);
    state.battle.wallHP = WALL_MAX_HP;
    state.battle.entities = [];
    state.battle.enemySpawnTimer = 0;
    state.battle.wave = 1;
    state.battle.totalEnemiesSpawned = 0;
    state.battle.lastTime = performance.now();
    state.gold = 0; // Starting energy
    state.energyRegenTimer = 0;
    state.cards = {
        hand: [],
        next: null
    };

    state.battle.enemiesSpawnedThisDay = 0;
    state.battle.dayCounter = 1;
    state.battle.nightTimer = 0;
    state.maxEnergy = 10;
    state.wallMaxHP = WALL_MAX_HP;
    state.battle.wallHP = WALL_MAX_HP;
    state.buildingSpeedMult = 1.0;
    state.allyStatMult = 1.0;
    state.costOffset = 0;
    state.regenRate = 1.0;
    state.cardLevels = { angel: 1, archer: 1, fireball: 1, mine: 1, titan: 1, mage: 1, dragon: 1, gaze: 1 };

    DOM.battleArea.classList.remove('night');
    DOM.managementArea.classList.remove('night');
    DOM.phaseText.textContent = `☀️ 第 1天`;

    // Reset visuals
    updateWallHP();
    updateShopUI();
    renderEntities(); // clear dom

    // Rebuild grid base
    createGrid();
    initCardSystem();
}

function placeBuilding(index, buildingData) {
    // Initialize lifespan ONLY for mines
    if (buildingData.type === 'mine') {
        buildingData.productionsLeft = 18;
    }
    state.grid[index] = buildingData;
    renderCell(index);
    updateGazeVisuals();
}

function renderCell(index) {
    const cell = DOM.grid.children[index];
    cell.innerHTML = '';

    const data = state.grid[index];
    if (data) {
        const config = BUILDING_TYPES[data.type];
        const isBuffed = getCellSpeedMultiplier(index) > 1.0 || data.type === 'gaze';
        const level = data.level || 1;
        let infoBadgeHtml = `<div class="info-badge level-badge">${level}</div>`;

        // If it's a spawner or mine, show capacity and/or lifespan
        if (['angel', 'titan', 'dragon', 'archer', 'mage'].includes(data.type)) {
            if (!data.id) {
                data.id = 'b_' + Math.random().toString(36).substr(2, 9);
            }
            const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === data.id).length;
            infoBadgeHtml += `<div class="info-badge cap-badge">${currentUnits}/${level}</div>`;
        }

        if (data.productionsLeft !== undefined) {
            infoBadgeHtml += `<div class="info-badge cap-badge">${data.productionsLeft}/18</div>`;
        }

        cell.innerHTML = `
            <div class="building quality-${config.quality} ${isBuffed ? 'buffed' : ''}" data-type="${data.type}" data-level="${data.level}" data-index="${index}">
                <span class="icon">${config.icon}</span>
                ${infoBadgeHtml}
            </div>
            <div class="cd-bar-container"><div class="cd-bar-fill"></div></div>
        `;
    }
    updateGazeVisuals();
}

// --- Drag and Drop Logic (Pointer Events for mouse & touch) ---

function setupDragEvents() {
    // We attach listeners to the container to handle events bubble
    DOM.grid.addEventListener('pointerdown', handlePointerDown);
    document.getElementById('card-hand-bar').addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    // Prevent default touch behaviors like scrolling while dragging
    DOM.grid.addEventListener('touchstart', e => {
        if (e.target.closest('.building')) e.preventDefault();
    }, { passive: false });
}

function handlePointerDown(e) {
    const buildingEl = e.target.closest('.building');
    const cardEl = e.target.closest('.play-card:not(.unaffordable)');

    if (!buildingEl && !cardEl) return;

    let index = -1;
    let bData = null;
    let sourceType = 'grid';

    if (buildingEl) {
        const cellEl = buildingEl.closest('.cell');
        index = parseInt(cellEl.dataset.index);
        bData = state.grid[index];
        sourceType = 'grid';
    } else if (cardEl) {
        index = parseInt(cardEl.dataset.index);
        const cardType = state.cards.hand[index];
        bData = {
            type: cardType,
            level: state.cardLevels[cardType],
            buffed: false,
            timer: 0
        };
        sourceType = 'card';
    }

    // Setup drag state
    state.dragData.active = true;
    state.dragData.element = buildingEl || cardEl;
    state.dragData.sourceType = sourceType;
    state.dragData.startIndex = index;
    state.dragData.buildingData = bData;

    // Visuals
    const targetElement = buildingEl || cardEl;
    targetElement.classList.add('dragging');

    if (DOM.sellZone) DOM.sellZone.classList.add('active');

    // Calc offset
    const rect = (buildingEl || cardEl).getBoundingClientRect();
    state.dragData.offsetX = e.clientX - rect.left;
    state.dragData.offsetY = e.clientY - rect.top;

    // Visuals
    const ghost = DOM.ghost;
    ghost.className = 'drag-ghost building';

    // Always add quality class and data-type for consistent styling
    const quality = BUILDING_TYPES[bData.type].quality;
    ghost.classList.add(`quality-${quality}`);
    ghost.dataset.type = bData.type;

    if (sourceType === 'grid') {
        if (getCellSpeedMultiplier(index) > 1.0 || bData.type === 'gaze') ghost.classList.add('buffed');
    }

    // Set ghost content to be square and show level
    ghost.innerHTML = `
        <span class="icon">${BUILDING_TYPES[bData.type].icon}</span>
        <div class="info-badge level-badge">${bData.level}</div>
    `;
    const ghostSize = Math.max(rect.width, rect.height);
    ghost.style.width = `${ghostSize}px`;
    ghost.style.height = `${ghostSize}px`;

    updateGhostPosition(e.clientX, e.clientY);
    updateGazeVisuals();
}

function handlePointerMove(e) {
    if (!state.dragData.active) return;
    updateGhostPosition(e.clientX, e.clientY);

    // Highlight drop target
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('drag-over'));

    // Create an element from point to find the cell underneath
    DOM.ghost.style.visibility = 'hidden'; // Hide ghost temporarily to get underlying element
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    DOM.ghost.style.visibility = 'visible';

    if (targetEl) {
        const targetCell = targetEl.closest('.cell:not(.locked)');
        if (targetCell) {
            const targetIndex = parseInt(targetCell.dataset.index);
            if (state.dragData.sourceType === 'grid' && targetIndex == state.dragData.startIndex) return;
            targetCell.classList.add('drag-over');
        }

        // Check for Sell Zone hover
        if (DOM.sellZone) {
            const sellZone = targetEl.closest('#sell-zone');
            const isOver = !!sellZone;
            if (isOver !== state.dragData.isOverSellZone) {
                state.dragData.isOverSellZone = isOver;
                DOM.sellZone.classList.toggle('drag-over', isOver);
            }
        }
    }
    updateGazeVisuals();
}

function updateGhostPosition(x, y) {
    // Instead of translate, use explicit left/top since position: fixed
    DOM.ghost.style.left = `${x - state.dragData.offsetX}px`;
    DOM.ghost.style.top = `${y - state.dragData.offsetY}px`;
    DOM.ghost.style.transform = `scale(1.05)`; // Slight pop out effect
}

function handlePointerUp(e) {
    if (!state.dragData.active) return;

    // Remove highlights
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('drag-over'));

    DOM.ghost.style.visibility = 'hidden';
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    DOM.ghost.style.visibility = 'visible';

    let targetIndex = -1;
    if (targetEl) {
        const targetCell = targetEl.closest('.cell:not(.locked)');
        if (targetCell) {
            targetIndex = parseInt(targetCell.dataset.index);
        }
    }

    const { startIndex, buildingData, sourceType, element, isOverSellZone } = state.dragData;

    // Handle Selling
    if (isOverSellZone) {
        let refund = 0;
        if (sourceType === 'card') {
            const baseCost = BUILDING_TYPES[buildingData.type].cost;
            const currentCost = Math.max(1, baseCost - (state.costOffset || 0));
            refund = Math.ceil(currentCost * 0.5);

            // Remove from hand and draw new
            state.cards.hand.splice(startIndex, 1);
            state.cards.hand.push(state.cards.next);
            state.cards.next = drawRandomCard();
        } else if (sourceType === 'grid') {
            const baseCost = BUILDING_TYPES[buildingData.type].cost;
            refund = Math.ceil(baseCost * 0.5 * buildingData.level);

            // Remove from grid
            state.grid[startIndex] = null;
            renderCell(startIndex);
        }

        state.gold = Math.min(state.maxEnergy, state.gold + refund);
        showToast(`已卖出，金币 +${refund}`, "success");
        spawnFloatingText(`+${refund}⚡`, e.clientX, e.clientY - 20, '#facc15');
        highlightEnergyBar();
        renderCardHand();
    }
    else if (targetIndex !== -1) {
        if (sourceType === 'grid') {
            if (targetIndex !== startIndex) {
                const targetData = state.grid[targetIndex];
                if (!targetData) {
                    state.grid[startIndex] = null;
                    state.grid[targetIndex] = buildingData;
                } else if (targetData.type === buildingData.type && targetData.level === buildingData.level) {
                    state.grid[startIndex] = null;
                    state.grid[targetIndex] = { ...targetData, level: targetData.level + 1, timer: 0 };
                } else {
                    state.grid[startIndex] = targetData;
                    state.grid[targetIndex] = buildingData;
                }
                renderCell(startIndex);
                renderCell(targetIndex);
            }
        } else if (sourceType === 'card') {
            const cardData = buildingData;
            const targetData = state.grid[targetIndex];
            const cost = BUILDING_TYPES[cardData.type].cost;

            if (state.gold >= cost) {
                if (!targetData) {
                    // Place card
                    state.gold -= cost;
                    placeBuilding(targetIndex, { ...cardData, id: 'b_' + Math.random().toString(36).substr(2, 9) });
                    state.cards.hand.splice(startIndex, 1);
                    state.cards.hand.push(state.cards.next);
                    state.cards.next = drawRandomCard();
                    renderCardHand();
                    updateShopUI();
                } else if (targetData.type === cardData.type && targetData.level === cardData.level) {
                    // Merge card onto grid
                    state.gold -= cost;
                    state.grid[targetIndex] = { ...targetData, level: targetData.level + 1, timer: 0 };
                    renderCell(targetIndex);
                    state.cards.hand.splice(startIndex, 1);
                    state.cards.hand.push(state.cards.next);
                    state.cards.next = drawRandomCard();
                    renderCardHand();
                    updateShopUI();
                } else {
                    // Invalid drop
                }
            } else {
                showToast("能量不足！", "error");
            }
        }
    }

    // Reset
    if (element) element.classList.remove('dragging');
    state.dragData.active = false;
    state.dragData.isOverSellZone = false;
    DOM.ghost.className = 'drag-ghost hidden';
    if (DOM.sellZone) DOM.sellZone.classList.remove('active', 'drag-over');

    // Safety re-render to clear states
    if (state.grid[startIndex]) renderCell(startIndex);
    if (targetIndex !== -1 && state.grid[targetIndex]) renderCell(targetIndex);
}

// --- Phase 2: Game Loop & Combat Logic ---

function gameLoop(currentTime) {
    if (!state.battle.lastTime) state.battle.lastTime = currentTime;
    let dt = currentTime - state.battle.lastTime;
    state.battle.lastTime = currentTime;

    // Cap dt to prevent massive jumps when tab is inactive
    if (dt > 100) dt = 100;

    updateCombat(dt);
    renderEntities();

    requestAnimationFrame(gameLoop);
}

function updateCombat(dt) {
    if (state.battle.wallHP <= 0) {
        restartGame();
        return;
    }

    // 0. Phase Logic
    if (state.battle.phase === 'day') {
        const activeEnemies = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
        if (state.battle.enemiesSpawnedThisDay >= 20 && activeEnemies.length === 0) {
            // Day over - 5s rest pause
            state.battle.waveBreakTimer += dt;
            const nextWaveNum = state.battle.dayCounter + 1;
            const countdown = Math.ceil((5000 - state.battle.waveBreakTimer) / 1000);
            DOM.phaseText.textContent = `第 ${nextWaveNum} 关来临 (${countdown})`;

            if (state.battle.waveBreakTimer >= 5000) {
                state.battle.waveBreakTimer = 0;
                if (state.battle.dayCounter % 3 === 0) {
                    // Reward Day
                    state.battle.phase = 'night';
                    state.isChoosingReward = true;
                    DOM.battleArea.classList.add('night');
                    DOM.managementArea.classList.add('night');
                    showNightChoice();
                } else {
                    // Regular Day, skip choice
                    applyRewardEnd();
                }
            }
        } else {
            state.battle.waveBreakTimer = 0; // reset if enemies still alive
        }
    }

    // Energy Regeneration: 1 energy every 4 seconds (was 5s)
    const regenInterval = 4000 / state.regenRate;
    if (state.gold < state.maxEnergy && !state.isChoosingReward) {
        state.energyRegenTimer += dt;
        if (state.energyRegenTimer >= regenInterval) {
            state.energyRegenTimer -= regenInterval;
            state.gold += 1;
            updateShopUI();
            highlightEnergyBar();
        }
    } else {
        state.energyRegenTimer = 0;
    }
    // Strict cap
    if (state.gold > state.maxEnergy) state.gold = state.maxEnergy;

    // Update energy visual bar (smooth fill)
    const energyFillEl = document.getElementById('energy-fill');
    const energyNumEl = document.getElementById('energy-number');
    if (energyFillEl) {
        const totalProgress = (state.gold + (state.gold < state.maxEnergy ? state.energyRegenTimer / regenInterval : 0)) / state.maxEnergy * 100;
        energyFillEl.style.width = `${Math.min(totalProgress, 100)}%`;
    }
    if (energyNumEl) {
        energyNumEl.textContent = `${state.gold}/${state.maxEnergy}`;
    }

    // Energy Full Warning
    const isFull = state.gold >= state.maxEnergy;
    if (energyFillEl) energyFillEl.classList.toggle('full', isFull);
    if (energyNumEl) energyNumEl.classList.toggle('full', isFull);

    // 1. Spawner & Mine Logic with cap checks
    state.grid.forEach((b, idx) => {
        if (!b || b.type === 'gaze') return;

        // Check cap dynamically for progress bar and production
        let isAtCapacity = false;
        let currentUnits = 0;

        if (['angel', 'titan', 'dragon', 'archer', 'mage'].includes(b.type)) {
            currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
            if (currentUnits >= b.level) isAtCapacity = true;
        }

        if (b.type === 'mine' && state.gold >= state.maxEnergy) {
            isAtCapacity = true;
        }

        if (b.type === 'fireball' && state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0).length === 0) {
            isAtCapacity = true;
        }

        // Ticking
        const cellMult = getCellSpeedMultiplier(idx);
        if (!isAtCapacity) {
            const speed = cellMult * (state.buildingSpeedMult || 1.0);
            b.timer += dt * speed;

            if (b.timer >= BUILDING_CD_MAX) {
                b.timer = 0;
                triggerBuilding(b, idx);
            }
        } else {
            // Option: Reset timer to 0 if at capacity to avoid weird fills
            b.timer = 0;
        }

        // Visual updates
        const cell = DOM.grid.children[idx];
        const bar = cell.querySelector('.cd-bar-fill');
        if (bar) {
            const progress = (b.timer / BUILDING_CD_MAX) * 100;
            bar.style.width = `${Math.min(progress, 100)}%`;
            if (cellMult > 1.0) bar.classList.add('gold');
            else bar.classList.remove('gold');
        }

        // Update cap badges
        if (['angel', 'titan', 'dragon'].includes(b.type)) {
            const badge = cell.querySelector('.cap-badge');
            if (badge) badge.textContent = `${currentUnits}/${b.level}`;
        }
    });

    // 2. Spawner (Enemy)
    if (state.battle.phase === 'day' && state.battle.enemiesSpawnedThisDay < 20 && !state.isChoosingReward) {
        state.battle.enemySpawnTimer += dt;
        if (state.battle.enemySpawnTimer >= ENEMY_SPAWN_CD / 2) {
            state.battle.enemySpawnTimer -= ENEMY_SPAWN_CD / 2;
            spawnEnemy();
            if (state.battle.enemiesSpawnedThisDay < 20) {
                spawnEnemy();
            }
        }
    }

    // 3. Move Entities
    const wallY = DOM.battleArea.getBoundingClientRect().height;

    for (let i = state.battle.entities.length - 1; i >= 0; i--) {
        let ent = state.battle.entities[i];

        if (ent.type === 'enemy') {
            const allies = state.battle.entities.filter(e => e.type === 'ally' && e.hp > 0);
            if (allies.length > 0) {
                // Seek nearest ally
                let nearest = allies[0];
                let minDist = Math.hypot(nearest.x - ent.x, nearest.y - ent.y);
                for (let j = 1; j < allies.length; j++) {
                    const d = Math.hypot(allies[j].x - ent.x, allies[j].y - ent.y);
                    if (d < minDist) {
                        minDist = d;
                        nearest = allies[j];
                    }
                }

                const dx = nearest.x - ent.x;
                const dy = nearest.y - ent.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 2) {
                    const moveDist = ent.speed * (dt / 1000);
                    ent.x += (dx / dist) * moveDist;
                    ent.y += (dy / dist) * moveDist;
                }
            } else {
                // No allies, move toward wall
                ent.y += ent.speed * (dt / 1000);
            }

            if (ent.y >= wallY) {
                // Hit wall
                state.battle.wallHP = Math.max(0, state.battle.wallHP - ent.damage);
                updateWallHP();
                ent.hp = 0; // kill enemy
            }
        }
        else if (ent.type === 'ally') {
            // Apply boids separation to allies
            let sepX = 0;
            let sepY = 0;
            state.battle.entities.filter(o => o.type === 'ally' && o !== ent).forEach(o => {
                const odx = ent.x - o.x;
                const ody = ent.y - o.y;
                const odist = Math.hypot(odx, ody);
                if (odist < 15 && odist > 0) {
                    sepX += odx / odist;
                    sepY += ody / odist;
                }
            });

            if (state.battle.phase === 'night') {
                // Retreat to camp at the bottom of the battle area
                const rect = DOM.battleArea.getBoundingClientRect();

                // Spread evenly in the camp area (bottom 60px)
                const hash1 = (ent.id.charCodeAt(2) || 0) * 13;
                const hash2 = (ent.id.charCodeAt(3) || 0) * 17;

                const campY = rect.height - 15 - (hash1 % 35); // Spread within bottom 15~50px
                const campX = 20 + (hash2 % Math.max(1, rect.width - 40));

                const dx = campX - ent.x;
                const dy = campY - ent.y;
                const dist = Math.hypot(dx, dy);

                let nx = 0, ny = 0;
                if (dist > 0) {
                    nx = dx / dist + sepX * 1.5;
                    ny = dy / dist + sepY * 1.5;
                    const nmag = Math.hypot(nx, ny) || 1;
                    nx /= nmag; ny /= nmag;
                }

                if (dist > 5) {
                    const moveSpeed = ent.speed * (dt / 1000);
                    ent.x += nx * moveSpeed;
                    ent.y += ny * moveSpeed;
                }
            } else if (ent.range) {
                // Ranged Ally Day Logic
                const activeEnemies = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
                if (activeEnemies.length > 0) {
                    let nearest = activeEnemies[0];
                    let minDist = Math.hypot(nearest.x - ent.x, nearest.y - ent.y);
                    for (let j = 1; j < activeEnemies.length; j++) {
                        const d = Math.hypot(activeEnemies[j].x - ent.x, activeEnemies[j].y - ent.y);
                        if (d < minDist) {
                            minDist = d;
                            nearest = activeEnemies[j];
                        }
                    }

                    if (minDist > ent.range) {
                        // Move closer
                        const dx = nearest.x - ent.x;
                        const dy = nearest.y - ent.y;
                        const dist = Math.hypot(dx, dy);
                        const moveDist = ent.speed * (dt / 1000);
                        ent.x += (dx / dist) * moveDist;
                        ent.y += (dy / dist) * moveDist;
                    } else {
                        // In range, attack
                        ent.attackTimer = (ent.attackTimer || 0) + dt;
                        if (ent.attackTimer >= ent.attackCD) {
                            ent.attackTimer = 0;
                            const isMage = ent.id.startsWith('mg_');
                            state.battle.entities.push({
                                id: 'p_' + Math.random().toString(36).substr(2, 9),
                                type: 'projectile',
                                subType: isMage ? 'mage-bolt' : 'arrow',
                                x: ent.x,
                                y: ent.y,
                                radius: isMage ? 8 : 4,
                                hp: 1,
                                damage: ent.damage,
                                speed: isMage ? 400 : 800,
                                target: nearest,
                                splashRadius: isMage ? 50 : 0
                            });
                        }
                    }
                }
            } else {
                // Find nearest enemy to track (Day Phase)
                const activeEnemies = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
                if (activeEnemies.length > 0) {
                    // Find nearest
                    let nearest = activeEnemies[0];
                    let minDist = Math.hypot(nearest.x - ent.x, nearest.y - ent.y);
                    for (let j = 1; j < activeEnemies.length; j++) {
                        const d = Math.hypot(activeEnemies[j].x - ent.x, activeEnemies[j].y - ent.y);
                        if (d < minDist) {
                            minDist = d;
                            nearest = activeEnemies[j];
                        }
                    }

                    // Move towards nearest
                    const dx = nearest.x - ent.x;
                    const dy = nearest.y - ent.y;
                    const dist = Math.hypot(dx, dy);

                    let nx = 0, ny = 0;
                    if (dist > 0) {
                        nx = dx / dist + sepX * 1.5;
                        ny = dy / dist + sepY * 1.5;
                        const nmag = Math.hypot(nx, ny) || 1;
                        nx /= nmag; ny /= nmag;
                    }

                    if (dist > 5) { // don't jitter if right on top
                        const moveDist = ent.speed * (dt / 1000);
                        ent.x += nx * moveDist;
                        ent.y += ny * moveDist;
                    }
                } else {
                    // No enemies, idle strictly in the camp zone (Day Phase)
                    const bRect = DOM.battleArea.getBoundingClientRect();
                    const campTopY = bRect.height * 0.7; // top of camp
                    const wallY = bRect.height - 10;

                    const hash1 = (ent.id.charCodeAt(2) || 0) * 11;
                    const hash2 = (ent.id.charCodeAt(3) || 0) * 19;

                    const targetCampY = campTopY + 15 + (hash1 % (wallY - campTopY - 30));
                    const targetCampX = 20 + (hash2 % Math.max(1, bRect.width - 40));

                    const dx = targetCampX - ent.x;
                    const dy = targetCampY - ent.y;
                    const dist = Math.hypot(dx, dy);

                    let nx = 0, ny = 0;
                    if (dist > 0) {
                        nx = dx / dist;
                        ny = dy / dist;

                        // Only apply separation if we are not "close enough" to target to avoid jitter
                        if (dist > 20) {
                            nx += sepX * 1.5;
                            ny += sepY * 1.5;
                        }

                        const nmag = Math.hypot(nx, ny) || 1;
                        nx /= nmag; ny /= nmag;
                    }

                    if (dist > 3) {
                        const isWaveBreak = (state.battle.enemiesSpawnedThisDay >= 20 && activeEnemies.length === 0);
                        const moveSpeed = isWaveBreak ? ent.speed * 4 : ent.speed;
                        const moveDist = moveSpeed * (dt / 1000);
                        ent.x += nx * moveDist;
                        ent.y += ny * moveDist;
                    }

                    // Strict bounds clamping just in case
                    if (ent.y <= campTopY + 10) ent.y = campTopY + 10;
                    if (ent.y >= wallY) ent.y = wallY;
                    if (ent.x <= 10) ent.x = 10;
                    if (ent.x >= bRect.width - 10) ent.x = bRect.width - 10;
                }
            }
        }
        else if (ent.type === 'projectile') {
            const hasTarget = ent.target && ent.target.hp > 0;
            if (hasTarget) {
                // Track last known position
                ent.lastTargetX = ent.target.x;
                ent.lastTargetY = ent.target.y;
            }

            const targetX = hasTarget ? ent.target.x : (ent.lastTargetX || ent.x);
            const targetY = hasTarget ? ent.target.y : (ent.lastTargetY || ent.y);

            const dx = targetX - ent.x;
            const dy = targetY - ent.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 15) {
                // Hit or reached target point!
                if (ent.isFireball) {
                    const splashRadius = 100;
                    const targets = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
                    targets.forEach(t => {
                        const d = Math.hypot(t.x - ent.x, t.y - ent.y);
                        if (d <= splashRadius) {
                            t.hp -= ent.damage;
                        }
                    });
                    spawnExplosionEffect(ent.x, ent.y, splashRadius);
                    spawnFloatingText("BOOM!", ent.x, ent.y, "#ef4444");
                } else if (hasTarget) {
                    ent.target.hp -= ent.damage;
                    if (ent.splashRadius > 0) {
                        const targets = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0 && e !== ent.target);
                        targets.forEach(t => {
                            const d = Math.hypot(t.x - ent.x, t.y - ent.y);
                            if (d <= ent.splashRadius) t.hp -= ent.damage * 0.5;
                        });
                        spawnExplosionEffect(ent.x, ent.y, ent.splashRadius, '#3b82f6');
                    }
                }
                ent.hp = 0; // kill projectile
            } else {
                const moveDist = ent.speed * (dt / 1000);
                ent.x += (dx / dist) * moveDist;
                ent.y += (dy / dist) * moveDist;
            }
        }
    }

    // 4. Melee Collision (Ally vs Enemy)
    const targetEnemies = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
    const allies = state.battle.entities.filter(e => e.type === 'ally' && e.hp > 0);
    for (let a of allies) {
        for (let e of targetEnemies) {
            if (e.hp <= 0) continue;
            const dist = Math.hypot(a.x - e.x, a.y - e.y);
            if (dist < (a.radius + e.radius)) {
                // simple clash, both take damage
                e.hp -= a.damage;
                a.hp -= e.damage;

                // Grant reward on kill
                if (e.hp <= 0) {
                    // Economy rebalance: No gold per kill
                    // state.gold += 10;
                    // spawnFloatingText('+10💰', e.x, e.y, '#facc15');
                    // updateShopUI();
                }
            }
        }
    }

    // Projectiles also kill enemies
    const projectiles = state.battle.entities.filter(e => e.type === 'projectile' && e.hp > 0);
    for (let p of projectiles) {
        if (p.target && p.target.hp <= 0 && state.battle.entities.includes(p.target)) {
            // target died this tick? the cleanup logic below might let projectile still hit
            // but if projectile causes kill
        }
        // Actually projectile kill logic is handled in movement loop
    }
    // We need to move the projectile hit logic down or add gold grant to movement hit.
    // Let's patch projectile movement hit right above:

    // 5. Cleanup dead entities
    state.battle.entities = state.battle.entities.filter(e => e.hp > 0);
}

function spawnEnemy() {
    const containerRect = DOM.gameContainer.getBoundingClientRect();
    const count = Math.random() > 0.5 ? 2 : 1;

    // Scale by day.
    const bonusStat = (state.battle.dayCounter - 1) * 5;

    for (let i = 0; i < count; i++) {
        if (state.battle.enemiesSpawnedThisDay >= 20) break; // Don't overflow the 20 cap

        state.battle.enemiesSpawnedThisDay++;

        state.battle.entities.push({
            id: 'e_' + Math.random().toString(36).substr(2, 9),
            type: 'enemy',
            x: Math.random() * (containerRect.width - 40) + 20, // Avoid edges
            y: 20,
            radius: 15,
            hp: 30 + bonusStat,
            speed: 30
        });
    }
}

function spawnExplosionEffect(x, y, radius) {
    const el = document.createElement('div');
    el.className = 'explosion-ring';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    // The CSS animation handles the growth, but we can sync the max size
    // For 100px radius, diameter is 200px, which matches the CSS keyframe.
    DOM.entitiesLayer.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

function spawnFloatingText(text, x, y, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (color) el.style.color = color;
    DOM.entitiesLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function triggerBuilding(b, idx) {
    const cellDOM = DOM.grid.children[idx];
    const rect = cellDOM.getBoundingClientRect();
    const containerRect = DOM.gameContainer.getBoundingClientRect();

    const statMult = state.allyStatMult || 1.0;

    // Lifespan decrement
    if (b.productionsLeft !== undefined) {
        b.productionsLeft--;
        if (b.productionsLeft <= 0) {
            setTimeout(() => {
                state.grid[idx] = null;
                renderCell(idx);
                spawnFloatingText("耗尽！", rect.left + rect.width / 2 - containerRect.left, rect.top - containerRect.top, "#94a3b8");
            }, 100);
        } else {
            // Update display
            renderCell(idx);
        }
    }

    if (b.type === 'mine') {
        const spawnX = rect.left + rect.width / 2 - containerRect.left;
        const spawnY = rect.top - containerRect.top;
        const income = b.level;
        state.gold += income;
        updateShopUI();
        highlightEnergyBar();
        spawnFloatingText(`+${income}⚡`, spawnX, spawnY - 20, '#60a5fa');
    }
    else if (b.type === 'titan') {
        const spawnX = (rect.left + rect.width / 2) - containerRect.left;
        const spawnY = (rect.top + rect.height / 2) - containerRect.top;
        const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
        if (currentUnits < b.level) {
            state.battle.entities.push({
                id: 't_' + Math.random().toString(36).substr(2, 9),
                origin: b.id,
                type: 'ally',
                x: spawnX,
                y: spawnY,
                radius: 18,
                hp: 100 * b.level * statMult,
                damage: 50 * b.level * statMult,
                speed: 40
            });
        }
    }
    else if (b.type === 'dragon') {
        const spawnX = (rect.left + rect.width / 2) - containerRect.left;
        const spawnY = (rect.top + rect.height / 2) - containerRect.top;
        const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
        if (currentUnits < b.level) {
            state.battle.entities.push({
                id: 'd_' + Math.random().toString(36).substr(2, 9),
                origin: b.id,
                type: 'ally',
                x: spawnX,
                y: spawnY,
                radius: 14,
                hp: 40 * b.level * statMult,
                damage: 25 * b.level * statMult,
                speed: 100
            });
        }
    }
    else if (b.type === 'angel') {
        const spawnX = (rect.left + rect.width / 2) - containerRect.left;
        const spawnY = (rect.top + rect.height / 2) - containerRect.top;
        const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
        if (currentUnits < (b.level || 1)) {
            state.battle.entities.push({
                id: 'a_' + Math.random().toString(36).substr(2, 9),
                origin: b.id,
                type: 'ally',
                x: spawnX,
                y: spawnY,
                radius: 12,
                hp: 20 * (b.level || 1) * statMult,
                damage: 15 * (b.level || 1) * statMult,
                speed: 80
            });
        }
    }
    else if (b.type === 'archer') {
        const spawnX = (rect.left + rect.width / 2) - containerRect.left;
        const spawnY = (rect.top + rect.height / 2) - containerRect.top;
        const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
        if (currentUnits < (b.level || 1)) {
            state.battle.entities.push({
                id: 'ar_' + Math.random().toString(36).substr(2, 9),
                origin: b.id,
                type: 'ally',
                x: spawnX,
                y: spawnY,
                radius: 12,
                hp: 30 * (b.level || 1) * statMult,
                damage: 20 * (b.level || 1) * statMult,
                speed: 60,
                range: 250,
                attackCD: 1200
            });
        }
    }
    else if (b.type === 'mage') {
        const spawnX = (rect.left + rect.width / 2) - containerRect.left;
        const spawnY = (rect.top + rect.height / 2) - containerRect.top;
        const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
        if (currentUnits < (b.level || 1)) {
            state.battle.entities.push({
                id: 'mg_' + Math.random().toString(36).substr(2, 9),
                origin: b.id,
                type: 'ally',
                x: spawnX,
                y: spawnY,
                radius: 14,
                hp: 40 * (b.level || 1) * statMult,
                damage: 35 * (b.level || 1) * statMult,
                speed: 50,
                range: 180,
                attackCD: 2000
            });
        }
    }
    else if (b.type === 'fireball') {
        const spawnX = rect.left + rect.width / 2 - containerRect.left;
        const spawnY = rect.top - containerRect.top;
        const enemies = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
        if (enemies.length > 0) {
            enemies.sort((e1, e2) => {
                const d1 = Math.hypot(e1.x - spawnX, e1.y - spawnY);
                const d2 = Math.hypot(e2.x - spawnX, e2.y - spawnY);
                return d1 - d2;
            });
            const target = enemies[0];

            state.battle.entities.push({
                id: 'p_' + Math.random().toString(36).substr(2, 9),
                type: 'projectile',
                x: spawnX,
                y: spawnY,
                radius: 5,
                hp: 1,
                damage: 20 * (b.level || 1) * statMult,
                speed: 600,
                target: target,
                lastTargetX: target.x,
                lastTargetY: target.y,
                isFireball: true
            });
        }
    }
}

function updateWallHP() {
    const maxHP = state.wallMaxHP || WALL_MAX_HP;
    const pct = (state.battle.wallHP / maxHP) * 100 || 0;
    DOM.wallHpFill.style.width = `${Math.max(0, pct)}%`;
}

function renderEntities() {
    // Diff DOM
    const currentIds = new Set(state.battle.entities.map(e => e.id));

    // Remove old
    Array.from(DOM.entitiesLayer.children).forEach(child => {
        if (!currentIds.has(child.id)) {
            child.remove();
        }
    });

    // Add or update
    state.battle.entities.forEach(ent => {
        let el = document.getElementById(ent.id);
        if (!el) {
            el = document.createElement('div');
            el.id = ent.id;
            el.className = `entity ${ent.type}`;
            el.style.width = `${ent.radius * 2}px`;
            el.style.height = `${ent.radius * 2}px`;
            DOM.entitiesLayer.appendChild(el);
        }
        el.style.left = `${ent.x}px`;
        el.style.top = `${ent.y}px`;

        // Show HP if not projectile
        if (ent.type !== 'projectile') {
            el.textContent = Math.ceil(ent.hp);
        } else {
            el.textContent = '';
        }
    });
}

function showNightChoice() {
    const overlay = document.getElementById('night-choice-overlay');
    const optionsContainer = document.getElementById('choice-options');
    if (!overlay || !optionsContainer) return;

    DOM.phaseText.textContent = `🌙 夜间休整`;
    optionsContainer.innerHTML = '';

    const pool = [
        {
            title: '强化训练',
            sub: '随机一个防御塔或眼怪等级 +1',
            icon: '🔥',
            action: () => {
                // Production buildings are non-upgradable as per user request
                const upgradeableIndices = state.grid.map((b, i) => b && (b.type === 'fireball' || b.type === 'gaze') ? i : -1).filter(i => i !== -1);
                if (upgradeableIndices.length > 0) {
                    const idx = upgradeableIndices[Math.floor(Math.random() * upgradeableIndices.length)];
                    state.grid[idx].level++;
                    renderCell(idx);
                }
            }
        },
        {
            title: '能量过载',
            sub: '能量上限 +2',
            icon: '⚡',
            action: () => {
                state.maxEnergy += 2;
                renderEnergySegments();
                updateShopUI();
            }
        },
        {
            title: '闪电充能',
            sub: '能量恢复速度 +20%',
            icon: '🔄',
            action: () => {
                state.regenRate += 0.2;
            }
        },
        {
            title: '工业化',
            sub: '建筑产速提升 30%',
            icon: '🏭',
            action: () => {
                state.buildingSpeedMult += 0.3;
            }
        },
        {
            title: '城墙加固',
            sub: '城墙上限 +500 并修满',
            icon: '🧱',
            action: () => {
                state.wallMaxHP += 500;
                state.battle.wallHP = state.wallMaxHP;
                updateWallHP();
            }
        },
        {
            title: '士气高涨',
            sub: '兵种生命与攻击 +25%',
            icon: '⚔️',
            action: () => {
                state.allyStatMult += 0.25;
            }
        },
        {
            title: '战地医疗',
            sub: '回复 300 点城墙血量',
            icon: '🩹',
            action: () => {
                state.battle.wallHP = Math.min(state.wallMaxHP, state.battle.wallHP + 300);
                updateWallHP();
            }
        },
        {
            title: '全线升级',
            sub: '所有已解锁卡牌等级 +1',
            icon: '⭐',
            action: () => {
                Object.keys(state.cardLevels).forEach(k => state.cardLevels[k]++);
                state.grid.forEach((b, i) => { if (b) { b.level++; renderCell(i); } });
            }
        },
        {
            title: '成本控制',
            sub: '所有卡牌消耗减少 1 点',
            icon: '📉',
            action: () => {
                state.costOffset += 1;
                updateShopUI();
            }
        },
        {
            title: '紧急动员',
            sub: '立刻获得 8 点能量',
            icon: '🔋',
            action: () => {
                state.gold = Math.min(state.maxEnergy, state.gold + 8);
                updateShopUI();
                highlightEnergyBar();
            }
        }
    ];

    // Shuffle and pick 3
    const shuffled = pool.sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 3);

    choices.forEach(c => {
        const btn = document.createElement('div');
        btn.className = 'choice-card';
        btn.innerHTML = `
            <div class="card-icon">${c.icon}</div>
            <div class="card-title">${c.title}</div>
            <div class="card-sub">${c.sub}</div>
        `;
        btn.onclick = () => {
            c.action();
            applyRewardEnd();
            showToast(`${c.title} 已生效！`, "success");
        };
        optionsContainer.appendChild(btn);
    });

    overlay.classList.remove('hidden');
}

function applyRewardEnd() {
    const overlay = document.getElementById('night-choice-overlay');
    overlay.classList.add('hidden');

    // Proceed to next day
    state.battle.phase = 'day';
    state.battle.dayCounter++;
    state.battle.enemiesSpawnedThisDay = 0;
    state.isChoosingReward = false;
    DOM.phaseText.textContent = `☀️ 第 ${state.battle.dayCounter} 天`;
    DOM.battleArea.classList.remove('night');
    DOM.managementArea.classList.remove('night');
    showToast(`第 ${state.battle.dayCounter} 天开始！敌人变强了！`, "error");
}

// Start
init();
