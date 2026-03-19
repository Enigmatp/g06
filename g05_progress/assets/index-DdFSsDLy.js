(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=3,t=60,n=e*t,r=1200,i=[{id:1,label:`章节 1`,start:0,end:5,color:`#10b981`},{id:2,label:`章节 2`,start:5,end:15,color:`#f59e0b`},{id:3,label:`章节 3`,start:15,end:30,color:`#ef4444`},{id:4,label:`章节 4`,start:30,end:55,color:`#a855f7`},{id:5,label:`章节 5`,start:55,end:95,color:`#ec4899`},{id:6,label:`章节 6`,start:95,end:160,color:`#14b8a6`},{id:7,label:`章节 7`,start:160,end:265,color:`#f97316`},{id:8,label:`章节 8`,start:265,end:435,color:`#06b6d4`},{id:9,label:`章节 9`,start:435,end:710,color:`#84cc16`},{id:10,label:`章节 10`,start:710,end:1155,color:`#e11d48`,partial:!0}],a=`#a78bfa`,o=`#f59e0b`,s=`#22d3ee`,c=[{id:`town_hall`,name:`市政厅`,unlockAt:0,unlockLabel:`初始`},{id:`med_hall`,name:`医馆`,unlockAt:0,unlockLabel:`初始`},{id:`barracks`,name:`兵营`,unlockAt:0,unlockLabel:`初始`,noLevel:!0},{id:`weapon_shop`,name:`武器店`,unlockAt:50/60,unlockLabel:`关卡1-1（第1章）`,noLevel:!0},{id:`foundry`,name:`熔铸所`,unlockAt:150/60,unlockLabel:`关卡1-3（第1章）`},{id:`armor_shop`,name:`护甲店`,unlockAt:5,unlockLabel:`关卡2-1（第2章）`,noLevel:!0},{id:`tannery`,name:`製皮厂`,unlockAt:5,unlockLabel:`关卡2-1（第2章）`},{id:`temple`,name:`祝福圣殿`,unlockAt:15,unlockLabel:`关卡3-1（第3章）`,noLevel:!0},{id:`crystal`,name:`晶石矿场`,unlockAt:15,unlockLabel:`关卡3-1（第3章）`}],l=`#fbbf24`,u=[{id:`tasks`,name:`任务`,unlockAt:0,unlockLabel:`初始`},{id:`afk`,name:`挂机奖励`,unlockAt:250/60,unlockLabel:`关卡1-5（第1章）`},{id:`heroes`,name:`英雄`,unlockAt:5,unlockLabel:`关卡2-1（第2章）`},{id:`summon`,name:`召唤`,unlockAt:15,unlockLabel:`关卡3-1（第3章）`},{id:`raid`,name:`挑战-远征`,unlockAt:30,unlockLabel:`关卡4-1（第4章）`,optional:!0}];function d(e,t,n){return Math.max(t,Math.min(n,e))}function f(e){if(e<=0)return`未开始`;if(e<1)return`${Math.round(e*60)} 秒`;if(e<60){let t=Math.floor(e),n=Math.round((e-t)*60);return n>0?`${t} 分 ${n} 秒`:`${t} 分钟`}let t=Math.floor(e/60),n=Math.floor(e%60);return n===0?`${t} 小时`:`${t}h ${n}m`}function p(e){return e===0?`立即`:f(e)}var m=0,h=!1;function g(e){return Array.from({length:e},(t,n)=>`<div class="seg-tick" style="left:${((n+1)/(e+1)*100).toFixed(3)}%"></div>`).join(``)}document.getElementById(`app`).innerHTML=`
  <div class="blob" style="width:520px;height:520px;top:-120px;left:-80px;background:rgba(61,90,254,0.15);"></div>
  <div class="blob" style="width:420px;height:420px;bottom:-100px;right:-60px;background:rgba(168,85,247,0.12);"></div>

  <div class="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 py-4 gap-4">

    <!-- Header -->
    <header class="text-center animate-fade-up">
      <h1 class="font-display font-bold text-5xl md:text-6xl text-shimmer">G05 v0.2.0 游戏进度</h1>
    </header>

    <!-- Tab nav -->
    <nav class="tab-nav animate-fade-up" style="animation-delay:0.05s">
      <button class="tab-btn tab-active" onclick="switchTab('overview')" id="tab-btn-overview">总览</button>
      <button class="tab-btn" onclick="switchTab('buildings')" id="tab-btn-buildings">建筑</button>
    </nav>

    <!-- ── OVERVIEW TAB ── -->
    <div id="tab-overview" style="display:flex;flex-direction:column;gap:1.5rem;width:100%;align-items:center">

    <!-- ── Main bar ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.1s">

      <div class="flex items-end justify-between mb-5 gap-6">
        <div>
          <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总进度</p>
          <div id="time-display" class="font-display font-bold text-3xl text-white">未开始</div>
        </div>
        <div class="flex gap-4 items-end">
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">当前（分钟）</p>
            <input type="number" id="input-current" value="0" min="0" class="config-input" style="width:7rem">
          </div>
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">总时长（天）</p>
            <input type="number" id="input-days" value="3" min="1" max="60" class="config-input">
          </div>
          <div class="text-center">
            <p class="text-white/40 text-xs uppercase tracking-widest mb-1">每日时长（分）</p>
            <input type="number" id="input-mpd" value="60" min="1" max="480" class="config-input">
          </div>
        </div>
      </div>

      <!-- Segmented bar -->
      <div class="relative" id="bar-root">
        <div id="tooltip" class="time-tooltip" style="display:none;left:0%">
          <span id="tooltip-text">未开始</span>
        </div>

        <div class="seg-track" id="track">
          <div id="seg-container" style="display:contents"></div>
          <div class="seg-overlay" id="overlay"></div>
          <div class="seg-handle" id="handle" style="left:0%" role="slider" tabindex="0"
               aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="0"></div>
        </div>

        <!-- Day axis -->
        <div class="relative mt-3 day-axis" id="axis-container"></div>
      </div>
    </section>

    <!-- ── Chapter row ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.2s">

      <p class="text-white/30 text-sm uppercase tracking-widest mb-1 font-semibold">章节解锁进度</p>
      <p class="text-white/20 text-xs mb-4">每关 5 波&emsp;·&emsp;每波 10 秒</p>

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
      <div class="grid grid-cols-5 md:grid-cols-10 gap-3 mt-4" id="chapter-cards"></div>
    </section>

    <!-- ── Building unlock rows ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.3s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">建筑解锁与升级</p>
      <div id="building-rows" class="grid grid-cols-5 md:grid-cols-10 gap-3"></div>
    </section>

    <!-- ── Feature unlock ── -->
    <section class="glass rounded-2xl p-5 w-full animate-fade-up" style="max-width:128rem;animation-delay:0.4s">
      <p class="text-white/30 text-sm uppercase tracking-widest mb-4 font-semibold">功能解锁</p>
      <div id="feature-cards" class="grid grid-cols-5 md:grid-cols-10 gap-3"></div>
    </section>

    </div><!-- /tab-overview -->

    <!-- ── BUILDINGS TAB ── -->
    <div id="tab-buildings" style="display:none;flex-direction:column;gap:1.5rem;width:100%;align-items:center">
      <section class="glass rounded-2xl p-5 w-full" style="max-width:128rem">
        <p class="text-white/30 text-sm uppercase tracking-widest mb-1 font-semibold">建筑升级详情</p>
        <p class="text-white/20 text-xs mb-6">市政厅等级 = 已解锁章节数&emsp;·&emsp;其他建筑每章节 +10 级&emsp;·&emsp;无等级建筑仅显示解锁状态</p>
        <div id="bldg-detail-list" class="flex flex-col gap-4"></div>
      </section>
    </div><!-- /tab-buildings -->

  </div>
`;var _=document.getElementById(`chapter-cards`);i.forEach(e=>{let t=document.createElement(`div`);t.id=`card-${e.id}`,t.className=`ch-card glass rounded-xl p-4 ch-locked`,t.style.setProperty(`--ch-color`,e.color),t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-bold ch-title">${e.label}</span>
      <span class="ch-badge" id="chbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-1">${p(e.start)}</p>
    <p class="text-xs font-mono mb-2 ch-stage" id="chstage-${e.id}"></p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="chbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${e.color};"></div>
    </div>
  `,_.appendChild(t)});var v=document.getElementById(`overlay`),y=document.getElementById(`handle`),b=document.getElementById(`tooltip`),x=document.getElementById(`tooltip-text`),S=document.getElementById(`time-display`);function C(r){r=d(r,0,1);let i=1/6;if(m=Math.round(r*n/i)*i,m=d(m,0,n),y.style.left=`${r*100}%`,b.style.left=`${r*100}%`,y.setAttribute(`aria-valuenow`,m),m===0)S.textContent=`未开始`;else{let e=Math.floor(m/t)+1,n=m%t;S.textContent=n===0?`第 ${Math.floor(m/t)} 天`:`第 ${e} 天 · ${f(n)}`}x.textContent=f(m);let a=document.getElementById(`input-current`);a&&document.activeElement!==a&&(a.value=Number(m.toFixed(2)));for(let n=0;n<e;n++){let e=n*t,r=(n+1)*t,i=0;m>=r?i=100:m>e&&(i=(m-e)/t*100),document.getElementById(`segfill-${n}`).style.width=`${i}%`}T(),O(),A(),P()}function w(e){let t=v.getBoundingClientRect();return d(((e.touches?e.touches[0].clientX:e.clientX)-t.left)/t.width,0,1)}v.addEventListener(`mousedown`,e=>{h=!0,y.classList.add(`dragging`),b.style.display=`block`,C(w(e)),e.preventDefault()}),v.addEventListener(`touchstart`,e=>{h=!0,y.classList.add(`dragging`),b.style.display=`block`,C(w(e)),e.preventDefault()},{passive:!1}),document.addEventListener(`mousemove`,e=>{h&&C(w(e))}),document.addEventListener(`touchmove`,e=>{h&&(C(w(e)),e.preventDefault())},{passive:!1}),document.addEventListener(`mouseup`,()=>{h&&(h=!1,y.classList.remove(`dragging`),b.style.display=`none`)}),document.addEventListener(`touchend`,()=>{h&&(h=!1,y.classList.remove(`dragging`),b.style.display=`none`)}),y.addEventListener(`mouseenter`,()=>b.style.display=`block`),y.addEventListener(`mouseleave`,()=>{h||(b.style.display=`none`)}),y.addEventListener(`keydown`,e=>{let t=1/n,r=m/n;e.key===`ArrowRight`&&(C(r+t),e.preventDefault()),e.key===`ArrowLeft`&&(C(r-t),e.preventDefault()),e.key===`Home`&&(C(0),e.preventDefault()),e.key===`End`&&(C(1),e.preventDefault())});function T(){i.forEach(e=>{let t=e.end-e.start,n=document.getElementById(`chfill-${e.id}`),r=document.getElementById(`chbadge-${e.id}`),i=document.getElementById(`chbar-${e.id}`),a=document.getElementById(`card-${e.id}`),o=document.getElementById(`chstage-${e.id}`),s=a.querySelector(`.ch-title`),c=t=>{let n=Math.floor(Math.max(0,t)/10),r=Math.floor(n/5)+1,i=n%5+1;return`关卡：${e.id}-${r}（第${i}波）`};if(m<e.start)n.style.width=`0%`,i.style.width=`0%`,r.textContent=`🔒`,r.style.color=``,s.style.color=``,o.textContent=``,o.style.color=``,a.classList.add(`ch-locked`),a.classList.remove(`ch-card-active`);else if(m>=e.end)n.style.width=`100%`,i.style.width=`100%`,r.textContent=`完成 ✓`,r.style.color=e.color,s.style.color=e.color,o.textContent=c((e.end-e.start)*60-10),o.style.color=e.color,a.classList.remove(`ch-locked`),a.classList.add(`ch-card-active`);else{let l=Math.round((m-e.start)/t*100),u=(m-e.start)*60;n.style.width=`${l}%`,i.style.width=`${l}%`,r.textContent=`已完成 ${l}%`,r.style.color=e.color,s.style.color=e.color,o.textContent=c(u),o.style.color=e.color,a.classList.remove(`ch-locked`),a.classList.add(`ch-card-active`)}})}var E=document.getElementById(`building-rows`);c.forEach(e=>{let t=e.id===`town_hall`?o:e.noLevel?s:a,n=document.createElement(`div`);n.id=`brow-${e.id}`,n.className=`bldg-card glass rounded-xl p-4 bldg-locked`,n.style.borderColor=`${t}20`,n.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm bldg-name">${e.name}</span>
      <span class="bldg-badge" id="bbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs mb-3">${e.unlockLabel}</p>
    <div class="h-1 rounded-full bg-white/5 overflow-hidden">
      <div id="bbar-${e.id}" class="h-full rounded-full transition-all duration-300"
           style="width:0%;background:${t};"></div>
    </div>
  `,E.appendChild(n)});function D(){let e=i.filter(e=>m>=e.start).length-1,t=i[e],n=t.end-t.start,r=n>0?Math.min((m-t.start)/n,1):1;return Math.floor(e*10+r*10)}function O(){let e=i.filter(e=>m>=e.start).length,t=D();c.forEach(n=>{let r=document.getElementById(`bbadge-${n.id}`),c=document.getElementById(`bbar-${n.id}`),l=document.getElementById(`brow-${n.id}`),u=l.querySelector(`.bldg-name`),d=n.id===`town_hall`?o:n.noLevel?s:a;if(m<n.unlockAt){l.classList.add(`bldg-locked`),l.classList.remove(`bldg-active`),r.textContent=`🔒`,r.style.color=``,u.style.color=``,c.style.width=`0%`;return}if(l.classList.remove(`bldg-locked`),l.classList.add(`bldg-active`),u.style.color=d,c.style.background=d,n.noLevel)r.textContent=`✔`,r.style.color=d,c.style.width=`100%`;else if(n.id===`town_hall`)r.textContent=`Lv.${e}`,r.style.color=d,c.style.width=`${Math.round(e/i.length*100)}%`;else{let n=e*10,i=Math.min(Math.max(1,t),n);r.textContent=`Lv.${i}/${n}`,r.style.color=d,c.style.width=n>0?`${Math.round(i/n*100)}%`:`0%`}})}var k=document.getElementById(`feature-cards`);u.forEach(e=>{let t=document.createElement(`div`);t.id=`frow-${e.id}`,t.className=`feat-card glass rounded-xl p-4 ch-locked`,t.style.borderColor=`${l}20`,t.innerHTML=`
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-sm feat-title">${e.name}${e.optional?` <span class="feat-optional">(可选)</span>`:``}</span>
      <span class="feat-badge" id="fbadge-${e.id}">🔒</span>
    </div>
    <p class="text-white/30 text-xs">${e.unlockLabel}</p>
  `,k.appendChild(t)});function A(){u.forEach(e=>{let t=document.getElementById(`fbadge-${e.id}`),n=document.getElementById(`frow-${e.id}`),r=n.querySelector(`.feat-title`);if(m<e.unlockAt)n.classList.add(`ch-locked`),t.textContent=`🔒`,r.style.color=``,n.style.borderColor=`${l}15`;else{let i=e.optional?`#4ade80`:l;n.classList.remove(`ch-locked`),t.textContent=`✔`,t.style.color=i,r.style.color=i,n.style.borderColor=`${i}40`}})}function j(){n=e*t,y.setAttribute(`aria-valuemax`,n);let r=document.getElementById(`seg-container`);r.innerHTML=Array.from({length:e},(e,t)=>`
    <div class="seg" id="seg-${t}">
      <div class="seg-fill" id="segfill-${t}" style="width:0%"></div>
      ${g(23)}
    </div>`).join(``);let i=document.getElementById(`axis-container`);i.innerHTML=Array.from({length:e},(n,r)=>{let i=((r+1)/e*100).toFixed(2),a=(r+1)*t/60;return`<div class="axis-label" style="left:${i}%">
      <span class="axis-main">第 ${r+1} 天</span>
      <span class="axis-sub">${a}h · ${(r+1)*t} min</span>
    </div>`}).join(``),C(n>0?d(m/n,0,1):0)}function M(){let r=document.getElementById(`input-days`),i=document.getElementById(`input-mpd`),a=document.getElementById(`input-current`);r.addEventListener(`input`,()=>{let t=parseInt(r.value);!isNaN(t)&&t>=1&&(e=t,j())}),i.addEventListener(`input`,()=>{let e=parseInt(i.value);!isNaN(e)&&e>=1&&(t=e,j())}),a.addEventListener(`input`,()=>{let e=parseFloat(a.value);!isNaN(e)&&e>=0&&C(e/n)})}j(),M(),window.switchTab=function(e){let t=document.getElementById(`tab-overview`),n=document.getElementById(`tab-buildings`);t.style.display=e===`overview`?`flex`:`none`,n.style.display=e===`buildings`?`flex`:`none`,document.querySelectorAll(`.tab-btn`).forEach(e=>e.classList.remove(`tab-active`)),document.getElementById(`tab-btn-${e}`).classList.add(`tab-active`)};var N=document.getElementById(`bldg-detail-list`);c.forEach(e=>{let t=e.id===`town_hall`?o:e.noLevel?s:a,n=e.id===`town_hall`?`市政厅`:e.noLevel?`无等级`:`升级建筑`,r=document.createElement(`div`);r.id=`bdetail-${e.id}`,r.className=`bldg-detail-row glass rounded-xl p-5`,r.style.borderLeft=`4px solid ${t}`,r.innerHTML=`
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p class="font-bold text-base" style="color:${t}">${e.name}
          <span class="text-xs font-normal text-white/30 ml-2">${n}</span>
        </p>
        <p class="text-white/30 text-xs mt-1">解锁：${e.unlockLabel}</p>
      </div>
      <span class="bldg-badge text-base" id="bdetail-badge-${e.id}">🔒</span>
    </div>
    <div class="mt-3" id="bdetail-body-${e.id}"></div>
    <div class="h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
      <div id="bdetail-bar-${e.id}" class="h-full rounded-full transition-all duration-300" style="width:0%;background:${t}"></div>
    </div>
  `,N.appendChild(r)});function P(){if(!document.getElementById(`bdetail-badge-town_hall`))return;let e=i.filter(e=>m>=e.start).length,t=D();c.forEach(n=>{let r=document.getElementById(`bdetail-badge-${n.id}`),c=document.getElementById(`bdetail-body-${n.id}`),l=document.getElementById(`bdetail-bar-${n.id}`),u=n.id===`town_hall`?o:n.noLevel?s:a;if(m<n.unlockAt){r.textContent=`🔒`,r.style.color=``,l.style.width=`0%`,c.innerHTML=`<p class="text-white/25 text-sm">尚未解锁 — ${n.unlockLabel}</p>`;return}if(r.style.color=u,n.noLevel)r.textContent=`✔`,l.style.width=`100%`,c.innerHTML=`<p class="text-sm" style="color:${u}">已解锁，无等级系统</p>`;else if(n.id===`town_hall`){r.textContent=`Lv.${e}`,l.style.width=`${Math.round(e/i.length*100)}%`;let t=i[e];c.innerHTML=`
        <p class="text-sm mb-1" style="color:${u}"><b>当前等级：Lv.${e}</b> / ${i.length}</p>
        <p class="text-white/40 text-xs">等级 = 已解锁章节数</p>
        ${t?`<p class="text-white/30 text-xs mt-1">下次升级：解锁 ${t.label}（${p(t.start)}）</p>`:`<p class="text-white/30 text-xs mt-1">已达最高等级</p>`}
      `}else{let n=e*10,a=Math.min(Math.max(1,t),n);r.textContent=`Lv.${a}/${n}`,l.style.width=n>0?`${Math.round(a/n*100)}%`:`0%`;let o=i[e];c.innerHTML=`
        <p class="text-sm mb-1" style="color:${u}"><b>当前等级：Lv.${a}</b> / ${n}</p>
        <p class="text-white/40 text-xs">上限 = 市政厅 Lv.${e} × 10&emsp;·&emsp;每章节 +10 级</p>
        ${a>=n&&o?`<p class="text-white/30 text-xs mt-1">已达当前上限，等待解锁 ${o.label}（${p(o.start)}）</p>`:``}
      `}})}