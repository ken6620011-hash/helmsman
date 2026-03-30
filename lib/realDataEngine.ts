export type ChartPoint = {
  date: string;
  close: number;
  volume: number;
};

export type StockSnapshot = {
  symbol: string;
  sector: string;
  price: number;
  changePct: number;
  radarScore: number;
  momentumScore: number;
  trendScore: number;
  volumeScore: number;
  strategySignal: string;
  marketCap?: number;
  updatedAt?: string;
  chart?: ChartPoint[];
};

type SnapshotResponse = {
  market: string;
  source: string;
  count: number;
  data: StockSnapshot[];
};

const DEFAULT_PROXY =
  process.env.EXPO_PUBLIC_MARKET_PROXY_URL || "http://127.0.0.1:8787";

function fallbackData(): StockSnapshot[] {
  return [
    {
      symbol: "NVDA",
      sector: "AI / Semiconductor",
      price: 875,
      changePct: 2.4,
      radarScore: 92,
      momentumScore: 90,
      trendScore: 88,
      volumeScore: 85,
      strategySignal: "Buy Setup"
    },
    {
      symbol: "AVGO",
      sector: "AI / Semiconductor",
      price: 1320,
      changePct: 1.8,
      radarScore: 88,
      momentumScore: 86,
      trendScore: 84,
      volumeScore: 80,
      strategySignal: "Watch Setup"
    },
    {
      symbol: "TSM",
      sector: "Semiconductor",
      price: 160,
      changePct: 1.2,
      radarScore: 82,
      momentumScore: 80,
      trendScore: 79,
      volumeScore: 75,
      strategySignal: "Watch Setup"
    },
    {
      symbol: "AMD",
      sector: "Semiconductor",
      price: 180,
      changePct: -0.5,
      radarScore: 70,
      momentumScore: 68,
      trendScore: 66,
      volumeScore: 65,
      strategySignal: "Reduce Risk"
    }
  ];
}

export async function fetchMarketSnapshots(
  market: string,
  symbols?: string[]
): Promise<StockSnapshot[]> {
  try {
    const query = new URLSearchParams();
    query.set("market", market);
    if (symbols?.length) {
      query.set("symbols", symbols.join(","));
    }

    const url = `${DEFAULT_PROXY}/api/market/snapshots?${query.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Proxy error ${res.status}`);
    }

    const json = (await res.json()) as SnapshotResponse;
    if (!json?.data || !Array.isArray(json.data)) {
      throw new Error("Invalid snapshot payload");
    }

    return json.data;
  } catch (error) {
    console.warn("Helmsman live data failed, fallback demo data used:", error);
    return fallbackData();
  }
}
