import HELMSMAN_CONFIG from "../config/helmsmanConfig";
import runRiskEngine, { type RiskEngineResult } from "./riskEngine";

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

  entryPrice?: number;
  highestPriceSinceEntry?: number;
  trailingStopEnabled?: boolean;

  marketState?: string;
};

export type DecisionResult = {
  code: string;
  name: string;

  action: string;
  finalAction: string;
  risk: "低" | "中" | "高";

  score: number;
  finalScore: number;
  rawScore: number;
  breakout: number;

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

  marketState: string;
  reason: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(v: unknown): string {
  return String(v ?? "").trim();
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 🧠 語意去重
 */
function pushUniqueSemantic(parts: string[], text: string) {
  if (!text) return;

  const exists = parts.some((p) => {
    if (p.includes("21點") && text.includes("21點")) return true;
    if (p.includes("差值") && text.includes("差值")) return true;
    if (p.includes("支撐") && text.includes("支撐")) return true;
    if (p.includes("結構") && text.includes("結構")) return true;
    if (p.includes("停損") && text.includes("停損")) return true;
    return false;
  });

  if (!exists) parts.push(text);
}

function buildPoint21Reason(
  point21Value: number,
  simulatedPrice: number,
  diffValue: number,
  upperBound: number,
  external?: string
): string {
  const ext = safeText(external);
  if (ext) return ext;

  if (point21Value >= 18) {
    return `21點數偏強（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
  }

  if (point21Value >= 8) {
    return `21點數中性（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
  }

  return `21點數偏弱（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
}

function buildSupportReason(
  supportPrice: number,
  supportDays: number,
  structureBroken: boolean,
  external?: string
): string {
  const ext = safeText(external);
  if (ext) return ext;

  if (supportPrice <= 0) return "";
  if (structureBroken) return `跌破支撐 ${supportPrice}`;
  if (supportDays > 0) return `支撐 ${supportPrice} 守穩 ${supportDays} 天`;

  return `支撐 ${supportPrice}`;
}

function calcScore(point21Value: number): number {
  return round2((clamp(point21Value, 0, 21) / 21) * 100);
}

function resolveBaseAction(point21Value: number, structureBroken: boolean): string {
  if (structureBroken) return "防守";
  if (point21Value >= 18) return "進攻";
  if (point21Value >= 8) return "觀望";
  return "防守";
}

function normalizeMarketState(state: string): string {
  const s = safeText(state);

  if (s === "ATTACK" || s === "攻擊") return "攻擊";
  if (s === "ROTATION" || s === "輪動") return "輪動";
  if (s === "DEFENSE" || s === "防守") return "防守";
  if (s === "CORRECTION" || s === "修正") return "修正";

  return s;
}

function applyMarketGate(baseAction: string, marketState: string, risk: RiskEngineResult): string {
  const ms = normalizeMarketState(marketState);

  if (risk.shouldExit) return "防守";

  if (ms === "修正") {
    return "防守";
  }

  if (ms === "防守") {
    if (baseAction === "進攻") return "觀望";
    return baseAction;
  }

  if (ms === "輪動") {
    if (baseAction === "進攻" && risk.riskLevel === "高") return "觀望";
    return baseAction;
  }

  return baseAction;
}

function buildGatedReason(marketState: string, baseAction: string, finalAction: string): string {
  const ms = normalizeMarketState(marketState);

  if (!ms) return "";
  if (baseAction === finalAction) return "";

  if (ms === "修正") {
    return "市場狀態＝修正，進攻降級為防守";
  }

  if (ms === "防守" && baseAction === "進攻" && finalAction === "觀望") {
    return "市場狀態＝防守，進攻降級為觀望";
  }

  if (ms === "輪動" && baseAction === "進攻" && finalAction === "觀望") {
    return "市場狀態＝輪動，進攻降級為觀望";
  }

  return "";
}

export function runDecisionJson(input: DecisionInput): DecisionResult {
  const code = safeText(input.code);
  const name = safeText(input.name) || code;

  const price = safeNumber(input.price);
  const point21Value = Math.round(safeNumber(input.point21Value));
  const simulatedPrice = safeNumber(input.simulatedPrice, price);
  const diffValue = round2(safeNumber(input.diffValue));
  const upperBound = safeNumber(input.upperBound, price);

  const supportPrice = safeNumber(input.supportPrice);
  const supportDays = Math.round(safeNumber(input.supportDays));
  const structureBroken = Boolean(input.structureBroken);

  const point21Reason = buildPoint21Reason(
    point21Value,
    simulatedPrice,
    diffValue,
    upperBound,
    input.point21Reason
  );

  const supportReason = buildSupportReason(
    supportPrice,
    supportDays,
    structureBroken,
    input.supportReason
  );

  const baseAction = resolveBaseAction(point21Value, structureBroken);
  const marketState = normalizeMarketState(input.marketState || "");

  const risk: RiskEngineResult = runRiskEngine({
    code,
    price,
    action: baseAction,
    supportPrice,
    supportDays,
    structureBroken,
    point21Value,
    diffValue,
    upperBound,
    simulatedPrice,
  });

  const finalAction = applyMarketGate(baseAction, marketState, risk);

// ===== 🔥 驗證用（一定會印）=====
console.log("🔥 DECISION GATE ACTIVE", {
  code,
  marketState,
  baseAction,
  finalAction,
});
  const gatedReason = buildGatedReason(marketState, baseAction, finalAction);

  const parts: string[] = [];
  pushUniqueSemantic(parts, point21Reason);
  pushUniqueSemantic(parts, supportReason);
  pushUniqueSemantic(parts, risk.riskReason);
  pushUniqueSemantic(parts, gatedReason);

  const reason = parts.join("；");
  const score = calcScore(point21Value);

  return {
    code,
    name,

    action: baseAction,
    finalAction,
    risk: risk.riskLevel,

    score,
    finalScore: score,
    rawScore: score,
    breakout: diffValue,

    point21Score: score,
    point21Value,
    simulatedPrice,
    diffValue,
    upperBound,
    point21State: safeText(input.point21State),
    point21Reason,

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

    marketState,
    reason,
  };
}

/**
 * 🧠 向下相容（關鍵）
 */
export const runDecision = runDecisionJson;

export default runDecisionJson;
