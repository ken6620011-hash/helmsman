import { getKbars, type KBar } from "./marketDataEngine";
import { getSupportData } from "./supportCacheEngine";

export type SupportInputBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
};

export type SupportResult = {
  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  confidence: number;
  reason: string;
  source: string;
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

function normalizeBars(bars: SupportInputBar[]): Required<SupportInputBar>[] {
  if (!Array.isArray(bars)) return [];

  return bars
    .map((bar) => ({
      open: safeNumber(bar?.open, 0),
      high: safeNumber(bar?.high, 0),
      low: safeNumber(bar?.low, 0),
      close: safeNumber(bar?.close, 0),
    }))
    .filter((bar) => bar.high > 0 && bar.low > 0 && bar.close > 0);
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

function calcTolerance(price: number): number {
  return Math.max(price * 0.015, 0.5);
}

export function calculateSupportFromBars(
  bars: SupportInputBar[],
  currentPrice: number
): SupportResult {
  const normalized = normalizeBars(bars);

  if (normalized.length < 5) {
    return {
      supportPrice: 0,
      supportDays: 0,
      structureBroken: false,
      confidence: 0,
      reason: "K棒不足",
      source: "bars",
    };
  }

  const recent = normalized.slice(-21);
  const lows = recent
    .map((bar) => bar.low)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (!lows.length) {
    return {
      supportPrice: 0,
      supportDays: 0,
      structureBroken: false,
      confidence: 0,
      reason: "尚無有效支撐資料",
      source: "bars",
    };
  }

  const supportPrice = round2(percentile(lows, 0.25));
  const tolerance = calcTolerance(supportPrice);

  let supportDays = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const low = recent[i].low;
    if (low >= supportPrice - tolerance) {
      supportDays++;
    } else {
      break;
    }
  }

  const structureBroken =
    currentPrice > 0 ? currentPrice < supportPrice * 0.99 : false;

  const touchCount = recent.filter(
    (bar) => Math.abs(bar.low - supportPrice) <= tolerance
  ).length;

  const confidence = clamp(
    Math.round(touchCount * 12 + supportDays * 8 + Math.min(recent.length, 20)),
    0,
    95
  );

  let reason = "";
  if (supportPrice <= 0) {
    reason = "尚無有效支撐資料";
  } else if (structureBroken) {
    reason = `跌破支撐 ${supportPrice}`;
  } else if (supportDays >= 5) {
    reason = `支撐 ${supportPrice} 守穩 ${supportDays} 天`;
  } else if (supportDays >= 1) {
    reason = `支撐 ${supportPrice} 初步守穩 ${supportDays} 天`;
  } else {
    reason = `支撐 ${supportPrice} 已建立`;
  }

  return {
    supportPrice,
    supportDays,
    structureBroken,
    confidence,
    reason,
    source: "bars",
  };
}

function mapKbarsToSupportBars(kbars: KBar[]): SupportInputBar[] {
  return (Array.isArray(kbars) ? kbars : []).map((bar) => ({
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  }));
}

export async function getSupport(
  code: string,
  currentPrice?: number
): Promise<SupportResult> {
  const cache = getSupportData(code);

  if (cache && safeNumber(cache?.supportPrice, 0) > 0) {
    return {
      supportPrice: round2(safeNumber(cache.supportPrice, 0)),
      supportDays: Math.max(0, Math.round(safeNumber(cache.supportDays, 0))),
      structureBroken: Boolean(cache.structureBroken),
      confidence: clamp(
        Math.round(safeNumber((cache as any)?.confidence, 60)),
        0,
        100
      ),
      reason: String(cache.reason || ""),
      source: "cache",
    };
  }

  const kbars = await getKbars(code, 21);

  if (!Array.isArray(kbars) || kbars.length < 5) {
    return {
      supportPrice: 0,
      supportDays: 0,
      structureBroken: false,
      confidence: 0,
      reason: "尚無有效支撐資料",
      source: "fallback",
    };
  }

  const lastClose = safeNumber(kbars[kbars.length - 1]?.close, 0);
  const price = safeNumber(currentPrice, lastClose);

  return calculateSupportFromBars(mapKbarsToSupportBars(kbars), price);
}

export default getSupport;
