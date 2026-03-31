export type SupportInputBar = {
  close?: number;
  low?: number;
  high?: number;
};

export type SupportResult = {
  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  confidence: number;
  sourceLowCount: number;
  reason: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

function isValidBar(bar: SupportInputBar): boolean {
  const close = safeNumber(bar?.close, 0);
  const low = safeNumber(bar?.low, 0);
  const high = safeNumber(bar?.high, 0);

  return close > 0 && low > 0 && high > 0;
}

function sortAsc(nums: number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = sortAsc(nums);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function pickCandidateSupport(lows: number[], closes: number[]): number {
  if (lows.length === 0) return 0;

  // 用最近低點群的中位數，避免單一天異常值干擾
  const lowsMedian = median(lows);

  // 支撐不要高於最近收盤群均值太多
  const closeAvg = avg(closes);
  const cap = closeAvg * 0.995;

  return round2(Math.min(lowsMedian, cap));
}

function countSupportDays(
  bars: SupportInputBar[],
  supportPrice: number,
  tolerancePct = 0.015
): number {
  if (!bars.length || supportPrice <= 0) return 0;

  let days = 0;
  const tolerance = supportPrice * tolerancePct;

  for (let i = bars.length - 1; i >= 0; i--) {
    const low = safeNumber(bars[i]?.low, 0);

    // 低點沒有明顯跌破支撐，就算守住
    if (low >= supportPrice - tolerance) {
      days++;
    } else {
      break;
    }
  }

  return days;
}

function isStructureBroken(
  currentPrice: number,
  supportPrice: number,
  breakPct = 0.01
): boolean {
  if (currentPrice <= 0 || supportPrice <= 0) return false;

  return currentPrice < supportPrice * (1 - breakPct);
}

function buildReason(
  supportPrice: number,
  supportDays: number,
  structureBroken: boolean,
  confidence: number
): string {
  if (supportPrice <= 0) {
    return "無法形成有效支撐";
  }

  if (structureBroken) {
    return `跌破支撐 ${supportPrice}`;
  }

  if (supportDays >= 3 && confidence >= 70) {
    return `支撐 ${supportPrice} 守穩 ${supportDays} 天`;
  }

  if (supportDays >= 1) {
    return `支撐 ${supportPrice} 初步守穩 ${supportDays} 天`;
  }

  return `支撐 ${supportPrice} 尚待確認`;
}

/**
 * bars 規則：
 * - 請傳「由舊到新」的近期K棒
 * - 最少 5 根，建議 8~15 根
 */
export function calculateSupportFromBars(
  bars: SupportInputBar[],
  currentPrice?: number
): SupportResult {
  const validBars = bars.filter(isValidBar);

  if (validBars.length < 5) {
    return {
      supportPrice: 0,
      supportDays: 0,
      structureBroken: false,
      confidence: 0,
      sourceLowCount: 0,
      reason: "K棒資料不足，無法計算支撐",
    };
  }

  // 取最近 8 根為主，讓支撐更偏近況
  const recentBars = validBars.slice(-8);
  const lows = recentBars.map((b) => safeNumber(b.low, 0));
  const closes = recentBars.map((b) => safeNumber(b.close, 0));

  const supportPrice = pickCandidateSupport(lows, closes);
  const supportDays = countSupportDays(recentBars, supportPrice);

  const latestClose =
    safeNumber(currentPrice, 0) ||
    safeNumber(recentBars[recentBars.length - 1]?.close, 0);

  const structureBroken = isStructureBroken(latestClose, supportPrice);

  // 信心值：低點數量 + 守穩天數
  let confidence = 40;
  confidence += Math.min(20, lows.length * 2);
  confidence += Math.min(25, supportDays * 5);
  if (!structureBroken) confidence += 10;
  confidence = Math.max(0, Math.min(100, confidence));

  return {
    supportPrice,
    supportDays,
    structureBroken,
    confidence,
    sourceLowCount: lows.length,
    reason: buildReason(
      supportPrice,
      supportDays,
      structureBroken,
      confidence
    ),
  };
}

/**
 * 簡化版：
 * 你只有 low / close 陣列時可直接使用
 * arrays 規則同樣是由舊到新
 */
export function calculateSupportFromArrays(params: {
  lows: number[];
  closes: number[];
  currentPrice?: number;
}): SupportResult {
  const lows = Array.isArray(params?.lows) ? params.lows : [];
  const closes = Array.isArray(params?.closes) ? params.closes : [];

  const size = Math.min(lows.length, closes.length);
  const bars: SupportInputBar[] = [];

  for (let i = 0; i < size; i++) {
    bars.push({
      low: safeNumber(lows[i], 0),
      close: safeNumber(closes[i], 0),
      high: safeNumber(closes[i], 0),
    });
  }

  return calculateSupportFromBars(bars, params?.currentPrice);
}

/**
 * 單日快速判斷：
 * 已有支撐價時，用這個檢查有沒有破
 */
export function checkStructureBroken(params: {
  currentPrice: number;
  supportPrice: number;
  breakPct?: number;
}): boolean {
  return isStructureBroken(
    safeNumber(params?.currentPrice, 0),
    safeNumber(params?.supportPrice, 0),
    safeNumber(params?.breakPct, 0.01) || 0.01
  );
}
