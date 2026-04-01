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

export type KBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: string;
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

function parseTwseNumber(input: unknown) {
  if (input == null) return 0;

  const text = String(input)
    .trim()
    .replace(/,/g, "")
    .replace(/[＋+]/g, "")
    .replace(/[−－]/g, "-");

  if (!text || text === "--" || text === "---" || text === "X0.00") return 0;

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatTWSEMonthStart(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}01`;
}

async function safeGet(url: string, config: any) {
  try {
    return await axios.get(url, {
      timeout: 12000,
      ...config,
    });
  } catch (error: any) {
    const status = error?.response?.status;
    const msg = error?.response?.data || error?.message || error;
    throw new Error(`${status || "ERR"} ${String(msg)}`);
  }
}

async function fetchFromFinMind(code: string): Promise<Quote | null> {
  if (!FINMIND_TOKEN) {
    console.log("FinMind skipped:", code, "FINMIND_TOKEN missing");
    return null;
  }

  try {
    const response = await safeGet("https://api.finmindtrade.com/api/v4/data", {
      headers: buildFinMindHeaders(),
      params: {
        dataset: "TaiwanStockPrice",
        data_id: code,
        start_date: formatDateYYYYMMDD(shiftDays(new Date(), -40)),
      },
    });

    const raw = response?.data?.data;
    console.log("FINMIND RAW:", code, Array.isArray(raw) ? raw.length : 0);

    if (!Array.isArray(raw) || raw.length === 0) {
      return null;
    }

    const validRows = raw.filter((row: any) => safeNumber(row?.close, 0) > 0);
    if (!validRows.length) {
      return null;
    }

    const last = validRows[validRows.length - 1];
    const close = safeNumber(last?.close, 0);
    const spread = safeNumber(last?.spread, 0);
    const volume = safeNumber(last?.Trading_Volume, 0);

    if (close <= 0) return null;

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
  } catch (error: any) {
    console.log("FinMind error:", code, error?.message || error);
    return null;
  }
}

async function fetchFromTWSE(code: string): Promise<Quote | null> {
  const monthCandidates = [
    formatTWSEMonthStart(new Date()),
    formatTWSEMonthStart(shiftDays(new Date(), -35)),
    formatTWSEMonthStart(shiftDays(new Date(), -70)),
  ];

  for (const monthStart of monthCandidates) {
    try {
      const response = await safeGet("https://www.twse.com.tw/exchangeReport/STOCK_DAY", {
        params: {
          response: "json",
          date: monthStart,
          stockNo: code,
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.twse.com.tw/",
          Accept: "application/json,text/plain,*/*",
        },
      });

      const rows = response?.data?.data;
      console.log("TWSE RAW:", code, Array.isArray(rows) ? rows.length : 0, monthStart);

      if (!Array.isArray(rows) || rows.length === 0) {
        continue;
      }

      const validRows = rows.filter(
        (row: any) =>
          Array.isArray(row) &&
          row.length >= 8 &&
          parseTwseNumber(row[6]) > 0
      );

      if (!validRows.length) {
        continue;
      }

      const last = validRows[validRows.length - 1];

      const volume = parseTwseNumber(last[1]);
      const close = parseTwseNumber(last[6]);
      const spread = parseTwseNumber(last[7]);

      if (close <= 0) {
        continue;
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
    } catch (error: any) {
      console.log("TWSE error:", code, monthStart, error?.message || error);
    }
  }

  return null;
}

async function fetchKbarsFromFinMind(code: string, days = 60): Promise<KBar[] | null> {
  if (!FINMIND_TOKEN) {
    console.log("FinMind Kbars skipped:", code, "FINMIND_TOKEN missing");
    return null;
  }

  try {
    const startDate = formatDateYYYYMMDD(shiftDays(new Date(), -(days + 90)));

    const response = await safeGet("https://api.finmindtrade.com/api/v4/data", {
      headers: buildFinMindHeaders(),
      params: {
        dataset: "TaiwanStockPrice",
        data_id: code,
        start_date: startDate,
      },
    });

    const raw = response?.data?.data;
    console.log("FINMIND KBAR RAW:", code, Array.isArray(raw) ? raw.length : 0);

    if (!Array.isArray(raw) || raw.length === 0) {
      return null;
    }

    const bars: KBar[] = raw
      .map((row: any) => ({
        date: String(row?.date || ""),
        open: round2(safeNumber(row?.open, 0)),
        high: round2(safeNumber(row?.max, 0)),
        low: round2(safeNumber(row?.min, 0)),
        close: round2(safeNumber(row?.close, 0)),
        volume: Math.round(safeNumber(row?.Trading_Volume, 0)),
        source: "finmind",
      }))
      .filter((bar) => bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);

    if (bars.length < 5) {
      return null;
    }

    return bars.slice(-days);
  } catch (error: any) {
    console.log("FinMind Kbars error:", code, error?.message || error);
    return null;
  }
}

async function fetchOneTWSEMonthBars(code: string, monthStart: string): Promise<KBar[]> {
  try {
    const response = await safeGet("https://www.twse.com.tw/exchangeReport/STOCK_DAY", {
      params: {
        response: "json",
        date: monthStart,
        stockNo: code,
      },
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.twse.com.tw/",
        Accept: "application/json,text/plain,*/*",
      },
    });

    const rows = response?.data?.data;
    console.log("TWSE KBAR RAW:", code, Array.isArray(rows) ? rows.length : 0, monthStart);

    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    return rows
      .map((row: any) => {
        if (!Array.isArray(row) || row.length < 8) return null;

        return {
          date: String(row[0] || ""),
          open: round2(parseTwseNumber(row[3])),
          high: round2(parseTwseNumber(row[4])),
          low: round2(parseTwseNumber(row[5])),
          close: round2(parseTwseNumber(row[6])),
          volume: Math.round(parseTwseNumber(row[1])),
          source: "twse",
        } as KBar;
      })
      .filter((bar): bar is KBar => !!bar && bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0);
  } catch (error: any) {
    console.log("TWSE Kbars error:", code, monthStart, error?.message || error);
    return [];
  }
}

async function fetchKbarsFromTWSE(code: string, days = 60): Promise<KBar[] | null> {
  const monthCandidates = [
    formatTWSEMonthStart(new Date()),
    formatTWSEMonthStart(shiftDays(new Date(), -35)),
    formatTWSEMonthStart(shiftDays(new Date(), -70)),
    formatTWSEMonthStart(shiftDays(new Date(), -105)),
    formatTWSEMonthStart(shiftDays(new Date(), -140)),
  ];

  const bucket: KBar[] = [];

  for (const monthStart of monthCandidates) {
    const rows = await fetchOneTWSEMonthBars(code, monthStart);
    if (rows.length) {
      bucket.push(...rows);
    }
    if (bucket.length >= days) {
      break;
    }
  }

  if (!bucket.length) {
    return null;
  }

  const uniqueMap = new Map<string, KBar>();
  for (const bar of bucket) {
    uniqueMap.set(bar.date, bar);
  }

  const merged = Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  if (merged.length < 5) {
    return null;
  }

  return merged.slice(-days);
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
    const quote = await getQuote(code);
    out.push(quote);
  }

  return out;
}

export async function getKbars(code: string, days = 60): Promise<KBar[]> {
  const cleanCode = String(code || "").trim();

  if (!cleanCode) {
    return [];
  }

  const finmindBars = await fetchKbarsFromFinMind(cleanCode, days);
  if (Array.isArray(finmindBars) && finmindBars.length >= 5) {
    return finmindBars;
  }

  const twseBars = await fetchKbarsFromTWSE(cleanCode, days);
  if (Array.isArray(twseBars) && twseBars.length >= 5) {
    return twseBars;
  }

  console.log(`⚠️ ${cleanCode} K棒仍不足，回傳空陣列`);
  return [];
}
