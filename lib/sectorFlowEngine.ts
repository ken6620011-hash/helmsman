import { StockSnapshot } from "./realDataEngine";
import { getQuantScore } from "./quantEngine";

export type SectorFlowItem = {
  sector: string;
  heat: number;
  averageChange: number;
  stockCount: number;
  leader: string;
  signal: "Leading" | "Strong" | "Neutral" | "Weak";
};

function round(value: number, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function getSectorFlow(stocks: StockSnapshot[]): SectorFlowItem[] {
  const map: Record<string, StockSnapshot[]> = {};

  for (const stock of stocks) {
    if (!map[stock.sector]) map[stock.sector] = [];
    map[stock.sector].push(stock);
  }

  return Object.entries(map)
    .map(([sector, items]) => {
      const averageChange =
        items.reduce((sum, s) => sum + s.changePct, 0) / items.length;

      const averageScore =
        items.reduce((sum, s) => sum + getQuantScore(s).total, 0) / items.length;

      const leader = [...items].sort(
        (a, b) => getQuantScore(b).total - getQuantScore(a).total
      )[0]?.symbol ?? "-";

      let signal: SectorFlowItem["signal"] = "Weak";
      if (averageScore >= 85) signal = "Leading";
      else if (averageScore >= 75) signal = "Strong";
      else if (averageScore >= 65) signal = "Neutral";

      return {
        sector,
        heat: round(averageScore),
        averageChange: round(averageChange),
        stockCount: items.length,
        leader,
        signal
      };
    })
    .sort((a, b) => b.heat - a.heat);
}
