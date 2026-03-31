import { type SupportInputBar } from "./supportEngine";
import { runPoint21, type Point21Output } from "./point21Engine";

export type DecisionInput = {
  // 舊鏈相容
  quote?: {
    symbol?: string;
    code?: string;
    name?: string;
    price?: number;
    change?: number;
    pct?: number;
    changePercent?: number;
    volume?: number;
    error?: string;
  };
  model?: {
    action?: string;
    risk?: string;
    score?: number;
    reason?: string;
    breakout?: number;
    breakoutScore?: number;
    marketState?: string;
  };

  // 新鏈平鋪相容
  code?: string;
  symbol?: string;
  name?: string;
  price?: number;
  change?: number;
  pct?: number;
  changePercent?: number;
  volume?: number;

  breakout?: number;
  breakoutScore?: number;
  marketState?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;
  supportState?: string;
  supportReason?: string;

  // 三模組輸入
  point21?: Partial<Point21Output>;
  platform?: {
    platformScore?: number;
    platformState?: string;
    platformReady?: boolean;
    platformHigh?: number;
    platformLow?: number;
    platformReason?: string;
  };
  temperature?: {
    temperatureScore?: number;
    temperatureState?: string;
    temperatureAdvice?: string;
    temperatureReason?: string;
  };

  // point21 原始 teacher data（如果 fusion 尚未先跑 point21）
  teacher?: {
    pointValue?: number;
    simulatedPrice?: number;
    diffValue?: number;
  };

  bars?: SupportInputBar[];
};

export type DecisionResult = {
  // 顯示相容
  action: string;
  finalAction: string;
  risk: string;
  score: number;
  finalScore: number;
  rawScore: number;
  breakout: number;
  breakoutScore: number;
  reason: string;

  // 三模組分數透明化
  point21Score: number;
  point21Value: number;
  platformScore: number;
  temperatureScore: number;

  point21State: string;
  platformState: string;
  temperatureState: string;

  point21Reason: string;
  platformReason: string;
  temperatureReason: string;

  // 結構
  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportState: string;
  supportReason: string;

  // 市場
  marketState: string;

  // 風控
  stopLossPrice: number;
  trailingStopActive: boolean;
  trailingStopRule: string;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeQuote(input: DecisionInput) {
  const quote = input?.quote || {};

  const code = pickString(input?.code, input?.symbol, quote?.code, quote?.symbol);
  const name = pickString(input?.name, quote?.name, code);
  const price = pickNumber(input?.price, quote?.price);
  const change = pickNumber(input?.change, quote?.change);

  const pctRaw = pickNumber(
    input?.changePercent,
    input?.pct,
    quote?.changePercent,
    quote?.pct
  );

  const volume = pickNumber(input?.volume, quote?.volume);

  return {
    code,
    name,
    price: round2(price),
    change: round2(change),
    changePercent: round2(pctRaw),
    volume,
    error: pickString(quote?.error),
  };
}

function normalizeBreakout(input: DecisionInput): number {
  const model = input?.model || {};
  return clamp(
    round2(
      pickNumber(
        input?.breakout,
        input?.breakoutScore,
        model?.breakout,
        model?.breakoutScore
      )
    ),
    0,
    100
  );
}

function normalizeMarketState(input: DecisionInput): string {
  const model = input?.model || {};
  const state = pickString(input?.marketState, model?.marketState);

  if (!state) return "觀望";
  return state;
}

function derivePoint21(input: DecisionInput, price: number): Point21Output {
  if (input?.point21?.point21Score != null) {
    return {
      point21Score: clamp(round2(safeNumber(input.point21.point21Score, 0)), 0, 100),
      point21Value: clamp(Math.round(safeNumber(input.point21.point21Value, 0)), 0, 21),
      simulatedPrice: round2(safeNumber(input.point21.simulatedPrice, price)),
      diffValue: round2(safeNumber(input.point21.diffValue, 0)),
      point21State: pickString(input.point21.point21State, "弱") as "弱" | "中" | "強",
      point21Reason: pickString(input.point21.point21Reason, "無"),
    };
  }

  return runPoint21({
    price,
    bars: input?.bars || [],
    teacher: input?.teacher,
  });
}

function derivePlatform(input: DecisionInput) {
  const platformScore = clamp(
    round2(safeNumber(input?.platform?.platformScore, 0)),
    0,
    100
  );

  const platformState = pickString(
    input?.platform?.platformState,
    platformScore >= 70 ? "中繼平台" : platformScore >= 40 ? "整理平台" : "非平台"
  );

  const platformReady =
    typeof input?.platform?.platformReady === "boolean"
      ? input.platform.platformReady
      : platformScore >= 60;

  const platformReason = pickString(
    input?.platform?.platformReason,
    platformReady ? "平台結構可觀察" : "平台條件不足"
  );

  return {
    platformScore,
    platformState,
    platformReady,
    platformReason,
  };
}

function deriveTemperature(input: DecisionInput, changePercent: number) {
  const explicitScore = safeNumber(input?.temperature?.temperatureScore, Number.NaN);

  let temperatureScore = 0;
  if (Number.isFinite(explicitScore)) {
    temperatureScore = clamp(round2(explicitScore), 0, 100);
  } else {
    const absPct = Math.abs(changePercent);
    if (absPct <= 1.5) temperatureScore = 65;
    else if (absPct <= 3) temperatureScore = 50;
    else if (absPct <= 5) temperatureScore = 35;
    else temperatureScore = 20;
  }

  const temperatureState = pickString(
    input?.temperature?.temperatureState,
    temperatureScore >= 70 ? "熱" : temperatureScore >= 40 ? "溫" : "冷"
  );

  const temperatureReason = pickString(
    input?.temperature?.temperatureReason,
    temperatureState === "熱"
      ? "溫度偏熱"
      : temperatureState === "溫"
      ? "溫度正常"
      : "溫度偏冷"
  );

  return {
    temperatureScore,
    temperatureState,
    temperatureAdvice: pickString(input?.temperature?.temperatureAdvice),
    temperatureReason,
  };
}

function deriveSupport(input: DecisionInput) {
  const supportPrice = round2(safeNumber(input?.supportPrice, 0));
  const supportDays = Math.max(0, Math.round(safeNumber(input?.supportDays, 0)));
  const structureBroken = Boolean(input?.structureBroken);

  let supportState = pickString(input?.supportState);
  if (!supportState) {
    if (supportPrice <= 0) supportState = "無";
    else if (supportDays >= 3 && !structureBroken) supportState = "穩";
    else if (!structureBroken) supportState = "弱";
    else supportState = "破";
  }

  const supportReason = pickString(
    input?.supportReason,
    supportPrice > 0 ? `支撐 ${supportPrice}` : "尚無有效支撐資料"
  );

  return {
    supportPrice,
    supportDays,
    structureBroken,
    supportState,
    supportReason,
  };
}

function buildTrailingStopRule(finalScore: number, action: string): {
  trailingStopActive: boolean;
  trailingStopRule: string;
} {
  if (action !== "進攻") {
    return {
      trailingStopActive: false,
      trailingStopRule: "未啟動（目前不屬於進攻持有區）",
    };
  }

  if (finalScore >= 70) {
    return {
      trailingStopActive: true,
      trailingStopRule: "獲利達 +5% 啟動，從高點回撤 3% 出場",
    };
  }

  return {
    trailingStopActive: false,
    trailingStopRule: "未啟動（需先達 +5%）",
  };
}

function dedupeReasons(reasons: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of reasons.map((x) => String(x || "").trim()).filter(Boolean)) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }

  return out.join("；") || "無";
}

export function runDecision(input: DecisionInput): DecisionResult {
  const quote = normalizeQuote(input);
  const breakoutScore = normalizeBreakout(input);
  const marketState = normalizeMarketState(input);

  const point21 = derivePoint21(input, quote.price);
  const platform = derivePlatform(input);
  const temperature = deriveTemperature(input, quote.changePercent);
  const support = deriveSupport(input);

  const point21Score = clamp(round2(point21.point21Score), 0, 100);
  const platformScore = clamp(round2(platform.platformScore), 0, 100);
  const temperatureScore = clamp(round2(temperature.temperatureScore), 0, 100);

  // 第一代評分核心：21點數 / 平台 / 溫度計
  const finalScore = clamp(
    round2(point21Score * 0.4 + platformScore * 0.35 + temperatureScore * 0.25),
    0,
    100
  );

  const rawScore = finalScore;

  let action: "進攻" | "觀望" | "防守" = "觀望";
  let risk: "低" | "中" | "高" = "中";

  if (support.structureBroken) {
    action = "防守";
    risk = "高";
  } else if (quote.changePercent <= -3) {
    action = "防守";
    risk = "高";
  } else if (finalScore >= 70 && platform.platformReady && !support.structureBroken) {
    action = "進攻";
    risk = "低";
  } else if (finalScore >= 45) {
    action = "觀望";
    risk = "中";
  } else {
    action = "防守";
    risk = "中";
  }

  if (marketState === "防守" || marketState === "修正") {
    action = "防守";
    if (risk !== "高") risk = "中";
  }

  const reasons: string[] = [];

  if (quote.changePercent <= -3) {
    reasons.push("跌幅過大");
  }

  reasons.push(point21.point21Reason);
  reasons.push(platform.platformReason);
  reasons.push(temperature.temperatureReason);

  if (support.supportPrice > 0) {
    reasons.push(support.supportReason);
  } else {
    reasons.push("尚無有效支撐資料");
  }

  if (support.structureBroken && support.supportPrice > 0) {
    reasons.push(`跌破支撐 ${support.supportPrice}`);
  }

  if (marketState === "防守" || marketState === "修正") {
    reasons.push(`市場狀態=${marketState}`);
  }

  if (breakoutScore > 0) {
    if (breakoutScore >= 60) reasons.push("起爆條件偏強");
    else reasons.push("起爆尚未完成");
  }

  const { trailingStopActive, trailingStopRule } = buildTrailingStopRule(finalScore, action);

  const stopLossPrice = support.supportPrice > 0 ? support.supportPrice : 0;

  return {
    action,
    finalAction: action,
    risk,
    score: finalScore,
    finalScore,
    rawScore,
    breakout: breakoutScore,
    breakoutScore,
    reason: dedupeReasons(reasons),

    point21Score,
    point21Value: point21.point21Value,
    platformScore,
    temperatureScore,

    point21State: point21.point21State,
    platformState: platform.platformState,
    temperatureState: temperature.temperatureState,

    point21Reason: point21.point21Reason,
    platformReason: platform.platformReason,
    temperatureReason: temperature.temperatureReason,

    supportPrice: support.supportPrice,
    supportDays: support.supportDays,
    structureBroken: support.structureBroken,
    supportState: support.supportState,
    supportReason: support.supportReason,

    marketState,

    stopLossPrice,
    trailingStopActive,
    trailingStopRule,
  };
}

export default runDecision;
