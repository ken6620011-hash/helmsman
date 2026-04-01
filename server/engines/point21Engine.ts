export type Point21InputBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

export type Point21TeacherInput = {
  pointValue?: number;       // 老師原始點數 0~21
  simulatedPrice?: number;   // 模擬價位（平台基準）
  diffValue?: number;        // 差值（溫度計）
};

export type Point21Input = {
  code?: string;
  price?: number;
  bars?: Point21InputBar[];
  teacher?: Point21TeacherInput;
};

export type Point21Output = {
  point21Score: number;      // 0~100
  point21Value: number;      // 0~21
  simulatedPrice: number;    // 平台基準價
  diffValue: number;         // 上緣距離
  upperBound: number;        // 反推出來的上緣
  positionRatio: number;     // 0~1，價格在區間中的位置
  point21State: "弱" | "中" | "強";
  point21Reason: string;
};

const TEACHER_POINT21_MAP: Record<
  string,
  { pointValue: number; simulatedPrice: number; diffValue: number }
> = {
  "2308": { pointValue: 18, simulatedPrice: 1380, diffValue: 86.2 },
  "3034": { pointValue: 18, simulatedPrice: 379.5, diffValue: 61.9 },
  "2330": { pointValue: 6, simulatedPrice: 1760, diffValue: 47.3 },
  "2454": { pointValue: 0, simulatedPrice: 1490, diffValue: 12.0 },
  "2317": { pointValue: 0, simulatedPrice: 187.5, diffValue: 3.5 },
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

function normalizeCode(code?: string): string {
  return String(code || "").trim();
}

function normalizeBars(bars?: Point21InputBar[]): Required<Point21InputBar>[] {
  if (!Array.isArray(bars)) return [];

  return bars
    .map((bar) => ({
      open: safeNumber(bar?.open, 0),
      high: safeNumber(bar?.high, 0),
      low: safeNumber(bar?.low, 0),
      close: safeNumber(bar?.close, 0),
    }))
    .filter((bar) => bar.close > 0);
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];

  const index = (sortedAsc.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sortedAsc[lower];

  const weight = index - lower;
  return sortedAsc[lower] * (1 - weight) + sortedAsc[upper] * weight;
}

function inferSimulatedPrice(price: number, bars: Required<Point21InputBar>[]): number {
  if (bars.length < 5) return round2(price);

  const recent = bars.slice(-21);
  const lows = recent.map((b) => b.low).filter((v) => v > 0).sort((a, b) => a - b);

  if (!lows.length) return round2(price);

  // 用低點群 25% 分位，讓平台基準偏向老師「平台價」的感覺
  return round2(percentile(lows, 0.25));
}

function inferUpperBound(price: number, bars: Required<Point21InputBar>[]): number {
  if (bars.length < 5) return round2(price);

  const recent = bars.slice(-21);
  const highs = recent.map((b) => b.high).filter((v) => v > 0).sort((a, b) => a - b);

  if (!highs.length) return round2(price);

  // 用高點群 75% 分位，避免單一極端高點污染
  return round2(percentile(highs, 0.75));
}

function buildUpperBound(simulatedPrice: number, diffValue: number, fallbackUpper: number): number {
  const candidate = round2(simulatedPrice + diffValue);

  if (candidate > simulatedPrice) {
    return candidate;
  }

  if (fallbackUpper > simulatedPrice) {
    return round2(fallbackUpper);
  }

  return round2(simulatedPrice);
}

function inferDiffValue(price: number, simulatedPrice: number, upperBound: number): number {
  if (upperBound <= 0) return 0;
  return round2(Math.max(0, upperBound - price));
}

function inferPointValue(price: number, simulatedPrice: number, upperBound: number): number {
  if (price <= 0 || upperBound <= simulatedPrice) return 0;

  const ratio = clamp((price - simulatedPrice) / (upperBound - simulatedPrice), 0, 1);

  // 與老師風格收斂：越靠近上緣，點數越低
  return clamp(21 - Math.round(ratio * 21), 0, 21);
}

function inferPositionRatio(price: number, simulatedPrice: number, upperBound: number): number {
  if (upperBound <= simulatedPrice) return 0;
  return round2(clamp((price - simulatedPrice) / (upperBound - simulatedPrice), 0, 1));
}

function toScore(pointValue: number): number {
  return clamp(round2((pointValue / 21) * 100), 0, 100);
}

function toState(pointValue: number): "弱" | "中" | "強" {
  if (pointValue >= 14) return "強";
  if (pointValue >= 7) return "中";
  return "弱";
}

function toReason(
  pointValue: number,
  simulatedPrice: number,
  diffValue: number,
  upperBound: number
): string {
  const state = toState(pointValue);

  if (state === "強") {
    return `21點數偏強（${pointValue}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
  }

  if (state === "中") {
    return `21點數中性（${pointValue}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
  }

  return `21點數偏弱（${pointValue}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`;
}

export function runPoint21(input: Point21Input): Point21Output {
  const code = normalizeCode(input?.code);
  const price = round2(safeNumber(input?.price, 0));
  const bars = normalizeBars(input?.bars);

  const teacherMap = TEACHER_POINT21_MAP[code];

  const teacherPoint = safeNumber(
    input?.teacher?.pointValue ?? teacherMap?.pointValue,
    Number.NaN
  );
  const teacherSimulatedPrice = safeNumber(
    input?.teacher?.simulatedPrice ?? teacherMap?.simulatedPrice,
    Number.NaN
  );
  const teacherDiffValue = safeNumber(
    input?.teacher?.diffValue ?? teacherMap?.diffValue,
    Number.NaN
  );

  const inferredSimulatedPrice = inferSimulatedPrice(price, bars);
  const inferredUpperBound = inferUpperBound(price, bars);

  const simulatedPrice = Number.isFinite(teacherSimulatedPrice)
    ? round2(teacherSimulatedPrice)
    : inferredSimulatedPrice;

  const upperBound = buildUpperBound(
    simulatedPrice,
    Number.isFinite(teacherDiffValue) ? round2(teacherDiffValue) : 0,
    inferredUpperBound
  );

  const diffValue = Number.isFinite(teacherDiffValue)
    ? round2(teacherDiffValue)
    : inferDiffValue(price, simulatedPrice, upperBound);

  const point21Value = Number.isFinite(teacherPoint)
    ? clamp(Math.round(teacherPoint), 0, 21)
    : inferPointValue(price, simulatedPrice, upperBound);

  const positionRatio = inferPositionRatio(price, simulatedPrice, upperBound);

  return {
    point21Score: toScore(point21Value),
    point21Value,
    simulatedPrice,
    diffValue,
    upperBound,
    positionRatio,
    point21State: toState(point21Value),
    point21Reason: toReason(point21Value, simulatedPrice, diffValue, upperBound),
  };
}

export default runPoint21;
