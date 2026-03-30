export type EntryMode =
  | "BREAKOUT"
  | "PULLBACK"
  | "MA_RECLAIM"
  | "EARLY_PIVOT"
  | "SKIP";

export type EntryPriceInput = {
  symbol: string;
  currentPrice: number;
  ma20: number;

  pivotHigh?: number;
  pivotLow?: number;

  recentHigh?: number;
  recentLow?: number;

  breakoutLevel?: number;
  supportLevel?: number;

  hci: number;
  hti: number;
  score: number;

  decision: "BUY" | "PREPARE" | "WATCH" | "EXIT" | "SKIP";
  breakoutState?: "NONE" | "TESTING" | "CONFIRMED" | "FAILED";
  maState?: "BELOW_20MA" | "TOUCH_20MA" | "ABOVE_20MA" | "EXPANDING_ABOVE_20MA";
  resonanceState?: "NONE" | "WEAK" | "STRONG";

  probability?: number;
  riskScore?: number;
};

export type EntryPriceResult = {
  symbol: string;
  entryMode: EntryMode;

  entryPrice: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;

  riskPerShare: number | null;
  reward1PerShare: number | null;
  reward2PerShare: number | null;

  rr1: number | null;
  rr2: number | null;

  positionAction: "BUY_NOW" | "WAIT_BREAKOUT" | "WAIT_PULLBACK" | "SKIP";
  valid: boolean;
  reasons: string[];
};

function round2(num: number | null): number | null {
  if (num === null || Number.isNaN(num)) return null;
  return Math.round(num * 100) / 100;
}

function calcRR(reward: number | null, risk: number | null): number | null {
  if (reward === null || risk === null || risk <= 0) return null;
  return round2(reward / risk);
}
function resolveEntryMode(input: EntryPriceInput): EntryMode {
  if (input.decision === "SKIP" || input.decision === "EXIT") return "SKIP";

  if (
    input.breakoutState === "CONFIRMED" &&
    (input.maState === "ABOVE_20MA" || input.maState === "EXPANDING_ABOVE_20MA")
  ) {
    return "BREAKOUT";
  }

  if (
    input.breakoutState === "TESTING" &&
    input.hci >= 18 &&
    input.resonanceState === "STRONG"
  ) {
    return "EARLY_PIVOT";
  }

  if (
    input.maState === "TOUCH_20MA" &&
    input.hci >= 15
  ) {
    return "MA_RECLAIM";
  }

  if (
    input.maState === "ABOVE_20MA" &&
    input.currentPrice > input.ma20
  ) {
    return "PULLBACK";
  }

  return "SKIP";
}

function calcEntryByMode(input: EntryPriceInput, mode: EntryMode) {
  const breakoutLevel = input.breakoutLevel ?? input.pivotHigh ?? input.recentHigh ?? null;
  const supportLevel = input.supportLevel ?? input.pivotLow ?? input.recentLow ?? input.ma20 ?? null;

  if (mode === "BREAKOUT") {
    const entryPrice = breakoutLevel ?? input.currentPrice;
    const stopLoss = supportLevel;
    const target1 = entryPrice ? entryPrice * 1.08 : null;
    const target2 = entryPrice ? entryPrice * 1.15 : null;
    return { entryPrice, stopLoss, target1, target2 };
  }

  if (mode === "PULLBACK") {
    const entryPrice = input.ma20;
    const stopLoss = supportLevel ? Math.min(supportLevel, input.ma20 * 0.985) : input.ma20 * 0.985;
    const target1 = breakoutLevel ?? input.currentPrice * 1.05;
    const target2 = target1 ? target1 * 1.08 : null;
    return { entryPrice, stopLoss, target1, target2 };
  }

  if (mode === "MA_RECLAIM") {
    const entryPrice = input.ma20;
    const stopLoss = supportLevel ? Math.min(supportLevel, input.ma20 * 0.98) : input.ma20 * 0.98;
    const target1 = breakoutLevel ?? input.currentPrice * 1.06;
    const target2 = target1 ? target1 * 1.1 : null;
    return { entryPrice, stopLoss, target1, target2 };
  }

  if (mode === "EARLY_PIVOT") {
    const entryPrice = input.currentPrice;
    const stopLoss = supportLevel ?? input.currentPrice * 0.96;
    const target1 = breakoutLevel ?? input.currentPrice * 1.06;
    const target2 = target1 ? target1 * 1.1 : null;
    return { entryPrice, stopLoss, target1, target2 };
  }

  return {
    entryPrice: null,
    stopLoss: null,
    target1: null,
    target2: null,
  };
}
function buildReasons(input: EntryPriceInput, mode: EntryMode): string[] {
  const reasons: string[] = [];

  if (input.hci >= 18) reasons.push("結構進入18–21強勢循環");
  if (input.hti >= 45) reasons.push("差值升溫");
  if (input.maState === "ABOVE_20MA") reasons.push("站上20MA");
  if (input.maState === "TOUCH_20MA") reasons.push("貼近20MA待確認");
  if (input.resonanceState === "STRONG") reasons.push("族群共振強");
  if (input.breakoutState === "TESTING") reasons.push("接近突破");
  if (input.breakoutState === "CONFIRMED") reasons.push("突破確認");

  if (mode === "BREAKOUT") reasons.push("採突破追價型買點");
  if (mode === "PULLBACK") reasons.push("採回測承接型買點");
  if (mode === "MA_RECLAIM") reasons.push("採20MA站回型買點");
  if (mode === "EARLY_PIVOT") reasons.push("採轉折提前卡位型買點");

  return reasons;
}

function resolvePositionAction(
  mode: EntryMode,
  rr1: number | null,
  input: EntryPriceInput
): EntryPriceResult["positionAction"] {
  if (mode === "SKIP") return "SKIP";

  if ((input.riskScore ?? 0.5) > 0.7) return "SKIP";

  if (mode === "BREAKOUT" && (rr1 ?? 0) >= 1.5) return "BUY_NOW";
  if (mode === "EARLY_PIVOT" && input.decision === "PREPARE") return "WAIT_BREAKOUT";
  if (mode === "MA_RECLAIM") return "WAIT_BREAKOUT";
  if (mode === "PULLBACK") return "WAIT_PULLBACK";

  return "SKIP";
}
export function calculateEntryPrice(input: EntryPriceInput): EntryPriceResult {
  const entryMode = resolveEntryMode(input);
  const reasons = buildReasons(input, entryMode);

  const { entryPrice, stopLoss, target1, target2 } = calcEntryByMode(input, entryMode);

  const riskPerShare =
    entryPrice !== null && stopLoss !== null ? round2(entryPrice - stopLoss) : null;

  const reward1PerShare =
    entryPrice !== null && target1 !== null ? round2(target1 - entryPrice) : null;

  const reward2PerShare =
    entryPrice !== null && target2 !== null ? round2(target2 - entryPrice) : null;

  const rr1 = calcRR(reward1PerShare, riskPerShare);
  const rr2 = calcRR(reward2PerShare, riskPerShare);

  const valid =
    entryMode !== "SKIP" &&
    entryPrice !== null &&
    stopLoss !== null &&
    target1 !== null &&
    (rr1 ?? 0) >= 1.2;

  const positionAction = resolvePositionAction(entryMode, rr1, input);

  return {
    symbol: input.symbol,
    entryMode,

    entryPrice: round2(entryPrice),
    stopLoss: round2(stopLoss),
    target1: round2(target1),
    target2: round2(target2),

    riskPerShare,
    reward1PerShare,
    reward2PerShare,

    rr1,
    rr2,

    positionAction,
    valid,
    reasons,
  };
}
