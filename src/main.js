import './style.css';
import * as XLSX from 'xlsx';
import * as echarts from 'echarts';

// ── Main bar config (editable) ──────────────────────────────
let TOTAL_DAYS = 3;
let MIN_PER_DAY = 60;           // minutes per day
let TOTAL_MIN = TOTAL_DAYS * MIN_PER_DAY;

// ── Chapter definitions ───────────────────────────────────────────────
// Durations = 10 × Fibonacci: 10, 20, 30, 50, 80, 130, 210, 340, 550, 890
const CH_DISPLAY_MAX = 2400;

const CHAPTERS = [
  { id: 1, label: '章节 1', start: 0, end: 10, color: '#10b981' },
  { id: 2, label: '章节 2', start: 10, end: 30, color: '#f59e0b' },
  { id: 3, label: '章节 3', start: 30, end: 60, color: '#ef4444' },
  { id: 4, label: '章节 4', start: 60, end: 110, color: '#a855f7' },
  { id: 5, label: '章节 5', start: 110, end: 190, color: '#ec4899' },
  { id: 6, label: '章节 6', start: 190, end: 320, color: '#14b8a6' },
  { id: 7, label: '章节 7', start: 320, end: 530, color: '#f97316' },
  { id: 8, label: '章节 8', start: 530, end: 870, color: '#06b6d4' },
  { id: 9, label: '章节 9', start: 870, end: 1420, color: '#84cc16' },
  { id: 10, label: '章节 10', start: 1420, end: 2310, color: '#e11d48' },
];

// ── Building definitions ─────────────────────────────────────────────
const BLDG_LEVEL_INTERVAL = 60;
const BLDG_COLOR = '#a78bfa'; // leveled buildings (purple)
const TOWN_HALL_COLOR = '#f59e0b'; // 市政厅 (amber/gold)
const NO_LVL_COLOR = '#22d3ee'; // no-level buildings (cyan)

const BUILDINGS = [
  // sorted by unlockAt
  { id: 'town_hall', name: '市政厅', unlockAt: 0, unlockLabel: '初始' },
  { id: 'med_hall', name: '医馆', unlockAt: 0, unlockLabel: '初始' },
  { id: 'barracks', name: '兵营', unlockAt: 0, unlockLabel: '初始', noLevel: true },
  { id: 'weapon_shop', name: '武器店', unlockAt: 50 / 60, unlockLabel: '关卡1-1（第1章）', noLevel: true },
  { id: 'foundry', name: '熔铸所', unlockAt: 150 / 60, unlockLabel: '关卡1-3（第1章）' },
  { id: 'armor_shop', name: '护甲店', unlockAt: 500 / 60, unlockLabel: '关卡2-4（第2章）', noLevel: true },
  { id: 'tannery', name: '製皮厂', unlockAt: 700 / 60, unlockLabel: '关卡2-8（第2章）' },
  { id: 'temple', name: '祝福圣殿', unlockAt: 20, unlockLabel: '关卡3-6（第3章）', noLevel: true },
  { id: 'crystal', name: '晶石矿场', unlockAt: 25, unlockLabel: '关卡3-12（第3章）' },
];

// ── Feature definitions ─────────────────────────────────────────────
const FEAT_COLOR = '#fbbf24';
const FEATURES = [
  // sorted by unlockAt
  { id: 'tasks', name: '任务', unlockAt: 0, unlockLabel: '初始' },
  { id: 'afk', name: '挂机奖励', unlockAt: 250 / 60, unlockLabel: '关卡1-5（第1章）' },
  { id: 'heroes', name: '英雄', unlockAt: 5, unlockLabel: '关卡2-1（第2章）' },
  { id: 'summon', name: '召唤', unlockAt: 15, unlockLabel: '关卡3-1（第3章）' },
  { id: 'raid', name: '挑战-远征', unlockAt: 30, unlockLabel: '关卡4-1（第4章）', optional: true },
];


// ── Helpers ──────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function fmtMin(min) {
  if (min <= 0) return '未开始';
  if (min < 1) {
    const s = Math.round(min * 60);
    return `${s} 秒`;
  }
  if (min < 60) {
    const m = Math.floor(min);
    const s = Math.round((min - m) * 60);
    return s > 0 ? `${m} ${s} 秒` : `${m} 分钟`;
  }
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return m === 0 ? `${h} 小时` : `${h}h ${m}m`;
}

function fmtUnlock(min) {
  return min === 0 ? '立即' : fmtMin(min);
}

// ── Building configurations for Loop tab ─────────────────────────────
// Only leveled buildings (those with upgrade intervals)
const bldgConfigs = {
  med: { start: 0, interval: BLDG_LEVEL_INTERVAL },
  foundry: { start: 150 / 60, interval: BLDG_LEVEL_INTERVAL },
  tannery: { start: 700 / 60, interval: BLDG_LEVEL_INTERVAL },
  crystal: { start: 25, interval: BLDG_LEVEL_INTERVAL },
};
// Non-leveled buildings: unlock time only (noLevel: true)
const noLevelConfigs = {
  weapon: { unlockAt: 50 / 60 },
  armor: { unlockAt: 500 / 60 },
  temple: { unlockAt: 20 },
  summon: { unlockAt: 15 },
};
// Team slot config
const teamConfig = { base: 4, inc: 1, max: 15 };

// ── State ────────────────────────────────────────────────────────────
let currentMin = 0;
let isDragging = false;

// ── Build tick marks ─────────────────────────────────────────────────
function buildTicks(count) {
  return Array.from({ length: count }, (_, i) => {
    const pct = ((i + 1) / (count + 1) * 100).toFixed(3);
    return `<div class="seg-tick" style="left:${pct}%"></div>`;
  }).join('');
}

// ── HTML ─────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
  <div class="blob" style="width:520px;height:520px;top:-120px;left:-80px;background:rgba(61,90,254,0.15);"></div>
  <div class="blob" style="width:420px;height:420px;bottom:-100px;right:-60px;background:rgba(168,85,247,0.12);"></div>

  <div class="relative z-10 min-h-screen flex w-full">
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col items-center justify-start px-8 py-4 gap-4 h-screen overflow-y-auto" id="main-scroll-area">

      <!-- Header -->
      <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-3xl md:text-4xl text-shimmer">G05 游戏数值 v0.2.0</h1>
    </header>

    <!-- Tab nav -->
    <nav class="tab-nav animate-fade-up" style="animation-delay:0.05s">
      <button class="tab-btn tab-active" onclick="switchTab('overview')" id="tab-btn-overview">总览</button>
      <button class="tab-btn" onclick="switchTab('resources')" id="tab-btn-resources">循环</button>
      <button class="tab-btn" onclick="switchTab('buildings')" id="tab-btn-buildings">建筑</button>
      <button class="tab-btn" onclick="switchTab('unlock')" id="tab-btn-unlock">解锁</button>
      <button class="tab-btn" onclick="switchTab('simulation')" id="tab-btn-simulation">数值</button>
      <button class="tab-btn" onclick="switchTab('analysis')" id="tab-btn-analysis">分析</button>
    </nav>

    <!-- ── OVERVIEW TAB ── -->
    <div id="tab-overview" style="display:flex;flex-direction:column;gap:1.5rem;width:100%;align-items:center">

    <!-- ── Main bar ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.1s">

      <div class="flex items-end justify-between mb-5 gap-6">
        <div>
          <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总进度</p>
          <div id="time-display" class="font-display font-bold text-3xl text-white">未开始</div>
        </div>
        <div class="flex gap-4 items-end">
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">当前（分钟）</p>
            <input type="number" id="input-current" value="0" min="0" class="config-input" style="width:7rem">
          </div>
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总时长（天）</p>
            <input type="number" id="input-days" value="3" min="1" max="60" class="config-input">
          </div>
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">每日时长（分钟）</p>
            <input type="number" id="input-mpd" value="60" min="1" max="480" class="config-input">
          </div>
        </div>
      </div>

      <!-- Segmented bar -->
      <div class="relative" id="bar-root">
        <div id="tooltip" class="time-tooltip" style="display:none;left:0%">
          <span id="tooltip-text">未开始</span>
        </div>

        <div class="seg-track" id="track">
          <div id="seg-container" style="display:contents"></div>
          <div class="seg-overlay" id="overlay"></div>
          <div class="seg-handle" id="handle" style="left:0%" role="slider" tabindex="0"
               aria-valuemin="0" aria-valuemax="${TOTAL_MIN}" aria-valuenow="0"></div>
        </div>

        <!-- Day axis -->
        <div class="relative mt-3 day-axis" id="axis-container"></div>
      </div>
    </section>

    <!-- ── Chapter row ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">

      <div class="flex items-end justify-between mb-4 gap-6">
        <p class="text-white/30 text-sm uppercase tracking-widest font-semibold" style="margin-bottom:0">章节解锁进度</p>
        <div class="flex gap-4 items-end">
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">每关波数</p>
            <input type="number" id="cfg-waves" value="5" min="1" step="1" class="config-input" style="width:5rem">
          </div>
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">每波秒数</p>
            <input type="number" id="cfg-wave-sec" value="10" min="1" step="1" class="config-input" style="width:5rem">
          </div>
        </div>
      </div>

      <!-- Proportional chapter display bar -->
      <div class="chapter-disp-track">
        ${CHAPTERS.map(ch => {
  const w = ((ch.end - ch.start) / CH_DISPLAY_MAX * 100).toFixed(4);
  return `
            <div class="ch-disp-seg" style="width:${w}%;border-color:${ch.color}30;"
                 title="${ch.label}">
              <div class="ch-disp-fill" id="chfill-${ch.id}"
                   style="width:0%;background:${ch.color};"></div>
            </div>`;
}).join('')}
      </div>

      <!-- Chapter cards -->
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3 mt-4" id="chapter-cards"></div>
    </section>

    <!-- ── Building unlock rows ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.3s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">建筑解锁与升级</p>
      <div id="building-rows" class="grid grid-cols-5 md:grid-cols-10 gap-3"></div>
    </section>

    <!-- ── Feature unlock ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.4s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">功能解锁</p>
      <div id="feature-cards" class="grid grid-cols-5 md:grid-cols-10 gap-3"></div>
    </section>

    </div><!-- /tab-overview -->

    <!-- ── BUILDINGS TAB ── -->
    <div id="tab-buildings" style="display:none;flex-direction:column;gap:1.5rem;width:100%;align-items:center">

      

      <!-- Town Hall detail (on top) -->
      <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">建筑升级详情</p>
        <div id="bldg-detail-list" class="flex flex-col gap-4"></div>
      </section>

      <!-- Building upgrade module: cards left 1/3 + chart right 2/3 -->
      <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.1s">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-5 font-semibold">金币产出&消耗</p>
        <div class="bldg-split-layout">
          <div class="bldg-split-left" id="bldg-module-cards"></div>
          <div class="bldg-split-right">
            <div style="position:relative;width:100%;height:100%;min-height:300px">
              <canvas id="bldg-chart" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
            </div>
            <div id="bldg-chart-legend" class="bldg-chart-legend"></div>
          </div>
        </div>
      </section>

      <!-- Resource output module: cards left + chart right -->
      <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.15s">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-5 font-semibold">材料产出</p>
        <div class="bldg-split-layout">
          <div class="bldg-split-left" id="res-module-cards"></div>
          <div class="bldg-split-right">
            <div style="position:relative;width:100%;height:100%;min-height:300px">
              <canvas id="res-chart" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
            </div>
            <div id="res-chart-legend" class="bldg-chart-legend"></div>
          </div>
        </div>
      </section>

      <!-- Combat Power module -->
      <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-5 font-semibold">建筑战力计算</p>
        <div class="bldg-split-layout">
          <div class="bldg-split-left" style="align-items:stretch">
            <div class="bldg-col">
              <!-- Power ratio config -->
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header">
                  <span class="bmc-dot" style="background:#ef4444"></span>
                  <span class="bmc-name" style="color:#ef4444">战力配置</span>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">1攻击 = 战力</span>
                  <input type="number" id="cp-atk-ratio" value="5" min="1" step="1" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">1生命 = 战力</span>
                  <input type="number" id="cp-hp-ratio" value="1" min="1" step="1" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">每10级突破加成(%)</span>
                  <input type="number" id="cp-milestone" value="20" min="0" step="5" class="config-input bmc-input">
                </div>
              </div>
              <!-- Weapon shop -->
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header" style="flex-wrap: wrap;">
                  <span class="bmc-dot" style="background:#f59e0b"></span>
                  <span class="bmc-name" style="color:#f59e0b">武器店(4部位) ➝ 攻击</span>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">每次操作 +攻击(单部位)</span>
                  <input type="number" id="cp-weapon-atk" value="5" min="1" class="config-input bmc-input">
                </div>
              </div>
            </div>
            <div class="bldg-col">
              <!-- Armor shop -->
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header" style="flex-wrap: wrap;">
                  <span class="bmc-dot" style="background:#22d3ee"></span>
                  <span class="bmc-name" style="color:#22d3ee">护甲店 ➝ 生命</span>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">每次操作 +生命</span>
                  <input type="number" id="cp-armor-hp" value="100" min="1" class="config-input bmc-input">
                </div>
              </div>
              <!-- Blessing temple -->
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header" style="flex-wrap: wrap;">
                  <span class="bmc-dot" style="background:#c084fc"></span>
                  <span class="bmc-name" style="color:#c084fc">祝福圣殿 ➝ 生命/攻击</span>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">每次操作 +生命/攻击</span>
                  <input type="number" id="cp-bless-hp" value="100" min="0" class="config-input bmc-input">
                </div>
              </div>
            </div>
          </div>
          <div class="bldg-split-right">
            <div style="position:relative;width:100%;height:100%;min-height:300px">
              <canvas id="cp-chart" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
            </div>
            <div id="cp-chart-legend" class="bldg-chart-legend"></div>
          </div>
        </div>
      </section>

      <!-- Level Combat Power module -->
      <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.25s">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-5 font-semibold">\u5173\u5361\u6218\u529b\u8ba1\u7b97</p>
        <div class="bldg-split-layout">
          <div class="bldg-split-left" style="align-items:stretch">
            <div class="bldg-col">
              <!-- Per-chapter ops -->
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header">
                  <span class="bmc-dot" style="background:#10b981"></span>
                  <span class="bmc-name" style="color:#10b981">\u7ae0\u8282\u914d\u7f6e</span>
                  <button id="lcp-data-btn" class="popup-trigger-btn" style="margin-left:auto" title="\u67e5\u770b\u6570\u636e\u8868\u683c">\ud83d\udcca</button>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6bcf\u7ae0\u8282\u64cd\u4f5c\u6b21\u6570</span>
                  <input type="number" id="lcp-ops-per-ch" value="10" min="1" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6700\u5927\u7ae0\u8282</span>
                  <input type="number" id="lcp-max-ch" value="20" min="1" max="50" class="config-input bmc-input">
                </div>
              </div>
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header">
                  <span class="bmc-dot" style="background:#8b5cf6"></span>
                  <span class="bmc-name" style="color:#8b5cf6">\u53ec\u5524\u914d\u7f6e</span>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u521d\u59cb\u6b21\u6570</span>
                  <input type="number" id="lcp-summon-init" value="10" min="0" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6700\u5927\u6b21\u6570</span>
                  <input type="number" id="lcp-summon-max" value="100" min="0" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6bcf\u7ae0\u8282\u9012\u589e\u6b21\u6570</span>
                  <input type="number" id="lcp-summon-step" value="5" min="0" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u5355\u6b21\u53ec\u5524\u671f\u671b\u6218\u529b</span>
                  <input type="number" id="lcp-summon-power" value="300" min="0" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6bcf\u7ae0\u8282\u671f\u671b\u9012\u589e</span>
                  <input type="number" id="lcp-summon-power-step" value="50" min="0" class="config-input bmc-input">
                </div>
              </div>
            </div>
          </div>
          <div class="bldg-split-right">
            <div style="position:relative;width:100%;height:100%;min-height:300px">
              <canvas id="lcp-chart" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
            </div>
            <div id="lcp-chart-legend" class="bldg-chart-legend"></div>
          </div>
        </div>
      </section>

    </div><!-- /tab-buildings -->

    <!-- ── RESOURCES TAB ── -->
    <div id="tab-resources" style="display:none;flex-direction:column;gap:1.5rem;width:100%;align-items:center">
      <section class="glass rounded-2xl p-5 w-full" style="max-width:128rem">
        <div class="flex items-end justify-between mb-5 gap-6">
          <div>
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">主循环与资源增长</p>
            <div id="time-display-loop" class="font-display font-bold text-3xl text-white">未开始</div>
          </div>
          <div class="flex gap-4 items-end">
            <div class="text-center">
              <p class="text-white/40 text-xs uppercase tracking-widest mb-1">当前（分钟）</p>
              <input type="number" id="input-current-loop" value="0" min="0" class="config-input" style="width:7rem">
            </div>
            <div class="text-center">
              <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总时长（天）</p>
              <input type="number" id="input-days-loop" value="3" min="1" max="60" class="config-input">
            </div>
            <div class="text-center">
              <p class="text-white/40 text-xs uppercase tracking-widest mb-1">每日时长（分钟）</p>
              <input type="number" id="input-mpd-loop" value="60" min="1" max="480" class="config-input">
            </div>
          </div>
        </div>

        <!-- Ported Progress Bar -->
        <div class="relative mb-8" id="bar-root-loop">
          <div class="seg-track" id="track-loop">
            <div id="seg-container-loop" style="display:contents"></div>
            <div class="seg-overlay" id="overlay-loop"></div>
            <div class="seg-handle" id="handle-loop" style="left:0%" role="slider"></div>
          </div>
          <div class="relative mt-3 day-axis" id="axis-container-loop"></div>
        </div>

        <div style="position:relative;width:1090px;height:540px;margin:0 auto">
          <!-- Top row: 医馆 关卡 熔铸所 製皮厂 晶石矿场 -->
          <div id="rc-clinic" class="rc-box" style="position:absolute;left:30px;top:60px;border-style:dashed;color:#84cc16;border-color:rgba(132,204,22,0.3);background:rgba(132,204,22,0.06)">
            医馆<div id="val-clinic" class="rc-val">Lv.0</div>
          </div>
          <div id="rc-stage" class="rc-box rc-green" style="position:absolute;left:370px;top:60px">
            关卡<div id="val-stage" class="rc-val">第1波</div>
          </div>
          <div id="rc-foundry" class="rc-box rc-blue" style="position:absolute;left:550px;top:60px">
            熔铸所<div id="val-foundry" class="rc-val">Lv.0</div>
          </div>
          <div id="rc-tanner" class="rc-box rc-purple" style="position:absolute;left:730px;top:60px">
            製皮厂<div id="val-tanner" class="rc-val">Lv.0</div>
          </div>
          <div id="rc-mine" class="rc-box rc-pink" style="position:absolute;left:910px;top:60px">
            晶石矿场<div id="val-mine" class="rc-val">Lv.0</div>
          </div>
          <!-- Bottom row: 召唤 队伍 武器店 护甲店 祝福圣殿 -->
          <div id="rc-summon" class="rc-box" style="position:absolute;left:30px;top:320px;border-color:rgba(139,92,246,0.5);color:#8b5cf6">
            召唤<div id="val-summon" class="rc-val">🔒</div>
          </div>
          <div id="rc-team" class="rc-box rc-amber" style="position:absolute;left:370px;top:320px">
            队伍<div id="val-team" class="rc-val">0/0</div>
          </div>
          <div id="rc-weapon" class="rc-box rc-blue" style="position:absolute;left:550px;top:320px">
            武器店<div id="val-weapon" class="rc-val">🔒</div>
          </div>
          <div id="rc-armor" class="rc-box rc-purple" style="position:absolute;left:730px;top:320px">
            护甲店<div id="val-armor" class="rc-val">🔒</div>
          </div>
          <div id="rc-temple" class="rc-box rc-pink" style="position:absolute;left:910px;top:320px">
            祝福圣殿<div id="val-temple" class="rc-val">🔒</div>
          </div>

          <svg style="position:absolute;left:0;top:0;width:1090px;height:540px;pointer-events:none" viewBox="0 0 1090 540">
            <!-- GOLD: unified bar y=35 from 医馆(110) to 晶石矿场(990) -->
            <path d="M110,35 H990" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M110,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M450,60 V35" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M630,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M810,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M990,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <text x="540" y="28" fill="#fbbf24" font-size="14" font-weight="700" opacity="0.7">金币</text>
            <text id="rate-gold" x="540" y="52" fill="#fbbf24" font-size="12" font-weight="600" text-anchor="middle" opacity="0.9">0/s</text>

            <!-- Gold dots... -->
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H630 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H630 V60" begin="0.5s"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2s" repeatCount="indefinite" path="M450,60 V35 H810 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2s" repeatCount="indefinite" path="M450,60 V35 H810 V60" begin="0.6s"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2.4s" repeatCount="indefinite" path="M450,60 V35 H990 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2.4s" repeatCount="indefinite" path="M450,60 V35 H990 V60" begin="0.7s"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H110 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H110 V60" begin="0.5s"/></circle>

            <!-- 加速 医馆RIGHT(190,140) '关卡LEFT(370,140) -->
            <path d="M190,140 H370" fill="none" stroke="rgba(132,204,22,0.3)" stroke-width="2.5"/>
            <text x="280" y="132" fill="#84cc16" font-size="14" font-weight="700" opacity="0.7">加</text>
            <circle r="3" fill="#84cc16"><animateMotion dur="1.4s" repeatCount="indefinite" path="M190,140 H370"/></circle>
            <circle r="3" fill="#84cc16"><animateMotion dur="1.4s" repeatCount="indefinite" path="M190,140 H370" begin="0.7s"/></circle>

            <!-- MATERIALS: vertical -->
            <path d="M630,220 V320" fill="none" stroke="rgba(96,165,250,0.3)" stroke-width="2.5"/>
            <path d="M810,220 V320" fill="none" stroke="rgba(167,139,250,0.3)" stroke-width="2.5"/>
            <path d="M990,220 V320" fill="none" stroke="rgba(244,114,182,0.3)" stroke-width="2.5"/>
            <text x="636" y="265" fill="#60a5fa" font-size="13" font-weight="700" opacity="0.7">精钢</text>
            <text id="rate-steel" x="636" y="285" fill="#60a5fa" font-size="11" font-weight="600" opacity="0.9">0/s</text>
            <text x="816" y="265" fill="#a78bfa" font-size="13" font-weight="700" opacity="0.7">皮革</text>
            <text id="rate-leather" x="816" y="285" fill="#a78bfa" font-size="11" font-weight="600" opacity="0.9">0/s</text>
            <text x="996" y="265" fill="#f472b6" font-size="13" font-weight="700" opacity="0.7">晶石</text>
            <text id="rate-gem" x="996" y="285" fill="#f472b6" font-size="11" font-weight="600" opacity="0.9">0/s</text>
            <circle r="3" fill="#60a5fa"><animateMotion dur="1.4s" repeatCount="indefinite" path="M630,220 V320"/></circle>
            <circle r="3" fill="#a78bfa"><animateMotion dur="1.4s" repeatCount="indefinite" path="M810,220 V320" begin="0.5s"/></circle>
            <circle r="3" fill="#f472b6"><animateMotion dur="1.4s" repeatCount="indefinite" path="M990,220 V320" begin="1s"/></circle>

            <!-- 通关: 队伍TOP(450,320) 'UP to 关卡BOTTOM(450,220) -->
            <path d="M450,220 V320" fill="none" stroke="rgba(16,185,129,0.3)" stroke-width="2.5"/>
            <text x="456" y="275" fill="#10b981" font-size="14" font-weight="700" opacity="0.7">通关</text>
            <circle r="3" fill="#10b981"><animateMotion dur="1.4s" repeatCount="indefinite" path="M450,320 V220"/></circle>
            <circle r="3" fill="#10b981"><animateMotion dur="1.4s" repeatCount="indefinite" path="M450,320 V220" begin="0.7s"/></circle>

            <!-- POWER: merged horizontal bar at y=505 + vertical rises -->
            <path d="M450,505 H990" fill="none" stroke="rgba(34,211,238,0.3)" stroke-width="2.5"/>
            <path d="M450,480 V505" fill="none" stroke="rgba(34,211,238,0.3)" stroke-width="2.5"/>
            <path d="M630,480 V505" fill="none" stroke="rgba(34,211,238,0.3)" stroke-width="2.5"/>
            <path d="M810,480 V505" fill="none" stroke="rgba(34,211,238,0.3)" stroke-width="2.5"/>
            <path d="M990,480 V505" fill="none" stroke="rgba(34,211,238,0.3)" stroke-width="2.5"/>
            <text x="600" y="520" fill="#22d3ee" font-size="14" font-weight="700" opacity="0.7">战力</text>
            <text id="total-power" x="650" y="520" fill="#22d3ee" font-size="12" font-weight="600" opacity="0.9">0</text>

            <!-- Power dots -->
            <circle r="4" fill="#22d3ee"><animateMotion dur="1.6s" repeatCount="indefinite" path="M630,480 V505 H450 V480"/></circle>
            <circle r="4" fill="#22d3ee"><animateMotion dur="1.6s" repeatCount="indefinite" path="M630,480 V505 H450 V480" begin="0.5s"/></circle>
            <circle r="4" fill="#22d3ee"><animateMotion dur="2s" repeatCount="indefinite" path="M810,480 V505 H450 V480"/></circle>
            <circle r="4" fill="#22d3ee"><animateMotion dur="2s" repeatCount="indefinite" path="M810,480 V505 H450 V480" begin="0.6s"/></circle>
            <circle r="4" fill="#22d3ee"><animateMotion dur="2.4s" repeatCount="indefinite" path="M990,480 V505 H450 V480"/></circle>
            <circle r="4" fill="#22d3ee"><animateMotion dur="2.4s" repeatCount="indefinite" path="M990,480 V505 H450 V480" begin="0.7s"/></circle>

            <!-- 召唤英雄: 召唤RIGHT(190,400) '队伍LEFT(370,400) -->
            <path d="M190,400 H370" fill="none" stroke="rgba(139,92,246,0.3)" stroke-width="2.5"/>
            <text x="240" y="392" fill="#8b5cf6" font-size="12" font-weight="700" opacity="0.7">召唤英雄</text>
            <circle r="3" fill="#8b5cf6"><animateMotion dur="1.4s" repeatCount="indefinite" path="M190,400 H370"/></circle>
          </svg>
        </div>
      </section>
    </div><!-- /tab-resources -->

    <!-- ── UNLOCK TAB ── -->
    <div id="tab-unlock" class="flex-col xl:flex-row gap-6 w-full items-start" style="display:none; max-width: 128rem;">
      <!-- Left: Editors -->
      <section class="flex-1 xl:flex-[3] flex flex-col gap-6 animate-fade-up w-full">
        <div class="glass flex items-center justify-between p-5 rounded-2xl w-full">
          <div class="flex items-center gap-3">
            <span class="p-2 rounded-lg" style="background:rgba(251,191,36,0.15);color:#fbbf24;font-size:1.2rem">⚙️</span>
            <h2 class="text-xl font-bold text-white tracking-widest">解锁节点配置</h2>
          </div>
          <button class="px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest bg-white/10 text-white/60 hover:bg-white/20 hover:text-white border border-white/5 transition-colors" onclick="window.restoreDefaultUnlocks()">恢复默认</button>
        </div>
        <div id="unlock-editors" class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full"></div>
      </section>

      <!-- Right: Overall List -->
      <section class="flex-1 xl:flex-[2] flex flex-col xl:items-center animate-fade-up w-full" style="animation-delay:0.1s">
        <div class="glass flex flex-col w-full max-w-[650px] rounded-2xl p-6 shadow-xl">
          <div class="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
            <span class="p-2 rounded-lg" style="background:rgba(255,255,255,0.1);color:#fff;font-size:1.2rem">📋</span>
            <h2 class="text-lg font-bold text-white tracking-widest">综合解锁阶段预测</h2>
          </div>
          <div id="unlock-overall-list" class="flex flex-col gap-1 w-full"></div>
        </div>
      </section>
    </div><!-- /tab-unlock -->

    <!-- ── ANALYSIS TAB ── -->
    <div id="tab-analysis" style="display:none;flex-direction:column;gap:1.5rem;width:100%;align-items:center">
      <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem">
        <div class="analysis-content" style="color:rgba(255,255,255,0.85);line-height:1.8;font-size:14px">
          <h2 style="color:#fbbf24;font-size:1.5rem;margin-bottom:1rem;font-weight:700">📊 G05 数值系统分析</h2>

          <h3 style="color:#10b981;margin:1.5rem 0 0.8rem;font-size:1.1rem">1. 时间节奏 — 章节系统</h3>
          <p style="color:rgba(255,255,255,0.5);margin-bottom:0.8rem">10 × Fibonacci: 10, 20, 30, 50, 80, 130, 210, 340, 550, 890</p>
          <table class="analysis-table">
            <thead><tr><th>章节</th><th>持续(min)</th><th>累计(min)</th><th>按60min/天</th><th>节奏定位</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>10</td><td>10</td><td>0.2天</td><td>教学/爽感期</td></tr>
              <tr><td>2</td><td>20</td><td>30</td><td>0.5天</td><td>核心玩法展开</td></tr>
              <tr><td>3</td><td>30</td><td>60</td><td>1天</td><td>系统全解锁</td></tr>
              <tr><td>4</td><td>50</td><td>110</td><td>1.8天</td><td style="color:#f59e0b">中期拐点(break-even)</td></tr>
              <tr><td>5</td><td>80</td><td>190</td><td>3.2天</td><td>养成深度</td></tr>
              <tr><td>6-10</td><td>130-890</td><td>320-2310</td><td>5-39天</td><td>长线留存</td></tr>
            </tbody>
          </table>

          <h3 style="color:#a78bfa;margin:1.5rem 0 0.8rem;font-size:1.1rem">2. 建筑等级系统</h3>
          <div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:12px;padding:1rem;margin-bottom:1rem">
            <p style="margin:0"><b>总等级</b> = chapterIndex × 10 + floor(progress × 10)，最高 Lv.100</p>
            <p style="margin:0.3rem 0 0"><b>追赶机制</b>：后解锁建筑在解锁章内加速追赶，章末追平总等级</p>
          </div>

          <h3 style="color:#fbbf24;margin:1.5rem 0 0.8rem;font-size:1.1rem">3. 金币经济 — 以消耗定产出</h3>
          <p style="color:rgba(255,255,255,0.5);margin-bottom:0.5rem">升级公式: <code>base × (1 + lv × multi)</code> | 初始金币=1000 | 收支平衡=第4章</p>
          <table class="analysis-table">
            <thead><tr><th>建筑</th><th>base</th><th>multi</th><th>Lv.1</th><th>Lv.50</th><th>Lv.100</th></tr></thead>
            <tbody>
              <tr><td style="color:#84cc16">医馆</td><td>10</td><td>0.10</td><td>11</td><td>60</td><td>110</td></tr>
              <tr><td style="color:#60a5fa">熔铸所</td><td>20</td><td>0.10</td><td>22</td><td>120</td><td>220</td></tr>
              <tr><td style="color:#a78bfa">製皮厂</td><td>20</td><td>0.12</td><td>22</td><td>140</td><td>260</td></tr>
              <tr><td style="color:#f472b6">晶石矿场</td><td>40</td><td>0.15</td><td>46</td><td>340</td><td>640</td></tr>
            </tbody>
          </table>

          <h3 style="color:#60a5fa;margin:1.5rem 0 0.8rem;font-size:1.1rem">4. 材料经济 — 产消自平衡</h3>
          <table class="analysis-table">
            <thead><tr><th>资源</th><th>产出建筑</th><th>消耗建筑</th><th>消耗base</th><th>multi</th><th>解锁</th></tr></thead>
            <tbody>
              <tr><td style="color:#60a5fa">精钢</td><td>熔铸所</td><td>武器店(÷4)</td><td>200</td><td>0.10</td><td>Lv.1</td></tr>
              <tr><td style="color:#a78bfa">皮革</td><td>製皮厂</td><td>护甲店</td><td>250</td><td>0.08</td><td>Lv.21</td></tr>
              <tr><td style="color:#f472b6">晶石</td><td>晶石矿场</td><td>祝福圣殿</td><td>300</td><td>0.15</td><td>Lv.31</td></tr>
            </tbody>
          </table>

          <h3 style="color:#ef4444;margin:1.5rem 0 0.8rem;font-size:1.1rem">5. 战力系统</h3>
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:1rem;margin-bottom:1rem">
            <p style="margin:0"><b>单操作战力</b> = atk × parts × atkRatio(5) + hp × hpRatio(1)</p>
            <p style="margin:0.3rem 0 0"><b>突破加成</b> = 1 + floor(lv/10) × 20%（可配置，在建筑Tab战力配置卡片）</p>
          </div>
          <table class="analysis-table">
            <thead><tr><th>建筑</th><th>攻/操作</th><th>部位</th><th>生命/操作</th><th>战力/操作</th></tr></thead>
            <tbody>
              <tr><td style="color:#f59e0b">武器店</td><td>5</td><td>×4</td><td>-</td><td><b>100</b></td></tr>
              <tr><td style="color:#22d3ee">护甲店</td><td>-</td><td>×1</td><td>100</td><td><b>100</b></td></tr>
              <tr><td style="color:#c084fc">祝福圣殿</td><td>-</td><td>×1</td><td>100</td><td><b>100</b></td></tr>
              <tr style="border-top:1px solid rgba(255,255,255,0.15)"><td><b>合计</b></td><td></td><td></td><td></td><td><b>300/操作</b></td></tr>
            </tbody>
          </table>

          <h4 style="color:rgba(255,255,255,0.6);margin:1.2rem 0 0.5rem">召唤系统</h4>
          <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:0.8rem;margin-bottom:1rem;font-size:13px">
            初始10次（免费10连抽）| +5次/章 | 最大100次<br>
            期望战力: <b>300 + 50×章节</b> × 突破加成 × 人数
          </div>

          <h4 style="color:rgba(255,255,255,0.6);margin:1rem 0 0.5rem">关卡总战力构成</h4>
          <table class="analysis-table">
            <thead><tr><th>章</th><th>操作</th><th>突破</th><th>人数</th><th>召唤次</th><th>召唤期望</th><th>建筑战力</th><th>召唤战力</th><th>召唤%</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>10</td><td>1.0×</td><td>4</td><td>10</td><td>300</td><td>12,000</td><td>12,000</td><td>50%</td></tr>
              <tr><td>3</td><td>30</td><td>1.4×</td><td>6</td><td>20</td><td>400</td><td>75,600</td><td>67,200</td><td>47%</td></tr>
              <tr><td>5</td><td>50</td><td>2.0×</td><td>8</td><td>30</td><td>500</td><td>240,000</td><td>240,000</td><td>50%</td></tr>
              <tr><td>10</td><td>100</td><td>3.0×</td><td>13</td><td>55</td><td>750</td><td>1,170,000</td><td>1,608,750</td><td style="color:#10b981"><b>58%</b></td></tr>
            </tbody>
          </table>
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:0.3rem">召唤占比从50%逐步提升至58%，后期召唤越来越重要</p>

          <h3 style="color:#ec4899;margin:1.5rem 0 0.8rem;font-size:1.1rem">6. 设计亮点</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:1rem">
              <p style="margin:0;color:#10b981;font-weight:700">✅ 经济系统</p>
              <ul style="margin:0.5rem 0 0;padding-left:1.2rem;color:rgba(255,255,255,0.6);font-size:13px">
                <li>金币以消耗定产出，天然自洽</li>
                <li>材料产消同公式，无需分别调优</li>
                <li>不同建筑不同multi，有差异化</li>
                <li>Break-even第4章</li>
              </ul>
            </div>
            <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:1rem">
              <p style="margin:0;color:#8b5cf6;font-weight:700">✅ 战力系统</p>
              <ul style="margin:0.5rem 0 0;padding-left:1.2rem;color:rgba(255,255,255,0.6);font-size:13px">
                <li>三建筑单操作统一(100)</li>
                <li>突破+20%/10级，可配置</li>
                <li>召唤期望随章节递增</li>
                <li>召唤50%→58%，逐步提升</li>
              </ul>
            </div>
          </div>

        </div>
      </section>
    </div><!-- /tab-analysis -->

    <!-- ── SIMULATION TAB ── -->
    <div id="tab-simulation" style="display:none;flex-direction:column;gap:1.5rem;width:100%;align-items:center;">
      <section class="glass flex flex-col xl:flex-row gap-6 rounded-2xl p-6 w-full animate-fade-up shadow-2xl" style="max-width:128rem;animation-delay:0.1s">
        <!-- Left: Config inputs -->
        <div class="flex flex-col gap-5 w-full xl:w-[350px] shrink-0">
          <div class="flex items-center gap-3 mb-2 pb-3 border-b border-white/10">
            <span class="text-2xl p-2 rounded-lg" style="background:rgba(236,72,153,0.15);color:#ec4899">📊</span>
            <div class="flex flex-col">
              <h2 class="font-bold text-lg tracking-widest text-white">模型核心参数</h2>
              <span class="text-[10px] text-white/40 uppercase tracking-widest">Simulation Parameters</span>
            </div>
          </div>
          <div id="sim-configs-list" class="flex flex-col gap-3 overflow-y-auto pr-2" style="max-height: 600px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) transparent;"></div>
        </div>
        
        <!-- Right: Chart -->
        <div class="flex-1 w-full bg-black/30 rounded-xl border border-white/5 relative flex items-center justify-center p-3 shadow-inner" style="min-height: 700px;">
          <div id="sim-chart" class="w-full h-full absolute inset-0 rounded-lg"></div>
        </div>
      </section>
    </div><!-- /tab-simulation -->

    </div><!-- /main-scroll-area -->
    
    <!-- Right Sidebar for Save Manager -->
    <div id="save-manager-container" class="w-[360px] h-screen bg-black/40 border-l border-white/10 flex flex-col shrink-0"></div>
  </div>
`;

// ── Unlock Config Render (Building Tab) ──────────────────────────────
window.defaultUnlockData = {
  buildings: [
    { name: "市政厅", level: 0 }, { name: "医馆", level: 0 }, { name: "兵营", level: 0 },
    { name: "武器店", level: 1 }, { name: "熔铸所", level: 3 }, { name: "护甲店", level: 10 },
    { name: "製皮厂", level: 14 }, { name: "祝福圣殿", level: 24 }, { name: "晶石矿场", level: 30 }
  ],
  functions: [
    { name: "任务", level: 0 }, { name: "挂机奖励", level: 5 },
    { name: "召唤", level: 6 }, { name: "挑战-远征", level: 18 }
  ],
  slots: [
    { name: "slot1", level: 0 }, { name: "slot2", level: 2 }, { name: "slot3", level: 4 },
    { name: "slot4", level: 8 }, { name: "slot5", level: 12 }, { name: "slot6", level: 16 },
    { name: "slot7", level: 21 }, { name: "slot8", level: 27 }, { name: "slot9", level: 33 },
    { name: "slot10", level: 45 }, { name: "slot11", level: 54 }, { name: "slot12", level: 63 },
    { name: "slot13", level: 72 }, { name: "slot14", level: 81 }, { name: "slot15", level: 90 }
  ]
};

window.unlockData = JSON.parse(JSON.stringify(window.defaultUnlockData));

window.restoreDefaultUnlocks = function () {
  window.unlockData = JSON.parse(JSON.stringify(window.defaultUnlockData));
  window.renderUnlockUI();
};

window.updateUnlockLevel = function (category, index, val) {
  const v = parseInt(val);
  if (!isNaN(v)) {
    window.unlockData[category][index].level = v;
    window.renderUnlockUI();
  }
};

window.renderUnlockUI = function () {
  const edEl = document.getElementById('unlock-editors');
  const ovEl = document.getElementById('unlock-overall-list');
  if (!edEl || !ovEl) return;

  function renderCategory(catKey, title, color, icon) {
    const items = window.unlockData[catKey];
    const itemCards = items.map((item, idx) => `
      <div class="flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors hover:bg-white/10 shadow-sm" style="background:rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08)">
        <span class="text-white/90 text-sm font-medium whitespace-nowrap">${item.name}</span>
        <div class="w-[1px] h-4 bg-white/10 mx-1"></div>
        <span class="text-white/30 text-[10px] uppercase">关卡</span>
        <input type="number" min="0" value="${item.level}" oninput="window.updateUnlockLevel('${catKey}', ${idx}, this.value)"
               class="bg-black/30 border border-white/10 text-white rounded text-center focus:outline-none focus:border-white/30 transition-colors"
               style="width:3.5rem; padding: 2px; font-size:12px; font-family:var(--font-mono)">
      </div>
    `).join('');

    return `
      <div class="glass rounded-2xl p-5 border-t border-${color}/30" style="background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.2) 100%);">
        <div class="flex items-center gap-3 mb-5 pb-3 border-b border-white/5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-inner" style="background:${color}20; border: 1px solid ${color}40; font-size:1.1rem">${icon}</div>
          <h3 class="font-bold text-lg tracking-wide" style="color:${color}">${title}</h3>
          <span class="ml-auto text-xs px-2.5 py-1 rounded-md font-mono" style="background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.5)">${items.length} 项</span>
        </div>
        <div class="flex flex-col gap-2">
          ${itemCards}
        </div>
      </div>
    `;
  }

  edEl.innerHTML =
    renderCategory('buildings', '建筑解锁', '#a78bfa', '🏰') +
    renderCategory('functions', '功能系统', '#fbbf24', '⚡') +
    renderCategory('slots', '英雄槽位', '#22d3ee', '👤');

  const overall = {};
  const allItems = [
    ...window.unlockData.buildings.map(x => ({ ...x, color: '#a78bfa' })),
    ...window.unlockData.functions.map(x => ({ ...x, color: '#fbbf24' })),
    ...window.unlockData.slots.map(x => ({ ...x, color: '#22d3ee' }))
  ];

  allItems.forEach(item => {
    if (!overall[item.level]) overall[item.level] = [];
    overall[item.level].push(item);
  });

  const sortedLvls = Object.keys(overall).map(Number).sort((a, b) => a - b);

  const overallRows = sortedLvls.map(lv => {
    let chName = '未定章节';
    let chColor = '#aaaaaa';
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (lv >= CHAPTERS[i].start) {
        chName = CHAPTERS[i].label;
        chColor = CHAPTERS[i].color;
        break;
      }
    }

    const badges = overall[lv].map(i => `
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm" style="background:${i.color}15; border: 1px solid ${i.color}30">
        <span class="w-1.5 h-1.5 rounded-full" style="background:${i.color}"></span>
        <span class="font-bold text-sm" style="color:${i.color}">${i.name}</span>
      </div>
    `).join('');

    return `
      <div class="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-2 transition-colors">
        <div class="flex items-center bg-white/5 rounded-lg border border-white/10 px-3 py-1.5 shrink-0 shadow-inner relative overflow-hidden pl-5">
          <div class="absolute left-0 top-0 w-1.5 h-full" style="background:${chColor}"></div>
          <span class="text-xs font-bold mr-3 whitespace-nowrap" style="color:${chColor}">${chName}</span>
          <span class="text-white/30 text-[9px] uppercase font-bold tracking-wider mr-1.5">Lv.</span>
          <span class="text-white/90 font-mono text-base font-black">${lv}</span>
        </div>
        <div class="flex-1 flex flex-wrap gap-2 items-center">
          ${badges}
        </div>
      </div>
    `;
  }).join('');

  ovEl.innerHTML = overallRows || '<div class="text-center text-white/30 text-sm py-4">无解锁内容</div>';
};

window.renderUnlockUI();

// ── Build chapter cards ───────────────────────────────────────────────
const cardsEl = document.getElementById('chapter-cards');
CHAPTERS.forEach(ch => {
  const div = document.createElement('div');
  div.id = `card-${ch.id}`;
  div.className = 'ch-card glass rounded-xl p-4 ch-locked';
  div.style.setProperty('--ch-color', ch.color);
  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold ch-title">${ch.label}</span>
      <span class="ch-badge" id="chbadge-${ch.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-1">${fmtUnlock(ch.start)}</p>
    <p class="text-xs font-mono mb-2 ch-stage" id="chstage-${ch.id}"></p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="chbar-${ch.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${ch.color};"></div>
    </div>
  `;
  cardsEl.appendChild(div);
});

// ── Progress (main bar) ───────────────────────────────────────────────
const overlay = document.getElementById('overlay');
const handle = document.getElementById('handle');
const tooltip = document.getElementById('tooltip');
const tooltipTxt = document.getElementById('tooltip-text');
const timeDisp = document.getElementById('time-display');

function setProgress(fraction) {
  fraction = clamp(fraction, 0, 1);
  // Round to nearest 10-second step (1/6 of a minute)
  const WAVE_STEP = 1 / 6;
  currentMin = Math.round((fraction * TOTAL_MIN) / WAVE_STEP) * WAVE_STEP;
  currentMin = clamp(currentMin, 0, TOTAL_MIN);

  // Sync both bars
  ['', '-loop'].forEach(sfx => {
    const h = document.getElementById(`handle${sfx}`);
    const d = document.getElementById(`time-display${sfx}`);
    if (h) h.style.left = `${fraction * 100}%`;
    if (d) {
      if (currentMin === 0) {
        d.textContent = '未开始';
      } else {
        const day = Math.floor(currentMin / MIN_PER_DAY) + 1;
        const minInDay = currentMin % MIN_PER_DAY;
        d.textContent = minInDay === 0
          ? `${Math.floor(currentMin / MIN_PER_DAY)} 天`
          : `${day} 天 ${fmtMin(minInDay)}`;
      }
    }
  });

  tooltip.style.left = `${fraction * 100}%`;
  handle.setAttribute('aria-valuenow', currentMin);
  tooltipTxt.textContent = fmtMin(currentMin);

  // Sync current-minutes input
  const inCur = document.getElementById('input-current');
  if (inCur && document.activeElement !== inCur)
    inCur.value = Number(currentMin.toFixed(2));

  // Update main bar segments for both
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const segStart = i * MIN_PER_DAY;
    const segEnd = (i + 1) * MIN_PER_DAY;
    let pct = 0;
    if (currentMin >= segEnd) pct = 100;
    else if (currentMin > segStart) pct = (currentMin - segStart) / MIN_PER_DAY * 100;

    const fill = document.getElementById(`segfill-${i}`);
    if (fill) fill.style.width = `${pct}%`;
    const fillLoop = document.getElementById(`segfill-loop-${i}`);
    if (fillLoop) fillLoop.style.width = `${pct}%`;
  }

  // Update all sections
  updateChapters();
  updateBuildings();
  updateFeatures();
  updateLoopValues();
}

function updateLoopValues() {
  const loopTab = document.getElementById('tab-resources');
  if (!loopTab || loopTab.style.display === 'none') return;

  // Sync loop tab inputs with current values
  const inCurLoop = document.getElementById('input-current-loop');
  if (inCurLoop && document.activeElement !== inCurLoop)
    inCurLoop.value = Number(currentMin.toFixed(2));
  const inDaysLoop = document.getElementById('input-days-loop');
  if (inDaysLoop && document.activeElement !== inDaysLoop)
    inDaysLoop.value = TOTAL_DAYS;
  const inMpdLoop = document.getElementById('input-mpd-loop');
  if (inMpdLoop && document.activeElement !== inMpdLoop)
    inMpdLoop.value = MIN_PER_DAY;

  // Use the same overall building level as the Overview tab
  const overallLv = getBuildingLevel();

  // Helper: set locked/unlocked visual state on rc-box
  function setBoxLocked(rcId, locked) {
    const box = document.getElementById(rcId);
    if (!box) return;
    if (locked) {
      box.style.filter = 'grayscale(1)';
      box.style.opacity = '0.35';
    } else {
      box.style.filter = '';
      box.style.opacity = '';
    }
  }

  // Leveled buildings (use effectiveBldgLv matching Overview logic)
  const leveledBuildings = [
    { domId: 'clinic', rcId: 'rc-clinic', unlockLv: 1, unlockAt: 0 },
    { domId: 'foundry', rcId: 'rc-foundry', unlockLv: 1, unlockAt: 150 / 60 },
    { domId: 'tanner', rcId: 'rc-tanner', unlockLv: 21, unlockAt: 700 / 60 },
    { domId: 'mine', rcId: 'rc-mine', unlockLv: 31, unlockAt: 25 },
  ];
  leveledBuildings.forEach(b => {
    const locked = currentMin < b.unlockAt;
    const el = document.getElementById(`val-${b.domId}`);
    const lvl = locked ? 0 : effectiveBldgLv(overallLv, b.unlockLv);
    if (el) el.textContent = locked ? '\ud83d\udd12' : `Lv.${lvl}`;
    setBoxLocked(b.rcId, locked);
  });

  // Non-leveled buildings: show unlocked or locked, gray out if locked
  const noLevelBuildings = [
    { domId: 'weapon', rcId: 'rc-weapon', unlockAt: 50 / 60 },
    { domId: 'armor', rcId: 'rc-armor', unlockAt: 500 / 60 },
    { domId: 'temple', rcId: 'rc-temple', unlockAt: 20 },
    { domId: 'summon', rcId: 'rc-summon', unlockAt: 15 },
  ];
  noLevelBuildings.forEach(b => {
    const locked = currentMin < b.unlockAt;
    const el = document.getElementById(`val-${b.domId}`);
    if (b.domId === 'summon') {
      // Summon shows count based on gradual progression within chapters
      if (locked) {
        if (el) el.textContent = '\ud83d\udd12';
      } else {
        const sInit = parseInt(document.getElementById('lcp-summon-init')?.value) || 0;
        const sMax = parseInt(document.getElementById('lcp-summon-max')?.value) || 0;
        const sStep = parseInt(document.getElementById('lcp-summon-step')?.value) || 0;
        // Completed chapters contribute full step each
        const completedCh = CHAPTERS.filter(c => currentMin >= c.end).length;
        const baseSummons = completedCh * sStep;
        // Current chapter: spread sStep summons one-by-one within it
        const curCh = CHAPTERS.find(c => currentMin >= c.start && currentMin < c.end);
        let partialSummons = 0;
        if (curCh && sStep > 0) {
          const chDur = curCh.end - curCh.start;
          const elapsed = currentMin - curCh.start;
          const pct = chDur > 0 ? elapsed / chDur : 0;
          partialSummons = Math.floor(pct * sStep);
        }
        const summonCount = Math.min(sMax, sInit + baseSummons + partialSummons);
        if (el) el.textContent = `${summonCount}\u6b21`;
      }
    } else {
      if (el) el.textContent = locked ? '\ud83d\udd12' : '\u5df2\u89e3\u9501';
    }
    setBoxLocked(b.rcId, locked);
  });

  // Stage wave calculation
  const ch = CHAPTERS.find(c => currentMin >= c.start && currentMin < c.end) || CHAPTERS[CHAPTERS.length - 1];
  const cfgWaves = parseFloat(document.getElementById('cfg-waves')?.value) || 5;
  const cfgWaveSec = parseFloat(document.getElementById('cfg-wave-sec')?.value) || 10;
  const elapsedSecInCh = (currentMin - ch.start) * 60;
  const waveIdx = Math.floor(Math.max(0, elapsedSecInCh) / cfgWaveSec);
  const waveInLevel = (waveIdx % cfgWaves) + 1;
  const levelInCh = Math.floor(waveIdx / cfgWaves) + 1;
  const valStage = document.getElementById('val-stage');
  if (valStage) valStage.textContent = `${ch.id}-${levelInCh} (${waveInLevel}\u6ce2)`;

  // Team slots calculation
  const activeCh = CHAPTERS.filter(c => currentMin >= c.end).length;
  const tSlots = Math.min(teamConfig.max, teamConfig.base + activeCh * teamConfig.inc);
  const valTeam = document.getElementById('val-team');
  if (valTeam) valTeam.textContent = `${tSlots}\u4f4d`;

  // Resource Rates calculation (use effectiveBldgLv for accurate rates)
  const getRate = (resId) => {
    let r = 0;
    BLDG_MODULE.forEach(b => {
      const bLvl = effectiveBldgLv(overallLv, b.unlock);
      if (b.resource === resId) r += b.resBase * bLvl;
    });
    return r;
  };
  const gR = document.getElementById('rate-gold'); if (gR) gR.textContent = `${Math.round(getRate('\u91d1\u5e01'))}/s`;
  const sR = document.getElementById('rate-steel'); if (sR) sR.textContent = `${Math.round(getRate('\u7cbe\u94a2'))}/s`;
  const lR = document.getElementById('rate-leather'); if (lR) lR.textContent = `${Math.round(getRate('\u76ae\u9769'))}/s`;
  const crR = document.getElementById('rate-gem'); if (crR) crR.textContent = `${Math.round(getRate('\u6676\u77f3'))}/s`;

  // Total Combat Power (uses the same CP chart formula + summon power)
  const atkRatio = parseFloat(document.getElementById('cp-atk-ratio')?.value) || 5;
  const hpRatio = parseFloat(document.getElementById('cp-hp-ratio')?.value) || 1;
  let tp = 0;
  // Building power from combat buildings
  if (typeof CP_BUILDINGS !== 'undefined') {
    CP_BUILDINGS.forEach(b => {
      const atk = b.atkInput ? (parseFloat(document.getElementById(b.atkInput)?.value) || 0) : 0;
      const hp = b.hpInput ? (parseFloat(document.getElementById(b.hpInput)?.value) || 0) : 0;
      const totalPowerPerOp = atk * (b.atkSplit || 1) * atkRatio + hp * hpRatio;
      const consumerMatch = RES_CONSUMERS.find(c => c.id === b.id || (b.id === 'bless' && c.id === 'blessing'));
      const consumerUnlock = consumerMatch ? consumerMatch.unlock : 1;
      const ops = effectiveConsumerLv(overallLv, consumerUnlock);
      tp += ops * totalPowerPerOp * milestoneBonus(overallLv);
    });
  }
  // Summon power
  const sInit = parseInt(document.getElementById('lcp-summon-init')?.value) || 0;
  const sMax = parseInt(document.getElementById('lcp-summon-max')?.value) || 0;
  const sStep = parseInt(document.getElementById('lcp-summon-step')?.value) || 0;
  const sPower = parseFloat(document.getElementById('lcp-summon-power')?.value) || 0;
  const summonUnlocked = currentMin >= 15; // summon unlocks at 15min
  if (summonUnlocked) {
    const completedCh = CHAPTERS.filter(c => currentMin >= c.end).length;
    const baseSummons = completedCh * sStep;
    const curCh = CHAPTERS.find(c => currentMin >= c.start && currentMin < c.end);
    let partialSummons = 0;
    if (curCh && sStep > 0) {
      const chDur = curCh.end - curCh.start;
      const elapsed = currentMin - curCh.start;
      const pct = chDur > 0 ? elapsed / chDur : 0;
      partialSummons = Math.floor(pct * sStep);
    }
    const summonCount = Math.min(sMax, sInit + baseSummons + partialSummons);
    const slots = Math.min(teamConfig.max, teamConfig.base + completedCh * teamConfig.inc);
    const sPowerStep = parseFloat(document.getElementById('lcp-summon-power-step')?.value) || 0;
    const actualSPower = (sPower + completedCh * sPowerStep) * milestoneBonus(overallLv);
    tp += summonCount * actualSPower * slots;
  }

  const tP = document.getElementById('total-power');
  if (tP) tP.textContent = Math.round(tp).toLocaleString();
}



overlay.addEventListener('mousedown', e => {
  isDragging = true; handle.classList.add('dragging');
  tooltip.style.display = 'block'; setProgress(fractionFromEvent(e)); e.preventDefault();
});
overlay.addEventListener('touchstart', e => {
  isDragging = true; handle.classList.add('dragging');
  tooltip.style.display = 'block'; setProgress(fractionFromEvent(e)); e.preventDefault();
}, { passive: false });

document.addEventListener('mousemove', e => {
  if (isDragging) setProgress(fractionFromEvent(e, isDragging === 'loop' ? 'loop' : ''));
});
document.addEventListener('touchmove', e => {
  if (isDragging) { setProgress(fractionFromEvent(e, isDragging === 'loop' ? 'loop' : '')); e.preventDefault(); }
}, { passive: false });
document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  if (isDragging === true) handle.classList.remove('dragging');
  else if (isDragging === 'loop') document.getElementById('handle-loop').classList.remove('dragging');
  isDragging = false;
  tooltip.style.display = 'none';
});
document.addEventListener('touchend', () => {
  if (!isDragging) return;
  if (isDragging === true) handle.classList.remove('dragging');
  else if (isDragging === 'loop') document.getElementById('handle-loop').classList.remove('dragging');
  isDragging = false;
  tooltip.style.display = 'none';
});

function setupLoopBar() {
  const ovr = document.getElementById('overlay-loop');
  const hnd = document.getElementById('handle-loop');
  ovr.addEventListener('mousedown', e => {
    isDragging = 'loop'; hnd.classList.add('dragging');
    setProgress(fractionFromEvent(e, 'loop')); e.preventDefault();
  });
  ovr.addEventListener('touchstart', e => {
    isDragging = 'loop'; hnd.classList.add('dragging');
    setProgress(fractionFromEvent(e, 'loop')); e.preventDefault();
  }, { passive: false });
}
setupLoopBar();

function fractionFromEvent(e, type) {
  const el = type === 'loop' ? document.getElementById('overlay-loop') : overlay;
  const rect = el.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  return clamp((cx - rect.left) / rect.width, 0, 1);
}
handle.addEventListener('keydown', e => {
  const step = 1 / TOTAL_MIN;
  const cur = currentMin / TOTAL_MIN;
  if (e.key === 'ArrowRight') { setProgress(cur + step); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { setProgress(cur - step); e.preventDefault(); }
  if (e.key === 'Home') { setProgress(0); e.preventDefault(); }
  if (e.key === 'End') { setProgress(1); e.preventDefault(); }
});

// ── Update chapter display ────────────────────────────────────────────
function updateChapters() {
  CHAPTERS.forEach(ch => {
    const dur = ch.end - ch.start;
    const dispFill = document.getElementById(`chfill-${ch.id}`);
    const badge = document.getElementById(`chbadge-${ch.id}`);
    const bar = document.getElementById(`chbar-${ch.id}`);
    const card = document.getElementById(`card-${ch.id}`);
    const stageEl = document.getElementById(`chstage-${ch.id}`);
    const title = card.querySelector('.ch-title');

    const cfgWaves = parseFloat(document.getElementById('cfg-waves')?.value) || 5;
    const cfgWaveSec = parseFloat(document.getElementById('cfg-wave-sec')?.value) || 10;
    const waveLabel = (elapsedSec) => {
      const waveIdx = Math.floor(Math.max(0, elapsedSec) / cfgWaveSec);
      const level = Math.floor(waveIdx / cfgWaves) + 1;
      const waveInLevel = (waveIdx % cfgWaves) + 1;
      return `关卡${ch.id}-${level}（第${waveInLevel}波）`;
    };

    if (currentMin < ch.start) {
      dispFill.style.width = '0%';
      bar.style.width = '0%';
      badge.textContent = '🔒';
      badge.style.color = '';
      title.style.color = '';
      stageEl.textContent = '';
      stageEl.style.color = '';
      card.classList.add('ch-locked');
      card.classList.remove('ch-card-active');
    } else if (currentMin >= ch.end) {
      dispFill.style.width = '100%';
      bar.style.width = '100%';
      badge.textContent = '完成 ';
      badge.style.color = ch.color;
      title.style.color = ch.color;
      stageEl.textContent = waveLabel((ch.end - ch.start) * 60 - 10);
      stageEl.style.color = ch.color;
      card.classList.remove('ch-locked');
      card.classList.add('ch-card-active');
    } else {
      const pct = Math.round((currentMin - ch.start) / dur * 100);
      const elapsedSec = (currentMin - ch.start) * 60;
      dispFill.style.width = `${pct}%`;
      bar.style.width = `${pct}%`;
      badge.textContent = `已完成${pct}%`;
      badge.style.color = ch.color;
      title.style.color = ch.color;
      stageEl.textContent = waveLabel(elapsedSec);
      stageEl.style.color = ch.color;
      card.classList.remove('ch-locked');
      card.classList.add('ch-card-active');
    }
  });
}

// ── Build building cards ───────────────────────────────────────────────
const buildingRowsEl = document.getElementById('building-rows');
BUILDINGS.forEach(b => {
  const color = b.id === 'town_hall' ? TOWN_HALL_COLOR : b.noLevel ? NO_LVL_COLOR : BLDG_COLOR;
  const card = document.createElement('div');
  card.id = `brow-${b.id}`;
  card.className = 'bldg-card glass rounded-xl p-4 bldg-locked';
  card.style.borderColor = `${color}20`;
  card.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm bldg-name">${b.name}</span>
      <span class="bldg-badge" id="bbadge-${b.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${b.unlockLabel}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="bbar-${b.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${color};"></div>
    </div>
  `;
  buildingRowsEl.appendChild(card);
});

// ── Chapter-interpolated building level ───────────────────────────────
function getBuildingLevel() {
  const chIdx = CHAPTERS.filter(ch => currentMin >= ch.start).length - 1;
  const ch = CHAPTERS[chIdx];
  const dur = ch.end - ch.start;
  const pct = dur > 0 ? Math.min((currentMin - ch.start) / dur, 1) : 1;
  return Math.floor(chIdx * 10 + pct * 10);
}

// ── Update building cards ───────────────────────────────────────────────
function updateBuildings() {
  const townHallLevel = CHAPTERS.filter(ch => currentMin >= ch.start).length;
  const curLevel = getBuildingLevel();

  BUILDINGS.forEach(b => {
    const badge = document.getElementById(`bbadge-${b.id}`);
    const bar = document.getElementById(`bbar-${b.id}`);
    const card = document.getElementById(`brow-${b.id}`);
    const name = card.querySelector('.bldg-name');
    const color = b.id === 'town_hall' ? TOWN_HALL_COLOR : b.noLevel ? NO_LVL_COLOR : BLDG_COLOR;

    if (currentMin < b.unlockAt) {
      card.classList.add('bldg-locked');
      card.classList.remove('bldg-active');
      badge.textContent = '🔒';
      badge.style.color = '';
      name.style.color = '';
      bar.style.width = '0%';
      return;
    }

    card.classList.remove('bldg-locked');
    card.classList.add('bldg-active');
    name.style.color = color;
    bar.style.background = color;

    if (b.noLevel) {
      badge.textContent = '';
      badge.style.color = color;
      bar.style.width = '100%';
    } else if (b.id === 'town_hall') {
      badge.textContent = `Lv.${townHallLevel}`;
      badge.style.color = color;
      bar.style.width = `${Math.round(townHallLevel / CHAPTERS.length * 100)}%`;
    } else {
      const maxLevel = townHallLevel * 10;
      const cappedLevel = Math.min(Math.max(1, curLevel), maxLevel);
      badge.textContent = `Lv.${cappedLevel}/${maxLevel}`;
      badge.style.color = color;
      bar.style.width = maxLevel > 0 ? `${Math.round(cappedLevel / maxLevel * 100)}%` : '0%';
    }
  });
}

// ── Build feature cards ───────────────────────────────────────────────
const featCardsEl = document.getElementById('feature-cards');
FEATURES.forEach(f => {
  const card = document.createElement('div');
  card.id = `frow-${f.id}`;
  card.className = 'feat-card glass rounded-xl p-4 ch-locked';
  card.style.borderColor = `${FEAT_COLOR}20`;
  card.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm feat-title">${f.name}${f.optional ? ' <span class="feat-optional">(可选)</span>' : ''}</span>

      <span class="feat-badge" id="fbadge-${f.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs">${f.unlockLabel}</p>
  `;
  featCardsEl.appendChild(card);
});

// ── Update feature cards ──────────────────────────────────────────────
function updateFeatures() {
  FEATURES.forEach(f => {
    const badge = document.getElementById(`fbadge-${f.id}`);
    const card = document.getElementById(`frow-${f.id}`);
    const title = card.querySelector('.feat-title');

    if (currentMin < f.unlockAt) {
      card.classList.add('ch-locked');
      badge.textContent = '🔒';
      title.style.color = '';
      card.style.borderColor = `${FEAT_COLOR}15`;
    } else {
      const c = f.optional ? '#4ade80' : FEAT_COLOR;
      card.classList.remove('ch-locked');
      badge.textContent = '';
      badge.style.color = c;
      title.style.color = c;
      card.style.borderColor = `${c}40`;
    }
  });
}

// ── Rebuild segments + axis ────────────────────────────────────────────
function rebuildBar() {
  TOTAL_MIN = TOTAL_DAYS * MIN_PER_DAY;
  handle.setAttribute('aria-valuemax', TOTAL_MIN);

  ['', '-loop'].forEach(sfx => {
    const sc = document.getElementById(`seg-container${sfx}`);
    const ac = document.getElementById(`axis-container${sfx}`);
    if (!sc || !ac) return;

    sc.innerHTML = Array.from({ length: TOTAL_DAYS }, (_, i) => `
      <div class="seg" id="seg${sfx}-${i}">
        <div class="seg-fill" id="segfill${sfx}-${i}" style="width:0%"></div>
        ${buildTicks(23)}
      </div>`).join('');

    ac.innerHTML = Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const pct = ((i + 1) / TOTAL_DAYS * 100).toFixed(2);
      const cumH = (i + 1) * MIN_PER_DAY / 60;
      return `<div class="axis-label" style="left:${pct}%">
        <span class="axis-main">${i + 1} </span>
        <span class="axis-sub">${cumH}h · ${(i + 1) * MIN_PER_DAY} min</span>
      </div>`;
    }).join('');
  });

  const frac = TOTAL_MIN > 0 ? clamp(currentMin / TOTAL_MIN, 0, 1) : 0;
  setProgress(frac);
}

// ── Wire config inputs ────────────────────────────────────────────────
function setupInputs() {
  const inDays = document.getElementById('input-days');
  const inMpd = document.getElementById('input-mpd');
  const inCur = document.getElementById('input-current');
  const inDaysLoop = document.getElementById('input-days-loop');
  const inMpdLoop = document.getElementById('input-mpd-loop');
  const inCurLoop = document.getElementById('input-current-loop');

  // Sync helper: update all sibling inputs
  function syncDaysInputs(v) {
    if (inDays && document.activeElement !== inDays) inDays.value = v;
    if (inDaysLoop && document.activeElement !== inDaysLoop) inDaysLoop.value = v;
  }
  function syncMpdInputs(v) {
    if (inMpd && document.activeElement !== inMpd) inMpd.value = v;
    if (inMpdLoop && document.activeElement !== inMpdLoop) inMpdLoop.value = v;
  }

  // Days change handler
  function onDaysChange(el) {
    const v = parseInt(el.value);
    if (!isNaN(v) && v >= 1) {
      TOTAL_DAYS = v;
      syncDaysInputs(v);
      rebuildBar();
    }
  }
  // MPD change handler
  function onMpdChange(el) {
    const v = parseInt(el.value);
    if (!isNaN(v) && v >= 1) {
      MIN_PER_DAY = v;
      syncMpdInputs(v);
      rebuildBar();
    }
  }
  // Current time change handler
  function onCurChange(el) {
    const v = parseFloat(el.value);
    if (!isNaN(v) && v >= 0) setProgress(v / TOTAL_MIN);
  }

  // Overview tab listeners
  inDays.addEventListener('input', () => onDaysChange(inDays));
  inMpd.addEventListener('input', () => onMpdChange(inMpd));
  inCur.addEventListener('input', () => onCurChange(inCur));

  // Loop tab listeners
  if (inDaysLoop) inDaysLoop.addEventListener('input', () => onDaysChange(inDaysLoop));
  if (inMpdLoop) inMpdLoop.addEventListener('input', () => onMpdChange(inMpdLoop));
  if (inCurLoop) inCurLoop.addEventListener('input', () => onCurChange(inCurLoop));
}


// ── Initialization ──────────────────────────────────────────────────

// ── Tab switching ─────────────────────────────────────────────────────
window.switchTab = function (id) {
  ['overview', 'buildings', 'resources', 'analysis', 'unlock', 'simulation'].forEach(tab => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.style.display = id === tab ? 'flex' : 'none';
  });
  if (id === 'simulation') {
    requestAnimationFrame(() => {
      if (typeof window.renderSimulationChart === 'function') window.renderSimulationChart();
    });
  }
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
  const btn = document.getElementById(`tab-btn-${id}`);
  if (btn) btn.classList.add('tab-active');

  // Redraw charts when buildings tab becomes visible
  if (id === 'buildings') {
    requestAnimationFrame(() => {
      if (typeof drawBldgChart === 'function') drawBldgChart();
      if (typeof drawResChart === 'function') drawResChart();
      if (typeof drawCPChart === 'function') drawCPChart();
      if (typeof drawLevelCPChart === 'function') drawLevelCPChart();
    });
  }
  if (id === 'resources') {
    if (typeof updateLoopValues === 'function') updateLoopValues();
  }
};

// ── Building Module ──────────────────────────────────────────────────
const BLDG_MODULE = [
  { id: 'med', name: '医馆', color: '#84cc16', defaultBase: 10, defaultMulti: 0.10, unlock: 1, resource: '金币', resBase: 10 },
  { id: 'foundry', name: '熔铸所', color: '#60a5fa', defaultBase: 20, defaultMulti: 0.10, unlock: 1, resource: '精钢', resBase: 5 },
  { id: 'tannery', name: '製皮厂', color: '#a78bfa', defaultBase: 20, defaultMulti: 0.12, unlock: 21, resource: '皮革', resBase: 5 },
  { id: 'crystal', name: '晶石矿场', color: '#f472b6', defaultBase: 40, defaultMulti: 0.15, unlock: 31, resource: '晶石', resBase: 3 },
];
const RESOURCE_BLDGS = BLDG_MODULE.filter(b => b.resource);

// Resource consumers: buildings that spend resources
const RES_CONSUMERS = [
  { id: 'weapon', name: '武器店(4部位)', color: '#f59e0b', consumes: '精钢', consumeBase: 200, defaultMulti: 0.10, unlock: 1, levelSplit: 4 },
  { id: 'armor', name: '护甲店', color: '#22d3ee', consumes: '皮革', consumeBase: 250, defaultMulti: 0.08, unlock: 21 },
  { id: 'blessing', name: '祝福圣殿', color: '#c084fc', consumes: '晶石', consumeBase: 300, defaultMulti: 0.15, unlock: 31 },
];
const STAGE_COLOR = '#fbbf24';
const TOTAL_COST_COLOR = '#ffffff';
const BLDG_MAX_LEVEL = 100;

// Effective building level: 0 before unlock, accelerated catch-up during unlock chapter, then 1:1
function effectiveBldgLv(overallLv, unlockLv) {
  if (overallLv < unlockLv) return 0;
  // catch-up: reach parity with overallLv by end of the unlock chapter
  const catchUpEnd = Math.ceil(unlockLv / 10) * 10;  // e.g. unlock=21 '30
  const catchUpRange = catchUpEnd - unlockLv + 1;     // levels in catch-up window
  const catchUpRate = catchUpEnd / catchUpRange;       // eff levels per overall level
  if (overallLv <= catchUpEnd) {
    return Math.round((overallLv - unlockLv + 1) * catchUpRate);
  }
  return catchUpEnd + (overallLv - catchUpEnd); // 1:1 after catch-up
}

// Milestone bonus: configurable breakthrough per 10 levels
function milestoneBonus(overallLv) {
  const pct = parseFloat(document.getElementById('cp-milestone')?.value) || 0;
  return 1 + Math.floor(overallLv / 10) * (pct / 100);
}

// Effective consumer level: 0 before unlock, catch up by end of unlock chapter
function effectiveConsumerLv(overallLv, unlockLv) {
  if (overallLv < unlockLv) return 0;
  if (unlockLv <= 1) return overallLv; // no catch-up needed
  const catchUpEnd = Math.ceil(unlockLv / 10) * 10; // end of unlock chapter
  const catchUpRange = catchUpEnd - unlockLv + 1;
  const catchUpRate = catchUpEnd / catchUpRange;
  if (overallLv <= catchUpEnd) {
    return Math.round((overallLv - unlockLv + 1) * catchUpRate);
  }
  return catchUpEnd + (overallLv - catchUpEnd); // 1:1 after
}

function getSecPerStage() {
  const waves = parseFloat(document.getElementById('cfg-waves')?.value) || 5;
  const waveSec = parseFloat(document.getElementById('cfg-wave-sec')?.value) || 10;
  return waves * waveSec;
}

function bldgCostFormula(base, level, multiplier) {
  return base * (1 + level * multiplier);
}

function getBldgParams(b) {
  const base = parseFloat(document.getElementById(`bmc-base-${b.id}`)?.value) || b.defaultBase;
  const multi = parseFloat(document.getElementById(`bmc-multi-${b.id}`)?.value);
  return { base, multi: isNaN(multi) ? (b.defaultMulti || 0.1) : multi };
}

// ── Compute stage 'building level mapping ───────────────────────────
// Each TH level n 'building cap = n*10, TH level n+1 requires chapter n completed.
// Within each chapter, building levels progress linearly from previous cap to next cap.
function buildStageLevelMap() {
  // Build array of { stageStart, stageEnd, lvStart, lvEnd } per chapter
  const segments = [];
  let stageOffset = 0;
  CHAPTERS.forEach((ch, i) => {
    const durMin = ch.end - ch.start;
    const stagesInChapter = Math.round(durMin * 60 / getSecPerStage());
    const thLevel = i + 1; // chapter i 'TH level i+1
    const lvStart = i * 10;       // building level cap from previous TH
    const lvEnd = thLevel * 10;   // building level cap after this chapter's TH upgrade
    segments.push({ stageStart: stageOffset, stageEnd: stageOffset + stagesInChapter, lvStart, lvEnd, chapterId: ch.id });
    stageOffset += stagesInChapter;
  });
  return { segments, totalStages: stageOffset };
}

// Compute what building level each stage corresponds to (linear interp within chapter)
function stageToBldgLevel(stageIdx, segments) {
  for (const seg of segments) {
    if (stageIdx < seg.stageEnd) {
      const progress = (stageIdx - seg.stageStart) / (seg.stageEnd - seg.stageStart);
      return seg.lvStart + progress * (seg.lvEnd - seg.lvStart);
    }
  }
  // Past all chapters 'use last cap
  return segments[segments.length - 1].lvEnd;
}

// Compute cumulative upgrade cost for a building from Lv.0 to targetLv
function cumulativeBldgCost(base, multi, targetLv) {
  let total = 0;
  for (let lv = 1; lv <= Math.floor(targetLv); lv++) {
    total += bldgCostFormula(base, lv, multi);
  }
  // fractional level
  const frac = targetLv - Math.floor(targetLv);
  if (frac > 0 && Math.floor(targetLv) + 1 <= BLDG_MAX_LEVEL) {
    total += frac * bldgCostFormula(base, Math.floor(targetLv) + 1, multi);
  }
  return total;
}

// Returns all chart data indexed by stage number, plus goldPerSec for card examples
function computeStageGoldData() {
  const secPerStage = getSecPerStage();

  const { segments, totalStages } = buildStageLevelMap();
  const bldgParams = BLDG_MODULE.map(b => getBldgParams(b));

  // Cumulative cost for a single building from Lv.0 to bldgLv
  function bldgCumCost(pIdx, bldgLv) {
    const b = BLDG_MODULE[pIdx];
    let activeLv = bldgLv;
    if (b.id === 'tannery' && bldgLv < 20) activeLv = 0;
    if (b.id === 'crystal' && bldgLv < 30) activeLv = 0;
    return activeLv > 0 ? cumulativeBldgCost(bldgParams[pIdx].base, bldgParams[pIdx].multi, activeLv) : 0;
  }

  // Per-stage arrays
  const cumulativeGold = [];      // total gold needed up to this stage (= total output)
  const perBldgCosts = BLDG_MODULE.map(() => []);  // per-building delta cost per stage
  const totalPerStage = [];       // sum of all buildings' delta cost per stage

  for (let s = 0; s < totalStages; s++) {
    const bldgLv = stageToBldgLevel(s, segments);
    const bldgLvNext = stageToBldgLevel(s + 1, segments);

    // Cumulative gold = total cost of all buildings at this stage's building level
    let cumGold = 0;
    BLDG_MODULE.forEach((_, idx) => { cumGold += bldgCumCost(idx, bldgLv); });
    cumulativeGold.push(cumGold);

    // Per-building: cost to go from this stage's level to next stage's level
    let totalThis = 0;
    BLDG_MODULE.forEach((_, idx) => {
      const costNow = bldgCumCost(idx, bldgLv);
      const costNext = bldgCumCost(idx, bldgLvNext);
      const delta = costNext - costNow;
      perBldgCosts[idx].push(delta);
      totalThis += delta;
    });
    totalPerStage.push(totalThis);
  }

  // Gold per second at sampled building levels (for card examples)
  const goldPerSec = [];
  let prevCost = 0;
  for (let lv = 1; lv <= BLDG_MAX_LEVEL; lv++) {
    let cost = 0;
    BLDG_MODULE.forEach((_, idx) => { cost += bldgCumCost(idx, lv); });
    const gps = (cost - prevCost) / secPerStage;
    goldPerSec.push(gps);
    prevCost = cost;
  }

  return { cumulativeGold, perBldgCosts, totalPerStage, goldPerSec, totalStages, secPerStage };
}

function buildBldgModuleCards() {
  const container = document.getElementById('bldg-module-cards');
  if (!container) return;
  container.innerHTML = '';

  // Two explicit columns
  const col1 = document.createElement('div');
  col1.className = 'bldg-col';
  const col2 = document.createElement('div');
  col2.className = 'bldg-col';

  // Stage card (computed gold income)
  const stageCard = document.createElement('div');
  stageCard.className = 'bldg-mod-card glass rounded-xl';
  stageCard.style.setProperty('--bmc-color', STAGE_COLOR);
  stageCard.innerHTML = `
    <div class="bmc-header">
      <span class="bmc-dot" style="background:${STAGE_COLOR}"></span>
      <span class="bmc-name" style="color:${STAGE_COLOR}">关卡（产出）— 自动计算</span>
      <button class="bmc-chart-btn" data-card="stage" title="查看1-100级数据">📊</button>
    </div>
    <div class="bmc-input-row">
      <span class="bmc-label">初始金币</span>
      <input type="number" id="stage-init-gold" value="1000" min="0" step="100"
             class="config-input bmc-input">
    </div>
    <div class="bmc-input-row">
      <span class="bmc-label">收支平衡</span>
      <input type="number" id="stage-breakeven" value="4" min="1" max="10" step="1"
             class="config-input bmc-input" style="width:3rem!important">
      <span class="bmc-label" style="margin-left:-4px"></span>
    </div>
    <div class="bmc-input-row">
      <span class="bmc-label">每关波数</span>
      <input type="number" id="stage-wave-count" value="5" min="1" step="1"
             class="config-input bmc-input">
    </div>
    <div class="bmc-input-row">
      <span class="bmc-label">每波秒数</span>
      <input type="number" id="stage-wave-dur" value="10" min="1" step="1"
             class="config-input bmc-input">
    </div>
  `;
  col1.appendChild(stageCard);

  // Building cards 'med goes to col1, rest to col2
  BLDG_MODULE.forEach(b => {
    const card = document.createElement('div');
    card.className = 'bldg-mod-card glass rounded-xl';
    card.style.setProperty('--bmc-color', b.color);
    card.innerHTML = `
      <div class="bmc-header">
        <span class="bmc-dot" style="background:${b.color}"></span>
        <span class="bmc-name" style="color:${b.color}">${b.name}</span>
        <button class="bmc-chart-btn" data-card="${b.id}" title="查看1-100级数据">📊</button>
      </div>
      <div class="bmc-input-row">
        <span class="bmc-label">基础价格（金币）</span>
        <input type="number" id="bmc-base-${b.id}" value="${b.defaultBase}" min="1"
               class="config-input bmc-input">
      </div>
      <div class="bmc-formula">
        <span class="bmc-formula-label">升级价格公式</span>
        <code class="bmc-formula-code">基础价格 × (1 + 等级 ×
          <input type="number" id="bmc-multi-${b.id}" value="${b.defaultMulti || 0.1}" step="0.01" min="0"
                 class="config-input bmc-param-input"> )</code>
      </div>
    `;
    if (b.id === 'med') col1.appendChild(card);
    else col2.appendChild(card);
  });

  container.appendChild(col1);
  container.appendChild(col2);
}

function updateBldgModuleCard(b) {
  const { base, multi } = getBldgParams(b);
  const exampleEl = document.getElementById(`bmc-example-${b.id}`);

  if (exampleEl) {
    const levels = [1, 10, 100];
    exampleEl.innerHTML = levels.map(lv => {
      const cost = bldgCostFormula(base, lv, multi);
      return `<div class="bmc-ex-item"><span class="bmc-ex-lv">Lv.${lv}</span><span class="bmc-ex-val">${base} × ${(1 + lv * multi).toFixed(1)} = <b>${cost.toFixed(1)}</b></span></div>`;
    }).join('');
  }
}

function updateStageCard() {
  const exampleEl = document.getElementById('bmc-example-stage');
  if (!exampleEl) return;
  const { goldPerSec } = computeStageGoldData();
  const examples = [
    { lv: 1, gps: goldPerSec[0] },
    { lv: 50, gps: goldPerSec[49] },
    { lv: 100, gps: goldPerSec[99] },
  ];
  exampleEl.innerHTML = examples.map(e =>
    `<div class="bmc-ex-item"><span class="bmc-ex-lv">Lv.${e.lv}</span><span class="bmc-ex-val"><b>${e.gps.toFixed(2)}</b> '</span></div>`
  ).join('');
}

function updateAllBldgModuleCards() {
  drawBldgChart();
}

// ── Canvas Chart ─────────────────────────────────────────────────────
function drawBldgChart() {
  const canvas = document.getElementById('bldg-chart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 30, bottom: 56, left: 65 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // ── Build per-building-level data (1..100) with unlock ───────────
  const bldgParams = BLDG_MODULE.map(b => getBldgParams(b));
  const secPerStage = getSecPerStage();
  const N = BLDG_MAX_LEVEL;  // 100

  // Per-building cumulative cost (respecting unlock levels)
  const perBldgCumCost = BLDG_MODULE.map((b, idx) => {
    const arr = [];
    let cum = 0;
    for (let lv = 1; lv <= N; lv++) {
      const eff = effectiveBldgLv(lv, b.unlock);
      if (eff > 0) {
        cum += bldgCostFormula(bldgParams[idx].base, eff, bldgParams[idx].multi);
      }
      arr.push(cum);
    }
    return arr;
  });

  // Cumulative gold (total cost of all buildings up to level)
  const cumulativeGold = [];
  for (let lv = 0; lv < N; lv++) {
    let sum = 0;
    perBldgCumCost.forEach(arr => { sum += arr[lv]; });
    cumulativeGold.push(sum);
  }

  // ── Y scaling ──────────────────────────────────────────────────────
  const allMaxVals = [
    cumulativeGold[N - 1] || 0,
    ...perBldgCumCost.map(arr => arr[N - 1] || 0),
  ];
  const maxVal = Math.max(...allMaxVals);
  const yMax = Math.ceil(maxVal / 10) * 10 || 10;

  const xPx = lv => pad.left + (lv / (N - 1)) * plotW;  // lv = 0-based level index
  const yPx = val => pad.top + plotH - (val / yMax) * plotH;

  // ── Grid lines ─────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    const val = yMax - (i / ySteps) * yMax;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(val.toFixed(0), pad.left - 8, y);
  }

  // ── X labels 'dual row: building levels (top) + chapter names (bottom) ──
  const chCount = CHAPTERS.length;
  // Row 1: Building level ticks every 10 levels (= chapter boundaries)
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let lv = 0; lv <= N; lv += 10) {
    const x = lv === 0 ? pad.left : (lv >= N ? pad.left + plotW : xPx(lv - 1));
    // Vertical dashed chapter boundary
    if (lv > 0 && lv < N) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Level label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`Lv.${lv || 1}`, x, pad.top + plotH + 4);
  }

  // Row 2: Chapter names at midpoints
  ctx.font = '10px Inter, sans-serif';
  for (let i = 0; i < chCount; i++) {
    const midLv = i * 10 + 5;  // midpoint building level for chapter i
    const midX = xPx(midLv - 1);
    const color = CHAPTERS[i]?.color || 'rgba(255,255,255,0.35)';
    ctx.fillStyle = color;
    ctx.fillText(`${i + 1}章`, midX, pad.top + plotH + 18);
  }

  // Y axis label
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('金币', 0, 0);
  ctx.restore();

  // ── Draw curves ────────────────────────────────────────────────────
  function drawCurve(data, color, lineWidth, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = 6;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    let started = false;
    data.forEach((val, i) => {
      if (val === 0 && !started) return; // skip leading zeros
      const x = xPx(i), y = yPx(val);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    if (started) ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  }

  // Per-building cumulative cost curves
  BLDG_MODULE.forEach((b, idx) => {
    drawCurve(perBldgCumCost[idx], b.color, 2);
  });

  // Total cumulative cost curve (white)
  drawCurve(cumulativeGold, '#ffffff', 3);

  // Total cumulative output curve (yellow) 'scales to break-even point
  const initGold = parseFloat(document.getElementById('stage-init-gold')?.value) || 1000;
  const beChapter = parseInt(document.getElementById('stage-breakeven')?.value) || 4;
  const beLv = (beChapter - 1) * 10 + 1;  // break-even at start of chapter (0-indexed: beLv-1)

  // Raw gold per stage (smooth, based on overall level)
  const rawGoldPerStage = [];
  for (let lv = 1; lv <= N; lv++) {
    let g = 0;
    BLDG_MODULE.forEach((b, idx) => {
      if (lv >= b.unlock) g += bldgCostFormula(bldgParams[idx].base, lv, bldgParams[idx].multi);
    });
    rawGoldPerStage.push(g);
  }

  // Compute scale factor so cumOutput(beLv) = cumCost(beLv)
  const cumCostAtBE = cumulativeGold[Math.min(beLv - 1, N - 1)];
  let rawCumAtBE = 0;
  for (let i = 0; i < Math.min(beLv, N); i++) rawCumAtBE += rawGoldPerStage[i];
  const scaleFactor = rawCumAtBE > 0 ? (cumCostAtBE - initGold) / rawCumAtBE : 1;

  const cumulativeOutput = [];
  let cumOut = initGold;
  let prevGPS = 0;
  for (let lv = 0; lv < N; lv++) {
    let gps;
    if (lv < beLv) {
      gps = rawGoldPerStage[lv] * scaleFactor;
    } else {
      // After break-even: track actual cost, but never decrease (monotonic)
      const actualDelta = lv === 0 ? cumulativeGold[0] : (cumulativeGold[lv] - cumulativeGold[lv - 1]);
      gps = Math.max(prevGPS, actualDelta);
    }
    prevGPS = gps;
    cumOut += gps;
    cumulativeOutput.push(cumOut);
  }
  drawCurve(cumulativeOutput, STAGE_COLOR, 3);

  // Legend
  const legendEl = document.getElementById('bldg-chart-legend');
  if (legendEl) {
    let html = `<div class="bcl-item"><span class="bcl-dot" style="background:${STAGE_COLOR}"></span><span class="bcl-label">总产出（累计）</span></div>`;
    html += `<div class="bcl-item"><span class="bcl-dot" style="background:#ffffff"></span><span class="bcl-label">总消耗（累计）</span></div>`;
    html += BLDG_MODULE.map((b, idx) =>
      `<div class="bcl-item"><span class="bcl-dot" style="background:${b.color}"></span><span class="bcl-label">${b.name}（累计）</span></div>`
    ).join('');
    legendEl.innerHTML = html;
  }
}

// ══════════════════════════════════════════════════════════════════════'
// RESOURCE OUTPUT MODULE
// ══════════════════════════════════════════════════════════════════════'

function resOutputFormula(base, level, multi) {
  return base * (1 + level * multi);
}

function getResParams(b) {
  const base = parseFloat(document.getElementById(`res-base-${b.id}`)?.value) || b.resBase;
  const multi = parseFloat(document.getElementById(`res-multi-${b.id}`)?.value);
  return { base, multi: isNaN(multi) ? 0.1 : multi };
}

function resConsumeFormula(base, level, multi) {
  return base * (1 + level * multi);
}

function getConsumerParams(c) {
  const base = parseFloat(document.getElementById(`resc-base-${c.id}`)?.value) || c.consumeBase;
  const multi = parseFloat(document.getElementById(`resc-multi-${c.id}`)?.value);
  return { base, multi: isNaN(multi) ? (c.defaultMulti || 0.1) : multi };
}

function buildResModuleCards() {
  const container = document.getElementById('res-module-cards');
  if (!container) return;
  container.innerHTML = '';

  const col1 = document.createElement('div');
  col1.className = 'bldg-col';
  const col2 = document.createElement('div');
  col2.className = 'bldg-col';

  // Left col: Producer cards (auto-calculated output, like 关卡)
  RESOURCE_BLDGS.forEach(b => {
    // Find the paired consumer
    const consumer = RES_CONSUMERS.find(c => c.consumes === b.resource);
    const card = document.createElement('div');
    card.className = 'bldg-mod-card glass rounded-xl';
    card.style.setProperty('--bmc-color', b.color);
    card.innerHTML = `
      <div class="bmc-header">
        <span class="bmc-dot" style="background:${b.color}"></span>
        <span class="bmc-name" style="color:${b.color}">${b.name}（${b.resource}）</span>
        <button class="bmc-chart-btn res-popup-btn" data-res-id="${b.id}" title="查看1-100级数据">📊</button>
      </div>
      <div class="bmc-formula">
        <span class="bmc-formula-label">产出（自动计算）</span>
        <code class="bmc-formula-code" style="font-size:0.7rem">${consumer ? consumer.name : ''}累计费用 ÷ 每关时长</code>
      </div>
    `;
    col1.appendChild(card);
  });

  // Right col: Consumer cards (base + formula inputs)
  RES_CONSUMERS.forEach(c => {
    const card = document.createElement('div');
    card.className = 'bldg-mod-card glass rounded-xl';
    card.style.setProperty('--bmc-color', c.color);
    card.innerHTML = `
      <div class="bmc-header">
        <span class="bmc-dot" style="background:${c.color}"></span>
        <span class="bmc-name" style="color:${c.color}">${c.name}（${c.consumes}）</span>
        <button class="bmc-chart-btn resc-popup-btn" data-resc-id="${c.id}" title="查看1-100级数据">📊</button>
      </div>
      <div class="bmc-input-row">
        <span class="bmc-label">基础消耗</span>
        <input type="number" id="resc-base-${c.id}" value="${c.consumeBase}" min="1"
               class="config-input bmc-input">
      </div>
      <div class="bmc-formula">
        <span class="bmc-formula-label">消耗公式</span>
        <code class="bmc-formula-code">基础消耗× (1 + 等级 ×
          <input type="number" id="resc-multi-${c.id}" value="0.1" step="0.01" min="0"
                 class="config-input bmc-param-input"> )</code>
      </div>
    `;
    col2.appendChild(card);
  });

  container.appendChild(col1);
  container.appendChild(col2);
}

function drawResChart() {
  const canvas = document.getElementById('res-chart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 30, bottom: 56, left: 65 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const N = BLDG_MAX_LEVEL;

  // Per-consumer cumulative resource consumption (like gold building costs)
  const consParams = RES_CONSUMERS.map(c => getConsumerParams(c));
  const perConsCumRes = RES_CONSUMERS.map((c, idx) => {
    const arr = [];
    let cum = 0;
    for (let lv = 1; lv <= N; lv++) {
      const eff = effectiveConsumerLv(lv, c.unlock);
      const prevEff = effectiveConsumerLv(lv - 1, c.unlock);
      for (let e = prevEff + 1; e <= eff; e++) {
        cum += resConsumeFormula(consParams[idx].base, e, consParams[idx].multi);
      }
      arr.push(cum);
    }
    return arr;
  });

  // Y scaling
  const consMax = perConsCumRes.map(arr => arr[N - 1] || 0);
  const maxVal = Math.max(...consMax, 1);
  const yMax = Math.ceil(maxVal / 10) * 10 || 10;

  const xPx = lv => pad.left + (lv / (N - 1)) * plotW;
  const yPx = val => pad.top + plotH - (val / yMax) * plotH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * plotH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    const val = yMax - (i / ySteps) * yMax;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(val.toFixed(0), pad.left - 8, y);
  }

  // X labels 'dual row: building levels + chapters
  const chCount = CHAPTERS.length;
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let lv = 0; lv <= N; lv += 10) {
    const x = lv === 0 ? pad.left : (lv >= N ? pad.left + plotW : xPx(lv - 1));
    if (lv > 0 && lv < N) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`Lv.${lv || 1}`, x, pad.top + plotH + 4);
  }
  ctx.font = '10px Inter, sans-serif';
  for (let i = 0; i < chCount; i++) {
    const midLv = i * 10 + 5;
    const midX = xPx(midLv - 1);
    const color = CHAPTERS[i]?.color || 'rgba(255,255,255,0.35)';
    ctx.fillStyle = color;
    ctx.fillText(`${i + 1}章`, midX, pad.top + plotH + 18);
  }

  // Y axis label
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('资源', 0, 0);
  ctx.restore();

  // Draw curves
  function drawCurve(data, color, lineWidth, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = 6;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    let started = false;
    data.forEach((val, i) => {
      if (val === 0 && !started) return;
      const x = xPx(i), y = yPx(val);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    if (started) ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Consumer consumption curves
  RES_CONSUMERS.forEach((c, idx) => {
    drawCurve(perConsCumRes[idx], c.color, 2.5);
  });

  // Legend
  const legendEl = document.getElementById('res-chart-legend');
  if (legendEl) {
    legendEl.innerHTML = RES_CONSUMERS.map(c => {
      const prod = RESOURCE_BLDGS.find(b => b.resource === c.consumes);
      return `<div class="bcl-item"><span class="bcl-dot" style="background:${c.color}"></span><span class="bcl-label">${c.consumes}${prod ? prod.name + '\u2192' : ''}${c.name}</span></div>`;
    }).join('');
  }
}

function updateAllResCards() {
  drawResChart();
}

// ── Combat Power chart ───────────────────────────────────────────────
const CP_BUILDINGS = [
  { id: 'weapon', name: '武器店', color: '#f59e0b', atkInput: 'cp-weapon-atk', hpInput: null, atkSplit: 4 },
  { id: 'armor', name: '护甲店', color: '#22d3ee', atkInput: null, hpInput: 'cp-armor-hp' },
  { id: 'bless', name: '祝福圣殿', color: '#c084fc', atkInput: null, hpInput: 'cp-bless-hp' },
];

function drawCPChart() {
  const canvas = document.getElementById('cp-chart');
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 30, bottom: 40, left: 65 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const atkRatio = parseFloat(document.getElementById('cp-atk-ratio')?.value) || 5;
  const hpRatio = parseFloat(document.getElementById('cp-hp-ratio')?.value) || 1;
  const maxOps = 100;

  // Get per-op stats for each building
  const bldgData = CP_BUILDINGS.map(b => {
    const atk = b.atkInput ? (parseFloat(document.getElementById(b.atkInput)?.value) || 0) : 0;
    const hp = b.hpInput ? (parseFloat(document.getElementById(b.hpInput)?.value) || 0) : 0;
    const totalPowerPerOp = atk * (b.atkSplit || 1) * atkRatio + hp * hpRatio;
    return { ...b, atk, hp, totalPowerPerOp };
  });

  // Cumulative power per building (individual curves, unlock-aware)
  const cumPower = bldgData.map(b => {
    const arr = [];
    const consumerMatch = RES_CONSUMERS.find(c => c.id === b.id || (b.id === 'bless' && c.id === 'blessing'));
    const consumerUnlock = consumerMatch ? consumerMatch.unlock : 1;
    for (let op = 1; op <= maxOps; op++) {
      const effOps = effectiveConsumerLv(op, consumerUnlock);
      arr.push(effOps * b.totalPowerPerOp * milestoneBonus(op));
    }
    return arr;
  });

  // Total cumulative (uses totalPowerPerOp with ×4, unlock-aware)
  const totalPower = [];
  for (let op = 1; op <= maxOps; op++) {
    let total = 0;
    bldgData.forEach(b => {
      const consumerMatch = RES_CONSUMERS.find(c => c.id === b.id || (b.id === 'bless' && c.id === 'blessing'));
      const consumerUnlock = consumerMatch ? consumerMatch.unlock : 1;
      const effOps = effectiveConsumerLv(op, consumerUnlock);
      total += effOps * b.totalPowerPerOp * milestoneBonus(op);
    });
    totalPower.push(total);
  }

  const maxVal = Math.max(totalPower[maxOps - 1] || 1, 1);
  const yMax = Math.ceil(maxVal / 100) * 100 || 100;

  const xPx = i => pad.left + (i / (maxOps - 1)) * plotW;
  const yPx = val => pad.top + plotH - (val / yMax) * plotH;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = pad.top + (plotH / yTicks) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(yMax - (yMax / yTicks) * i), pad.left - 6, y + 4);
  }

  // X labels
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const xLabelStep = Math.max(1, Math.floor(maxOps / 10));
  for (let op = 0; op <= maxOps; op += xLabelStep) {
    if (op === 0) continue;
    const x = xPx(op - 1);
    ctx.fillText(op, x, H - pad.bottom + 16);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('操作次数', pad.left + plotW / 2, H - 4);

  // Draw curve helper
  function drawCurve(data, color, lineWidth, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    let started = false;
    data.forEach((val, i) => {
      if (val === 0 && !started) return;
      const x = xPx(i), y = yPx(val);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    if (started) ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  }

  // Per-building curves (different dash patterns)
  const dashPatterns = [[], [8, 4], [3, 3]];
  bldgData.forEach((b, idx) => {
    if (b.totalPowerPerOp > 0) drawCurve(cumPower[idx], b.color, 2.5, dashPatterns[idx]);
  });

  // Total curve (white, solid)
  drawCurve(totalPower, '#ffffff', 3);

  // Legend
  const legendEl = document.getElementById('cp-chart-legend');
  if (legendEl) {
    let html = `<div class="bcl-item"><span class="bcl-dot" style="background:#fff"></span><span class="bcl-label">\u5efa\u7b51\u603b\u6218\u529b</span></div>`;
    html += bldgData.filter(b => b.totalPowerPerOp > 0).map(b =>
      `<div class="bcl-item"><span class="bcl-dot" style="background:${b.color}"></span><span class="bcl-label">${b.name}</span></div>`
    ).join('');
    legendEl.innerHTML = html;
  }
}

// ── Excel download helper ────────────────────────────────────────────
function downloadExcel(title, headers, rows) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${title}.xlsx`);
}

// ── Resource data popup ──────────────────────────────────────────────
function showResDataPopup(b) {
  document.getElementById('data-popup-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'data-popup-overlay';
  overlay.className = 'data-popup-overlay';
  overlay.addEventListener('click', () => overlay.remove());

  const box = document.createElement('div');
  box.className = 'data-popup-box';
  box.addEventListener('click', e => e.stopPropagation());

  function lvToChapter(lv) {
    return Math.floor((lv - 1) / 10) + 1;
  }

  const consumer = RES_CONSUMERS.find(c => c.consumes === b.resource);
  if (!consumer) { overlay.remove(); return; }
  const { base, multi } = getConsumerParams(consumer);
  const secPerStage = getSecPerStage();
  const split = consumer.levelSplit || 1;
  const headers = ['等级', `${b.resource}/秒`, `累计${b.resource}`];
  const rows = [];
  let cum = 0;
  let prevRPS = 0;
  for (let lv = 1; lv <= BLDG_MAX_LEVEL; lv++) {
    const costAtLv = resConsumeFormula(base, lv, multi) / split;
    cum += costAtLv;
    const rps = Math.max(prevRPS, costAtLv / secPerStage);
    prevRPS = rps;
    rows.push([
      `Lv.${lv}`,
      rps.toFixed(2),
      cum.toFixed(0)
    ]);
  }

  const popupTitle1 = `${b.name}${b.resource} 产出 Lv.1'00`;
  box.innerHTML = `
    <div class="data-popup-title">${popupTitle1}
      <button class="popup-dl-btn" title="下载Excel">📥</button>
    </div>
    <div class="data-popup-scroll">
      <table class="data-popup-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `;
  box.querySelector('.popup-dl-btn').addEventListener('click', () => downloadExcel(popupTitle1, headers, rows));

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// ── Resource consumer data popup ─────────────────────────────────────
function showResConsumePopup(c) {
  document.getElementById('data-popup-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'data-popup-overlay';
  overlay.className = 'data-popup-overlay';
  overlay.addEventListener('click', () => overlay.remove());

  const box = document.createElement('div');
  box.className = 'data-popup-box';
  box.addEventListener('click', e => e.stopPropagation());

  function lvToChapter(lv) { return Math.floor((lv - 1) / 10) + 1; }

  const { base, multi } = getConsumerParams(c);
  const split = c.levelSplit || 1;
  const headers = ['等级', `${c.consumes}/关`, `累计${c.consumes}`];
  const rows = [];
  let cum = 0;
  for (let lv = 1; lv <= BLDG_MAX_LEVEL; lv++) {
    const output = resConsumeFormula(base, lv, multi) / split;
    cum += output;
    rows.push([`Lv.${lv}`, output.toFixed(1), cum.toFixed(0)]);
  }

  const popupTitle2 = `${c.name}'{c.consumes} 消耗Lv.1'00`;
  box.innerHTML = `
    <div class="data-popup-title">${popupTitle2}
      <button class="popup-dl-btn" title="下载Excel">📥</button>
    </div>
    <div class="data-popup-scroll">
      <table class="data-popup-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `;
  box.querySelector('.popup-dl-btn').addEventListener('click', () => downloadExcel(popupTitle2, headers, rows));
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// ── Data popup modal ─────────────────────────────────────────────────
function showDataPopup(cardId) {
  // Remove existing popup if any
  document.getElementById('data-popup-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'data-popup-overlay';
  overlay.className = 'data-popup-overlay';
  overlay.addEventListener('click', () => overlay.remove());

  const box = document.createElement('div');
  box.className = 'data-popup-box';
  box.addEventListener('click', e => e.stopPropagation());

  let title = '';
  let headers = [];
  let rows = [];

  // Helper: building level 'chapter number
  function lvToChapter(lv) {
    return Math.min(CHAPTERS.length, Math.ceil(lv / 10));
  }

  if (cardId === 'stage') {
    title = '关卡产出 Lv.1-100';
    headers = ['关卡', '金币', '累计金币'];
    rows = [];

    const bldgParams = BLDG_MODULE.map(b => getBldgParams(b));
    const secPerStage = getSecPerStage();
    const initGold = parseFloat(document.getElementById('stage-init-gold')?.value) || 1000;
    const beChapter = parseInt(document.getElementById('stage-breakeven')?.value) || 4;
    const beLv = (beChapter - 1) * 10 + 1;

    // Raw gold per stage (smooth)
    const rawGold = [];
    for (let lv = 1; lv <= BLDG_MAX_LEVEL; lv++) {
      let g = 0;
      BLDG_MODULE.forEach((b, idx) => {
        if (lv >= b.unlock) g += bldgCostFormula(bldgParams[idx].base, lv, bldgParams[idx].multi);
      });
      rawGold.push(g);
    }

    // Actual cumulative cost (with catch-up)
    const cumCostArr = [];
    let cumCostTotal = 0;
    for (let lv = 1; lv <= BLDG_MAX_LEVEL; lv++) {
      BLDG_MODULE.forEach((b, idx) => {
        const eff = effectiveBldgLv(lv, b.unlock);
        const prevEff = effectiveBldgLv(lv - 1, b.unlock);
        for (let e = prevEff + 1; e <= eff; e++) {
          cumCostTotal += bldgCostFormula(bldgParams[idx].base, e, bldgParams[idx].multi);
        }
      });
      cumCostArr.push(cumCostTotal);
    }

    // Scale factor
    let rawCumAtBE = 0;
    for (let i = 0; i < Math.min(beLv, BLDG_MAX_LEVEL); i++) rawCumAtBE += rawGold[i];
    const cumCostAtBE = cumCostArr[Math.min(beLv - 1, BLDG_MAX_LEVEL - 1)];
    const sf = rawCumAtBE > 0 ? (cumCostAtBE - initGold) / rawCumAtBE : 1;

    // Monotonic gold/sec: rawGold*sf before BE, max(prev, actualDelta) after BE
    let cumOut = initGold;
    let prevGPS = 0;
    for (let lv = 1; lv <= BLDG_MAX_LEVEL; lv++) {
      const ch = lvToChapter(lv);
      let goldPerStage;
      if (lv <= beLv) {
        goldPerStage = rawGold[lv - 1] * sf;
      } else {
        const actualDelta = cumCostArr[lv - 1] - cumCostArr[lv - 2];
        goldPerStage = Math.max(prevGPS, actualDelta);
      }
      prevGPS = goldPerStage;
      cumOut += goldPerStage;
      const gps = goldPerStage / secPerStage;
      rows.push([
        `${ch}-${((lv - 1) % 10) + 1}`,
        gps.toFixed(2),
        cumOut.toFixed(0)
      ]);
    }
  } else {
    const b = BLDG_MODULE.find(x => x.id === cardId);
    if (!b) return;
    const { base, multi } = getBldgParams(b);
    title = `${b.name} 升级费用 Lv.1'00`;
    headers = ['等级', '升级费用', '累计费用'];
    let cumul = 0;
    rows = [];
    for (let lv = 1; lv <= 100; lv++) {
      const cost = bldgCostFormula(base, lv, multi);
      cumul += cost;
      rows.push([`Lv.${lv}`, cost.toFixed(1), cumul.toFixed(1)]);
    }
  }

  box.innerHTML = `
    <div class="data-popup-title">${title}
      <button class="popup-dl-btn" title="下载Excel">📥</button>
    </div>
    <div class="data-popup-scroll">
      <table class="data-popup-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  `;
  box.querySelector('.popup-dl-btn').addEventListener('click', () => downloadExcel(title, headers, rows));

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Build cards + initial render
buildBldgModuleCards();
updateAllBldgModuleCards();

// Wire inputs (building base/multi + stage wave config)
BLDG_MODULE.forEach(b => {
  ['bmc-base-', 'bmc-multi-'].forEach(prefix => {
    const el = document.getElementById(prefix + b.id);
    if (el) el.addEventListener('input', updateAllBldgModuleCards);
  });
});
['cfg-waves', 'cfg-wave-sec'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    // Sync to building tab inputs
    if (id === 'cfg-waves') {
      const s = document.getElementById('stage-wave-count');
      if (s) s.value = el.value;
    } else {
      const s = document.getElementById('stage-wave-dur');
      if (s) s.value = el.value;
    }
    updateAllBldgModuleCards();
    updateChapters();
  });
});
// Building tab wave inputs 'sync back to overview
['stage-wave-count', 'stage-wave-dur'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    if (id === 'stage-wave-count') {
      const c = document.getElementById('cfg-waves');
      if (c) c.value = el.value;
    } else {
      const c = document.getElementById('cfg-wave-sec');
      if (c) c.value = el.value;
    }
    updateAllBldgModuleCards();
    updateChapters();
  });
});

// Initial gold + break-even inputs
['stage-init-gold', 'stage-breakeven'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateAllBldgModuleCards);
});

// Chart icon buttons 'open data popup (gold module only 'filter by data-card)
document.querySelectorAll('.bmc-chart-btn[data-card]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const cardId = btn.dataset.card;
    showDataPopup(cardId);
  });
});

// ── Material Module init ──────────────────────────────────────────────
buildResModuleCards();
updateAllResCards();

// Wire consumer inputs (producers are auto-calculated)
RES_CONSUMERS.forEach(c => {
  ['resc-base-', 'resc-multi-'].forEach(prefix => {
    const el = document.getElementById(prefix + c.id);
    if (el) el.addEventListener('input', updateAllResCards);
  });
});

// Resource producer popup buttons
document.querySelectorAll('.res-popup-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const bId = btn.dataset.resId;
    const b = RESOURCE_BLDGS.find(x => x.id === bId);
    if (b) showResDataPopup(b);
  });
});

// Resource consumer popup buttons
document.querySelectorAll('.resc-popup-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const cId = btn.dataset.rescId;
    const c = RES_CONSUMERS.find(x => x.id === cId);
    if (c) showResConsumePopup(c);
  });
});

// ── Inject 'formula info into card headers ──────────────────────────
function lvToStageStr(lv) { const ch = Math.ceil(lv / 10); return `${ch}-${((lv - 1) % 10) + 1}`; }
const formulaMap = {
  stage: '\u25b6 \u539f\u59cb\u4ea7\u51fa = \u2211(\u5df2\u89e3\u9501\u5efa\u7b51\u5347\u7ea7\u8d39) \u57fa\u4e8e\u603b\u7b49\u7ea7(\u5e73\u6ed1)\n\u25b6 sf = (\u5e73\u8861\u70b9\u7d2f\u8ba1\u6d88\u8017\u2212\u521d\u59cb\u91d1) \u00f7 \u539f\u59cb\u7d2f\u8ba1\u4ea7\u51fa\n\u25b6 \u5e73\u8861\u524d: \u91d1/\u79d2 = \u539f\u59cb\u4ea7\u51fa\u00d7sf\u00f7\u65f6\u957f\n\u25b6 \u5e73\u8861\u540e: max(\u4e0a\u4e00\u7ea7, \u5b9e\u9645\u6d88\u8017\u5dee\u00f7\u65f6\u957f)\u2014\u4e0d\u5012\u6302',
};
BLDG_MODULE.forEach(b => {
  formulaMap[b.id] = `\u25b6 \u5347\u7ea7\u8d39\u7528 = \u57fa\u7840\u4ef7\u683c\u00d7(1+\u7b49\u7ea7\u00d7\u500d\u7387)\n\u25b6 \u8ffd\u5e73: \u89e3\u9501\u540e\u52a0\u901f\uff0c\u7ae0\u8282\u672b\u8ffd\u5e73\u603b\u7b49\u7ea7\n\u25b6 \u89e3\u9501: \u5173\u5361 ${lvToStageStr(b.unlock)}`;
});
RESOURCE_BLDGS.forEach(b => {
  const consumer = RES_CONSUMERS.find(c => c.consumes === b.resource);
  formulaMap['res-' + b.id] = `\u25b6 \u4ea7\u51fa = \u914d\u5bf9\u6d88\u8d39\u5efa\u7b51\u6d88\u8017\u00f7\u6bcf\u5173\u65f6\u957f\n\u25b6 \u5e73\u6ed1: max(\u4e0a\u4e00\u7ea7, \u5f53\u524d)\u2014\u4e0d\u5012\u6302${consumer ? '\n\u25b6 \u914d\u5bf9: ' + consumer.name : ''}`;
});
RES_CONSUMERS.forEach(c => {
  formulaMap['resc-' + c.id] = `\u25b6 \u6d88\u8017 = \u57fa\u7840\u6d88\u8017\u00d7(1+\u7b49\u7ea7\u00d7\u500d\u7387)\n\u25b6 \u8ffd\u5e73: \u89e3\u9501\u540e\u52a0\u901f\uff0c\u7ae0\u8282\u672b\u8ffd\u5e73\u603b\u7b49\u7ea7\n\u25b6 \u89e3\u9501: \u5173\u5361 ${lvToStageStr(c.unlock)}${c.levelSplit ? '\n\u25b6 ' + c.levelSplit + '\u90e8\u4f4d\u5206\u5f00\u8ba1\u7b97\uff0c\u8868\u683c\u00f7' + c.levelSplit : ''}`;
});

function injectInfoButtons() {
  document.querySelectorAll('.bmc-header').forEach(header => {
    if (header.querySelector('.bmc-info-btn')) return; // already injected
    // Find card id from chart button or popup button
    const chartBtn = header.querySelector('.bmc-chart-btn[data-card]');
    const resBtn = header.querySelector('.res-popup-btn[data-res-id]');
    const rescBtn = header.querySelector('.resc-popup-btn[data-resc-id]');
    let key = null;
    if (chartBtn) key = chartBtn.dataset.card;
    else if (resBtn) key = 'res-' + resBtn.dataset.resId;
    else if (rescBtn) key = 'resc-' + rescBtn.dataset.rescId;
    if (!key || !formulaMap[key]) return;

    const infoBtn = document.createElement('button');
    infoBtn.className = 'bmc-info-btn';
    infoBtn.title = '公式详情';
    infoBtn.textContent = 'ℹ';
    header.insertBefore(infoBtn, header.querySelector('.bmc-chart-btn, .res-popup-btn, .resc-popup-btn'));

    const tip = document.createElement('div');
    tip.className = 'bmc-info-tip';
    tip.style.display = 'none';
    tip.innerHTML = formulaMap[key].split('\n').map(l => `<p>${l}</p>`).join('');
    header.parentElement.insertBefore(tip, header.nextSibling);

    infoBtn.addEventListener('click', e => {
      e.stopPropagation();
      tip.style.display = tip.style.display === 'none' ? 'block' : 'none';
    });
  });
}
injectInfoButtons();

// Combat power inputs + init
drawCPChart();
['cp-atk-ratio', 'cp-hp-ratio', 'cp-milestone', 'cp-weapon-atk', 'cp-armor-hp', 'cp-bless-hp'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { drawCPChart(); drawLevelCPChart(); });
});

// ── Level Combat Power chart ─────────────────────────────────────────
let _lcpChData = []; // cached for popup

function drawLevelCPChart() {
  const canvas = document.getElementById('lcp-chart');
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 30, bottom: 50, left: 75 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Read building power config
  const atkRatio = parseFloat(document.getElementById('cp-atk-ratio')?.value) || 5;
  const hpRatio = parseFloat(document.getElementById('cp-hp-ratio')?.value) || 1;
  const bldgData = CP_BUILDINGS.map(b => {
    const atk = b.atkInput ? (parseFloat(document.getElementById(b.atkInput)?.value) || 0) : 0;
    const hp = b.hpInput ? (parseFloat(document.getElementById(b.hpInput)?.value) || 0) : 0;
    const totalPowerPerOp = atk * (b.atkSplit || 1) * atkRatio + hp * hpRatio;
    return { ...b, atk, hp, totalPowerPerOp };
  });
  const buildingPowerPerOp = bldgData.reduce((s, b) => s + b.totalPowerPerOp, 0);

  // Read level CP config
  const opsPerCh = parseInt(document.getElementById('lcp-ops-per-ch')?.value) || 10;
  const maxCh = parseInt(document.getElementById('lcp-max-ch')?.value) || 20;
  const summonInit = parseInt(document.getElementById('lcp-summon-init')?.value) || 0;
  const summonMax = parseInt(document.getElementById('lcp-summon-max')?.value) || 0;
  const summonStep = parseInt(document.getElementById('lcp-summon-step')?.value) || 0;
  const summonPowerPerCall = parseFloat(document.getElementById('lcp-summon-power')?.value) || 0;
  const summonPowerStep = parseFloat(document.getElementById('lcp-summon-power-step')?.value) || 0;

  // Read team slot config
  const teamInit = parseInt(document.getElementById('team-init')?.value) || 4;
  const teamPerCh = parseInt(document.getElementById('team-per-ch')?.value) || 1;
  const teamMax = parseInt(document.getElementById('team-max')?.value) || 15;

  const numChapters = maxCh;

  // Compute per-chapter data
  // 建筑总战力 = per-hero building power × ALL slots
  // 召唤总战力 = 建筑总战力 × summonRatio (extra bonus from summoning)
  // 关卡总战力 = 建筑总战力 + 召唤总战力
  const chData = [];
  for (let ch = 1; ch <= numChapters; ch++) {
    const cumulativeOps = ch * opsPerCh;
    const singleHeroPower = cumulativeOps * buildingPowerPerOp * milestoneBonus(cumulativeOps);
    const slots = Math.min(teamMax, teamInit + (ch - 1) * teamPerCh);
    // Summon count: ramp from init toward max
    const summonCount = Math.min(summonMax, summonInit + (ch - 1) * summonStep);
    const buildingPower = singleHeroPower * slots;
    // Summon power scales with chapter growth and milestone bonus
    const actualSummonPower = (summonPowerPerCall + (ch - 1) * summonPowerStep) * milestoneBonus(cumulativeOps);
    const summonPower = summonCount * actualSummonPower * slots;
    const totalPower = buildingPower + summonPower;
    chData.push({ ch, cumulativeOps, singleHeroPower, slots, summonCount, buildingPower, summonPower, totalPower });
  }
  _lcpChData = chData;

  // Chart
  const maxVal = Math.max(...chData.map(d => d.totalPower), 1);
  const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

  const xPx = i => pad.left + (i / (numChapters - 1)) * plotW;
  const yPx = val => pad.top + plotH - (val / yMax) * plotH;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = pad.top + (plotH / yTicks) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(yMax - (yMax / yTicks) * i).toLocaleString(), pad.left - 6, y + 4);
  }

  // X labels (chapters)
  ctx.textAlign = 'center';
  for (let i = 0; i < numChapters; i++) {
    const chColor = (i < CHAPTERS.length) ? CHAPTERS[i].color : 'rgba(255,255,255,0.35)';
    ctx.fillStyle = chColor;
    ctx.fillText(`${i + 1}`, xPx(i), H - pad.bottom + 16);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('\u7ae0\u8282', pad.left + plotW / 2, H - 4);

  // Y axis label
  ctx.save();
  ctx.translate(12, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u6218\u529b', 0, 0);
  ctx.restore();

  function drawCurve(data, color, lineWidth, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = xPx(i), y = yPx(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    // Draw dots
    data.forEach((val, i) => {
      ctx.beginPath();
      ctx.arc(xPx(i), yPx(val), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  // Three curves: building, summon, total
  drawCurve(chData.map(d => d.buildingPower), '#22d3ee', 2, []);
  drawCurve(chData.map(d => d.summonPower), '#8b5cf6', 2, [6, 3]);
  drawCurve(chData.map(d => d.totalPower), '#ffffff', 3, []);

  // Legend
  const legendEl = document.getElementById('lcp-chart-legend');
  if (legendEl) {
    legendEl.innerHTML = `
      <div class="bcl-item"><span class="bcl-dot" style="background:#fff"></span><span class="bcl-label">\u5173\u5361\u603b\u6218\u529b</span></div>
      <div class="bcl-item"><span class="bcl-dot" style="background:#22d3ee"></span><span class="bcl-label">\u5efa\u7b51\u603b\u6218\u529b</span></div>
      <div class="bcl-item"><span class="bcl-dot" style="background:#8b5cf6"></span><span class="bcl-label">\u53ec\u5524\u603b\u6218\u529b</span></div>
    `;
  }
}

// ── Level CP data popup ──────────────────────────────────────────────
function showLCPDataPopup() {
  document.getElementById('data-popup-overlay')?.remove();

  // Re-read config to produce per-level rows
  const atkRatio = parseFloat(document.getElementById('cp-atk-ratio')?.value) || 5;
  const hpRatio = parseFloat(document.getElementById('cp-hp-ratio')?.value) || 1;
  const bldgData = CP_BUILDINGS.map(b => {
    const atk = b.atkInput ? (parseFloat(document.getElementById(b.atkInput)?.value) || 0) : 0;
    const hp = b.hpInput ? (parseFloat(document.getElementById(b.hpInput)?.value) || 0) : 0;
    return atk * (b.atkSplit || 1) * atkRatio + hp * hpRatio;
  });
  const powerPerOp = bldgData.reduce((s, v) => s + v, 0);
  const opsPerCh = parseInt(document.getElementById('lcp-ops-per-ch')?.value) || 10;
  const summonInit = (parseFloat(document.getElementById('lcp-summon-init')?.value) || 0) / 100;
  const summonMax = (parseFloat(document.getElementById('lcp-summon-max')?.value) || 0) / 100;
  const summonStep = (parseFloat(document.getElementById('lcp-summon-step')?.value) || 0) / 100;
  const teamInit = parseInt(document.getElementById('team-init')?.value) || 4;
  const teamPerCh = parseInt(document.getElementById('team-per-ch')?.value) || 1;
  const teamMax = parseInt(document.getElementById('team-max')?.value) || 15;
  const numCh = parseInt(document.getElementById('lcp-max-ch')?.value) || 20;

  const overlay = document.createElement('div');
  overlay.id = 'data-popup-overlay';
  overlay.className = 'data-popup-overlay';
  overlay.addEventListener('click', () => overlay.remove());

  const box = document.createElement('div');
  box.className = 'data-popup-box';
  box.addEventListener('click', e => e.stopPropagation());

  const title = '\u5173\u5361\u6218\u529b\u8be6\u60c5';
  const headers = ['\u5173\u5361', '\u7d2f\u8ba1\u64cd\u4f5c', '\u4e0a\u9635', '\u53ec\u5524\u6bd4', '\u5efa\u7b51\u6218\u529b', '\u53ec\u5524\u6218\u529b', '\u5173\u5361\u603b\u6218\u529b'];
  const rows = [];

  for (let ch = 1; ch <= numCh; ch++) {
    const slots = Math.min(teamMax, teamInit + (ch - 1) * teamPerCh);
    let sr;
    if (summonMax >= summonInit) sr = Math.min(summonMax, summonInit + (ch - 1) * summonStep);
    else sr = Math.max(summonMax, summonInit - (ch - 1) * summonStep);
    sr = Math.max(0, Math.min(1, sr));

    for (let lv = 1; lv <= opsPerCh; lv++) {
      const cumOps = (ch - 1) * opsPerCh + lv;
      const heroPower = cumOps * powerPerOp;
      const bPower = heroPower * slots;
      const sPower = bPower * sr;
      const total = bPower + sPower;
      rows.push([
        `${ch}-${lv}`,
        cumOps,
        `${slots}`,
        `${Math.round(sr * 100)}%`,
        bPower.toLocaleString(),
        sPower.toLocaleString(),
        total.toLocaleString()
      ]);
    }
  }

  box.innerHTML = `
    <div class="data-popup-title">${title}
      <button class="popup-dl-btn" title="\u4e0b\u8f7dExcel">\ud83d\udce5</button>
    </div>
    <div class="data-popup-scroll">
      <table class="data-popup-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r, i) => {
    const isFirst = i % opsPerCh === 0;
    return `<tr${isFirst ? ' class="eco-ch-start"' : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('')}</tbody>
      </table>
    </div>
  `;
  box.querySelector('.popup-dl-btn').addEventListener('click', () => downloadExcel(title, headers, rows));

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Level CP inputs + init
drawLevelCPChart();
['lcp-ops-per-ch', 'lcp-max-ch', 'lcp-summon-init', 'lcp-summon-max', 'lcp-summon-step', 'lcp-summon-power', 'lcp-summon-power-step'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', drawLevelCPChart);
});
document.getElementById('lcp-data-btn')?.addEventListener('click', showLCPDataPopup);

window.addEventListener('resize', () => { drawBldgChart(); drawResChart(); drawCPChart(); drawLevelCPChart(); });

// ── Town Hall manual progress bar ────────────────────────────────────
const bldgDetailEl = document.getElementById('bldg-detail-list');
let thCurrent = 1;
let thMax = 10;

{
  const color = TOWN_HALL_COLOR;
  const row = document.createElement('div');
  row.className = 'bldg-detail-row glass rounded-xl p-5';
  row.style.borderLeft = `4px solid ${color}`;
  row.innerHTML = `
    <div class="flex items-center justify-between gap-4 flex-wrap mb-4">
      <p class="font-bold text-base" style="color:${color}">市政厅</p>
      <div class="flex gap-4 items-end">
        <div class="text-center">
          <p class="text-white/40 text-xs mb-1">当前（等级）</p>
          <input type="number" id="th-current" value="1" min="1" class="config-input" style="width:6rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs mb-1">最大（等级</p>
          <input type="number" id="th-max" value="10" min="1" class="config-input" style="width:6rem">
        </div>
      </div>
    </div>
    <div style="position:relative;height:14px;border-radius:8px;background:rgba(255,255,255,0.08);margin-bottom:10px" id="th-track">
      <div id="th-fill" style="position:absolute;left:0;top:0;height:100%;border-radius:8px;background:${color};width:10%;pointer-events:none"></div>
      <div id="th-overlay" style="position:absolute;inset:0;cursor:pointer;border-radius:8px"></div>
      <div id="th-handle" style="position:absolute;top:50%;transform:translate(-50%,-50%);left:10%;width:20px;height:20px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.8);pointer-events:none"></div>
    </div>
    <div id="th-ticks" style="position:relative;height:20px;margin-top:2px;margin-bottom:4px"></div>
    <p class="text-sm" style="color:${color}" id="th-display"><b>Lv.1</b> / 10</p>
    <div id="th-unlock-info" class="mt-4" style="min-height:44px"></div>
  `;
  bldgDetailEl.appendChild(row);
}

// ── Team slots row (same style as Town Hall) ─────────────────────────
let teamCh = 1;
const TEAM_CHAPTERS = 15;
const TEAM_COLOR = '#fbbf24';

{
  const row = document.createElement('div');
  row.className = 'bldg-detail-row glass rounded-xl p-5';
  row.style.borderLeft = `4px solid ${TEAM_COLOR}`;
  row.innerHTML = `
    <div class="flex items-center justify-between gap-4 flex-wrap mb-4">
      <p class="font-bold text-base" style="color:${TEAM_COLOR}">\u961f\u4f0d\u4e0a\u9635\u4f4d</p>
      <div class="flex gap-4 items-end">
        <div class="text-center">
          <p class="text-white/40 text-xs mb-1">\u521d\u59cb</p>
          <input type="number" id="team-init" value="4" min="1" max="20" class="config-input" style="width:4rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs mb-1">\u6bcf\u7ae0+</p>
          <input type="number" id="team-per-ch" value="1" min="0" max="5" class="config-input" style="width:4rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs mb-1">\u4e0a\u9650</p>
          <input type="number" id="team-max" value="15" min="1" max="30" class="config-input" style="width:4rem">
        </div>
      </div>
    </div>
    <div style="position:relative;height:14px;border-radius:8px;background:rgba(255,255,255,0.08);margin-bottom:10px" id="team-track">
      <div id="team-fill" style="position:absolute;left:0;top:0;height:100%;border-radius:8px;background:${TEAM_COLOR};width:0%;pointer-events:none"></div>
      <div id="team-overlay" style="position:absolute;inset:0;cursor:pointer;border-radius:8px"></div>
      <div id="team-handle" style="position:absolute;top:50%;transform:translate(-50%,-50%);left:0%;width:20px;height:20px;border-radius:50%;background:${TEAM_COLOR};border:2px solid rgba(255,255,255,0.8);pointer-events:none"></div>
    </div>
    <div id="team-ticks" style="position:relative;height:20px;margin-top:2px;margin-bottom:4px"></div>
    <p class="text-sm" style="color:${TEAM_COLOR}" id="team-display"></p>
    <div id="team-slots-vis" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"></div>
  `;
  bldgDetailEl.appendChild(row);
}

function setTeamProgress() {
  teamCh = Math.max(1, Math.min(teamCh, TEAM_CHAPTERS));
  const pct = (teamCh / TEAM_CHAPTERS) * 100;
  document.getElementById('team-handle').style.left = `${pct}%`;
  document.getElementById('team-fill').style.width = `${pct}%`;

  const init = parseInt(document.getElementById('team-init')?.value) || 4;
  const perCh = parseInt(document.getElementById('team-per-ch')?.value) || 1;
  const max = parseInt(document.getElementById('team-max')?.value) || 15;
  const slots = Math.min(max, init + (teamCh - 1) * perCh);

  document.getElementById('team-display').innerHTML = `<b>\u7b2c${teamCh}\u7ae0</b> \u2014 ${slots} \u4e0a\u9635\u4f4d`;

  // Ticks (same style as TH)
  const ticksEl = document.getElementById('team-ticks');
  ticksEl.innerHTML = '';
  for (let i = 0; i <= TEAM_CHAPTERS; i++) {
    const pos = (i / TEAM_CHAPTERS * 100);
    const isMajor = (i === 0 || i === TEAM_CHAPTERS || i % 5 === 0);
    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:${pos}%;transform:translateX(-50%);width:${isMajor ? 2 : 1}px;height:${isMajor ? 8 : 5}px;background:rgba(255,255,255,${isMajor ? 0.4 : 0.18});top:0`;
    ticksEl.appendChild(tick);
    if (isMajor) {
      const lbl = document.createElement('span');
      lbl.style.cssText = `position:absolute;left:${pos}%;transform:translateX(-50%);font-size:10px;color:rgba(255,255,255,0.3);top:9px;white-space:nowrap;line-height:1`;
      lbl.textContent = i;
      ticksEl.appendChild(lbl);
    }
  }

  // Slot squares
  const vis = document.getElementById('team-slots-vis');
  let html = '';
  for (let i = 0; i < max; i++) {
    const filled = i < slots;
    html += `<div style="width:22px;height:22px;border-radius:4px;background:${filled ? 'rgba(250,204,21,0.8)' : 'rgba(255,255,255,0.06)'};border:1px solid ${filled ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.1)'};transition:all 0.2s"></div>`;
  }
  vis.innerHTML = html;
}

// Team drag interaction
{
  const overlay = document.getElementById('team-overlay');
  function teamFromX(e) {
    const rect = document.getElementById('team-track').getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    teamCh = Math.max(1, Math.round(ratio * TEAM_CHAPTERS));
    setTeamProgress();
  }
  let dragging = false;
  overlay.addEventListener('pointerdown', e => { dragging = true; overlay.setPointerCapture(e.pointerId); teamFromX(e); });
  overlay.addEventListener('pointermove', e => { if (dragging) teamFromX(e); });
  overlay.addEventListener('pointerup', () => { dragging = false; });
}

setTeamProgress();
['team-init', 'team-per-ch', 'team-max'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => { setTeamProgress(); drawLevelCPChart(); });
});

function setThProgress() {
  thCurrent = Math.max(1, Math.min(thCurrent, thMax));
  const pct = thMax > 0 ? (thCurrent / thMax * 100) : 0;
  document.getElementById('th-handle').style.left = `${pct}%`;
  document.getElementById('th-fill').style.width = `${pct}%`;
  document.getElementById('th-display').innerHTML = `<b>Lv.${thCurrent}</b> / ${thMax}`;
  const inCur = document.getElementById('th-current');
  if (document.activeElement !== inCur) inCur.value = thCurrent;

  const ticksEl = document.getElementById('th-ticks');
  ticksEl.innerHTML = '';
  for (let i = 0; i <= thMax; i++) {
    const pos = (i / thMax * 100);
    const isMajor = (i === 0 || i === thMax || i % 5 === 0);
    const tick = document.createElement('div');
    tick.style.cssText = `position:absolute;left:${pos}%;transform:translateX(-50%);width:${isMajor ? 2 : 1}px;height:${isMajor ? 8 : 5}px;background:rgba(255,255,255,${isMajor ? 0.4 : 0.18});top:0`;
    ticksEl.appendChild(tick);
    if (isMajor) {
      const lbl = document.createElement('span');
      lbl.style.cssText = `position:absolute;left:${pos}%;transform:translateX(-50%);font-size:10px;color:rgba(255,255,255,0.3);top:9px;white-space:nowrap;line-height:1`;
      lbl.textContent = i;
      ticksEl.appendChild(lbl);
    }
  }

  updateThInfo();
}

function updateThInfo() {
  const el = document.getElementById('th-unlock-info');
  if (!el) return;
  const lvl = thCurrent;

  const chipHtml = (label, color) =>
    `<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.13);border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;color:${color};white-space:nowrap">${label}</div>`;

  const capLv = lvl * 10;

  if (lvl <= 1) {
    el.innerHTML = `
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">需</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${chipHtml('', 'rgba(255,255,255,0.4)')}</div>
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">解锁</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chipHtml(`建筑等级上限: Lv.${capLv}`, BLDG_COLOR)}</div>`;
  } else {
    const reqChips = [];
    if (CHAPTERS[lvl - 2]) {
      const ch = CHAPTERS[lvl - 2];
      const durMin = ch.end - ch.start;
      const totalLevels = Math.round(durMin * 60 / getSecPerStage());
      reqChips.push(chipHtml(`关卡${ch.id}-${totalLevels}`, 'rgba(255,255,255,0.75)'));
    }
    reqChips.push(chipHtml(`医馆 Lv.${(lvl - 1) * 10}`, BLDG_COLOR));
    reqChips.push(chipHtml(`熔铸所 Lv.${lvl * 10}`, BLDG_COLOR));
    if (lvl >= 3) reqChips.push(chipHtml(`製皮厂 Lv.${lvl * 10}`, BLDG_COLOR));
    if (lvl >= 4) reqChips.push(chipHtml(`晶石矿场 Lv.${lvl * 10}`, BLDG_COLOR));

    el.innerHTML = `
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">需</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${reqChips.join('')}</div>
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">解锁</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chipHtml(`升级建筑等级上限 'Lv.${capLv}`, BLDG_COLOR)}</div>`;
  }
}

function setupThBar() {
  const track = document.getElementById('th-track');
  const thOverlay = document.getElementById('th-overlay');
  let dragging = false;

  const getFrac = (e) => {
    const rect = track.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
  };
  const applyFrac = (frac) => { thCurrent = Math.round(frac * thMax); setThProgress(); };

  thOverlay.addEventListener('mousedown', e => { dragging = true; applyFrac(getFrac(e)); e.preventDefault(); });
  thOverlay.addEventListener('touchstart', e => { dragging = true; applyFrac(getFrac(e)); e.preventDefault(); }, { passive: false });
  document.addEventListener('mousemove', e => { if (dragging) applyFrac(getFrac(e)); });
  document.addEventListener('touchmove', e => { if (dragging) { applyFrac(getFrac(e)); e.preventDefault(); } }, { passive: false });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });

  document.getElementById('th-current').addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 0) { thCurrent = v; setThProgress(); }
  });
  document.getElementById('th-max').addEventListener('input', e => {
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 1) { thMax = v; setThProgress(); }
  });

  setThProgress();
}
// ── Global Save / Load System (Embedded Sidebar) ──────────────────────────
window.initSaveManager = function () {
  const panelHtml = `
    <div id="save-manager-panel" class="flex flex-col h-full w-full">
      <div id="save-manager-header" class="flex justify-between items-center p-5 bg-white/5 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span style="font-size:1.3rem">📦</span>
          <span class="font-bold text-white tracking-widest text-sm">配置存档管理器</span>
        </div>
        <button onclick="window.showCustomSaveModal()" class="text-xs font-bold tracking-widest bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded hover:bg-emerald-500/40 border border-emerald-500/30 transition-colors shadow-none">
          💾 储存
        </button>
      </div>
      <div id="save-manager-list" class="flex-1 overflow-y-auto p-5 flex flex-col gap-4" style="scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) transparent;">
      </div>
    </div>
    
    <div id="custom-save-modal" class="popup-overlay" style="display:none; position:fixed; inset:0; z-index:10000; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px)">
      <div class="glass p-10 rounded-2xl w-[95%] max-w-[700px] border border-white/10 shadow-2xl animate-fade-up">
        <h3 class="text-white font-bold text-2xl mb-3 flex items-center gap-3"><span class="text-emerald-400">💾</span> 保存新存档</h3>
        <p class="text-white/40 text-[15px] mb-6">保存当前的全部界面自定义参数以及解锁配置。支持同名文件多次保存，以时间区分。</p>
        <div class="flex flex-col gap-3 mb-8">
          <label class="text-white/60 text-sm font-bold tracking-widest">请输入长存档名称或备注：</label>
          <input type="text" id="custom-save-input" style="width: 100%; min-width: 600px; display: block;" class="bg-black/30 text-white rounded-xl border border-white/20 focus:border-emerald-500/50 outline-none text-xl px-5 py-4 transition-colors" placeholder="备份存档名称...">
        </div>
        <div class="flex justify-end gap-3">
          <button class="px-6 py-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors text-sm font-bold" onclick="document.getElementById('custom-save-modal').style.display='none'">取消</button>
          <button class="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-500/30 transition-colors text-sm font-bold shadow-md" onclick="window.confirmCustomSave()">确认保存</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('save-manager-container').innerHTML = panelHtml;
  window.renderSaveManagerList();
};

window.showCustomSaveModal = function () {
  const modal = document.getElementById('custom-save-modal');
  const inp = document.getElementById('custom-save-input');
  inp.value = "存档_" + new Date().toLocaleTimeString();
  modal.style.display = 'flex';
  inp.focus();
};

window.confirmCustomSave = function () {
  const inp = document.getElementById('custom-save-input');
  const name = inp.value.trim() || '未命名存档';

  // Generate unique ID based on timestamp and randomness to allow same-name files
  const profile = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    name: name,
    timestamp: Date.now(),
    inputs: {},
    unlockData: window.unlockData
  };

  document.querySelectorAll('input.config-input, input[type="number"]').forEach(el => {
    if (el.id && el.id !== 'custom-save-input') profile.inputs[el.id] = el.value;
  });

  let savedList = [];
  try { savedList = JSON.parse(localStorage.getItem('g05_saves_v2') || '[]'); } catch (e) { }
  savedList.push(profile);
  localStorage.setItem('g05_saves_v2', JSON.stringify(savedList));

  document.getElementById('custom-save-modal').style.display = 'none';
  window.renderSaveManagerList();
};

window.renderSaveManagerList = function () {
  const listEl = document.getElementById('save-manager-list');
  if (!listEl) return;

  let savedList = [];
  try { savedList = JSON.parse(localStorage.getItem('g05_saves_v2') || '[]'); } catch (e) { }

  // Sort descending by timestamp
  savedList.sort((a, b) => b.timestamp - a.timestamp);

  if (savedList.length === 0) {
    listEl.innerHTML = '<div class="text-center text-white/30 py-8 text-sm flex flex-col items-center gap-2"><span class="text-2xl">📭</span>还没有任何存档记录</div>';
    return;
  }

  listEl.innerHTML = savedList.map(p => {
    const d = new Date(p.timestamp);
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString();
    return `
      <div class="glass p-3.5 rounded-xl flex flex-col gap-2 border border-white/5 hover:border-white/20 transition-colors group relative bg-black/10 shadow-sm hover:shadow-md">
        <div class="flex justify-between items-start mb-1">
          <div class="text-white font-bold text-sm tracking-wide">${p.name}</div>
        </div>
        <div class="text-white/40 text-[10px] font-mono leading-tight flex items-center gap-1.5 selection:bg-transparent">
          <span class="bg-white/10 px-1.5 py-0.5 rounded text-white/70">🕒 ${timeStr}</span>
          <span class="text-white/30">${dateStr}</span>
        </div>
        <div class="flex justify-between items-center mt-3 border-t border-white/5 pt-3">
          <button class="text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded hover:bg-red-500/30 opacity-0 group-hover:opacity-100 transition-all" onclick="window.delCustomSave('${p.id}')">删除</button>
          <button class="text-xs font-bold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 px-5 py-2 rounded shadow-inner hover:bg-blue-500/40 hover:text-blue-200 transition-colors ml-auto" onclick="window.loadCustomSave('${p.id}')">📂 加载</button>
        </div>
      </div>
    `;
  }).join('');
};

window.delCustomSave = function (id) {
  if (!confirm('确定永久删除该备份存档吗？')) return;
  let savedList = [];
  try { savedList = JSON.parse(localStorage.getItem('g05_saves_v2') || '[]'); } catch (e) { }
  savedList = savedList.filter(p => p.id !== id);
  localStorage.setItem('g05_saves_v2', JSON.stringify(savedList));
  window.renderSaveManagerList();
};

window.loadCustomSave = function (id) {
  let savedList = [];
  try { savedList = JSON.parse(localStorage.getItem('g05_saves_v2') || '[]'); } catch (e) { }
  const p = savedList.find(x => x.id === id);
  if (!p) return;

  if (p.unlockData) {
    window.unlockData = p.unlockData;
    if (typeof window.renderUnlockUI === 'function') window.renderUnlockUI();
  }

  if (p.inputs) {
    for (const [inpId, val] of Object.entries(p.inputs)) {
      const el = document.getElementById(inpId);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => { setTimeout(() => { window.initSaveManager(); }, 100); });


setupThBar();

rebuildBar();
setupInputs();

// ==========================================
// SIMULATION MODULE
// ==========================================

window.GameConfig = {
  enemyBaseHP: 110,
  enemyScale: 1.10,
  dailyStages: 5,

  day1FreeSummons: 10,
  dailySummons: 36,
  heroesPerQuality: 5,

  buildingBaseAtk: 90,
  buildingScale: 1.30,

  qualities: [
    { name: 'Q2', rate: 0.50, baseAtk: 4 },
    { name: 'Q3', rate: 0.25, baseAtk: 8 },
    { name: 'Q4', rate: 0.14, baseAtk: 14 },
    { name: 'Q5', rate: 0.07, baseAtk: 22 },
    { name: 'Q6', rate: 0.03, baseAtk: 34 },
    { name: 'Q7', rate: 0.01, baseAtk: 50 }
  ],

  ascensionCosts: [
    1, 1, 1, 1, 1,
    2, 2, 2, 2, 2,
    3, 3, 3, 3, 3,
    5, 5, 5, 5, 5,
    8, 8, 8, 8, 8,
    12, 12, 12, 12, 12
  ]
};

function calculateAscensions(copies) {
  if (copies < 1) return 0;
  let shards = copies - 1;
  let ascensions = 0;
  for (let cost of window.GameConfig.ascensionCosts) {
    if (shards >= cost) {
      shards -= cost;
      ascensions++;
    } else {
      ascensions += (shards / cost);
      break;
    }
  }
  return Math.min(ascensions, 30);
}

function getTopHeroesATK(totalSummons, slotsUnlk) {
  let allHeroesEV = [];
  for (let q of window.GameConfig.qualities) {
    let expectedCopies = totalSummons * (q.rate / window.GameConfig.heroesPerQuality);
    let ascLevel = calculateAscensions(expectedCopies);
    let expectedAtk = q.baseAtk * (1 + (0.10 * ascLevel));
    for (let i = 0; i < window.GameConfig.heroesPerQuality; i++) {
      allHeroesEV.push(expectedAtk);
    }
  }
  allHeroesEV.push(2); // Q1 base
  allHeroesEV.sort((a, b) => b - a);

  let teamAtk = 0;
  for (let i = 0; i < slotsUnlk; i++) {
    if (allHeroesEV[i]) teamAtk += allHeroesEV[i];
  }
  return teamAtk;
}

function generateSimulationData(daysToSimulate = 30) {
  let chartData = [];

  for (let day = 1; day <= daysToSimulate; day++) {
    let totalSummons = window.GameConfig.day1FreeSummons + (day * window.GameConfig.dailySummons);

    // 强制指定每日推关数，而不是依赖无限循环模拟测试
    let currentStage = Math.floor(day * (window.GameConfig.dailyStages || 1));
    if (currentStage < 1) currentStage = 1;

    // 怪物血量 = 基础血量 * scale^(层数-1). 设定要求战力等于怪物血量
    let requiredATK = window.GameConfig.enemyBaseHP * Math.pow(window.GameConfig.enemyScale, currentStage - 1);

    let slots = currentStage < 4 ? 1 : 1 + Math.floor(currentStage / 4);
    if (slots > 15) slots = 15;

    let heroATK = getTopHeroesATK(totalSummons, slots);
    let buildingATK = window.GameConfig.buildingBaseAtk * Math.pow(window.GameConfig.buildingScale, currentStage - 1);

    let totalPlayerATK = heroATK + buildingATK;

    chartData.push({
      day: day,
      maxStageCleared: currentStage,
      reqAtk: requiredATK,
      heroAtk: heroATK,
      buildAtk: buildingATK,
      totalAtk: totalPlayerATK
    });
  }
  return chartData;
}

window.renderSimulationConfigUI = function () {
  const container = document.getElementById('sim-configs-list');
  if (!container) return;

  const cfgFields = [
    { key: 'enemyBaseHP', label: '初级怪物基础血量' },
    { key: 'enemyScale', label: '每关血量提升倍率', step: 0.01 },
    { key: 'dailyStages', label: '每日预期推关数(层)' },
    { key: 'day1FreeSummons', label: '首日系统免费资源抽数' },
    { key: 'dailySummons', label: '日常每日获取挂机资源' },
    { key: 'heroesPerQuality', label: '各个品质池内同卡分布' },
    { key: 'buildingBaseAtk', label: '开局自带基础建筑算力' },
    { key: 'buildingScale', label: '通关后建筑每关提升版率', step: 0.01 }
  ];

  container.innerHTML = cfgFields.map(f => `
    <div class="glass py-2.5 px-4 rounded-xl flex justify-between items-center transition-all hover:bg-white/5 border border-white/5 shadow-sm">
      <span class="text-sm tracking-wide text-white/80 font-bold">${f.label}</span>
      <input type="number" 
             value="${window.GameConfig[f.key]}" 
             step="${f.step || 1}" 
             oninput="window.GameConfig['${f.key}'] = parseFloat(this.value); window.renderSimulationChart();"
             class="bg-black/40 border border-white/10 text-white rounded-lg text-center focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner font-mono text-base font-bold"
             style="width: 5.5rem; padding: 6px;">
    </div>
  `).join('');
}

let simChartInstance = null;
window.renderSimulationChart = function () {
  const el = document.getElementById('sim-chart');
  if (!el) return;
  if (!simChartInstance) {
    simChartInstance = echarts.init(el, 'dark');
    const ro = new ResizeObserver(() => simChartInstance.resize());
    ro.observe(el);
  }

  const data = generateSimulationData(30);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['推关进度 (Stage)', '需求战力 (Requirement)', '队伍战力 (Heroes)', '建筑战力 (Buildings)'],
      textStyle: { color: '#ccc' },
      bottom: 0
    },
    grid: { left: '3%', right: '5%', bottom: '10%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      name: '天数 (Day)',
      boundaryGap: false,
      data: data.map(d => `第 ${d.day} 天`),
      axisLabel: { color: '#888' }
    },
    yAxis: [
      {
        type: 'value',
        name: '推进关卡层数',
        position: 'left',
        axisLine: { show: true, lineStyle: { color: '#ec4899' } },
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.05)' } }
      },
      {
        type: 'log',
        logBase: 10,
        name: '战力阈值范围 (Log10)',
        position: 'right',
        axisLine: { show: true, lineStyle: { color: '#22d3ee' } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '推关进度 (Stage)',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map(d => d.maxStageCleared),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(236,72,153,0.8)' },
            { offset: 1, color: 'rgba(236,72,153,0.1)' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: '需求战力 (Requirement)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.map(d => d.reqAtk),
        lineStyle: { color: '#ef4444', width: 2, type: 'dashed' },
        itemStyle: { color: '#ef4444' }
      },
      {
        name: '队伍战力 (Heroes)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.map(d => d.heroAtk),
        lineStyle: { color: '#3b82f6', width: 3 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59,130,246,0.3)' },
            { offset: 1, color: 'rgba(59,130,246,0.01)' }
          ])
        }
      },
      {
        name: '建筑战力 (Buildings)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: data.map(d => d.buildAtk),
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' }
      }
    ]
  };

  simChartInstance.setOption(option);
};

window.addEventListener('DOMContentLoaded', () => { setTimeout(() => { window.renderSimulationConfigUI(); }, 200); });
