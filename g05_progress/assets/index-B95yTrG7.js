(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=90,t=5,n=15,r=0,i=!1;document.getElementById(`app`).innerHTML=`
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
            <span class="font-display font-bold text-2xl text-white/60">${e}</span>
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
               role="slider" aria-label="时间进度" aria-valuemin="0" aria-valuemax="${e}" aria-valuenow="0">
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
          ${[0,25,50,75,100].map(e=>`
            <button data-pct="${e}"
              class="quick-btn px-3 py-1 rounded-lg text-xs font-semibold border border-white/10 bg-white/5
                     hover:bg-brand-600/40 hover:border-brand-400/50 hover:text-brand-200
                     transition-all duration-200 text-white/50">
              ${e}%
            </button>
          `).join(``)}
        </div>
        <span id="pct-display" class="text-white/30 text-sm font-mono">0%</span>
      </div>
    </section>

    <!-- Placeholder stage cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl animate-fade-up" style="animation-delay:0.2s">
      ${[`阶段一`,`阶段二`,`阶段三`].map((e,t)=>`
        <div class="glass rounded-xl p-5 flex flex-col gap-2 stage-card" data-stage="${t}">
          <div class="flex items-center justify-between">
            <span class="text-white/60 text-xs uppercase tracking-widest font-semibold">${e}</span>
            <span class="stage-badge text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">锁定</span>
          </div>
          <p class="font-display font-semibold text-white/20 text-lg stage-name">—</p>
          <div class="h-1 rounded-full bg-white/5 overflow-hidden">
            <div class="stage-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style="width:0%"></div>
          </div>
        </div>
      `).join(``)}
    </section>

    <footer class="text-white/20 text-xs text-center">
      Enigmatp · G05 Progress Tracker · 2026
    </footer>
  </div>
`;var a=document.getElementById(`ticks`),o=document.getElementById(`labels`);for(let r=0;r<=e;r+=t){let t=r/e*100,i=r%n===0,s=document.createElement(`div`);if(s.className=`tick ${i?`major`:``}`,s.style.left=`${t}%`,s.style.height=i?`14px`:`8px`,a.appendChild(s),i){let e=document.createElement(`div`);e.className=`minute-label`,e.style.left=`${t}%`,e.textContent=`${r}`,o.appendChild(e)}}var s=document.getElementById(`track`),c=document.getElementById(`fill`),l=document.getElementById(`handle`),u=document.getElementById(`tooltip`),d=document.getElementById(`tooltip-text`),f=document.getElementById(`time-display`),p=document.getElementById(`pct-display`);function m(e,t,n){return Math.max(t,Math.min(n,e))}function h(t){t=m(t,0,1),r=Math.round(t*e);let n=r/e*100;c.style.width=`${n}%`,l.style.left=`${n}%`,u.style.left=`${n}%`,l.setAttribute(`aria-valuenow`,r),f.textContent=String(r).padStart(2,`0`),d.textContent=`${r} min`,p.textContent=`${Math.round(t*100)}%`,v(t)}function g(e){let t=s.getBoundingClientRect();return((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width}l.addEventListener(`mousedown`,e=>{i=!0,l.classList.add(`dragging`),u.style.display=`block`,e.preventDefault()}),l.addEventListener(`touchstart`,e=>{i=!0,l.classList.add(`dragging`),u.style.display=`block`,e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{i&&h(g(e))}),document.addEventListener(`touchmove`,e=>{i&&(h(g(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{i&&(i=!1,l.classList.remove(`dragging`),u.style.display=`none`)}),document.addEventListener(`touchend`,()=>{i&&(i=!1,l.classList.remove(`dragging`),u.style.display=`none`)}),s.addEventListener(`click`,e=>{e.target!==l&&h(g(e))}),l.addEventListener(`mouseenter`,()=>{u.style.display=`block`}),l.addEventListener(`mouseleave`,()=>{i||(u.style.display=`none`)}),l.addEventListener(`keydown`,t=>{let n=1/e,i=r/e;t.key===`ArrowRight`&&(h(i+n),t.preventDefault()),t.key===`ArrowLeft`&&(h(i-n),t.preventDefault()),t.key===`Home`&&(h(0),t.preventDefault()),t.key===`End`&&(h(1),t.preventDefault())}),document.querySelectorAll(`.quick-btn`).forEach(e=>{e.addEventListener(`click`,()=>{h(Number(e.dataset.pct)/100)})});var _=[{name:`初始解锁`,unlock:0,full:.33},{name:`进阶内容`,unlock:.33,full:.66},{name:`精英模式`,unlock:.66,full:1}];function v(e){document.querySelectorAll(`.stage-card`).forEach((t,n)=>{let r=_[n],i=t.querySelector(`.stage-bar`),a=t.querySelector(`.stage-badge`),o=t.querySelector(`.stage-name`);if(e<r.unlock)i.style.width=`0%`,a.textContent=`锁定`,a.className=`stage-badge text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30`,o.textContent=`—`,o.className=`font-display font-semibold text-white/20 text-lg stage-name`;else{let t=m((e-r.unlock)/(r.full-r.unlock),0,1),n=Math.round(t*100);i.style.width=`${n}%`,o.textContent=r.name,n>=100?(a.textContent=`已解锁`,a.className=`stage-badge text-xs px-2 py-0.5 rounded-full bg-brand-600/30 border border-brand-400/40 text-brand-300`,o.className=`font-display font-semibold text-white text-lg stage-name`):(a.textContent=`${n}%`,a.className=`stage-badge text-xs px-2 py-0.5 rounded-full bg-brand-900/40 border border-brand-600/30 text-brand-400`,o.className=`font-display font-semibold text-white/70 text-lg stage-name`)}})}h(0);