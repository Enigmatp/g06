import './style.css';

// ── Config ──────────────────────────────────────────────────────────
// Internal unit = DAYS (0.0 → 7.0)
// Each of the 7 segments represents one in-game day.
// Early milestones (5min, 25min, 1h, 2h) all happen within Day 1.
const TOTAL_DAYS = 7;

// Cumulative real-world time at end of each day (each day = 2 hours = 120 min)
const DAY_CUM_MIN = [120, 240, 360, 480, 600, 720, 840]; // Day 1..7

// Each day = 120 min; early milestones happen within Day 1
const EARLY = [
  { id: 'm1', label: '解锁一', desc: '5 分钟', dayFraction: 5 / 120 },
  { id: 'm2', label: '解锁二', desc: '25 分钟', dayFraction: 25 / 120 },
  { id: 'm3', label: '解锁三', desc: '1 小时', dayFraction: 60 / 120 },
  { id: 'm4', label: '解锁四', desc: '2 小时', dayFraction: 120 / 120 },
];

// ── Helpers ─────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function formatDay(dayVal) {
  if (dayVal <= 0) return '未开始';
  const day = Math.floor(dayVal);
  const frac = dayVal - day;
  if (day >= TOTAL_DAYS && frac === 0) return `第 ${TOTAL_DAYS} 天`;
  if (frac === 0) return `第 ${day} 天`;
  // Each day = 120 min (2 hours)
  const minInDay = Math.round(frac * 120);
  if (day === 0) {
    if (minInDay < 60) return `${minInDay} 分钟`;
    const h = Math.floor(minInDay / 60), m = minInDay % 60;
    return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
  }
  return minInDay === 0 ? `第 ${day} 天` : `第 ${day} 天 +${minInDay} 分`;
}

// ── State ────────────────────────────────────────────────────────────
let currentDay = 0;   // 0.0 → 7.0
let isDragging = false;

// ── HTML ─────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
  <div class="blob" style="width:600px;height:600px;top:-150px;left:-120px;background:rgba(61,90,254,0.16);"></div>
  <div class="blob" style="width:500px;height:500px;bottom:-120px;right:-80px;background:rgba(124,111,205,0.14);"></div>

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-8">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-5xl md:text-6xl text-shimmer">G05 游戏进度</h1>
    </header>

    <!-- Progress Card -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem; animation-delay:0.1s">

      <!-- Time display -->
      <div class="flex items-end justify-between mb-8">
        <div>
          <p class="text-white/40 text-sm uppercase tracking-widest mb-1">当前进度</p>
          <div id="time-display" class="font-display font-bold text-5xl text-white">未开始</div>
        </div>
        <div class="text-right">
          <p class="text-white/40 text-sm uppercase tracking-widest mb-1">总时长</p>
          <span class="font-display font-bold text-2xl text-white/50">7 天</span>
        </div>
      </div>

      <!-- Segmented bar -->
      <div class="relative" id="bar-root">

        <!-- Tooltip -->
        <div id="tooltip" class="time-tooltip" style="display:none; left:0%;">
          <span id="tooltip-text">未开始</span>
        </div>

        <!-- 7 segments -->
        <div class="seg-track" id="track">
          ${Array.from({ length: TOTAL_DAYS }, (_, i) => `
            <div class="seg" id="seg-${i}" data-day="${i + 1}">
              <div class="seg-fill" id="segfill-${i}" style="width:0%"></div>
              ${Array.from({ length: 23 }, (_, t) => {
  const pct = ((t + 1) / 24 * 100).toFixed(3);
  return `<div class="seg-tick" style="left:${pct}%"></div>`;
}).join('')}
            </div>
          `).join('')}
          <!-- Invisible full-width drag overlay -->
          <div class="seg-overlay" id="overlay"></div>
          <!-- Handle -->
          <div class="seg-handle" id="handle" style="left:0%"
               role="slider" aria-label="游戏进度" aria-valuemin="0" aria-valuemax="${TOTAL_DAYS}" aria-valuenow="0" tabindex="0">
          </div>
        </div>

        <!-- Day axis labels -->
        <div class="relative mt-3" style="height:2.5rem;" id="axis-labels">
          ${Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const pct = ((i + 1) / TOTAL_DAYS) * 100;
  return `
              <div class="axis-label" style="left:${pct}%">
                <span class="axis-main">第 ${i + 1} 天</span>
                <span class="axis-sub">${DAY_CUM_MIN[i]} min</span>
              </div>
            `;
}).join('')}
        </div>
      </div>
    </section>

    <!-- Milestone cards -->
    <section class="w-full animate-fade-up" style="max-width:128rem; animation-delay:0.2s">

      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">早期解锁节点</p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" id="early-cards"></div>

      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">每日解锁节点</p>
      <div class="grid grid-cols-4 md:grid-cols-7 gap-4" id="daily-cards"></div>
    </section>
  </div>
`;

// ── Build milestone cards ────────────────────────────────────────────
function makeCard(id, label, desc) {
  return `
    <div id="card-${id}" class="milestone-card glass rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-white/50 text-sm font-semibold uppercase tracking-wide">${label}</span>
        <span class="card-badge">锁定</span>
      </div>
      <p class="text-white/30 text-base font-mono">${desc}</p>
      <div class="h-0.5 rounded-full bg-white/5 mt-4 overflow-hidden">
        <div class="card-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style="width:0%"></div>
      </div>
    </div>
  `;
}

document.getElementById('early-cards').innerHTML =
  EARLY.map(m => makeCard(m.id, m.label, m.desc)).join('');

document.getElementById('daily-cards').innerHTML =
  Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const d = i + 1;
    const cumH = DAY_CUM_MIN[i] / 60;   // 2, 4, 6, 8, 10, 12, 14
    return makeCard(`d${d}`, `第 ${d} 天`, `累计 ${cumH} 小时`);
  }).join('');

// ── Progress logic ────────────────────────────────────────────────────
const overlay = document.getElementById('overlay');
const handle = document.getElementById('handle');
const tooltip = document.getElementById('tooltip');
const tooltipTxt = document.getElementById('tooltip-text');
const timeDisp = document.getElementById('time-display');

function setProgress(fraction) {
  fraction = clamp(fraction, 0, 1);
  currentDay = fraction * TOTAL_DAYS;

  // Update handle
  handle.style.left = `${fraction * 100}%`;
  tooltip.style.left = `${fraction * 100}%`;
  handle.setAttribute('aria-valuenow', currentDay.toFixed(2));

  // Update each segment fill
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const segStart = i / TOTAL_DAYS;       // 0, 1/7, 2/7…
    const segEnd = (i + 1) / TOTAL_DAYS;
    let pct = 0;
    if (fraction >= segEnd) pct = 100;
    else if (fraction > segStart) pct = ((fraction - segStart) / (segEnd - segStart)) * 100;
    document.getElementById(`segfill-${i}`).style.width = `${pct}%`;
  }

  timeDisp.textContent = formatDay(currentDay);
  tooltipTxt.textContent = formatDay(currentDay);
  updateCards();
}

function fractionFromEvent(e) {
  const rect = overlay.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  return clamp((cx - rect.left) / rect.width, 0, 1);
}

// Drag
overlay.addEventListener('mousedown', e => { isDragging = true; handle.classList.add('dragging'); tooltip.style.display = 'block'; setProgress(fractionFromEvent(e)); e.preventDefault(); });
overlay.addEventListener('touchstart', e => { isDragging = true; handle.classList.add('dragging'); tooltip.style.display = 'block'; setProgress(fractionFromEvent(e)); e.preventDefault(); }, { passive: false });

document.addEventListener('mousemove', e => { if (isDragging) setProgress(fractionFromEvent(e)); });
document.addEventListener('touchmove', e => { if (isDragging) { setProgress(fractionFromEvent(e)); e.preventDefault(); } }, { passive: false });

document.addEventListener('mouseup', () => { if (!isDragging) return; isDragging = false; handle.classList.remove('dragging'); tooltip.style.display = 'none'; });
document.addEventListener('touchend', () => { if (!isDragging) return; isDragging = false; handle.classList.remove('dragging'); tooltip.style.display = 'none'; });

handle.addEventListener('mouseenter', () => tooltip.style.display = 'block');
handle.addEventListener('mouseleave', () => { if (!isDragging) tooltip.style.display = 'none'; });

handle.addEventListener('keydown', e => {
  const step = 1 / (TOTAL_DAYS * 60); // 1-min resolution
  const cur = currentDay / TOTAL_DAYS;
  if (e.key === 'ArrowRight') { setProgress(cur + step); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { setProgress(cur - step); e.preventDefault(); }
  if (e.key === 'Home') { setProgress(0); e.preventDefault(); }
  if (e.key === 'End') { setProgress(1); e.preventDefault(); }
});

// ── Update cards ──────────────────────────────────────────────────────
function updateCards() {
  // Early milestones (within Day 1, fraction of first day)
  EARLY.forEach((m, i) => {
    const card = document.getElementById(`card-${m.id}`);
    const badge = card.querySelector('.card-badge');
    const bar = card.querySelector('.card-bar');
    const prevFrac = i === 0 ? 0 : EARLY[i - 1].dayFraction;

    if (currentDay >= m.dayFraction) {
      badge.textContent = '已解锁'; badge.className = 'card-badge unlocked';
      bar.style.width = '100%'; card.classList.add('card-active');
    } else if (currentDay > prevFrac) {
      const pct = Math.round(((currentDay - prevFrac) / (m.dayFraction - prevFrac)) * 100);
      badge.textContent = `${pct}%`; badge.className = 'card-badge in-progress';
      bar.style.width = `${pct}%`; card.classList.add('card-active');
    } else {
      badge.textContent = '锁定'; badge.className = 'card-badge';
      bar.style.width = '0%'; card.classList.remove('card-active');
    }
  });

  // Daily milestones
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = i + 1;
    const card = document.getElementById(`card-d${d}`);
    const badge = card.querySelector('.card-badge');
    const bar = card.querySelector('.card-bar');
    const prevDay = i; // unlocked after full day i (0-based)

    if (currentDay >= d) {
      badge.textContent = '已解锁'; badge.className = 'card-badge unlocked';
      bar.style.width = '100%'; card.classList.add('card-active');
    } else if (currentDay > prevDay) {
      const pct = Math.round((currentDay - prevDay) * 100);
      badge.textContent = `${pct}%`; badge.className = 'card-badge in-progress';
      bar.style.width = `${pct}%`; card.classList.add('card-active');
    } else {
      badge.textContent = '锁定'; badge.className = 'card-badge';
      bar.style.width = '0%'; card.classList.remove('card-active');
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────
setProgress(0);
