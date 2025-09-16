
// ---- v3r: draft autosave (plate+station keyed), no UI changes ----
// v3t: reload-aware restore + pagehide flush + lastKey in sessionStorage
(function(){
  const NS = 'draft:v1';
  const DRAFT_TTL_MS = 24*60*60*1000;
  let draftTimer = null;

  function toNarrow(s){
    if(!s) return '';
    return s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0)-0xFEE0)).replace(/　/g,' ');
  }
  function normPlate(s){
    const t = toNarrow(s||'').trim().toLowerCase();
    return t.replace(/\s+/g,'').replace(/[－–ー―]/g,'-');
  }
  function normStation(s){
    return (s||'').trim();
  }
  function getForm(){
    return document.querySelector('#form');
  }
  function getPlate(){ return document.querySelector('[name="plate_full"]')?.value || ''; }
  function getStation(){ return document.querySelector('[name="station"]')?.value || ''; }
  function getKey(){
    const p = normPlate(getPlate());
    if(!p) return null; // plate未入力のときは保存しない（誤復元防止）
    const s = normStation(getStation()) || '-';
    return `${NS}:${p}:${s}`;
  }

  function collectValues(){
    const f = getForm(); if(!f) return null;
    const values = {};
    f.querySelectorAll('input').forEach(el=>{
      const k = el.name || el.id;
      if(!k) return;
      values[k] = el.value || '';
    });
    // 時刻スタンプ（buttonで記録されるやつ）も保持
    const unlock = document.querySelector('#unlockTime')?.textContent || '';
    const lock   = document.querySelector('#lockTime')?.textContent || '';
    return {values, unlock, lock, plate:getPlate(), station:getStation(), ts: Date.now()};
  }

  function applyValues(d){
    try{
      const f = getForm(); if(!f || !d) return;
      Object.entries(d.values||{}).forEach(([k,v])=>{
        const el = f.querySelector(`[name="${k}"]`) || document.getElementById(k);
        if(el && typeof v==='string') el.value = v;
      });
      if(d.unlock) { const el = document.querySelector('#unlockTime'); if(el) el.textContent = d.unlock; }
      if(d.lock)   { const el = document.querySelector('#lockTime');   if(el) el.textContent = d.lock; }
    }catch(_){}
  }

  function saveDraftNow(){
    try{
      const key = getKey(); if(!key) return;
      const data = collectValues(); if(!data) return;
      localStorage.setItem(key, JSON.stringify(data));
      lastKeyStore(key);
    }catch(_){}
  }
  function saveDraftDebounced(){
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 600);
  }
  function isReload(){
      try{
        const navs = performance.getEntriesByType && performance.getEntriesByType('navigation');
        if(navs && navs.length && navs[0].type) return navs[0].type === 'reload';
      }catch(_){}
      try{
        if (performance && performance.navigation) return performance.navigation.type === 1; // deprecated fallback
      }catch(_){}
      return false;
    }

    function lastKeyStore(setKey){
      try{
        const K='draft:lastKey';
        if (setKey===undefined) return sessionStorage.getItem(K);
        if (setKey===null) sessionStorage.removeItem(K);
        else sessionStorage.setItem(K, setKey);
      }catch(_){}
      return null;
    }

    function tryLoadDraft(){
    try{
      const key = getKey(); if(!key) return;
      const raw = localStorage.getItem(key);
      if(!raw) return;
      const d = JSON.parse(raw);
      // TTL gate
      if(!d.ts || (Date.now()-d.ts) > DRAFT_TTL_MS) return;
      // 厳密一致（誤復元防止）
      if (normPlate(d.plate) !== normPlate(getPlate())) return;
      if ((normStation(d.station)||'-') !== (normStation(getStation())||'-')) return;
      applyValues(d);
    }catch(_){}
  }
  
  // 監視: #unlockTime / #lockTime のテキスト変化で即保存（input以外の更新に対応）
  function observeTimes(){
    try{
      const targets = [document.querySelector('#unlockTime'), document.querySelector('#lockTime')].filter(Boolean);
      if(targets.length === 0) return;
      const obs = new MutationObserver(()=> { try{ saveDraftNow(); }catch(_){ } });
      targets.forEach(t => obs.observe(t, { characterData:true, childList:true, subtree:true }));
    }catch(_){}
  }

  // 起動時と plate/station 確定時に復元
  document.addEventListener('DOMContentLoaded', ()=>{
    // On hard reload in same tab, restore last active draft safely
    try{
      if(isReload()){
        const lk = lastKeyStore();
        if(lk){
          const raw = localStorage.getItem(lk);
          if(raw){
            const d = JSON.parse(raw);
            // TTL check (if present in code)
            try{
              if(typeof DRAFT_TTL_MS !== 'undefined'){
                if(!d.ts || (Date.now()-d.ts) > DRAFT_TTL_MS) throw new Error('ttl');
              }
            }catch(_){}
            applyValues(d);
          }
        }
      }
    }catch(_){}


    observeTimes();
    const f = getForm(); if(!f) return;
    tryLoadDraft();
    f.addEventListener('input', saveDraftDebounced);
    // Flush on pagehide/visibilitychange to catch quick reload/close
    try{ window.addEventListener('pagehide', ()=>{ try{ saveDraftNow(); }catch(_){ } }); }catch(_){}
    try{ document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ try{ saveDraftNow(); }catch(_){ } } }); }catch(_){}

    const plateEl = f.querySelector('[name="plate_full"]');
    const stationEl = f.querySelector('[name="station"]');
    plateEl && plateEl.addEventListener('blur', tryLoadDraft);
    stationEl && stationEl.addEventListener('blur', tryLoadDraft);
  });

  // 完了時：施錠が入力済み（--:-- 以外）ならドラフト削除、未入力なら保持
  function clearDraftIfFinalized(){
    const lockText = document.querySelector('#lockTime')?.textContent || '';
    const isFinal = /\d{1,2}:\d{2}/.test(lockText);
    if(!isFinal) return;
    try{ const key = getKey(); if(key) localStorage.removeItem(key); }catch(_){}
  }
  // expose clear function for submit flow to call after render
  window.__clearDraftIfFinalized = clearDraftIfFinalized;
  window.__saveDraftNow = saveDraftNow; // optional manual flush
})();


// Web App URL (unchanged)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw_Lgz61Wc_M5ajTrKtUmR0xnm2BvRyx4b7XYVuTfM92sbaW3RSMwIyVCVEgWzi2mJp/exec';

// Set current date/time in JST
function nowJST(){
  const d=new Date();const utc=d.getTime()+d.getTimezoneOffset()*60000;const jst=new Date(utc+9*60*60000);
  const HH=String(jst.getHours()).padStart(2,'0');const MM=String(jst.getMinutes()).padStart(2,'0');
  const mm=String(jst.getMonth()+1).padStart(2,'0');const dd=String(jst.getDate()).padStart(2,'0');
  return mm+'/'+dd+' '+HH+':'+MM;
}
function nowHM(){
  const d=new Date();const utc=d.getTime()+d.getTimezoneOffset()*60000;const jst=new Date(utc+9*60*60000);
  const HH=String(jst.getHours()).padStart(2,'0');const MM=String(jst.getMinutes()).padStart(2,'0');
  return `${HH}:${MM}`;
}
document.getElementById('now').textContent=nowJST();

// Prefill form fields from query parameters
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const station = params.get('station');
  const model   = params.get('model');
  const plate   = params.get('plate_full');
  if (station) document.querySelector('[name="station"]').value = station;
  if (model)   document.querySelector('[name="model"]').value   = model;
  if (plate)   document.querySelector('[name="plate_full"]').value = plate;
});

// Time stamp buttons
const unlockBtn=document.getElementById('unlockBtn'); const lockBtn=document.getElementById('lockBtn');
const unlockTimeEl=document.getElementById('unlockTime'); const lockTimeEl=document.getElementById('lockTime');
const unlockNote=document.getElementById('unlockNote'); const lockNote=document.getElementById('lockNote');
function stamp(el,noteEl){
  const t=nowHM(),prev=el.textContent; el.textContent=t;
  noteEl.textContent=(prev && prev!=='--:--')?('更新: '+t):'記録しました';
  setTimeout(()=>noteEl.textContent='',1200);
}
unlockBtn.addEventListener('click',()=>{ stamp(unlockTimeEl,unlockNote); lockBtn.focus(); });
lockBtn.addEventListener('click',()=>{ stamp(lockTimeEl,lockNote); document.getElementById('tread_rf').focus(); });

// Auto-advance input fields
const order=['tread_rf','pre_rf','dot_rf','tread_lf','pre_lf','dot_lf','tread_lr','pre_lr','dot_lr','tread_rr','pre_rr','dot_rr'];
function focusNext(currId){
  const i=order.indexOf(currId);
  if(i>=0 && i<order.length-1){ const next=document.getElementById(order[i+1]); if(next){ next.focus(); next.select?.(); } }
  else if(i===order.length-1){ const btn=document.getElementById('submitBtn'); btn.classList.add('focus-ring'); btn.focus(); setTimeout(()=>btn.classList.remove('focus-ring'),1200); }
}
function autoFormatTread(el){
  let v=el.value.replace(/[^0-9]/g,'');
  if(/\./.test(v)){ el.value=v; return; }
  if(/^\d{2}$/.test(v)){ el.value=v[0]+'.'+v[1]; focusNext(el.id); } else { el.value=v; }
}
function autoAdvancePressure(el){
  const v=el.value.replace(/[^0-9]/g,''); el.value=v; if(v.length>=3){ focusNext(el.id); }
}
function autoAdvanceDOT(el){
  const v=el.value.replace(/[^0-9]/g,''); el.value=v.slice(0,4); if(el.value.length===4){ focusNext(el.id); }
}
['rf','lf','lr','rr'].forEach(pos=>{
  document.getElementById('tread_'+pos).addEventListener('input',e=>autoFormatTread(e.target));
  document.getElementById('pre_'+pos).addEventListener('input',e=>autoAdvancePressure(e.target));
  document.getElementById('dot_'+pos).addEventListener('input',e=>autoAdvanceDOT(e.target));
});

// Toast notifications
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); }

async function postToSheet(payload){
  fetch(WEB_APP_URL, { method:'POST', mode:'no-cors', body: JSON.stringify(payload) });
  showToast('送信しました');
}

// Form submission
const form=document.getElementById('form'); const resultCard=document.getElementById('resultCard');
const resHeader=document.getElementById('res_header'); const resTimes=document.getElementById('res_times'); const resLines=document.getElementById('res_lines');
function buildPayload(){
  const gv = sel => document.querySelector(sel)?.value || '';
  const g  = id  => document.getElementById(id)?.value || '';
  return {
    station: gv('[name="station"]'),
    model:   gv('[name="model"]'),
    plate_full: gv('[name="plate_full"]'),
    unlock: unlockTimeEl.textContent || '',
    lock:   lockTimeEl.textContent   || '',
    tread_rf: g('tread_rf'), pre_rf: g('pre_rf'), dot_rf: g('dot_rf'),
    tread_lf: g('tread_lf'), pre_lf: g('pre_lf'), dot_lf: g('dot_lf'),
    tread_lr: g('tread_lr'), pre_lr: g('pre_lr'), dot_lr: g('dot_lr'),
    tread_rr: g('tread_rr'), pre_rr: g('pre_rr'), dot_rr: g('dot_rr'),
    std_f: gv('[name="std_f"]'),
    std_r: gv('[name="std_r"]')
  };
}
form.addEventListener('submit', async () => {
  const p = buildPayload();
  const lines=[
    `${p.tread_rf} ${p.pre_rf} ${p.dot_rf}${(p.std_f&&p.std_r)?`    ${p.std_f}-${p.std_r}`:''}   RF`,
    `${p.tread_lf} ${p.pre_lf} ${p.dot_lf}   LF`,
    `${p.tread_lr} ${p.pre_lr} ${p.dot_lr}   LR`,
    `${p.tread_rr} ${p.pre_rr} ${p.dot_rr}   RR`,
    '',
    nowJST()
  ].join('\n');
  resHeader.textContent = `${p.station}
${p.plate_full}
${p.model}`;
  resTimes.innerHTML = `解錠　${p.unlock||'--:--'}<br>施錠　${p.lock||'--:--'}`;
  resLines.textContent  = lines;
  form.style.display='none'; resultCard.style.display='block'; window.scrollTo({top:0,behavior:'smooth'});
  await postToSheet(p);
});
document.getElementById('backBtn').addEventListener('click',()=>{ resultCard.style.display='none'; form.style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); });
