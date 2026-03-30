import { getBatchQuotes, SCAN_SYMBOLS } from "./marketDataEngine";
import { runDecision, type DecisionResult } from "./decisionEngine";
import { getMarketState } from "./marketStateEngine";

type ScannerRow = {
  code: string;
  name: string;
  price: number;
  change: number;
  pct: number;
  volume: number;
  action: string;
  risk: string;
  score: number;
  reason: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isValidQuote(q: any): boolean {
  return q && q.price > 0;
}

function adjustRisk(risk: string, bias: number): string {
  const map = { "低": 0, "中": 1, "高": 2 };
  const rev = ["低", "中", "高"];

  const base = map[risk as keyof typeof map] ?? 1;
  let next = base + bias;

  if (next < 0) next = 0;
  if (next > 2) next = 2;

  return rev[next];
}

function buildRow(q: any, state: any): ScannerRow {
  const d = runDecision(q) as DecisionResult;

  let score = safeNumber(d?.score, 40);

  // 🔥 市場狀態影響分數
  score += state.scoreBias;

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    code: q.symbol,
    name: q.name,
    price: q.price,
    change: q.change,
    pct: q.pct,
    volume: q.volume,
    action: d.action,
    risk: adjustRisk(d.risk, state.riskBias),
    score,
    reason: `${state.label}｜${d.reason}`,
  };
}

export async function runScanner(): Promise<ScannerRow[]> {
  const quotes = await getBatchQuotes(SCAN_SYMBOLS);

  const validQuotes = quotes.filter(isValidQuote);

  if (validQuotes.length === 0) {
    return [];
  }

  // 🔥 市場狀態判斷
  const state = getMarketState(validQuotes);

  const rows = validQuotes.map((q) => buildRow(q, state));

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.pct - a.pct;
  });

  return rows.slice(0, 5);
}
