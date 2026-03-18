(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=540,t=[{id:`m1`,label:`解锁一`,desc:`5 分钟`,minute:5,type:`early`},{id:`m2`,label:`解锁二`,desc:`25 分钟`,minute:25,type:`early`},{id:`m3`,label:`解锁三`,desc:`1 小时`,minute:60,type:`early`},{id:`m4`,label:`解锁四`,desc:`2 小时`,minute:120,type:`early`},{id:`d1`,label:`第 1 天`,desc:`Day 1`,minute:180,type:`daily`},{id:`d2`,label:`第 2 天`,desc:`Day 2`,minute:240,type:`daily`},{id:`d3`,label:`第 3 天`,desc:`Day 3`,minute:300,type:`daily`},{id:`d4`,label:`第 4 天`,desc:`Day 4`,minute:360,type:`daily`},{id:`d5`,label:`第 5 天`,desc:`Day 5`,minute:420,type:`daily`},{id:`d6`,label:`第 6 天`,desc:`Day 6`,minute:480,type:`daily`},{id:`d7`,label:`第 7 天`,desc:`Day 7`,minute:540,type:`daily`}];function n(e,t,n){return Math.max(t,Math.min(n,e))}function r(e){if(e<60)return`${e} 分钟`;if(e<120){let t=Math.floor(e/60),n=e%60;return n===0?`${t} 小时`:`${t} 小时 ${n} 分钟`}let t=Math.floor((e-120)/60)+1,n=(e-120)%60,r=`第 ${t} 天`;return n===0?r:`${r} +${n} 分钟`}function i(e){if(e<60)return`${e} min`;if(e<120){let t=Math.floor(e/60),n=e%60;return n===0?`${t}h`:`${t}h ${n}m`}let t=Math.floor((e-120)/60)+1,n=(e-120)%60;return n===0?`Day ${t}`:`Day ${t} +${n}m`}var a=0,o=!1;document.getElementById(`app`).innerHTML=`
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
               role="slider" aria-label="游戏进度" aria-valuemin="0" aria-valuemax="${e}" aria-valuenow="0">
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
`;var s=document.getElementById(`axis-labels`),c=document.getElementById(`milestone-markers`);t.forEach(t=>{let n=t.minute/e*100,r=document.createElement(`div`);r.className=`milestone-diamond ${t.type}`,r.style.left=`${n}%`,r.title=t.label,c.appendChild(r);let i=document.createElement(`div`);i.className=`axis-label`,i.style.left=`${n}%`,i.innerHTML=`<span class="axis-main">${t.label}</span><span class="axis-sub">${t.desc}</span>`,s.appendChild(i)});function l(e,n){let r=document.getElementById(e);t.filter(e=>e.type===n).forEach(e=>{let t=document.createElement(`div`);t.id=`card-${e.id}`,t.className=`milestone-card glass rounded-xl p-4`,t.innerHTML=`
      <div class="flex items-center justify-between mb-2">
        <span class="text-white/50 text-xs font-semibold uppercase tracking-wide">${e.label}</span>
        <span class="card-badge">锁定</span>
      </div>
      <p class="text-white/30 text-sm font-mono card-time">${e.desc}</p>
      <div class="h-0.5 rounded-full bg-white/5 mt-3 overflow-hidden">
        <div class="card-bar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style="width:0%"></div>
      </div>
    `,r.appendChild(t)})}l(`early-cards`,`early`),l(`daily-cards`,`daily`);var u=document.getElementById(`track`),d=document.getElementById(`fill`),f=document.getElementById(`handle`),p=document.getElementById(`tooltip`),m=document.getElementById(`tooltip-text`),h=document.getElementById(`time-display`);function g(t){t=n(t,a/e,1),a=Math.round(t*e);let o=a/e*100;d.style.width=`${o}%`,f.style.left=`${o}%`,p.style.left=`${o}%`,f.setAttribute(`aria-valuenow`,a),h.textContent=r(a),m.textContent=i(a),v()}function _(e){let t=u.getBoundingClientRect();return((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width}f.addEventListener(`mousedown`,e=>{o=!0,f.classList.add(`dragging`),p.style.display=`block`,e.preventDefault()}),f.addEventListener(`touchstart`,e=>{o=!0,f.classList.add(`dragging`),p.style.display=`block`,e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{o&&g(_(e))}),document.addEventListener(`touchmove`,e=>{o&&(g(_(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{o&&(o=!1,f.classList.remove(`dragging`),p.style.display=`none`)}),document.addEventListener(`touchend`,()=>{o&&(o=!1,f.classList.remove(`dragging`),p.style.display=`none`)}),u.addEventListener(`click`,e=>{e.target!==f&&g(_(e))}),f.addEventListener(`mouseenter`,()=>p.style.display=`block`),f.addEventListener(`mouseleave`,()=>{o||(p.style.display=`none`)}),f.addEventListener(`keydown`,t=>{let n=1/e,r=a/e;t.key===`ArrowRight`&&(g(r+n),t.preventDefault()),t.key===`End`&&(g(1),t.preventDefault())});function v(){t.forEach((e,n)=>{let r=document.getElementById(`card-${e.id}`);if(!r)return;let i=r.querySelector(`.card-badge`),o=r.querySelector(`.card-bar`),s=n===0?0:t[n-1].minute;if(a>=e.minute)i.textContent=`已解锁`,i.className=`card-badge unlocked`,o.style.width=`100%`,r.classList.add(`card-active`);else if(a>s){let t=Math.round((a-s)/(e.minute-s)*100);i.textContent=`${t}%`,i.className=`card-badge in-progress`,o.style.width=`${t}%`,r.classList.add(`card-active`)}else i.textContent=`锁定`,i.className=`card-badge`,o.style.width=`0%`,r.classList.remove(`card-active`)})}g(0);