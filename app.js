
// v4c — FIX: restore core behaviors + simple GAS logging (form-encoded)
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyo2U1_TBxvzhJL50GHY8S0NeT1k0kueWb4tI1q2Oaw87NuGXqwjO7PWyCDdqFNZTdz/exec';
const SHEETS_KEY = 'tl1';

// --- time helpers (JST) ---
function nowJST(){ 
  const d=new Date(); const utc=d.getTime()+d.getTimezoneOffset()*60000; const jst=new Date(utc+9*60*60000);
  const HH=String(jst.getHours()).padStart(2,'0'); const MM=String(jst.getMinutes()).padStart(2,'0');
  const mm=String(jst.getMonth()+1).padStart(2,'0'); const dd=String(jst.getDate()).padStart(2,'0');
  return mm+'/'+dd+' '+HH+':'+MM;
}
function nowHM(){ 
  const d=new Date(); const utc=d.getTime()+d.getTimezoneOffset()*60000; const jst=new Date(utc+9*60*60000);
  return String(jst.getHours()).padStart(2,'0')+':'+String(jst.getMinutes()).padStart(2,'0');
}

// --- query param prefill ---
document.addEventListener('DOMContentLoaded', ()=>{
  const usp = new URLSearchParams(location.search);
  const station = usp.get('station') || usp.get('s') || '';
  const model   = usp.get('model')   || usp.get('m') || '';
  const plate   = usp.get('plate')   || usp.get('p') || '';
  if (station) document.querySelector('[name="station"]').value = station;
  if (model)   document.querySelector('[name="model"]').value   = model;
  if (plate)   document.querySelector('[name="plate_full"]').value = plate;
});

// --- stamp buttons ---
const unlockBtn = document.getElementById('unlockBtn');
const lockBtn   = document.getElementById('lockBtn');
const unlockTimeEl = document.getElementById('unlockTime');
const lockTimeEl   = document.getElementById('lockTime');
const unlockNote   = document.getElementById('unlockNote');
const lockNote     = document.getElementById('lockNote');

function stamp(el, noteEl){
  const t = nowHM(); const prev = el.textContent;
  el.textContent = t;
  if (noteEl) {
    noteEl.textContent = (prev && prev!=='--:--') ? ('更新: '+t) : '記録しました';
    setTimeout(()=> noteEl.textContent='', 1200);
  }
}
if (unlockBtn) unlockBtn.addEventListener('click', ()=>{ stamp(unlockTimeEl, unlockNote); lockBtn?.focus(); });
if (lockBtn)   lockBtn.addEventListener('click',   ()=>{ stamp(lockTimeEl,   lockNote);   document.getElementById('tread_rf')?.focus(); });

// --- auto-format / auto-advance ---
const order = ['tread_rf','pre_rf','dot_rf','tread_lf','pre_lf','dot_lf','tread_lr','pre_lr','dot_lr','tread_rr','pre_rr','dot_rr'];
function focusNext(currId){
  const i = order.indexOf(currId);
  if (i>=0 && i<order.length-1) { const next = document.getElementById(order[i+1]); if(next){ next.focus(); next.select?.(); } }
  else if (i===order.length-1) { const btn = document.getElementById('submitBtn'); if(btn){ btn.classList?.add('focus-ring'); btn.focus(); setTimeout(()=>btn.classList?.remove('focus-ring'),1200); } }
}
function autoFormatTread(el){ // "55" → "5.5"
  let v = (el.value||'').replace(/[^0-9]/g,'');
  if (/^\d{2}$/.test(v)) { el.value = v[0]+'.'+v[1]; focusNext(el.id); }
  else { el.value = v; }
}
function autoAdvancePressure(el){ // >=3桁で次へ
  const v = (el.value||'').replace(/[^0-9]/g,''); el.value = v;
  if (v.length>=3) focusNext(el.id);
}
function autoAdvanceDOT(el){ // 4桁固定
  const v = (el.value||'').replace(/[^0-9]/g,'').slice(0,4); el.value = v;
  if (v.length===4) focusNext(el.id);
}
['rf','lf','lr','rr'].forEach(pos=>{
  document.getElementById('tread_'+pos)?.addEventListener('input', e=>autoFormatTread(e.target));
  document.getElementById('pre_'+pos)?.addEventListener('input',   e=>autoAdvancePressure(e.target));
  document.getElementById('dot_'+pos)?.addEventListener('input',   e=>autoAdvanceDOT(e.target));
});

// --- toast ---
function showToast(msg){
  const t = document.getElementById('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400);
}

// --- send to GAS ---
async function postToSheet(payload){
  try{
    if(!SHEETS_URL){ showToast('送信しました'); return; }
    const body = new URLSearchParams();
    if (SHEETS_KEY) body.set('key', SHEETS_KEY);
    body.set('json', JSON.stringify(payload));
    await fetch(SHEETS_URL, { method:'POST', body });
  }catch(_){}
  showToast('送信しました');
}

// --- form submit / result view ---
const form = document.getElementById('form');
const resultCard = document.getElementById('resultCard');
const resHeader = document.getElementById('res_header');
const resTimes  = document.getElementById('res_times');
const resLines  = document.getElementById('res_lines');

function gv(sel){ return document.querySelector(sel)?.value || ''; }
function g(id)  { return document.getElementById(id)?.value || ''; }

function buildPayload(){
  return {
    station: gv('[name="station"]'),
    model:   gv('[name="model"]'),
    plate_full: gv('[name="plate_full"]'),
    std_f: gv('[name="std_f"]'),
    std_r: gv('[name="std_r"]'),
    unlock: unlockTimeEl?.textContent || '',
    lock:   lockTimeEl?.textContent   || '',
    tread_rf: g('tread_rf'), pre_rf: g('pre_rf'), dot_rf: g('dot_rf'),
    tread_lf: g('tread_lf'), pre_lf: g('pre_lf'), dot_lf: g('dot_lf'),
    tread_lr: g('tread_lr'), pre_lr: g('pre_lr'), dot_lr: g('dot_lr'),
    tread_rr: g('tread_rr'), pre_rr: g('pre_rr'), dot_rr: g('dot_rr'),
  };
}

if (form) form.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const p = buildPayload();
  const lines = [
    `解錠　${p.unlock||'--:--'}`, `施錠　${p.lock||'--:--'}`, '',
    `${p.tread_rf} ${p.pre_rf} ${p.dot_rf}${(p.std_f&&p.std_r)?`    ${p.std_f}-${p.std_r}`:''}   RF`,
    `${p.tread_lf} ${p.pre_lf} ${p.dot_lf}   LF`,
    `${p.tread_lr} ${p.pre_lr} ${p.dot_lr}   LR`,
    `${p.tread_rr} ${p.pre_rr} ${p.dot_rr}   RR`,
    '',
    nowJST()
  ].join('\n');

  // 結果画面更新（stationも先頭に）
  resHeader.textContent = (p.station? (p.station+'\n') : '') + p.plate_full + '\n' + p.model;
  resTimes.innerHTML = `解錠　${p.unlock||'--:--'}<br>施錠　${p.lock||'--:--'}`;
  resLines.textContent = lines;

  form.style.display = 'none';
  resultCard.style.display = 'block';
  window.scrollTo({ top:0, behavior:'smooth' });

  await postToSheet(p);
});

document.getElementById('backBtn')?.addEventListener('click',()=>{
  resultCard.style.display='none';
  form.style.display='block';
  window.scrollTo({top:0,behavior:'smooth'});
});

// --- reload confirm module (1 block) ---
(function(){
  // Track dirty state only while the input form is visible
  const form = document.getElementById('form');
  const resultCard = document.getElementById('resultCard');
  if(!form) return;

  let isDirty = false;
  const setDirty = ()=>{ isDirty = true; };
  form.querySelectorAll('input, textarea, select').forEach(el=>{
    el.addEventListener('input', setDirty, {passive:true});
    el.addEventListener('change', setDirty, {passive:true});
  });

  function formVisible(){
    // visible when resultCard is hidden OR form's display is not 'none'
    const rcVis = resultCard && getComputedStyle(resultCard).display !== 'none';
    const fmVis = getComputedStyle(form).display !== 'none';
    // we want guard only when INPUT form is visible
    return fmVis && !rcVis;
  }

  window.addEventListener('beforeunload', function(e){
    if (formVisible() && isDirty){
      e.preventDefault();
      e.returnValue = ''; // show standard confirm dialog
    }
  });
})();
// --- end reload confirm module ---

// --- reload recovery module (1 block; Safari-safe) ---
(function(){
  const form = document.getElementById('form');
  if(!form) return;

  // Helpers
  const qs = (s)=>document.querySelector(s);
  const getVal = (sel)=>{ const el=qs(sel); return el? (el.value||'').trim() : ''; };
  function getKey(){
    const station = getVal('[name="station"],#station');
    const plate   = getVal('[name="plate_full"],#plate_full');
    if(!station || !plate) return null;
    return 'tireapp:'+station+'|'+plate;
  }

  function snapshotForm(){
    const data = {};
    form.querySelectorAll('input, textarea, select').forEach(el=>{
      const id = el.id || el.name;
      if(!id) return;
      if(el.type === 'checkbox' || el.type === 'radio'){
        data[id] = !!el.checked;
      } else {
        data[id] = el.value;
      }
    });
    return data;
  }
  function applySnapshot(data){
    if(!data) return;
    Object.keys(data).forEach(k=>{
      const el = form.querySelector('#'+CSS.escape(k)+', [name="'+k+'"]');
      if(!el) return;
      if(el.type === 'checkbox' || el.type === 'radio'){
        el.checked = !!data[k];
      } else {
        el.value = data[k];
        // fire input to trigger any formatting/auto-advance handlers already in app.js
        try { el.dispatchEvent(new Event('input', {bubbles:true})); } catch(_){}
        try { el.dispatchEvent(new Event('change', {bubbles:true})); } catch(_){}
      }
    });
  }

  function save(){
    const key = getKey();
    if(!key) return;
    try {
      const data = snapshotForm();
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch(e) {}
  }
  function restoreIfAny(){
    const key = getKey();
    if(!key) return;
    try{
      const raw = sessionStorage.getItem(key);
      if(!raw) return;
      const data = JSON.parse(raw);
      applySnapshot(data);
    }catch(e){}
  }

  // Save on edits (immediate; no debounce to avoid missing quick reloads)
  form.querySelectorAll('input, textarea, select').forEach(el=>{
    el.addEventListener('input', save, {passive:true});
    el.addEventListener('change', save, {passive:true});
  });

  // When station/plate changes, restore matching snapshot (if any)
  const st = qs('[name="station"],#station'); st && st.addEventListener('change', restoreIfAny, {passive:true});
  const pl = qs('[name="plate_full"],#plate_full'); pl && pl.addEventListener('change', restoreIfAny, {passive:true});

  // On load: if both present, attempt restore
  document.addEventListener('DOMContentLoaded', restoreIfAny);
})();
// --- end reload recovery module ---

