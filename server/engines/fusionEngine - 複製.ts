/**
 * Fusion Engine（完整覆蓋版）
 *
 * 責任：
 * 1. 保留 quote 原始資料
 * 2. 若有 model / decision 前置資料，一起帶下去
 * 3. 絕對不可把 quote 洗掉
 */

export function runFusion(input: any) {
  const quote = input?.quote || {};
  const model = input?.model || {};
  const extra = input?.extra || {};

  return {
    quote: {
      symbol: String(quote?.symbol ?? ""),
      name: String(quote?.name ?? ""),
      price: Number(quote?.price ?? 0),
      change: Number(quote?.change ?? 0),
      pct: Number(quote?.pct ?? quote?.changePercent ?? 0),
      sector: String(quote?.sector ?? "未知"),
      error: String(quote?.error ?? ""),
    },

    model: {
      ...model,
    },

    extra: {
      ...extra,
    },
  };
}
