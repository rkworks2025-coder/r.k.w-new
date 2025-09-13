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

  // ステーション名と車両情報の表示
  const stationInfo = document.getElementById("station-info");
  const carInfo = document.getElementById("car-info");

  if (params.station) {
    stationInfo.textContent = params.station;
  }
  if (params.plate || params.model) {
    carInfo.textContent = `${params.plate || ""} ${params.model || ""}`;
  }

  // 小数点自動変換（残溝）
  ["tread_rf","tread_lf","tread_lr","tread_rr"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => {
      if (/^\d{2}$/.test(el.value)) {
        el.value = (parseInt(el.value, 10) / 10).toFixed(
