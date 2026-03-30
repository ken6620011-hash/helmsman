// server/engines/stopLossEngine.ts

export type StopLossSignal = "SAFE" | "WATCH" | "REDUCE" | "EXIT";

export interface StopLossPlan {
  stopLossPrice: number;
  takeProfitPrice: number;
  trailingStopPrice: number | null;
  stopLossPct: number;
  takeProfitPct: number;
  signal: StopLossSignal;
  signalLabel: string;
  note: string;
}

interface StopLossInput {
  currentPrice: number;
  entryPrice: number;
  stopLossBase?: number;
  targetPrice?: number;
  decision: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  marketState: string;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export function runStopLossEngine(input: StopLossInput): StopLossPlan {
  const {
    currentPrice,
    entryPrice,
    stopLossBase,
    targetPrice,
    decision,
    riskLevel,
    marketState,
  } = input;

  let stopLossPct = -8;
  let takeProfitPct = 15;

  if (riskLevel === "LOW") {
    stopLossPct = -6;
    takeProfitPct = 20;
  } else if (riskLevel === "MEDIUM") {
    stopLossPct = -8;
    takeProfitPct = 15;
  } else {
    stopLossPct = -10;
    takeProfitPct = 10;
  }

  if (marketState === "TEST") {
    stopLossPct = Math.max(stopLossPct, -7);
  }

  if (marketState === "DEFENSE") {
    stopLossPct = -5;
    takeProfitPct = 8;
  }

  if (marketState === "CORRECTION" || marketState === "CRASH") {
    stopLossPct = -4;
    takeProfitPct = 5;
  }
  const computedStopLoss =
    stopLossBase && stopLossBase > 0
      ? stopLossBase
      : entryPrice * (1 + stopLossPct / 100);

  const computedTakeProfit =
    targetPrice && targetPrice > 0
      ? targetPrice
      : entryPrice * (1 + takeProfitPct / 100);

  let trailingStopPrice: number | null = null;

  if (currentPrice >= entryPrice * 1.08) {
    trailingStopPrice = round2(currentPrice * 0.95);
  }

  let signal: StopLossSignal = "SAFE";
  let signalLabel = "安全";
  let note = "持有觀察";

  if (decision === "EXIT") {
    signal = "EXIT";
    signalLabel = "逃命";
    note = "決策已轉退出，應直接離場";
  } else if (marketState === "CRASH") {
    signal = "EXIT";
    signalLabel = "逃命";
    note = "大盤崩跌，全面退出";
  } else if (marketState === "CORRECTION") {
    signal = "REDUCE";
    signalLabel = "減碼";
    note = "大盤修正，降低持股";
  } else if (currentPrice <= computedStopLoss) {
    signal = "EXIT";
    signalLabel = "跌破停損";
    note = "股價已跌破停損線";
  } else if (trailingStopPrice && currentPrice <= trailingStopPrice) {
    signal = "REDUCE";
    signalLabel = "移動停利";
    note = "股價回落至移動停利線";
  } else if (riskLevel === "HIGH") {
    signal = "WATCH";
    signalLabel = "高風險觀察";
    note = "風險偏高，不宜擴大部位";
  }
  return {
    stopLossPrice: round2(computedStopLoss),
    takeProfitPrice: round2(computedTakeProfit),
    trailingStopPrice,
    stopLossPct,
    takeProfitPct,
    signal,
    signalLabel,
    note,
  };
}
