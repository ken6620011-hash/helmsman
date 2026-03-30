export type RiskResult = {
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
  reason: string;
};

export function runRiskEngine(price: number, support: number): RiskResult {
  const stopLoss = support * 0.97; // 跌破支撐 3%
  const takeProfit = price * 1.08; // 目標 8%
  const trailingStop = price * 0.95; // 回檔 5%

  let reason = "";

  if (price < support) {
    reason = "跌破支撐，立即停損";
  } else if (price > takeProfit) {
    reason = "達停利區，鎖利";
  } else {
    reason = "持有觀察，移動停損保護";
  }

  return {
    stopLoss,
    takeProfit,
    trailingStop,
    reason,
  };
}
