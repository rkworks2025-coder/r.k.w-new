// ===== URLパラメータ取得 =====
function getQueryParams() {
  const params = {};
  const q = window.location.search.replace(/^\?/, "");
  if (!q) return params;
  q.split("&").forEach(p => {
    const [k, v] = p.split("=");
    if (k) params[k] = decodeURIComponent(v || "");
  });
  return params;
}

// ===== 画面切替 =====
function showScreen(idToShow) {
  document.querySelectorAll(".screen").forEach(sec => sec.classList.remove("active"));
  document.getElementById(idToShow).classList.add("active");
}

// ===== 残溝の自動小数点変換（55 → 5.5） =====
function setupAutoDecimal(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => {
      const v = el.value.trim();
      if (/^\d{2}$/.test(v)) {
        el.value = (parseInt(v, 10) / 10).toFixed(1);
      }
    });
  });
}

// ===== 保存キー生成（車両単位：plate + station） =====
function buildKey(plate, station) {
  const p = (plate || "").replace(/\s+/g, "");
  const s = (station || "").replace(/\s+/g, "");
  return `tirelog_${p}_${s}`;
}

// ===== 結果表示の整形 =====
function renderResult(data) {
  // ヘッダ
  const station = data.station || "";
  const carLine = `${data.plate || ""} ${data.model || ""}`.trim();
  const savedAt = data.savedAt || "";

  document.getElementById("result-station").textContent = station;
  document.getElementById("result-car").textContent = carLine;
  document.getElementById("result-savedat").textContent = savedAt ? `保存: ${savedAt}` : "";

  // 会社アプリの入力順に合わせた表示（製造年週 → 残溝 → 空気圧）
  const lines = [];

  lines.push("【製造年週】");
  lines.push(`  右前: ${data.ww_rf || "-"}`);
  lines.push(`  左前: ${data.ww_lf || "-"}`);
  lines.push(`  左後: ${data.ww_lr || "-"}`);
  lines.push(`  右後: ${data.ww_rr || "-"}`);
  lines.push("");

  lines.push("【残溝(mm)】");
  lines.push(`  右前: ${data.tread_rf || "-"}`);
  lines.push(`  左前: ${data.tread_lf || "-"}`);
  lines.push(`  左後: ${data.tread_lr || "-"}`);
  lines.push(`  右後: ${data.tread_rr || "-"}`);
  lines.push("");

  lines.push("【空気圧(kPa)】");
  lines.push(`  右前: ${data.press_rf || "-"}`);
  lines.push(`  左前: ${data.press_lf || "-"}`);
  lines.push(`  左後: ${data.press_lr || "-"}`);
  lines.push(`  右後: ${data.press_rr || "-"}`);

  // 文字化け防止のため textContent でプレーンテキストとして挿入
  document.getElementById("result-body").textContent = lines.join("\n");
}

// ===== 起動処理 =====
document.addEventListener("DOMContentLoaded", () => {
  const params = getQueryParams();
  const stationInfo = document.getElementById("station-info");
  const carInfo = document.getElementById("car-info");

  // ステーション名 + 車両表示
  if (params.station) stationInfo.textContent = params.station;
  if (params.plate || params.model) carInfo.textContent = `${params.plate || ""} ${params.model || ""}`.trim();

  // 残溝の自動小数点（55 → 5.5）
  setupAutoDecimal(["tread_rf","tread_lf","tread_lr","tread_rr"]);

  // リロード対策：同一車両の直近結果があれば結果画面で再表示
  const key = buildKey(params.plate, params.station);
  const last = localStorage.getItem(key);
  if (last) {
    try {
      const data = JSON.parse(last);
      renderResult(data);
      showScreen("result-screen");
    } catch (e) {
      // 破損時は無視して入力画面に
      showScreen("input-screen");
    }
  } else {
    showScreen("input-screen");
  }

  // 完了 → 結果表示
  document.getElementById("complete-btn").addEventListener("click", () => {
    const now = new Date().toLocaleString();

    const data = {
      plate: params.plate || "",
      station: params.station || "",
      model: params.model || "",
      tread_rf: document.getElementById("tread_rf").value.trim(),
      tread_lf: document.getElementById("tread_lf").value.trim(),
      tread_lr: document.getElementById("tread_lr").value.trim(),
      tread_rr: document.getElementById("tread_rr").value.trim(),
      press_rf: document.getElementById("press_rf").value.trim(),
      press_lf: document.getElementById("press_lf").value.trim(),
      press_lr: document.getElementById("press_lr").value.trim(),
      press_rr: document.getElementById("press_rr").value.trim(),
      ww_rf: document.getElementById("ww_rf").value.trim(),
      ww_lf: document.getElementById("ww_lf").value.trim(),
      ww_lr: document.getElementById("ww_lr").value.trim(),
      ww_rr: document.getElementById("ww_rr").value.trim(),
      savedAt: now
    };

    // 車両ごとに確定データのみ保存（入力途中は保存しない）
    localStorage.setItem(buildKey(data.plate, data.station), JSON.stringify(data));

    // 結果表示へ
    renderResult(data);
    showScreen("result-screen");
  });

  // 戻る（入力に戻る）
  document.getElementById("back-btn").addEventListener("click", () => {
    showScreen("input-screen");
  });
});
