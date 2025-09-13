// URLパラメータから車両情報を取得
function getQueryParams() {
  const params = {};
  window.location.search.substring(1).split("&").forEach(p => {
    const [k, v] = p.split("=");
    if (k) params[k] = decodeURIComponent(v);
  });
  return params;
}

document.addEventListener("DOMContentLoaded", () => {
  const params = getQueryParams();
  const carInfo = document.getElementById("car-info");

  if (params.plate || params.station || params.model) {
    carInfo.textContent = `${params.plate || ""} ${params.model || ""} @${params.station || ""}`;
  }

  // 小数点自動変換（残溝）
  ["tread_rf","tread_lf","tread_lr","tread_rr"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => {
      if (/^\d{2}$/.test(el.value)) {
        el.value = (parseInt(el.value, 10) / 10).toFixed(1);
      }
    });
  });

  // 保存ボタン
  document.getElementById("save-btn").addEventListener("click", () => {
    const data = {
      plate: params.plate || "",
      station: params.station || "",
      model: params.model || "",
      tread_rf: document.getElementById("tread_rf").value,
      tread_lf: document.getElementById("tread_lf").value,
      tread_lr: document.getElementById("tread_lr").value,
      tread_rr: document.getElementById("tread_rr").value,
      press_rf: document.getElementById("press_rf").value,
      press_lf: document.getElementById("press_lf").value,
      press_lr: document.getElementById("press_lr").value,
      press_rr: document.getElementById("press_rr").value,
      ww_rf: document.getElementById("ww_rf").value,
      ww_lf: document.getElementById("ww_lf").value,
      ww_lr: document.getElementById("ww_lr").value,
      ww_rr: document.getElementById("ww_rr").value,
      savedAt: new Date().toLocaleString()
    };

    localStorage.setItem("tirelog_last", JSON.stringify(data));
    document.getElementById("result").textContent = JSON.stringify(data, null, 2);
    alert("保存しました");
  });

  // 前回保存データを表示
  const last = localStorage.getItem("tirelog_last");
  if (last) {
    document.getElementById("result").textContent = last;
  }
});
