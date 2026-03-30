export type BacktestParams = {
  symbol: string;
  hci?: number;
  hti?: number;
};

export type BacktestResult = {
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  ev: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}
function estimateWinRate(hci = 0, hti = 0) {
  const base = 42;
  const hciPart = hci * 1.4;
  const htiPart = hti * 0.18;
  return clamp(round(base + hciPart + htiPart), 25, 78);
}

function estimateAvgReturn(hci = 0, hti = 0) {
  const value = hci * 0.22 + hti * 0.04 - 1.2;
  return clamp(round(value), -5, 12);
}

function estimateMaxDrawdown(hci = 0, hti = 0) {
  const value = 12 - hci * 0.18 - hti * 0.03;
  return clamp(round(value), 2, 18);
}

function estimateEV(winRate: number, avgReturn: number, maxDrawdown: number) {
  const value = winRate * 0.12 + avgReturn * 2 - maxDrawdown * 0.6;
  return round(value);
}
export function runBacktest(params: BacktestParams): BacktestResult {
  const hci = params.hci ?? 0;
  const hti = params.hti ?? 0;

  const winRate = estimateWinRate(hci, hti);
  const avgReturn = estimateAvgReturn(hci, hti);
  const maxDrawdown = estimateMaxDrawdown(hci, hti);
  const ev = estimateEV(winRate, avgReturn, maxDrawdown);

  return {
    winRate,
    avgReturn,
    maxDrawdown,
    ev,
  };
}
