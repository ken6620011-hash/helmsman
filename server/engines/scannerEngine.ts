import { getBatchQuotes, SCAN_SYMBOLS } from "./marketDataEngine";
import { runDecision, type DecisionResult } from "./decisionEngine";
import { getMarketState } from "./marketStateEngine";

export type ScannerRow = {
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
  return !!q && safeNumber(q?.price, 0) > 0;
}

function normalizeCode(q: any): string {
  return String(q?.code || q?.symbol || "");
}

function normalizeName(q: any): string {
  return String(q?.name || "");
}

function normalizePct(q: any): number {
  return safeNumber(q?.pct ?? q?.changePercent ?? q?.changePct, 0);
}

function shouldKeepRow(row: ScannerRow): boolean {
  if (row.score < 60) return false;

  const blockedActions = ["防守", "出場", "禁止", "禁止進場"];
  if (blockedActions.includes(row.action)) return false;

  return true;
}

function buildRow(q: any, d: DecisionResult, marketLabel: string): ScannerRow {
  return {
    code: normalizeCode(q),
    name: normalizeName(q),
    price: safeNumber(q?.price, 0),
    change: safeNumber(q?.change, 0),
    pct: normalizePct(q),
    volume: safeNumber(q?.volume, 0),
    action: String(d?.action || "觀望"),
    risk: String(d?.risk || "中"),
    score: safeNumber(d?.score, 0),
    reason: `${marketLabel}｜${String(d?.reason || "無")}`,
  };
}

export async function runScanner(): Promise<ScannerRow[]> {
  console.log("🔥 SCANNER GATE (decision unified)");

  const quotes = await getBatchQuotes(SCAN_SYMBOLS);
  const validQuotes = quotes.filter(isValidQuote);

  if (validQuotes.length === 0) {
    return [];
  }

  const market = getMarketState(validQuotes);

  // 🔥 市場不允許，直接不給機會股
  if (market.state === "DEFENSE" || market.state === "CORRECTION") {
    console.log(`🛑 SCANNER BLOCKED BY MARKET: ${market.label}`);
    return [];
  }

  const rows: ScannerRow[] = [];

  for (const q of validQuotes) {
    try {
      const decision = runDecision(q) as DecisionResult;
      const row = buildRow(q, decision, market.label);

      if (shouldKeepRow(row)) {
        rows.push(row);
      }
    } catch (err) {
      console.error("❌ scanner decision error:", err);
    }
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.pct - a.pct;
  });

  return rows.slice(0, 5);
}
