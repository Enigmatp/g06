import './style.css';

// ── Config ─────────────────────────────────────────────────────────
const TOTAL_MINUTES = 90;   // total timeline duration
const MINOR_TICK = 5;       // tick every N minutes
const MAJOR_TICK = 15;      // bold tick every N minutes

// ── State ───────────────────────────────────────────────────────────
let currentMinute = 0;
let isDragging = false;

// ── HTML Template ───────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
  <!-- Ambient background blobs -->
  <div class="blob" style="width:520px;height:520px;top:-120px;left:-80px;background:rgba(61,90,254,0.18);"></div>
  <div class="blob" style="width:420px;height:420px;bottom:-100px;right:-60px;background:rgba(124,111,205,0.16);"></div>
  <div class="blob" style="width:300px;height:300px;top:40%;left:55%;background:rgba(96,239,255,0.09);"></div>

  <!-- Full page layout -->
  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-10">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <p class="text-xs uppercase tracking-[0.25em] text-brand-400 font-semibold mb-2">G05 · 游戏解锁</p>
      <h1 class="font-display font-bold text-4xl md:text-5xl text-shimmer mb-3">精英进度追踪</h1>
      <p class="text-white/40 text-sm md:text-base max-w-md">拖拽时间轴查看各阶段解锁进度</p>
    </header>

    <!-- Time Progress Card -->
    <section class="glass rounded-2xl p-8 w-full max-w-3xl animate-fade-up" style="animation-delay:0.1s">
      <!-- Time display -->
      <div class="flex items-end justify-between mb-6">
        <div>
          <p class="text-white/40 text-xs uppercase tracking-widest mb-1">当前时间</p>
          <div class="flex items-baseline gap-1">
            <span id="time-display" class="font-display font-bold text-5xl text-white">00</span>
            <span class="text-white/50 text-xl font-semibold">分钟</span>
          </div>
        </div>
        <div class="text-right">
          <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总时长</p>
          <div class="flex items-baseline gap-1 justify-end">
            <span class="font-display font-bold text-2xl text-white/60">${TOTAL_MINUTES}</span>
            <span class="text-white/30 text-sm font-semibold">分钟</span>
          </div>
        </div>
      </div>

      <!-- Progress bar wrapper -->
      <div class="relative py-4" id="bar-container">

        <!-- Tooltip -->
        <div id="tooltip" class="time-tooltip" style="display:none; left:0%;">
          <span id="tooltip-text">0 min</span>
        </div>

        <!-- Track -->
        <div class="progress-track" id="track">
          <div class="progress-fill" id="fill" style="width:0%"></div>
          <!-- Handle -->
          <div class="progress-glow" id="handle" style="left:0%"
               role="slider" aria-label="时间进度" aria-valuemin="0" aria-valuemax="${TOTAL_MINUTES}" aria-valuenow="0">
          </div>
        </div>

        <!-- Tick marks -->
        <div class="tick-container" id="ticks"></div>

        <!-- Minute labels -->
        <div class="relative h-5 mt-1" id="labels"></div>
      </div>

      <!-- Percentage & quick-set buttons -->
      <div class="flex items-center justify-between mt-4">
        <div class="flex gap-2 flex-wrap">
          ${[0, 25, 50, 75, 100].map(p => `
            <button data-pct="${p}"
              class="quick-btn px-3 py-1 rounded-lg text-xs font-semibold border border-white/10 bg-white/5
                     hover:bg-brand-600/40 hover:border-brand-400/50 hover:text-brand-200
                     transition-all duration-200 text-white/50">
              ${p}%
            </button>
          `).join('')}
        </div>
        <span id="pct-display" class="text-white/30 text-sm font-mono">0%</span>
      </div>
    </section>

    <!-- Placeholder stage cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl animate-fade-up" style="animation-delay:0.2s">
      ${['阶段一', '阶段二', '阶段三'].map((label, i) => `
        <div class="glass rounded-xl p-5 flex flex-col gap-2 stage-card" data-stage="${i}">
          <div class="flex items-center justify-between">
            <span class="text-white/60 text-xs uppercase tracking-widest font-semibold">${label}</span>
            <span class="stage-badge text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">锁定</span>
          </div>
          <p class="font-display font-semibold text-white/20 text-lg stage-name">—</p>
          <div class="h-1 rounded-full bg-white/5 overflow-hidden">
            <div class="stage-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style="width:0%"></div>
          </div>
        </div>
      `).join('')}
    </section>

    <footer class="text-white/20 text-xs text-center">
      Enigmatp · G05 Progress Tracker · 2026
    </footer>
  </div>
`;

// ── Build ticks & labels ────────────────────────────────────────────
const ticksEl = document.getElementById('ticks');
const labelsEl = document.getElementById('labels');

for (let m = 0; m <= TOTAL_MINUTES; m += MINOR_TICK) {
  const pct = (m / TOTAL_MINUTES) * 100;
  const isMajor = m % MAJOR_TICK === 0;

  const tick = document.createElement('div');
  tick.className = `tick ${isMajor ? 'major' : ''}`;
  tick.style.left = `${pct}%`;
  tick.style.height = isMajor ? '14px' : '8px';
  ticksEl.appendChild(tick);

  if (isMajor) {
    const lbl = document.createElement('div');
    lbl.className = 'minute-label';
    lbl.style.left = `${pct}%`;
    lbl.textContent = `${m}`;
    labelsEl.appendChild(lbl);
  }
}

// ── Progress bar logic ──────────────────────────────────────────────
const track = document.getElementById('track');
const fill = document.getElementById('fill');
const handle = document.getElementById('handle');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltip-text');
const timeDisplay = document.getElementById('time-display');
const pctDisplay = document.getElementById('pct-display');

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function setProgress(fraction) {
  fraction = clamp(fraction, 0, 1);
  currentMinute = Math.round(fraction * TOTAL_MINUTES);
  const pct = (currentMinute / TOTAL_MINUTES) * 100;

  fill.style.width = `${pct}%`;
  handle.style.left = `${pct}%`;
  tooltip.style.left = `${pct}%`;

  handle.setAttribute('aria-valuenow', currentMinute);
  timeDisplay.textContent = String(currentMinute).padStart(2, '0');
  tooltipText.textContent = `${currentMinute} min`;
  pctDisplay.textContent = `${Math.round(fraction * 100)}%`;

  updateStages(fraction);
}

function fractionFromEvent(e) {
  const rect = track.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return (clientX - rect.left) / rect.width;
}

// Mouse / touch drag
handle.addEventListener('mousedown', (e) => {
  isDragging = true;
  handle.classList.add('dragging');
  tooltip.style.display = 'block';
  e.preventDefault();
});

handle.addEventListener('touchstart', (e) => {
  isDragging = true;
  handle.classList.add('dragging');
  tooltip.style.display = 'block';
  e.preventDefault();
}, { passive: false });

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  setProgress(fractionFromEvent(e));
});

document.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  setProgress(fractionFromEvent(e));
  e.preventDefault();
}, { passive: false });

document.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  handle.classList.remove('dragging');
  tooltip.style.display = 'none';
});

document.addEventListener('touchend', () => {
  if (!isDragging) return;
  isDragging = false;
  handle.classList.remove('dragging');
  tooltip.style.display = 'none';
});

// Click on track
track.addEventListener('click', (e) => {
  if (e.target === handle) return;
  setProgress(fractionFromEvent(e));
});

// Show tooltip on handle hover
handle.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
handle.addEventListener('mouseleave', () => { if (!isDragging) tooltip.style.display = 'none'; });

// Keyboard support
handle.addEventListener('keydown', (e) => {
  const step = 1 / TOTAL_MINUTES;
  const cur = currentMinute / TOTAL_MINUTES;
  if (e.key === 'ArrowRight') { setProgress(cur + step); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { setProgress(cur - step); e.preventDefault(); }
  if (e.key === 'Home') { setProgress(0); e.preventDefault(); }
  if (e.key === 'End') { setProgress(1); e.preventDefault(); }
});

// Quick-set % buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setProgress(Number(btn.dataset.pct) / 100);
  });
});

// ── Stage cards (placeholder logic) ────────────────────────────────
const stageConfigs = [
  { name: '初始解锁', unlock: 0, full: 0.33 },
  { name: '进阶内容', unlock: 0.33, full: 0.66 },
  { name: '精英模式', unlock: 0.66, full: 1.00 },
];

function updateStages(fraction) {
  document.querySelectorAll('.stage-card').forEach((card, i) => {
    const cfg = stageConfigs[i];
    const bar = card.querySelector('.stage-bar');
    const badge = card.querySelector('.stage-badge');
    const name = card.querySelector('.stage-name');

    if (fraction < cfg.unlock) {
      bar.style.width = '0%';
      badge.textContent = '锁定';
      badge.className = 'stage-badge text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30';
      name.textContent = '—';
      name.className = 'font-display font-semibold text-white/20 text-lg stage-name';
    } else {
      const stageProgress = clamp((fraction - cfg.unlock) / (cfg.full - cfg.unlock), 0, 1);
      const pct = Math.round(stageProgress * 100);
      bar.style.width = `${pct}%`;
      name.textContent = cfg.name;

      if (pct >= 100) {
        badge.textContent = '已解锁';
        badge.className = 'stage-badge text-xs px-2 py-0.5 rounded-full bg-brand-600/30 border border-brand-400/40 text-brand-300';
        name.className = 'font-display font-semibold text-white text-lg stage-name';
      } else {
        badge.textContent = `${pct}%`;
        badge.className = 'stage-badge text-xs px-2 py-0.5 rounded-full bg-brand-900/40 border border-brand-600/30 text-brand-400';
        name.className = 'font-display font-semibold text-white/70 text-lg stage-name';
      }
    }
  });
}

// ── Init ────────────────────────────────────────────────────────────
setProgress(0);
