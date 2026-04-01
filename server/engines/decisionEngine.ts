import runRiskEngine from "./riskEngine";

export type DecisionInput = {
  code?: string;
  name?: string;

  price?: number;
  change?: number;
  changePercent?: number;

  point21Score?: number;
  point21Value?: number;
  simulatedPrice?: number;
  diffValue?: number;
  upperBound?: number;
  point21State?: string;
  point21Reason?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;
  supportReason?: string;

  marketState?: string;

  entryPrice?: number;
  highestPriceSinceEntry?: number;
  trailingStopEnabled?: boolean;
};

export type DecisionResult = {
  action: string;
  finalAction: string;
  risk: string;

  score: number;
  finalScore: number;
  rawScore: number;

  breakout: number;
  breakoutScore: number;

  reason: string;
  marketState: string;

  point21Score: number;
  point21Value: number;
  simulatedPrice: number;
  diffValue: number;
  upperBound: number;
  point21State: string;
  point21Reason: string;

  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportReason: string;

  stopLossPrice: number;
  trailingStopActive: boolean;
  trailingStopPrice: number;
  trailingStopRule: string;

  structureRisk: string;
  timeValidation: string;
  priceStopStatus: string;
  canHold: boolean;
  shouldExit: boolean;
  riskReason: string;
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

function buildBaseMarketState(
  structureBroken: boolean,
  point21Value: number
): string {
  if (structureBroken) return "防守";
  if (point21Value >= 18) return "攻擊";
  if (point21Value >= 7) return "觀望";
  return "防守";
}

function buildBaseAction(
  point21Value: number,
  structureBroken: boolean,
  changePercent: number
): "進攻" | "觀望" | "防守" {
  if (structureBroken) return "防守";
  if (changePercent <= -5) return "防守";
  if (point21Value >= 18) return "進攻";
  if (point21Value >= 7) return "觀望";
  return "防守";
}

function buildBaseReason(params: {
  point21Value: number;
  simulatedPrice: number;
  diffValue: number;
  upperBound: number;
  point21Reason: string;
  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportReason: string;
  changePercent: number;
}): string {
  const parts: string[] = [];

  if (params.changePercent <= -3) {
    parts.push("跌幅過大");
  }

  if (params.point21Reason && params.point21Reason.trim()) {
    parts.push(params.point21Reason.trim());
  } else {
    if (params.point21Value >= 14) {
      parts.push(
        `21點數偏強（${params.point21Value}/21），平台 ${params.simulatedPrice}，差值 ${params.diffValue}，上緣 ${params.upperBound}`
      );
    } else if (params.point21Value >= 7) {
      parts.push(
        `21點數中性（${params.point21Value}/21），平台 ${params.simulatedPrice}，差值 ${params.diffValue}，上緣 ${params.upperBound}`
      );
    } else {
      parts.push(
        `21點數偏弱（${params.point21Value}/21），平台 ${params.simulatedPrice}，差值 ${params.diffValue}，上緣 ${params.upperBound}`
      );
    }
  }

  if (params.supportPrice > 0) {
    if (params.structureBroken) {
      parts.push(`跌破支撐 ${params.supportPrice}`);
    } else if (params.supportReason && params.supportReason.trim()) {
      parts.push(params.supportReason.trim());
    } else if (params.supportDays > 0) {
      parts.push(`支撐 ${params.supportPrice} 守穩 ${params.supportDays} 天`);
    } else {
      parts.push(`支撐 ${params.supportPrice}`);
    }
  } else {
    parts.push("尚無有效支撐資料");
  }

  return parts.join("；");
}

function buildFinalReason(baseReason: string, riskReason: string): string {
  const parts = [baseReason, riskReason]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of parts) {
    if (seen.has(part)) continue;
    seen.add(part);
    out.push(part);
  }

  return out.join("；");
}

export function runDecisionJson(input: DecisionInput): DecisionResult {
  const code = String(input?.code || "").trim();
  const name = String(input?.name || code).trim();

  const price = round2(safeNumber(input?.price, 0));
  const change = round2(safeNumber(input?.change, 0));
  const changePercent = round2(safeNumber(input?.changePercent, 0));

  const point21Score = clamp(round2(safeNumber(input?.point21Score, 0)), 0, 100);
  const point21Value = clamp(Math.round(safeNumber(input?.point21Value, 0)), 0, 21);
  const simulatedPrice = round2(safeNumber(input?.simulatedPrice, price));
  const diffValue = round2(safeNumber(input?.diffValue, 0));
  const upperBound = round2(safeNumber(input?.upperBound, simulatedPrice));
  const point21State = String(input?.point21State || (point21Value >= 14 ? "強" : point21Value >= 7 ? "中" : "弱"));
  const point21Reason = String(input?.point21Reason || "");

  const supportPrice = round2(safeNumber(input?.supportPrice, 0));
  const supportDays = Math.max(0, Math.round(safeNumber(input?.supportDays, 0)));
  const structureBroken = Boolean(input?.structureBroken);
  const supportReason = String(input?.supportReason || "");

  const marketState = String(
    input?.marketState || buildBaseMarketState(structureBroken, point21Value)
  );

  const baseAction = buildBaseAction(point21Value, structureBroken, changePercent);
  const baseReason = buildBaseReason({
    point21Value,
    simulatedPrice,
    diffValue,
    upperBound,
    point21Reason,
    supportPrice,
    supportDays,
    structureBroken,
    supportReason,
    changePercent,
  });

  const risk = runRiskEngine({
    code,
    price,

    action: baseAction,
    marketState,

    supportPrice,
    supportDays,
    structureBroken,

    point21Value,
    point21Score,
    diffValue,
    upperBound,
    simulatedPrice,

    entryPrice: safeNumber(input?.entryPrice, 0),
    highestPriceSinceEntry: safeNumber(input?.highestPriceSinceEntry, 0),
    trailingStopEnabled: Boolean(input?.trailingStopEnabled),
  });

  let finalAction: "進攻" | "觀望" | "防守" = baseAction;

  if (risk.shouldExit || structureBroken) {
    finalAction = "防守";
  } else if (risk.riskLevel === "高" && baseAction === "進攻") {
    finalAction = "觀望";
  }

  const finalScore = point21Score;
  const rawScore = point21Score;
  const finalReason = buildFinalReason(baseReason, risk.riskReason);

  return {
    action: finalAction,
    finalAction,
    risk: risk.riskLevel,

    score: finalScore,
    finalScore,
    rawScore,

    breakout: 0,
    breakoutScore: 0,

    reason: finalReason,
    marketState,

    point21Score,
    point21Value,
    simulatedPrice,
    diffValue,
    upperBound,
    point21State,
    point21Reason: point21Reason || baseReason,

    supportPrice,
    supportDays,
    structureBroken,
    supportReason,

    stopLossPrice: risk.stopLossPrice,
    trailingStopActive: risk.trailingStopActive,
    trailingStopPrice: risk.trailingStopPrice,
    trailingStopRule: risk.trailingStopRule,

    structureRisk: risk.structureRisk,
    timeValidation: risk.timeValidation,
    priceStopStatus: risk.priceStopStatus,
    canHold: risk.canHold,
    shouldExit: risk.shouldExit,
    riskReason: risk.riskReason,
  };
}

export const runDecision = runDecisionJson;
export default runDecisionJson;
