// ============================================================
// HERO IDLE - Mercenary Town  (S-Road, Polished)
// ============================================================
const $ = id => document.getElementById(id);

const HTYPES = {
    swordsman: { icon: '⚔️', hp: 100, atk: 12, spd: 1.2, range: 30 },
    archer: { icon: '🏹', hp: 70, atk: 15, spd: 1.0, range: 100 },
    pikeman: { icon: '🔱', hp: 120, atk: 10, spd: 1.0, range: 35 },
    griffin: { icon: '🦅', hp: 150, atk: 18, spd: 1.5, range: 30 },
    monk: { icon: '🙏', hp: 80, atk: 14, spd: 0.8, range: 80 },
    cavalry: { icon: '🐴', hp: 180, atk: 20, spd: 1.8, range: 30 },
    mage: { icon: '🧙', hp: 60, atk: 30, spd: 0.7, range: 120 },
    dragon: { icon: '🐉', hp: 250, atk: 35, spd: 1.0, range: 60 },
    angel: { icon: '👼', hp: 300, atk: 40, spd: 1.3, range: 30 },
    titan: { icon: '🗿', hp: 500, atk: 50, spd: 0.6, range: 35 },
};

// ---- S-ROAD CURVE ----
const CURVE_PTS = [
    { x: 0.78, y: 0.33 },
    { x: 0.82, y: 0.38 }, { x: 0.82, y: 0.42 },
    { x: 0.72, y: 0.47 }, { x: 0.50, y: 0.49 }, { x: 0.28, y: 0.47 }, { x: 0.18, y: 0.50 },
    { x: 0.15, y: 0.55 }, { x: 0.18, y: 0.60 },
    { x: 0.28, y: 0.63 }, { x: 0.50, y: 0.65 }, { x: 0.72, y: 0.63 }, { x: 0.82, y: 0.66 },
    { x: 0.85, y: 0.71 }, { x: 0.82, y: 0.76 },
    { x: 0.72, y: 0.80 }, { x: 0.50, y: 0.84 }, { x: 0.28, y: 0.80 }, { x: 0.15, y: 0.82 },
    { x: 0.06, y: 0.75 }, { x: 0.06, y: 0.60 }, { x: 0.06, y: 0.45 }, { x: 0.06, y: 0.38 },
    { x: 0.12, y: 0.33 }, { x: 0.22, y: 0.33 },
];

let smoothPath = [];
function buildSmoothPath() {
    let pts = CURVE_PTS.map(p => ({ x: p.x, y: p.y }));
    for (let iter = 0; iter < 3; iter++) {
        const next = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
            next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
        }
        next.push(pts[pts.length - 1]);
        pts = next;
    }
    smoothPath = pts;
    let total = 0; smoothPath[0].d = 0;
    for (let i = 1; i < smoothPath.length; i++) {
        total += Math.hypot(smoothPath[i].x - smoothPath[i - 1].x, smoothPath[i].y - smoothPath[i - 1].y);
        smoothPath[i].d = total;
    }
    smoothPath.totalLen = total;
}
buildSmoothPath();

function posAtT(t) {
    const targetD = t * smoothPath.totalLen;
    for (let i = 1; i < smoothPath.length; i++) {
        if (smoothPath[i].d >= targetD) {
            const a = smoothPath[i - 1], b = smoothPath[i], seg = b.d - a.d;
            const l = seg > 0 ? (targetD - a.d) / seg : 0;
            return { x: a.x + (b.x - a.x) * l, y: a.y + (b.y - a.y) * l };
        }
    }
    return { x: smoothPath.at(-1).x, y: smoothPath.at(-1).y };
}

// ---- BUILDINGS ----
// Path: Gate B → [0]制药所 → [1]兵营 → [2]武器铺 → [3]护甲铺 → [4]增益铺 → Gate A
// Evenly distributed along path, sides alternating to fit inside curves
const BLDS = [
    { t: 0.12, icon: '💊', label: '制药所', id: 'hospital', side: 1 },
    { t: 0.28, icon: '🏰', label: '兵营', id: 'barracks_bld', side: -1 },
    { t: 0.46, icon: '⚔️', label: '武器铺', id: 'weapon', side: 1, equip: { icon: '⚔️', stat: 'atk', bonus: 0.2 } },
    { t: 0.64, icon: '🛡️', label: '护甲铺', id: 'armor', side: -1, equip: { icon: '🛡️', stat: 'def', bonus: 0.3 } },
    { t: 0.82, icon: '✨', label: '增益铺', id: 'buff', side: 1, equip: { icon: '✨', stat: 'spd', bonus: 0.25 } },
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
        { parentIdx: 2, icon: '🏭', label: '练钔厂', ox: 0.12, oy: 0.00 },  // 练钔厂 → 武器铺
        { parentIdx: 3, icon: '🐄', label: '皮革厂', ox: -0.10, oy: 0.05 },  // 皮革厂 → 护甲铺
        { parentIdx: 4, icon: '⛪', label: '祕告室', ox: 0.10, oy: -0.05 }, // 祕告室 → 增益铺
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

// ---- CONSTANTS ----
const MAX_H = 10, SPAWN_CD = 500, HEAL_DUR = 5000, LOW_HP = 0.1;
const WALK_SPD = 0.06, SIDE_SPD = 0.9;
const BY_MIN = 0.04, BY_MAX = 0.24;

// ---- GAME STATE ----
const G = {
    gold: 0, gems: 10, level: 1,
    heroes: [], spawnTimer: 0, pTimer: 0,
    enemies: [], particles: [], lastTime: 0,
    mode: 'city',
    chHeroes: [], chEnemies: [],
    chCount: 0,
    skills: {
        meteor: { cd: 10000, timer: 0, icon: '☄️', label: '陨石术' },
        heal: { cd: 15000, timer: 0, icon: '✨', label: '神圣治疗' },
        warcry: { cd: 20000, timer: 0, icon: '📣', label: '嗜血狂暴', active: 0 }
    },
    fx: [],
    deployment: [
        { type: 'swordsman', icon: '⚔️' }, { type: 'archer', icon: '🏹' },
        { type: 'pikeman', icon: '🔱' }, { type: 'griffin', icon: '🦅' },
        { type: 'monk', icon: '🙏' }, { type: 'cavalry', icon: '🐴' },
        { type: 'mage', icon: '🧙' }, { type: 'dragon', icon: '🐉' },
        { type: 'swordsman', icon: '⚔️' }, { type: 'archer', icon: '🏹' },
    ],
    queue: [],
};
G.queue = G.deployment.map(d => d.type);

// ---- HERO ----
function mkHero(type) {
    const t = HTYPES[type];
    // New heroes spawn at the 兵营 building position on the path
    const barPos = BLDS[BARRACKS_BLD_IDX];
    return {
        type, icon: t.icon, maxHp: t.hp,
        hp: t.hp, atk: t.atk, spd: t.spd, range: t.range,
        baseAtk: t.atk, baseSpd: t.spd,
        // Start walking from barracks (skip hospital - full HP on spawn)
        state: 'walking', pathT: BLDS[BARRACKS_BLD_IDX].exitT,
        nextBldIdx: BARRACKS_BLD_IDX + 1,
        sideProgress: 0, currentBld: null,
        equips: [], healTimer: 0, atkTimer: 0,
        rx: barPos.rx, ry: barPos.ry,
        off: Math.random() * Math.PI * 2,
    };
}

// ---- UPDATES ----
function updateSpawn(dt) {
    // Heroes never die; only spawn initial queue up to MAX_H
    if (G.heroes.length >= MAX_H) return;
    if (!G.queue.length) return;
    G.spawnTimer += dt;
    if (G.spawnTimer >= SPAWN_CD) { G.spawnTimer -= SPAWN_CD; G.heroes.push(mkHero(G.queue.shift())); }
}

function updateHeroes(dt) {
    G.heroes.forEach(h => {
        const jx = Math.cos(h.off) * 0.006, jy = Math.sin(h.off) * 0.004;
        switch (h.state) {
            case 'toRoad': {
                const joinT = BLDS[0].exitT, p = posAtT(joinT);
                const dx = p.x - h.rx, dy = p.y - h.ry, d = Math.hypot(dx, dy);
                if (d < 0.01) { h.state = 'walking'; h.pathT = joinT; h.nextBldIdx = 1; }
                else { const s = 0.15 * dt / 1000; h.rx += dx / d * s; h.ry += dy / d * s; }
                break;
            }
            case 'walking': {
                if (h.nextBldIdx < BLDS.length && h.pathT >= BLDS[h.nextBldIdx].entryT) {
                    h.state = 'sideIn'; h.sideProgress = 0; h.currentBld = BLDS[h.nextBldIdx]; break;
                }
                h.pathT += WALK_SPD * dt / 1000;
                if (h.pathT >= 1) { h.pathT = 1; h.state = 'enterBattle'; }
                const p = posAtT(h.pathT); h.rx = p.x + jx; h.ry = p.y + jy;
                break;
            }
            case 'sideIn': {
                h.sideProgress += SIDE_SPD * dt / 1000;
                const b = h.currentBld, t = Math.min(1, h.sideProgress), u = 1 - t;
                h.rx = u * u * b.entryRx + 2 * u * t * b.cpInX + t * t * b.rx;
                h.ry = u * u * b.entryRy + 2 * u * t * b.cpInY + t * t * b.ry;
                if (h.sideProgress >= 1) {
                    if (b.id === 'hospital' && h.hp < h.maxHp * 0.99) { h.state = 'atBuilding'; h.healTimer = 0; }
                    else { h.state = 'sideOut'; h.sideProgress = 0; }
                }
                break;
            }
            case 'atBuilding': {
                h.healTimer += dt;
                h.hp = h.maxHp * (LOW_HP + (1 - LOW_HP) * Math.min(1, h.healTimer / HEAL_DUR));
                h.rx = h.currentBld.rx + jx; h.ry = h.currentBld.ry + jy;
                if (h.healTimer >= HEAL_DUR) { h.hp = h.maxHp; h.state = 'sideOut'; h.sideProgress = 0; }
                break;
            }
            case 'sideOut': {
                h.sideProgress += SIDE_SPD * dt / 1000;
                const b = h.currentBld, t = Math.min(1, h.sideProgress), u = 1 - t;
                h.rx = u * u * b.rx + 2 * u * t * b.cpOutX + t * t * b.exitRx;
                h.ry = u * u * b.ry + 2 * u * t * b.cpOutY + t * t * b.exitRy;
                if (h.sideProgress >= 1) {
                    if (h.currentBld.equip && !h.equips.find(e => e.icon === h.currentBld.equip.icon)) {
                        h.equips.push({ ...h.currentBld.equip });
                        if (h.currentBld.equip.stat === 'atk') h.atk = h.baseAtk * (1 + h.currentBld.equip.bonus);
                        if (h.currentBld.equip.stat === 'spd') h.spd = h.baseSpd * (1 + h.currentBld.equip.bonus);
                    }
                    h.state = 'walking'; h.pathT = h.currentBld.exitT; h.nextBldIdx++; h.currentBld = null;
                    // Skip barracks_bld when returning (retreating heroes already spawned there)
                    if (h.nextBldIdx < BLDS.length && BLDS[h.nextBldIdx].id === 'barracks_bld') {
                        h.nextBldIdx++;
                    }
                }

                break;
            }
            case 'enterBattle': {
                h.ry -= 0.12 * dt / 1000; h.rx += (GATE_A.rx - h.rx) * dt * 0.005;
                if (h.ry <= BY_MAX) {
                    h.state = 'fighting'; h.rx = 0.05 + Math.random() * 0.35;
                    h.ry = BY_MIN + Math.random() * (BY_MAX - BY_MIN); h.atkTimer = 0;
                }
                break;
            }
            case 'fighting': break;
            case 'retreating': {
                // Low-HP hero retreats toward Gate B to re-enter city
                h.ry += 0.12 * dt / 1000; h.rx += (GATE_B.rx - h.rx) * dt * 0.004;
                if (h.ry >= GATE_B.ry) {
                    // Enter path at t=0 (hospital first); HP stays low — hospital heals
                    h.state = 'walking'; h.pathT = 0; h.nextBldIdx = 0;
                    h.equips = []; h.atk = h.baseAtk; h.spd = h.baseSpd;
                    const p = posAtT(0); h.rx = p.x; h.ry = p.y;
                }
                break;
            }
        }
    });
}

function updateRes(dt) {
    G.pTimer += dt;
    if (G.pTimer >= 2500) {
        G.pTimer = 0;
        BRANCHES.forEach(b => {
            const p = BLDS[b.parentIdx];
            G.particles.push({ rx: b.rx, ry: b.ry, tx: p.rx, ty: p.ry, icon: b.icon, t: 0 });
        });
    }
    G.particles.forEach(p => { p.t += dt / 1200; });
    G.particles = G.particles.filter(p => p.t < 1);
}

function spawnWave() {
    const n = 3 + Math.floor(G.level * 0.5), hm = 1 + G.level * 0.3, am = 1 + G.level * 0.15;
    const defs = [{ icon: '💀', hp: 50, atk: 10 }, { icon: '👹', hp: 80, atk: 16 }, { icon: '🧟', hp: 60, atk: 12 }, { icon: '🦇', hp: 35, atk: 20 }];
    for (let i = 0; i < n; i++) {
        const d = defs[Math.floor(Math.random() * defs.length)];
        G.enemies.push({
            rx: 0.55 + Math.random() * 0.35, ry: BY_MIN + Math.random() * (BY_MAX - BY_MIN),
            hp: Math.floor(d.hp * hm), maxHp: Math.floor(d.hp * hm), atk: Math.floor(d.atk * am), icon: d.icon
        });
    }
    if (G.level % 3 === 0) {
        const bosses = [{ icon: '👿', hp: 400, atk: 25 }, { icon: '🐲', hp: 600, atk: 30 }, { icon: '💀', hp: 500, atk: 35 }];
        const b = bosses[Math.floor(Math.random() * bosses.length)];
        G.enemies.push({
            rx: 0.70 + Math.random() * 0.15, ry: BY_MIN + 0.02 + Math.random() * (BY_MAX - BY_MIN - 0.04),
            hp: Math.floor(b.hp * hm), maxHp: Math.floor(b.hp * hm), atk: Math.floor(b.atk * am), icon: b.icon, boss: true
        });
    }
}

function updateBattle(dt) {
    if (G.mode !== 'city') return;
    if (!G.enemies.length) spawnWave();
    G.heroes.filter(h => h.state === 'fighting').forEach(h => {
        const alive = G.enemies.filter(e => e.hp > 0); if (!alive.length) return;
        let cl = alive[0], md = Math.hypot(h.rx - cl.rx, h.ry - cl.ry);
        alive.forEach(e => { const d = Math.hypot(h.rx - e.rx, h.ry - e.ry); if (d < md) { cl = e; md = d; } });
        if (md > h.range / 800) {
            const d = Math.hypot(cl.rx - h.rx, cl.ry - h.ry);
            h.rx += (cl.rx - h.rx) / d * h.spd * 0.08 * dt / 1000;
            h.ry += (cl.ry - h.ry) / d * h.spd * 0.08 * dt / 1000;
        } else {
            h.atkTimer += dt;
            if (h.atkTimer >= 1000 / h.spd) { h.atkTimer = 0; cl.hp -= h.atk; h.hp -= cl.atk * 0.3; }
        }
        if (h.hp <= h.maxHp * LOW_HP) { h.hp = h.maxHp * LOW_HP; h.state = 'retreating'; G.queue.push(h.type); }
    });
    const k = G.enemies.filter(e => e.hp <= 0).length;
    if (k) G.gold += k * (5 + G.level * 2);
    G.enemies = G.enemies.filter(e => e.hp > 0);
}

function startChallenge() {
    G.mode = 'challenge'; G.chCount++;
    G.chHeroes = []; G.chEnemies = []; G.fx = [];
    Object.values(G.skills).forEach(s => s.timer = 0);
    const pool = ['swordsman', 'archer', 'pikeman', 'griffin', 'monk', 'cavalry', 'mage'];
    $('task-bar').classList.add('hidden');
    $('bottom-nav').classList.add('hidden');
    $('skill-bar').classList.remove('hidden');
    let hMult = 1, aMult = 1, eHMult = 1, eAMult = 1;
    if (G.chCount === 1) { hMult = 10; aMult = 5; eHMult = 0.5; }
    else if (G.chCount === 2) { hMult = 0.2; eAMult = 5; }
    else { eHMult = 1 + G.level * 0.5; eAMult = 1 + G.level * 0.2; }
    for (let i = 0; i < 15; i++) {
        const type = pool[Math.floor(Math.random() * pool.length)], t = HTYPES[type];
        G.chHeroes.push({
            icon: t.icon, hp: t.hp * hMult, maxHp: t.hp * hMult, atk: t.atk * aMult,
            spd: t.spd, range: t.range, baseAtk: t.atk * aMult, baseSpd: t.spd,
            rx: 0.1 + Math.random() * 0.8, ry: 0.8 + Math.random() * 0.15, atkTimer: 0,
            equips: [{ icon: '⚔️' }, { icon: '🛡️' }, { icon: '✨' }]
        });
    }
    G.chEnemies.push({
        icon: '🐲', hp: 1000 * eHMult, maxHp: 1000 * eHMult, atk: 40 * eAMult,
        range: 100, rx: 0.5, ry: 0.1, boss: true, atkTimer: 0
    });
    for (let i = 0; i < 12; i++) {
        G.chEnemies.push({
            icon: '💀', hp: 100 * eHMult, maxHp: 100 * eHMult, atk: 15 * eAMult,
            range: 40, rx: 0.1 + (i % 6) * 0.16, ry: 0.2 + Math.floor(i / 6) * 0.1, atkTimer: 0
        });
    }
    renderUI();
}

function updateChallenge(dt) {
    if (G.mode !== 'challenge') return;
    const hAlive = G.chHeroes.filter(h => h.hp > 0), eAlive = G.chEnemies.filter(e => e.hp > 0);
    Object.values(G.skills).forEach(s => {
        if (s.timer > 0) s.timer -= dt;
        if (s.active > 0) { s.active -= dt; if (s.active <= 0) G.chHeroes.forEach(h => { h.atk = h.baseAtk; h.spd = h.baseSpd; }); }
    });
    G.fx.forEach(f => { f.t += dt / f.dur; }); G.fx = G.fx.filter(f => f.t < 1);
    if (!hAlive.length) { endChallenge(false); return; }
    if (!eAlive.length) { endChallenge(true); return; }
    hAlive.forEach(h => {
        let cl = eAlive[0], md = Math.hypot(h.rx - cl.rx, h.ry - cl.ry);
        eAlive.forEach(e => { const d = Math.hypot(h.rx - e.rx, h.ry - e.ry); if (d < md) { cl = e; md = d; } });
        if (md > h.range / 800) { const d = Math.hypot(cl.rx - h.rx, cl.ry - h.ry); h.rx += (cl.rx - h.rx) / d * h.spd * 0.15 * dt / 1000; h.ry += (cl.ry - h.ry) / d * h.spd * 0.15 * dt / 1000; }
        else { h.atkTimer += dt; if (h.atkTimer >= 1000 / h.spd) { h.atkTimer = 0; cl.hp -= h.atk; } }
    });
    eAlive.forEach(e => {
        let cl = hAlive[0], md = Math.hypot(e.rx - cl.rx, e.ry - cl.ry);
        hAlive.forEach(h => { const d = Math.hypot(e.rx - h.rx, e.ry - h.ry); if (d < md) { cl = h; md = d; } });
        if (md > e.range / 800) { const d = Math.hypot(cl.rx - e.rx, cl.ry - e.ry); e.rx += (cl.rx - e.rx) / d * 0.05 * dt / 1000; e.ry += (cl.ry - e.ry) / d * 0.05 * dt / 1000; }
        else { e.atkTimer += dt; if (e.atkTimer >= 1000 / 1.5) { e.atkTimer = 0; cl.hp -= e.atk; } }
    });
}

function castSkill(id) {
    if (G.mode !== 'challenge') return;
    const s = G.skills[id]; if (s.timer > 0) return;
    s.timer = s.cd;
    if (id === 'meteor') {
        const tx = 0.5, ty = 0.2;
        G.chEnemies.forEach(e => { if (e.hp > 0 && Math.hypot(e.rx - tx, e.ry - ty) < 0.2) e.hp -= 200; });
        G.fx.push({ type: 'circle', rx: tx, ry: ty, r: 0.2, color: 'rgba(233,69,96,0.6)', dur: 800, t: 0 });
    } else if (id === 'heal') {
        G.chHeroes.forEach(h => { if (h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.5); });
        G.fx.push({ type: 'global', color: 'rgba(74,222,128,0.3)', dur: 1000, t: 0 });
    } else if (id === 'warcry') {
        s.active = 8000; G.chHeroes.forEach(h => { h.atk *= 1.5; h.spd *= 1.5; });
        G.fx.push({ type: 'global', color: 'rgba(246,201,67,0.3)', dur: 1000, t: 0 });
    }
    renderUI();
}

function endChallenge(win) {
    if (win) {
        const rew = 100 + G.level * 50; G.gold += rew; G.level++;
        $('reward-amount').textContent = '💰 ' + rew;
        $('modal-victory').classList.remove('hidden');
    } else { $('modal-defeat').classList.remove('hidden'); }
    G.mode = 'result';
    $('skill-bar').classList.add('hidden');
}

// ---- RENDER: CITY ----
function draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1520'); bg.addColorStop(1, '#141e2b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // City wall (城墙) — rounded rectangle around city zone
    // Adjusted height to wallH = 0.62*H to avoid overlapping bottom UI
    const wallX = 0.01 * W, wallY = 0.30 * H, wallW = 0.96 * W, wallH = 0.62 * H, wallR = 12;
    ctx.beginPath();
    ctx.moveTo(wallX + wallR, wallY);
    // Top edge: gap at Gate B (right side) and Gate A (left side)
    const gAX = GATE_A.rx * W, gBX = GATE_B.rx * W, gapW = 22;
    ctx.lineTo(gAX - gapW, wallY);   // left top → Gate A gap
    ctx.moveTo(gAX + gapW, wallY);
    ctx.lineTo(gBX - gapW, wallY);   // Gate A gap → Gate B gap
    ctx.moveTo(gBX + gapW, wallY);
    ctx.lineTo(wallX + wallW - wallR, wallY); // Gate B gap → right top
    ctx.quadraticCurveTo(wallX + wallW, wallY, wallX + wallW, wallY + wallR);
    ctx.lineTo(wallX + wallW, wallY + wallH - wallR);
    ctx.quadraticCurveTo(wallX + wallW, wallY + wallH, wallX + wallW - wallR, wallY + wallH);
    ctx.lineTo(wallX + wallR, wallY + wallH);
    ctx.quadraticCurveTo(wallX, wallY + wallH, wallX, wallY + wallH - wallR);
    ctx.lineTo(wallX, wallY + wallR);
    ctx.quadraticCurveTo(wallX, wallY, wallX + wallR, wallY);
    ctx.strokeStyle = 'rgba(150,130,80,0.55)'; ctx.lineWidth = 3; ctx.stroke();

    // Gate pillars
    [[gAX, wallY, '城门A'], [gBX, wallY, '城门B']].forEach(([gx, gy, lbl]) => {
        ctx.fillStyle = 'rgba(150,130,80,0.8)';
        ctx.fillRect(gx - gapW - 4, gy - 6, 6, 14);
        ctx.fillRect(gx + gapW - 2, gy - 6, 6, 14);
        ctx.font = '8px Inter,sans-serif'; ctx.fillStyle = 'rgba(250,230,160,0.7)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(lbl, gx, gy - 7);
    });


    // Road glow (S-curve)
    ctx.save();
    ctx.strokeStyle = 'rgba(74,222,128,0.08)'; ctx.lineWidth = 28; ctx.lineCap = 'round';

    ctx.beginPath();
    smoothPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x * W, p.y * H) : ctx.lineTo(p.x * W, p.y * H));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(74,222,128,0.18)'; ctx.lineWidth = 10;
    ctx.beginPath();
    smoothPath.forEach((p, i) => i === 0 ? ctx.moveTo(p.x * W, p.y * H) : ctx.lineTo(p.x * W, p.y * H));
    ctx.stroke();
    ctx.restore();

    // Side bezier paths to buildings
    BLDS.forEach(b => {
        ctx.strokeStyle = 'rgba(74,222,128,0.12)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.entryRx * W, b.entryRy * H);
        ctx.quadraticCurveTo(b.cpInX * W, b.cpInY * H, b.rx * W, b.ry * H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.rx * W, b.ry * H);
        ctx.quadraticCurveTo(b.cpOutX * W, b.cpOutY * H, b.exitRx * W, b.exitRy * H);
        ctx.stroke();
    });

    // Battle zone label
    ctx.font = '11px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('⚔️ 战斗区域', 6, 4);

    // Resource side-buildings: connecting lines then building icons
    BRANCHES.forEach(b => {
        const p = BLDS[b.parentIdx];
        ctx.strokeStyle = 'rgba(250,204,21,0.18)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(b.rx * W, b.ry * H); ctx.lineTo(p.rx * W, p.ry * H); ctx.stroke();
        ctx.setLineDash([]);
    });
    // Resource side-buildings (hexagons, same size as main buildings)
    BRANCHES.forEach((b, i) => {
        const x = b.rx * W, y = b.ry * H, r = 30; // same size as normal buildings
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
            const angle = Math.PI / 3 * j - Math.PI / 2; // Pointy top
            const hx = x + r * Math.cos(angle);
            const hy = y + r * Math.sin(angle);
            if (j === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(10,18,30,0.92)'; ctx.fill();
        ctx.strokeStyle = 'rgba(250,204,21,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = '27px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.icon, x, y);
        ctx.font = '9px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.fillText(b.label, x, y + r + 8);
    });

    // Buildings
    const now = performance.now();
    BLDS.forEach((b, i) => {
        const x = b.rx * W, y = b.ry * H;
        const pulse = 1 + 0.04 * Math.sin(now / 800 + i * 1.2), r = 30 * pulse;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,18,30,0.92)'; ctx.fill();
        const glow = b.equip ? 'rgba(74,222,128,0.55)' : b.id === 'hospital' ? 'rgba(248,113,113,0.5)' : b.id === 'barracks_bld' ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.15)';
        ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = '27px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.icon, x, y);
        ctx.font = '9px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText(b.label, x, y + r + 8);

        // Hospital: draw circular healing progress ring for heroes inside
        if (b.id === 'hospital') {
            G.heroes.filter(h => h.state === 'atBuilding' && h.currentBld && h.currentBld.id === 'hospital').forEach(h => {
                const pct = Math.min(1, h.healTimer / HEAL_DUR);
                ctx.beginPath();
                ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
                ctx.strokeStyle = 'rgba(248,113,113,0.85)'; ctx.lineWidth = 3; ctx.stroke();
            });
        }
    });

    // 大本营 (Army Camp) — bottom-center, NO connection line
    const bx = BARRACKS.rx * W, bby = BARRACKS.ry * H;
    ctx.beginPath(); ctx.arc(bx, bby, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,18,30,0.95)'; ctx.fill();
    ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(BARRACKS.icon, bx, bby);
    ctx.font = '9px Inter,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(BARRACKS.label, bx, bby + 36);

    // Resource particles
    G.particles.forEach(p => {
        const cx = (p.rx + (p.tx - p.rx) * p.t) * W, cy = (p.ry + (p.ty - p.ry) * p.t) * H;
        ctx.globalAlpha = 0.7 * (1 - p.t); ctx.font = '9px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(p.icon, cx, cy); ctx.globalAlpha = 1;
    });

    // Heroes
    G.heroes.forEach(h => {
        const x = h.rx * W, y = h.ry * H, pct = Math.max(0, h.hp / h.maxHp);
        if (h.equips.length) {
            const ew = h.equips.length * 14;
            h.equips.forEach((eq, i) => {
                const ex = x - ew / 2 + i * 14 + 7, ey = y - 36;
                ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
                ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(eq.icon, ex, ey);
            });
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 14, y - 22, 28, 4);
        ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#facc15' : '#f87171';
        ctx.fillRect(x - 14, y - 22, 28 * pct, 4);
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(h.icon, x, y - 4);
    });

    // Enemies
    G.enemies.forEach(e => {
        if (e.hp <= 0) return;
        const x = e.rx * W, y = e.ry * H, pct = e.hp / e.maxHp;
        const sz = e.boss ? 3 : 1, bw = 14 * sz, fs = 22 * sz;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - bw, y - 24 * sz, bw * 2, 4 * sz);
        ctx.fillStyle = e.boss ? '#ff6b6b' : '#f87171'; ctx.fillRect(x - bw, y - 24 * sz, bw * 2 * pct, 4 * sz);
        ctx.font = fs + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.icon, x, y - 4);
    });
}

// ---- RENDER: CHALLENGE ----
function drawChallenge(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
        ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * H / 10); ctx.lineTo(W, i * H / 10); ctx.stroke();
    }
    [...G.chHeroes, ...G.chEnemies].forEach(u => {
        if (u.hp <= 0) return;
        const x = u.rx * W, y = u.ry * H, pct = u.hp / u.maxHp, sz = u.boss ? 3 : 1.2;
        if (u.equips && u.equips.length) {
            const ew = u.equips.length * 10;
            u.equips.forEach((eq, i) => {
                const ex = x - ew / 2 + i * 10 + 5, ey = y - 28 * sz;
                ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();
                ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(eq.icon, ex, ey);
            });
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 12 * sz, y - 18 * sz, 24 * sz, 3 * sz);
        ctx.fillStyle = u.boss ? '#f6c943' : (G.chHeroes.includes(u) ? '#4ade80' : '#f87171');
        ctx.fillRect(x - 12 * sz, y - 18 * sz, 24 * sz * pct, 3 * sz);
        ctx.font = (20 * sz) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(u.icon, x, y);
    });
    G.fx.forEach(f => {
        ctx.globalAlpha = 1 - f.t;
        if (f.type === 'circle') { ctx.beginPath(); ctx.arc(f.rx * W, f.ry * H, f.r * W * (0.5 + f.t * 0.5), 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill(); }
        else if (f.type === 'global') { ctx.fillStyle = f.color; ctx.fillRect(0, 0, W, H); }
        ctx.globalAlpha = 1;
    });
}

function renderUI() {
    $('gold-display').textContent = G.gold; $('gem-display').textContent = G.gems;
    $('level-display').textContent = G.level;
    $('hero-count').textContent = G.heroes.filter(h => h.state === 'fighting').length;
    $('challenge-btn').classList.toggle('hidden', G.mode !== 'city');
    $('challenge-btn').textContent = `⚔️ 挑战 第${G.level}关`;
    Object.keys(G.skills).forEach(id => {
        const s = G.skills[id], el = $('skill-' + id); if (!el) return;
        const cdEl = el.querySelector('.skill-cooldown');
        if (cdEl) cdEl.style.height = (Math.max(0, s.timer / s.cd) * 100) + '%';
        el.classList.toggle('cd', s.timer > 0);
    });
}

function loop(ts) {
    if (!G.lastTime) G.lastTime = ts;
    let dt = ts - G.lastTime; G.lastTime = ts; if (dt > 100) dt = 100;
    const c = $('game-canvas'), r = c.parentElement.getBoundingClientRect();
    if (c.width !== Math.floor(r.width) || c.height !== Math.floor(r.height)) { c.width = Math.floor(r.width); c.height = Math.floor(r.height); }
    const ctx = c.getContext('2d');
    if (G.mode === 'city') {
        updateSpawn(dt); updateHeroes(dt); updateRes(dt); updateBattle(dt);
        draw(ctx, c.width, c.height);
    } else if (G.mode === 'challenge' || G.mode === 'result') {
        updateChallenge(dt); drawChallenge(ctx, c.width, c.height);
    }
    if (ts % 500 < dt) renderUI();
    requestAnimationFrame(loop);
}

// ---- DEPLOYMENT MODAL ----
let tempDeploy = [];
function openDeployModal() {
    tempDeploy = [...G.deployment];
    $('modal-deploy').classList.remove('hidden');
    renderDeployRoster();
}
function renderDeployRoster() {
    const activeBox = $('deploy-slots-active');
    activeBox.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const h = tempDeploy[i], div = document.createElement('div');
        div.className = 'slot'; div.textContent = h ? h.icon : '';
        activeBox.appendChild(div);
    }
    const rosterBox = $('hero-roster'); rosterBox.innerHTML = '';
    Object.keys(HTYPES).forEach(type => {
        const t = HTYPES[type], div = document.createElement('div');
        const isSelected = tempDeploy.some(d => d.type === type);
        div.className = `roster-item ${isSelected ? 'selected' : ''}`;
        div.textContent = t.icon;
        div.onclick = () => {
            const idx = tempDeploy.findIndex(d => d.type === type);
            if (idx >= 0) tempDeploy.splice(idx, 1);
            else if (tempDeploy.length < 10) tempDeploy.push({ type, icon: t.icon });
            renderDeployRoster();
        };
        rosterBox.appendChild(div);
    });
    $('deploy-count').textContent = tempDeploy.length;
}
$('deploy-confirm-btn').onclick = () => {
    G.deployment = [...tempDeploy];
    G.queue = G.deployment.map(d => d.type);
    $('modal-deploy').classList.add('hidden');
    const toast = document.createElement('div');
    toast.className = 'toast'; toast.textContent = '阵容已更新';
    document.body.appendChild(toast); setTimeout(() => toast.remove(), 2000);
    renderUI();
};
$('deploy-cancel-btn').onclick = () => $('modal-deploy').classList.add('hidden');

// ---- CANVAS CLICK ----
$('game-canvas').onmousedown = (e) => {
    if (G.mode !== 'city') return;
    const c = $('game-canvas'), r = c.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width, ry = (e.clientY - r.top) / r.height;
    // Click on 兵营 (barracks_bld) opens deploy
    const barracksBld = BLDS[BARRACKS_BLD_IDX];
    if (Math.hypot(rx - barracksBld.rx, ry - barracksBld.ry) < 0.08) openDeployModal();
};

// ---- TAB SWITCHING ----
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const page = btn.dataset.page;
        ['main', 'shop', 'summon', 'heroes', 'challenge'].forEach(p => {
            const el = $('page-' + p); if (el) el.classList.toggle('hidden', p !== page);
        });
    });
});

// ---- TASK SYSTEM ----
const TASKS = [
    { text: '通关第 1 关', reward: 50, icon: '⚔️' },
    { text: '拥有 100 金币', reward: 80, icon: '💰' },
    { text: '通关第 3 关', reward: 120, icon: '⚔️' },
    { text: '击败第一个 Boss', reward: 200, icon: '👿' },
    { text: '通关第 5 关', reward: 150, icon: '⚔️' },
    { text: '拥有 500 金币', reward: 250, icon: '💰' },
    { text: '通关第 10 关', reward: 400, icon: '⚔️' },
    { text: '击败 3 个 Boss', reward: 500, icon: '👿' },
    { text: '通关第 15 关', reward: 600, icon: '⚔️' },
    { text: '拥有 2000 金币', reward: 800, icon: '💰' },
];
let taskIdx = 0, taskState = 'active';
function renderTask() {
    const bar = $('task-bar');
    if (taskIdx >= TASKS.length) { bar.innerHTML = '<div class="task-icon">✅</div><div class="task-text">所有任务已完成!</div>'; bar.className = 'task-bar'; return; }
    const t = TASKS[taskIdx];
    $('task-icon').textContent = t.icon;
    $('task-text').textContent = t.text;
    $('task-reward').textContent = '💰 ' + t.reward;
    if (taskState === 'active') { bar.className = 'task-bar'; $('task-btn').textContent = '进行中'; }
    else if (taskState === 'completed') { bar.className = 'task-bar completed'; $('task-btn').textContent = '领取'; }
}
$('task-bar').addEventListener('click', () => {
    if (taskIdx >= TASKS.length) return;
    if (taskState === 'active') { taskState = 'completed'; renderTask(); }
    else if (taskState === 'completed') { G.gold += TASKS[taskIdx].reward; renderUI(); taskIdx++; taskState = 'active'; renderTask(); }
});
renderTask();

$('challenge-btn').onclick = startChallenge;

document.querySelectorAll('.skill-item').forEach(el => {
    el.onclick = () => castSkill(el.dataset.skill);
});
window.addEventListener('keydown', e => {
    if (G.mode !== 'challenge') return;
    if (e.key === '1') castSkill('meteor');
    if (e.key === '2') castSkill('heal');
    if (e.key === '3') castSkill('warcry');
});

$('next-challenge-btn').onclick = () => { $('modal-victory').classList.add('hidden'); startChallenge(); };
$('vic-back-to-city-btn').onclick = () => {
    $('modal-victory').classList.add('hidden'); G.mode = 'city';
    $('task-bar').classList.remove('hidden'); $('bottom-nav').classList.remove('hidden');
};
$('def-back-to-city-btn').onclick = () => {
    $('modal-defeat').classList.add('hidden'); G.mode = 'city';
    $('task-bar').classList.remove('hidden'); $('bottom-nav').classList.remove('hidden');
};

renderUI();
requestAnimationFrame(loop);
