import './style.css';

// ── Chapter Definitions ──────────────────────────────────────────────
// Each chapter: start/end in minutes from game start
// Total axis = 1440 min (24h); Ch10 is partial (starts at 21h)
const TOTAL_MIN = 1440;

const CHAPTERS = [
  { id: 1, label: '章节 1', start: 0, end: 5, color: '#10b981' }, // emerald
  { id: 2, label: '章节 2', start: 5, end: 25, color: '#f59e0b' }, // amber
  { id: 3, label: '章节 3', start: 25, end: 60, color: '#ef4444' }, // red
  { id: 4, label: '章节 4', start: 60, end: 120, color: '#a855f7' }, // purple
  { id: 5, label: '章节 5', start: 120, end: 180, color: '#ec4899' }, // pink
  { id: 6, label: '章节 6', start: 180, end: 300, color: '#14b8a6' }, // teal
  { id: 7, label: '章节 7', start: 300, end: 480, color: '#f97316' }, // orange
  { id: 8, label: '章节 8', start: 480, end: 780, color: '#06b6d4' }, // cyan
  { id: 9, label: '章节 9', start: 780, end: 1260, color: '#84cc16' }, // lime
  { id: 10, label: '章节 10', start: 1260, end: 1440, color: '#e11d48', partial: true }, // rose (partial)
];

// ── Helpers ──────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function fmtTime(min) {
  if (min <= 0) return '未开始';
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

function fmtUnlock(min) {
  if (min === 0) return '立即解锁';
  return fmtTime(min);
}

// ── State ────────────────────────────────────────────────────────────
let currentMin = 0;
let isDragging = false;

// ── Build tick marks for a chapter ───────────────────────────────────
function buildTicks(dur) {
  const count = Math.floor((dur - 1) / 5); // ticks at 5, 10, 15, …
  return Array.from({ length: count }, (_, i) => {
    const pct = ((i + 1) * 5 / dur * 100).toFixed(3);
    return `<div class="seg-tick" style="left:${pct}%"></div>`;
  }).join('');
}

// ── HTML ─────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = `
  <div class="blob" style="width:600px;height:600px;top:-150px;left:-120px;background:rgba(16,185,129,0.10);"></div>
  <div class="blob" style="width:500px;height:500px;bottom:-120px;right:-80px;background:rgba(168,85,247,0.12);"></div>

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-8">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-5xl md:text-6xl text-shimmer">G05 游戏进度</h1>
    </header>

    <!-- Progress card -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.1s">

      <!-- Time readout -->
      <div class="flex items-end justify-between mb-8">
        <div>
          <p class="text-white/40 text-sm uppercase tracking-widest mb-1">当前时间</p>
          <div id="time-display" class="font-display font-bold text-5xl text-white">未开始</div>
        </div>
        <div class="text-right">
          <p class="text-white/40 text-sm uppercase tracking-widest mb-1">总时长</p>
          <span class="font-display font-bold text-2xl text-white/50">24 小时</span>
        </div>
      </div>

      <!-- Proportional chapter bar -->
      <div class="relative" id="bar-root">

        <!-- Tooltip -->
        <div id="tooltip" class="time-tooltip" style="display:none;left:0%">
          <span id="tooltip-text">未开始</span>
        </div>

        <!-- Segments (proportional widths) -->
        <div class="chapter-track" id="track">
          ${CHAPTERS.map(ch => {
  const w = ((ch.end - ch.start) / TOTAL_MIN * 100).toFixed(4);
  const dur = ch.end - ch.start;
  return `
              <div class="ch-seg" style="width:${w}%;border-color:${ch.color}22;"
                   id="ch-${ch.id}" title="${ch.label}">
                <div class="ch-fill" id="fill-${ch.id}"
                     style="width:0%;background:${ch.color};"></div>
                ${buildTicks(dur)}
              </div>`;
}).join('')}
          <!-- Drag overlay -->
          <div class="seg-overlay" id="overlay"></div>
          <!-- Handle -->
          <div class="seg-handle" id="handle" style="left:0%"
               role="slider" tabindex="0"
               aria-label="游戏进度" aria-valuemin="0" aria-valuemax="${TOTAL_MIN}" aria-valuenow="0">
          </div>
        </div>

        <!-- Axis labels -->
        <div class="relative mt-3 chapter-axis" id="axis">
          ${CHAPTERS.map(ch => {
  const pct = (ch.start / TOTAL_MIN * 100).toFixed(4);
  return `
              <div class="axis-label ch-axis-label" style="left:${pct}%">
                <span class="axis-main" style="color:${ch.color}">${ch.label}</span>
                <span class="axis-sub">${fmtUnlock(ch.start)}</span>
              </div>`;
}).join('')}
        </div>
      </div>
    </section>

    <!-- Chapter cards -->
    <section class="w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">章节解锁进度</p>
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3" id="chapter-cards"></div>
    </section>

  </div>
`;

// ── Build chapter cards ───────────────────────────────────────────────
const cardsEl = document.getElementById('chapter-cards');
CHAPTERS.forEach(ch => {
  const div = document.createElement('div');
  div.id = `card-${ch.id}`;
  div.className = 'milestone-card glass rounded-xl p-4';
  div.style.borderColor = `${ch.color}22`;
  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold" style="color:${ch.color}">${ch.label}</span>
      <span class="card-badge" id="badge-${ch.id}" style="border-color:${ch.color}44">锁定</span>
    </div>
    <p class="text-white/30 text-xs font-mono mb-3">${fmtUnlock(ch.start)}${ch.partial ? ' (部分)' : ''}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div class="card-bar h-full rounded-full transition-all duration-300"
           id="cbar-${ch.id}" style="width:0%;background:${ch.color};"></div>
    </div>
  `;
  cardsEl.appendChild(div);
});

// ── Progress logic ────────────────────────────────────────────────────
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

  timeDisp.textContent = fmtTime(currentMin);
  tooltipTxt.textContent = fmtTime(currentMin);

  updateChapters();
}

function fractionFromEvent(e) {
  const rect = overlay.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  return clamp((cx - rect.left) / rect.width, 0, 1);
}

// Drag
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

// ── Update chapters ───────────────────────────────────────────────────
function updateChapters() {
  CHAPTERS.forEach(ch => {
    const fill = document.getElementById(`fill-${ch.id}`);
    const badge = document.getElementById(`badge-${ch.id}`);
    const cbar = document.getElementById(`cbar-${ch.id}`);
    const card = document.getElementById(`card-${ch.id}`);
    const dur = ch.end - ch.start;

    if (currentMin < ch.start) {
      // Locked
      fill.style.width = '0%';
      cbar.style.width = '0%';
      badge.textContent = '锁定';
      badge.style.color = 'rgba(255,255,255,0.28)';
      card.classList.remove('card-active');
    } else if (currentMin >= ch.end) {
      // Completed
      fill.style.width = '100%';
      cbar.style.width = '100%';
      badge.textContent = ch.partial ? '部分解锁' : '完成';
      badge.style.color = ch.color;
      card.classList.add('card-active');
    } else {
      // In progress — "instantly unlocked" label
      const pct = Math.round((currentMin - ch.start) / dur * 100);
      fill.style.width = `${pct}%`;
      cbar.style.width = `${pct}%`;
      badge.textContent = `已解锁 ${pct}%`;
      badge.style.color = ch.color;
      card.classList.add('card-active');
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────
setProgress(0);
