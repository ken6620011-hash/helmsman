import { getFinmindToken } from "../config/tokenStore";

type FinMindPriceRow = {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
  Trading_turnover: number;
};

export type RealStockSnapshot = {
  symbol: string;
  date: string;
  currentPrice: number;
  recentHigh: number;
  recentLow: number;
  avgVolume5: number;
  latestVolume: number;
  prevClose: number;
  prev5Close: number[];
  closes20: number[];
};

function ensureToken(): string {
  const token = getFinmindToken();
  if (!token) {
    throw new Error("FINMIND_TOKEN is missing");
  }
  return token;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function maxOf(values: number[]): number {
  if (!values.length) return 0;
  return Math.max(...values);
}

function minOf(values: number[]): number {
  if (!values.length) return 0;
  return Math.min(...values);
}

async function fetchFinmindPriceDaily(symbol: string, startDate: string): Promise<FinMindPriceRow[]> {
  const token = ensureToken();

  const url = new URL("https://api.finmindtrade.com/api/v4/data");
  url.searchParams.set("dataset", "TaiwanStockPrice");
  url.searchParams.set("data_id", symbol);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("token", token);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`FinMind API failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    msg?: string;
    status?: number;
    data?: Array<Record<string, unknown>>;
  };

  if (!Array.isArray(json?.data)) {
    throw new Error(json?.msg || "FinMind data format invalid");
  }

  return json.data.map((row) => ({
    date: String(row.date || ""),
    stock_id: String(row.stock_id || symbol),
    Trading_Volume: toNumber(row.Trading_Volume),
    Trading_money: toNumber(row.Trading_money),
    open: toNumber(row.open),
    max: toNumber(row.max),
    min: toNumber(row.min),
    close: toNumber(row.close),
    spread: toNumber(row.spread),
    Trading_turnover: toNumber(row.Trading_turnover),
  }));
}

function buildMockSnapshot(symbol: string): RealStockSnapshot {
  const mockMap: Record<string, RealStockSnapshot> = {
    "3016": {
      symbol: "3016",
      date: "2026-03-26",
      currentPrice: 60.8,
      recentHigh: 67.3,
      recentLow: 51.5,
      avgVolume5: 1250000,
      latestVolume: 1420000,
      prevClose: 60.1,
      prev5Close: [57.8, 58.9, 59.7, 60.1, 59.8],
      closes20: [
        52.4, 53.1, 53.8, 54.2, 54.9,
        55.6, 56.1, 56.8, 57.2, 57.8,
        58.1, 58.6, 58.9, 59.2, 59.7,
        59.8, 60.1, 60.3, 60.4, 60.8,
      ],
    },
    "6187": {
      symbol: "6187",
      date: "2026-03-26",
      currentPrice: 76.7,
      recentHigh: 79.0,
      recentLow: 62.2,
      avgVolume5: 980000,
      latestVolume: 1150000,
      prevClose: 75.9,
      prev5Close: [71.2, 72.8, 73.6, 74.9, 75.9],
      closes20: [
        63.0, 63.5, 64.2, 64.8, 65.5,
        66.1, 66.8, 67.3, 68.0, 68.8,
        69.7, 70.4, 71.2, 72.0, 72.8,
        73.6, 74.1, 74.9, 75.9, 76.7,
      ],
    },
    "3707": {
      symbol: "3707",
      date: "2026-03-26",
      currentPrice: 50.9,
      recentHigh: 56.2,
      recentLow: 47.8,
      avgVolume5: 760000,
      latestVolume: 690000,
      prevClose: 50.6,
      prev5Close: [49.1, 49.6, 49.9, 50.2, 50.6],
      closes20: [
        48.0, 48.2, 48.5, 48.7, 48.9,
        49.1, 49.0, 49.3, 49.6, 49.8,
        49.7, 49.9, 50.1, 50.0, 50.2,
        50.4, 50.3, 50.5, 50.6, 50.9,
      ],
    },
  };

  return (
    mockMap[symbol] || {
      symbol,
      date: "2026-03-26",
      currentPrice: 50,
      recentHigh: 55,
      recentLow: 45,
      avgVolume5: 500000,
      latestVolume: 520000,
      prevClose: 49.5,
      prev5Close: [48.5, 48.8, 49.1, 49.3, 49.5],
      closes20: [
        46.0, 46.2, 46.5, 46.7, 47.0,
        47.3, 47.6, 47.9, 48.1, 48.4,
        48.6, 48.8, 49.0, 49.2, 49.3,
        49.4, 49.5, 49.6, 49.7, 50.0,
      ],
    }
  );
}

export async function getRealStockSnapshot(symbol: string): Promise<RealStockSnapshot> {
  try {
    const rows = await fetchFinmindPriceDaily(symbol, "2025-01-01");

    if (!rows.length) {
      return buildMockSnapshot(symbol);
    }

    const recent20 = rows.slice(-20);

    if (recent20.length < 6) {
      return buildMockSnapshot(symbol);
    }

    const latest = recent20[recent20.length - 1];
    const prev = recent20[recent20.length - 2] || latest;

    const highs = recent20.map((r) => r.max).filter((n) => n > 0);
    const lows = recent20.map((r) => r.min).filter((n) => n > 0);
    const closes20 = recent20.map((r) => r.close).filter((n) => n > 0);

    if (!closes20.length) {
      return buildMockSnapshot(symbol);
    }

    const latest5 = recent20.slice(-5);
    const prev5Close = recent20.slice(-6, -1).map((r) => r.close);

    return {
      symbol,
      date: latest.date,
      currentPrice: latest.close,
      recentHigh: maxOf(highs),
      recentLow: minOf(lows),
      avgVolume5: avg(latest5.map((r) => r.Trading_Volume)),
      latestVolume: latest.Trading_Volume,
      prevClose: prev.close,
      prev5Close,
      closes20,
    };
  } catch (error) {
    console.error(`[finmindProvider] fallback to mock for ${symbol}:`, error);
    return buildMockSnapshot(symbol);
  }
}

export async function verifyFinmindToken(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const token = ensureToken();

    const url = new URL("https://api.finmindtrade.com/api/v4/data");
    url.searchParams.set("dataset", "TaiwanStockPrice");
    url.searchParams.set("data_id", "2330");
    url.searchParams.set("start_date", "2025-01-01");
    url.searchParams.set("token", token);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        message: `FinMind token invalid (${res.status})`,
      };
    }

    const json = (await res.json()) as {
      msg?: string;
      data?: unknown[];
    };

    if (!Array.isArray(json?.data)) {
      return {
        ok: false,
        message: json?.msg || "FinMind token check failed",
      };
    }

    return {
      ok: true,
      message: "FinMind token ok",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
