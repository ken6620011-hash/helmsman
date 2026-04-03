export type Point21InputBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

export type Point21TeacherInput = {
  pointValue?: number;
  simulatedPrice?: number;
  diffValue?: number;
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
  diffValue: number;         // 老師風格差值
  upperBound: number;        // 上緣
  positionRatio: number;     // 0~1
  point21State: "弱" | "中" | "強";
  point21Reason: string;
};

// 量化模式：不使用固定老師表
const TEACHER_POINT21_MAP: Record<
  string,
  { pointValue: number; simulatedPrice: number; diffValue: number }
> = {};

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
    .filter((bar) => bar.close > 0 && bar.high > 0 && bar.low > 0);
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function recent21(bars: Required<Point21InputBar>[]): Required<Point21InputBar>[] {
  if (!bars.length) return [];
  return bars.slice(-21);
}

/**
 * 回退到前一版骨架，只做小幅校正
 * - 平台不能壓太低
 * - 也不能抬太高
 */
function inferSimulatedPrice(price: number, bars: Required<Point21InputBar>[]): number {
  const recent = recent21(bars);
  if (recent.length < 5) return round2(price);

  const lows = recent.map((b) => b.low).filter((v) => v > 0);
  if (!lows.length) return round2(price);

  const minLow = Math.min(...lows);
  const avgLow = avg(lows);

  // 比上一版略微抬高一點點，避免 2330 平台過低
  return round2(minLow * 0.78 + avgLow * 0.22);
}

/**
 * 上緣：延續上一版穩定骨架，只做小幅微調
 */
function inferUpperBound(price: number, bars: Required<Point21InputBar>[]): number {
  const recent = recent21(bars);
  if (recent.length < 5) return round2(price);

  const highs = recent.map((b) => b.high).filter((v) => v > 0);
  if (!highs.length) return round2(price);

  const maxHigh = Math.max(...highs);
  const avgHigh = avg(highs);

  return round2(maxHigh * 0.72 + avgHigh * 0.28);
}

function buildUpperBound(simulatedPrice: number, diffValue: number, fallbackUpper: number): number {
  const candidate = round2(simulatedPrice + diffValue);

  if (candidate > simulatedPrice) {
    return candidate;
  }

  if (fallbackUpper > simulatedPrice) {
    return round2(fallbackUpper);
  }

  return round2(simulatedPrice + 1);
}

/**
 * 老師分段
 * 保留前一版較穩的 mapping，不做暴力改動
 */
function teacherMap(ratio: number): number {
  if (ratio <= 0.04) return 21;
  if (ratio <= 0.09) return 20;
  if (ratio <= 0.16) return 19;
  if (ratio <= 0.24) return 18;
  if (ratio <= 0.33) return 16;
  if (ratio <= 0.44) return 14;
  if (ratio <= 0.57) return 12;
  if (ratio <= 0.69) return 10;
  if (ratio <= 0.81) return 8;
  if (ratio <= 0.92) return 5;
  return 0;
}

/**
 * 差值：回到「溫和非線性」
 * 不用上一版太兇的 power 0.42
 * 改回比較接近老師的 sqrt 型態，再做小幅倍率調整
 */
function inferDiffValue(price: number, simulatedPrice: number, upperBound: number): number {
  const range = upperBound - simulatedPrice;
  if (range <= 0 || simulatedPrice <= 0 || price <= 0) return 0;

  const remain = upperBound - price;
  const remainRatio = clamp(remain / range, 0, 1);
  const rawRangePct = (range / simulatedPrice) * 100;

  // 比原本 13.5 稍微往上校正，但不暴衝
  const scaled = Math.sqrt(remainRatio) * rawRangePct * 13.9;

  return round2(Math.max(0, scaled));
}

function inferPointValue(price: number, simulatedPrice: number, upperBound: number): number {
  if (price <= 0 || upperBound <= simulatedPrice) return 0;

  const ratio = clamp((price - simulatedPrice) / (upperBound - simulatedPrice), 0, 1);
  return clamp(teacherMap(ratio), 0, 21);
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

  const teacherMapData = TEACHER_POINT21_MAP[code];

  // 量化模式：
  // 固定 teacher map 為空
  // 僅保留人工 teacher override
  const teacherPoint = safeNumber(
    input?.teacher?.pointValue ?? teacherMapData?.pointValue,
    Number.NaN
  );
  const teacherSimulatedPrice = safeNumber(
    input?.teacher?.simulatedPrice ?? teacherMapData?.simulatedPrice,
    Number.NaN
  );
  const teacherDiffValue = safeNumber(
    input?.teacher?.diffValue ?? teacherMapData?.diffValue,
    Number.NaN
  );

  const inferredSimulatedPrice = inferSimulatedPrice(price, bars);
  const inferredUpperBound = inferUpperBound(price, bars);

  const simulatedPrice = Number.isFinite(teacherSimulatedPrice)
    ? round2(teacherSimulatedPrice)
    : inferredSimulatedPrice;

  const upperBound = Number.isFinite(teacherDiffValue)
    ? buildUpperBound(
        simulatedPrice,
        round2(teacherDiffValue),
        inferredUpperBound
      )
    : round2(Math.max(inferredUpperBound, simulatedPrice + 1));

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
