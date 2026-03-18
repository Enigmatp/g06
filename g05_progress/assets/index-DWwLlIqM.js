(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=3,t=120,n=e*t,r=2400,i=[{id:1,label:`章节 1`,start:0,end:5,color:`#10b981`},{id:2,label:`章节 2`,start:5,end:25,color:`#f59e0b`},{id:3,label:`章节 3`,start:25,end:60,color:`#ef4444`},{id:4,label:`章节 4`,start:60,end:120,color:`#a855f7`},{id:5,label:`章节 5`,start:120,end:240,color:`#ec4899`},{id:6,label:`章节 6`,start:240,end:420,color:`#14b8a6`},{id:7,label:`章节 7`,start:420,end:720,color:`#f97316`},{id:8,label:`章节 8`,start:720,end:1200,color:`#06b6d4`},{id:9,label:`章节 9`,start:1200,end:1980,color:`#84cc16`},{id:10,label:`章节 10`,start:1980,end:2400,color:`#e11d48`,partial:!0}],a=`#a78bfa`,o=[{id:`town_hall`,name:`市政厅`,unlockAt:0,unlockLabel:`初始`},{id:`med_hall`,name:`医馆`,unlockAt:0,unlockLabel:`初始`},{id:`barracks`,name:`兵营`,unlockAt:0,unlockLabel:`初始`},{id:`weapon_shop`,name:`武器店`,unlockAt:2,unlockLabel:`2 分钟`},{id:`foundry`,name:`燔铸所`,unlockAt:2,unlockLabel:`2 分钟`},{id:`armor_shop`,name:`护甲店`,unlockAt:5,unlockLabel:`第 2 章`},{id:`tannery`,name:`製皮厂`,unlockAt:5,unlockLabel:`第 2 章`},{id:`temple`,name:`祝福圣殿`,unlockAt:25,unlockLabel:`第 3 章`},{id:`crystal`,name:`晶石矿场`,unlockAt:25,unlockLabel:`第 3 章`}],s=`#fbbf24`,c=[{id:`tasks`,name:`任务`,unlockAt:0,unlockLabel:`初始`},{id:`heroes`,name:`英雄`,unlockAt:3,unlockLabel:`3 分钟`},{id:`afk`,name:`挂机奖励`,unlockAt:4,unlockLabel:`4 分钟`},{id:`summon`,name:`召唤`,unlockAt:5,unlockLabel:`第 2 章`},{id:`raid`,name:`挑战-远征`,unlockAt:25,unlockLabel:`第 3 章`,optional:!0}];function l(e,t,n){return Math.max(t,Math.min(n,e))}function u(e){if(e<=0)return`未开始`;if(e<60)return`${e} 分钟`;let t=Math.floor(e/60),n=e%60;return n===0?`${t} 小时`:`${t}h ${n}m`}function d(e){return e===0?`立即`:u(e)}var f=0,p=!1;function m(e){return Array.from({length:e},(t,n)=>`<div class="seg-tick" style="left:${((n+1)/(e+1)*100).toFixed(3)}%"></div>`).join(``)}document.getElementById(`app`).innerHTML=`
  <div class="blob" style="width:520px;height:520px;top:-120px;left:-80px;background:rgba(61,90,254,0.15);"></div>
  <div class="blob" style="width:420px;height:420px;bottom:-100px;right:-60px;background:rgba(168,85,247,0.12);"></div>

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-8">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-5xl md:text-6xl text-shimmer">G05 v0.2.0 游戏进度</h1>
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
          <span class="font-display font-bold text-2xl text-white/50">3 天 · 6 小时</span>
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
              ${m(23)}
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

    <!-- ── Feature unlock ── -->
    <section class="glass rounded-2xl p-10 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.4s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-6 font-semibold">功能解锁</p>
      <div id="feature-cards" class="grid grid-cols-5 md:grid-cols-10 gap-3"></div>
    </section>

  </div>
`;var h=document.getElementById(`chapter-cards`);i.forEach(e=>{let t=document.createElement(`div`);t.id=`card-${e.id}`,t.className=`ch-card glass rounded-xl p-4 ch-locked`,t.style.setProperty(`--ch-color`,e.color),t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold ch-title">${e.label}</span>
      <span class="ch-badge" id="chbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-1">${d(e.start)}</p>
    <p class="text-xs font-mono mb-2 ch-stage" id="chstage-${e.id}"></p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="chbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${e.color};"></div>
    </div>
  `,h.appendChild(t)});var g=document.getElementById(`overlay`),_=document.getElementById(`handle`),v=document.getElementById(`tooltip`),y=document.getElementById(`tooltip-text`),b=document.getElementById(`time-display`);function x(r){if(r=l(r,0,1),f=Math.round(r*n),_.style.left=`${r*100}%`,v.style.left=`${r*100}%`,_.setAttribute(`aria-valuenow`,f),f===0)b.textContent=`未开始`;else{let e=Math.floor(f/t)+1,n=f%t;b.textContent=n===0?`第 ${Math.floor(f/t)} 天`:`第 ${e} 天 · ${u(n)}`}y.textContent=u(f);for(let n=0;n<e;n++){let e=n*t,r=(n+1)*t,i=0;f>=r?i=100:f>e&&(i=(f-e)/t*100),document.getElementById(`segfill-${n}`).style.width=`${i}%`}C(),E(),O()}function S(e){let t=g.getBoundingClientRect();return l(((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width,0,1)}g.addEventListener(`mousedown`,e=>{p=!0,_.classList.add(`dragging`),v.style.display=`block`,x(S(e)),e.preventDefault()}),g.addEventListener(`touchstart`,e=>{p=!0,_.classList.add(`dragging`),v.style.display=`block`,x(S(e)),e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{p&&x(S(e))}),document.addEventListener(`touchmove`,e=>{p&&(x(S(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{p&&(p=!1,_.classList.remove(`dragging`),v.style.display=`none`)}),document.addEventListener(`touchend`,()=>{p&&(p=!1,_.classList.remove(`dragging`),v.style.display=`none`)}),_.addEventListener(`mouseenter`,()=>v.style.display=`block`),_.addEventListener(`mouseleave`,()=>{p||(v.style.display=`none`)}),_.addEventListener(`keydown`,e=>{let t=1/n,r=f/n;e.key===`ArrowRight`&&(x(r+t),e.preventDefault()),e.key===`ArrowLeft`&&(x(r-t),e.preventDefault()),e.key===`Home`&&(x(0),e.preventDefault()),e.key===`End`&&(x(1),e.preventDefault())});function C(){i.forEach(e=>{let t=e.end-e.start,n=document.getElementById(`chfill-${e.id}`),r=document.getElementById(`chbadge-${e.id}`),i=document.getElementById(`chbar-${e.id}`),a=document.getElementById(`card-${e.id}`),o=document.getElementById(`chstage-${e.id}`),s=a.querySelector(`.ch-title`),c=Math.floor((e.end-e.start)*60/10);if(f<e.start)n.style.width=`0%`,i.style.width=`0%`,r.textContent=`🔒`,r.style.color=``,s.style.color=``,o.textContent=``,o.style.color=``,a.classList.add(`ch-locked`),a.classList.remove(`ch-card-active`);else if(f>=e.end)n.style.width=`100%`,i.style.width=`100%`,r.textContent=`完成 ✓`,r.style.color=e.color,s.style.color=e.color,o.textContent=`${e.id}-${c}`,o.style.color=e.color,a.classList.remove(`ch-locked`),a.classList.add(`ch-card-active`);else{let c=Math.round((f-e.start)/t*100),l=Math.max(1,Math.floor((f-e.start)*6));n.style.width=`${c}%`,i.style.width=`${c}%`,r.textContent=`已完成 ${c}%`,r.style.color=e.color,s.style.color=e.color,o.textContent=`${e.id}-${l}`,o.style.color=e.color,a.classList.remove(`ch-locked`),a.classList.add(`ch-card-active`)}})}var w=document.getElementById(`building-rows`);o.forEach(e=>{let t=document.createElement(`div`);t.id=`brow-${e.id}`,t.className=`bldg-card glass rounded-xl p-4 bldg-locked`,t.style.borderColor=`${a}20`,t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm bldg-name">${e.name}</span>
      <span class="bldg-badge" id="bbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${e.unlockLabel}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="bbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${a};"></div>
    </div>
  `,w.appendChild(t)});function T(){let e=i.filter(e=>f>=e.start).length-1,t=i[e],n=t.end-t.start,r=n>0?Math.min((f-t.start)/n,1):1;return Math.floor(e*10+r*10)}function E(){let e=i.filter(e=>f>=e.start).length,t=T();o.forEach(n=>{let r=document.getElementById(`bbadge-${n.id}`),o=document.getElementById(`bbar-${n.id}`),s=document.getElementById(`brow-${n.id}`),c=s.querySelector(`.bldg-name`);if(f<n.unlockAt){s.classList.add(`bldg-locked`),s.classList.remove(`bldg-active`),r.textContent=`🔒`,c.style.color=``,o.style.width=`0%`;return}if(s.classList.remove(`bldg-locked`),s.classList.add(`bldg-active`),c.style.color=a,n.id===`town_hall`)r.textContent=`Lv.${e}`,r.style.color=a,o.style.width=`${Math.round(e/i.length*100)}%`;else{let n=e*10,i=Math.min(t,n);r.textContent=`Lv.${i}/${n}`,r.style.color=a,o.style.width=n>0?`${Math.round(i/n*100)}%`:`0%`}})}var D=document.getElementById(`feature-cards`);c.forEach(e=>{let t=document.createElement(`div`);t.id=`frow-${e.id}`,t.className=`feat-card glass rounded-xl p-4 ch-locked`,t.style.borderColor=`${s}20`,t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm feat-title">${e.name}</span>
      <span class="feat-badge" id="fbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs">${e.unlockLabel}${e.optional?` <span style="color:#4ade80">(可选)</span>`:``}</p>
  `,D.appendChild(t)});function O(){c.forEach(e=>{let t=document.getElementById(`fbadge-${e.id}`),n=document.getElementById(`frow-${e.id}`),r=n.querySelector(`.feat-title`);f<e.unlockAt?(n.classList.add(`ch-locked`),t.textContent=`🔒`,r.style.color=``,n.style.borderColor=`${s}15`):(n.classList.remove(`ch-locked`),t.textContent=`✔`,t.style.color=s,r.style.color=s,n.style.borderColor=`${s}40`)})}x(0);