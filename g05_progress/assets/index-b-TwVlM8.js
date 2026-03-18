(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=7,t=120,n=e*t,r=2400,i=[{id:1,label:`章节 1`,start:0,end:5,color:`#10b981`},{id:2,label:`章节 2`,start:5,end:25,color:`#f59e0b`},{id:3,label:`章节 3`,start:25,end:60,color:`#ef4444`},{id:4,label:`章节 4`,start:60,end:120,color:`#a855f7`},{id:5,label:`章节 5`,start:120,end:240,color:`#ec4899`},{id:6,label:`章节 6`,start:240,end:420,color:`#14b8a6`},{id:7,label:`章节 7`,start:420,end:720,color:`#f97316`},{id:8,label:`章节 8`,start:720,end:1200,color:`#06b6d4`},{id:9,label:`章节 9`,start:1200,end:1980,color:`#84cc16`},{id:10,label:`章节 10`,start:1980,end:2400,color:`#e11d48`,partial:!0}],a=60,o=`#a78bfa`,s=[{id:`town_hall`,name:`市政厅`,unlockAt:0,unlockLabel:`初始`},{id:`med_hall`,name:`医馆`,unlockAt:0,unlockLabel:`初始`},{id:`barracks`,name:`兵营`,unlockAt:0,unlockLabel:`初始`},{id:`weapon_shop`,name:`武器店`,unlockAt:2,unlockLabel:`2 分钟`},{id:`foundry`,name:`燔铸所`,unlockAt:2,unlockLabel:`2 分钟`},{id:`armor_shop`,name:`护甲店`,unlockAt:5,unlockLabel:`第 2 章`},{id:`tannery`,name:`製皮厂`,unlockAt:5,unlockLabel:`第 2 章`},{id:`temple`,name:`祝福圣殿`,unlockAt:25,unlockLabel:`第 3 章`},{id:`crystal`,name:`晶石矿场`,unlockAt:25,unlockLabel:`第 3 章`}];function c(e,t,n){return Math.max(t,Math.min(n,e))}function l(e){if(e<=0)return`未开始`;if(e<60)return`${e} 分钟`;let t=Math.floor(e/60),n=e%60;return n===0?`${t} 小时`:`${t}h ${n}m`}function u(e){return e===0?`立即`:l(e)}var d=0,f=!1;function p(e){return Array.from({length:e},(t,n)=>`<div class="seg-tick" style="left:${((n+1)/(e+1)*100).toFixed(3)}%"></div>`).join(``)}document.getElementById(`app`).innerHTML=`
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
              ${p(23)}
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

      <!-- Chapter cards -->
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3 mt-8" id="chapter-cards"></div>
    </section>

    <!-- ── Building unlock rows ── -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.3s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-6 font-semibold">建筑解锁与升级</p>
      <div id="building-rows" class="grid grid-cols-5 md:grid-cols-10 gap-3"></div>
    </section>

  </div>
`;var m=document.getElementById(`chapter-cards`);i.forEach(e=>{let t=document.createElement(`div`);t.id=`card-${e.id}`,t.className=`ch-card glass rounded-xl p-4 ch-locked`,t.style.setProperty(`--ch-color`,e.color),t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold ch-title">${e.label}</span>
      <span class="ch-badge" id="chbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${u(e.start)}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="chbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${e.color};"></div>
    </div>
  `,m.appendChild(t)});var h=document.getElementById(`overlay`),g=document.getElementById(`handle`),_=document.getElementById(`tooltip`),v=document.getElementById(`tooltip-text`),y=document.getElementById(`time-display`);function b(r){if(r=c(r,0,1),d=Math.round(r*n),g.style.left=`${r*100}%`,_.style.left=`${r*100}%`,g.setAttribute(`aria-valuenow`,d),d===0)y.textContent=`未开始`;else{let e=Math.floor(d/t)+1,n=d%t;y.textContent=n===0?`第 ${Math.floor(d/t)} 天`:`第 ${e} 天 · ${l(n)}`}v.textContent=l(d);for(let n=0;n<e;n++){let e=n*t,r=(n+1)*t,i=0;d>=r?i=100:d>e&&(i=(d-e)/t*100),document.getElementById(`segfill-${n}`).style.width=`${i}%`}S(),w()}function x(e){let t=h.getBoundingClientRect();return c(((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width,0,1)}h.addEventListener(`mousedown`,e=>{f=!0,g.classList.add(`dragging`),_.style.display=`block`,b(x(e)),e.preventDefault()}),h.addEventListener(`touchstart`,e=>{f=!0,g.classList.add(`dragging`),_.style.display=`block`,b(x(e)),e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{f&&b(x(e))}),document.addEventListener(`touchmove`,e=>{f&&(b(x(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{f&&(f=!1,g.classList.remove(`dragging`),_.style.display=`none`)}),document.addEventListener(`touchend`,()=>{f&&(f=!1,g.classList.remove(`dragging`),_.style.display=`none`)}),g.addEventListener(`mouseenter`,()=>_.style.display=`block`),g.addEventListener(`mouseleave`,()=>{f||(_.style.display=`none`)}),g.addEventListener(`keydown`,e=>{let t=1/n,r=d/n;e.key===`ArrowRight`&&(b(r+t),e.preventDefault()),e.key===`ArrowLeft`&&(b(r-t),e.preventDefault()),e.key===`Home`&&(b(0),e.preventDefault()),e.key===`End`&&(b(1),e.preventDefault())});function S(){i.forEach(e=>{let t=e.end-e.start,n=document.getElementById(`chfill-${e.id}`),r=document.getElementById(`chbadge-${e.id}`),i=document.getElementById(`chbar-${e.id}`),a=document.getElementById(`card-${e.id}`);if(d<e.start)n.style.width=`0%`,i.style.width=`0%`,r.textContent=`🔒`,r.style.color=``,a.querySelector(`.ch-title`).style.color=``,a.classList.add(`ch-locked`),a.classList.remove(`ch-card-active`);else if(d>=e.end)n.style.width=`100%`,i.style.width=`100%`,r.textContent=`完成 ✓`,r.style.color=e.color,a.querySelector(`.ch-title`).style.color=e.color,a.classList.remove(`ch-locked`),a.classList.add(`ch-card-active`);else{let o=Math.round((d-e.start)/t*100);n.style.width=`${o}%`,i.style.width=`${o}%`,r.textContent=`已完成 ${o}%`,r.style.color=e.color,a.querySelector(`.ch-title`).style.color=e.color,a.classList.remove(`ch-locked`),a.classList.add(`ch-card-active`)}})}var C=document.getElementById(`building-rows`);s.forEach(e=>{let t=document.createElement(`div`);t.id=`brow-${e.id}`,t.className=`bldg-card glass rounded-xl p-4 bldg-locked`,t.style.borderColor=`${o}20`,t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm bldg-name">${e.name}</span>
      <span class="bldg-badge" id="bbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${e.unlockLabel}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="bbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${o};"></div>
    </div>
  `,C.appendChild(t)});function w(){let e=i.filter(e=>d>=e.start).length;s.forEach(t=>{let n=document.getElementById(`bbadge-${t.id}`),r=document.getElementById(`bbar-${t.id}`),s=document.getElementById(`brow-${t.id}`),c=s.querySelector(`.bldg-name`);if(d<t.unlockAt){s.classList.add(`bldg-locked`),s.classList.remove(`bldg-active`),n.textContent=`🔒`,c.style.color=``,r.style.width=`0%`;return}if(s.classList.remove(`bldg-locked`),s.classList.add(`bldg-active`),c.style.color=o,t.id===`town_hall`)n.textContent=`Lv.${e}`,n.style.color=o,r.style.width=`${Math.round(e/i.length*100)}%`;else{let i=d-t.unlockAt,s=Math.floor(i/a)+1,c=e*10,l=Math.min(s,c);n.textContent=`Lv.${l}/${c}`,n.style.color=o,r.style.width=c>0?`${Math.round(l/c*100)}%`:`0%`}})}b(0);