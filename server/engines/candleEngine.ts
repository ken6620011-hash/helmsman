export type CandleInput = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type CandleResult = {
  label: string;
  emoji: string;
  description: string;
};

function isBullish(c: CandleInput) {
  return c.close > c.open;
}

function bodySize(c: CandleInput) {
  return Math.abs(c.close - c.open);
}

function range(c: CandleInput) {
  return c.high - c.low;
}

function upperShadow(c: CandleInput) {
  return c.high - Math.max(c.open, c.close);
}

function lowerShadow(c: CandleInput) {
  return Math.min(c.open, c.close) - c.low;
}

export function runCandleEngine(c: CandleInput): CandleResult {
  const body = bodySize(c);
  const total = range(c);

  if (total === 0) {
    return {
      label: "中性",
      emoji: "⚪",
      description: "無波動K棒",
    };
  }

  const bodyRatio = body / total;
  const upper = upperShadow(c);
  const lower = lowerShadow(c);

  // 🔴 上影線重（賣壓）
  if (upper > body * 1.5 && bodyRatio < 0.5) {
    return {
      label: "上影賣壓",
      emoji: "🔻",
      description: "上影線長，賣壓沉重，短線轉弱",
    };
  }

  // 🟢 下影撐住（支撐）
  if (lower > body * 1.5 && bodyRatio < 0.5) {
    return {
      label: "下影支撐",
      emoji: "🟢",
      description: "下影線長，有承接力",
    };
  }

  // 🚀 強勢長紅
  if (isBullish(c) && bodyRatio > 0.7) {
    return {
      label: "放量突破",
      emoji: "🚀",
      description: "強勢上攻，動能延續",
    };
  }

  // ⚠️ 長黑
  if (!isBullish(c) && bodyRatio > 0.7) {
    return {
      label: "長黑壓力",
      emoji: "⚠️",
      description: "明顯賣壓，需防回檔",
    };
  }

  // 🧘 中性整理
  return {
    label: "中性",
    emoji: "⚪",
    description: "無明顯量價訊號",
  };
}

export default runCandleEngine;
