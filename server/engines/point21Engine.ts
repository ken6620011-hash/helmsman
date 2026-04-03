
// ===== Helmsman Point21 Engine（最終穩定版｜分離式架構）=====
// 核心理念：
// 1️⃣ 21點 = 位置（平台分段）
// 2️⃣ diff = 溫度（乖離）
// 3️⃣ upper/lower = 修正，不主導

export type Point21InputBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

export type Point21Input = {
  code?: string;
  price?: number;
  bars?: Point21InputBar[];
};

export type Point21Output = {
  point21Score: number;
  point21Value: number;

  simulatedPrice: number; // 平台
  diffValue: number;      // 溫度
  upperBound: number;     // 上緣
  lowerBound: number;     // 下緣

  positionRatio: number;

  point21State: "弱" | "中" | "強";
  point21Reason: string;
};

// ===== 基礎工具 =====

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizeBars(bars?: Point21InputBar[]): Required<Point21InputBar>[] {
  if (!Array.isArray(bars)) return [];

  return bars
    .map((b) => ({
      open: safeNumber(b.open),
      high: safeNumber(b.high),
      low: safeNumber(b.low),
      close: safeNumber(b.close),
    }))
    .filter((b) => b.close > 0);
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  if (arr.length === 1) return arr[0];

  const index = (arr.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);

  if (low === high) return arr[low];

  const w = index - low;
  return arr[low] * (1 - w) + arr[high] * w;
}

// ===== ① 平台（核心）=====
// 👉 重權重：低點群

function calcPlatform(price: number, bars: Required<Point21InputBar>[]): number {
  if (bars.length < 5) return round2(price);

  const recent = bars.slice(-21);

  const lows = recent
    .map((b) => b.low)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (!lows.length) return round2(price);

  // 🔥 核心：25% 分位（穩）
  return round2(percentile(lows, 0.25));
}

// ===== ② 上下緣 =====

function calcUpper(bars: Required<Point21InputBar>[], fallback: number): number {
  if (bars.length < 5) return fallback;

  const highs = bars
    .slice(-21)
    .map((b) => b.high)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (!highs.length) return fallback;

  return round2(percentile(highs, 0.75));
}

function calcLower(bars: Required<Point21InputBar>[], fallback: number): number {
  if (bars.length < 5) return fallback;

  const lows = bars
    .slice(-21)
    .map((b) => b.low)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (!lows.length) return fallback;

  return round2(percentile(lows, 0.1));
}

// ===== ③ 21點（分段，不用公式）=====

function mapToPoint21(ratio: number): number {
  if (ratio <= 0) return 21;

  if (ratio < 0.1) return 19;
  if (ratio < 0.2) return 18;
  if (ratio < 0.3) return 16;
  if (ratio < 0.4) return 14;
  if (ratio < 0.5) return 12;
  if (ratio < 0.6) return 10;
  if (ratio < 0.7) return 8;
  if (ratio < 0.8) return 6;
  if (ratio < 0.9) return 4;

  return 0;
}

// ===== ④ diff（溫度）=====

function calcDiff(price: number, platform: number): number {
  if (platform <= 0) return 0;

  const raw = (price - platform) / platform;

  // 🔥 scale（控制溫度強度）
  const scale = 120;

  return round2(raw * scale);
}

// ===== 主流程 =====

export function runPoint21(input: Point21Input): Point21Output {
  const price = round2(safeNumber(input?.price, 0));
  const bars = normalizeBars(input?.bars);

  // ===== 平台 =====
  const platform = calcPlatform(price, bars);

  // ===== 上下緣 =====
  const upperRaw = calcUpper(bars, price);
  const lowerRaw = calcLower(bars, price);

  const upper = Math.max(platform + 1, upperRaw);
  const lower = Math.min(platform, lowerRaw);

  // ===== ratio（只給21點用）=====
  let ratio = 0;

  if (upper > platform) {
    ratio = clamp((price - platform) / (upper - platform), 0, 1);
  }

  // ===== 21點 =====
  const point21Value = mapToPoint21(ratio);

  // ===== diff =====
  const diffValue = calcDiff(price, platform);

  // ===== score =====
  const point21Score = round2((point21Value / 21) * 100);

  // ===== state =====
  const state =
    point21Value >= 14 ? "強" :
    point21Value >= 7 ? "中" :
    "弱";

  return {
    point21Score,
    point21Value,

    simulatedPrice: platform,
    diffValue,
    upperBound: upper,
    lowerBound: lower,

    positionRatio: round2(ratio),

    point21State: state,
    point21Reason: `21點（${point21Value}/21）｜平台 ${platform}｜差值 ${diffValue}`,
  };
}

export default runPoint21;
