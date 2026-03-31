import { calculateSupportFromBars, type SupportInputBar } from "./supportEngine";

export type DecisionInput = {
  code?: string;
  symbol?: string;
  name?: string;

  price?: number;
  close?: number;
  change?: number;
  pct?: number;
  changePercent?: number;

  score?: number;
  rawScore?: number;
  breakout?: number;
  breakoutScore?: number;
  risk?: string;
  riskLevel?: string;
  reason?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;

  // 最近K棒（由舊到新）
  bars?: SupportInputBar[];

  // 其他可能來自 fusion / model / market 的欄位
  marketState?: string;
  trend?: string;
  sector?: string;
  volume?: number;
};

export type DecisionResult = {
  code: string;
  name: string;

  price: number;
  change: number;
  changePercent: number;

  // 分數保留：不再因為防守就歸零
  score: number;
  rawScore: number;

  breakout: number;

  action: string;
  finalAction: string;
  risk: string;
  reason: string;

  marketState: string;

  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportReason: string;

  trailingStopActive: boolean;
  trailingStopRule: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

function normalizeCode(input: DecisionInput): string {
  return String(input?.code || input?.symbol || "");
}

function normalizeName(input: DecisionInput): string {
  return String(input?.name || normalizeCode(input));
}

function normalizePrice(input: DecisionInput): number {
  const price = safeNumber(input?.price, 0);
  if (price > 0) return price;
  return safeNumber(input?.close, 0);
}

function normalizeChangePercent(input: DecisionInput): number {
  const pct =
    input?.changePercent ??
    input?.pct;

  const pctNum = Number(pct);
  if (Number.isFinite(pctNum)) return round2(pctNum);

  const price = normalizePrice(input);
  const change = safeNumber(input?.change, 0);
  if (price <= 0) return 0;

  const prevClose = price - change;
  if (prevClose <= 0) return 0;

  return round2((change / prevClose) * 100);
}

function normalizeRisk(input: DecisionInput): string {
  const raw = String(input?.risk || input?.riskLevel || "").trim();

  if (!raw) return "中";

  if (raw.includes("高")) return "高";
  if (raw.includes("低")) return "低";
  return "中";
}

function normalizeMarketState(input: DecisionInput): string {
  const s = String(input?.marketState || "").trim();

  if (!s) return "觀望";
  if (s.includes("攻")) return "攻擊";
  if (s.includes("防")) return "防守";
  if (s.includes("修")) return "修正";
  if (s.includes("觀")) return "觀望";

  return s;
}

function computeBaseAction(params: {
  rawScore: number;
  breakout: number;
  risk: string;
  marketState: string;
}): string {
  const { rawScore, breakout, risk, marketState } = params;

  if (marketState === "修正" || marketState === "防守") {
    return "防守";
  }

  if (risk === "高" && rawScore < 60) {
    return "防守";
  }

  if (rawScore >= 70 && breakout >= 60 && risk !== "高") {
    return "進攻";
  }

  if (rawScore >= 55) {
    return "觀望";
  }

  return "防守";
}

function computeTrailingStopRule(rawScore: number): {
  trailingStopActive: boolean;
  trailingStopRule: string;
} {
  if (rawScore >= 70) {
    return {
      trailingStopActive: true,
      trailingStopRule: "獲利達 +5% 啟動，從高點回撤 3% 出場",
    };
  }

  if (rawScore >= 55) {
    return {
      trailingStopActive: false,
      trailingStopRule: "尚未啟動（需先達 +5%）",
    };
  }

  return {
    trailingStopActive: false,
    trailingStopRule: "未啟動（目前不屬於進攻持有區）",
  };
}

function buildMainReason(parts: string[]): string {
  const filtered = parts
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return filtered.length ? filtered.join("；") : "無";
}

export function runDecision(input: DecisionInput): DecisionResult {
  const code = normalizeCode(input);
  const name = normalizeName(input);

  const price = normalizePrice(input);
  const change = safeNumber(input?.change, 0);
  const changePercent = normalizeChangePercent(input);

  const rawScore = Math.max(
    0,
    round2(
      safeNumber(
        input?.rawScore,
        safeNumber(input?.score, 0)
      )
    )
  );

  const breakout = Math.max(
    0,
    round2(
      safeNumber(
        input?.breakout,
        safeNumber(input?.breakoutScore, 0)
      )
    )
  );

  const risk = normalizeRisk(input);
  const marketState = normalizeMarketState(input);

  // ===== 支撐模組 =====
  let supportPrice = safeNumber(input?.supportPrice, 0);
  let supportDays = safeNumber(input?.supportDays, 0);
  let structureBroken = Boolean(input?.structureBroken);
  let supportReason = "";

  if (Array.isArray(input?.bars) && input.bars.length >= 5) {
    const support = calculateSupportFromBars(input.bars, price);
    supportPrice = support.supportPrice;
    supportDays = support.supportDays;
    structureBroken = support.structureBroken;
    supportReason = support.reason;
  } else {
    if (supportPrice > 0) {
      if (!supportDays) supportDays = 0;
      if (!supportReason) {
        supportReason = structureBroken
          ? `跌破支撐 ${supportPrice}`
          : `支撐 ${supportPrice} 尚待確認`;
      }
    } else {
      supportReason = "尚無有效支撐資料";
    }
  }

  // ===== 先保留原始分數，不再歸零 =====
  const score = rawScore;

  // ===== 基礎決策 =====
  let action = computeBaseAction({
    rawScore,
    breakout,
    risk,
    marketState,
  });

  const reasons: string[] = [];

  // ===== 跌幅風控覆蓋，但不再把 score 歸零 =====
  if (changePercent <= -3) {
    action = "防守";
    reasons.push("跌幅過大");
  }

  // ===== 結構破壞覆蓋 =====
  if (structureBroken) {
    action = "防守";
    reasons.push("跌破支撐");
  }

  // ===== 盤勢覆蓋 =====
  if (marketState === "防守" || marketState === "修正") {
    action = "防守";
    reasons.push(`市場狀態=${marketState}`);
  }

  // ===== breakout / score 補充理由 =====
  if (rawScore >= 70) {
    reasons.push("分數達進攻區");
  } else if (rawScore >= 55) {
    reasons.push("分數在觀察區");
  } else {
    reasons.push("分數偏弱");
  }

  if (breakout >= 60) {
    reasons.push("起爆條件偏強");
  } else if (breakout > 0) {
    reasons.push("起爆尚未完成");
  }

  if (supportReason) {
    reasons.push(supportReason);
  }

  if (String(input?.reason || "").trim()) {
    reasons.push(String(input.reason).trim());
  }

  const { trailingStopActive, trailingStopRule } = computeTrailingStopRule(rawScore);

  return {
    code,
    name,

    price,
    change,
    changePercent,

    score,
    rawScore,

    breakout,

    action,
    finalAction: action,
    risk,
    reason: buildMainReason(reasons),

    marketState,

    supportPrice: round2(supportPrice),
    supportDays,
    structureBroken,
    supportReason,

    trailingStopActive,
    trailingStopRule,
  };
}
