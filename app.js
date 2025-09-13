const WEB_APP_URL = 'https://script.google.com/macros/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec'; // 既存に合わせて差し替え可

const qs=(s,e=document)=>e.querySelector(s);
const qsa=(s,e=document)=>Array.from(e.querySelectorAll(s));
const wheels=["RF","LF","LR","RR"];

function nowText(){
  const d=new Date();
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  const hh=String(d.getHours()).padStart(2,'0');
  const m =String(d.getMinutes()).padStart(2,'0');
  return `${mm}/${dd} ${hh}:${m}`;
}
function setClock(){ qs('#now').textContent = nowText(); }

function toDepth(s){
  s = String(s||'').trim();
  if(!s) return '';
  if(/^\d{2,3}$/.test(s)){
    if(s.length===2) return `${s[0]}.${s[1]}`;
    return `${s.slice(0,-1)}.${s.slice(-1)}`;
  }
  return s.replace(',','.');
}

function recordTime(targetId){
  const d=new Date();
  const hh=String(d.getHours()).padStart(2,'0');
  const mm=String(d.getMinutes()).padStart(2,'0');
  qs(targetId).textContent = `${hh}:${mm}`;
  qs(targetId).dataset.time = `${hh}:${mm}`;
}

function collect(){
  const model={
    station: qs('#station').value.trim(),
    car: qs('#model').value.trim(),
    plate: qs('#plate').value.trim(),
    stdPre: qs('#std-pre').value.trim(),
    stdPost: qs('#std-post').value.trim(),
    unlock: qs('#unlock-time').dataset.time || '',
    lock: qs('#lock-time').dataset.time || '',
    ts: nowText(),
    wheels:{}
  };
  qsa('.wheel-row').forEach(row=>{
    const w=row.dataset.wheel;
    model.wheels[w]={
      depth: toDepth(qs('.input-depth',row).value),
      press: qs('.input-press',row).value.trim(),
      week: qs('.input-week',row).value.trim()
    };
  });
  return model;
}

function renderResult(m){
  const lines=[];
  // 上部2行（元安定版に近い順）
  if(m.plate) lines.push(m.plate);
  if(m.car)   lines.push(m.car);
  if(m.unlock) lines.push(`解錠　 ${m.unlock}`);
  else lines.push(`解錠　 --:--`);
  if(m.lock) lines.push(`施錠　 ${m.lock}`);
  else lines.push(`施錠　 --:--`);

  // タイヤ行
  wheels.forEach(w=>{
    const d=m.wheels[w]||{};
    const a=[d.depth||'', d.press||'', d.week||'', w].join(' ');
    lines.push(a);
  });

  // フッター時刻
  lines.push('');
  lines.push(m.ts);

  qs('#result-txt').textContent = lines.join('\n');
}

async function save(m){
  try{
    localStorage.setItem('tire:last', JSON.stringify(m));
    if (WEB_APP_URL && /https?:\/\//.test(WEB_APP_URL)){
      await fetch(WEB_APP_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(m)});
    }
  }catch(e){ console.error(e); }
}

function setupAdvance(){
  // Enterで次へ（RF→LF→LR→RR）
  wheels.forEach((w, idx)=>{
    const row = qs(`.wheel-row[data-wheel="${w}"]`);
    const inputs = [qs('.input-depth',row), qs('.input-press',row), qs('.input-week',row)];
    inputs.forEach((el,i)=>{
      el.addEventListener('keydown', ev=>{
        if(ev.key==='Enter'){
          ev.preventDefault();
          if(i<inputs.length-1) inputs[i+1].focus();
          else{
            const next = wheels[idx+1];
            if(next) qs(`.wheel-row[data-wheel="${next}"] .input-depth`).focus();
            else qs('#btn-submit').focus();
          }
        }
      });
    });
  });
}

function show(id){
  qsa('.view').forEach(v=>v.classList.remove('active'));
  qs(id).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

function init(){
  setClock(); setInterval(setClock, 15*1000);

  qs('#btn-unlock').addEventListener('click', ()=>recordTime('#unlock-time'));
  qs('#btn-lock').addEventListener('click', ()=>recordTime('#lock-time'));

  qs('#btn-submit').addEventListener('click', async ()=>{
    if(!confirm('よろしいですか？')) return;
    const m = collect();
    renderResult(m);
    await save(m);
    show('#view-result');
  });

  qs('#btn-back').addEventListener('click', ()=> show('#view-input'));

  setupAdvance();
}
document.addEventListener('DOMContentLoaded', init);
