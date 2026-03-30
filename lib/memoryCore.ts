
import { StockSnapshot } from "./realDataEngine";
import { buildPortfolio } from "./portfolioEngine";
import { getMarketWeather } from "./marketWeatherEngine";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMORY_KEY = "helmsman_memory_v1";

export type MemorySnapshot = {
  timestamp: string;
  marketWeather: string;
  regime: string;
  exposure: number;
  cashWeight: number;
  topSymbols: string[];
};

export async function saveMemorySnapshot(stocks: StockSnapshot[]) {
  const portfolio = buildPortfolio(stocks);
  const weather = getMarketWeather(stocks);

  const snapshot: MemorySnapshot = {
    timestamp: new Date().toISOString(),
    marketWeather: weather.label,
    regime: portfolio.regime,
    exposure: portfolio.exposure,
    cashWeight: portfolio.cashWeight,
    topSymbols: stocks.slice(0, 3).map((s) => s.symbol)
  };

  const raw = await AsyncStorage.getItem(MEMORY_KEY);
  const history: MemorySnapshot[] = raw ? JSON.parse(raw) : [];
  history.unshift(snapshot);
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export async function getMemorySnapshot(): Promise<MemorySnapshot[]> {
  const raw = await AsyncStorage.getItem(MEMORY_KEY);
  return raw ? JSON.parse(raw) : [];
}
