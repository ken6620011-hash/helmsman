export type RiskEngineInput = {
  code?: string;
  price: number;
  action: string;

  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;

  point21Value: number;
  diffValue: number;
  upperBound: number;
  simulatedPrice: number;
};

export type RiskEngineResult = {
  riskLevel: "低" | "中" | "高";

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

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function runRiskEngine(input: RiskEngineInput): RiskEngineResult {
  const price = safeNumber(input.price);
  const supportPrice = safeNumber(input.supportPrice);
  const supportDays = safeNumber(input.supportDays);
  const structureBroken = Boolean(input.structureBroken);

  let riskLevel: "低" | "中" | "高" = "中";
  let structureRisk = "";
  let timeValidation = "";
  let priceStopStatus = "";

  let canHold = true;
  let shouldExit = false;

  // ===== 結構判斷 =====
  if (structureBroken) {
    structureRisk = "破壞";
    riskLevel = "高";
    shouldExit = true;
    canHold = false;
  } else {
    structureRisk = supportDays >= 5 ? "正常" : "偏弱";
  }

  // ===== 時間驗證 =====
  if (supportDays >= 5) {
    timeValidation = "有效守穩";
  } else if (supportDays > 0) {
    timeValidation = "尚未穩定";
  } else {
    timeValidation = "未驗證";
  }

  // ===== 停損判斷 =====
  if (supportPrice > 0 && price < supportPrice) {
    priceStopStatus = "停損觸發";
    shouldExit = true;
    canHold = false;
    riskLevel = "高";
  } else {
    priceStopStatus = "未觸發";
  }

  // ===== 停損價 =====
  const stopLossPrice = supportPrice > 0 ? supportPrice : 0;

  // ===== 移動停損（簡化） =====
  const trailingStopActive = false;
  const trailingStopPrice = 0;
  const trailingStopRule = "未啟動（目前不屬於進攻持有區）";

  /**
   * 🧠 核心：只留「必要風控語意」
   * ❌ 不再講 21點 / 差值 / 支撐細節（那些已在 decision）
   */
  const reasonParts: string[] = [];

  if (structureBroken) {
    reasonParts.push("結構已破壞");
  } else if (structureRisk === "偏弱") {
    reasonParts.push("結構偏弱");
  }

  if (priceStopStatus === "停損觸發") {
    reasonParts.push("停損已觸發");
  } else if (stopLossPrice > 0) {
    reasonParts.push(`停損參考 ${stopLossPrice}`);
  }

  const riskReason = reasonParts.join("；");

  return {
    riskLevel,

    stopLossPrice,
    trailingStopActive,
    trailingStopPrice,
    trailingStopRule,

    structureRisk,
    timeValidation,
    priceStopStatus,

    canHold,
    shouldExit,

    riskReason,
  };
}
