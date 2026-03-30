type QuoteLike = {
  symbol?: string;
  price?: number;
  change?: number;
  pct?: number;
  sector?: string;
  error?: string;
};

export function runModelEngine(q: QuoteLike) {
  const price = Number(q?.price ?? 0);
  const change = Number(q?.change ?? 0);
  const pct = Number(q?.pct ?? 0);

  // 資料異常防呆
  if (!price || price <= 0 || q?.error) {
    return {
      score: 0,
      trend: "資料異常",
      risk: "高",
      action: "防守",

      hci: 0,
      hrs: 0,
      hti: 0,
      hpq: 0,
      breakout: 0,

      structure: "資料異常",
      platform: "資料異常",
      supportDays: 0,
      supportStatus: "資料異常",
      supportReason: q?.error || "資料源暫時無回應",

      volume: "資料異常",
      monthly: "資料異常",

      entryType: "禁止",
      entryTime: "禁止進場",
      entryReason: "市場資料異常，等待資料恢復。",

      stopLoss: 0,
      takeProfit: 0,
      trailingStop: 0,

      dataValid: false,
      dataWarning: q?.error || "資料源暫時無回應",
    };
  }

  const absPct = Math.abs(pct);

  const structure =
    pct >= 1.5 ? "上升" :
    pct <= -1.5 ? "下降" :
    "盤整";

  const platform =
    pct >= 0.5 ? "平台上" :
    pct >= -1 ? "平台附近" :
    "平台外";

  const supportDays =
    pct >= 0 ? 4 :
    pct > -1.5 ? 2 :
    1;

  const supportStatus = supportDays >= 3 ? "穩定" : "不穩";
  const supportReason =
    supportDays >= 3
      ? `支撐守穩 ${supportDays} 天，主力測試通過`
      : "支撐未完全成立";

  const hci =
    pct >= 2 ? 78 :
    pct >= 0.5 ? 62 :
    pct > -1 ? 50 :
    pct > -2 ? 38 :
    25;

  const hrs =
    pct >= 2 ? 80 :
    pct >= 0.5 ? 64 :
    pct > -1 ? 50 :
    pct > -2 ? 36 :
    24;

  const hti =
    absPct >= 3 ? 75 :
    absPct >= 1.5 ? 58 :
    45;

  const hpq =
    supportDays >= 4 ? 68 :
    supportDays >= 3 ? 58 :
    supportDays >= 2 ? 48 :
    35;

  const breakout =
    pct >= 3 ? 82 :
    pct >= 1.5 ? 68 :
    pct >= 0 ? 50 :
    pct > -1.5 ? 40 :
    25;

  const score = Math.round(
    hci * 0.28 +
    hrs * 0.22 +
    hti * 0.15 +
    hpq * 0.20 +
    breakout * 0.15
  );

  const trend =
    score >= 70 ? "上升" :
    score <= 40 ? "下降" :
    "盤整";

  const risk =
    score >= 70 ? "低" :
    score <= 40 ? "高" :
    "中";

  let action: "進場" | "續看" | "觀望" | "防守" = "觀望";
  let entryType = "等待";
  let entryTime = "暫不進場";
  let entryReason = "尚未突破，等待訊號";

  if (score >= 72 && breakout >= 70 && supportDays >= 3) {
    action = "進場";
    entryType = "突破";
    entryTime = "可進場";
    entryReason = "起爆成立，結構與支撐同步配合。";
  } else if (score >= 60 && supportDays >= 3) {
    action = "續看";
    entryType = "觀察";
    entryTime = "等待確認";
    entryReason = "條件接近完成，但尚未正式突破。";
  } else if (score <= 40) {
    action = "防守";
    entryType = "禁止";
    entryTime = "禁止進場";
    entryReason = "總分不足，先防守。";
  }

  const stopLoss = Number((price * 0.93).toFixed(2));
  const takeProfit = Number((price * 1.08).toFixed(2));
  const trailingStop = Number((price * 0.95).toFixed(2));

  return {
    score,
    trend,
    risk,
    action,

    hci,
    hrs,
    hti,
    hpq,
    breakout,

    structure,
    platform,
    supportDays,
    supportStatus,
    supportReason,

    volume: absPct >= 2 ? "放量" : absPct >= 0.8 ? "正常" : "量縮",
    monthly: "正常",

    entryType,
    entryTime,
    entryReason,

    stopLoss,
    takeProfit,
    trailingStop,

    dataValid: true,
    dataWarning: "",
  };
}
