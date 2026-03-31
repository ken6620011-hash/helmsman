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
 * 門檻鎖定版
 *
 * 規則：
 * 1. 進攻：score >= 70
 * 2. 觀望：40 <= score < 70
 * 3. 防守：score < 40
 *
 * 額外硬規則：
 * - pct <= -2 → 直接防守
 * - 無效資料 / price <= 0 → 直接防守
 * - marketState = CORRECTION → 最高只能觀望，不可進攻
 */
export function runDecision(q: any): DecisionResult {
  if (!q) {
    return {
      action: "防守",
      risk: "高",
      score: 0,
      reason: "資料缺失",
    };
  }

  const price = safeNumber(q?.price, 0);
  const pct = safeNumber(q?.pct, 0);
  const volume = safeNumber(q?.volume, 0);

  // 支援不同命名
  const rawMarketState = String(
    q?.marketState ??
      q?.state ??
      q?.market_state ??
      ""
  ).toUpperCase();

  if (price <= 0) {
    return {
      action: "防守",
      risk: "高",
      score: 0,
      reason: "無效資料",
    };
  }

  // ===== 因子1：動能 HRS =====
  let HRS = 50;
  if (pct > 3) HRS = 90;
  else if (pct > 1) HRS = 70;
  else if (pct > -1) HRS = 50;
  else if (pct > -3) HRS = 30;
  else HRS = 10;

  // ===== 因子2：波動 HTI =====
  let HTI = clamp(Math.abs(pct) * 25, 0, 100);

  // ===== 因子3：結構 BREAK =====
  let BREAK = 40;
  if (pct > 2) BREAK = 80;
  else if (pct > 0.5) BREAK = 60;
  else if (pct > -0.5) BREAK = 40;
  else BREAK = 20;

  // ===== 因子4：量能 Volume =====
  let VOL = 40;
  if (volume > 20000) VOL = 80;
  else if (volume > 10000) VOL = 60;
  else if (volume > 3000) VOL = 40;
  else VOL = 20;

  // ===== Gate =====
  let gatePenalty = 0;

  if (pct < 0 && volume < 3000) {
    gatePenalty -= 20;
  }

  if (pct <= -2) {
    gatePenalty -= 15;
  }

  // ===== 多因子加權 =====
  const scoreRaw =
    0.35 * HRS +
    0.25 * HTI +
    0.2 * BREAK +
    0.2 * VOL +
    gatePenalty;

  let score = Math.round(clamp(scoreRaw, 0, 100));

  // ===== 門檻鎖定 =====
  let action: DecisionResult["action"] = "觀望";
  let risk: DecisionResult["risk"] = "中";
  let reason = "盤整";

  // 硬規則1：大跌直接防守
  if (pct <= -2) {
    action = "防守";
    risk = "高";
    reason = "跌幅過大";
    return { action, risk, score, reason };
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

  // 硬規則2：修正盤最高只能觀望
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
