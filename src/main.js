import './style.css';

// ── Config ─────────────────────────────────────────────────────────
// Total: 4 early milestones (up to 2h) + 7 daily milestones (each = 1h)
// 0-120min: real minutes; 120-540min: days 1-7 (each day = 60min on axis)
const TOTAL_MINUTES = 540;

const MILESTONES = [
  { id: 'm1', label: '解锁一', desc: '5 分钟', minute: 5, type: 'early' },
  { id: 'm2', label: '解锁二', desc: '25 分钟', minute: 25, type: 'early' },
  { id: 'm3', label: '解锁三', desc: '1 小时', minute: 60, type: 'early' },
  { id: 'm4', label: '解锁四', desc: '2 小时', minute: 120, type: 'early' },
  { id: 'd1', label: '第 1 天', desc: 'Day 1', minute: 180, type: 'daily' },
  { id: 'd2', label: '第 2 天', desc: 'Day 2', minute: 240, type: 'daily' },
  { id: 'd3', label: '第 3 天', desc: 'Day 3', minute: 300, type: 'daily' },
  { id: 'd4', label: '第 4 天', desc: 'Day 4', minute: 360, type: 'daily' },
  { id: 'd5', label: '第 5 天', desc: 'Day 5', minute: 420, type: 'daily' },
  { id: 'd6', label: '第 6 天', desc: 'Day 6', minute: 480, type: 'daily' },
  { id: 'd7', label: '第 7 天', desc: 'Day 7', minute: 540, type: 'daily' },
];

// ── Helpers ─────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/** Format minute count into a human-readable string */
function formatTime(min) {
  if (min < 60) return `${min} 分钟`;
  if (min < 120) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
  }
  // >= 120 min → Day N (each day = 60 min beyond 120)
  const dayIndex = Math.floor((min - 120) / 60) + 1;   // 1-based
  const remainder = (min - 120) % 60;
  const dayLabel = `第 ${dayIndex} 天`;
  return remainder === 0 ? dayLabel : `${dayLabel} +${remainder} 分钟`;
}

/** Tooltip label (slightly shorter) */
function formatTooltip(min) {
  if (min < 60) return `${min} min`;
  if (min < 120) {
    const h = Math.floor(min / 60), m = min % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const dayIndex = Math.floor((min - 120) / 60) + 1;
  const rem = (min - 120) % 60;
  return rem === 0 ? `Day ${dayIndex}` : `Day ${dayIndex} +${rem}m`;
}

// ── State ────────────────────────────────────────────────────────────
let currentMinute = 0;
let isDragging = false;

// ── HTML ─────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
  <div class="blob" style="width:520px;height:520px;top:-120px;left:-80px;background:rgba(61,90,254,0.18);"></div>
  <div class="blob" style="width:420px;height:420px;bottom:-100px;right:-60px;background:rgba(124,111,205,0.16);"></div>
  <div class="blob" style="width:300px;height:300px;top:40%;left:55%;background:rgba(96,239,255,0.09);"></div>

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-8">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <p class="text-xs uppercase tracking-[0.25em] text-brand-400 font-semibold mb-2">G05 · 游戏解锁</p>
      <h1 class="font-display font-bold text-4xl md:text-5xl text-shimmer">G05 游戏进度</h1>
    </header>

    <!-- Progress Card -->
    <section class="glass rounded-2xl p-8 w-full max-w-3xl animate-fade-up" style="animation-delay:0.1s">

      <!-- Current time display -->
      <div class="flex items-end justify-between mb-6">
        <div>
          <p class="text-white/40 text-xs uppercase tracking-widest mb-1">当前进度</p>
          <div id="time-display" class="font-display font-bold text-4xl text-white">0 分钟</div>
        </div>
        <div class="text-right">
          <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总时长</p>
          <span class="font-display font-bold text-xl text-white/50">第 7 天</span>
        </div>
      </div>

      <!-- Bar wrapper -->
      <div class="relative py-4" id="bar-container">

        <!-- Tooltip -->
        <div id="tooltip" class="time-tooltip" style="display:none; left:0%;">
          <span id="tooltip-text">0 min</span>
        </div>

        <!-- Track -->
        <div class="progress-track" id="track">
          <div class="progress-fill" id="fill" style="width:0%"></div>
          <!-- Milestone diamond markers (injected by JS) -->
          <div id="milestone-markers"></div>
          <!-- Drag handle -->
          <div class="progress-glow" id="handle" style="left:0%"
               role="slider" aria-label="游戏进度" aria-valuemin="0" aria-valuemax="${TOTAL_MINUTES}" aria-valuenow="0">
          </div>
        </div>

        <!-- Axis labels (injected by JS) -->
        <div class="relative h-7 mt-2" id="axis-labels"></div>
      </div>
    </section>

    <!-- Milestone grid -->
    <section class="w-full max-w-3xl animate-fade-up" style="animation-delay:0.2s">

      <!-- Early milestones -->
      <p class="text-white/30 text-xs uppercase tracking-widest mb-3 font-semibold">早期解锁节点</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" id="early-cards"></div>

      <!-- Daily milestones -->
      <p class="text-white/30 text-xs uppercase tracking-widest mb-3 font-semibold">每日解锁节点</p>
      <div class="grid grid-cols-4 md:grid-cols-7 gap-3" id="daily-cards"></div>
    </section>

  </div>
`;

// ── Build axis labels & milestone markers ─────────────────────────────
const axisEl = document.getElementById('axis-labels');
const markersEl = document.getElementById('milestone-markers');

// Axis: show each milestone label under the track
MILESTONES.forEach(ms => {
  const pct = (ms.minute / TOTAL_MINUTES) * 100;

  // Diamond marker on the track
  const diamond = document.createElement('div');
  diamond.className = `milestone-diamond ${ms.type}`;
  diamond.style.left = `${pct}%`;
  diamond.title = ms.label;
  markersEl.appendChild(diamond);

  // Label below
  const lbl = document.createElement('div');
  lbl.className = 'axis-label';
  lbl.style.left = `${pct}%`;
  lbl.innerHTML = `<span class="axis-main">${ms.label}</span><span class="axis-sub">${ms.desc}</span>`;
  axisEl.appendChild(lbl);
});

// ── Build milestone cards ─────────────────────────────────────────────
function buildCards(containerId, type) {
  const container = document.getElementById(containerId);
  MILESTONES.filter(ms => ms.type === type).forEach(ms => {
    const div = document.createElement('div');
    div.id = `card-${ms.id}`;
    div.className = 'milestone-card glass rounded-xl p-4';
    div.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-white/50 text-xs font-semibold uppercase tracking-wide">${ms.label}</span>
        <span class="card-badge">锁定</span>
      </div>
      <p class="text-white/30 text-sm font-mono card-time">${ms.desc}</p>
      <div class="h-0.5 rounded-full bg-white/5 mt-3 overflow-hidden">
        <div class="card-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style="width:0%"></div>
      </div>
    `;
    container.appendChild(div);
  });
}
buildCards('early-cards', 'early');
buildCards('daily-cards', 'daily');

// ── Progress bar logic ────────────────────────────────────────────────
const track = document.getElementById('track');
const fill = document.getElementById('fill');
const handle = document.getElementById('handle');
const tooltip = document.getElementById('tooltip');
const tooltipTxt = document.getElementById('tooltip-text');
const timeDisp = document.getElementById('time-display');

function setProgress(fraction) {
  // Forward-only
  fraction = clamp(fraction, currentMinute / TOTAL_MINUTES, 1);
  currentMinute = Math.round(fraction * TOTAL_MINUTES);
  const pct = (currentMinute / TOTAL_MINUTES) * 100;

  fill.style.width = `${pct}%`;
  handle.style.left = `${pct}%`;
  tooltip.style.left = `${pct}%`;
  handle.setAttribute('aria-valuenow', currentMinute);

  timeDisp.textContent = formatTime(currentMinute);
  tooltipTxt.textContent = formatTooltip(currentMinute);

  updateCards();
}

function fractionFromEvent(e) {
  const rect = track.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  return (cx - rect.left) / rect.width;
}

// Drag events
handle.addEventListener('mousedown', e => { isDragging = true; handle.classList.add('dragging'); tooltip.style.display = 'block'; e.preventDefault(); });
handle.addEventListener('touchstart', e => { isDragging = true; handle.classList.add('dragging'); tooltip.style.display = 'block'; e.preventDefault(); }, { passive: false });

document.addEventListener('mousemove', e => { if (isDragging) setProgress(fractionFromEvent(e)); });
document.addEventListener('touchmove', e => { if (isDragging) { setProgress(fractionFromEvent(e)); e.preventDefault(); } }, { passive: false });

document.addEventListener('mouseup', () => { if (!isDragging) return; isDragging = false; handle.classList.remove('dragging'); tooltip.style.display = 'none'; });
document.addEventListener('touchend', () => { if (!isDragging) return; isDragging = false; handle.classList.remove('dragging'); tooltip.style.display = 'none'; });

track.addEventListener('click', e => { if (e.target === handle) return; setProgress(fractionFromEvent(e)); });

handle.addEventListener('mouseenter', () => tooltip.style.display = 'block');
handle.addEventListener('mouseleave', () => { if (!isDragging) tooltip.style.display = 'none'; });

handle.addEventListener('keydown', e => {
  const step = 1 / TOTAL_MINUTES;
  const cur = currentMinute / TOTAL_MINUTES;
  if (e.key === 'ArrowRight') { setProgress(cur + step); e.preventDefault(); }
  if (e.key === 'End') { setProgress(1); e.preventDefault(); }
});

// ── Update milestone cards ────────────────────────────────────────────
function updateCards() {
  MILESTONES.forEach((ms, i) => {
    const card = document.getElementById(`card-${ms.id}`);
    if (!card) return;
    const badge = card.querySelector('.card-badge');
    const bar = card.querySelector('.card-bar');
    const prevMin = i === 0 ? 0 : MILESTONES[i - 1].minute;

    if (currentMinute >= ms.minute) {
      // Fully unlocked
      badge.textContent = '已解锁';
      badge.className = 'card-badge unlocked';
      bar.style.width = '100%';
      card.classList.add('card-active');
    } else if (currentMinute > prevMin) {
      // In progress
      const pct = Math.round(((currentMinute - prevMin) / (ms.minute - prevMin)) * 100);
      badge.textContent = `${pct}%`;
      badge.className = 'card-badge in-progress';
      bar.style.width = `${pct}%`;
      card.classList.add('card-active');
    } else {
      badge.textContent = '锁定';
      badge.className = 'card-badge';
      bar.style.width = '0%';
      card.classList.remove('card-active');
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────
setProgress(0);
