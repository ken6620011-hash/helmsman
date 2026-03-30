export type MarketState =
  | "ATTACK"
  | "ROTATION"
  | "DEFENSE"
  | "CORRECTION";

export type MarketStateResult = {
  state: MarketState;
  scoreBias: number;
  riskBias: number;
  label: string;
};

function avg(numbers: number[]): number {
  if (!numbers.length) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export function getMarketState(quotes: any[]): MarketStateResult {
  const pcts = quotes.map((q) => Number(q?.pct || 0));

  const avgPct = avg(pcts);

  // === 核心判斷 ===
  if (avgPct > 1.2) {
    return {
      state: "ATTACK",
      scoreBias: +10,
      riskBias: -1,
      label: "攻擊",
    };
  }

  if (avgPct > 0.2) {
    return {
      state: "ROTATION",
      scoreBias: +5,
      riskBias: 0,
      label: "輪動",
    };
  }

  if (avgPct > -0.8) {
    return {
      state: "DEFENSE",
      scoreBias: -5,
      riskBias: +1,
      label: "防守",
    };
  }

  return {
    state: "CORRECTION",
    scoreBias: -15,
    riskBias: +2,
    label: "修正",
  };
}
