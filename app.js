
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

// --- prev labels module (1 block) ---
// UI-only: show previous values next to labels in orange, same font size.
(function(){
  function setCapPrevByInputId(inputId, baseLabel, prevVal){
    if(prevVal == null || prevVal === '') return;
    const el = document.getElementById(inputId);
    if(!el) return;
    const row = el.closest('.tire-row');
    const cap = el.parentElement?.querySelector('.cap');
    if(!cap) return;
    // shorten for DOT fields
    if(/^(dot_)/.test(inputId)) baseLabel = '製造';
    // clear old prev span
    const old = cap.querySelector('.prev-inline'); if(old) old.remove();
    // reset base text (avoid重複)
    cap.textContent = baseLabel;
    const span = document.createElement('span');
    span.className = 'prev-inline';
    span.textContent = ` (前回 ${prevVal})`;
    cap.appendChild(span);
    if(row) row.classList.add('has-prev');
  }

  // public: apply previous values object
  // prev = { tread_rf, pre_rf, dot_rf, ... 同名キー }
  window.applyPrevInlineLabels = function(prev){
    if(!prev) return;
    setCapPrevByInputId('tread_rf','残溝', prev.tread_rf);
    setCapPrevByInputId('pre_rf','空気圧', prev.pre_rf);
    setCapPrevByInputId('dot_rf','製造年週', prev.dot_rf);

    setCapPrevByInputId('tread_lf','残溝', prev.tread_lf);
    setCapPrevByInputId('pre_lf','空気圧', prev.pre_lf);
    setCapPrevByInputId('dot_lf','製造年週', prev.dot_lf);

    setCapPrevByInputId('tread_lr','残溝', prev.tread_lr);
    setCapPrevByInputId('pre_lr','空気圧', prev.pre_lr);
    setCapPrevByInputId('dot_lr','製造年週', prev.dot_lr);

    setCapPrevByInputId('tread_rr','残溝', prev.tread_rr);
    setCapPrevByInputId('pre_rr','空気圧', prev.pre_rr);
    setCapPrevByInputId('dot_rr','製造年週', prev.dot_rr);
  };

  // hook: when station + plate filled, try fetching from PREV_API_URL if provided
  function val(sel){ const el=document.querySelector(sel); return el ? el.value.trim() : ''; }
  function tryFetchPrev(){
    const station = document.querySelector('[name="station"]')?.value?.trim() || document.getElementById('station')?.value?.trim() || '';
    const plate   = document.querySelector('[name="plate_full"]')?.value?.trim() || document.getElementById('plate_full')?.value?.trim() || '';
    if(!station || !plate) return;
    if(!window.PREV_API_URL){ return; } // UI-only phase: no request if URL未設定
    const url = `${window.PREV_API_URL}?station=${encodeURIComponent(station)}&plate_full=${encodeURIComponent(plate)}`;
    fetch(url).then(r=>r.json()).then(j=>{
      if(j && j.status === 'ok' && j.data){ window.applyPrevInlineLabels(j.data); }
    }).catch(()=>{});
  }

  // trigger when station/plate changed
  const st = document.querySelector('[name="station"],#station'); if(st) st.addEventListener('change', tryFetchPrev);
  const pl = document.querySelector('[name="plate_full"],#plate_full'); if(pl) pl.addEventListener('change', tryFetchPrev);

  // also attempt on load (URLパラメータによる自動入力対策)
  document.addEventListener('DOMContentLoaded', tryFetchPrev);
})();
// --- end prev labels module ---

