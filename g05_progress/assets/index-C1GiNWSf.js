(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=1440,t=[{id:1,label:`章节 1`,start:0,end:5,color:`#10b981`},{id:2,label:`章节 2`,start:5,end:25,color:`#f59e0b`},{id:3,label:`章节 3`,start:25,end:60,color:`#ef4444`},{id:4,label:`章节 4`,start:60,end:120,color:`#a855f7`},{id:5,label:`章节 5`,start:120,end:180,color:`#ec4899`},{id:6,label:`章节 6`,start:180,end:300,color:`#14b8a6`},{id:7,label:`章节 7`,start:300,end:480,color:`#f97316`},{id:8,label:`章节 8`,start:480,end:780,color:`#06b6d4`},{id:9,label:`章节 9`,start:780,end:1260,color:`#84cc16`},{id:10,label:`章节 10`,start:1260,end:1440,color:`#e11d48`,partial:!0}];function n(e,t,n){return Math.max(t,Math.min(n,e))}function r(e){if(e<=0)return`未开始`;if(e<60)return`${e} 分钟`;let t=Math.floor(e/60),n=e%60;return n===0?`${t} 小时`:`${t} 小时 ${n} 分`}function i(e){return e===0?`立即解锁`:r(e)}var a=0,o=!1;function s(e){let t=Math.floor((e-1)/5);return Array.from({length:t},(t,n)=>`<div class="seg-tick" style="left:${((n+1)*5/e*100).toFixed(3)}%"></div>`).join(``)}document.getElementById(`app`).innerHTML=`
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
          ${t.map(t=>{let n=((t.end-t.start)/e*100).toFixed(4),r=t.end-t.start;return`
              <div class="ch-seg" style="width:${n}%;border-color:${t.color}22;"
                   id="ch-${t.id}" title="${t.label}">
                <div class="ch-fill" id="fill-${t.id}"
                     style="width:0%;background:${t.color};"></div>
                ${s(r)}
              </div>`}).join(``)}
          <!-- Drag overlay -->
          <div class="seg-overlay" id="overlay"></div>
          <!-- Handle -->
          <div class="seg-handle" id="handle" style="left:0%"
               role="slider" tabindex="0"
               aria-label="游戏进度" aria-valuemin="0" aria-valuemax="${e}" aria-valuenow="0">
          </div>
        </div>

        <!-- Axis labels -->
        <div class="relative mt-3 chapter-axis" id="axis">
          ${t.map(t=>`
              <div class="axis-label ch-axis-label" style="left:${(t.start/e*100).toFixed(4)}%">
                <span class="axis-main" style="color:${t.color}">${t.label}</span>
                <span class="axis-sub">${i(t.start)}</span>
              </div>`).join(``)}
        </div>
      </div>
    </section>

    <!-- Chapter cards -->
    <section class="w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">章节解锁进度</p>
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3" id="chapter-cards"></div>
    </section>

  </div>
`;var c=document.getElementById(`chapter-cards`);t.forEach(e=>{let t=document.createElement(`div`);t.id=`card-${e.id}`,t.className=`milestone-card glass rounded-xl p-4`,t.style.borderColor=`${e.color}22`,t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold" style="color:${e.color}">${e.label}</span>
      <span class="card-badge" id="badge-${e.id}" style="border-color:${e.color}44">锁定</span>
    </div>
    <p class="text-white/30 text-xs font-mono mb-3">${i(e.start)}${e.partial?` (部分)`:``}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div class="card-bar h-full rounded-full transition-all duration-300"
           id="cbar-${e.id}" style="width:0%;background:${e.color};"></div>
    </div>
  `,c.appendChild(t)});var l=document.getElementById(`overlay`),u=document.getElementById(`handle`),d=document.getElementById(`tooltip`),f=document.getElementById(`tooltip-text`),p=document.getElementById(`time-display`);function m(t){t=n(t,0,1),a=Math.round(t*e),u.style.left=`${t*100}%`,d.style.left=`${t*100}%`,u.setAttribute(`aria-valuenow`,a),p.textContent=r(a),f.textContent=r(a),g()}function h(e){let t=l.getBoundingClientRect();return n(((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width,0,1)}l.addEventListener(`mousedown`,e=>{o=!0,u.classList.add(`dragging`),d.style.display=`block`,m(h(e)),e.preventDefault()}),l.addEventListener(`touchstart`,e=>{o=!0,u.classList.add(`dragging`),d.style.display=`block`,m(h(e)),e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{o&&m(h(e))}),document.addEventListener(`touchmove`,e=>{o&&(m(h(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{o&&(o=!1,u.classList.remove(`dragging`),d.style.display=`none`)}),document.addEventListener(`touchend`,()=>{o&&(o=!1,u.classList.remove(`dragging`),d.style.display=`none`)}),u.addEventListener(`mouseenter`,()=>d.style.display=`block`),u.addEventListener(`mouseleave`,()=>{o||(d.style.display=`none`)}),u.addEventListener(`keydown`,t=>{let n=1/e,r=a/e;t.key===`ArrowRight`&&(m(r+n),t.preventDefault()),t.key===`ArrowLeft`&&(m(r-n),t.preventDefault()),t.key===`Home`&&(m(0),t.preventDefault()),t.key===`End`&&(m(1),t.preventDefault())});function g(){t.forEach(e=>{let t=document.getElementById(`fill-${e.id}`),n=document.getElementById(`badge-${e.id}`),r=document.getElementById(`cbar-${e.id}`),i=document.getElementById(`card-${e.id}`),o=e.end-e.start;if(a<e.start)t.style.width=`0%`,r.style.width=`0%`,n.textContent=`锁定`,n.style.color=`rgba(255,255,255,0.28)`,i.classList.remove(`card-active`);else if(a>=e.end)t.style.width=`100%`,r.style.width=`100%`,n.textContent=e.partial?`部分解锁`:`完成`,n.style.color=e.color,i.classList.add(`card-active`);else{let s=Math.round((a-e.start)/o*100);t.style.width=`${s}%`,r.style.width=`${s}%`,n.textContent=`已解锁 ${s}%`,n.style.color=e.color,i.classList.add(`card-active`)}})}m(0);