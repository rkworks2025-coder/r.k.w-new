
// v3h2: station banner DOMをJSで保証（index.htmlが古くても動く）
function ensureStationBannerDom(){
  try{
    if(!document.querySelector('#station-top')){
      const vr = document.querySelector('#view-result');
      if(vr){
        const el = document.createElement('div');
        el.id = 'station-top';
        el.className = 'station-top';
        vr.insertBefore(el, vr.firstElementChild);
      }
    }
  }catch(_){}
}
function ensureStationBannerStyle(){
  try{
    if(!document.querySelector('#__station_top_style__')){
      const st = document.createElement('style');
      st.id = '__station_top_style__';
      st.textContent = '.station-top{ margin:8px 4px 6px; font-size:18px; font-weight:700; color:#fff; }';
      document.head.appendChild(st);
    }
  }catch(_){}
}


// v3h1: 初期表示でバナー更新 & 駅名入力変更で追従
function setupStationBannerLive(){
  try{
    const stEl = document.querySelector('#station');
    // 初回（URL param > input値）
    updateStationTopBanner((APP_CTX.paramStation && APP_CTX.paramStation.trim()) ? APP_CTX.paramStation : (stEl?.value||''));
    if(stEl){
      stEl.addEventListener('blur', ()=> updateStationTopBanner(stEl.value));
      stEl.addEventListener('change', ()=> updateStationTopBanner(stEl.value));
      stEl.addEventListener('input', ()=> updateStationTopBanner(stEl.value));
    }
  }catch(_){}
}


// ---- v3h: URLパラメータ（station/plate/model）受け取り & 結果画面上部に表示 ----
let APP_CTX = { paramStation:null, paramPlate:null, paramModel:null };

function parseQuery(){
  const q={};
  const src = (location.search||'').replace(/^\?/,'');
  if(!src) return q;
  src.split('&').forEach(p=>{
    if(!p) return;
    const [k,v] = p.split('=');
    const key = decodeURIComponent(k||'').toLowerCase();
    const val = decodeURIComponent((v||'').replace(/\+/g,' '));
    q[key]=val;
  });
  return q;
}

function applyParamsToForm(){
  try{
    const q = parseQuery();
    APP_CTX.paramStation = q.station || null;
    APP_CTX.paramPlate   = q.plate   || null;
    APP_CTX.paramModel   = q.model   || null;

    const st = document.querySelector('#station');
    const pl = document.querySelector('#plate');
    const md = document.querySelector('#model');

    if (APP_CTX.paramStation && st){
      st.value = APP_CTX.paramStation;
      st.readOnly = true;
      st.classList.add('readonly');
    }
    if (APP_CTX.paramModel && md && !md.value){
      md.value = APP_CTX.paramModel;
    }
    if (APP_CTX.paramPlate && pl && !pl.value){
      pl.value = APP_CTX.paramPlate;
    }
  }catch(_){}
}

function guardPlateBeforeSubmit(model){
  if (APP_CTX.paramPlate){
    const a = normalizePlateKey(APP_CTX.paramPlate);
    const b = normalizePlateKey(model.plate);
    if (a !== b){
      alert('巡回アプリの車両と一致しません（フルナンバー）。\\n入力内容を確認してください。');
      return false;
    }
  }
  if (APP_CTX.paramStation && model.station){
    const s1 = (APP_CTX.paramStation||'').trim();
    const s2 = (model.station||'').trim();
    if (s1 !== s2){
      alert('巡回アプリのステーション名と一致しません。入力内容を確認してください。');
      return false;
    }
  }
  return true;
}

function updateStationTopBanner(stationText){
  const el = document.querySelector('#station-top');
  if (!el) return;
  el.textContent = stationText || '';
}


// ---- v3g: 前回値プレースホルダー（plate別） ----
function loadLastByPlate(){
  try{ return JSON.parse(localStorage.getItem('lastByPlate')||'{}'); }catch(_){ return {}; }
}
function saveLastByPlate(db){
  try{ localStorage.setItem('lastByPlate', JSON.stringify(db)); }catch(_){}
}
function getLastForPlate(plateInput){
  const key = normalizePlateKey(plateInput||'');
  if(!key) return null;
  const db = loadLastByPlate();
  return db[key] || null; // { wheels: {RF:{depth,press,week},...}, ts, station, car }
}
function rememberLastByPlate(model){
  const key = normalizePlateKey(model.plate);
  if(!key) return;
  const db = loadLastByPlate();
  db[key] = { wheels: model.wheels, ts: model.ts, station: model.station, car: model.car };
  saveLastByPlate(db);
}

function applyLastPlaceholdersForPlate(){
  const plateEl = document.querySelector('#plate');
  if(!plateEl) return;
  const last = getLastForPlate(plateEl.value);
  const DEF_WEEK_PH = '例: 4822';

  ["RF","LF","LR","RR"].forEach(w=>{
    const row = document.querySelector(`.wheel-row[data-wheel="${w}"]`);
    if(!row) return;
    const depthEl = row.querySelector('.input-depth');
    const pressEl = row.querySelector('.input-press');
    const weekEl  = row.querySelector('.input-week');

    if(last && last.wheels && last.wheels[w]){
      const r = last.wheels[w];
      if(depthEl) depthEl.placeholder = (r.depth ?? '') || '';
      if(pressEl) pressEl.placeholder = (r.press ?? '') || '';
      if(weekEl)  weekEl.placeholder  = (r.week  ?? '') || DEF_WEEK_PH;
    }else{
      // 既定の例示に戻す（深溝・空気圧は無表示、年週は例文）
      if(depthEl && !depthEl.value) depthEl.placeholder = '';
      if(pressEl && !pressEl.value) pressEl.placeholder = '';
      if(weekEl  && !weekEl.value)  weekEl.placeholder  = DEF_WEEK_PH;
    }
  });
}

function setupLastPlaceholders(){
  const plateEl = document.querySelector('#plate');
  if(!plateEl) return;
  const handler = ()=> applyLastPlaceholdersForPlate();
  plateEl.addEventListener('blur', handler);
  plateEl.addEventListener('change', handler);
}


// ---- v3f: 車両固有 規定圧メモリ（localStorage） ----
function normalizePlateKey(s){
  if(!s) return "";
  // 全角→半角
  const toNarrow = s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
                    .replace(/　/g, ' ');
  // 記号・空白を統一、小文字化
  return toNarrow.trim().toLowerCase().replace(/\s+/g,'').replace(/[－–ー―]/g,'-');
}

function loadPressByPlate(){
  try{ return JSON.parse(localStorage.getItem('pressByPlate')||'{}'); }catch(_){ return {}; }
}
function savePressByPlate(db){
  try{ localStorage.setItem('pressByPlate', JSON.stringify(db)); }catch(_){}
}

function getPlatePressure(plateInput){
  const key = normalizePlateKey(plateInput);
  if(!key) return null;
  const db = loadPressByPlate();
  return db[key] || null; // {front, rear, updatedAt}
}

function rememberPlatePressure(model){
  // model: collect() の戻り値
  const plateKey = normalizePlateKey(model.plate);
  if(!plateKey) return;
  const pre  = parseInt((model.stdPre||qs('#std-pre')?.value||'').trim(), 10);
  const post = parseInt((model.stdPost||qs('#std-post')?.value||'').trim(), 10);
  if (Number.isFinite(pre) && Number.isFinite(post)){
    const db = loadPressByPlate();
    db[plateKey] = { front: pre, rear: post, updatedAt: new Date().toISOString() };
    savePressByPlate(db);
  }
}

function applyPlatePressure(){
  const plateEl = document.querySelector('#plate');
  const preEl   = document.querySelector('#std-pre');
  const postEl  = document.querySelector('#std-post');
  if(!plateEl || !preEl || !postEl) return;

  const rec = getPlatePressure(plateEl.value);
  if (rec){
    // plate固有が見つかったら、空欄に限らず“その値で”反映（現場の正値優先）
    preEl.value  = rec.front;
    postEl.value = rec.rear;
  }else{
    // plate固有が無いなら、v3eのモデルマスタ（空欄のときだけ上書き）に委譲
    try{
      const res = getPressure(document.querySelector('#model').value);
      if (res.front != null && preEl.value.trim() === '') preEl.value = res.front;
      if (res.rear  != null && postEl.value.trim() === '') postEl.value = res.rear;
    }catch(_){}
  }
}

function setupPlateAutofill(){
  const plateEl = document.querySelector('#plate');
  if(!plateEl) return;
  const handler = ()=> applyPlatePressure();
  plateEl.addEventListener('blur', handler);
  plateEl.addEventListener('change', handler);
}


// ---- v3e: 内蔵 規定圧マスタ（編集可） ----
const PRESSURE_MASTER = {
  "c-hr":    { front:240, rear:240 },
  "solio":   { front:240, rear:240 },
  "aqua":    { front:240, rear:240 },
  "fit":     { front:240, rear:240 },
  "yaris":   { front:240, rear:240 },
  "note":    { front:240, rear:240 },
  "swift":   { front:240, rear:240 },
  "mazda2":  { front:240, rear:240 },
  "wagonr":  { front:240, rear:240 },
};

// 全角→半角・トリム・小文字化・簡易正規化
function normalizeModelKey(s){
  if(!s) return "";
  // 全角→半角
  const toNarrow = s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
                    .replace(/　/g, ' ');
  const t = toNarrow.trim().toLowerCase().replace(/\s+/g,'').replace(/-/g,'');
  // 和名の簡易マップ
  if (t.includes("ソリオ") || s.includes("ソリオ")) return "solio";
  if (t.includes("アクア") || s.includes("アクア")) return "aqua";
  if (t.includes("フィット") || s.includes("フィット")) return "fit";
  if (t.includes("ヤリス") || s.includes("ヤリス")) return "yaris";
  if (t.includes("ノート") || s.includes("ノート")) return "note";
  if (t.includes("スイフト") || s.includes("スイフト")) return "swift";
  if (t.includes("マツダ2") || s.includes("マツダ2")) return "mazda2";
  if (t.includes("ワゴンr") || s.includes("ワゴンR") || s.includes("ワゴンｒ")) return "wagonr";
  // ローマ字・英数での一致
  if (t.includes("chr")) return "c-hr";
  if (t.includes("mazda2")) return "mazda2";
  if (t.includes("wagonr")) return "wagonr";
  if (t.includes("solio")) return "solio";
  if (t.includes("aqua")) return "aqua";
  if (t.includes("fit")) return "fit";
  if (t.includes("yaris")) return "yaris";
  if (t.includes("note")) return "note";
  if (t.includes("swift")) return "swift";
  return t;
}

// 規定圧の取得（Phase A: 内蔵マスタ）
function getPressure(modelInput){
  const key = normalizeModelKey(modelInput);
  const rec = PRESSURE_MASTER[key];
  if (rec) return { front: rec.front, rear: rec.rear, source: 'local', version: 'v3e' };
  return { front: null, rear: null, source: 'none', version: 'v3e' };
}

// モデル確定時に自動反映（空欄のときだけ上書き）
function setupPressureAutofill(){
  const modelEl = document.querySelector('#model');
  const preEl   = document.querySelector('#std-pre');
  const postEl  = document.querySelector('#std-post');
  if(!modelEl || !preEl || !postEl) return;

  const apply = ()=>{
    const res = getPressure(modelEl.value);
    if (res.front != null && preEl.value.trim() === '') preEl.value = res.front;
    if (res.rear  != null && postEl.value.trim() === '') postEl.value = res.rear;
    // 必要なら将来ここで小さなトースト表示も可能（今回はUI変更なし）
  };
  modelEl.addEventListener('blur', apply);
  modelEl.addEventListener('change', apply);
}


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
  resHeader.textContent = `${p.plate_full}\n${p.model}`;
  resTimes.innerHTML = `解錠　${p.unlock||'--:--'}<br>施錠　${p.lock||'--:--'}`;
  resLines.textContent  = lines;
  form.style.display='none'; resultCard.style.display='block'; window.scrollTo({top:0,behavior:'smooth'});
  await postToSheet(p);
});
document.getElementById('backBtn').addEventListener('click',()=>{ resultCard.style.display='none'; form.style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); });

