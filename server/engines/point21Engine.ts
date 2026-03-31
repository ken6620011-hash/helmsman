export type Point21InputBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

export type Point21TeacherInput = {
  pointValue?: number;       // 老師原始點數 0~21
  simulatedPrice?: number;   // 模擬價位
  diffValue?: number;        // 模擬差值
};

export type Point21Input = {
  code?: string;
  price?: number;
  bars?: Point21InputBar[];
  teacher?: Point21TeacherInput;
};

export type Point21Output = {
  point21Score: number;        // 0~100
  point21Value: number;        // 0~21
  simulatedPrice: number;
  diffValue: number;
  point21State: "弱" | "中" | "強";
  point21Reason: string;
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

function inferPointValueFromBars(price: number, bars: Required<Point21InputBar>[]): number {
  if (price <= 0 || bars.length < 5) return 0;

  const recent = bars.slice(-21);
  const closes = recent.map((b) => b.close);
  const maxClose = Math.max(...closes);
  const minClose = Math.min(...closes);

  if (maxClose <= 0 || maxClose === minClose) return 0;

  // 價格越接近近21日低檔，點數越高；越接近高檔，點數越低
  const ratio = (maxClose - price) / (maxClose - minClose);
  return clamp(Math.round(ratio * 21), 0, 21);
}

function inferDiffValue(price: number, bars: Required<Point21InputBar>[]): number {
  if (price <= 0 || bars.length < 5) return 0;

  const recent = bars.slice(-21);
  const highs = recent.map((b) => b.high).filter((v) => v > 0);
  if (!highs.length) return 0;

  const maxHigh = Math.max(...highs);
  return round2(maxHigh - price);
}

function inferSimulatedPrice(price: number): number {
  return round2(price);
}

function toScore(pointValue: number): number {
  return clamp(round2((pointValue / 21) * 100), 0, 100);
}

function toState(pointValue: number): "弱" | "中" | "強" {
  if (pointValue >= 14) return "強";
  if (pointValue >= 7) return "中";
  return "弱";
}

function toReason(pointValue: number, diffValue: number): string {
  const state = toState(pointValue);

  if (state === "強") {
    return `21點數偏強（${pointValue}/21），距高檔差值 ${diffValue}`;
  }

  if (state === "中") {
    return `21點數中性（${pointValue}/21），差值 ${diffValue}`;
  }

  return `21點數偏弱（${pointValue}/21），差值 ${diffValue}`;
}

export function runPoint21(input: Point21Input): Point21Output {
  const price = safeNumber(input?.price, 0);
  const bars = normalizeBars(input?.bars);

  const teacherPoint = safeNumber(input?.teacher?.pointValue, Number.NaN);
  const teacherSimulatedPrice = safeNumber(input?.teacher?.simulatedPrice, Number.NaN);
  const teacherDiffValue = safeNumber(input?.teacher?.diffValue, Number.NaN);

  const point21Value =
    Number.isFinite(teacherPoint)
      ? clamp(Math.round(teacherPoint), 0, 21)
      : inferPointValueFromBars(price, bars);

  const simulatedPrice =
    Number.isFinite(teacherSimulatedPrice)
      ? round2(teacherSimulatedPrice)
      : inferSimulatedPrice(price);

  const diffValue =
    Number.isFinite(teacherDiffValue)
      ? round2(teacherDiffValue)
      : inferDiffValue(price, bars);

  return {
    point21Score: toScore(point21Value),
    point21Value,
    simulatedPrice,
    diffValue,
    point21State: toState(point21Value),
    point21Reason: toReason(point21Value, diffValue),
  };
}

export default runPoint21;
