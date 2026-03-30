import axios from "axios";

const FINMIND_TOKEN = String(process.env.FINMIND_TOKEN || "").trim();

export const SCAN_SYMBOLS = [
  "2308",
  "2317",
  "2330",
  "2454",
  "3034",
];

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pct: number;
  volume: number;
  sector: string;
  error?: string;
  source?: string;
  date?: string;
};

const STOCK_NAME_MAP: Record<string, string> = {
  "2308": "台達電",
  "2317": "鴻海",
  "2330": "台積電",
  "2454": "聯發科",
  "3034": "聯詠",
};

function resolveName(code: string) {
  return STOCK_NAME_MAP[code] || code;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function emptyQuote(code: string, reason: string, source = "none"): Quote {
  return {
    symbol: code,
    name: resolveName(code),
    price: 0,
    change: 0,
    pct: 0,
    volume: 0,
    sector: "未知",
    error: reason,
    source,
    date: "",
  };
}

function buildFinMindHeaders() {
  if (!FINMIND_TOKEN) return {};
  return {
    Authorization: `Bearer ${FINMIND_TOKEN}`,
  };
}

function normalizePct(price: number, change: number) {
  const prevClose = price - change;
  if (prevClose <= 0) return 0;
  return round2((change / prevClose) * 100);
}

async function fetchFromFinMind(code: string): Promise<Quote | null> {
  if (!FINMIND_TOKEN) {
    console.log("FinMind skipped:", code, "FINMIND_TOKEN missing");
    return null;
  }

  try {
    const response = await axios.get("https://api.finmindtrade.com/api/v4/data", {
      headers: buildFinMindHeaders(),
      params: {
        dataset: "TaiwanStockPrice",
        data_id: code,
        start_date: "2024-01-01",
      },
      timeout: 15000,
    });

    const raw = response?.data?.data;
    console.log("FINMIND RAW:", code, Array.isArray(raw) ? raw.length : 0);

    if (!Array.isArray(raw) || raw.length === 0) {
      return null;
    }

    const last = raw[raw.length - 1];

    const close = safeNumber(last?.close, 0);
    const spread = safeNumber(last?.spread, 0);
    const volume = safeNumber(last?.Trading_Volume, 0);

    if (close <= 0) {
      return null;
    }

    return {
      symbol: code,
      name: resolveName(code),
      price: round2(close),
      change: round2(spread),
      pct: normalizePct(close, spread),
      volume: Math.round(volume),
      sector: "未知",
      source: "finmind",
      date: String(last?.date || ""),
    };
  } catch (err: any) {
    console.log(
      "FinMind error:",
      code,
      err?.response?.status,
      err?.response?.data || err?.message || err
    );
    return null;
  }
}

function parseTwseNumber(input: unknown) {
  if (input == null) return 0;
  const text = String(input).trim().replace(/,/g, "");
  if (!text || text === "--" || text === "---" || text === "X0.00") return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

async function fetchFromTWSE(code: string): Promise<Quote | null> {
  try {
    const now = new Date();
    const yyyymm01 = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}01`;

    const response = await axios.get("https://www.twse.com.tw/exchangeReport/STOCK_DAY", {
      params: {
        response: "json",
        date: yyyymm01,
        stockNo: code,
      },
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.twse.com.tw/",
      },
    });

    const rows = response?.data?.data;
    console.log("TWSE RAW:", code, Array.isArray(rows) ? rows.length : 0);

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const last = rows[rows.length - 1];
    if (!Array.isArray(last) || last.length < 7) {
      return null;
    }

    // TWSE STOCK_DAY columns:
    // [日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數]
    const volume = parseTwseNumber(last[1]);
    const close = parseTwseNumber(last[6]);
    const spread = parseTwseNumber(last[7]);

    if (close <= 0) {
      return null;
    }

    return {
      symbol: code,
      name: resolveName(code),
      price: round2(close),
      change: round2(spread),
      pct: normalizePct(close, spread),
      volume: Math.round(volume),
      sector: "未知",
      source: "twse",
      date: String(last[0] || ""),
    };
  } catch (err: any) {
    console.log(
      "TWSE error:",
      code,
      err?.response?.status,
      err?.response?.data || err?.message || err
    );
    return null;
  }
}

export async function getQuote(code: string): Promise<Quote> {
  const cleanCode = String(code || "").trim();

  if (!cleanCode) {
    return emptyQuote("", "代號空白", "none");
  }

  const finmindQuote = await fetchFromFinMind(cleanCode);
  if (finmindQuote && finmindQuote.price > 0) {
    return finmindQuote;
  }

  const twseQuote = await fetchFromTWSE(cleanCode);
  if (twseQuote && twseQuote.price > 0) {
    return twseQuote;
  }

  return emptyQuote(cleanCode, "雙來源皆無有效資料", "fallback");
}

export async function getBatchQuotes(codes: string[]): Promise<Quote[]> {
  const out: Quote[] = [];

  for (const code of codes) {
    const q = await getQuote(code);
    out.push(q);
  }

  return out;
}
