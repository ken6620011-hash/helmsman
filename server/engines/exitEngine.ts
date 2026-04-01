import { getPosition, closePosition, type PositionSnapshot } from "./positionEngine";

export type ExitEngineInput = {
  code: string;

  currentPrice: number;

  shouldExit?: boolean;
  canHold?: boolean;

  stopLossPrice?: number;
  trailingStopActive?: boolean;
  trailingStopPrice?: number;

  priceStopStatus?: string;
  structureBroken?: boolean;

  action?: string;
  riskLevel?: string;
  riskReason?: string;
};

export type ExitEngineResult = {
  triggered: boolean;
  exitType: "NONE" | "STOP_LOSS" | "TRAILING_STOP" | "STRUCTURE_BREAK" | "RISK_EXIT";
  exitReason: string;

  hasOpenPosition: boolean;
  positionBeforeExit: PositionSnapshot | null;
  positionAfterExit: PositionSnapshot | null;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function buildExitDecision(input: ExitEngineInput): {
  triggered: boolean;
  exitType: ExitEngineResult["exitType"];
  exitReason: string;
} {
  const currentPrice = safeNumber(input?.currentPrice, 0);
  const shouldExit = Boolean(input?.shouldExit);
  const canHold = typeof input?.canHold === "boolean" ? input.canHold : true;

  const stopLossPrice = safeNumber(input?.stopLossPrice, 0);
  const trailingStopActive = Boolean(input?.trailingStopActive);
  const trailingStopPrice = safeNumber(input?.trailingStopPrice, 0);

  const priceStopStatus = normalizeText(input?.priceStopStatus);
  const structureBroken = Boolean(input?.structureBroken);

  const action = normalizeText(input?.action);
  const riskLevel = normalizeText(input?.riskLevel);
  const riskReason = normalizeText(input?.riskReason);

  if (structureBroken) {
    return {
      triggered: true,
      exitType: "STRUCTURE_BREAK",
      exitReason: `結構破壞出場${riskReason ? `｜${riskReason}` : ""}`,
    };
  }

  if (
    trailingStopActive &&
    trailingStopPrice > 0 &&
    currentPrice > 0 &&
    currentPrice < trailingStopPrice
  ) {
    return {
      triggered: true,
      exitType: "TRAILING_STOP",
      exitReason: `跌破移動停損 ${trailingStopPrice}`,
    };
  }

  if (stopLossPrice > 0 && currentPrice > 0 && currentPrice < stopLossPrice) {
    return {
      triggered: true,
      exitType: "STOP_LOSS",
      exitReason: `跌破停損 ${stopLossPrice}`,
    };
  }

  if (priceStopStatus === "移動停損觸發") {
    return {
      triggered: true,
      exitType: "TRAILING_STOP",
      exitReason: `移動停損觸發${trailingStopPrice > 0 ? ` ${trailingStopPrice}` : ""}`,
    };
  }

  if (priceStopStatus === "停損觸發") {
    return {
      triggered: true,
      exitType: structureBroken ? "STRUCTURE_BREAK" : "STOP_LOSS",
      exitReason: stopLossPrice > 0 ? `停損觸發 ${stopLossPrice}` : "停損觸發",
    };
  }

  if (shouldExit || !canHold) {
    return {
      triggered: true,
      exitType: "RISK_EXIT",
      exitReason: `風控出場${action ? `｜${action}` : ""}${riskLevel ? `｜風險${riskLevel}` : ""}${riskReason ? `｜${riskReason}` : ""}`,
    };
  }

  return {
    triggered: false,
    exitType: "NONE",
    exitReason: "",
  };
}

export function runExitEngine(input: ExitEngineInput): ExitEngineResult {
  const code = normalizeText(input?.code);
  const currentPrice = safeNumber(input?.currentPrice, 0);

  if (!code || currentPrice <= 0) {
    return {
      triggered: false,
      exitType: "NONE",
      exitReason: "invalid input",
      hasOpenPosition: false,
      positionBeforeExit: null,
      positionAfterExit: null,
    };
  }

  const currentPosition = getPosition(code);
  const hasOpenPosition = !!currentPosition && currentPosition.status === "OPEN";

  if (!hasOpenPosition) {
    return {
      triggered: false,
      exitType: "NONE",
      exitReason: "no open position",
      hasOpenPosition: false,
      positionBeforeExit: currentPosition,
      positionAfterExit: currentPosition,
    };
  }

  const decision = buildExitDecision(input);

  if (!decision.triggered) {
    return {
      triggered: false,
      exitType: "NONE",
      exitReason: "hold",
      hasOpenPosition: true,
      positionBeforeExit: currentPosition,
      positionAfterExit: currentPosition,
    };
  }

  const closed = closePosition({
    code,
    exitPrice: currentPrice,
    exitReason: decision.exitReason,
  });

  return {
    triggered: true,
    exitType: decision.exitType,
    exitReason: decision.exitReason,
    hasOpenPosition: true,
    positionBeforeExit: currentPosition,
    positionAfterExit: closed,
  };
}

export default runExitEngine;
