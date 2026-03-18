import './style.css';

// ── Main bar config (7 days × 2h) ───────────────────────────────────
const TOTAL_DAYS = 7;
const MIN_PER_DAY = 120;          // 2 hours per day
const TOTAL_MIN = TOTAL_DAYS * MIN_PER_DAY; // 840 min

// ── Chapter definitions (second row, not the main bar) ───────────────
// Total display max = 2400 min (40h) — shows all 10 chapters with Ch10 partial
const CH_DISPLAY_MAX = 2400;

const CHAPTERS = [
  { id: 1, label: '章节 1', start: 0, end: 5, color: '#10b981' }, // immediate
  { id: 2, label: '章节 2', start: 5, end: 25, color: '#f59e0b' }, // +5 min
  { id: 3, label: '章节 3', start: 25, end: 60, color: '#ef4444' }, // +20 min
  { id: 4, label: '章节 4', start: 60, end: 120, color: '#a855f7' }, // +35 min
  { id: 5, label: '章节 5', start: 120, end: 240, color: '#ec4899' }, // +1h
  { id: 6, label: '章节 6', start: 240, end: 420, color: '#14b8a6' }, // +2h  → 4h
  { id: 7, label: '章节 7', start: 420, end: 720, color: '#f97316' }, // +3h  → 7h
  { id: 8, label: '章节 8', start: 720, end: 1200, color: '#06b6d4' }, // +5h  → 12h
  { id: 9, label: '章节 9', start: 1200, end: 1980, color: '#84cc16' }, // +8h  → 20h
  { id: 10, label: '章节 10', start: 1980, end: 2400, color: '#e11d48', partial: true }, // +13h → 33h (部分)
];

// ── Building definitions ─────────────────────────────────────────────
// unlockAt = minutes; levelInterval = minutes per level
const BLDG_LEVEL_INTERVAL = 60; // 1 level per hour
const BUILDINGS = [
  // G1: Initial
  { id: 'town_hall', name: '市政厅', unlockAt: 0, unlockLabel: '初始', color: '#34d399' },
  { id: 'med_hall', name: '医馆', unlockAt: 0, unlockLabel: '初始', color: '#fb923c' },
  { id: 'barracks', name: '兵营', unlockAt: 0, unlockLabel: '初始', color: '#f87171' },
  // G2: 2 min
  { id: 'weapon_shop', name: '武器店', unlockAt: 2, unlockLabel: '2 分钟', color: '#c084fc' },
  { id: 'foundry', name: '燔铸所', unlockAt: 2, unlockLabel: '2 分钟', color: '#f472b6' },
  // G3: Ch2 (5 min)
  { id: 'armor_shop', name: '护甲店', unlockAt: 5, unlockLabel: '第 2 章', color: '#2dd4bf' },
  { id: 'tannery', name: '製皮厂', unlockAt: 5, unlockLabel: '第 2 章', color: '#a3e635' },
  // G4: Ch3 (25 min)
  { id: 'temple', name: '祝福圣殿', unlockAt: 25, unlockLabel: '第 3 章', color: '#fb7185' },
  { id: 'crystal', name: '晶石矿场', unlockAt: 25, unlockLabel: '第 3 章', color: '#fde68a' },
];


// ── Helpers ──────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function fmtMin(min) {
  if (min <= 0) return '未开始';
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60), m = min % 60;
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

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-8">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-5xl md:text-6xl text-shimmer">G05 游戏进度</h1>
    </header>

    <!-- ── Main 7-day bar ── -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.1s">

      <div class="flex items-end justify-between mb-8">
        <div>
          <p class="text-white/40 text-sm uppercase tracking-widest mb-1">当前进度</p>
          <div id="time-display" class="font-display font-bold text-5xl text-white">未开始</div>
        </div>
        <div class="text-right">
          <p class="text-white/40 text-sm uppercase tracking-widest mb-1">总时长</p>
          <span class="font-display font-bold text-2xl text-white/50">7 天 · 14 小时</span>
        </div>
      </div>

      <!-- Segmented bar -->
      <div class="relative" id="bar-root">
        <div id="tooltip" class="time-tooltip" style="display:none;left:0%">
          <span id="tooltip-text">未开始</span>
        </div>

        <div class="seg-track" id="track">
          ${Array.from({ length: TOTAL_DAYS }, (_, i) => `
            <div class="seg" id="seg-${i}">
              <div class="seg-fill" id="segfill-${i}" style="width:0%"></div>
              ${buildTicks(23)}
            </div>`).join('')}
          <div class="seg-overlay" id="overlay"></div>
          <div class="seg-handle" id="handle" style="left:0%" role="slider" tabindex="0"
               aria-valuemin="0" aria-valuemax="${TOTAL_MIN}" aria-valuenow="0"></div>
        </div>

        <!-- Day axis -->
        <div class="relative mt-3 day-axis">
          ${Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const pct = ((i + 1) / TOTAL_DAYS * 100).toFixed(2);
  const cumH = (i + 1) * 2;
  return `<div class="axis-label" style="left:${pct}%">
              <span class="axis-main">第 ${i + 1} 天</span>
              <span class="axis-sub">${cumH}h · ${(i + 1) * 120} min</span>
            </div>`;
}).join('')}
        </div>
      </div>
    </section>

    <!-- ── Chapter row (proportional, driven by main bar) ── -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">

      <p class="text-white/30 text-sm uppercase tracking-widest mb-6 font-semibold">章节解锁进度</p>

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
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3 mt-8" id="chapter-cards"></div>
    </section>

    <!-- ── Building unlock rows ── -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.3s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-6 font-semibold">建筑解锁与升级</p>
      <div id="building-rows" class="flex flex-col gap-3"></div>
    </section>

  </div>
`;

// ── Build chapter cards ───────────────────────────────────────────────
const cardsEl = document.getElementById('chapter-cards');
CHAPTERS.forEach(ch => {
  const div = document.createElement('div');
  div.id = `card-${ch.id}`;
  div.className = 'ch-card glass rounded-xl p-4';
  div.style.setProperty('--ch-color', ch.color);
  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold" style="color:${ch.color}">${ch.label}</span>
      <span class="ch-badge" id="chbadge-${ch.id}">锁定</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${fmtUnlock(ch.start)}</p>
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
  currentMin = Math.round(fraction * TOTAL_MIN);

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

  // Update main bar segments
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const segStart = i * MIN_PER_DAY;
    const segEnd = (i + 1) * MIN_PER_DAY;
    let pct = 0;
    if (currentMin >= segEnd) pct = 100;
    else if (currentMin > segStart) pct = (currentMin - segStart) / MIN_PER_DAY * 100;
    document.getElementById(`segfill-${i}`).style.width = `${pct}%`;
  }

  // Update chapters
  updateChapters();
  updateBuildings();
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

    if (currentMin < ch.start) {
      // Locked
      dispFill.style.width = '0%';
      bar.style.width = '0%';
      badge.textContent = '锁定';
      badge.style.color = 'rgba(255,255,255,0.3)';
      card.classList.remove('ch-card-active');
    } else if (currentMin >= ch.end) {
      // Completed
      dispFill.style.width = '100%';
      bar.style.width = '100%';
      badge.textContent = ch.partial ? '部分解锁' : '完成 ✓';
      badge.style.color = ch.color;
      card.classList.add('ch-card-active');
    } else {
      // In progress — instant unlock
      const pct = Math.round((currentMin - ch.start) / dur * 100);
      dispFill.style.width = `${pct}%`;
      bar.style.width = `${pct}%`;
      badge.textContent = `已完成 ${pct}%`;
      badge.style.color = ch.color;
      card.classList.add('ch-card-active');
    }
  });
}

// ── Build building rows ───────────────────────────────────────────────
const buildingRowsEl = document.getElementById('building-rows');
BUILDINGS.forEach(b => {
  const row = document.createElement('div');
  row.id = `brow-${b.id}`;
  row.className = 'bldg-row glass rounded-xl px-5 py-4 flex items-center gap-4';
  row.style.borderColor = `${b.color}25`;
  row.innerHTML = `
    <div class="bldg-name-col">
      <span class="font-display font-bold text-base" style="color:${b.color}">${b.name}</span>
      <span class="text-white/25 text-xs ml-2">${b.unlockLabel}</span>
    </div>
    <span class="bldg-badge" id="bbadge-${b.id}" style="border-color:${b.color}40">未解锁</span>
    <div class="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
      <div id="bbar-${b.id}" class="bldg-bar h-full rounded-full transition-all duration-300"
           style="width:0%;background:${b.color};"></div>
    </div>
    <span class="bldg-lv-pct text-white/30 text-xs font-mono w-12 text-right" id="bpct-${b.id}">—</span>
  `;
  buildingRowsEl.appendChild(row);
});

// ── Update building rows ──────────────────────────────────────────────
function updateBuildings() {
  BUILDINGS.forEach(b => {
    const badge = document.getElementById(`bbadge-${b.id}`);
    const bar = document.getElementById(`bbar-${b.id}`);
    const pctEl = document.getElementById(`bpct-${b.id}`);
    const row = document.getElementById(`brow-${b.id}`);

    if (currentMin < b.unlockAt) {
      badge.textContent = '未解锁';
      badge.style.color = 'rgba(255,255,255,0.25)';
      bar.style.width = '0%';
      pctEl.textContent = '—';
      row.classList.remove('bldg-active');
      return;
    }

    row.classList.add('bldg-active');
    const elapsed = currentMin - b.unlockAt;
    const level = Math.floor(elapsed / BLDG_LEVEL_INTERVAL) + 1;
    const lvlPct = Math.round((elapsed % BLDG_LEVEL_INTERVAL) / BLDG_LEVEL_INTERVAL * 100);

    badge.textContent = `Lv.${level}`;
    badge.style.color = b.color;
    bar.style.width = `${lvlPct}%`;
    pctEl.textContent = `${lvlPct}%`;
  });
}

// ── Init (called after all DOM elements are built) ────────────────────
setProgress(0);
