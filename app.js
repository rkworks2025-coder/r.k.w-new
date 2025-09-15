// v3v: Google Sheets (GAS) logging — minimal, no UI changes
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyo2U1_TBxvzhJL50GHY8S0NeT1k0kueWb4tI1q2Oaw87NuGXqwjO7PWyCDdqFNZTdz/exec';   // ★ ここにGASウェブアプリURL
const SHEETS_KEY = 'tl1';   // ★ ここにAPI_KEY（GAS側と一致）
async function pushToSheet(p){
  try{
    if(!SHEETS_URL) return;
    const body = new URLSearchParams();
    if (SHEETS_KEY) body.set('key', SHEETS_KEY);
    body.set('json', JSON.stringify(p));
    await fetch(SHEETS_URL, { method:'POST', body });
  }catch(_){}
}


// ---- draft:v1 (plate+station keyed) + reload-aware (session lastKey) ----
(function(){
  const NS = 'draft:v1';
  const DRAFT_TTL_MS = 24*60*60*1000;
  let draftTimer = null;

  function toNarrow(s){ return (s||'').replace(/[！-～]/g, c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/　/g,' '); }
  function normPlate(s){ const t = toNarrow(s).trim().toLowerCase(); return t.replace(/\s+/g,'').replace(/[－–ー―]/g,'-'); }
  function normStation(s){ return (s||'').trim(); }
  function form(){ return document.querySelector('#form'); }
  function get(name){ const f=form(); return f && (f.querySelector(`[name="${name}"]`)||document.getElementById(name)); }
  function getPlate(){ return get('plate_full')?.value || ''; }
  function getStation(){ return get('station')?.value || ''; }
  function key(){ const p=normPlate(getPlate()); if(!p) return null; const s=normStation(getStation())||'-'; return `${NS}:${p}:${s}`; }

  function collect(){
    const f=form(); if(!f) return null;
    const values={};
    f.querySelectorAll('input').forEach(el=>{ const k=el.name||el.id; if(k) values[k]=el.value||''; });
    const unlock = document.querySelector('#unlockTime')?.textContent || '';
    const lock   = document.querySelector('#lockTime')?.textContent || '';
    return {values, unlock, lock, plate:getPlate(), station:getStation(), ts:Date.now()};
  }
  function apply(d){
    try{
      const f=form(); if(!f||!d) return;
      Object.entries(d.values||{}).forEach(([k,v])=>{ const el=f.querySelector(`[name="${k}"]`)||document.getElementById(k); if(el) el.value = typeof v==='string'?v:''; });
      if(d.unlock){ const el=document.querySelector('#unlockTime'); if(el) el.textContent=d.unlock; }
      if(d.lock){   const el=document.querySelector('#lockTime');   if(el) el.textContent=d.lock; }
    }catch(_){}
  }
  function saveNow(){
    try{ const k=key(); if(!k) return; const d=collect(); if(!d) return; localStorage.setItem(k, JSON.stringify(d)); lastKey(k); }catch(_){}
  }
  function saveDeb(){ clearTimeout(draftTimer); draftTimer=setTimeout(saveNow, 600); }
  function tryLoad(){
    try{
      const k=key(); if(k){ const raw=localStorage.getItem(k); if(raw){ const d=JSON.parse(raw); if(d.ts && (Date.now()-d.ts)<=DRAFT_TTL_MS){
        if(normPlate(d.plate)===normPlate(getPlate()) && (normStation(d.station)||'-')===(normStation(getStation())||'-')) apply(d);
      } } }
    }catch(_){}
  }
  function isReload(){
    try{ const navs=performance.getEntriesByType&&performance.getEntriesByType('navigation'); if(navs&&navs.length&&navs[0].type) return navs[0].type==='reload'; }catch(_){}
    try{ if(performance&&performance.navigation) return performance.navigation.type===1; }catch(_){}
    return false;
  }
  function lastKey(val){
    try{
      const K='draft:lastKey';
      if(val===undefined) return sessionStorage.getItem(K);
      if(val===null) sessionStorage.removeItem(K);
      else sessionStorage.setItem(K, val);
    }catch(_){}
    return null;
  }
  function observeTimes(){
    try{
      const t=[document.querySelector('#unlockTime'), document.querySelector('#lockTime')].filter(Boolean);
      if(!t.length) return;
      const obs=new MutationObserver(()=>{ try{ saveNow(); }catch(_){ } });
      t.forEach(n=>obs.observe(n,{characterData:true,childList:true,subtree:true}));
    }catch(_){}
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const f=form(); if(!f) return;
    // reload時は直前キーから復元（同一タブ限定）
    try{ if(isReload()){ const lk=lastKey(); if(lk){ const raw=localStorage.getItem(lk); if(raw){ const d=JSON.parse(raw); if(d.ts && (Date.now()-d.ts)<=DRAFT_TTL_MS) apply(d); } } } }catch(_){}
    tryLoad();
    f.addEventListener('input', saveDeb);
    try{ window.addEventListener('pagehide', ()=>{ try{ saveNow(); }catch(_){ } }); }catch(_){}
    try{ document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ try{ saveNow(); }catch(_){ } } }); }catch(_){}
    observeTimes();
  });
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
