import './style.css';

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
    return s > 0 ? `${m} 分 ${s} 秒` : `${m} 分钟`;
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
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">每日时长（分）</p>
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

      <p class="text-white/30 text-sm uppercase tracking-widest mb-1 font-semibold">章节解锁进度</p>
      <p class="text-white/20 text-xs mb-4">每关 5 波&emsp;·&emsp;每波 10 秒</p>

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
      <section class="glass rounded-2xl p-5 w-full" style="max-width:128rem">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">建筑升级详情</p>
        <div id="bldg-detail-list" class="flex flex-col gap-4"></div>
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
            <!-- 加速: 医馆RIGHT(190,140) → 关卡LEFT(370,140) -->
            <path d="M190,140 H370" fill="none" stroke="rgba(132,204,22,0.3)" stroke-width="2.5"/>
            <text x="240" y="132" fill="#84cc16" font-size="14" font-weight="700" opacity="0.7">加速</text>
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
            <!-- 通关: 队伍TOP(450,320) → UP to 关卡BOTTOM(450,220) -->
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

            <!-- 召唤英雄: 召唤RIGHT(190,400) → 队伍LEFT(370,400) -->
            <path d="M190,400 H370" fill="none" stroke="rgba(139,92,246,0.3)" stroke-width="2.5"/>
            <text x="240" y="392" fill="#8b5cf6" font-size="12" font-weight="700" opacity="0.7">召唤英雄</text>
            <circle r="3" fill="#8b5cf6"><animateMotion dur="1.4s" repeatCount="indefinite" path="M190,400 H370"/></circle>
          </svg>
        </div>

      </section>

    <!-- ── Economy parameters ── -->
    <section class="glass rounded-2xl p-5 w-full" style="max-width:128rem">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">经济参数</p>
      <div class="eco-param-grid">
        <div class="text-center">
          <p class="text-white/40 text-xs">金币基数</p>
          <input type="number" id="eco-gold-base" value="10" min="1" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs">成本公比</p>
          <input type="number" id="eco-cost-multi" value="1.15" step="0.01" min="1.01" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs">加速/级 (%)</p>
          <input type="number" id="eco-accel" value="5" min="0" step="1" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs" style="color:#84cc16">医馆基价</p>
          <input type="number" id="eco-base-med" value="5" min="1" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs" style="color:#60a5fa">熔铸所基价</p>
          <input type="number" id="eco-base-foundry" value="10" min="1" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs" style="color:#a78bfa">製皮厂基价</p>
          <input type="number" id="eco-base-tannery" value="25" min="1" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
        <div class="text-center">
          <p class="text-white/40 text-xs" style="color:#f472b6">晶石矿场基价</p>
          <input type="number" id="eco-base-crystal" value="60" min="1" class="config-input" style="width:5.5rem;font-size:1.2rem">
        </div>
      </div>
    </section>

    <!-- ── Per-level simulation table ── -->
    <section class="glass rounded-2xl p-5 w-full" style="max-width:128rem">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px">
        <p class="text-white/30 text-sm uppercase tracking-widest font-semibold">每关数值模拟</p>
        <p class="text-white/20 text-xs" id="eco-summary"></p>
      </div>
      <div style="max-height:640px;overflow-y:auto;border-radius:12px;border:1px solid rgba(255,255,255,0.06)">
        <table class="eco-table" id="eco-table">
          <thead>
            <tr>
              <th>章节</th>
              <th>关卡数</th>
              <th>章节金币</th>
              <th>累计金币</th>
              <th style="color:#84cc16">加速</th>
              <th style="color:#84cc16">医馆</th>
              <th style="color:#60a5fa">熔铸</th>
              <th style="color:#a78bfa">製皮</th>
              <th style="color:#f472b6">晶石</th>
              <th>余额</th>
            </tr>
          </thead>
          <tbody id="eco-table-body"></tbody>
        </table>
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
      ? `第 ${Math.floor(currentMin / MIN_PER_DAY)} 天`
      : `第 ${day} 天 · ${fmtMin(minInDay)}`;
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

    // 5 waves/level, 10 sec/wave
    const waveLabel = (elapsedSec) => {
      const waveIdx = Math.floor(Math.max(0, elapsedSec) / 10);
      const level = Math.floor(waveIdx / 5) + 1;
      const waveInLevel = (waveIdx % 5) + 1;
      return `关卡：${ch.id}-${level}（第${waveInLevel}波）`;
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
      badge.textContent = '完成 ✓';
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
      badge.textContent = `已完成 ${pct}%`;
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
      badge.textContent = '✔';
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
      badge.textContent = '✔';
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
      <span class="axis-main">第 ${i + 1} 天</span>
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
};

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
          <p class="text-white/40 text-xs mb-1">最大（等级）</p>
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

function setThProgress() {
  thCurrent = Math.max(1, Math.min(thCurrent, thMax));
  const pct = thMax > 0 ? (thCurrent / thMax * 100) : 0;
  document.getElementById('th-handle').style.left = `${pct}%`;
  document.getElementById('th-fill').style.width = `${pct}%`;
  document.getElementById('th-display').innerHTML = `<b>Lv.${thCurrent}</b> / ${thMax}`;
  const inCur = document.getElementById('th-current');
  if (document.activeElement !== inCur) inCur.value = thCurrent;

  // Regenerate tick marks
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

// ── Town Hall per-level info ──────────────────────────────────────────
function updateThInfo() {
  const el = document.getElementById('th-unlock-info');
  if (!el) return;
  const lvl = thCurrent;

  const chipHtml = (label, color) =>
    `<div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.13);border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;color:${color};white-space:nowrap">${label}</div>`;

  const capLv = lvl * 10;

  if (lvl <= 1) {
    el.innerHTML = `
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">需求</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${chipHtml('无', 'rgba(255,255,255,0.4)')}</div>
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">解锁</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chipHtml(`建筑等级上限: Lv.${capLv}`, BLDG_COLOR)}</div>`;
  } else {
    // 需求: game level + building levels
    const reqChips = [];
    if (CHAPTERS[lvl - 2]) {
      const ch = CHAPTERS[lvl - 2];
      const durMin = ch.end - ch.start;
      const totalLevels = Math.round(durMin * 60 / 50);
      reqChips.push(chipHtml(`关卡${ch.id}-${totalLevels}`, 'rgba(255,255,255,0.75)'));
    }
    reqChips.push(chipHtml(`医馆 Lv.${(lvl - 1) * 10}`, BLDG_COLOR));
    reqChips.push(chipHtml(`熔铸所 Lv.${lvl * 10}`, BLDG_COLOR));
    if (lvl >= 3) reqChips.push(chipHtml(`製皮厂 Lv.${lvl * 10}`, BLDG_COLOR));
    if (lvl >= 4) reqChips.push(chipHtml(`晶石矿场 Lv.${lvl * 10}`, BLDG_COLOR));

    el.innerHTML = `
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">需求</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${reqChips.join('')}</div>
      <p class="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">解锁</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${chipHtml(`升级建筑等级上限 → Lv.${capLv}`, BLDG_COLOR)}</div>`;
  }
}


function setupThBar() {
  const track = document.getElementById('th-track');
  const overlay = document.getElementById('th-overlay');
  let dragging = false;

  const getFrac = (e) => {
    const rect = track.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
  };
  const applyFrac = (frac) => { thCurrent = Math.round(frac * thMax); setThProgress(); };

  overlay.addEventListener('mousedown', e => { dragging = true; applyFrac(getFrac(e)); e.preventDefault(); });
  overlay.addEventListener('touchstart', e => { dragging = true; applyFrac(getFrac(e)); e.preventDefault(); }, { passive: false });
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

// ── Economy simulation ──────────────────────────────────────────────
const ECO_UNLOCK_SEC = { med: 0, foundry: 150, tannery: 700, crystal: 1500 };
const ECO_KEYS = ['med', 'foundry', 'tannery', 'crystal'];
const ECO_LABELS = { med: '医馆', foundry: '熔铸所', tannery: '製皮厂', crystal: '晶石矿场' };

function getEcoParams() {
  return {
    goldBase: parseFloat(document.getElementById('eco-gold-base')?.value) || 10,
    costMulti: parseFloat(document.getElementById('eco-cost-multi')?.value) || 1.15,
    accelPerLv: (parseFloat(document.getElementById('eco-accel')?.value) || 5) / 100,
    base: {
      med: parseFloat(document.getElementById('eco-base-med')?.value) || 5,
      foundry: parseFloat(document.getElementById('eco-base-foundry')?.value) || 10,
      tannery: parseFloat(document.getElementById('eco-base-tannery')?.value) || 25,
      crystal: parseFloat(document.getElementById('eco-base-crystal')?.value) || 60,
    },
  };
}

function upgradeCost(baseCost, lvNow, multi) {
  return Math.round(baseCost * Math.pow(multi, lvNow));
}

function simulateEconomy() {
  const p = getEcoParams();
  let budget = 0, totalGold = 0, globalN = 0;
  const lv = { med: 0, foundry: 0, tannery: 0, crystal: 0 };
  const totalSpent = { med: 0, foundry: 0, tannery: 0, crystal: 0 };
  const chapterRows = [];

  for (const ch of CHAPTERS) {
    const chDurSec = (ch.end - ch.start) * 60;
    const chStartSec = ch.start * 60;
    let elapsed = 0, levelInCh = 0, chGold = 0;
    const bldgCap = ch.id * 10;

    while (true) {
      const accel = 1 + lv.med * p.accelPerLv;
      const levelTime = 50 / accel;
      if (elapsed + levelTime > chDurSec + 0.01) break;

      elapsed += levelTime;
      globalN++;
      levelInCh++;

      const gold = Math.round(p.goldBase * globalN);
      budget += gold;
      totalGold += gold;
      chGold += gold;

      const gameTimeSec = chStartSec + elapsed;

      // Auto-upgrade in priority order
      for (const key of ECO_KEYS) {
        if (gameTimeSec < ECO_UNLOCK_SEC[key]) continue;
        while (lv[key] < bldgCap) {
          const cost = upgradeCost(p.base[key], lv[key], p.costMulti);
          if (budget >= cost) {
            budget -= cost;
            totalSpent[key] += cost;
            lv[key]++;
          } else break;
        }
      }
    }

    // One summary row per chapter
    const chEndSec = ch.end * 60;
    chapterRows.push({
      ch: ch.id, levelCount: levelInCh, chGold, totalGold,
      accel: 1 + lv.med * p.accelPerLv,
      medLv: lv.med, foundryLv: lv.foundry,
      tanneryLv: lv.tannery, crystalLv: lv.crystal,
      budget: Math.round(budget),
      chEndSec,
    });
  }

  return { rows: chapterRows, totalLevels: globalN, totalGold, totalSpent, finalLevels: { ...lv }, budget: Math.round(budget) };
}

function rebuildEcoTable() {
  const result = simulateEconomy();
  const { rows } = result;
  const tbody = document.getElementById('eco-table-body');
  const summary = document.getElementById('eco-summary');
  if (!tbody) return;

  // Summary text
  if (summary) {
    const fl = result.finalLevels;
    summary.textContent = `共 ${result.totalLevels} 关 · 总金币 ${result.totalGold.toLocaleString()} · `
      + `医${fl.med} 熔${fl.foundry} 皮${fl.tannery} 晶${fl.crystal} · 余额 ${result.budget.toLocaleString()}`;
  }

  // Build per-chapter table HTML
  const fmtN = v => v.toLocaleString();
  tbody.innerHTML = rows.map(r => {
    const unlocked = s => r.chEndSec >= ECO_UNLOCK_SEC[s];
    return `<tr>
      <td style="font-weight:600">Ch ${r.ch}</td>
      <td>${r.levelCount}</td>
      <td>${fmtN(r.chGold)}</td>
      <td>${fmtN(r.totalGold)}</td>
      <td style="color:#84cc16">${r.accel.toFixed(2)}×</td>
      <td style="color:#84cc16">${r.medLv}</td>
      <td class="${unlocked('foundry') ? '' : 'eco-locked'}">${unlocked('foundry') ? r.foundryLv : '🔒'}</td>
      <td class="${unlocked('tannery') ? '' : 'eco-locked'}">${unlocked('tannery') ? r.tanneryLv : '🔒'}</td>
      <td class="${unlocked('crystal') ? '' : 'eco-locked'}">${unlocked('crystal') ? r.crystalLv : '🔒'}</td>
      <td>${fmtN(r.budget)}</td>
    </tr>`;
  }).join('');
}

// Wire up parameter inputs
['eco-gold-base', 'eco-cost-multi', 'eco-accel',
  'eco-base-med', 'eco-base-foundry', 'eco-base-tannery', 'eco-base-crystal'
].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', rebuildEcoTable);
});

rebuildEcoTable();
