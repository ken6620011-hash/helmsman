import { getQuote, getBatchQuotes } from "./marketDataEngine";
import { runModelEngine } from "./modelEngine";
import { runFusion } from "./fusionEngine";
import { runDecisionJson } from "./decisionEngine";

/**
 * Helmsman Core Engine（封板版）
 *
 * ✅ 責任：
 * - 串接 quote → model → fusion → decision
 *
 * ❌ 禁止：
 * - 不可計算 marketState
 * - 不可修改 decision
 * - 不可新增決策邏輯
 */

export async function buildDecisionByCode(code: string) {
  const cleanCode = String(code || "").trim();
  if (!cleanCode) return null;

  const quote: any = await getQuote(cleanCode);
  if (!quote) return null;

  return buildDecisionFromQuote(quote);
}

export async function buildDecisionBatch(codes: string[]) {
  const quotes = await getBatchQuotes(codes);
  const results: any[] = [];

  for (const q of quotes) {
    try {
      const d = buildDecisionFromQuote(q);
      if (d) results.push(d);
    } catch (err) {
      console.log("core batch error:", q?.symbol, err);
    }
  }

  return results;
}

export function buildDecisionFromQuote(quote: any) {
  if (!quote) return null;

  const model: any = runModelEngine(quote);

  const fusion = runFusion({
    quote: {
      symbol: quote?.symbol ?? "未知",
      name: quote?.name ?? quote?.symbol ?? "未知",
      price: Number(quote?.price ?? 0),
      change: Number(quote?.change ?? 0),
      pct: Number(quote?.pct ?? quote?.changePercent ?? 0),
      sector: quote?.sector ?? "未知",
      error: quote?.error ?? "",
    },
    model,
  });

  return runDecisionJson(fusion);
}
