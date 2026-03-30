import { StockSnapshot } from "./realDataEngine";

export type QuantScoreBreakdown = {
  technical: number;
  capitalFlow: number;
  emotion: number;
  fundamental: number;
  total: number;
};

function round(value: number, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function getQuantScore(stock: StockSnapshot): QuantScoreBreakdown {
  const technical =
    stock.radarScore * 0.5 + stock.trendScore * 0.3 + stock.momentumScore * 0.2;

  const capitalFlow =
    stock.volumeScore * 0.6 + stock.momentumScore * 0.2 + stock.radarScore * 0.2;

  const emotion =
    stock.changePct > 0
      ? Math.min(100, 60 + stock.changePct * 8)
      : Math.max(0, 50 + stock.changePct * 8);

  const fundamental =
    stock.sector.toLowerCase().includes("ai") ||
    stock.sector.toLowerCase().includes("semi")
      ? 80
      : 65;

  const total =
    technical * 0.4 +
    capitalFlow * 0.3 +
    emotion * 0.2 +
    fundamental * 0.1;

  return {
    technical: round(technical),
    capitalFlow: round(capitalFlow),
    emotion: round(emotion),
    fundamental: round(fundamental),
    total: round(total)
  };
}
