/* ══════════════════════════════════════════
   宠物变异系统 v5 — 统一品质 + 居中弹窗
   ══════════════════════════════════════════ */

// ─────── 被动技能 & 品质配置 ───────

const PASSIVE_SKILLS = [
  { id:'ps01', name:'烈焰吐息', desc:'攻击附带5%灼烧伤害', icon:'🔥' },
  { id:'ps02', name:'冰霜护盾', desc:'受击15%概率冰冻敌人', icon:'❄️' },
  { id:'ps03', name:'雷电连锁', desc:'攻击弹射2个额外目标', icon:'⚡' },
  { id:'ps04', name:'暗影潜行', desc:'10%概率闪避敌方攻击', icon:'🌑' },
  { id:'ps05', name:'生命汲取', desc:'造成伤害的8%转化为生命', icon:'💚' },
  { id:'ps06', name:'狂暴之力', desc:'HP低于30%时攻击+25%', icon:'💢' },
  { id:'ps07', name:'精准打击', desc:'暴击率永久提升12%', icon:'🎯' },
  { id:'ps08', name:'石化凝视', desc:'5%概率石化目标2秒', icon:'🪨' },
];

const MUTATION_STAGES = [
  { stage:1, starReq:10, petCost:1 },
  { stage:2, starReq:20, petCost:2 },
  { stage:3, starReq:30, petCost:4 },
];

function getPurifyCost(star) { return 100 + star * 20; }

let _uid = 0;
function uid() { return ++_uid; }

// ─────── 统一数据模型（全部15阶S品） ───────

function createPet(cfg) {
  return {
    id: uid(),
    name: cfg.name,
    configId: cfg.configId,
    emoji: cfg.emoji || '🐾',
    attackTag: cfg.attackTag,
    tier: 15,
    passiveSkill: cfg.passiveSkill || null,
    isLocked: cfg.isLocked || false,
    status: cfg.status || 'idle',
    combatPower: cfg.combatPower || Math.floor(Math.random()*5000+3000),
    star: 0,
    mutationLevel: 0,
    slots: [
      { unlocked:false, embeddedPetId:null },
      { unlocked:false, embeddedPetId:null },
      { unlocked:false, embeddedPetId:null },
    ],
  };
}

/** 全部15阶宠物（同名同品质S） */
const allPets = [
  // 烈焰龙王 ×6
  createPet({name:'烈焰龙王',configId:'dragon_fire',emoji:'🐉',attackTag:'弹道',combatPower:7200}),
  createPet({name:'烈焰龙王',configId:'dragon_fire',emoji:'🐉',attackTag:'弹道',combatPower:7100}),
  createPet({name:'烈焰龙王',configId:'dragon_fire',emoji:'🐉',attackTag:'弹道',combatPower:7050}),
  createPet({name:'烈焰龙王',configId:'dragon_fire',emoji:'🐉',attackTag:'弹道',combatPower:6900}),
  createPet({name:'烈焰龙王',configId:'dragon_fire',emoji:'🐉',attackTag:'弹道',combatPower:6800}),
  createPet({name:'烈焰龙王',configId:'dragon_fire',emoji:'🐉',attackTag:'弹道',combatPower:6700,isLocked:true}),

  // 冰霜飞龙 ×3
  createPet({name:'冰霜飞龙',configId:'dragon_ice',emoji:'🐲',attackTag:'弹道',combatPower:6800,passiveSkill:PASSIVE_SKILLS[1]}),
  createPet({name:'冰霜飞龙',configId:'dragon_ice',emoji:'🐲',attackTag:'弹道',combatPower:6600}),
  createPet({name:'冰霜飞龙',configId:'dragon_ice',emoji:'🐲',attackTag:'弹道',combatPower:6500}),

  // 烈焰狮王 ×2
  createPet({name:'烈焰狮王',configId:'lion_fire',emoji:'🦁',attackTag:'近战',combatPower:6500,passiveSkill:PASSIVE_SKILLS[5]}),
  createPet({name:'烈焰狮王',configId:'lion_fire',emoji:'🦁',attackTag:'近战',combatPower:6400}),

  // 暗影飞蛇 ×1
  createPet({name:'暗影飞蛇',configId:'shadow_snake',emoji:'🐍',attackTag:'弹道',combatPower:5100,passiveSkill:PASSIVE_SKILLS[3],status:'battle'}),
  // 钢铁战熊 ×1
  createPet({name:'钢铁战熊',configId:'bear_steel',emoji:'🐻',attackTag:'近战',combatPower:5400,passiveSkill:PASSIVE_SKILLS[0]}),
  // 雷霆蛟龙 ×1
  createPet({name:'雷霆蛟龙',configId:'dragon_thdr',emoji:'🌩️',attackTag:'弹道',combatPower:5500,passiveSkill:PASSIVE_SKILLS[2]}),
  // 深渊魔蛙 ×1
  createPet({name:'深渊魔蛙',configId:'frog_abyss',emoji:'🐸',attackTag:'范围',combatPower:4900,passiveSkill:PASSIVE_SKILLS[4]}),
];

const player = { geneFragments: 12800 };

let currentMainPet = null;

// ─────── 日志 & Toast & 粒子 ───────

const operationLog = [];
function addLog(type, msg) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  operationLog.unshift({ time, type, message:msg });
  renderLog();
}
function renderLog() {
  document.getElementById('log-body').innerHTML = operationLog.map(e =>
    `<div class="log-entry log-${e.type}"><span class="log-time">${e.time}</span>${e.message}</div>`
  ).join('');
}

function showToast(message, type='info', dur=2200) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = message;
  c.appendChild(t);
  setTimeout(()=>t.classList.add('out'), dur-300);
  setTimeout(()=>t.remove(), dur);
}

// ─────── 固定尺寸缩放 ───────
const FRAME_W = 390, FRAME_H = 693;

function scaleFrame() {
  const frame = document.getElementById('app-frame');
  const sw = window.innerWidth / FRAME_W;
  const sh = window.innerHeight / FRAME_H;
  const scale = Math.min(sw, sh);
  frame.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', scaleFrame);
scaleFrame();

// 粒子系统
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [], animId = null;
function resizeCanvas() {
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
}
resizeCanvas();

function spawnParticlesAt(x, y, count=20, color='#fbbf24') {
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2, s=1+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,life:1,decay:.015+Math.random()*.025,size:2+Math.random()*4,color});
  }
  if(!animId) animateP();
}

function spawnParticlesFromEl(el, count=20, color='#fbbf24') {
  const frame = document.getElementById('app-frame');
  const fr = frame.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const scale = fr.width / FRAME_W;
  const x = (er.left - fr.left + er.width/2) / scale;
  const y = (er.top - fr.top + er.height/2) / scale;
  spawnParticlesAt(x, y, count, color);
}

function animateP(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  particles=particles.filter(p=>p.life>0);
  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life-=p.decay;ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  animId = particles.length>0 ? requestAnimationFrame(animateP) : null;
}

function fmt(n){ return n.toLocaleString('en-US'); }

// ─────── 选择页渲染（无品质标记） ───────

function renderSelectPage() {
  document.getElementById('sel-frag-count').textContent = fmt(player.geneFragments);

  const grid = document.getElementById('pet-grid');
  grid.innerHTML = allPets.map(p => {
    let statusHtml = '';
    if (p.status === 'battle') statusHtml = `<div class="pc-status-badge" style="background:rgba(239,68,68,.15);color:#ef4444">出战</div>`;
    else if (p.status === 'embedded') statusHtml = `<div class="pc-status-badge" style="background:rgba(168,85,247,.15);color:#a855f7">镶嵌</div>`;
    else if (p.isLocked) statusHtml = `<div class="pc-status-badge" style="background:rgba(251,191,36,.15);color:#fbbf24">🔒</div>`;

    return `<div class="pet-card" data-pid="${p.id}">
      ${p.star > 0 ? `<div class="pc-star-badge">★${p.star}</div>` : ''}
      <div class="pc-ring"><div class="pc-ring-inner">${p.emoji}</div></div>
      <div class="pc-name">${p.name}</div>
      <div class="pc-mut-dots">
        ${[0,1,2].map(i=>`<div class="pc-mut-dot ${p.mutationLevel>i?'filled':''}"></div>`).join('')}
      </div>
      ${statusHtml}
    </div>`;
  }).join('');

  grid.querySelectorAll('.pet-card').forEach(card => {
    card.addEventListener('click', () => {
      const pid = parseInt(card.dataset.pid);
      const pet = allPets.find(p => p.id === pid);
      if (pet) openDetail(pet);
    });
  });
}

// ─────── 详情弹窗 ───────

function openDetail(pet) {
  currentMainPet = pet;
  document.getElementById('popup-overlay').classList.remove('hidden');

  document.getElementById('popup-emoji').textContent = pet.emoji;
  document.getElementById('popup-pet-name').textContent = pet.name;
  document.getElementById('popup-pet-tag').textContent = pet.attackTag;

  // 重置Tab到提纯
  document.querySelectorAll('#popup-tab-bar .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('#popup-tab-bar .tab-btn[data-tab="purify"]').classList.add('active');
  document.querySelectorAll('#popup-tab-content .tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-purify').classList.add('active');

  renderDetail();
}

function closeDetail() {
  document.getElementById('popup-overlay').classList.add('hidden');
  currentMainPet = null;
  renderSelectPage();
}

function renderDetail() {
  if (!currentMainPet) return;
  const p = currentMainPet;

  // 碎片
  document.getElementById('popup-frag-count').textContent = fmt(player.geneFragments);
  document.getElementById('sel-frag-count').textContent = fmt(player.geneFragments);

  // 锁定按钮
  const lockBtn = document.getElementById('popup-lock-btn');
  lockBtn.textContent = p.isLocked ? '🔒' : '🔓';
  lockBtn.classList.toggle('locked', p.isLocked);

  // 星级
  document.getElementById('popup-star-num').textContent = p.star;
  document.getElementById('popup-attr-pct').textContent = `+${p.star*5}%`;

  // 提纯面板
  document.getElementById('purify-cur-star').textContent = p.star;
  document.getElementById('purify-attr-pct').textContent = `+${p.star*5}%`;
  document.getElementById('purify-cost-num').textContent = fmt(getPurifyCost(p.star));

  const btn = document.getElementById('btn-purify');
  btn.disabled = player.geneFragments < getPurifyCost(p.star);

  // 里程碑节点（星级无上限，只标记是否到达节点）
  document.getElementById('pm-1').classList.toggle('reached', p.star >= 10);
  document.getElementById('pm-2').classList.toggle('reached', p.star >= 20);
  document.getElementById('pm-3').classList.toggle('reached', p.star >= 30);
  document.getElementById('mc-1').classList.toggle('reached', p.star >= 10);
  document.getElementById('mc-2').classList.toggle('reached', p.star >= 20);

  // 突变面板
  renderMutationSingle();

  // 插槽
  renderSlots();
}

// ─────── 突变材料 ───────

function getAutoSelectedMaterials(mainPet, count) {
  const same = allPets.filter(p =>
    p.configId === mainPet.configId &&
    p.id !== mainPet.id &&
    p.tier === 15 &&
    p.status === 'idle' &&
    !p.isLocked
  );
  same.sort((a,b) => a.combatPower - b.combatPower);
  return same.slice(0, count);
}

// ─────── 突变：单阶段展示 ───────

function renderMutationSingle() {
  const p = currentMainPet;
  const el = document.getElementById('mutation-single-stage');

  if (p.mutationLevel >= 3) {
    el.innerHTML = `
      <div class="mut-single completed">
        <div class="mut-single-header">
          <div class="mut-stage-badge done">已完成</div>
          <div class="mut-single-title">基因突变已全部完成</div>
          <div class="mut-single-status">✅</div>
        </div>
        <div class="mut-single-body">
          <div class="mut-all-done">
            <span class="done-icon">🧬</span>
            3个插槽已全部解锁<br>基因提纯可继续升级
          </div>
        </div>
      </div>
      <div class="mut-progress" style="margin-top:8px;justify-content:center">
        <div class="mut-progress-dots">
          <div class="mut-pg-dot filled"></div>
          <div class="mut-pg-dot filled"></div>
          <div class="mut-pg-dot filled"></div>
        </div>
        <span>3/3 阶段完成</span>
      </div>`;
    return;
  }

  const stageIdx = p.mutationLevel;
  const stage = MUTATION_STAGES[stageIdx];
  const starMet = p.star >= stage.starReq;
  const materials = starMet ? getAutoSelectedMaterials(p, stage.petCost) : [];
  const canMutate = starMet && materials.length >= stage.petCost;
  const stageNames = ['一阶','二阶','三阶'];

  const availableSame = allPets.filter(pp => pp.configId === p.configId && pp.id !== p.id && pp.status === 'idle' && !pp.isLocked).length;

  // 材料显示：图标 + 名称 + (数量)
  const materialHtml = starMet ? `
    <div class="mut-material-line">
      <span class="mat-emoji">${p.emoji}</span>
      <span class="mat-name">${p.name}</span>
      <span class="mat-count">(${availableSame}/${stage.petCost})</span>
    </div>` : '';

  el.innerHTML = `
    <div class="mut-progress" style="margin-bottom:8px">
      <div class="mut-progress-dots">
        ${[0,1,2].map(i=>`<div class="mut-pg-dot ${p.mutationLevel>i?'filled':''}"></div>`).join('')}
      </div>
      <span>${p.mutationLevel}/3 阶段完成</span>
    </div>
    <div class="mut-single ${canMutate?'available':''}">
      <div class="mut-single-header">
        <div class="mut-stage-badge">${stageNames[stageIdx]}</div>
        <div class="mut-single-title">${stageNames[stageIdx]}突变 · 解锁插槽${stageIdx+1}</div>
        <div class="mut-single-status">${starMet?'🔓':'🔒'}</div>
      </div>
      <div class="mut-single-body">
        <div class="mut-req">
          <span class="req-label">前置条件</span>
          <span class="req-value ${starMet?'met':'unmet'}">提纯达到 ${stage.starReq}★ (当前 ${p.star}★)</span>
        </div>
        <div class="mut-cost">
          <span class="req-label">突变消耗</span>
          <span class="req-value">${stage.petCost}只 同名宠物</span>
        </div>
        ${materialHtml}
        <button class="action-btn mutate-btn" id="btn-mutate-current" ${canMutate?'':'disabled'}>
          <span class="btn-shine"></span>
          <span class="btn-text">执行突变</span>
        </button>
      </div>
    </div>`;

  const mutBtn = document.getElementById('btn-mutate-current');
  if (mutBtn && canMutate) {
    mutBtn.addEventListener('click', () => doMutation(stageIdx));
  }
}

// ─────── 插槽渲染 ───────

function renderSlots() {
  if (!currentMainPet) return;
  for (let i=0;i<3;i++) {
    const slot = currentMainPet.slots[i];
    const el = document.getElementById(`slot-${i+1}`);
    const lockIcon = el.querySelector('.slot-lock-icon');
    const petEmoji = el.querySelector('.slot-pet-emoji');
    const skillName = el.querySelector('.slot-skill-name');
    el.classList.remove('locked','unlocked','embedded');

    if (!slot.unlocked) {
      el.classList.add('locked');
      lockIcon.style.display=''; lockIcon.textContent='🔒';
      petEmoji.style.display='none'; skillName.textContent='';
    } else if (slot.embeddedPetId) {
      el.classList.add('embedded');
      const pet = allPets.find(p=>p.id===slot.embeddedPetId);
      lockIcon.style.display='none'; petEmoji.style.display='';
      petEmoji.textContent = pet?pet.emoji:'❓';
      skillName.textContent = pet?.passiveSkill?.name||'';
    } else {
      el.classList.add('unlocked');
      lockIcon.style.display=''; lockIcon.textContent='＋';
      petEmoji.style.display='none'; skillName.textContent='';
    }
  }
}

// ─────── 业务逻辑 ───────

function toggleLock() {
  if (!currentMainPet) return;
  currentMainPet.isLocked = !currentMainPet.isLocked;
  const action = currentMainPet.isLocked ? '锁定' : '解锁';
  showToast(`${currentMainPet.name} 已${action}`, 'info');
  addLog('info', `${action} ${currentMainPet.name}`);
  renderDetail();
}

function doPurify() {
  if (!currentMainPet) return false;
  const cost = getPurifyCost(currentMainPet.star);
  if (player.geneFragments < cost) {
    showToast('基因碎片不足！','error');
    document.getElementById('btn-purify').classList.add('shake');
    setTimeout(()=>document.getElementById('btn-purify').classList.remove('shake'),400);
    return false;
  }
  player.geneFragments -= cost;
  currentMainPet.star++;

  spawnParticlesFromEl(document.getElementById('btn-purify'), 15, '#fbbf24');

  document.getElementById('popup-portrait-ring').classList.add('level-up-flash');
  setTimeout(()=>document.getElementById('popup-portrait-ring').classList.remove('level-up-flash'),600);

  if ([10,20,30].includes(currentMainPet.star)) {
    showToast(`🎉 已达到 ${currentMainPet.star}★ 突变节点！`,'success',3000);
  }
  addLog('purify',`${currentMainPet.name} 提纯升星 → ${currentMainPet.star}★ (消耗${cost}碎片)`);
  renderDetail();
  return true;
}

let longPressTimer=null, longPressInterval=null;
function startLongPress(){longPressTimer=setTimeout(()=>{longPressInterval=setInterval(()=>{if(!doPurify())stopLongPress()},80)},400)}
function stopLongPress(){clearTimeout(longPressTimer);clearInterval(longPressInterval);longPressTimer=longPressInterval=null}

function doMutation(stageIdx) {
  if(!currentMainPet) return;
  const stage = MUTATION_STAGES[stageIdx];
  if(currentMainPet.star<stage.starReq){showToast(`需要提纯达到 ${stage.starReq}★`,'error');return}
  if(currentMainPet.mutationLevel!==stageIdx){showToast('请按顺序解锁','error');return}

  const materials = getAutoSelectedMaterials(currentMainPet, stage.petCost);
  if(materials.length<stage.petCost){showToast(`需要 ${stage.petCost} 只同名15阶宠物`,'error');return}

  const overlay = document.getElementById('modal-mutate-overlay');
  const body = document.getElementById('modal-mutate-body');
  const stageNames = ['一','二','三'];
  body.innerHTML = `
    <div class="mutate-confirm-info">
      确认消耗 <strong>${stage.petCost}</strong> 只宠物执行<br>
      <strong style="color:#a855f7">${stageNames[stageIdx]}阶突变</strong>？<br>
      <span style="color:#ef4444;font-size:10px">⚠ 消耗的宠物将被永久销毁</span>
    </div>
    <div class="mutate-confirm-pets">
      ${materials.map(p=>`<div class="mutate-pet-chip"><span>${p.emoji}</span>${p.name}</div>`).join('')}
    </div>`;
  overlay.classList.remove('hidden');

  document.getElementById('modal-mutate-confirm').onclick = () => {
    executeMutation(stageIdx, materials);
    overlay.classList.add('hidden');
  };
}

function executeMutation(stageIdx, materials) {
  for(const m of materials){
    const i = allPets.findIndex(p=>p.id===m.id);
    if(i!==-1) allPets.splice(i,1);
  }
  currentMainPet.mutationLevel = stageIdx+1;
  currentMainPet.slots[stageIdx].unlocked = true;

  const slotEl=document.getElementById(`slot-${stageIdx+1}`);
  slotEl.classList.add('unlock-pulse');
  setTimeout(()=>slotEl.classList.remove('unlock-pulse'),800);
  spawnParticlesAt(canvas.width/2, canvas.height/2, 40, '#a855f7');

  const n=['一','二','三'];
  showToast(`🧬 ${n[stageIdx]}阶突变成功！插槽${stageIdx+1}已解锁`,'success',3000);
  addLog('mutate',`${currentMainPet.name} ${n[stageIdx]}阶突变成功 (消耗${materials.length}只同名宠)`);
  renderDetail();
}

// ─────── 技能镶嵌（改名：选择宠物技能，含技能描述） ───────

let currentSlotIdx = -1;

function openEmbedModal(slotIdx) {
  if(!currentMainPet) return;
  const slot = currentMainPet.slots[slotIdx];
  if(!slot.unlocked){showToast('插槽未解锁','error');return}
  currentSlotIdx = slotIdx;

  document.getElementById('modal-tag-filter').textContent = currentMainPet.attackTag;
  document.getElementById('modal-remove-btn').style.display = slot.embeddedPetId?'':'none';

  const matched = allPets.filter(p =>
    p.attackTag === currentMainPet.attackTag &&
    p.passiveSkill &&
    p.id !== currentMainPet.id
  );

  const embeddedConfigIds = currentMainPet.slots
    .filter((s,i) => i!==slotIdx && s.embeddedPetId)
    .map(s => { const pet=allPets.find(p=>p.id===s.embeddedPetId); return pet?.configId; })
    .filter(Boolean);

  matched.sort((a,b) => b.combatPower - a.combatPower);

  const listEl = document.getElementById('modal-pet-list');
  listEl.innerHTML = matched.map(p => {
    const isBattle = p.status==='battle', isEmb = p.status==='embedded';
    const isDup = embeddedConfigIds.includes(p.configId);
    const isCur = slot.embeddedPetId===p.id;
    const disabled = (isBattle||isEmb||isDup) && !isCur;

    let statusLabel='', statusClass='';
    if(isCur){statusLabel='当前';statusClass='embedded'}
    else if(isBattle){statusLabel='出战中';statusClass='battle'}
    else if(isEmb){statusLabel='已镶嵌';statusClass='embedded'}
    else if(isDup){statusLabel='重复';statusClass='battle'}
    else if(p.isLocked){statusLabel='🔒';statusClass='locked-badge'}
    else{statusLabel='空闲';statusClass='idle'}

    return `<div class="pet-list-item ${disabled?'disabled':''}" ${disabled?'':`onclick="selectEmbedPet(${p.id})"`}>
      <span class="pli-emoji">${p.emoji}</span>
      <div class="pli-info">
        <div class="pli-name">${p.name}</div>
        <div class="pli-skill">${p.passiveSkill.icon} ${p.passiveSkill.name}</div>
        <div class="pli-desc">${p.passiveSkill.desc}</div>
      </div>
      <span class="pli-status ${statusClass}">${statusLabel}</span>
    </div>`;
  }).join('');

  if(!matched.length) listEl.innerHTML='<div style="text-align:center;padding:24px;color:#64748b">暂无匹配宠物技能</div>';

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeEmbedModal(){document.getElementById('modal-overlay').classList.add('hidden');currentSlotIdx=-1}

function selectEmbedPet(petId) {
  if(currentSlotIdx<0||!currentMainPet) return;
  const slot=currentMainPet.slots[currentSlotIdx];
  const pet=allPets.find(p=>p.id===petId);
  if(!pet) return;
  if(pet.status==='battle'){showToast('出战中的宠物无法镶嵌','error');return}
  if(pet.status==='embedded'){showToast('该宠物已被其他插槽镶嵌','error');return}

  const dup=currentMainPet.slots.some((s,i)=>{if(i===currentSlotIdx)return false;if(!s.embeddedPetId)return false;const e=allPets.find(p=>p.id===s.embeddedPetId);return e?.configId===pet.configId});
  if(dup){showToast('同名副宠不可重复镶嵌','error');return}

  if(slot.embeddedPetId){const old=allPets.find(p=>p.id===slot.embeddedPetId);if(old){old.status='idle';addLog('remove',`从插槽${currentSlotIdx+1}卸下 ${old.name}`)}}

  slot.embeddedPetId=petId; pet.status='embedded';
  const slotEl=document.getElementById(`slot-${currentSlotIdx+1}`);
  slotEl.classList.add('unlock-pulse');setTimeout(()=>slotEl.classList.remove('unlock-pulse'),800);
  spawnParticlesFromEl(slotEl, 20, '#60a5fa');

  showToast(`✅ ${pet.passiveSkill?.name||pet.name} 已镶嵌到插槽${currentSlotIdx+1}`,'success');
  addLog('embed',`镶嵌 ${pet.name}(${pet.passiveSkill?.name||''}) → 插槽${currentSlotIdx+1}`);
  closeEmbedModal(); renderDetail();
}

function removeEmbedPet(){
  if(currentSlotIdx<0||!currentMainPet) return;
  const slot=currentMainPet.slots[currentSlotIdx];
  if(!slot.embeddedPetId) return;
  const pet=allPets.find(p=>p.id===slot.embeddedPetId);
  if(pet){pet.status='idle';addLog('remove',`从插槽${currentSlotIdx+1}卸下 ${pet.name}`)}
  slot.embeddedPetId=null;
  showToast('已卸下副宠物','info');
  closeEmbedModal(); renderDetail();
}

// ─────── 事件绑定 ───────

document.addEventListener('DOMContentLoaded', () => {
  scaleFrame();
  renderSelectPage();
  resizeCanvas();

  // 详情弹窗关闭
  document.getElementById('popup-close-btn').addEventListener('click', closeDetail);
  document.getElementById('popup-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('popup-overlay')) closeDetail();
  });

  // 锁定按钮
  document.getElementById('popup-lock-btn').addEventListener('click', toggleLock);

  // Tab切换
  document.querySelectorAll('#popup-tab-bar .tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#popup-tab-bar .tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('#popup-tab-content .tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // 提纯
  const pb = document.getElementById('btn-purify');
  pb.addEventListener('click',()=>{if(!pb.disabled)doPurify()});
  pb.addEventListener('mousedown',()=>{if(!pb.disabled)startLongPress()});
  pb.addEventListener('mouseup',stopLongPress);
  pb.addEventListener('mouseleave',stopLongPress);
  pb.addEventListener('touchstart',(e)=>{if(!pb.disabled){e.preventDefault();doPurify();startLongPress()}},{passive:false});
  pb.addEventListener('touchend',(e)=>{e.preventDefault();stopLongPress()});
  pb.addEventListener('touchcancel',stopLongPress);

  // 插槽
  for(let i=0;i<3;i++) document.getElementById(`slot-${i+1}`).addEventListener('click',()=>openEmbedModal(i));

  // 技能选择弹窗
  document.getElementById('modal-close-btn').addEventListener('click',closeEmbedModal);
  document.getElementById('modal-remove-btn').addEventListener('click',removeEmbedPet);
  document.getElementById('modal-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('modal-overlay'))closeEmbedModal()});

  // 突变确认弹窗
  document.getElementById('modal-mutate-close').addEventListener('click',()=>document.getElementById('modal-mutate-overlay').classList.add('hidden'));
  document.getElementById('modal-mutate-cancel').addEventListener('click',()=>document.getElementById('modal-mutate-overlay').classList.add('hidden'));
  document.getElementById('modal-mutate-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('modal-mutate-overlay'))document.getElementById('modal-mutate-overlay').classList.add('hidden')});

  // 日志
  document.getElementById('log-toggle').addEventListener('click',()=>{document.getElementById('log-panel').classList.remove('log-hidden');document.getElementById('log-backdrop').classList.remove('hidden')});
  document.getElementById('log-close-btn').addEventListener('click',()=>{document.getElementById('log-panel').classList.add('log-hidden');document.getElementById('log-backdrop').classList.add('hidden')});
  document.getElementById('log-backdrop').addEventListener('click',()=>{document.getElementById('log-panel').classList.add('log-hidden');document.getElementById('log-backdrop').classList.add('hidden')});

  addLog('info','系统初始化完成');
});
