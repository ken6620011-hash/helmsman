export type SupportInputBar = {
  open: number;
  high: number;
  low: number;
  close: number;
};

export function calculateSupportFromBars(
  bars: SupportInputBar[],
  currentPrice: number
) {
  if (!Array.isArray(bars) || bars.length < 5) {
    return empty("K棒不足");
  }

  const recent = bars.slice(-20);

  const lows = recent.map((b) => b.low).filter((v) => v > 0);

  if (lows.length === 0) {
    return empty("無低點資料");
  }

  const sorted = [...lows].sort((a, b) => a - b);

  const idx = Math.floor(sorted.length * 0.2);
  const supportPrice = sorted[idx] || sorted[0];

  let supportDays = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].low >= supportPrice) {
      supportDays++;
    } else {
      break;
    }
  }

  const structureBroken = currentPrice < supportPrice;

  return {
    supportPrice: round2(supportPrice),
    supportDays,
    structureBroken,
    confidence: Math.min(100, supportDays * 10),
    sourceLowCount: lows.length,
    reason: structureBroken
      ? "已跌破支撐"
      : `支撐區有效（${supportDays}天）`,
  };
}

function empty(reason: string) {
  return {
    supportPrice: 0,
    supportDays: 0,
    structureBroken: false,
    confidence: 0,
    sourceLowCount: 0,
    reason,
  };
}

function round2(n: number) {
  return Number(n.toFixed(2));
}
