const GRID_COLS = 7;
const GRID_ROWS = 3;

// --- Phase 2: Battle Constants ---
const BUILDING_CD_MAX = 1500; // ms (was 3000)
const ENEMY_SPAWN_CD = 1500;  // ms (was 4000)
const WALL_MAX_HP = 1000;

// Game State
const state = {
    grid: Array(GRID_COLS * GRID_ROWS).fill(null), // null means empty, object means building
    dragData: {
        active: false,
        element: null,
        startIndex: -1,
        buildingData: null,
        offsetX: 0,
        offsetY: 0
    },
    gazeData: {
        active: false,
        offsetX: 0,
        offsetY: 0,
        gridX: Math.floor((GRID_COLS - 2) / 2),
        gridY: Math.floor((GRID_ROWS - 2) / 2),
        width: 2,
        height: 2,
        level: 1 // gaze upgrade level (1, 2, 3)
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
        lastTime: performance.now()
    },
    gold: 30 // Starting gold
};

const BUILDING_TYPES = {
    angel: { icon: '👼' },
    fireball: { icon: '🔥' },
    mine: { icon: '⛏️' },
    titan: { icon: '🧌' },
    dragon: { icon: '🐉' }
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
    goldDisplay: document.getElementById('gold-display'),
    phaseText: document.getElementById('phase-text'),
    phaseBarContainer: document.getElementById('phase-bar-container'),
    phaseBarFill: document.getElementById('phase-bar-fill')
};

function init() {
    createGrid();
    setupShop();
    setupDragEvents();
    setupGazeEvents();

    // Set initial HP fill
    updateWallHP();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function setupGazeEvents() {
    const gaze = document.getElementById('gaze-light');
    const handle = document.getElementById('gaze-handle');
    const rotateBtn = document.getElementById('gaze-rotate');

    if (gaze && handle) {
        DOM.gaze = gaze;
        DOM.gazeHandle = handle;
        DOM.gazeRotate = rotateBtn;
        // Position gaze initially
        updateGazeVisuals();

        handle.addEventListener('pointerdown', e => {
            state.gazeData.active = true;

            const rect = gaze.getBoundingClientRect();
            state.gazeData.offsetX = e.clientX - rect.left;
            state.gazeData.offsetY = e.clientY - rect.top;

            e.stopPropagation(); // prevent grid building drag
        });

        document.addEventListener('pointermove', e => {
            if (!state.gazeData.active) return;

            const gridRect = DOM.grid.getBoundingClientRect();

            // Calculate raw relative position
            let relX = e.clientX - state.gazeData.offsetX - gridRect.left;
            let relY = e.clientY - state.gazeData.offsetY - gridRect.top;

            // Cell size
            const cellW = gridRect.width / GRID_COLS;
            const cellH = gridRect.height / GRID_ROWS;

            // Snap to grid
            let gX = Math.round(relX / cellW);
            let gY = Math.round(relY / cellH);

            // Clamp
            if (gX < 0) gX = 0;
            if (gY < 0) gY = 0;
            if (gX + state.gazeData.width > GRID_COLS) gX = Math.max(0, GRID_COLS - state.gazeData.width);
            if (gY + state.gazeData.height > GRID_ROWS) gY = Math.max(0, GRID_ROWS - state.gazeData.height);

            if (gX !== state.gazeData.gridX || gY !== state.gazeData.gridY) {
                state.gazeData.gridX = gX;
                state.gazeData.gridY = gY;
                updateGazeVisuals();
                updateBuildingActiveStates();
            }
        });

        document.addEventListener('pointerup', () => {
            if (state.gazeData.active) {
                state.gazeData.active = false;
            }
        });

        // Rotate logic
        if (rotateBtn) {
            rotateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (state.gazeData.level > 1) {
                    // Swap width & height
                    let temp = state.gazeData.width;
                    state.gazeData.width = state.gazeData.height;
                    state.gazeData.height = temp;

                    // Re-clamp
                    if (state.gazeData.gridX + state.gazeData.width > GRID_COLS) {
                        state.gazeData.gridX = Math.max(0, GRID_COLS - state.gazeData.width);
                    }
                    if (state.gazeData.gridY + state.gazeData.height > GRID_ROWS) {
                        state.gazeData.gridY = Math.max(0, GRID_ROWS - state.gazeData.height);
                    }

                    updateGazeVisuals();
                    updateBuildingActiveStates();
                }
            });
        }

        window.addEventListener('resize', updateGazeVisuals);
    }
}

function updateGazeVisuals() {
    if (!DOM.gaze) return;

    const startIdx = state.gazeData.gridY * GRID_COLS + state.gazeData.gridX;
    // ensure end index takes width/height bounds into account
    const w = state.gazeData.width - 1;
    const h = state.gazeData.height - 1;

    // Safety check just in case math goes off bounds
    let endRow = Math.min(state.gazeData.gridY + h, GRID_ROWS - 1);
    let endCol = Math.min(state.gazeData.gridX + w, GRID_COLS - 1);
    const endIdx = endRow * GRID_COLS + endCol;

    const startCell = DOM.grid.children[startIdx];
    const endCell = DOM.grid.children[endIdx];

    if (startCell && endCell) {
        const parentRect = DOM.gaze.parentElement.getBoundingClientRect();
        const startRect = startCell.getBoundingClientRect();
        const endRect = endCell.getBoundingClientRect();

        DOM.gaze.style.left = `${startRect.left - parentRect.left}px`;
        DOM.gaze.style.top = `${startRect.top - parentRect.top}px`;
        DOM.gaze.style.width = `${endRect.right - startRect.left}px`;
        DOM.gaze.style.height = `${endRect.bottom - startRect.top}px`;
    }
}

function isCellInGaze(idx) {
    const r = Math.floor(idx / GRID_COLS);
    const c = idx % GRID_COLS;
    return c >= state.gazeData.gridX && c < state.gazeData.gridX + state.gazeData.width &&
        r >= state.gazeData.gridY && r < state.gazeData.gridY + state.gazeData.height;
}

function updateBuildingActiveStates() {
    state.grid.forEach((b, idx) => {
        const cell = DOM.grid.children[idx];
        const bEl = cell.querySelector('.building');
        if (bEl) {
            if (isCellInGaze(idx)) {
                bEl.classList.remove('inactive');
            } else {
                bEl.classList.add('inactive');
            }
        }
    });
}

function createGrid() {
    DOM.grid.innerHTML = '';
    state.grid = []; // Clear state.grid before populating

    // 7x3 = 21 slots
    // Goal: Place 4 combat buildings in a 2x2 exactly under initial Gaze
    // Initial Gaze is at gridX = Math.floor((GRID_COLS - 2) / 2) = Math.floor(5/2) = 2. gridY = 0.
    // So Gaze covers cols 2 and 3, rows 0 and 1.
    // Indices for this 2x2 (width=7):
    // r0 c2 = 0*7 + 2 = 2
    // r0 c3 = 0*7 + 3 = 3
    // r1 c2 = 1*7 + 2 = 9
    // r1 c3 = 1*7 + 3 = 10
    const combatIndices = [2, 3, 9, 10];
    const combatTypes = ['titan', 'dragon', 'angel', 'fireball'];

    // Place mine outside on the far right, e.g. at index 6 (r0 c6)
    const mineIndex = 6;

    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
        let b = null;
        if (i === mineIndex) {
            b = { id: `b_${Math.random().toString(36).substr(2, 9)}`, type: 'mine', level: 1, buffed: false, timer: 0 };
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

function setupShop() {
    updateShopUI();
    const spinBtn = document.getElementById('btn-spin-slot');
    if (spinBtn) {
        spinBtn.addEventListener('click', () => {
            if (state.gold >= 10) {
                // Check if enough empty slots (need at least 3)
                const emptySlots = [];
                state.grid.forEach((b, idx) => {
                    if (!b) emptySlots.push(idx);
                });

                // Determine slot count (50% for 3, 25% for 4, 25% for 5)
                const rand = Math.random();
                let slotCount = 3;
                if (rand > 0.5 && rand <= 0.75) slotCount = 4;
                else if (rand > 0.75) slotCount = 5;

                if (emptySlots.length < 1) {
                    showToast(`空格不足(至少需要1格)，整理后再试！`, "error");
                    return;
                }

                state.gold -= 10;

                // Roll items completely randomly
                const types = Object.keys(BUILDING_TYPES);
                const rolledItems = [];
                for (let i = 0; i < slotCount; i++) {
                    rolledItems.push(types[Math.floor(Math.random() * types.length)]);
                }

                // Tally occurrences to determine winner
                const counts = {};
                let maxCount = 0;
                let winnerType = rolledItems[0];
                for (const t of rolledItems) {
                    counts[t] = (counts[t] || 0) + 1;
                    if (counts[t] > maxCount) {
                        maxCount = counts[t];
                        winnerType = t;
                    }
                }

                // Sort empty slots based on winner rules
                // Combat (not mine): Top-to-Bottom, then Left-to-Right -> sort by gridY then gridX
                // Utility (mine): Top-to-Bottom, then Right-to-Left -> sort by gridY then descending gridX
                emptySlots.sort((a, b) => {
                    const rA = Math.floor(a / GRID_COLS);
                    const cA = a % GRID_COLS;
                    const rB = Math.floor(b / GRID_COLS);
                    const cB = b % GRID_COLS;

                    if (rA !== rB) return rA - rB; // Both top-to-bottom first

                    if (winnerType === 'mine') {
                        return cB - cA; // Right-to-Left
                    } else {
                        return cA - cB; // Left-to-Right
                    }
                });

                // Show slot machine overlay
                const overlay = document.getElementById('slot-machine-overlay');
                const reelsContainer = document.getElementById('slot-reels');
                reelsContainer.innerHTML = '';

                for (let i = 0; i < slotCount; i++) {
                    const reel = document.createElement('div');
                    reel.className = 'slot-reel';

                    const spinner = document.createElement('div');
                    spinner.className = 'slot-spinner';

                    const icons = [BUILDING_TYPES.titan.icon, BUILDING_TYPES.dragon.icon, BUILDING_TYPES.angel.icon, BUILDING_TYPES.fireball.icon, BUILDING_TYPES.mine.icon];
                    let html = '';
                    for (let j = 0; j < 20; j++) {
                        html += `<div class="slot-icon">${icons[Math.floor(Math.random() * icons.length)]}</div>`;
                    }
                    // If it matches the winnerType, make it glow
                    const isWinner = rolledItems[i] === winnerType;
                    html += `<div class="slot-icon ${isWinner ? 'winner' : ''}">${BUILDING_TYPES[rolledItems[i]].icon}</div>`;

                    spinner.innerHTML = html;
                    reel.appendChild(spinner);
                    reelsContainer.appendChild(reel);

                    // Trigger reflow
                    void spinner.offsetWidth;

                    setTimeout(() => {
                        spinner.style.transition = `transform ${0.5 + i * 0.15}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
                        spinner.style.transform = `translateY(-${20 * 80}px)`;
                    }, 50);
                }

                overlay.classList.remove('hidden');

                // Wait for all to finish
                const maxTime = 0.5 + (slotCount - 1) * 0.15;
                setTimeout(() => {
                    overlay.classList.add('hidden');
                    // Calculate level: 2 -> Lv1, 3 -> Lv2, 4 -> Lv3, 5 -> Lv4. (1 -> Lv1 fallback)
                    let winLevel = maxCount - 1;
                    if (winLevel < 1) winLevel = 1;

                    // Only deposit the single winner item into the grid
                    placeBuilding(emptySlots[0], {
                        id: `b_${Math.random().toString(36).substr(2, 9)}`,
                        type: winnerType,
                        level: winLevel,
                        buffed: false,
                        timer: 0
                    });
                    updateShopUI();
                    showToast(`祈愿成功！获得 1 个 Lv.${winLevel} ${BUILDING_TYPES[winnerType].icon}`, "success");
                }, maxTime * 1000 + 500);
            } else {
                showToast("金币不足！", "error");
            }
        });
    }

    const shopUpgradeBtn = document.getElementById('shop-gaze-upgrade');
    if (shopUpgradeBtn) {
        shopUpgradeBtn.addEventListener('click', () => {
            const gazeCosts = [10, 50, 250]; // Costs for level 2, 3, 4
            const currentLevel = state.gazeData.level;
            const cost = gazeCosts[currentLevel - 1];

            if (cost !== undefined && state.gold >= cost) {
                state.gold -= cost;
                state.gazeData.level++;

                if (state.gazeData.level === 2) {
                    state.gazeData.width = 2; // User wants 2x3
                    state.gazeData.height = 3;

                    // Enforce clamp
                    if (state.gazeData.gridX + state.gazeData.width > GRID_COLS) {
                        state.gazeData.gridX = Math.max(0, GRID_COLS - state.gazeData.width);
                    }
                    if (state.gazeData.gridY + state.gazeData.height > GRID_ROWS) {
                        state.gazeData.gridY = Math.max(0, GRID_ROWS - state.gazeData.height);
                    }

                    if (DOM.gazeRotate) DOM.gazeRotate.classList.remove('hidden');
                    shopUpgradeBtn.querySelector('.name').textContent = '凝视Lv.3';
                    shopUpgradeBtn.querySelector('.price').textContent = '50';
                    showToast('凝视升级到等级2！(2x3)', 'success');

                } else if (state.gazeData.level === 3) {
                    state.gazeData.width = 3;
                    state.gazeData.height = 3;

                    // Enforce clamp
                    if (state.gazeData.gridX + state.gazeData.width > GRID_COLS) {
                        state.gazeData.gridX = Math.max(0, GRID_COLS - state.gazeData.width);
                    }
                    if (state.gazeData.gridY + state.gazeData.height > GRID_ROWS) {
                        state.gazeData.gridY = Math.max(0, GRID_ROWS - state.gazeData.height);
                    }

                    shopUpgradeBtn.querySelector('.name').textContent = '凝视Lv.Max';
                    shopUpgradeBtn.querySelector('.price').textContent = '250';
                    if (DOM.gazeRotate) DOM.gazeRotate.classList.add('hidden'); // 3x3 doesn't rotate
                    showToast('凝视升至等级3！(3x3)', 'success');
                } else if (state.gazeData.level === 4) {
                    state.gazeData.width = 4;
                    state.gazeData.height = 3;

                    // Enforce clamp
                    if (state.gazeData.gridX + state.gazeData.width > GRID_COLS) {
                        state.gazeData.gridX = Math.max(0, GRID_COLS - state.gazeData.width);
                    }
                    if (state.gazeData.gridY + state.gazeData.height > GRID_ROWS) {
                        state.gazeData.gridY = Math.max(0, GRID_ROWS - state.gazeData.height);
                    }

                    shopUpgradeBtn.classList.add('hidden');
                    showToast('凝视升至满级！(4x3)', 'success');
                }

                updateGazeVisuals();
                updateBuildingActiveStates();
                updateShopUI();
            } else {
                showToast('金币不足升级凝视！', 'error');
            }
        });
    }
}

function updateShopUI() {
    // Update the global gold display in top bar
    if (DOM.goldDisplay) {
        DOM.goldDisplay.textContent = state.gold;
    }
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
    state.gold = 50;

    // Reset visuals
    updateWallHP();
    updateShopUI();
    renderEntities(); // clear dom

    // Rebuild grid base
    createGrid();
}

function placeBuilding(index, buildingData) {
    state.grid[index] = buildingData;
    renderCell(index);
    updateBuildingActiveStates();
}

function renderCell(index) {
    const cell = DOM.grid.children[index];
    cell.innerHTML = '';

    const data = state.grid[index];
    if (data) {
        const isGazed = isCellInGaze(index);
        let infoBadgeHtml = `<div class="info-badge level-badge">${data.level}</div>`;

        // If it's a spawner, we want to show capacity
        // For now, only angels, titans, and dragons have caps
        if (['angel', 'titan', 'dragon'].includes(data.type)) {
            if (!data.id) {
                // Guarantee a unique ID is permanently bound to this data object if missing
                data.id = 'b_' + Math.random().toString(36).substr(2, 9);
            }
            const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === data.id).length;
            infoBadgeHtml += `<div class="info-badge cap-badge">${currentUnits}/${data.level}</div>`;
        }

        cell.innerHTML = `
            <div class="building ${data.buffed ? 'buffed' : ''} ${isGazed ? '' : 'inactive'}" data-type="${data.type}" data-level="${data.level}" data-index="${index}">
                <span class="icon">${BUILDING_TYPES[data.type].icon}</span>
                ${infoBadgeHtml}
            </div>
            <div class="cd-bar-container"><div class="cd-bar-fill"></div></div>
        `;
    }
}

// --- Drag and Drop Logic (Pointer Events for mouse & touch) ---

function setupDragEvents() {
    // We attach listeners to the container to handle events bubble
    DOM.grid.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    // Prevent default touch behaviors like scrolling while dragging
    DOM.grid.addEventListener('touchstart', e => {
        if (e.target.closest('.building')) e.preventDefault();
    }, { passive: false });
}

function handlePointerDown(e) {
    const buildingEl = e.target.closest('.building');
    if (!buildingEl) return;

    const cellEl = buildingEl.closest('.cell');
    const index = parseInt(cellEl.dataset.index);

    // Setup drag state
    state.dragData.active = true;
    state.dragData.element = buildingEl;
    state.dragData.startIndex = index;
    state.dragData.buildingData = state.grid[index];

    // Calc offset for visual ghost using client rect
    const rect = buildingEl.getBoundingClientRect();
    // Since we'll position ghost based on top/left, offsetX/Y is pointer distance from top-left of the building
    state.dragData.offsetX = e.clientX - rect.left;
    state.dragData.offsetY = e.clientY - rect.top;

    // Visuals
    buildingEl.classList.add('dragging');
    DOM.ghost.className = 'drag-ghost building';
    if (buildingEl.classList.contains('inactive')) DOM.ghost.classList.add('inactive');

    if (state.dragData.buildingData.buffed) {
        DOM.ghost.classList.add('buffed');
    }

    DOM.ghost.dataset.type = state.dragData.buildingData.type;
    DOM.ghost.innerHTML = buildingEl.innerHTML;
    // Set fixed width/height so it matches exactly
    DOM.ghost.style.width = `${rect.width}px`;
    DOM.ghost.style.height = `${rect.height}px`;

    updateGhostPosition(e.clientX, e.clientY);
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
        if (targetCell && targetCell.dataset.index != state.dragData.startIndex) {
            targetCell.classList.add('drag-over');
        }
    }
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

    const { startIndex, buildingData, element } = state.dragData;

    if (targetIndex !== -1 && targetIndex !== startIndex) {
        const targetData = state.grid[targetIndex];

        if (!targetData) {
            // Move to empty cell
            state.grid[startIndex] = null;
            state.grid[targetIndex] = buildingData;
            renderCell(startIndex);
            renderCell(targetIndex);
        } else if (targetData.type === buildingData.type && targetData.level === buildingData.level) {
            // Merge
            state.grid[startIndex] = null;
            state.grid[targetIndex] = {
                id: targetData.id, // Retain ID of target so existing spawned troops aren't orphaned
                type: buildingData.type,
                level: buildingData.level + 1,
                buffed: false,
                timer: 0
            };
            renderCell(startIndex);
            renderCell(targetIndex);
            updateBuildingActiveStates();

            // Optional: play merge animation on the target cell
            const newBuilding = DOM.grid.children[targetIndex].querySelector('.building');
            newBuilding.style.transform = 'scale(1.2)';
            setTimeout(() => newBuilding.style.transform = '', 150);
        } else {
            // Swap if different types/levels
            state.grid[startIndex] = targetData;
            state.grid[targetIndex] = buildingData;
            renderCell(startIndex);
            renderCell(targetIndex);
            updateBuildingActiveStates();
        }
    } else {
        // Snap back
        element.classList.remove('dragging');
    }

    // Reset
    state.dragData.active = false;
    DOM.ghost.className = 'drag-ghost hidden';

    // Safety re-render to clear states
    if (state.grid[startIndex]) renderCell(startIndex);
    if (targetIndex !== -1 && state.grid[targetIndex]) renderCell(targetIndex);

    // Crucial: since we re-rendered the building, it lost its .inactive class.
    // We must re-eval it so it doesn't appear "highlighted".
    updateBuildingActiveStates();
}

// --- Phase 2: Game Loop & Combat Logic ---

function gameLoop(currentTime) {
    if (!state.battle.lastTime) state.battle.lastTime = currentTime;
    const dt = currentTime - state.battle.lastTime;
    state.battle.lastTime = currentTime;

    // Optional: Pause game while dragging to prevent bugs, or keep it running. Let's keep it running.
    updateGazeVisuals(); // Constant layout alignment
    updateCombat(dt);
    renderEntities();

    requestAnimationFrame(gameLoop);
}

function updateCombat(dt) {
    if (state.battle.wallHP <= 0) {
        restartGame();
        return; // Game Over handled
    }

    // 0. Phase Logic
    const activeEnemies = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);

    if (state.battle.phase === 'day') {
        const deadThisDay = state.battle.enemiesSpawnedThisDay - activeEnemies.length;
        const progress = Math.min(Math.max(deadThisDay, 0) / 20, 1);
        DOM.phaseBarFill.style.width = `${progress * 100}%`;

        if (state.battle.enemiesSpawnedThisDay >= 20 && activeEnemies.length === 0) {
            // Day over, start night
            state.battle.phase = 'night';
            state.battle.nightTimer = 0;
            DOM.phaseText.textContent = `🌙 第 ${state.battle.dayCounter}天`;
            DOM.phaseBarFill.classList.remove('day');
            DOM.phaseBarFill.style.width = '0%';
            DOM.battleArea.classList.add('night');
            DOM.managementArea.classList.add('night');
        }
    } else if (state.battle.phase === 'night') {
        state.battle.nightTimer += dt;
        const progress = Math.min(state.battle.nightTimer / 10000, 1);
        DOM.phaseBarFill.style.width = `${progress * 100}%`;

        if (state.battle.nightTimer >= 10000) {
            // Night over, start next day
            state.gold += 10;
            updateShopUI();

            state.battle.phase = 'day';
            state.battle.dayCounter++;
            state.battle.enemiesSpawnedThisDay = 0;
            DOM.phaseText.textContent = `☀️ 第 ${state.battle.dayCounter}天`;
            DOM.phaseBarFill.classList.add('day');
            DOM.phaseBarFill.style.width = '0%';
            DOM.battleArea.classList.remove('night');
            DOM.managementArea.classList.remove('night');
            showToast(`第 ${state.battle.dayCounter} 天开始！敌人变强了！`, "error");
        }
    }

    // 1. Spawner (Spawn denser: 2 enemies per tick, reduce CD)
    if (state.battle.phase === 'day' && state.battle.enemiesSpawnedThisDay < 20) {
        state.battle.enemySpawnTimer += dt;
        if (state.battle.enemySpawnTimer >= ENEMY_SPAWN_CD / 2) {
            state.battle.enemySpawnTimer -= ENEMY_SPAWN_CD / 2;
            spawnEnemy();
            state.battle.enemiesSpawnedThisDay--; // counteract the double spawn correctly
            if (state.battle.enemiesSpawnedThisDay < 20) {
                spawnEnemy();
            }
        }
    }

    // 2. Building Tick
    state.grid.forEach((b, idx) => {
        if (!b) return;

        const isGazed = isCellInGaze(idx);
        const speedMult = isGazed ? 1 : 0.25;

        let isAtCapacity = false;
        let currentUnits = 0;

        // Check cap dynamically
        if (['angel', 'titan', 'dragon'].includes(b.type)) {
            currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
            if (currentUnits >= b.level) {
                isAtCapacity = true;
            }
        }

        // Fireball needs targets to charge/shoot
        if (b.type === 'fireball') {
            const activeEnems = state.battle.entities.filter(e => e.type === 'enemy' && e.hp > 0);
            if (activeEnems.length === 0) {
                isAtCapacity = true;
            }
        }

        if (b.timer === undefined) b.timer = 0;

        // Only grow CD if not at capacity
        if (!isAtCapacity) {
            b.timer += dt * speedMult;
        } else {
            // Keep timer at 0 or wherever it was, but reset to 0 if we want it to visually look "resting"
            b.timer = 0;
        }

        // Update CD bars visually
        const cell = DOM.grid.children[idx];
        const bar = cell.querySelector('.cd-bar-fill');
        if (bar) {
            const progress = Math.min(b.timer / BUILDING_CD_MAX, 1);
            bar.style.width = `${progress * 100}%`;

            if (isGazed) {
                bar.classList.add('gold');
            } else {
                bar.classList.remove('gold');
            }
        }

        // Dynamically update cap badges if spawner
        if (['angel', 'titan', 'dragon'].includes(b.type)) {
            const badge = cell.querySelector('.cap-badge');
            if (badge) {
                badge.textContent = `${currentUnits}/${b.level}`;
            }
        }

        if (!isAtCapacity && b.timer >= BUILDING_CD_MAX) {
            b.timer -= BUILDING_CD_MAX;
            triggerBuilding(b, idx);
        }
    });

    // 3. Move Entities
    const wallY = DOM.battleArea.getBoundingClientRect().height;

    for (let i = state.battle.entities.length - 1; i >= 0; i--) {
        let ent = state.battle.entities[i];

        if (ent.type === 'enemy') {
            ent.y += ent.speed * (dt / 1000);
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

                let nx = dx / dist + sepX * 1.5;
                let ny = dy / dist + sepY * 1.5;
                const nmag = Math.hypot(nx, ny) || 1;
                nx /= nmag; ny /= nmag;

                if (dist > 5) {
                    const moveDist = ent.speed * (dt / 1000);
                    ent.x += nx * moveDist;
                    ent.y += ny * moveDist;
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

                    let nx = dx / dist + sepX * 1.5;
                    let ny = dy / dist + sepY * 1.5;
                    const nmag = Math.hypot(nx, ny) || 1;
                    nx /= nmag; ny /= nmag;

                    if (dist > 5) { // don't jitter if right on top
                        const moveDist = ent.speed * (dt / 1000);
                        ent.x += nx * moveDist;
                        ent.y += ny * moveDist;
                    }
                } else {
                    // No enemies, walk up towards the spawn point (top of battle area)
                    ent.y -= ent.speed * (dt / 1000);
                    ent.x += sepX * ent.speed * (dt / 1000);

                    // Idle at the top instead of dying
                    if (ent.y <= 10) ent.y = 10;
                    if (ent.x <= 10) ent.x = 10;
                    const wallX = DOM.battleArea.getBoundingClientRect().width;
                    if (ent.x >= wallX - 10) ent.x = wallX - 10;
                }
            }
        }
        else if (ent.type === 'projectile') {
            if (ent.target && ent.target.hp > 0) {
                // Homing missile logic
                const dx = ent.target.x - ent.x;
                const dy = ent.target.y - ent.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 10) {
                    // Hit!
                    ent.target.hp -= ent.damage;
                    ent.hp = 0; // kill projectile

                    if (ent.target.hp <= 0) {
                        // Economy rebalance: No gold per kill
                        // state.gold += 10;
                        // spawnFloatingText('+10💰', ent.target.x, ent.target.y, '#facc15');
                        // updateShopUI();
                    }
                } else {
                    const moveDist = ent.speed * (dt / 1000);
                    ent.x += (dx / dist) * moveDist;
                    ent.y += (dy / dist) * moveDist;
                }
            } else {
                ent.y -= ent.speed * (dt / 1000); // go straight if target lost
                if (ent.y <= 0) ent.hp = 0;
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
            damage: 10 + bonusStat,
            speed: 30
        });
    }
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

    if (b.type === 'mine') {
        const spawnX = rect.left + rect.width / 2 - containerRect.left;
        const spawnY = rect.top - containerRect.top;
        const income = b.level; // per instructions: 1 gold base, +1 per level
        state.gold += income;
        updateShopUI();
        spawnFloatingText(`+${income}💰`, spawnX, spawnY - 20, '#facc15');
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
                hp: 100 * b.level,
                damage: 50 * b.level,
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
                hp: 40 * b.level,
                damage: 25 * b.level,
                speed: 100
            });
        }
    }
    else if (b.type === 'angel' || b.type === 'fireball') {
        const spawnX = (rect.left + rect.width / 2) - containerRect.left;
        const spawnY = (rect.top + rect.height / 2) - containerRect.top;

        if (b.type === 'angel') {
            // Check unit cap
            const currentUnits = state.battle.entities.filter(e => e.type === 'ally' && e.origin === b.id).length;
            if (currentUnits < b.level) {
                state.battle.entities.push({
                    id: 'a_' + Math.random().toString(36).substr(2, 9),
                    origin: b.id, // For cap checking later
                    type: 'ally',
                    x: spawnX,
                    y: spawnY,
                    radius: 12,
                    hp: 20 * b.level,
                    damage: 15 * b.level,
                    speed: 80
                });
            }
        }
        else if (b.type === 'fireball') {
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
                    damage: 20 * b.level,
                    speed: 300,
                    target: target
                });
            }
        }
    }
}

function updateWallHP() {
    const pct = (state.battle.wallHP / WALL_MAX_HP) * 100 || 0;
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

// Start
init();
