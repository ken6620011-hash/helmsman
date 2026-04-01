import HELMSMAN_CONFIG from "../config/helmsmanConfig";

export type RiskEngineInput = {
  code?: string;
  price?: number;

  action?: string;
  marketState?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;

  point21Value?: number;
  point21Score?: number;
  diffValue?: number;
  upperBound?: number;
  simulatedPrice?: number;

  entryPrice?: number;
  highestPriceSinceEntry?: number;
  trailingStopEnabled?: boolean;
};

export type RiskEngineResult = {
  riskLevel: "低" | "中" | "高";

  canHold: boolean;
  shouldExit: boolean;

  stopLossPrice: number;
  trailingStopActive: boolean;
  trailingStopPrice: number;
  trailingStopRule: string;

  structureRisk: "正常" | "偏弱" | "破壞";
  timeValidation: "未驗證" | "初步守穩" | "有效守穩";
  priceStopStatus: "未觸發" | "停損觸發" | "移動停損觸發";

  riskReason: string;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function buildStopLossPrice(
  price: number,
  supportPrice: number,
  structureBroken: boolean
): number {
  if (supportPrice > 0) {
    return round2(supportPrice);
  }

  if (price <= 0) return 0;

  if (structureBroken) {
    return round2(price * (1 - HELMSMAN_CONFIG.risk.structureBrokenStopLossPct));
  }

  return round2(price * (1 - HELMSMAN_CONFIG.risk.defaultStopLossPct));
}

function buildTrailingStopPrice(
  highestPriceSinceEntry: number,
  entryPrice: number,
  supportPrice: number,
  point21Value: number
): number {
  const high = highestPriceSinceEntry > 0 ? highestPriceSinceEntry : entryPrice;

  if (high <= 0) return 0;

  let trailingPct = HELMSMAN_CONFIG.risk.trailingWeakPct;

  if (point21Value >= HELMSMAN_CONFIG.risk.trailingStrongPoint21) {
    trailingPct = HELMSMAN_CONFIG.risk.trailingStrongPct;
  } else if (point21Value >= HELMSMAN_CONFIG.risk.trailingNeutralPoint21) {
    trailingPct = HELMSMAN_CONFIG.risk.trailingNeutralPct;
  }

  const rawTrailing = round2(high * (1 - trailingPct));

  if (supportPrice > 0) {
    return round2(Math.max(rawTrailing, supportPrice));
  }

  return rawTrailing;
}

function getStructureRisk(
  structureBroken: boolean,
  point21Value: number,
  diffValue: number
): "正常" | "偏弱" | "破壞" {
  if (structureBroken) return "破壞";
  if (point21Value < HELMSMAN_CONFIG.decision.watchPoint21Threshold || diffValue <= 0) {
    return "偏弱";
  }
  return "正常";
}

function getTimeValidation(
  supportDays: number
): "未驗證" | "初步守穩" | "有效守穩" {
  if (supportDays >= HELMSMAN_CONFIG.support.validSupportDays) return "有效守穩";
  if (supportDays >= 1) return "初步守穩";
  return "未驗證";
}

function getRiskLevel(
  structureBroken: boolean,
  supportDays: number,
  point21Value: number,
  marketState: string,
  action: string
): "低" | "中" | "高" {
  if (structureBroken) return "高";
  if (marketState === "防守" || marketState === "修正") return "高";
  if (action === "防守") return "高";

  if (
    point21Value >= HELMSMAN_CONFIG.decision.attackPoint21Threshold &&
    supportDays >= HELMSMAN_CONFIG.support.validSupportDays
  ) {
    return "低";
  }

  if (
    point21Value >= HELMSMAN_CONFIG.decision.watchPoint21Threshold &&
    supportDays >= 1
  ) {
    return "中";
  }

  return "高";
}

export function runRiskEngine(input: RiskEngineInput): RiskEngineResult {
  const price = round2(safeNumber(input?.price, 0));
  const action = String(input?.action || "");
  const marketState = String(input?.marketState || "");

  const supportPrice = round2(safeNumber(input?.supportPrice, 0));
  const supportDays = Math.max(0, Math.round(safeNumber(input?.supportDays, 0)));
  const structureBroken = Boolean(input?.structureBroken);

  const point21Value = Math.max(0, Math.round(safeNumber(input?.point21Value, 0)));
  const point21Score = round2(safeNumber(input?.point21Score, 0));
  const diffValue = round2(safeNumber(input?.diffValue, 0));

  const entryPrice = round2(safeNumber(input?.entryPrice, 0));
  const highestPriceSinceEntry = round2(safeNumber(input?.highestPriceSinceEntry, 0));

  const trailingStopEnabled =
    typeof input?.trailingStopEnabled === "boolean"
      ? input.trailingStopEnabled
      : HELMSMAN_CONFIG.risk.trailingEnabledDefault;

  const structureRisk = getStructureRisk(structureBroken, point21Value, diffValue);
  const timeValidation = getTimeValidation(supportDays);

  const stopLossPrice = buildStopLossPrice(price, supportPrice, structureBroken);

  let trailingStopActive = false;
  let trailingStopPrice = 0;
  let trailingStopRule = "未啟動（目前不屬於進攻持有區）";

  const qualifiesForTrailing =
    trailingStopEnabled &&
    !structureBroken &&
    point21Value >= HELMSMAN_CONFIG.risk.trailingNeutralPoint21 &&
    supportDays >= HELMSMAN_CONFIG.support.validSupportDays &&
    (action === "進攻" || marketState === "攻擊");

  if (qualifiesForTrailing) {
    trailingStopActive = true;
    trailingStopPrice = buildTrailingStopPrice(
      highestPriceSinceEntry,
      entryPrice > 0 ? entryPrice : price,
      supportPrice,
      point21Value
    );
    trailingStopRule = `移動停損：${trailingStopPrice}`;
  }

  let priceStopStatus: "未觸發" | "停損觸發" | "移動停損觸發" = "未觸發";
  let shouldExit = false;

  if (price > 0 && stopLossPrice > 0 && price < stopLossPrice) {
    priceStopStatus = "停損觸發";
    shouldExit = true;
  }

  if (
    !shouldExit &&
    trailingStopActive &&
    trailingStopPrice > 0 &&
    price > 0 &&
    price < trailingStopPrice
  ) {
    priceStopStatus = "移動停損觸發";
    shouldExit = true;
  }

  if (structureBroken) {
    shouldExit = true;
    priceStopStatus = "停損觸發";
  }

  const canHold = !shouldExit && !structureBroken;

  const riskLevel = getRiskLevel(
    structureBroken,
    supportDays,
    point21Value,
    marketState,
    action
  );

  const reasons: string[] = [];

  if (structureRisk === "破壞") {
    reasons.push("結構已破壞");
  } else if (structureRisk === "偏弱") {
    reasons.push("結構偏弱");
  } else {
    reasons.push("結構正常");
  }

  if (timeValidation === "有效守穩") {
    reasons.push(`支撐已守穩 ${supportDays} 天`);
  } else if (timeValidation === "初步守穩") {
    reasons.push(`支撐初步守穩 ${supportDays} 天`);
  } else {
    reasons.push("支撐尚未完成驗證");
  }

  if (supportPrice > 0) {
    reasons.push(`停損參考 ${supportPrice}`);
  } else if (stopLossPrice > 0) {
    reasons.push(`價格停損 ${stopLossPrice}`);
  }

  if (trailingStopActive) {
    reasons.push(`移動停損啟動 ${trailingStopPrice}`);
  }

  if (point21Value > 0 || point21Score > 0) {
    reasons.push(`21點 ${point21Value}/21`);
  }

  if (diffValue > 0) {
    reasons.push(`差值 ${diffValue}`);
  }

  if (priceStopStatus === "停損觸發") {
    reasons.push("停損已觸發");
  } else if (priceStopStatus === "移動停損觸發") {
    reasons.push("移動停損已觸發");
  }

  return {
    riskLevel,
    canHold,
    shouldExit,

    stopLossPrice,
    trailingStopActive,
    trailingStopPrice,
    trailingStopRule,

    structureRisk,
    timeValidation,
    priceStopStatus,

    riskReason: reasons.join("；"),
  };
}

export default runRiskEngine;
