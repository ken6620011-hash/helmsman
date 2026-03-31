export type SupportInputBar = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SupportResult = {
  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  confidence: number;
  sourceLowCount: number;
  reason: string;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function empty(reason: string): SupportResult {
  return {
    supportPrice: 0,
    supportDays: 0,
    structureBroken: false,
    confidence: 0,
    sourceLowCount: 0,
    reason,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeBars(bars: SupportInputBar[]): SupportInputBar[] {
  if (!Array.isArray(bars)) return [];

  return bars
    .map((bar) => ({
      open: safeNumber(bar?.open, 0),
      high: safeNumber(bar?.high, 0),
      low: safeNumber(bar?.low, 0),
      close: safeNumber(bar?.close, 0),
    }))
    .filter((bar) => bar.low > 0 && bar.close > 0);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);

  if (lower === upper) return sorted[lower];

  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function calcTolerance(price: number): number {
  return price * 0.015; // 1.5%
}

function detectSupportPrice(recent: SupportInputBar[]): number {
  const lows = recent
    .map((bar) => safeNumber(bar.low, 0))
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (lows.length === 0) return 0;
  if (lows.length <= 3) return round2(lows[0]);

  // 放寬：直接取低點群 25% 分位，避免過度嚴格要求重複觸底
  const p25 = percentile(lows, 0.25);
  return round2(p25);
}

function countSupportDays(recent: SupportInputBar[], supportPrice: number): number {
  if (supportPrice <= 0) return 0;

  const tolerance = calcTolerance(supportPrice);
  let count = 0;

  // 從最近一天往前看，只要 low 沒明顯跌破就算守住
  for (let i = recent.length - 1; i >= 0; i--) {
    const low = safeNumber(recent[i].low, 0);
    if (low >= supportPrice - tolerance) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function calcConfidence(recent: SupportInputBar[], supportPrice: number, supportDays: number): number {
  if (supportPrice <= 0) return 0;

  const tolerance = calcTolerance(supportPrice);

  let nearSupportCount = 0;
  for (const bar of recent) {
    if (Math.abs(bar.low - supportPrice) <= tolerance) {
      nearSupportCount++;
    }
  }

  const score =
    nearSupportCount * 12 +
    supportDays * 8 +
    Math.min(recent.length, 20);

  return clamp(Math.round(score), 20, 95);
}

function buildReason(
  supportPrice: number,
  supportDays: number,
  structureBroken: boolean
): string {
  if (supportPrice <= 0) {
    return "尚無有效支撐資料";
  }

  if (structureBroken) {
    return `跌破支撐 ${supportPrice}`;
  }

  if (supportDays >= 5) {
    return `支撐 ${supportPrice} 守穩 ${supportDays} 天`;
  }

  if (supportDays >= 1) {
    return `支撐 ${supportPrice} 初步守穩 ${supportDays} 天`;
  }

  return `支撐 ${supportPrice} 已建立`;
}

export function calculateSupportFromBars(
  bars: SupportInputBar[],
  currentPrice: number
): SupportResult {
  const normalized = normalizeBars(bars);

  if (normalized.length < 5) {
    return empty("K棒不足");
  }

  // 只看最近 20 根，偏近況
  const recent = normalized.slice(-20);

  const supportPrice = detectSupportPrice(recent);
  if (supportPrice <= 0) {
    return empty("尚無有效支撐資料");
  }

  const supportDays = countSupportDays(recent, supportPrice);

  // 放寬：只有明確跌破 1% 才算破壞
  const structureBroken =
    currentPrice > 0 ? currentPrice < supportPrice * 0.99 : false;

  const confidence = calcConfidence(recent, supportPrice, supportDays);

  return {
    supportPrice,
    supportDays,
    structureBroken,
    confidence,
    sourceLowCount: recent.length,
    reason: buildReason(supportPrice, supportDays, structureBroken),
  };
}
