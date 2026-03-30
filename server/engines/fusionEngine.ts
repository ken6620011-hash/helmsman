import { getQuote } from "./marketDataEngine";
import { runDecision } from "./decisionEngine";

export type FusionInput = {
  code?: string;
  symbol?: string;
};

export type FusionQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pct: number;
  sector: string;
  error: string;
};

export type FusionModel = {
  action: string;
  risk: string;
  score: number;
  reason: string;
};

export type FusionResult = {
  quote: FusionQuote;
  model: FusionModel;
  extra: any;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown, fallback = ""): string {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return fallback;
}

function normalizeCode(input: FusionInput): string {
  return safeString(input?.code || input?.symbol, "");
}

function buildEmptyQuote(code: string): FusionQuote {
  return {
    symbol: code,
    name: code,
    price: 0,
    change: 0,
    pct: 0,
    sector: "未知",
    error: "無資料",
  };
}

function buildEmptyModel(reason = "無"): FusionModel {
  return {
    action: "觀望",
    risk: "中",
    score: 0,
    reason,
  };
}

function normalizeQuote(code: string, raw: any): FusionQuote {
  return {
    symbol: safeString(raw?.symbol, code),
    name: safeString(raw?.name, code),
    price: safeNumber(raw?.price, 0),
    change: safeNumber(raw?.change, 0),
    pct: safeNumber(raw?.pct, 0),
    sector: safeString(raw?.sector, "未知"),
    error: safeString(raw?.error, ""),
  };
}
function normalizeModel(raw: any): FusionModel {
  return {
    action: safeString(raw?.action, "觀望"),
    risk: safeString(raw?.risk, "中"),
    score: safeNumber(raw?.score, 0),
    reason: safeString(raw?.reason, "無"),
  };
}

function isValidQuote(q: FusionQuote): boolean {
  return !!q.symbol && safeNumber(q.price, 0) > 0;
}

export async function runFusion(input: FusionInput): Promise<FusionResult> {
  const code = normalizeCode(input);

  if (!code) {
    return {
      quote: buildEmptyQuote(""),
      model: buildEmptyModel("代碼空白"),
      extra: {
        ok: false,
        stage: "input",
      },
    };
  }

  try {
    const rawQuote = await getQuote(code);
    const quote = normalizeQuote(code, rawQuote);

    console.log("FUSION QUOTE:", quote);

    if (!isValidQuote(quote)) {
      return {
        quote: {
          ...quote,
          symbol: quote.symbol || code,
          name: quote.name || code,
          error: quote.error || "資料無效",
        },
        model: buildEmptyModel("無"),
        extra: {
          ok: false,
          stage: "quote",
          rawQuote,
        },
      };
    }

    const rawDecision = runDecision(quote);
    const model = normalizeModel(rawDecision);

    console.log("FUSION MODEL:", model);

    return {
      quote,
      model,
      extra: {
        ok: true,
        stage: "done",
      },
    };
  } catch (err: any) {
    console.log("FUSION ERROR:", err?.message || err);
    return {
      quote: {
        symbol: code,
        name: code,
        price: 0,
        change: 0,
        pct: 0,
        sector: "未知",
        error: err?.message || "fusion error",
      },
      model: buildEmptyModel("無"),
      extra: {
        ok: false,
        stage: "catch",
        error: err?.message || String(err),
      },
    };
  }
}

export default runFusion;

