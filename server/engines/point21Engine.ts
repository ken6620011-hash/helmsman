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

// ========================================
// 量化模式：不使用固定老師表
// 只保留 input.teacher 手動覆蓋能力
// ========================================
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

function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];

  const index = (sortedAsc.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sortedAsc[lower];

  const weight = index - lower;
  return sortedAsc[lower] * (1 - weight) + sortedAsc[upper] * weight;
}

function recentBars(bars: Required<Point21InputBar>[], size = 21): Required<Point21InputBar>[] {
  if (!bars.length) return [];
  return bars.slice(-size);
}

/**
 * 老師等級平台還原：
 * - 不是直接取最低點
 * - 也不是單純 25% 分位
 * - 用「低點群 + 收盤群」混合
 *
 * 目的：
 * 1. 避免平台太低
 * 2. 讓 2330 這類股票的平台更接近老師
 */
function inferSimulatedPrice(price: number, bars: Required<Point21InputBar>[]): number {
  const recent = recentBars(bars, 21);
  if (recent.length < 5) return round2(price);

  const lows = recent.map((b) => b.low).filter((v) => v > 0).sort((a, b) => a - b);
  const closes = recent.map((b) => b.close).filter((v) => v > 0).sort((a, b) => a - b);

  if (!lows.length || !closes.length) return round2(price);

  const p20Low = percentile(lows, 0.20);
  const p35Close = percentile(closes, 0.35);
  const avgLow = avg(lows);

  // 平台略抬高，避免像 2330 那樣被壓太低
  const simulated = p20Low * 0.45 + p35Close * 0.40 + avgLow * 0.15;

  return round2(simulated);
}

/**
 * 老師等級上緣還原：
 * - 不是單純高點均值
 * - 更接近高點群上分位
 */
function inferUpperBound(price: number, bars: Required<Point21InputBar>[]): number {
  const recent = recentBars(bars, 21);
  if (recent.length < 5) return round2(price);

  const highs = recent.map((b) => b.high).filter((v) => v > 0).sort((a, b) => a - b);
  const closes = recent.map((b) => b.close).filter((v) => v > 0).sort((a, b) => a - b);

  if (!highs.length || !closes.length) return round2(price);

  const p80High = percentile(highs, 0.80);
  const p90High = percentile(highs, 0.90);
  const p75Close = percentile(closes, 0.75);

  const upper = p80High * 0.45 + p90High * 0.35 + p75Close * 0.20;
  return round2(upper);
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
 * 老師等級 21 點分段
 * ratio = (price - platform) / (upper - platform)
 *
 * 越接近平台 → 點數越高
 * 越接近上緣 → 點數越低
 */
function teacherMap(ratio: number): number {
  if (ratio <= 0.05) return 21;
  if (ratio <= 0.10) return 20;
  if (ratio <= 0.17) return 19;
  if (ratio <= 0.26) return 18;
  if (ratio <= 0.36) return 16;
  if (ratio <= 0.48) return 14;
  if (ratio <= 0.61) return 12;
  if (ratio <= 0.73) return 10;
  if (ratio <= 0.84) return 8;
  if (ratio <= 0.93) return 5;
  return 0;
}

/**
 * 老師等級差值還原：
 * 不是 upper - price
 * 不是單純線性
 *
 * 老師圖特性：
 * - 高位時差值下降不會太快
 * - 中段要平滑
 * - 低位要自然收斂
 *
 * 所以用：
 * remainRatio ^ 0.42
 * 再乘上區間百分比與倍率
 */
function inferDiffValue(price: number, simulatedPrice: number, upperBound: number): number {
  const range = upperBound - simulatedPrice;
  if (range <= 0 || simulatedPrice <= 0 || price <= 0) return 0;

  const remain = upperBound - price;
  const remainRatio = clamp(remain / range, 0, 1);

  const rangePct = (range / simulatedPrice) * 100;

  // 老師等級還原倍率
  const scaled = Math.pow(remainRatio, 0.42) * rangePct * 14.2;

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
  // 只保留人工 teacher override
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
