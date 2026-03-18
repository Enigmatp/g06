(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=7,t=120,n=e*t,r=1440,i=[{id:1,label:`章节 1`,start:0,end:5,color:`#10b981`},{id:2,label:`章节 2`,start:5,end:25,color:`#f59e0b`},{id:3,label:`章节 3`,start:25,end:60,color:`#ef4444`},{id:4,label:`章节 4`,start:60,end:120,color:`#a855f7`},{id:5,label:`章节 5`,start:120,end:180,color:`#ec4899`},{id:6,label:`章节 6`,start:180,end:300,color:`#14b8a6`},{id:7,label:`章节 7`,start:300,end:480,color:`#f97316`},{id:8,label:`章节 8`,start:480,end:780,color:`#06b6d4`},{id:9,label:`章节 9`,start:780,end:1260,color:`#84cc16`},{id:10,label:`章节 10`,start:1260,end:1440,color:`#e11d48`,partial:!0}];function a(e,t,n){return Math.max(t,Math.min(n,e))}function o(e){if(e<=0)return`未开始`;if(e<60)return`${e} 分钟`;let t=Math.floor(e/60),n=e%60;return n===0?`${t} 小时`:`${t}h ${n}m`}function s(e){return e===0?`立即`:o(e)}var c=0,l=!1;function u(e){return Array.from({length:e},(t,n)=>`<div class="seg-tick" style="left:${((n+1)/(e+1)*100).toFixed(3)}%"></div>`).join(``)}document.getElementById(`app`).innerHTML=`
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
          ${Array.from({length:e},(e,t)=>`
            <div class="seg" id="seg-${t}">
              <div class="seg-fill" id="segfill-${t}" style="width:0%"></div>
              ${u(23)}
            </div>`).join(``)}
          <div class="seg-overlay" id="overlay"></div>
          <div class="seg-handle" id="handle" style="left:0%" role="slider" tabindex="0"
               aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="0"></div>
        </div>

        <!-- Day axis -->
        <div class="relative mt-3 day-axis">
          ${Array.from({length:e},(t,n)=>{let r=((n+1)/e*100).toFixed(2),i=(n+1)*2;return`<div class="axis-label" style="left:${r}%">
              <span class="axis-main">第 ${n+1} 天</span>
              <span class="axis-sub">${i}h · ${(n+1)*120} min</span>
            </div>`}).join(``)}
        </div>
      </div>
    </section>

    <!-- ── Chapter row (proportional, driven by main bar) ── -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">

      <p class="text-white/30 text-sm uppercase tracking-widest mb-6 font-semibold">章节解锁进度</p>

      <!-- Proportional chapter display bar -->
      <div class="chapter-disp-track">
        ${i.map(e=>`
            <div class="ch-disp-seg" style="width:${((e.end-e.start)/r*100).toFixed(4)}%;border-color:${e.color}30;"
                 title="${e.label}">
              <div class="ch-disp-fill" id="chfill-${e.id}"
                   style="width:0%;background:${e.color};"></div>
            </div>`).join(``)}
      </div>

      <!-- Chapter axis labels -->
      <div class="relative mt-3 chapter-axis-row">
        ${i.map(e=>`<div class="axis-label" style="left:${(e.start/r*100).toFixed(4)}%">
            <span class="axis-main" style="color:${e.color}">${e.label}</span>
            <span class="axis-sub">${s(e.start)}${e.partial?` 🔓`:``}</span>
          </div>`).join(``)}
      </div>

      <!-- Chapter cards -->
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3 mt-8" id="chapter-cards"></div>
    </section>
  </div>
`;var d=document.getElementById(`chapter-cards`);i.forEach(e=>{let t=document.createElement(`div`);t.id=`card-${e.id}`,t.className=`ch-card glass rounded-xl p-4`,t.style.setProperty(`--ch-color`,e.color),t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold" style="color:${e.color}">${e.label}</span>
      <span class="ch-badge" id="chbadge-${e.id}">锁定</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${s(e.start)}${e.partial?`<br><span class="text-xs opacity-60">部分解锁</span>`:``}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="chbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${e.color};"></div>
    </div>
  `,d.appendChild(t)});var f=document.getElementById(`overlay`),p=document.getElementById(`handle`),m=document.getElementById(`tooltip`),h=document.getElementById(`tooltip-text`),g=document.getElementById(`time-display`);function _(r){if(r=a(r,0,1),c=Math.round(r*n),p.style.left=`${r*100}%`,m.style.left=`${r*100}%`,p.setAttribute(`aria-valuenow`,c),c===0)g.textContent=`未开始`;else{let e=Math.floor(c/t)+1,n=c%t;g.textContent=n===0?`第 ${Math.floor(c/t)} 天`:`第 ${e} 天 · ${o(n)}`}h.textContent=o(c);for(let n=0;n<e;n++){let e=n*t,r=(n+1)*t,i=0;c>=r?i=100:c>e&&(i=(c-e)/t*100),document.getElementById(`segfill-${n}`).style.width=`${i}%`}y()}function v(e){let t=f.getBoundingClientRect();return a(((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width,0,1)}f.addEventListener(`mousedown`,e=>{l=!0,p.classList.add(`dragging`),m.style.display=`block`,_(v(e)),e.preventDefault()}),f.addEventListener(`touchstart`,e=>{l=!0,p.classList.add(`dragging`),m.style.display=`block`,_(v(e)),e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{l&&_(v(e))}),document.addEventListener(`touchmove`,e=>{l&&(_(v(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{l&&(l=!1,p.classList.remove(`dragging`),m.style.display=`none`)}),document.addEventListener(`touchend`,()=>{l&&(l=!1,p.classList.remove(`dragging`),m.style.display=`none`)}),p.addEventListener(`mouseenter`,()=>m.style.display=`block`),p.addEventListener(`mouseleave`,()=>{l||(m.style.display=`none`)}),p.addEventListener(`keydown`,e=>{let t=1/n,r=c/n;e.key===`ArrowRight`&&(_(r+t),e.preventDefault()),e.key===`ArrowLeft`&&(_(r-t),e.preventDefault()),e.key===`Home`&&(_(0),e.preventDefault()),e.key===`End`&&(_(1),e.preventDefault())});function y(){i.forEach(e=>{let t=e.end-e.start,n=document.getElementById(`chfill-${e.id}`),r=document.getElementById(`chbadge-${e.id}`),i=document.getElementById(`chbar-${e.id}`),a=document.getElementById(`card-${e.id}`);if(c<e.start)n.style.width=`0%`,i.style.width=`0%`,r.textContent=`锁定`,r.style.color=`rgba(255,255,255,0.3)`,a.classList.remove(`ch-card-active`);else if(c>=e.end)n.style.width=`100%`,i.style.width=`100%`,r.textContent=e.partial?`部分解锁`:`完成 ✓`,r.style.color=e.color,a.classList.add(`ch-card-active`);else{let o=Math.round((c-e.start)/t*100);n.style.width=`${o}%`,i.style.width=`${o}%`,r.textContent=`已解锁 ${o}%`,r.style.color=e.color,a.classList.add(`ch-card-active`)}})}_(0);