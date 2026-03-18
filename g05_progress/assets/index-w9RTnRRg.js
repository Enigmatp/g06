(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=7,t=[120,240,360,480,600,720,840],n=[{id:`m1`,label:`解锁一`,desc:`5 分钟`,dayFraction:5/120},{id:`m2`,label:`解锁二`,desc:`25 分钟`,dayFraction:25/120},{id:`m3`,label:`解锁三`,desc:`1 小时`,dayFraction:60/120},{id:`m4`,label:`解锁四`,desc:`2 小时`,dayFraction:120/120}];function r(e,t,n){return Math.max(t,Math.min(n,e))}function i(t){if(t<=0)return`未开始`;let n=Math.floor(t),r=t-n;if(n>=e&&r===0)return`第 ${e} 天`;if(r===0)return`第 ${n} 天`;let i=Math.round(r*120);if(n===0){if(i<60)return`${i} 分钟`;let e=Math.floor(i/60),t=i%60;return t===0?`${e} 小时`:`${e} 小时 ${t} 分`}return i===0?`第 ${n} 天`:`第 ${n} 天 +${i} 分`}var a=0,o=!1;document.getElementById(`app`).innerHTML=`
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
          ${Array.from({length:e},(e,t)=>`
            <div class="seg" id="seg-${t}" data-day="${t+1}">
              <div class="seg-fill" id="segfill-${t}" style="width:0%"></div>
              ${Array.from({length:23},(e,t)=>`<div class="seg-tick" style="left:${((t+1)/24*100).toFixed(3)}%"></div>`).join(``)}
            </div>
          `).join(``)}
          <!-- Invisible full-width drag overlay -->
          <div class="seg-overlay" id="overlay"></div>
          <!-- Handle -->
          <div class="seg-handle" id="handle" style="left:0%"
               role="slider" aria-label="游戏进度" aria-valuemin="0" aria-valuemax="${e}" aria-valuenow="0" tabindex="0">
          </div>
        </div>

        <!-- Day axis labels -->
        <div class="relative mt-3" style="height:2.5rem;" id="axis-labels">
          ${Array.from({length:e},(n,r)=>`
              <div class="axis-label" style="left:${(r+1)/e*100}%">
                <span class="axis-main">第 ${r+1} 天</span>
                <span class="axis-sub">${t[r]} min</span>
              </div>
            `).join(``)}
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
`;function s(e,t,n){return`
    <div id="card-${e}" class="milestone-card glass rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-white/50 text-sm font-semibold uppercase tracking-wide">${t}</span>
        <span class="card-badge">锁定</span>
      </div>
      <p class="text-white/30 text-base font-mono">${n}</p>
      <div class="h-0.5 rounded-full bg-white/5 mt-4 overflow-hidden">
        <div class="card-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style="width:0%"></div>
      </div>
    </div>
  `}document.getElementById(`early-cards`).innerHTML=n.map(e=>s(e.id,e.label,e.desc)).join(``),document.getElementById(`daily-cards`).innerHTML=Array.from({length:e},(e,n)=>{let r=n+1,i=t[n]/60;return s(`d${r}`,`第 ${r} 天`,`累计 ${i} 小时`)}).join(``);var c=document.getElementById(`overlay`),l=document.getElementById(`handle`),u=document.getElementById(`tooltip`),d=document.getElementById(`tooltip-text`),f=document.getElementById(`time-display`);function p(t){t=r(t,0,1),a=t*e,l.style.left=`${t*100}%`,u.style.left=`${t*100}%`,l.setAttribute(`aria-valuenow`,a.toFixed(2));for(let n=0;n<e;n++){let r=n/e,i=(n+1)/e,a=0;t>=i?a=100:t>r&&(a=(t-r)/(i-r)*100),document.getElementById(`segfill-${n}`).style.width=`${a}%`}f.textContent=i(a),d.textContent=i(a),h()}function m(e){let t=c.getBoundingClientRect();return r(((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width,0,1)}c.addEventListener(`mousedown`,e=>{o=!0,l.classList.add(`dragging`),u.style.display=`block`,p(m(e)),e.preventDefault()}),c.addEventListener(`touchstart`,e=>{o=!0,l.classList.add(`dragging`),u.style.display=`block`,p(m(e)),e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{o&&p(m(e))}),document.addEventListener(`touchmove`,e=>{o&&(p(m(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{o&&(o=!1,l.classList.remove(`dragging`),u.style.display=`none`)}),document.addEventListener(`touchend`,()=>{o&&(o=!1,l.classList.remove(`dragging`),u.style.display=`none`)}),l.addEventListener(`mouseenter`,()=>u.style.display=`block`),l.addEventListener(`mouseleave`,()=>{o||(u.style.display=`none`)}),l.addEventListener(`keydown`,t=>{let n=1/(e*60),r=a/e;t.key===`ArrowRight`&&(p(r+n),t.preventDefault()),t.key===`ArrowLeft`&&(p(r-n),t.preventDefault()),t.key===`Home`&&(p(0),t.preventDefault()),t.key===`End`&&(p(1),t.preventDefault())});function h(){n.forEach((e,t)=>{let r=document.getElementById(`card-${e.id}`),i=r.querySelector(`.card-badge`),o=r.querySelector(`.card-bar`),s=t===0?0:n[t-1].dayFraction;if(a>=e.dayFraction)i.textContent=`已解锁`,i.className=`card-badge unlocked`,o.style.width=`100%`,r.classList.add(`card-active`);else if(a>s){let t=Math.round((a-s)/(e.dayFraction-s)*100);i.textContent=`${t}%`,i.className=`card-badge in-progress`,o.style.width=`${t}%`,r.classList.add(`card-active`)}else i.textContent=`锁定`,i.className=`card-badge`,o.style.width=`0%`,r.classList.remove(`card-active`)});for(let t=0;t<e;t++){let e=t+1,n=document.getElementById(`card-d${e}`),r=n.querySelector(`.card-badge`),i=n.querySelector(`.card-bar`),o=t;if(a>=e)r.textContent=`已解锁`,r.className=`card-badge unlocked`,i.style.width=`100%`,n.classList.add(`card-active`);else if(a>o){let e=Math.round((a-o)*100);r.textContent=`${e}%`,r.className=`card-badge in-progress`,i.style.width=`${e}%`,n.classList.add(`card-active`)}else r.textContent=`锁定`,r.className=`card-badge`,i.style.width=`0%`,n.classList.remove(`card-active`)}}p(0);