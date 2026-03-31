import { getQuote, type Quote, type KBar } from "./marketDataEngine";
import { runDecision } from "./decisionEngine";
import { getSupportData } from "./supportCacheEngine";

export type FusionInput = {
  code?: string;
  symbol?: string;
};

export type FusionResult = {
  quote: Quote;
  model: ReturnType<typeof runDecision>;
  bars: KBar[];
  extra: {
    supportPrice: number;
    supportDays: number;
    structureBroken: boolean;
    supportReason: string;
    trailingStopActive: boolean;
    trailingStopRule: string;
    supportConfidence?: number;
  };
};

function normalizeCode(input: FusionInput | string): string {
  if (typeof input === "string") {
    return String(input || "").trim();
  }

  return String(input?.code || input?.symbol || "").trim();
}

export async function runFusion(input: FusionInput | string): Promise<FusionResult> {
  const code = normalizeCode(input);
  const quote = await getQuote(code);

  const support = getSupportData(code);

  const model = runDecision({
    code,
    name: quote?.name,
    price: quote?.price,
    change: quote?.change,
    pct: quote?.pct,
    risk: "中",
    score: 0,
    breakout: 0,
    reason: quote?.error || "",
    supportPrice: support?.supportPrice || 0,
    supportDays: support?.supportDays || 0,
    structureBroken: Boolean(support?.structureBroken),
  });

  return {
    quote,
    model,
    bars: [],
    extra: {
      supportPrice: model.supportPrice,
      supportDays: model.supportDays,
      structureBroken: model.structureBroken,
      supportReason: model.supportReason,
      trailingStopActive: model.trailingStopActive,
      trailingStopRule: model.trailingStopRule,
      supportConfidence: support?.confidence || 0,
    },
  };
}

export default runFusion;
