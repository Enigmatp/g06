import './style.css';
import * as XLSX from 'xlsx';

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

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-start px-8 py-4 gap-4">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-3xl md:text-4xl text-shimmer">G05 游戏数值 v0.2.0</h1>
    </header>

    <!-- Tab nav -->
    <nav class="tab-nav animate-fade-up" style="animation-delay:0.05s">
      <button class="tab-btn tab-active" onclick="switchTab('overview')" id="tab-btn-overview">总览</button>
      <button class="tab-btn" onclick="switchTab('resources')" id="tab-btn-resources">循环</button>
      <button class="tab-btn" onclick="switchTab('buildings')" id="tab-btn-buildings">建筑</button>
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
                  <input type="number" id="cp-bless-hp" value="200" min="0" class="config-input bmc-input">
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
              <!-- Summon ratio config -->
              <div class="bldg-mod-card glass rounded-xl">
                <div class="bmc-header">
                  <span class="bmc-dot" style="background:#8b5cf6"></span>
                  <span class="bmc-name" style="color:#8b5cf6">\u53ec\u5524\u5360\u6bd4</span>
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u521d\u59cb\u5360\u6bd4 (%)</span>
                  <input type="number" id="lcp-summon-init" value="0" min="0" max="100" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6700\u5927\u5360\u6bd4 (%)</span>
                  <input type="number" id="lcp-summon-max" value="80" min="0" max="100" class="config-input bmc-input">
                </div>
                <div class="bmc-input-row">
                  <span class="bmc-label">\u6bcf\u7ae0\u8282\u9012\u589e (%)</span>
                  <input type="number" id="lcp-summon-step" value="5" min="0" max="100" class="config-input bmc-input">
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
        <p class="text-white/30 text-sm uppercase tracking-widest mb-5 font-semibold">主循环</p>

        <div style="position:relative;width:1090px;height:540px;margin:0 auto">
          <!-- Top row: 医馆 关卡 熔铸所 製皮厂 晶石矿场 -->
          <div class="rc-box" style="position:absolute;left:30px;top:60px;border-style:dashed;color:#84cc16;border-color:rgba(132,204,22,0.3);background:rgba(132,204,22,0.06)">医馆</div>
          <div class="rc-box rc-green" style="position:absolute;left:370px;top:60px">关卡</div>
          <div class="rc-box rc-blue" style="position:absolute;left:550px;top:60px">熔铸所</div>
          <div class="rc-box rc-purple" style="position:absolute;left:730px;top:60px">製皮厂</div>
          <div class="rc-box rc-pink" style="position:absolute;left:910px;top:60px">晶石矿场</div>
          <!-- Bottom row: 召唤 队伍 武器店 护甲店 祝福圣殿 -->
          <div class="rc-box" style="position:absolute;left:30px;top:320px;border-color:rgba(139,92,246,0.5);color:#8b5cf6">召唤</div>
          <div class="rc-box rc-amber" style="position:absolute;left:370px;top:320px">队伍</div>
          <div class="rc-box rc-blue" style="position:absolute;left:550px;top:320px">武器店</div>
          <div class="rc-box rc-purple" style="position:absolute;left:730px;top:320px">护甲店</div>
          <div class="rc-box rc-pink" style="position:absolute;left:910px;top:320px">祝福圣殿</div>
          <svg style="position:absolute;left:0;top:0;width:1090px;height:540px;pointer-events:none" viewBox="0 0 1090 540">
            <!-- GOLD: unified bar y=35 from 医馆(110) to 晶石矿场(990) -->
            <path d="M110,35 H990" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M110,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M450,60 V35" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M630,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M810,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <path d="M990,35 V60" fill="none" stroke="rgba(251,191,36,0.3)" stroke-width="2.5"/>
            <text x="540" y="28" fill="#fbbf24" font-size="14" font-weight="700" opacity="0.7">金币</text>
            <!-- Gold dots to RIGHT buildings -->
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H630 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H630 V60" begin="0.5s"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2s" repeatCount="indefinite" path="M450,60 V35 H810 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2s" repeatCount="indefinite" path="M450,60 V35 H810 V60" begin="0.6s"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2.4s" repeatCount="indefinite" path="M450,60 V35 H990 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="2.4s" repeatCount="indefinite" path="M450,60 V35 H990 V60" begin="0.7s"/></circle>
            <!-- Gold dots to 医馆 (same bar-and-drop style, going left) -->
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H110 V60"/></circle>
            <circle r="4" fill="#fbbf24"><animateMotion dur="1.6s" repeatCount="indefinite" path="M450,60 V35 H110 V60" begin="0.5s"/></circle>
            <!-- 加速 医馆RIGHT(190,140) '关卡LEFT(370,140) -->
            <path d="M190,140 H370" fill="none" stroke="rgba(132,204,22,0.3)" stroke-width="2.5"/>
            <text x="240" y="132" fill="#84cc16" font-size="14" font-weight="700" opacity="0.7">加</text>
            <circle r="3" fill="#84cc16"><animateMotion dur="1.4s" repeatCount="indefinite" path="M190,140 H370"/></circle>
            <circle r="3" fill="#84cc16"><animateMotion dur="1.4s" repeatCount="indefinite" path="M190,140 H370" begin="0.7s"/></circle>
            <!-- MATERIALS: vertical (same format) -->
            <path d="M630,220 V320" fill="none" stroke="rgba(96,165,250,0.3)" stroke-width="2.5"/>
            <path d="M810,220 V320" fill="none" stroke="rgba(167,139,250,0.3)" stroke-width="2.5"/>
            <path d="M990,220 V320" fill="none" stroke="rgba(244,114,182,0.3)" stroke-width="2.5"/>
            <text x="636" y="275" fill="#60a5fa" font-size="14" font-weight="700" opacity="0.7">精钢</text>
            <text x="816" y="275" fill="#a78bfa" font-size="14" font-weight="700" opacity="0.7">皮革</text>
            <text x="996" y="275" fill="#f472b6" font-size="14" font-weight="700" opacity="0.7">晶石</text>
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
            <!-- Power dots: each combat→down→bar→left→up to 队伍 -->
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

  </div>
`;

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

  handle.style.left = `${fraction * 100}%`;
  tooltip.style.left = `${fraction * 100}%`;
  handle.setAttribute('aria-valuenow', currentMin);

  // Day display
  if (currentMin === 0) {
    timeDisp.textContent = '未开始';
  } else {
    const day = Math.floor(currentMin / MIN_PER_DAY) + 1;
    const minInDay = currentMin % MIN_PER_DAY;
    timeDisp.textContent = minInDay === 0
      ? `${Math.floor(currentMin / MIN_PER_DAY)} 天`
      : `${day} '· ${fmtMin(minInDay)}`;
  }
  tooltipTxt.textContent = fmtMin(currentMin);

  // Sync current-minutes input
  const inCur = document.getElementById('input-current');
  if (inCur && document.activeElement !== inCur)
    inCur.value = Number(currentMin.toFixed(2));

  // Update main bar segments
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const segStart = i * MIN_PER_DAY;
    const segEnd = (i + 1) * MIN_PER_DAY;
    let pct = 0;
    if (currentMin >= segEnd) pct = 100;
    else if (currentMin > segStart) pct = (currentMin - segStart) / MIN_PER_DAY * 100;
    document.getElementById(`segfill-${i}`).style.width = `${pct}%`;
  }

  // Update all sections
  updateChapters();
  updateBuildings();
  updateFeatures();
}

function fractionFromEvent(e) {
  const rect = overlay.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  return clamp((cx - rect.left) / rect.width, 0, 1);
}

overlay.addEventListener('mousedown', e => {
  isDragging = true; handle.classList.add('dragging');
  tooltip.style.display = 'block'; setProgress(fractionFromEvent(e)); e.preventDefault();
});
overlay.addEventListener('touchstart', e => {
  isDragging = true; handle.classList.add('dragging');
  tooltip.style.display = 'block'; setProgress(fractionFromEvent(e)); e.preventDefault();
}, { passive: false });

document.addEventListener('mousemove', e => { if (isDragging) setProgress(fractionFromEvent(e)); });
document.addEventListener('touchmove', e => { if (isDragging) { setProgress(fractionFromEvent(e)); e.preventDefault(); } }, { passive: false });
document.addEventListener('mouseup', () => { if (!isDragging) return; isDragging = false; handle.classList.remove('dragging'); tooltip.style.display = 'none'; });
document.addEventListener('touchend', () => { if (!isDragging) return; isDragging = false; handle.classList.remove('dragging'); tooltip.style.display = 'none'; });

handle.addEventListener('mouseenter', () => tooltip.style.display = 'block');
handle.addEventListener('mouseleave', () => { if (!isDragging) tooltip.style.display = 'none'; });
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

  const segContainer = document.getElementById('seg-container');
  segContainer.innerHTML = Array.from({ length: TOTAL_DAYS }, (_, i) => `
    <div class="seg" id="seg-${i}">
      <div class="seg-fill" id="segfill-${i}" style="width:0%"></div>
      ${buildTicks(23)}
    </div>`).join('');

  const axisContainer = document.getElementById('axis-container');
  axisContainer.innerHTML = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const pct = ((i + 1) / TOTAL_DAYS * 100).toFixed(2);
    const cumH = (i + 1) * MIN_PER_DAY / 60;
    return `<div class="axis-label" style="left:${pct}%">
      <span class="axis-main">${i + 1} </span>
      <span class="axis-sub">${cumH}h · ${(i + 1) * MIN_PER_DAY} min</span>
    </div>`;
  }).join('');

  const frac = TOTAL_MIN > 0 ? clamp(currentMin / TOTAL_MIN, 0, 1) : 0;
  setProgress(frac);
}

// ── Wire config inputs ────────────────────────────────────────────────
function setupInputs() {
  const inDays = document.getElementById('input-days');
  const inMpd = document.getElementById('input-mpd');
  const inCur = document.getElementById('input-current');

  inDays.addEventListener('input', () => {
    const v = parseInt(inDays.value);
    if (!isNaN(v) && v >= 1) { TOTAL_DAYS = v; rebuildBar(); }
  });
  inMpd.addEventListener('input', () => {
    const v = parseInt(inMpd.value);
    if (!isNaN(v) && v >= 1) { MIN_PER_DAY = v; rebuildBar(); }
  });
  inCur.addEventListener('input', () => {
    const v = parseFloat(inCur.value);
    if (!isNaN(v) && v >= 0) setProgress(v / TOTAL_MIN);
  });
}

rebuildBar();
setupInputs();

// ── Tab switching ─────────────────────────────────────────────────────
window.switchTab = function (id) {
  ['overview', 'buildings', 'resources'].forEach(tab => {
    const el = document.getElementById(`tab-${tab}`);
    el.style.display = id === tab ? 'flex' : 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
  document.getElementById(`tab-btn-${id}`).classList.add('tab-active');
  // Redraw charts when buildings tab becomes visible (canvas needs dimensions)
  if (id === 'buildings') {
    requestAnimationFrame(() => { drawBldgChart(); drawResChart(); drawCPChart(); drawLevelCPChart(); });
  }
};

// ── Building Module ──────────────────────────────────────────────────
const BLDG_MODULE = [
  { id: 'med', name: '医馆', color: '#84cc16', defaultBase: 10, unlock: 1 },
  { id: 'foundry', name: '熔铸所', color: '#60a5fa', defaultBase: 20, unlock: 1, resource: '精钢', resBase: 5 },
  { id: 'tannery', name: '製皮厂', color: '#a78bfa', defaultBase: 20, unlock: 21, resource: '皮革', resBase: 5 },
  { id: 'crystal', name: '晶石矿场', color: '#f472b6', defaultBase: 40, unlock: 31, resource: '晶石', resBase: 3 },
];
const RESOURCE_BLDGS = BLDG_MODULE.filter(b => b.resource);

// Resource consumers: buildings that spend resources
const RES_CONSUMERS = [
  { id: 'weapon', name: '武器店(4部位)', color: '#f59e0b', consumes: '精钢', consumeBase: 200, unlock: 1, levelSplit: 4 },
  { id: 'armor', name: '护甲店', color: '#22d3ee', consumes: '皮革', consumeBase: 300, unlock: 21 },
  { id: 'blessing', name: '祝福圣殿', color: '#c084fc', consumes: '晶石', consumeBase: 400, unlock: 31 },
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
  return { base, multi: isNaN(multi) ? 0.1 : multi };
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
          <input type="number" id="bmc-multi-${b.id}" value="0.1" step="0.01" min="0"
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
  return { base, multi: isNaN(multi) ? 0.1 : multi };
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
    const powerPerOp = atk * atkRatio + hp * hpRatio; // single-part (for individual curve)
    const totalPowerPerOp = atk * (b.atkSplit || 1) * atkRatio + hp * hpRatio; // with ×4 (for total)
    return { ...b, atk, hp, powerPerOp, totalPowerPerOp };
  });

  // Cumulative power per building (individual curves 'single part)
  const cumPower = bldgData.map(b => {
    const arr = [];
    for (let op = 1; op <= maxOps; op++) arr.push(op * b.powerPerOp);
    return arr;
  });

  // Total cumulative (uses totalPowerPerOp with ×4)
  const totalPower = [];
  for (let op = 1; op <= maxOps; op++) {
    let total = 0;
    bldgData.forEach(b => total += op * b.totalPowerPerOp);
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
  function drawCurve(data, color, lineWidth) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = xPx(i), y = yPx(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Per-building curves
  bldgData.forEach((b, idx) => {
    if (b.powerPerOp > 0) drawCurve(cumPower[idx], b.color, 2);
  });

  // Total curve (white)
  drawCurve(totalPower, '#ffffff', 3);

  // Legend
  const legendEl = document.getElementById('cp-chart-legend');
  if (legendEl) {
    let html = `<div class="bcl-item"><span class="bcl-dot" style="background:#fff"></span><span class="bcl-label">\u5efa\u7b51\u603b\u6218\u529b</span></div>`;
    html += bldgData.filter(b => b.powerPerOp > 0).map(b =>
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
['cp-atk-ratio', 'cp-hp-ratio', 'cp-weapon-atk', 'cp-armor-hp', 'cp-bless-hp'].forEach(id => {
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
  const summonInit = (parseFloat(document.getElementById('lcp-summon-init')?.value) || 0) / 100;
  const summonMax = (parseFloat(document.getElementById('lcp-summon-max')?.value) || 0) / 100;
  const summonStep = (parseFloat(document.getElementById('lcp-summon-step')?.value) || 0) / 100;

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
    const singleHeroPower = cumulativeOps * buildingPowerPerOp;
    const slots = Math.min(teamMax, teamInit + (ch - 1) * teamPerCh);
    // Summon ratio: ramp from init toward max
    let summonRatio;
    if (summonMax >= summonInit) {
      summonRatio = Math.min(summonMax, summonInit + (ch - 1) * summonStep);
    } else {
      summonRatio = Math.max(summonMax, summonInit - (ch - 1) * summonStep);
    }
    summonRatio = Math.max(0, Math.min(1, summonRatio));
    const buildingPower = singleHeroPower * slots;
    const summonPower = buildingPower * summonRatio;
    const totalPower = buildingPower + summonPower;
    chData.push({ ch, cumulativeOps, singleHeroPower, slots, summonRatio, buildingPower, summonPower, totalPower });
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
['lcp-ops-per-ch', 'lcp-max-ch', 'lcp-summon-init', 'lcp-summon-max', 'lcp-summon-step'].forEach(id => {
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

setupThBar();

