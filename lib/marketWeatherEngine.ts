import { StockSnapshot } from "./realDataEngine";

export type MarketWeather = {
  label: "Risk On" | "Selective" | "Defensive" | "No Data";
  note: string;
  avgRadar: number;
  buyCount: number;
  reduceCount: number;
};

export function getMarketWeather(stocks: StockSnapshot[]): MarketWeather {
  if (!stocks.length) {
    return {
      label: "No Data",
      note: "Waiting for market data feed.",
      avgRadar: 0,
      buyCount: 0,
      reduceCount: 0
    };
  }

  const avgRadar =
    stocks.reduce((sum, s) => sum + s.radarScore, 0) / stocks.length;

  const buyCount = stocks.filter((s) => s.strategySignal === "Buy Setup").length;
  const reduceCount = stocks.filter((s) => s.strategySignal === "Reduce Risk").length;

  if (avgRadar >= 85 && buyCount >= reduceCount) {
    return {
      label: "Risk On",
      note: "Focus on leaders and top sectors.",
      avgRadar,
      buyCount,
      reduceCount
    };
  }

  if (avgRadar >= 70) {
    return {
      label: "Selective",
      note: "Stay with strongest names only.",
      avgRadar,
      buyCount,
      reduceCount
    };
  }

  return {
    label: "Defensive",
    note: "Preserve capital and reduce weak exposure.",
    avgRadar,
    buyCount,
    reduceCount
  };
}
