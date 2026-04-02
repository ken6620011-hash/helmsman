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
  exposure: number;
  reason: string;
};

type MarketStateInput =
  | any[]
  | {
      score?: number;
      breakoutScore?: number;
      diffValue?: number;
      supportDays?: number;
      structureBroken?: boolean;
      pct?: number;
    };

function avg(numbers: number[]): number {
  if (!numbers.length) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isArrayInput(input: MarketStateInput): input is any[] {
  return Array.isArray(input);
}

/**
 * 相容雙模式：
 * 1. 舊版：getMarketState(quotes[])
 * 2. 新版：getMarketState({ score, breakoutScore, ... })
 */
export function getMarketState(input: MarketStateInput): MarketStateResult {
  // ===== 舊版相容：quotes[] =====
  if (isArrayInput(input)) {
    const pcts = input.map((q) => safeNumber(q?.pct, 0));
    const avgPct = avg(pcts);

    if (avgPct > 1.2) {
      return {
        state: "ATTACK",
        scoreBias: 10,
        riskBias: -1,
        label: "攻擊",
        exposure: 1.0,
        reason: "市場平均漲幅強，屬攻擊環境",
      };
    }

    if (avgPct > 0.2) {
      return {
        state: "ROTATION",
        scoreBias: 5,
        riskBias: 0,
        label: "輪動",
        exposure: 0.6,
        reason: "市場偏強但非全面主升，屬輪動環境",
      };
    }

    if (avgPct > -0.8) {
      return {
        state: "DEFENSE",
        scoreBias: -5,
        riskBias: 1,
        label: "防守",
        exposure: 0.3,
        reason: "市場偏弱，應降低曝險",
      };
    }

    return {
      state: "CORRECTION",
      scoreBias: -15,
      riskBias: 2,
      label: "修正",
      exposure: 0.1,
      reason: "市場明顯修正，應以保守為主",
    };
  }

  // ===== 新版擴充：單股/策略代理輸入 =====
  const score = safeNumber(input?.score, 0);
  const breakoutScore = safeNumber(input?.breakoutScore, 0);
  const diffValue = safeNumber(input?.diffValue, 0);
  const supportDays = safeNumber(input?.supportDays, 0);
  const structureBroken = Boolean(input?.structureBroken);
  const pct = safeNumber(input?.pct, 0);

  if (structureBroken && score < 40) {
    return {
      state: "CORRECTION",
      scoreBias: -15,
      riskBias: 2,
      label: "修正",
      exposure: 0.1,
      reason: "結構破壞且弱勢延續",
    };
  }

  if (!structureBroken && score >= 75 && breakoutScore >= 60 && supportDays >= 3) {
    return {
      state: "ATTACK",
      scoreBias: 10,
      riskBias: -1,
      label: "攻擊",
      exposure: 1.0,
      reason: "強勢結構＋動能延續",
    };
  }

  if (!structureBroken && score >= 50) {
    return {
      state: "ROTATION",
      scoreBias: 5,
      riskBias: 0,
      label: "輪動",
      exposure: 0.6,
      reason: "趨勢仍在，但屬整理輪動區",
    };
  }

  if (!structureBroken && (score < 50 || pct > 0 || diffValue > 30)) {
    return {
      state: "DEFENSE",
      scoreBias: -5,
      riskBias: 1,
      label: "防守",
      exposure: 0.3,
      reason: "弱勢結構中的保守應對階段",
    };
  }

  return {
    state: "CORRECTION",
    scoreBias: -15,
    riskBias: 2,
    label: "修正",
    exposure: 0.1,
    reason: "無明確優勢，視為修正環境",
  };
}

export default getMarketState;
