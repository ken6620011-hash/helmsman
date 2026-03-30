export type DecisionResult = {
  action: "進攻" | "觀望" | "防守";
  risk: "低" | "中" | "高";
  score: number;
  reason: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * 防守分層版
 *
 * 原則：
 * 1. 動作(action) 與 分數(score) 分離
 * 2. pct <= -2 時，動作直接防守，但分數仍保留強弱差異
 * 3. 防守區不再全部卡死同分
 */
export function runDecision(q: any): DecisionResult {
  if (!q) {
    return {
      action: "防守",
      risk: "高",
      score: 18,
      reason: "資料缺失",
    };
  }

  const price = safeNumber(q?.price, 0);
  const pct = safeNumber(q?.pct ?? q?.changePercent, 0);
  const volume = safeNumber(q?.volume, 0);

  const rawMarketState = String(
    q?.marketState ?? q?.state ?? q?.market_state ?? ""
  ).toUpperCase();

  if (price <= 0) {
    return {
      action: "防守",
      risk: "高",
      score: 18,
      reason: "無效資料",
    };
  }

  // ===== 因子1：動能 HRS =====
  let HRS = 50;
  if (pct >= 5) HRS = 95;
  else if (pct >= 3) HRS = 85;
  else if (pct >= 1) HRS = 70;
  else if (pct >= -1) HRS = 55;
  else if (pct >= -2) HRS = 42;
  else if (pct >= -3) HRS = 32;
  else if (pct >= -5) HRS = 22;
  else HRS = 12;

  // ===== 因子2：結構 BREAK =====
  let BREAK = 45;
  if (pct >= 3) BREAK = 82;
  else if (pct >= 1) BREAK = 68;
  else if (pct >= -1) BREAK = 52;
  else if (pct >= -2) BREAK = 40;
  else if (pct >= -3) BREAK = 30;
  else if (pct >= -5) BREAK = 22;
  else BREAK = 15;

  // ===== 因子3：量能 VOL =====
  let VOL = 42;
  if (volume >= 50000) VOL = 85;
  else if (volume >= 20000) VOL = 72;
  else if (volume >= 10000) VOL = 60;
  else if (volume >= 3000) VOL = 48;
  else if (volume > 0) VOL = 35;
  else VOL = 40; // 無 volume 時不重罰，避免全部同分

  // ===== 因子4：穩定度 STAB（跌越深越低，但保留層次）=====
  let STAB = 55;
  if (pct >= 2) STAB = 72;
  else if (pct >= 0) STAB = 60;
  else if (pct >= -1) STAB = 52;
  else if (pct >= -2) STAB = 44;
  else if (pct >= -3) STAB = 34;
  else if (pct >= -4) STAB = 28;
  else if (pct >= -5) STAB = 22;
  else STAB = 16;

  // ===== 懲罰項（保留，但不打到同一地板）=====
  let gatePenalty = 0;

  if (pct < 0 && volume > 0 && volume < 3000) {
    gatePenalty -= 4;
  }

  if (pct <= -2) {
    gatePenalty -= 4;
  }

  if (pct <= -3) {
    gatePenalty -= 3;
  }

  if (pct <= -4.5) {
    gatePenalty -= 3;
  }

  // ===== 加權分數 =====
  const scoreRaw =
    0.34 * HRS +
    0.24 * BREAK +
    0.20 * VOL +
    0.22 * STAB +
    gatePenalty;

  let score = Math.round(clamp(scoreRaw, 12, 100));

  // ===== 動作 / 風險 / 原因 =====
  let action: DecisionResult["action"] = "觀望";
  let risk: DecisionResult["risk"] = "中";
  let reason = "分數落在觀望區";

  // 硬規則：跌幅超過 -2 直接防守，但分數保留
  if (pct <= -2) {
    action = "防守";

    if (pct <= -4.5) {
      risk = "高";
      reason = "跌幅過大且弱勢明顯";
    } else if (pct <= -3) {
      risk = "高";
      reason = "跌幅過大";
    } else {
      risk = "高";
      reason = "轉弱進入防守";
    }

    return {
      action,
      risk,
      score,
      reason,
    };
  }

  if (score >= 70) {
    action = "進攻";
    risk = "低";
    reason = "分數達進攻門檻";
  } else if (score >= 40) {
    action = "觀望";
    risk = "中";
    reason = "分數落在觀望區";
  } else {
    action = "防守";
    risk = "高";
    reason = "分數落在防守區";
  }

  // 修正盤限制：禁止進攻，但保留分數
  if (rawMarketState === "CORRECTION" && action === "進攻") {
    action = "觀望";
    risk = "高";
    reason = "市場修正，禁止進攻";
  }

  return {
    action,
    risk,
    score,
    reason,
  };
}
