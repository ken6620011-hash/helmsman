import { StockSnapshot } from "./realDataEngine";

export type MarketRegime = "Risk On" | "Selective" | "Defensive";

export type PortfolioPosition = {
  symbol: string;
  sector: string;
  radarScore: number;
  strategySignal: string;
  portfolioScore: number;
  weight: number;
};

export type PortfolioResult = {
  regime: MarketRegime;
  exposure: number;
  cashWeight: number;
  positions: PortfolioPosition[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function getSignalScore(signal: string): number {
  if (signal === "Buy Setup") return 100;
  if (signal === "Watch Setup") return 60;
  return 0;
}

export function detectMarketRegime(stocks: StockSnapshot[]): MarketRegime {
  if (!stocks.length) return "Defensive";

  const avgRadar =
    stocks.reduce((sum, stock) => sum + stock.radarScore, 0) / stocks.length;

  const buyCount = stocks.filter((s) => s.strategySignal === "Buy Setup").length;
  const reduceCount = stocks.filter((s) => s.strategySignal === "Reduce Risk").length;

  if (avgRadar >= 85 && buyCount >= reduceCount) return "Risk On";
  if (avgRadar >= 75) return "Selective";
  return "Defensive";
}

export function getExposureByRegime(regime: MarketRegime): number {
  if (regime === "Risk On") return 0.85;
  if (regime === "Selective") return 0.6;
  return 0.3;
}

export function calculatePortfolioScore(stock: StockSnapshot): number {
  const signalScore = getSignalScore(stock.strategySignal);

  const score =
    stock.radarScore * 0.35 +
    stock.momentumScore * 0.25 +
    stock.trendScore * 0.15 +
    stock.volumeScore * 0.10 +
    signalScore * 0.15;

  return round(score);
}

export function buildPortfolio(stocks: StockSnapshot[]): PortfolioResult {
  const regime = detectMarketRegime(stocks);
  const exposure = getExposureByRegime(regime);

  const eligible = stocks
    .filter((stock) => stock.radarScore >= 70)
    .filter((stock) => stock.strategySignal !== "Reduce Risk")
    .map((stock) => ({
      stock,
      portfolioScore: calculatePortfolioScore(stock)
    }))
    .sort((a, b) => b.portfolioScore - a.portfolioScore)
    .slice(0, 5);

  const totalScore = eligible.reduce((sum, item) => sum + item.portfolioScore, 0);

  if (totalScore === 0) {
    return {
      regime,
      exposure,
      cashWeight: 1,
      positions: []
    };
  }

  let positions = eligible.map((item) => {
    const rawWeight = item.portfolioScore / totalScore;
    const finalWeight = rawWeight * exposure;

    return {
      symbol: item.stock.symbol,
      sector: item.stock.sector,
      radarScore: item.stock.radarScore,
      strategySignal: item.stock.strategySignal,
      portfolioScore: item.portfolioScore,
      weight: round(clamp(finalWeight, 0, 0.2), 4)
    };
  });

  const sectorMap: Record<string, number> = {};
  positions = positions.map((position) => {
    const current = sectorMap[position.sector] ?? 0;
    const allowed = Math.max(0, 0.4 - current);
    const adjustedWeight = Math.min(position.weight, allowed);
    sectorMap[position.sector] = current + adjustedWeight;

    return {
      ...position,
      weight: round(adjustedWeight, 4)
    };
  });

  positions = positions.filter((position) => position.weight >= 0.05);

  const usedWeight = positions.reduce((sum, p) => sum + p.weight, 0);
  const cashWeight = round(1 - usedWeight, 4);

  return {
    regime,
    exposure,
    cashWeight,
    positions
  };
}
