// Web App URL (unchanged)
const WEB_APP_URL = 'https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec'; // 既存のまま

// Utils
const qs  = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const wheelsOrder = ["RF","LF","LR","RR"]; // 入力順 → 結果表示順

// 小数点自動（5.5は 55 入力でOK）
function normalizeDepthInput(v){
  if (v === "" || v == null) return "";
  let s = String(v).trim();
  if (/^\d{2,3}$/.test(s)) {
    // 55 → 5.5,  605 → 60.5
    if (s.length === 2) return `${s[0]}.${s[1]}`;
    return `${s.slice(0,-1)}.${s.slice(-1)}`;
  }
  return s.replace(",", "."); // 万一のカンマ入力
}

// 時刻ボタン
function setTime(btn, key){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,"0");
  const mm = String(now.getMinutes()).padStart(2,"0");
  btn.textContent = `${key}　${hh}:${mm}`;
  btn.dataset.time = `${hh}:${mm}`;
}

// 結果描画
function renderResult(model){
  const wrap = qs("#result-body");
  wrap.innerHTML = "";

  const rows = [
    ["ステーション", model.station],
    ["車種", model.model],
    ["車番", model.plate],
    ["解錠", model.unlock || "--:--"],
    ["施錠", model.lock || "--:--"],
  ];

  rows.forEach(([k,v])=>{
    const row = document.createElement("div");
    row.className = "result-row";
    row.innerHTML = `<div class="result-label">${k}</div><div class="result-value">${v||""}</div>`;
    wrap.appendChild(row);
  });

  wheelsOrder.forEach(w=>{
    const wdata = model.wheels[w] || {};
    const block = document.createElement("div");
    block.className = "result-row";
    block.innerHTML = `
      <div class="result-label">${w}</div>
      <div class="result-value">残溝 ${wdata.depth??""} mm / 空気圧 ${wdata.pre??""}→${wdata.post??""} kPa / 製造年週 ${wdata.week??""}</div>
    `;
    wrap.appendChild(block);
  });
}

// 保存（完了→結果表示時のみ）
async function saveLog(model){
  try{
    const payload = {
      station: model.station,
      model:   model.model,
      plate:   model.plate,
      unlock:  model.unlock,
      lock:    model.lock,
      RF: model.wheels.RF,
      LF: model.wheels.LF,
      LR: model.wheels.LR,
      RR: model.wheels.RR,
      ts: new Date().toISOString()
    };

    // localStorage（前回表示用）
    localStorage.setItem("tire:last", JSON.stringify(payload));

    // GASへ送信（必要な場合のみ。URLがダミーなら無視）
    if (WEB_APP_URL && /https?:\/\//.test(WEB_APP_URL)) {
      await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
    }
  }catch(e){
    console.error(e);
  }
}

// 前回表示
function loadLast(){
  try{
    const raw = localStorage.getItem("tire:last");
    return raw ? JSON.parse(raw) : null;
  }catch(_){ return null; }
}

// 入力収集
function collectInput(){
  const model = {
    station: qs("#station").value.trim(),
    model:   qs("#model").value.trim(),
    plate:   qs("#plate").value.trim(),
    unlock:  qs("#btn-unlock").dataset.time || "",
    lock:    qs("#btn-lock").dataset.time || "",
    wheels: {}
  };

  qsa(".wheel-card").forEach(card=>{
    const w = card.dataset.wheel;
    const depth = normalizeDepthInput(qs(".input-depth", card).value);
    const pre   = qs(".input-press-pre",  card).value.trim();
    const post  = qs(".input-press-post", card).value.trim();
    const week  = qs(".input-week",       card).value.trim();
    model.wheels[w] = { depth, pre, post, week };
  });

  return model;
}

// 入力アドバンス（RF → LF → LR → RR）
function setupAutoAdvance(){
  wheelsOrder.forEach((w, idx)=>{
    const card = qs(`.wheel-card[data-wheel="${w}"]`);
    const inputs = [
      qs(".input-depth", card),
      qs(".input-press-pre", card),
      qs(".input-press-post", card),
      qs(".input-week", card),
    ];

    inputs.forEach((el, i)=>{
      el.addEventListener("keydown", (ev)=>{
        if (ev.key === "Enter"){
          ev.preventDefault();
          if (i < inputs.length-1){
            inputs[i+1].focus();
          }else{
            // 次の車輪へ
            const nextW = wheelsOrder[idx+1];
            if (nextW){
              qs(`.wheel-card[data-wheel="${nextW}"] .input-depth`).focus();
            }else{
              qs("#btn-submit").focus();
            }
          }
        }
      });
    });
  });
}

// ビュー切り替え
function show(id){
  qsa(".view").forEach(v=>v.classList.remove("active"));
  qs(id).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

// 初期化
function init(){
  // 時刻ボタン
  qs("#btn-unlock").addEventListener("click", ()=> setTime(qs("#btn-unlock"), "解錠"));
  qs("#btn-lock").addEventListener("click",   ()=> setTime(qs("#btn-lock"),   "施錠"));

  // 送信
  qs("#btn-submit").addEventListener("click", async ()=>{
    const ok = window.confirm("よろしいですか？");
    if (!ok) return;

    const model = collectInput();
    renderResult(model);
    await saveLog(model);

    show("#view-result");
  });

  // 戻る
  qs("#btn-back").addEventListener("click", ()=>{
    show("#view-input");
  });

  // 前回表示（任意で使う場合は結果ビューへ切替）
  const last = loadLast();
  if (last){
    // 例: コンソールに出しておく
    console.debug("last:", last);
  }

  // 入力アドバンス
  setupAutoAdvance();

  // 初期ビュー
  show("#view-input");
}

document.addEventListener("DOMContentLoaded", init);
