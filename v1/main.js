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

// ---- S-ROAD CURVE & BUILDINGS (from modules) ----
// 路径与建筑数据从独立模块注入，方便后续复用与重构
const { CURVE_PTS, smoothPath, buildSmoothPath, posAtT } = GamePath;
const { BLDS, BRANCHES, BARRACKS, BARRACKS_BLD_IDX, GATE_A, GATE_B } = Buildings;

// ---- CONSTANTS ----
const MAX_H = 10, SPAWN_CD = 500, HEAL_DUR = 5000, LOW_HP = 0.1;
const WALK_SPD = 0.06, SIDE_SPD = 0.9;
const BY_MIN = 0.04, BY_MAX = 0.24;

// ---- GAME STATE ----
const G = {
    // 初始给一点测试用金币
    gold: 100, gems: 10, level: 1,
    heroes: [], spawnTimer: 0, pTimer: 0,
    enemies: [], particles: [], lastTime: 0,
    mode: 'city',
    chHeroes: [], chEnemies: [],
    chCount: 1,
    mana: 10,
    maxMana: 10,
    manaRecoverTimer: 0,
    fx: [],
    deployment: [
        { type: 'swordsman', icon: '⚔️' }, { type: 'archer', icon: '🏹' },
        { type: 'pikeman', icon: '🔱' }, { type: 'griffin', icon: '🦅' },
        { type: 'monk', icon: '🙏' }, { type: 'cavalry', icon: '🐴' },
        { type: 'mage', icon: '🧙' }, { type: 'dragon', icon: '🐉' },
        { type: 'swordsman', icon: '⚔️' }, { type: 'archer', icon: '🏹' },
    ],
    queue: [],
    // 配方栏 - 只存放解锁的配方（来自 BOSS 挑战）
    // 现在每条配方会带一个 role 字段，表示适用职业
    // 为方便体验，4 个职业一开始各自有一把默认武器配方
    recipes: [
        { name: '新手铁剑', lv: 1, baseAtk: 5, baseHp: 10, icon: '🗡️', q: 0, role: 'warrior' },
        { name: '新手长弓', lv: 1, baseAtk: 5, baseHp: 8,  icon: '🏹', q: 0, role: 'archer' },
        { name: '新手法杖', lv: 1, baseAtk: 7, baseHp: 6,  icon: '🪄', q: 0, role: 'mage' },
        { name: '新手长枪', lv: 1, baseAtk: 6, baseHp: 12, icon: '🔱', q: 0, role: 'knight' },
    ],
    // 当前激活的模具 - 单独存储，不在配方栏显示
    mold: {
        name: '新手木棍',
        lv: 1,
        atk: 5,
        hp: 10,
        subs: [],
        q: 0,
        icon: '🦯',
        prof: 0,
        role: 'warrior'
    },
    recipesUnlocked: [1],
    activeRecipeIdx: 0,  // 当前选中的配方索引（用于铸造）
    // 地图材料：key 为地图等级，value 为数量。方便测试，初始给 100 份 1 级材料
    materials: { 1: 100 }, // lv: amount
    pets: [],
    deployedPetIdxs: [], // up to 3 pets
    activeSummonCity: null,
    activeSummonChallenge: null,
    captureProb: 0,
    isCaptureFinished: false,
    ori: 0,
    steelMillLv: 1,
    refineTimer: 0,
    bestiaryLv: 1,
    captureTarget: 0,
    autoForge: {
        enabled: true,
        level: 1,
    },
    shopProf: 0,      // cumulative proficiency points for the weapon shop
    shopProfLv: 0,    // weapon shop proficiency level (each gives +5% main stats)
    expeditions: [],  // active expeditions: { heroes, level, endTime, reward }
    floatTexts: [],   // floating combat power change labels: { rx, ry, text, color, t, dur }
    crystals: 0,          // 增益晶石
    crystalMineLv: 1,     // 晶石矿场等级
    crystalMineTimer: 0,  // 晶石矿场生产计时
    buffAccAtk: 0,        // 增益铺累计攻击加成
    buffAccHp: 0,         // 增益铺累计生命加成
    slotUses: 0,          // 老虎机已使用次数
    killCount: 0,         // 当前地图击杀数
    killTarget: 10,       // 当前地图需要击杀的怪物数量才能解锁新关卡
    challengeListMode: 'challenge', // 打开关卡列表时的模式：'challenge' | 'expedition'
    // 护甲系统
    armors: {
        warrior: { name: '锁甲', icon: '🔗', lv: 1, enhanceLv: 0, tier: 0, def: 10, hp: 50 }, // 战士-锁甲
        archer: { name: '皮甲', icon: '🧥', lv: 1, enhanceLv: 0, tier: 0, def: 8, hp: 40 },   // 弓手-皮甲
        mage: { name: '布甲', icon: '👕', lv: 1, enhanceLv: 0, tier: 0, def: 5, hp: 30 },    // 法师-布甲
        knight: { name: '重甲', icon: '🛡️', lv: 1, enhanceLv: 0, tier: 0, def: 15, hp: 80 }, // 骑士-重甲
    },
    essence: 1000,        // 精华数量（由精炼厂产出）- 初始给 1000 方便测试
    refineLv: 1,         // 精炼厂等级
    essenceTimer: 0,     // 精炼厂生产计时（独立于炼钢厂的refineTimer）
    armorCores: 0,       // 护甲核心（远征获得）
    // 护甲图纸数量（按职业区分）
    armorBlueprints: {
        warrior: 0,
        archer: 0,
        mage: 0,
        knight: 0,
    },
    // 武器铺（V2 模块）状态
    inventory: [
        // 初始一把基础武器，允许作为模具
        { name: '新手木棍', lv: 1, atk: 5, hp: 10, subs: [], prof: 0, icon: '🦯', q: 0, isForged: true }
    ],
    activeWeaponIdx: 0,
    weaponShopLv: 3,      // 初始给高一点等级，方便看到效果
    shopMaterials: 1000,
    blueprints: [1], // Lv.1 解锁
    gridCards: [],
    waveProgress: 0,
    challengeAutoTimer: 0,
    gridOffsets: {
        epicProb: 0,
        rareProb: 0,
        swordsmanAtkBonus: 0, swordsmanCrit: 0, swordsmanCritDmg: 0, swordsmanLifesteal: 0,
        archerAtkBonus: 0, archerCrit: 0, archerCritDmg: 0, archerLifesteal: 0,
        staffAtkBonus: 0, staffCrit: 0, staffCritDmg: 0, staffLifesteal: 0,
        spearAtkBonus: 0, spearCrit: 0, spearCritDmg: 0, spearLifesteal: 0
    },
    // 初始给每条武器线一个略高的品阶，方便体验 V2 武器铺效果
    weaponQualities: [2, 2, 2, 2],
    gridRefreshing: false,
    shopExp: 0,
    isHighlight: false,
};

// 击杀需求：初始 10，每提升 1 级 +10，最多 100
function getKillTargetForLevel(level) {
    const base = 10 + (level - 1) * 10;
    return Math.min(base, 100);
}

// ---- 统一战斗力公式 ----
// 装备战斗力：atk×10 + hp（副词条以加成形式附加）
function calcEquipPower(eq) {
    let p = eq.atk * 10 + eq.hp;
    (eq.subs || []).forEach(s => {
        if (s.type === 'atkPct') p += eq.atk * s.val / 10;
        else if (s.type === 'hpPct') p += eq.hp * s.val / 10;
        else if (s.type === 'crit') p += s.val * 8;
        else if (s.type === 'spdPct') p += s.val * 5;
    });
    return Math.floor(p);
}
// 英雄战斗力：当前实际atk×10 + maxHp
function calcHeroPower(h) {
    return Math.floor(h.atk * 10 + h.maxHp);
}

// 四个职业：战士/弓手/法师/骑士
const ROLES = ['warrior', 'archer', 'mage', 'knight'];

// Hero 类型 → 职业映射
const HERO_ROLE_MAP = {
    swordsman: 'warrior',
    pikeman: 'warrior',
    titan: 'warrior',

    archer: 'archer',
    griffin: 'archer',

    mage: 'mage',
    monk: 'mage',
    angel: 'mage',

    cavalry: 'knight',
    dragon: 'knight',
};

// Instead of static recipes, dynamically generate them based on level
function getRecipeDef(lv) {
    let q = Math.floor(lv / 10);
    if (q > 4) q = 4;
    return {
        name: `装备 Lv.${lv}`,
        lv: lv,
        baseAtk: 5 * lv,
        baseHp: 10 * lv,
        icon: '⚔️',
        q: q,
        // 默认给战士武器，后续在武器铺中可以扩展按职业区分配方
        role: 'warrior'
    };
}

const SUB_AFFIX_POOL = [
    { name: '致命几率', min: 1, max: 10, isPct: true, type: 'crit' },
    { name: '攻击加成', min: 2, max: 20, isPct: true, type: 'atkPct' },
    { name: '生命加成', min: 2, max: 20, isPct: true, type: 'hpPct' },
    { name: '攻击速度', min: 2, max: 15, isPct: true, type: 'spdPct' }
];

// Weapon shop proficiency level system
// Thresholds: level 1=50, level 2=150, level 3=250, level 4=400, level 5=600 (cumulative)
const SHOP_PROF_THRESHOLDS = [50, 150, 250, 400, 600];

function tryUpgradeShopProf() {
    while (G.shopProfLv < SHOP_PROF_THRESHOLDS.length && G.shopProf >= SHOP_PROF_THRESHOLDS[G.shopProfLv]) {
        G.shopProfLv++;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `⭐ 武器铺熟练等级提升！Lv.${G.shopProfLv} 主属性 +${G.shopProfLv * 5}%`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

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
        role: HERO_ROLE_MAP[type] || 'warrior',
        // Start walking from barracks (skip hospital - full HP on spawn)
        state: 'walking', pathT: BLDS[BARRACKS_BLD_IDX].exitT,
        nextBldIdx: BARRACKS_BLD_IDX + 1,
        sideProgress: 0, currentBld: null,
        equips: [], healTimer: 0, forgeTimer: 0, atkTimer: 0,
        appliedBuffAtk: 0, appliedBuffHp: 0, // 已应用的增益铺增益
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
                    else if (b.id === 'weapon' && G.autoForge.enabled && G.mold) {
                        // 强制在武器铺等待，直到铸造完成
                        h.state = 'atBuilding'; h.forgeTimer = 0;
                    }
                    else if (b.id === 'buff' && (G.buffAccAtk > h.appliedBuffAtk || G.buffAccHp > h.appliedBuffHp)) {
                        // 有新增益可获取，停留3秒
                        h.state = 'atBuilding'; h.healTimer = 0;
                    }
                    else if (b.id === 'armor') {
                        // 护甲铺：所有英雄都需要停留3秒获得护甲
                        h.state = 'atBuilding'; h.healTimer = 0;
                    }
                    else { h.state = 'sideOut'; h.sideProgress = 0; }
                }
                break;
            }
            case 'atBuilding': {
                const b = h.currentBld;
                if (b.id === 'hospital') {
                    h.healTimer += dt;
                    h.hp = h.maxHp * (LOW_HP + (1 - LOW_HP) * Math.min(1, h.healTimer / HEAL_DUR));
                    h.rx = b.rx + jx; h.ry = b.ry + jy;
                    if (h.healTimer >= HEAL_DUR) { h.hp = h.maxHp; h.state = 'sideOut'; h.sideProgress = 0; }
                } else if (b.id === 'weapon' && G.autoForge.enabled && G.mold && (!G.mold.role || G.mold.role === h.role)) {
                    // 自动铸造消耗：每级 +10（Lv.1=10, Lv.5=50, Lv.10=100），且仅适用对应职业武器
                    const costOri = G.mold.lv * 10;
                    h.rx = b.rx + jx; h.ry = b.ry + jy;
                    if (G.ori >= costOri) {
                        // 资源足够，推进铸造计时
                        h.forgeTimer += dt;
                        if (h.forgeTimer >= 5000) {
                            G.ori -= costOri;
                            const m = G.mold;
                            // 旧战斗力（用统一公式）
                            const oldPower = calcHeroPower(h);
                            // 计算新属性（含副词条）
                            let wAtkMult = 1, wHpMult = 1;
                            (m.subs || []).forEach(sub => {
                                if (sub.type === 'atkPct') wAtkMult += sub.val / 100;
                                if (sub.type === 'hpPct') wHpMult += sub.val / 100;
                            });
                            const newAtk = (h.baseAtk + m.atk) * wAtkMult;
                            const newMaxHp = (HTYPES[h.type].hp + m.hp) * wHpMult;
                            h.atk = newAtk;
                            h.maxHp = newMaxHp;
                            // 新战斗力
                            const newPower = calcHeroPower(h);
                            const diff = newPower - oldPower;
                            if (diff !== 0) {
                                // 英雄头顶浮动小提示
                                G.floatTexts.push({
                                    rx: h.rx, ry: h.ry,
                                    text: (diff > 0 ? '+' : '') + diff,
                                    color: diff > 0 ? '#4ade80' : '#f87171',
                                    t: 0, dur: 2200
                                });
                            }
                            h.hp = h.maxHp;
                            if (!h.equips.find(e => e.icon === m.icon)) h.equips.push({ icon: m.icon });
                            h.forgeTimer = 0;
                            h.state = 'sideOut'; h.sideProgress = 0;
                        }
                    }
                    // 资源不足时原地等待，forgeTimer 不增长
                } else if (b.id === 'buff') {
                    // 停留3秒，获得增益铺累计属性（增量部分）
                    h.healTimer += dt;
                    h.rx = b.rx + jx; h.ry = b.ry + jy;
                    if (h.healTimer >= 3000) {
                        const deltaAtk = G.buffAccAtk - h.appliedBuffAtk;
                        const deltaHp  = G.buffAccHp  - h.appliedBuffHp;
                        const oldPower = calcHeroPower(h);
                        if (deltaAtk > 0) { h.atk += deltaAtk; h.appliedBuffAtk = G.buffAccAtk; }
                        if (deltaHp  > 0) { h.maxHp += deltaHp; h.hp = Math.min(h.hp + deltaHp, h.maxHp); h.appliedBuffHp = G.buffAccHp; }
                        const diff = calcHeroPower(h) - oldPower;
                        if (diff > 0) {
                            G.floatTexts.push({
                                rx: h.rx, ry: h.ry - 0.03,
                                text: '✨ +' + diff,
                                color: '#a78bfa',
                                t: 0, dur: 2400
                            });
                        }
                        h.state = 'sideOut'; h.sideProgress = 0;
                    }
                } else if (b.id === 'armor') {
                    // 护甲铺：停留3秒，获得对应职业的护甲属性
                    h.healTimer += dt;
                    h.rx = b.rx + jx; h.ry = b.ry + jy;
                    if (h.healTimer >= 3000) {
                        const armor = G.armors[h.role];
                        if (armor) {
                            // 计算护甲属性（基础属性 + 强化加成）
                            const enhanceMult = 1 + armor.enhanceLv * 0.1; // 每级强化+10%
                            const tierMult = 1 + armor.tier * 0.5; // 每阶+50%
                            const finalDef = Math.floor(armor.def * enhanceMult * tierMult);
                            const finalHp = Math.floor(armor.hp * enhanceMult * tierMult);
                            
                            const oldPower = calcHeroPower(h);
                            // 应用护甲属性（防御和生命值）
                            h.maxHp = (h.maxHp || HTYPES[h.type].hp) + finalHp;
                            h.hp = Math.min(h.hp + finalHp, h.maxHp);
                            // 防御值可以存储在英雄对象中，用于战斗计算
                            if (!h.armorDef) h.armorDef = 0;
                            h.armorDef = finalDef;
                            
                            // 添加护甲图标到装备列表
                            if (!h.equips.find(e => e.icon === armor.icon)) {
                                h.equips.push({ icon: armor.icon });
                            }
                            
                            const diff = calcHeroPower(h) - oldPower;
                            if (diff > 0) {
                                G.floatTexts.push({
                                    rx: h.rx, ry: h.ry - 0.03,
                                    text: '🛡️ +' + diff,
                                    color: '#60a5fa',
                                    t: 0, dur: 2400
                                });
                            }
                        }
                        h.state = 'sideOut'; h.sideProgress = 0;
                    }
                } else {
                    h.state = 'sideOut'; h.sideProgress = 0;
                }
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
                    if (h.currentBld.id === 'weapon' && G.mold && (!G.mold.role || G.mold.role === h.role)) {
                        // Apply mold stats - 英雄获得模具的复制品（仅匹配职业的武器）
                        let m = G.mold;
                        let wAtkMult = 1, wHpMult = 1, wSpdMult = 1, wCrit = 0;
                        m.subs.forEach(sub => {
                            if (sub.type === 'atkPct') wAtkMult += sub.val / 100;
                            if (sub.type === 'hpPct') wHpMult += sub.val / 100;
                            if (sub.type === 'spdPct') wSpdMult += sub.val / 100;
                            if (sub.type === 'crit') wCrit += sub.val;
                        });
                        h.atk = (h.baseAtk + m.atk) * wAtkMult;
                        h.maxHp = (HTYPES[h.type].hp + m.hp) * wHpMult;
                        // HP retains its percentage
                        let hpPct = h.hp / HTYPES[h.type].hp;
                        h.hp = h.maxHp * hpPct;
                        h.spd = h.baseSpd * wSpdMult;
                        // For simplicity, store crit temp or ignore crit mechanics since crit wasn't fully implemented in battle previously
                        if (!h.equips.find(e => e.icon === m.icon)) {
                            h.equips.push({ icon: m.icon });
                        }
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
                    h.appliedBuffAtk = 0; h.appliedBuffHp = 0; // 撤退后重置，下次经过增益铺可重新获得
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
    const k = G.enemies.filter(e => e.hp <= 0);
    if (k.length) {
        G.gold += k.length * (5 + G.level * 2);
        // Material drops based on highest unlocked recipe
        let dropLv = Math.max(...G.recipesUnlocked);
        if (!G.materials[dropLv]) G.materials[dropLv] = 0;
        G.materials[dropLv] += k.length; // 100% drop rate per enemy killed
        // 击杀进度：只在主城战斗中累计
        G.killCount = Math.min(G.killCount + k.length, G.killTarget);
        renderUI();
    }
    G.enemies = G.enemies.filter(e => e.hp > 0);
    // Economy tick (refining)
    updateEconomy(dt);
    // Summon/Pet attack logic (shared)
    updatePetAttack(dt);
}

function startChallenge(targetLevel) {
    // targetLevel: 可选，指定要挑战的关卡（用于重新挑战已完成的关卡）
    const challengeLevel = targetLevel !== undefined ? targetLevel : G.chCount;
    G.currentChallengeLevel = challengeLevel; // 保存当前挑战的关卡，用于 endChallenge 判断
    G.mode = 'challenge';
    G.chHeroes = []; G.chEnemies = []; G.fx = [];
    const pool = ['swordsman', 'archer', 'pikeman', 'griffin', 'monk', 'cavalry', 'mage'];
    $('task-bar').classList.add('hidden');
    $('bottom-nav').classList.add('hidden');
    updateSummonBar();
    let hMult = 1, aMult = 1;
    // Boss scales 1.2x per level
    let eHMult = Math.pow(1.2, challengeLevel - 1);
    let eAMult = Math.pow(1.2, challengeLevel - 1);
    for (let i = 0; i < 15; i++) {
        const type = pool[Math.floor(Math.random() * pool.length)], t = HTYPES[type];
        let heroAtk = t.atk * aMult, heroMaxHp = t.hp * hMult, heroSpd = t.spd;
        let pEquips = [{ icon: '⚔️' }, { icon: '🛡️' }, { icon: '✨' }];

        // Apply mold buff - 挑战模式中也使用当前模具的属性
        if (G.mold) {
            let m = G.mold;
            let wAtkMult = 1, wHpMult = 1, wSpdMult = 1, wCrit = 0;
            m.subs.forEach(sub => {
                if (sub.type === 'atkPct') wAtkMult += sub.val / 100;
                if (sub.type === 'hpPct') wHpMult += sub.val / 100;
                if (sub.type === 'spdPct') wSpdMult += sub.val / 100;
                if (sub.type === 'crit') wCrit += sub.val;
            });
            heroAtk = (heroAtk + m.atk) * wAtkMult;
            heroMaxHp = (heroMaxHp + m.hp) * wHpMult;
            heroSpd = heroSpd * wSpdMult;
            if (!pEquips.find(e => e.icon === m.icon)) pEquips.push({ icon: m.icon });
        }

        G.chHeroes.push({
            icon: t.icon, hp: heroMaxHp, maxHp: heroMaxHp, atk: heroAtk,
            spd: heroSpd, range: t.range, baseAtk: heroAtk, baseSpd: heroSpd,
            rx: 0.1 + Math.random() * 0.8, ry: 0.8 + Math.random() * 0.15, atkTimer: 0,
            equips: pEquips
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
    G.fx.forEach(f => { f.t += dt / f.dur; }); G.fx = G.fx.filter(f => f.t < 1);
    if (!hAlive.length) { endChallenge(false); return; }
    if (!eAlive.length) { enterCaptureMode(); return; }
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



function endChallenge(win) {
    if (win) {
        G.level++; // Increment global wave level
        const challengeLevel = G.currentChallengeLevel !== undefined ? G.currentChallengeLevel : G.chCount;
        const rew = 100 + challengeLevel * 50; G.gold += rew;
        if ($('reward-amount')) $('reward-amount').textContent = '💰 ' + rew;

        // 只有挑战新关卡时才解锁配方和增加 chCount
        const isNewChallenge = challengeLevel >= G.chCount;
        if (isNewChallenge) {
            // Give new recipe based on challenge count
            let newLv = G.chCount * 5;
            if (!G.recipesUnlocked.includes(newLv)) {
                G.recipesUnlocked.push(newLv);
                let rec = getRecipeDef(newLv);
                // 配方只存基础定义，不包含具体属性值
                G.recipes.push({ name: rec.name, lv: rec.lv, baseAtk: rec.baseAtk, baseHp: rec.baseHp, icon: rec.icon, q: rec.q });
                const toast = document.createElement('div');
                toast.className = 'toast'; toast.textContent = `🎊 击败首领！解锁配方: ${rec.name}`;
                document.body.appendChild(toast); setTimeout(() => toast.remove(), 4000);
            }
            G.chCount++; // Increment for next time
            // 新解锁的关卡需要重新累计击杀数
            G.killCount = 0;
            G.killTarget = getKillTargetForLevel(G.level);
        }
        $('modal-victory').classList.remove('hidden');
    } else {
        G.currentChallengeLevel = undefined; // 失败时也清除
        $('modal-defeat').classList.remove('hidden');
    }
    G.mode = 'city';
    G.activeSummonChallenge = null; // Clear challenge summon on end
    $('challenge-view')?.classList.add('hidden');
    $('capture-overlay').classList.add('hidden');
    $('bottom-nav').classList.remove('hidden');
    $('task-bar').classList.remove('hidden');
    $('skill-bar')?.classList.add('hidden');
    renderUI();
}

function drawPetBackground(ctx, W, H, p) {
    if (!p) return;
    ctx.save();
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = W * 0.5, y = H * 0.18;
    const now = performance.now();
    const glowIntensity = 10 + 8 * Math.sin(now / 400);

    // Golden Outer Glow
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = glowIntensity;

    // Draw icon as solid entity
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#fff';
    ctx.fillText(p.icon, x, y);
    ctx.restore();
}

function enterCaptureMode() {
    G.mode = 'capture';
    // Logic: Hidden target value (1-100). First boss target is 1 (guaranteed).
    G.captureTarget = (G.pets.length === 0) ? 1 : (Math.floor(Math.random() * 100) + 1);
    G.captureProb = 0;
    G.isCaptureFinished = false;
    const survivors = G.chHeroes.filter(h => h.hp > 0);
    G.captureHeroes = survivors.map(h => ({
        ...h, rx: 0.1 + Math.random() * 0.8, ry: 0.75 + Math.random() * 0.1, bashT: -1
    }));

    const boss = G.chEnemies.find(e => e.boss);
    boss.rx = 0.5; boss.ry = 0.25;
    boss.shakeT = 0;

    $('capture-overlay').classList.remove('hidden');
    $('capture-prob-val').textContent = G.captureProb;
    $('capture-hero-count').textContent = G.captureHeroes.length;
}

$('capture-bash-btn').onclick = () => {
    if (G.mode !== 'capture' || G.captureHeroes.length === 0 || G.isCaptureFinished) return;
    const h = G.captureHeroes.find(h => h.bashT < 0);
    if (!h) return;

    h.bashT = 0;
    h.origX = h.rx; h.origY = h.ry;

    G.captureProb += 2;
    $('capture-prob-val').textContent = G.captureProb;

    const success = (G.captureProb >= G.captureTarget);
    if (success) G.isCaptureFinished = true;

    setTimeout(() => {
        if (success) {
            const boss = G.chEnemies.find(e => e.boss);
            const pet = {
                name: '驯服的' + boss.icon,
                icon: boss.icon,
                lv: G.chCount * 5
            };
            G.pets.push(pet);
            alert('🎉 捕捉成功！' + pet.name + ' 加入了你的百兽园！');
            renderPets();
            endChallenge(true);
        } else {
            h.finished = true;
            const remaining = G.captureHeroes.filter(hero => hero.bashT < 0).length;
            $('capture-hero-count').textContent = remaining;
            const boss = G.chEnemies.find(e => e.boss);
            boss.shakeT = 500;

            if (remaining === 0) {
                alert('😭 所有英雄都累倒了... Boss趁机逃跑了！\n(本次捕获值为 ' + G.captureTarget + ')');
                endChallenge(true);
            }
        }
    }, 400);
};

function drawCapture(ctx, W, H) {
    const boss = G.chEnemies.find(e => e.boss);
    if (!boss) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

    // Draw Boss
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let bx = boss.rx * W, by = boss.ry * H;
    if (boss.shakeT > 0) {
        bx += Math.sin(performance.now() * 0.1) * 5;
        boss.shakeT -= 16;
    }
    ctx.globalAlpha = 0.6; ctx.fillText(boss.icon, bx, by); ctx.globalAlpha = 1.0;

    // Draw Heroes
    G.captureHeroes.forEach(h => {
        if (h.finished) return;
        ctx.font = '30px sans-serif';
        let hx = h.rx * W, hy = h.ry * H;
        if (h.bashT >= 0) {
            h.bashT += 16;
            const p = Math.min(1, h.bashT / 400);
            hx = (h.origX + (0.5 - h.origX) * p) * W;
            hy = (h.origY + (0.25 - h.origY) * p) * H;
            if (p >= 1) { h.rx = -1; }
        }
        ctx.fillText(h.icon, hx, hy);
    });
}

function renderPets() {
    const container = $('pet-list-container');
    if (!container) return;
    container.innerHTML = '';
    if (G.pets.length === 0) {
        container.innerHTML = '<div style="padding: 20px; opacity: 0.5;">目前百兽园空空如也... 快去捕捉Boss吧！</div>';
        return;
    }
    G.pets.forEach((p, idx) => {
        const div = document.createElement('div');
        const deployedIdx = G.deployedPetIdxs.indexOf(idx);
        // Base Stats: HP 500, ATK 50. Increase by 50% per level.
        const mult = 1 + (G.bestiaryLv - 1) * 0.5;
        const curHp = Math.floor(500 * mult);
        const curAtk = Math.floor(50 * mult);

        div.className = 'pet-item' + (deployedIdx >= 0 ? ' active' : '');
        div.innerHTML = `
            <div class="pet-icon">${p.icon}</div>
            <div class="pet-name">${p.name}</div>
            <div class="pet-info">HP: ${curHp} | ATK: ${curAtk} | ${deployedIdx >= 0 ? `出战中 (${deployedIdx + 1})` : '待命中'}</div>
        `;
        div.onclick = () => {
            if (deployedIdx >= 0) {
                G.deployedPetIdxs.splice(deployedIdx, 1);
            } else {
                if (G.deployedPetIdxs.length < 3) {
                    G.deployedPetIdxs.push(idx);
                } else {
                    alert('最多只能同时设置 3 只巨兽出战！');
                }
            }
            renderPets();
            updateSummonBar();
        };
        container.appendChild(div);
    });
}

function updateSummonBar() {
    for (let i = 0; i < 3; i++) {
        const el = $('summon-' + i);
        if (!el) continue;
        const petIdx = G.deployedPetIdxs[i];
        if (petIdx !== undefined) {
            const p = G.pets[petIdx];
            el.querySelector('.skill-icon').textContent = p.icon;
            el.classList.remove('no-mana');
            el.onclick = () => summonBoss(i);
        } else {
            el.querySelector('.skill-icon').textContent = 'Empty';
            el.classList.add('no-mana');
            el.onclick = null;
        }
    }
}

function summonBoss(slotIdx) {
    const isCh = (G.mode === 'challenge');
    const activeS = isCh ? G.activeSummonChallenge : G.activeSummonCity;

    if (!isCh && G.mana < 10) return alert('魔力不足！需要 10 点魔力。');
    if (activeS) return alert('已有巨兽在场，无法重复召唤！');

    const petIdx = G.deployedPetIdxs[slotIdx];
    if (petIdx === undefined) return;

    const p = G.pets[petIdx];
    if (!isCh) G.mana -= 10;

    // Base Stats: HP 500, ATK 50. Increase by 50% per level.
    const mult = 1 + (G.bestiaryLv - 1) * 0.5;
    const curHp = 500 * mult;
    const curAtk = 50 * mult;

    const newSummon = {
        idx: petIdx,
        timeLeft: 10000,
        hp: curHp,
        maxHp: curHp,
        atk: curAtk,
        icon: p.icon
    };

    if (isCh) G.activeSummonChallenge = newSummon;
    else G.activeSummonCity = newSummon;

    renderUI();
}

function openBestiary() {
    $('modal-bestiary').classList.remove('hidden');
    renderPets();
    renderBestiaryUI();
}

function renderBestiaryUI() {
    const levelEl = $('bestiary-lv-val');
    if (levelEl) levelEl.textContent = G.bestiaryLv;
    const multEl = $('bestiary-mult-val');
    if (multEl) multEl.textContent = (1 + (G.bestiaryLv - 1) * 0.5).toFixed(1);
    const costEl = $('bestiary-upgrade-cost');
    if (costEl) costEl.textContent = Math.floor(1000 * Math.pow(1.8, G.bestiaryLv - 1));
}

function upgradeBestiary() {
    const cost = Math.floor(1000 * Math.pow(1.8, G.bestiaryLv - 1));
    if (G.gold < cost) return alert('金币不足！');
    G.gold -= cost;
    G.bestiaryLv++;
    renderBestiaryUI();
    renderPets();
    renderUI();
}

$('bestiary-upgrade-btn').onclick = upgradeBestiary;
$('bestiary-close-btn').onclick = () => $('modal-bestiary').classList.add('hidden');

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = (e) => {
        const page = e.target.closest('.nav-btn').dataset.page;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
        document.querySelectorAll('.placeholder-page, .canvas-area').forEach(p => p.classList.add('hidden'));
        if (page === 'main') {
            G.mode = 'city';
            $('page-main').classList.remove('hidden');
        } else {
            G.mode = 'ui';
            $(`page-${page}`).classList.remove('hidden');
            if (page === 'pet') renderPets();
        }
        renderUI();
    };
});

// ---- 全队战斗力大提示 ----
let _powerBannerTimer = null;
function showPowerBanner(heroIcon, diff) {
    // 若上一个还没消失则叠加数值
    let existing = document.querySelector('.power-banner');
    if (existing && existing._diff !== undefined) {
        diff += existing._diff;
        existing.remove();
        clearTimeout(_powerBannerTimer);
    }
    const el = document.createElement('div');
    el.className = 'power-banner';
    el._diff = diff;
    const isUp = diff > 0;
    el.innerHTML = `
        <div class="power-banner-diff ${isUp ? 'up' : 'down'}">
            ⚔️ ${isUp ? '+' : ''}${diff}
        </div>
    `;
    document.querySelector('.game-container').appendChild(el);
    _powerBannerTimer = setTimeout(() => el.remove(), 2800);
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
    // Resource side-buildings (hexagons, same size as normal buildings) + clickable highlight
    BRANCHES.forEach((b, i) => {
        const x = b.rx * W, y = b.ry * H, r = 30; // same size as normal buildings
        // 外层高亮描边，提示可点击
        const isClickable = ['炼钢厂', '百兽园', '晶石矿场'].includes(b.label);
        if (isClickable) {
            ctx.beginPath();
            ctx.arc(x, y, r + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(251,191,36,0.55)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
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



    drawPetBackground(ctx, W, H, G.activeSummonCity);

    // Buildings
    const now = performance.now();
    BLDS.forEach((b, i) => {
        const x = b.rx * W, y = b.ry * H;
        const pulse = 1 + 0.04 * Math.sin(now / 800 + i * 1.2), r = 30 * pulse;
        // 外描边高亮圈，提示可点击（护甲铺也高亮）
        const isMainClickable = ['weapon', 'buff', 'armor'].includes(b.id);
        if (isMainClickable) {
            ctx.beginPath();
            ctx.arc(x, y, r + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(96,165,250,0.7)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,18,30,0.92)'; ctx.fill();
        // 护甲铺不再作为可点击/功能建筑高亮显示，使用普通描边
        const glow = (b.equip && b.id !== 'armor')
            ? 'rgba(74,222,128,0.55)'
            : b.id === 'hospital'
                ? 'rgba(248,113,113,0.5)'
                : b.id === 'barracks_bld'
                    ? 'rgba(96,165,250,0.5)'
                    : 'rgba(255,255,255,0.15)';
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

        // Weapon Shop: draw circular forging progress ring for heroes inside
        if (b.id === 'weapon') {
            G.heroes.filter(h => h.state === 'atBuilding' && h.currentBld && h.currentBld.id === 'weapon' && h.forgeTimer > 0).forEach(h => {
                const pct = Math.min(1, h.forgeTimer / 5000);
                ctx.beginPath();
                ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
                ctx.strokeStyle = 'rgba(250,204,21,0.85)'; ctx.lineWidth = 3; ctx.stroke();
            });
        }
        // Buff Shop: draw circular buff progress ring for heroes inside
        if (b.id === 'buff') {
            G.heroes.filter(h => h.state === 'atBuilding' && h.currentBld && h.currentBld.id === 'buff').forEach(h => {
                const pct = Math.min(1, h.healTimer / 3000);
                ctx.beginPath();
                ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
                ctx.strokeStyle = 'rgba(167,139,250,0.9)'; ctx.lineWidth = 3; ctx.stroke();
            });
            // 显示当前累计增益
            if (G.buffAccAtk > 0 || G.buffAccHp > 0) {
                ctx.font = '8px Inter,sans-serif'; ctx.fillStyle = 'rgba(167,139,250,0.8)';
                ctx.textAlign = 'center';
                ctx.fillText(`+${G.buffAccAtk}⚔️ +${G.buffAccHp}❤️`, x, y + r + 20);
            }
        }
        // Armor Shop: draw circular armor progress ring for heroes inside
        if (b.id === 'armor') {
            G.heroes.filter(h => h.state === 'atBuilding' && h.currentBld && h.currentBld.id === 'armor').forEach(h => {
                const pct = Math.min(1, h.healTimer / 3000);
                ctx.beginPath();
                ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
                ctx.strokeStyle = 'rgba(96,165,250,0.9)'; ctx.lineWidth = 3; ctx.stroke();
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

    // Float texts (combat power change)
    G.floatTexts.forEach(ft => {
        const x = ft.rx * W;
        const y = ft.ry * H - ft.t * 60; // 向上浮动 60px
        const alpha = ft.t < 0.6 ? 1 : 1 - (ft.t - 0.6) / 0.4; // 后40%淡出
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 阴影发光
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        // 背景描边（可读性）
        ctx.font = 'bold 13px Inter,sans-serif';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText('⚔️ ' + ft.text, x, y);
        ctx.fillStyle = ft.color;
        ctx.fillText('⚔️ ' + ft.text, x, y);
        ctx.restore();
    });
}

// ---- RENDER: CHALLENGE ----
function drawChallenge(ctx, W, H) {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    drawPetBackground(ctx, W, H, G.activeSummonChallenge);

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
    // 右下角按钮改为“远征”入口：只有通关过第一关（level>1）并且在主城时才显示
    $('challenge-btn').classList.toggle('hidden', !(G.mode === 'city' && G.level > 1));
    // 文案固定为远征
    $('challenge-btn').textContent = '🚩 远征';

    // 顶部进度条 UI（外观与 V2 一致，数值沿用 V1 的击杀规则）
    if ($('top-progress-container')) {
        const pct = G.killTarget > 0 ? Math.floor(G.killCount / G.killTarget * 100) : 0;
        $('top-progress-container').classList.toggle('hidden', G.mode !== 'city');
        $('top-progress-fill').style.width = Math.max(0, Math.min(100, pct)) + '%';
        $('top-progress-text').textContent = `第 ${G.level} 关 - 进度: ${pct}%`;

        const topBtn = $('top-challenge-btn');
        if (G.killCount >= G.killTarget) {
            topBtn.classList.remove('hidden');
            topBtn.textContent = `⚔️ 挑战 Boss`;
        } else {
            topBtn.classList.add('hidden');
        }
    }

    // Mana UI
    $('mana-display').textContent = Math.floor(G.mana);
    $('mana-bar-fill').style.width = (G.mana / G.maxMana * 100) + '%';

    // Orichalcum UI
    $('ori-display').textContent = Math.floor(G.ori);
    // Crystal UI
    $('crystal-display').textContent = Math.floor(G.crystals);
    // Essence UI (if element exists)
    const essenceEl = $('armor-essence-display');
    if (essenceEl) essenceEl.textContent = Math.floor(G.essence);

    // Summon Bar slots
    const activeS = (G.mode === 'challenge') ? G.activeSummonChallenge : G.activeSummonCity;
    const isCh = (G.mode === 'challenge');

    for (let i = 0; i < 3; i++) {
        const el = $('summon-' + i);
        if (!el) continue;
        const petIdx = G.deployedPetIdxs[i];
        el.classList.toggle('no-mana', (!isCh && G.mana < 10) || !!activeS || petIdx === undefined);
        el.classList.toggle('cd', !!activeS && activeS.idx !== petIdx);
        el.classList.toggle('active', activeS && activeS.idx === petIdx);

        const cdEl = el.querySelector('.skill-cooldown');
        if (cdEl && activeS && activeS.idx === petIdx) {
            cdEl.style.height = (activeS.timeLeft / 10000 * 100) + '%';
        } else if (cdEl) {
            cdEl.style.height = '0%';
        }
    }

    // Toggle Summon Bar visibility and positioning based on mode
    const summonBar = $('summon-bar');
    if (summonBar) {
        summonBar.classList.toggle('hidden', G.mode !== 'city' && G.mode !== 'challenge');
        summonBar.classList.toggle('challenge', G.mode === 'challenge');
    }
}

function loop(ts) {
    if (!G.lastTime) G.lastTime = ts;
    let dt = ts - G.lastTime; G.lastTime = ts; if (dt > 100) dt = 100;
    const c = $('game-canvas'), r = c.parentElement.getBoundingClientRect();
    if (c.width !== Math.floor(r.width) || c.height !== Math.floor(r.height)) { c.width = Math.floor(r.width); c.height = Math.floor(r.height); }
    const ctx = c.getContext('2d');
    updateExpeditions();
    updateCrystalMine(dt);
    G.floatTexts.forEach(ft => { ft.t += dt / ft.dur; });
    G.floatTexts = G.floatTexts.filter(ft => ft.t < 1);
    if (G.mode === 'city') {
        updateSpawn(dt); updateHeroes(dt); updateRes(dt); updateBattle(dt);
        if (typeof updateForgeLogic === 'function') updateForgeLogic(dt);
        draw(ctx, c.width, c.height);
    } else if (G.mode === 'challenge' || G.mode === 'result') {
        updateEconomy(dt); // Still refine in challenge!
        updatePetAttack(dt);
        updateChallenge(dt); drawChallenge(ctx, c.width, c.height);
    } else if (G.mode === 'capture') {
        updateEconomy(dt);
        drawCapture(ctx, c.width, c.height);
    }
    if (ts % 500 < dt) {
        renderUI();
        if (!$('modal-weapon').classList.contains('hidden')) renderAutoForgeStatus();
    }
    requestAnimationFrame(loop);
}

function updatePetAttack(dt) {
    // Mana Regeneration: 1 point every 3s
    if (G.mana < G.maxMana) {
        G.manaRecoverTimer += dt;
        if (G.manaRecoverTimer >= 3000) {
            G.manaRecoverTimer = 0;
            G.mana = Math.min(G.maxMana, G.mana + 1);
        }
    }

    // Process both summons (City and Challenge)
    [G.activeSummonCity, G.activeSummonChallenge].forEach((s, idx) => {
        if (!s) return;
        s.timeLeft -= dt;

        // Attack logic: every 2s while active
        if (!s.attackTimer) s.attackTimer = 0;
        s.attackTimer += dt;
        if (s.attackTimer >= 2000) {
            s.attackTimer = 0;
            G.fx.push({ type: 'global', color: 'rgba(239, 68, 68, 0.15)', dur: 400, t: 0 });

            const dmg = s.atk;
            const mode = (idx === 0) ? 'city' : 'challenge';
            if (mode === 'city') G.enemies.forEach(e => e.hp -= dmg);
            else if (mode === 'challenge' && G.mode === 'challenge') G.chEnemies.forEach(e => e.hp -= dmg);
        }

        if (s.timeLeft <= 0) {
            if (idx === 0) G.activeSummonCity = null;
            else G.activeSummonChallenge = null;
        }
    });
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

    // Click on 武器铺 (weapon shop) - 交互已关闭，不再打开武器铺界面
    // const weaponBld = BLDS.find(b => b.id === 'weapon');
    // if (weaponBld && Math.hypot(rx - weaponBld.rx, ry - weaponBld.ry) < 0.08) openWeaponShop();

    // Click on 炼钢厂 (steel mill)
    const steelMillBld = BRANCHES.find(b => b.label === '炼钢厂');
    if (steelMillBld && Math.hypot(rx - steelMillBld.rx, ry - steelMillBld.ry) < 0.08) openSteelMill();

    // Click on 百兽园 (bestiary)
    const bestiaryBld = BRANCHES.find(b => b.label === '百兽园');
    if (bestiaryBld && Math.hypot(rx - bestiaryBld.rx, ry - bestiaryBld.ry) < 0.08) openBestiary();

    // Click on 增益铺 (buff shop) → 打开老虎机
    const buffBld = BLDS.find(b => b.id === 'buff');
    if (buffBld && Math.hypot(rx - buffBld.rx, ry - buffBld.ry) < 0.08) openSlotMachine();

    // Click on 晶石矿场 (crystal mine)
    const crystalMineBld = BRANCHES.find(b => b.label === '晶石矿场');
    if (crystalMineBld && Math.hypot(rx - crystalMineBld.rx, ry - crystalMineBld.ry) < 0.08) openCrystalMine();

    // Click on 护甲铺 (armor shop)
    const armorBld = BLDS.find(b => b.id === 'armor');
    if (armorBld && Math.hypot(rx - armorBld.rx, ry - armorBld.ry) < 0.08) openArmorShop();

    // Click on 精炼厂 (refinery)
    const refineryBld = BRANCHES.find(b => b.label === '精炼厂');
    if (refineryBld && Math.hypot(rx - refineryBld.rx, ry - refineryBld.ry) < 0.08) openRefinery();
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

// ---- CHALLENGE LIST ----
function openChallengeList() {
    if (G.mode !== 'city') return;
    renderChallengeList();
    $('modal-challenge-list').classList.remove('hidden');
}

function renderChallengeList() {
    const body = $('challenge-list-body');
    body.innerHTML = '';
    const mode = G.challengeListMode || 'challenge';
    let levels = [];
    if (mode === 'challenge') {
        // 当前可挑战关卡 + 已通关（降序）
        levels.push({ level: G.chCount, cleared: false });
        for (let i = G.chCount - 1; i >= 1; i--) levels.push({ level: i, cleared: true });
    } else {
        // 远征模式：只显示已通关（降序）
        for (let i = G.chCount - 1; i >= 1; i--) levels.push({ level: i, cleared: true });
    }

    levels.forEach(({ level, cleared }) => {
        const reward = 100 + level * 50;
        const activeExp = G.expeditions.find(e => e.level === level);
        const timeLeft = activeExp ? Math.ceil((activeExp.endTime - Date.now()) / 1000) : 0;

        const row = document.createElement('div');
        row.className = 'challenge-row';
        row.innerHTML = `
            <div class="challenge-row-info">
                <div class="challenge-row-title">第 ${level} 关</div>
                <div class="challenge-row-sub">奖励 💰 ${reward}${cleared ? ' · 可远征' : ' · 首次挑战'}</div>
                ${activeExp ? `<div class="challenge-row-timer">⏱ 远征中 ${timeLeft}s</div>` : ''}
            </div>
            <div class="challenge-row-actions">
                <button class="modal-btn primary challenge-row-btn challenge-row-primary"
                    ${activeExp ? 'style="opacity:0.45;pointer-events:none;"' : ''}>
                    挑战
                </button>
                ${cleared ? `
                <button class="modal-btn secondary challenge-row-btn challenge-row-expedition"
                    ${activeExp ? 'style="opacity:0.45;pointer-events:none;"' : ''}>
                    ${activeExp ? '远征中' : '远征'}
                </button>
                ` : ''}
            </div>
        `;
        const challengeBtn = row.querySelector('.challenge-row-primary');
        const expeditionBtn = row.querySelector('.challenge-row-expedition');
        // 远征模式：无论是否在远征中，完全隐藏“挑战”按钮
        if (G.challengeListMode === 'expedition' && challengeBtn) {
            challengeBtn.style.display = 'none';
        }
        if (!activeExp) {
            const mode = G.challengeListMode || 'challenge';
            const isLatest = level === G.chCount && !cleared;
            const lockedByKills = isLatest && G.killCount < G.killTarget;

            if (mode === 'challenge') {
                // 顶部进度条入口：正常挑战逻辑（受击杀进度限制）
                if (lockedByKills) {
                    challengeBtn.textContent = `击杀 ${G.killCount}/${G.killTarget}`;
                    challengeBtn.disabled = true;
                    challengeBtn.style.opacity = '0.5';
                    challengeBtn.onclick = null;
                } else {
                    challengeBtn.disabled = false;
                    challengeBtn.style.opacity = '1';
                    challengeBtn.onclick = () => {
                        $('modal-challenge-list').classList.add('hidden');
                        startChallenge(level);
                    };
                }
            } else {
                // 右下角“远征”入口：列表中不再提供任何挑战相关按钮
                challengeBtn.style.display = 'none';
            }

            // 远征按钮：只有已完成的关卡才有
            if (expeditionBtn) {
                expeditionBtn.disabled = false;
                expeditionBtn.style.opacity = activeExp ? '0.5' : '1';
                expeditionBtn.onclick = () => openExpedition(level);
            }
        }
        body.appendChild(row);
    });
}

$('challenge-list-close-btn').onclick = () => $('modal-challenge-list').classList.add('hidden');

// ---- EXPEDITION ----
let expeditionLevel = 0;
let expeditionSelectedIdxs = []; // indices into eligible hero list

function openExpedition(level) {
    expeditionLevel = level;
    expeditionSelectedIdxs = [];
    $('expedition-level-name').textContent = `第 ${level} 关`;
    $('expedition-reward-text').textContent = `💰 ${100 + level * 50}`;
    $('expedition-selected-count').textContent = '0';
    renderExpeditionHeroList();
    $('modal-expedition').classList.remove('hidden');
}

function renderExpeditionHeroList() {
    const list = $('expedition-hero-list');
    list.innerHTML = '';
    // 可选：所有未在战斗中的英雄
    const eligible = G.heroes
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => h.state !== 'fighting');

    if (eligible.length === 0) {
        list.innerHTML = '<div style="text-align:center;opacity:0.5;padding:20px;">没有可用的英雄（英雄均在战斗中）</div>';
        return;
    }

    eligible.forEach(({ h, i }) => {
        const isSelected = expeditionSelectedIdxs.includes(i);
        const div = document.createElement('div');
        div.className = `roster-item${isSelected ? ' selected' : ''}`;
        div.style.cssText = 'font-size:1.5rem;width:46px;height:46px;';
        div.textContent = h.icon;
        div.onclick = () => {
            if (isSelected) {
                expeditionSelectedIdxs = expeditionSelectedIdxs.filter(idx => idx !== i);
            } else if (expeditionSelectedIdxs.length < 2) {
                expeditionSelectedIdxs.push(i);
            }
            $('expedition-selected-count').textContent = expeditionSelectedIdxs.length;
            renderExpeditionHeroList();
        };
        list.appendChild(div);
    });
}

$('expedition-confirm-btn').onclick = () => {
    if (expeditionSelectedIdxs.length !== 2) return alert('请选择 2 名英雄！');
    // 从大到小 splice，避免索引错位
    const sorted = [...expeditionSelectedIdxs].sort((a, b) => b - a);
    const expHeroes = sorted.map(idx => G.heroes.splice(idx, 1)[0]);

    G.expeditions.push({
        heroes: expHeroes,
        level: expeditionLevel,
        endTime: Date.now() + 30000,
        reward: { gold: 100 + expeditionLevel * 50 }
    });

    $('modal-expedition').classList.add('hidden');
    $('modal-challenge-list').classList.add('hidden');

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `🗺️ ${expHeroes.map(h => h.icon).join(' ')} 出发远征第 ${expeditionLevel} 关！`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

$('expedition-cancel-btn').onclick = () => $('modal-expedition').classList.add('hidden');

function updateExpeditions() {
    const now = Date.now();
    G.expeditions = G.expeditions.filter(exp => {
        if (now < exp.endTime) return true;
        // 远征完成：英雄归队，发放奖励
        exp.heroes.forEach(h => {
            h.state = 'walking';
            h.pathT = BLDS[BARRACKS_BLD_IDX].exitT;
            h.nextBldIdx = BARRACKS_BLD_IDX + 1;
            h.currentBld = null;
            G.heroes.push(h);
        });
        G.gold += exp.reward.gold;
        // 远征奖励：5个核心 + 1张随机护甲图纸（如果还没有）
        G.armorCores += 5;
        const roles = ['warrior', 'archer', 'mage', 'knight'];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        G.armorBlueprints[randomRole] = (G.armorBlueprints[randomRole] || 0) + 1;
        renderUI();
        const rewardText = `💰 ${exp.reward.gold} + 💎 5核心 + 📜 1图纸`;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = `🎉 远征完成！${exp.heroes.map(h => h.icon).join(' ')} 归队，获得 ${rewardText}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
        return false;
    });
}

$('challenge-btn').onclick = () => {
    // 右下角：远征模式，只能做远征，不能挑战
    G.challengeListMode = 'expedition';
    openChallengeList();
};
$('top-challenge-btn') && ($('top-challenge-btn').onclick = () => {
    // 顶部按钮：直接挑战当前最高关卡（不再弹出列表）
    startChallenge(G.chCount);
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

// ---- FORGING SYSTEM ----
let F = {
    state: 'idle',
    clicks: 10,
    progress: 0,
    targetMin: 60,
    targetMax: 80,
    decayRate: 40,
    strikeBoost: 25,
    newEquip: null,
    selectedIdx: 0
};

// 打开武器铺（V2 UI）
function openWeaponShop() {
    const modal = $('modal-weapon');
    if (modal) modal.classList.remove('hidden');
    renderWeaponShop();
}

function switchWeaponTab(tab) {
    // No-op: tabs merged into unified view
}

// Tab buttons removed: tabs merged into unified view

// 职业筛选按钮事件
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.ws-role-btn');
    if (!btn) return;
    const role = btn.dataset.role;
    if (!role || !ROLES.includes(role)) return;
    F.roleFilter = role;
    document.querySelectorAll('.ws-role-btn').forEach(b => {
        b.classList.toggle('ws-role-btn-active', b === btn);
    });
    // 切换职业后，重置选中索引到该职业的第一条配方
    const firstIdx = G.recipes.findIndex(r => (r.role || 'warrior') === role);
    if (firstIdx >= 0) {
        F.selectedIdx = firstIdx;
        G.activeRecipeIdx = firstIdx;
    }
    renderInventory();
});

function renderInventory() {
    const list = $('weap-inv-list');
    list.innerHTML = '';
    // 配方栏只显示当前职业的配方列表
    G.recipes.forEach((recipe, idx) => {
        if (recipe.role && recipe.role !== F.roleFilter) return;
        const div = document.createElement('div');
        div.className = `inv-item q${recipe.q}` + (idx === F.selectedIdx ? ' selected' : '');
        div.innerHTML = `
            <span>${recipe.icon}</span>
            <span class="inv-item-lv">Lv.${recipe.lv}</span>
        `;
        // 标记当前选中的配方
        if (idx === G.activeRecipeIdx) {
            div.innerHTML += `<div class="inv-item-active-mark">选</div>`;
        }
        div.onclick = () => { F.selectedIdx = idx; renderInventory(); };
        list.appendChild(div);
    });
    renderWeaponShop();
}

function renderEqStats(eq, prefix) {
    if (!$(`${prefix}-name`)) return;
    $(`${prefix}-name`).textContent = eq.name;
    $(`${prefix}-name`).className = `equip-name q${eq.q}`;
    const iconEl = document.querySelector(`#${prefix}-card .equip-icon`);
    if (iconEl) {
        iconEl.textContent = eq.icon;
        iconEl.className = `equip-icon q${eq.q}`;
    }
    $(`${prefix}-lv`).textContent = eq.lv;

    // 使用统一战斗力公式
    const pwr = calcEquipPower(eq);
    if ($(`${prefix}-power`)) $(`${prefix}-power`).textContent = pwr;

    if ($(`${prefix}-atk`)) $(`${prefix}-atk`).textContent = eq.atk;
    if ($(`${prefix}-hp`)) $(`${prefix}-hp`).textContent = eq.hp;

    let subBox = $(`${prefix}-subs`);
    if (subBox) {
        subBox.innerHTML = '';
        if (!eq.subs || eq.subs.length === 0) {
            subBox.innerHTML = '<div class="stat-row sub-stat"><span>无副词条</span></div>';
        } else {
            eq.subs.forEach(s => {
                let sfx = s.isPct ? '%' : '';
                subBox.innerHTML += `<div class="stat-row sub-stat"><span>${s.name}</span><span>${s.val}${sfx}</span></div>`;
            });
        }
    }
}

function renderWeaponShop() {
    const selRecipe = G.recipes[F.selectedIdx]; // 选中的配方（用于铸造）
    const mold = G.mold; // 当前模具

    // --- Upper: show CURRENT MOLD ---
    if (mold) {
        // Icon box
        const iconBox = $('ws-icon-box');
        if (iconBox) { iconBox.textContent = mold.icon; iconBox.className = `ws-icon-box q${mold.q}`; }
        // Name & Level
        const nameEl = $('weap-curr-name');
        if (nameEl) { nameEl.textContent = mold.name; nameEl.className = `ws-equip-name q${mold.q}`; }
        const lvEl = $('weap-curr-lv');
        if (lvEl) lvEl.textContent = mold.lv;
        // Stats
        const atkEl = $('weap-curr-atk'); if (atkEl) atkEl.textContent = mold.atk;
        const hpEl = $('weap-curr-hp'); if (hpEl) hpEl.textContent = mold.hp;
        const subsEl = $('weap-curr-subs');
        if (subsEl) {
            if (!mold.subs || mold.subs.length === 0) {
                subsEl.innerHTML = '<div class="stat-row sub-stat"><span>无副词条</span></div>';
            } else {
                subsEl.innerHTML = mold.subs.map(s => `<div class="stat-row sub-stat"><span>${s.name}</span><span>${s.val}${s.isPct ? '%' : ''}</span></div>`).join('');
            }
        }
        // Auto forge cost badge：每级 +10
        const afCost = mold.lv * 10;
        const afCostEl = $('af-cost-val');
        if (afCostEl) afCostEl.textContent = `💠 ${afCost}`;
    }

    // --- Lower: selected recipe costs (for manual forge) ---
    if (selRecipe) {
        const costGold = selRecipe.lv * 10;
        const costMat = 10;
        const goldEl = $('weap-cost-gold');
        if (goldEl) goldEl.textContent = costGold;

        const matCount = G.materials[selRecipe.lv] || 0;
        const oriEl = $('weap-cost-ori');
        if (oriEl) {
            oriEl.textContent = `${matCount}/${costMat}`;
            oriEl.style.color = matCount >= costMat ? '' : '#f87171';
        }

        // 模具熟练度显示
        const profFill = $('weap-prof-fill');
        if (profFill) profFill.style.width = (G.shopProfLv * 20) + '%'; // 简化显示
        const profText = $('weap-prof-text');
        if (profText) profText.textContent = `Lv.${G.shopProfLv}`;
    }

    // --- Set Active Recipe Button ---
    const activeBtn = $('weapon-set-active-btn');
    if (activeBtn) {
        if (F.selectedIdx === G.activeRecipeIdx) {
            activeBtn.textContent = '✅ 当前选中配方';
            activeBtn.disabled = true;
            activeBtn.style.opacity = '0.5';
        } else {
            activeBtn.textContent = '设为当前配方';
            activeBtn.disabled = false;
            activeBtn.style.opacity = '1';
        }
    }

    // --- Auto Forge Toggle ---（V2 UI 中可能不存在该开关，做空保护）
    const afToggle = $('af-toggle');
    if (afToggle) afToggle.checked = G.autoForge.enabled;

    renderAutoForgeStatus();
}

function renderAutoForgeStatus() {
    const list = $('af-hero-list');
    if (!list) return;
    list.innerHTML = '';
    G.heroes.filter(h => h.state === 'atBuilding' && h.currentBld && h.currentBld.id === 'weapon' && h.forgeTimer > 0).forEach(h => {
        const div = document.createElement('div');
        div.className = 'af-hero-item';
        const pct = (h.forgeTimer / 5000 * 100).toFixed(0);
        div.innerHTML = `
            <span>${h.icon}</span>
            <div class="af-progress-bg"><div class="af-progress-fill" style="width:${pct}%"></div></div>
            <span style="font-size:0.7rem; width:30px; text-align:right">${pct}%</span>
        `;
        list.appendChild(div);
    });
    if (list.innerHTML === '') list.innerHTML = '<div style="text-align:center; opacity:0.4; font-size:0.8rem; padding:10px;">暂无英雄正在铸造</div>';
}

const afToggleGlobal = $('af-toggle');
if (afToggleGlobal) {
    afToggleGlobal.onchange = (e) => {
        G.autoForge.enabled = e.target.checked;
    };
}


const weaponSetActiveBtn = $('weapon-set-active-btn');
if (weaponSetActiveBtn) {
    weaponSetActiveBtn.onclick = () => {
        G.activeRecipeIdx = F.selectedIdx;
        renderInventory();
    };
}

const weaponForgeStartBtn = $('weapon-forge-start-btn');
if (weaponForgeStartBtn) weaponForgeStartBtn.onclick = () => {
    const recipe = G.recipes[F.selectedIdx];
    let costGold = recipe.lv * 10;
    let costMat = 10;

    if (G.gold < costGold || (G.materials[recipe.lv] || 0) < costMat) {
        return alert(`材料不足 (需要 ${costGold} 金币, ${costMat} 个 Lv.${recipe.lv} 地图材料)`);
    }
    G.gold -= costGold;
    G.materials[recipe.lv] -= costMat;
    renderUI();

    // 进入锻打界面，不再需要手动点击“锻打”按钮，改为 2 秒自动锻打过程
    F.state = 'forging';
    F.clicks = 1;
    F.progress = 0;
    F.animTime = 0;
    F.animDur = 1000; // ms
    // 生成本次锻打数值
    F.forgeValue = Math.floor(Math.random() * 100) + 1; // 1~100
    F.greatSuccess = (F.forgeValue >= 90);
    // 显示用的进度值
    F.displayValue = F.forgeValue <= 50 ? F.forgeValue + 30 : F.forgeValue;

    $('weapon-view-main').classList.add('hidden');
    $('weapon-view-forge').classList.remove('hidden');

    // Great success 区域依然展示
    const zone = document.querySelector('.forge-target-zone');
    if (zone) {
        zone.style.bottom = '90%';
        zone.style.height = '10%';
    }
};

// forge-strike-btn 不再需要点击逻辑，改为在开始铸造时自动完成一次锻打

function updateForgeUI() {
    const clicksEl = $('forge-clicks-left');
    if (clicksEl) clicksEl.textContent = F.clicks;
    $('forge-bar-fill').style.height = F.progress + '%';
    $('forge-cursor').style.bottom = F.progress + '%';
}

function updateForgeLogic(dt) {
    if (F.state === 'forging') {
        // 2 秒内缓动到目标值
        F.animTime += dt;
        const t = Math.min(1, F.animTime / (F.animDur || 1000));
        // easeOutQuad 缓动
        const eased = 1 - (1 - t) * (1 - t);
        F.progress = F.displayValue * eased;
        updateForgeUI();
        if (t >= 1) {
            F.state = 'result';
            finishForging();
        }
    }
}

function forgeAffixValue(min, max, prof) {
    // 武器铺熟练等级同时提升属性上下限，每级 +5%
    const boost = 1 + (G.shopProfLv * 0.05);
    const boostedMin = min * boost;
    const boostedMax = max * boost;
    // 在提升后的区间内纯随机
    return Math.floor(boostedMin + (boostedMax - boostedMin) * Math.random());
}

function finishForging() {
    $('weapon-view-forge').classList.add('hidden');
    $('weapon-view-result').classList.remove('hidden');

    let recipe = G.recipes[F.selectedIdx];  // 使用的配方
    let mold = G.mold;  // 当前模具（用于对比显示）
    let greatSuccess = F.greatSuccess;

    // --- Shop Proficiency: always +10, check for level-up ---
    G.shopProf += 10;
    tryUpgradeShopProf();

    // --- Quality upgrade on Great Success ---
    // 新模具品质 = 配方品质；大成功时 +1（白色配方 → 最多绿色模具）
    let baseQ = recipe.q;
    let newQ = greatSuccess ? Math.min(4, baseQ + 1) : baseQ;

    // --- Stat scaling (shopProfLv boosts via forgeAffixValue) ---
    // 使用配方的等级来生成属性
    let rec = getRecipeDef(recipe.lv);
    const maxMult = greatSuccess ? 1.8 : 1.5;

    let nAtk = forgeAffixValue(rec.baseAtk, rec.baseAtk * maxMult, 0);
    let nHp = forgeAffixValue(rec.baseHp, rec.baseHp * maxMult, 0);

    // Sub affixes based on new quality
    let newSubs = [];
    let pool = [...SUB_AFFIX_POOL];
    for (let i = 0; i < newQ; i++) {
        if (pool.length === 0) break;
        let pickIdx = Math.floor(Math.random() * pool.length);
        let subDef = pool.splice(pickIdx, 1)[0];
        let subVal = forgeAffixValue(subDef.min, subDef.max * (greatSuccess ? 1.3 : 1.0), 0);
        newSubs.push({ name: subDef.name, val: subVal, isPct: subDef.isPct, type: subDef.type });
    }

    // 生成新模具（但还未应用到G.mold，等待玩家选择）
    F.newMold = {
        name: recipe.name, icon: recipe.icon,
        lv: recipe.lv, q: newQ,
        atk: nAtk, hp: nHp,
        subs: newSubs,
        prof: 0,
        role: recipe.role || 'warrior'
    };

    // 显示对比：左边是当前模具，右边是新模具
    renderEqStats(mold, 'weap-old');
    renderEqStats(F.newMold, 'weap-new');

    if (greatSuccess) {
        $('forge-result-title').textContent = '🌟 大成功! 新模具品质提升!';
        // Visual toast
        const toast = document.createElement('div');
        toast.className = 'toast great-success-toast';
        toast.innerHTML = '🌟 大成功！新模具品质 +1';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } else {
        $('forge-result-title').textContent = '✨ 新模具打造完成';
    }

    setDiff('weap-new-atk', F.newMold.atk, mold.atk, '');
    setDiff('weap-new-hp', F.newMold.hp, mold.hp, '');

    // Show shop-level proficiency in result UI
    const thresholds = [50, 150, 250, 400, 600];
    const nextThresh = thresholds[G.shopProfLv] ?? 999;
    $('result-prof-add').textContent = '+10';
    $('result-prof-fill').style.width = Math.min(100, G.shopProf / nextThresh * 100) + '%';
    $('result-prof-text').textContent = G.shopProf + '/' + nextThresh + ' (Lv.' + G.shopProfLv + ')';

    // 回收价值基于新模具
    let recycleGold = F.newMold.lv * 20 * (F.newMold.q + 1);
    $('recycle-gold-val').textContent = recycleGold;
}

function setDiff(id, newVal, oldVal, suffix) {
    let el = $(id);
    el.textContent = newVal + suffix;
    el.className = newVal > oldVal ? 'stat-up' : (newVal < oldVal ? 'stat-down' : '');
    if (newVal > oldVal) el.textContent += ' ↑';
    else if (newVal < oldVal) el.textContent += ' ↓';
}

function autoSelectBestRecipe() {
    let bestIdx = 0, bestLv = -1;
    G.recipes.forEach((r, i) => { if (r.lv > bestLv) { bestLv = r.lv; bestIdx = i; } });
    F.selectedIdx = bestIdx;
    G.activeRecipeIdx = bestIdx;
}

const weaponKeepOldBtn = $('weapon-keep-old-btn');
if (weaponKeepOldBtn) {
    weaponKeepOldBtn.onclick = () => {
        // 保留旧模具，新模具被回收获得金币
        G.gold += F.newMold.lv * 20 * (F.newMold.q + 1);
        autoSelectBestRecipe();
        renderUI();
        openWeaponShop();
    };
}
const weaponEquipNewBtn = $('weapon-equip-new-btn');
if (weaponEquipNewBtn) {
    weaponEquipNewBtn.onclick = () => {
        // 计算模具战斗力变化
        const oldPwr = G.mold ? calcEquipPower(G.mold) : 0;
        const newPwr = calcEquipPower(F.newMold);
        const diff = newPwr - oldPwr;
        // 替换模具
        G.mold = F.newMold;
        autoSelectBestRecipe();
        renderUI();
        $('modal-weapon').classList.add('hidden');
        // 在界面中央显示战斗力变化大提示
        if (diff !== 0) showPowerBanner(F.newMold.icon, diff);
    };
}

const weaponCloseBtn = $('weapon-close-btn');
if (weaponCloseBtn) weaponCloseBtn.onclick = () => $('modal-weapon').classList.add('hidden');

// ---- CRYSTAL MINE LOGIC ----
function updateCrystalMine(dt) {
    // 产出周期随等级缩短，每级加快30%
    const cycleTime = 3000 / (1 + (G.crystalMineLv - 1) * 0.3);
    G.crystalMineTimer += dt;
    if (G.crystalMineTimer >= cycleTime) {
        G.crystalMineTimer -= cycleTime;
        G.crystals += G.crystalMineLv; // 等级即产量
        renderUI();
    }
    if (!$('modal-crystalmine').classList.contains('hidden')) renderCrystalMine();
}

// ---- STEEL MILL LOGIC ----
function updateEconomy(dt) {
    // Automated Steel Production (Steel Mill)
    const refineTime = 2000 / (1 + (G.steelMillLv - 1) * 0.2);
    G.refineTimer += dt;
    if (G.refineTimer >= refineTime) {
        G.refineTimer = 0;
        // Production rate scales with level
        const production = 5 + Math.floor(G.steelMillLv * 2);
        G.ori += production;
        renderUI();
        if (!$('modal-steelmill').classList.contains('hidden')) renderSteelMill();
    }
    
    // 精炼厂：产出精华
    const essenceCycleTime = 3000 / (1 + (G.refineLv - 1) * 0.25); // 每级加快25%
    G.essenceTimer += dt;
    if (G.essenceTimer >= essenceCycleTime) {
        G.essenceTimer -= essenceCycleTime;
        G.essence += G.refineLv; // 等级即产量
        renderUI();
        if (!$('modal-refinery').classList.contains('hidden')) renderRefinery();
    }
}

function renderSteelMill() {
    $('mill-lv-val').textContent = G.steelMillLv;
    const refineTime = 2000 / (1 + (G.steelMillLv - 1) * 0.2);
    $('mill-speed-val').textContent = (1000 / refineTime).toFixed(2);
    const upgradeCost = Math.floor(500 * Math.pow(1.5, G.steelMillLv - 1));
    $('mill-upgrade-cost').textContent = upgradeCost;

    const fill = $('refine-progress-fill');
    if (fill) fill.style.width = (G.refineTimer / refineTime * 100) + '%';

    const list = $('refine-list');
    list.innerHTML = `
        <div style="text-align:center; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
            <div style="color:var(--gold); font-size:1.1rem; font-weight:bold;">🚀 自动化生产中</div>
            <div style="font-size:0.8rem; opacity:0.8; margin-top:5px;">当前预计产出: <span style="color:#fff;">${5 + Math.floor(G.steelMillLv * 2)}</span> 钢材/周期</div>
        </div>
    `;
}

function openSteelMill() {
    $('modal-steelmill').classList.remove('hidden');
    renderSteelMill();
}

$('mill-upgrade-btn').onclick = () => {
    const cost = Math.floor(500 * Math.pow(1.5, G.steelMillLv - 1));
    if (G.gold < cost) return alert('金币不足！');
    G.gold -= cost;
    G.steelMillLv++;
    renderUI();
    renderSteelMill();
};

$('steelmill-close-btn').onclick = () => $('modal-steelmill').classList.add('hidden');

// Hook into building click (needs finding bridge between BLDS and open functions)
// Actually, earlier in main.js onmousedown handles building clicks. 
// Let's find where hospital/weapon/etc are opened and add steelmill.

updateSummonBar();
renderUI();
requestAnimationFrame(loop);

// ============================================================
// 晶石矿场 弹窗
// ============================================================
function crystalMineUpgradeCost() {
    return Math.floor(200 * Math.pow(1.5, G.crystalMineLv - 1));
}

function renderCrystalMine() {
    $('cmine-lv').textContent = G.crystalMineLv;
    const cycleTime = 3000 / (1 + (G.crystalMineLv - 1) * 0.3);
    $('cmine-rate').textContent = G.crystalMineLv;
    $('cmine-cycle').textContent = (1000 / cycleTime).toFixed(2);
    $('cmine-cost').textContent = crystalMineUpgradeCost();
    if ($('cmine-crystals')) $('cmine-crystals').textContent = Math.floor(G.crystals);
    const fill = $('cmine-progress-fill');
    if (fill) fill.style.width = Math.min(100, G.crystalMineTimer / cycleTime * 100) + '%';
}

function openCrystalMine() {
    renderCrystalMine();
    $('modal-crystalmine').classList.remove('hidden');
}

$('cmine-upgrade-btn').onclick = () => {
    const cost = crystalMineUpgradeCost();
    if (G.gold < cost) { alert('金币不足！需要 ' + cost + ' 💰'); return; }
    G.gold -= cost;
    G.crystalMineLv++;
    renderCrystalMine();
    renderUI();
};

$('cmine-close-btn').onclick = () => $('modal-crystalmine').classList.add('hidden');

// ============================================================
// 增益铺老虎机 弹窗
// ============================================================
function getSlotCost() {
    return 1 + Math.floor(G.slotUses / 10);
}

function renderSlotMachine(results, atkGain, hpGain) {
    $('sm-crystals').textContent = Math.floor(G.crystals);
    $('sm-cost').textContent = getSlotCost();
    $('sm-acc-atk').textContent = G.buffAccAtk;
    $('sm-acc-hp').textContent = G.buffAccHp;
    $('sm-spin-cost').textContent = getSlotCost();
    if (results) {
        const icons = { atk: '⚔️', hp: '❤️' };
        // 计算哪种类型触发了倍率（只有3连才触发倍率和特效）
        const nAtk = results.filter(r => r === 'atk').length;
        const nHp  = results.filter(r => r === 'hp').length;
        const winType = nAtk === 3 ? 'atk' : (nHp === 3 ? 'hp' : null);
        const winMult = winType ? 3 : 0;  // 只有3连才算中奖

        for (let i = 0; i < 3; i++) {
            const reel = $('sm-reel-' + i);
            reel.textContent = icons[results[i]];
            // 清除旧特效
            reel.classList.remove('spinning', 'reel-win2', 'reel-win3');
            void reel.offsetWidth;
            // 是否为中奖槽位（只有3连才高亮）
            if (winMult === 3 && results[i] === winType) {
                reel.classList.add('reel-win3');
            } else {
                reel.classList.add('spinning');
            }
        }
        const parts = [];
        if (atkGain > 0) parts.push('⚔️ +' + atkGain);
        if (hpGain > 0) parts.push('❤️ +' + hpGain);
        $('sm-result').textContent = parts.length ? '本次获得: ' + parts.join('  ') : '本次无获益';
        $('sm-result').style.color = parts.length ? '#a78bfa' : '#6b7280';

        // 中奖特效（只有3连才显示，倍率为X2）
        if (winMult === 3) {
            showSlotWin(2, 3, winType, winType === 'atk' ? atkGain : hpGain);  // 倍率X2，3连
        }
    } else {
        // 重置槽位外观
        for (let i = 0; i < 3; i++) {
            const reel = $('sm-reel-' + i);
            reel.classList.remove('spinning', 'reel-win2', 'reel-win3');
        }
        $('sm-result').textContent = '旋转老虎机获得增益加成！';
        $('sm-result').style.color = '#9ca3af';
    }
}

// 老虎机中奖特效：在弹窗内显示大横幅
// mult: 倍率（2表示X2），combo: 连击数（3表示三连）
let _slotWinTimer = null;
function showSlotWin(mult, combo, type, gain) {
    const banner = $('sm-win-banner');
    if (!banner) return;
    // 清除上一次定时器
    if (_slotWinTimer) { clearTimeout(_slotWinTimer); _slotWinTimer = null; }

    const typeLabel = type === 'atk' ? '⚔️ 攻击' : '❤️ 生命';
    const multLabel = combo === 3 ? '× 2  三连！' : '× 2  二连！';  // V1: 3连X2，2连无倍率（不会触发特效）
    const sign      = type === 'atk' ? '+' + gain : '+' + gain;

    banner.innerHTML = `
        <div class="sm-win-mult sm-win-mult--${mult}">${combo === 3 ? '🎆' : '✨'} ${multLabel}</div>
        <div class="sm-win-sep"></div>
        <div class="sm-win-gain">${typeLabel} <strong>${sign}</strong></div>`;
    banner.className = 'sm-win-banner sm-win-banner--' + mult;
    banner.classList.remove('hidden');

    // 3连时：让槽位区震动（不震整个弹窗，避免闪关）
    if (combo === 3) {
        const wrap = $('sm-reels-wrap');
        if (wrap) {
            wrap.classList.remove('shake3');
            void wrap.offsetWidth;
            wrap.classList.add('shake3');
            setTimeout(() => wrap.classList.remove('shake3'), 500);
        }
    }

    // 自动淡出
    _slotWinTimer = setTimeout(() => {
        banner.classList.add('sm-win-banner--fade');
        setTimeout(() => { banner.classList.add('hidden'); banner.classList.remove('sm-win-banner--fade'); }, 500);
    }, combo === 3 ? 2200 : 1600);
}

function openSlotMachine() {
    renderSlotMachine(null, 0, 0);
    $('modal-slotmachine').classList.remove('hidden');
}

$('sm-spin-btn').onclick = () => {
    const cost = getSlotCost();
    if (G.crystals < cost) {
        $('sm-result').textContent = '增益晶石不足！需要 ' + cost + ' 🔮';
        $('sm-result').style.color = '#f87171';
        return;
    }
    G.crystals -= cost;
    G.slotUses++;

    // 三个槽位随机：攻击 or 生命
    const types = ['atk', 'hp'];
    const results = [
        types[Math.floor(Math.random() * 2)],
        types[Math.floor(Math.random() * 2)],
        types[Math.floor(Math.random() * 2)],
    ];

    const nAtk = results.filter(r => r === 'atk').length;
    const nHp  = results.filter(r => r === 'hp').length;

    // 公式：count个同类型
    // 1个：base
    // 2个：2 * base（无倍率）
    // 3个：3 * base * 2（X2倍率）
    function slotContrib(count, base) {
        if (count === 0) return 0;
        if (count === 1) return base;
        if (count === 2) return 2 * base;  // 2连无倍率
        if (count === 3) return 3 * base * 2;  // 3连X2倍率
        return 0;
    }
    const atkGain = slotContrib(nAtk, 2);
    const hpGain  = slotContrib(nHp, 10);

    G.buffAccAtk += atkGain;
    G.buffAccHp  += hpGain;

    renderSlotMachine(results, atkGain, hpGain);
    renderUI();

    // 显示大的战斗力增量提示（老虎机获得属性的战力等价）
    const powerEq = atkGain * 10 + hpGain;
    if (powerEq > 0) {
        const typeLabel = atkGain > 0 && hpGain > 0 ? '✨'
            : atkGain > 0 ? '⚔️' : '❤️';
        showPowerBanner(typeLabel, powerEq, '增益铺强化');
    }
};

$('sm-close-btn').onclick = () => $('modal-slotmachine').classList.add('hidden');

// ---- ARMOR SHOP LOGIC ----
let currentArmorRole = 'warrior';

function openArmorShop() {
    currentArmorRole = 'warrior';
    bindArmorRoleButtons();
    renderArmorShop();
    const modal = $('modal-armor');
    if (modal) modal.classList.remove('hidden');
}

function renderArmorShop() {
    const armor = G.armors[currentArmorRole];
    if (!armor) return;

    // 更新资源显示
    const essenceEl = $('armor-essence-display');
    if (essenceEl) essenceEl.textContent = Math.floor(G.essence);
    const coresEl = $('armor-cores-display');
    if (coresEl) coresEl.textContent = G.armorCores;
    // 更新四种职业图纸数量
    const bp = G.armorBlueprints;
    const bpW = $('armor-bp-warrior'); if (bpW) bpW.textContent = bp.warrior || 0;
    const bpA = $('armor-bp-archer'); if (bpA) bpA.textContent = bp.archer || 0;
    const bpM = $('armor-bp-mage');   if (bpM) bpM.textContent = bp.mage || 0;
    const bpK = $('armor-bp-knight'); if (bpK) bpK.textContent = bp.knight || 0;

    // 计算当前属性
    const enhanceMult = 1 + armor.enhanceLv * 0.1;
    const tierMult = 1 + armor.tier * 0.5;
    const finalDef = Math.floor(armor.def * enhanceMult * tierMult);
    const finalHp = Math.floor(armor.hp * enhanceMult * tierMult);

    // 更新等级显示（Lv = 强化等级 + 1）
    const lvEl = $('armor-lv-display');
    if (lvEl) lvEl.textContent = armor.enhanceLv + 1;

    // 更新护甲图标和名称（图标外框根据品阶变化）
    const iconEl = $('armor-icon-display');
    if (iconEl) {
        iconEl.textContent = armor.icon;
        iconEl.className = 'armor-icon-display armor-tier-' + Math.min(armor.tier, 4);
    }
    const nameEl = $('armor-name-display');
    if (nameEl) nameEl.textContent = armor.name;

    // 更新属性显示
    const defStatEl = $('armor-stat-def');
    if (defStatEl) {
        const span = defStatEl.querySelector('.stat-value span');
        if (span) span.textContent = finalDef.toLocaleString();
    }
    const hpStatEl = $('armor-stat-hp');
    if (hpStatEl) {
        const span = hpStatEl.querySelector('.stat-value span');
        if (span) span.textContent = finalHp.toLocaleString();
    }
    const enhanceStatEl = $('armor-stat-enhance');
    if (enhanceStatEl) {
        const span = enhanceStatEl.querySelector('.stat-value span');
        if (span) span.textContent = armor.enhanceLv;
    }

    // 更新效果文本
    const effectEl = $('armor-effect-text');
    if (effectEl) {
        let effectText = '为英雄提供防御和生命值加成';
        if (armor.tier > 0) {
            effectText = `为英雄提供防御和生命值加成\n进阶等级 T${armor.tier}`;
        }
        effectEl.innerHTML = effectText.replace(/\n/g, '<br>');
    }

    // 更新进度条（基于强化等级）
    const progressFill = $('armor-progress-fill');
    if (progressFill) {
        const progress = (armor.enhanceLv / 10) * 100;
        progressFill.style.width = Math.min(100, progress) + '%';
    }

    // 更新主按钮（强化 / 进阶 互斥）
    const enhanceCost = 1 + armor.enhanceLv * 5; // 初始 1 点精华
    const enhanceCostEl = $('armor-enhance-cost');
    if (enhanceCostEl) enhanceCostEl.textContent = enhanceCost;

    const mainBtn = $('armor-main-btn');
    const mainTextEl = $('armor-main-text');

    const advanceCoreCost = 10 + armor.tier * 5;
    const advanceCoreCostEl = $('armor-advance-core-cost');
    if (advanceCoreCostEl) advanceCoreCostEl.textContent = advanceCoreCost;

    const bpCount = G.armorBlueprints[currentArmorRole] || 0;
    const canAdvance = armor.enhanceLv >= 10 && bpCount > 0 && G.armorCores >= advanceCoreCost;

    if (mainBtn && mainTextEl) {
        if (armor.enhanceLv < 10) {
            mainBtn.disabled = G.essence < enhanceCost;
            mainTextEl.textContent = `强化 (${enhanceCost} 💎)`;
        } else {
            mainBtn.disabled = !canAdvance;
            if (bpCount <= 0) {
                mainTextEl.textContent = '进阶 (需要图纸)';
            } else if (G.armorCores < advanceCoreCost) {
                mainTextEl.textContent = '进阶 (核心不足)';
            } else {
                mainTextEl.textContent = `进阶 (${advanceCoreCost} 💎核心 + 图纸)`;
            }
        }
    }

    // 更新职业按钮状态
    document.querySelectorAll('.tab-button[data-role]').forEach(btn => {
        if (btn.dataset.role === currentArmorRole) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 职业切换（使用事件委托，在弹窗打开时绑定）
let armorRoleBtnsBound = false;
function bindArmorRoleButtons() {
    if (armorRoleBtnsBound) return;
    document.querySelectorAll('#modal-armor .tab-button[data-role]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentArmorRole = btn.dataset.role;
            renderArmorShop();
        });
    });
    armorRoleBtnsBound = true;
}

// 主按钮：强化 / 进阶
const mainBtnEl = $('armor-main-btn');
if (mainBtnEl) mainBtnEl.onclick = () => {
    const armor = G.armors[currentArmorRole];
    if (!armor) return;

    // 强化阶段
    if (armor.enhanceLv < 10) {
        const batchCheckbox = $('armor-batch-enhance');
        const isBatch = batchCheckbox && batchCheckbox.checked;
        const maxTimes = isBatch ? 1000 : 1;

        let times = 0;
        let totalCost = 0;

        for (let i = 0; i < maxTimes && armor.enhanceLv < 10; i++) {
            const cost = 1 + armor.enhanceLv * 5;
            if (G.essence < cost) break;
            G.essence -= cost;
            armor.enhanceLv++;
            totalCost += cost;
            times++;
        }

        if (times === 0) {
            alert('精华不足！');
            return;
        }

        renderArmorShop();
        renderUI();
        const toast = document.createElement('div');
        toast.className = 'toast';
        if (times === 1) {
            toast.textContent = `✨ ${armor.name} 强化至 +${armor.enhanceLv} 级！`;
        } else {
            toast.textContent = `✨ ${armor.name} 批量强化 ${times} 次，消耗 ${totalCost} 💎！`;
        }
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        return;
    }

    // 进阶阶段
    const cost = 10 + armor.tier * 5;
    const bpCount = G.armorBlueprints[currentArmorRole] || 0;
    if (bpCount <= 0) {
        alert('没有对应图纸！');
        return;
    }
    if (G.armorCores < cost) {
        alert('核心不足！');
        return;
    }

    G.armorCores -= cost;
    G.armorBlueprints[currentArmorRole] = bpCount - 1;
    armor.tier++;
    armor.enhanceLv = 0; // 进阶后重置强化等级
    // 每次进阶：品阶+1，当前属性 *1.1（向下取整）
    armor.def = Math.floor(armor.def * 1.1);
    armor.hp = Math.floor(armor.hp * 1.1);
    renderArmorShop();
    renderUI();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `🎉 ${armor.name} 进阶至 T${armor.tier}！`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

const armorCloseBtn = $('armor-close-btn');
if (armorCloseBtn) armorCloseBtn.onclick = () => {
    const modal = $('modal-armor');
    if (modal) modal.classList.add('hidden');
};

// ---- REFINERY LOGIC ----
function openRefinery() {
    renderRefinery();
    const modal = $('modal-refinery');
    if (modal) modal.classList.remove('hidden');
}

function renderRefinery() {
    const lvEl = $('refinery-lv-val');
    if (lvEl) lvEl.textContent = G.refineLv;
    const cycleTime = 3000 / (1 + (G.refineLv - 1) * 0.25);
    const speedEl = $('refinery-speed-val');
    if (speedEl) speedEl.textContent = (G.refineLv / (cycleTime / 1000)).toFixed(2);
    const upgradeCost = Math.floor(300 * Math.pow(1.5, G.refineLv - 1));
    const costEl = $('refinery-upgrade-cost');
    if (costEl) costEl.textContent = upgradeCost;

    const fill = $('refinery-progress-fill');
    if (fill) fill.style.width = (G.essenceTimer / cycleTime * 100) + '%';
}

const refineryUpgradeBtn = $('refinery-upgrade-btn');
if (refineryUpgradeBtn) refineryUpgradeBtn.onclick = () => {
    const cost = Math.floor(300 * Math.pow(1.5, G.refineLv - 1));
    if (G.gold < cost) {
        alert('金币不足！');
        return;
    }
    G.gold -= cost;
    G.refineLv++;
    renderRefinery();
    renderUI();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = `⚗️ 精炼厂升级至 Lv.${G.refineLv}！`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

const refineryCloseBtn = $('refinery-close-btn');
if (refineryCloseBtn) refineryCloseBtn.onclick = () => {
    const modal = $('modal-refinery');
    if (modal) modal.classList.add('hidden');
};

// ---- WEAPON SHOP LEVEL OVERVIEW (V2 移植) ----
function openShopLevelSelector() {
    renderShopLevels();
    const modal = $('modal-shop-levels');
    if (modal) modal.classList.remove('hidden');
}

function renderShopLevels() {
    const listEl = $('shop-level-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const fields = [
        { key: 'swordsmanAtkBonus', name: '长剑攻击' },
        { key: 'swordsmanCrit', name: '长剑暴击', isPct: true },
        { key: 'swordsmanCritDmg', name: '长剑暴伤', isPct: true },
        { key: 'swordsmanLifesteal', name: '长剑吸血', isPct: true },

        { key: 'archerAtkBonus', name: '长弓攻击' },
        { key: 'archerCrit', name: '长弓暴击', isPct: true },
        { key: 'archerCritDmg', name: '长弓暴伤', isPct: true },
        { key: 'archerLifesteal', name: '长弓吸血', isPct: true },

        { key: 'staffAtkBonus', name: '法杖攻击' },
        { key: 'staffCrit', name: '法杖暴击', isPct: true },
        { key: 'staffCritDmg', name: '法杖暴伤', isPct: true },
        { key: 'staffLifesteal', name: '法杖吸血', isPct: true },

        { key: 'spearAtkBonus', name: '长枪攻击' },
        { key: 'spearCrit', name: '长枪暴击', isPct: true },
        { key: 'spearCritDmg', name: '长枪暴伤', isPct: true },
        { key: 'spearLifesteal', name: '长枪吸血', isPct: true }
    ];

    let html = '<div style="display: flex; flex-direction: column; gap: 12px; height: 100%; overflow-y: auto; padding-right: 10px;">';
    fields.forEach(f => {
        const val = G.gridOffsets[f.key] || 0;
        const color = val > 0 ? '#4ade80' : '#94a3b8';
        const valStr = val > 0 ? '+' + val + (f.isPct ? '%' : '') : '0' + (f.isPct ? '%' : '');
        html += `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; font-size: 0.9rem;">
                <span style="color: #cbd5e1;">${f.name}</span>
                <span style="color: ${color}; font-weight: bold;">${valStr}</span>
            </div>
        `;
    });
    html += '</div>';
    listEl.innerHTML = html;
}
