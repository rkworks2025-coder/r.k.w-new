
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

    if (formVisible() && isDirty){
      e.preventDefault();
      e.returnValue = ''; // show standard confirm dialog
    }
  });
})();
// --- end reload confirm module ---

// --- reload recovery module (1 block; v3t-spec robust) ---
(function(){
  const TTL_MS = 24*60*60*1000; // 24h
  const DRAFT_NS = 'tireapp'; // namespace

  const dq = (s)=>document.querySelector(s);
  const now = ()=>Date.now();
  const enc = (s)=>encodeURIComponent(s||'');
  const keyFor = (station, plate)=> `${DRAFT_NS}:${enc(station)}|${enc(plate)}`;
  const LAST_KEY = `${DRAFT_NS}:lastKey`; // sessionStorage (same tab)

  function getField(selector){
    const el = document.querySelector(selector);
    return el && (el.value||'').trim();
  }
  function getStation(){ return getField('[name="station"],#station'); }
  function getPlate(){ return getField('[name="plate_full"],#plate_full'); }

  function getCurrentKey(){
    const st = getStation();
    const pl = getPlate();
    if(!st || !pl) return null;
    return keyFor(st, pl);
  }

  function snapshotForm(){
    const data = {};
    document.querySelectorAll('input, textarea, select').forEach(el=>{
      const id = el.id || el.name;
      if(!id) return;
      data[id] = (el.type==='checkbox'||el.type==='radio') ? !!el.checked : el.value;
    });
    return { t: now(), data };
  }

  function saveDraft(){
    const k = getCurrentKey();
    if(!k) return;
    try {
      const snap = snapshotForm();
      localStorage.setItem(k, JSON.stringify(snap));
      sessionStorage.setItem(LAST_KEY, k);
    } catch(e) {}
  }

  function expired(ts){ return (now() - ts) > TTL_MS; }

  function applySnapshotData(obj){
    if(!obj || !obj.data) return false;
    const data = obj.data;
    let applied = false;
    try{
      Object.keys(data).forEach(k=>{
        const el = document.querySelector('#'+CSS.escape(k)+', [name="'+k+'"]');
        if(!el) return;
        if(el.type==='checkbox'||el.type==='radio'){
          el.checked = !!data[k];
        } else {
          const prev = el.value;
          el.value = data[k];
          if(k!=='station' && k!=='plate_full' && prev !== el.value){
            try { el.dispatchEvent(new Event('input', {bubbles:true})); } catch(_){}
            try { el.dispatchEvent(new Event('change', {bubbles:true})); } catch(_){}
          }
        }
        applied = true;
      });
    }catch(e){}
    return applied;
  }

  function tryRestoreByKey(k){
    if(!k) return false;
    try{
      const raw = localStorage.getItem(k);
      if(!raw) return false;
      const obj = JSON.parse(raw);
      if(!obj || !obj.t || expired(obj.t)) return false;
      return applySnapshotData(obj);
    }catch(e){ return false; }
  }

  document.querySelectorAll('input, textarea, select').forEach(el=>{
    el.addEventListener('input', saveDraft,  {passive:true});
    el.addEventListener('change', saveDraft, {passive:true});
  });
  window.addEventListener('pagehide', saveDraft, {passive:true});
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'hidden') saveDraft();
  }, {passive:true});

  function isReloadNavigation(){
    try{
      const perf = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (perf && perf[0] && perf[0].type) return perf[0].type === 'reload';
    }catch(e){}
    try{
      return performance && performance.navigation && performance.navigation.type === 1;
    }catch(e){}
    return false;
  }

  function restoreOnReloadIfPossible(){
    if (!isReloadNavigation()) return;
    const lastK = sessionStorage.getItem(LAST_KEY);
    if (!lastK) return;
    tryRestoreByKey(lastK);
  }

  function restoreWhenKeyAvailable(){
    const k = getCurrentKey();
    if (!k) return;
    tryRestoreByKey(k);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    restoreOnReloadIfPossible();
    restoreWhenKeyAvailable();
  });
  const stEl = document.querySelector('[name="station"],#station');
  const plEl = document.querySelector('[name="plate_full"],#plate_full');
  stEl && stEl.addEventListener('input', restoreWhenKeyAvailable, {passive:true});
  plEl && plEl.addEventListener('input', restoreWhenKeyAvailable, {passive:true});
  stEl && stEl.addEventListener('change', restoreWhenKeyAvailable, {passive:true});
  plEl && plEl.addEventListener('change', restoreWhenKeyAvailable, {passive:true});

})();
// --- end reload recovery module ---

