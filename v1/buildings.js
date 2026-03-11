// Buildings module for town structures along the S-road
// 提供城镇主路上的建筑与分支建筑数据，依赖 GamePath.posAtT 计算坐标

const Buildings = (() => {
    const { posAtT } = GamePath;

    // Path: Gate B → [0]制药所 → [1]兵营 → [2]武器铺 → [3]护甲铺 → [4]增益铺 → Gate A
    // Evenly distributed along path, sides alternating to fit inside curves
    const BLDS = [
        { t: 0.12, icon: '💊', label: '制药所', id: 'hospital', side: 1 },
        { t: 0.28, icon: '🏰', label: '兵营', id: 'barracks_bld', side: -1 },
        { t: 0.46, icon: '⚔️', label: '武器铺', id: 'weapon', side: 1, equip: { icon: '⚔️', stat: 'atk', bonus: 0.2 } },
        { t: 0.64, icon: '🛡️', label: '护甲铺', id: 'armor', side: -1, equip: { icon: '🛡️', stat: 'def', bonus: 0.3 } },
        { t: 0.82, icon: '✨', label: '增益铺', id: 'buff', side: 1 },
    ];

    const BARRACKS_BLD_IDX = 1; // [1]=兵营: new heroes spawn here, skip hospital

    BLDS.forEach(b => {
        const p = posAtT(b.t), p2 = posAtT(b.t + 0.005);
        const dx = p2.x - p.x, dy = p2.y - p.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len, off = 0.04 * b.side;
        b.rx = p.x + nx * off; b.ry = p.y + ny * off;
        b.entryT = b.t - 0.006; b.exitT = b.t + 0.006;
        const pe = posAtT(b.entryT), px = posAtT(b.exitT);
        b.entryRx = pe.x; b.entryRy = pe.y; b.exitRx = px.x; b.exitRy = px.y;
        b.cpInX = (b.entryRx + b.rx) / 2 + nx * off * 0.5;
        b.cpInY = (b.entryRy + b.ry) / 2 + ny * off * 0.5;
        b.cpOutX = (b.rx + b.exitRx) / 2 + nx * off * 0.5;
        b.cpOutY = (b.ry + b.exitRy) / 2 + ny * off * 0.5;
    });

    const GATE_B = { rx: 0.78, ry: 0.33 }; // entry from battle (low HP heroes)
    const GATE_A = { rx: 0.22, ry: 0.33 }; // exit to battle
    // 大本营: visual only, bottom-center, connects to main road but heroes don't enter
    const BARRACKS = { rx: 0.50, ry: 0.75, icon: '⛺', label: '大本营' };

    // Resource side-buildings (each sends particles to its parent path building)
    const BRANCHES = [];
    (function initBranches() {
        [
            { parentIdx: 0, icon: '🌿', label: '药田', ox: 0.12, oy: 0.00 },  // 药田 → 制药所
            { parentIdx: 2, icon: '🏭', label: '炼钢厂', ox: 0.12, oy: 0.00 },  // 炼钢厂 → 武器铺
            { parentIdx: 3, icon: '⚗️', label: '精炼厂', ox: -0.10, oy: 0.05 },  // 精炼厂 → 护甲铺
            { parentIdx: 4, icon: '🔮', label: '晶石矿场', ox: 0.10, oy: -0.05 }, // 晶石矿场 → 增益铺
            { parentIdx: 0, icon: '🐾', label: '百兽园', ox: -0.12, oy: 0.01 }, // 百兽园
        ].forEach(d => {
            const par = BLDS[d.parentIdx];
            // Place branch at direct (ox, oy) offset from the main building
            BRANCHES.push({
                rx: par.rx + d.ox,
                ry: par.ry + d.oy,
                icon: d.icon, label: d.label, parentIdx: d.parentIdx,
            });
        });
    })();

    return {
        BLDS,
        BRANCHES,
        BARRACKS,
        BARRACKS_BLD_IDX,
        GATE_A,
        GATE_B,
    };
})();

