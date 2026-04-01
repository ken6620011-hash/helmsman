import { getQuote, getKbars, type Quote, type KBar } from "./marketDataEngine";
import runPoint21 from "./point21Engine";
import { getSupportData } from "./supportCacheEngine";
import { runDecisionJson, type DecisionResult } from "./decisionEngine";

export type FusionInput = {
  code?: string;
  symbol?: string;
};

export type FusionResult = {
  quote: Quote;
  bars: KBar[];
  point21: ReturnType<typeof runPoint21>;
  support: {
    supportPrice: number;
    supportDays: number;
    structureBroken: boolean;
    supportReason: string;
    confidence?: number;
  } | null;
  model: DecisionResult;
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
  const bars = await getKbars(code, 21);

  const point21 = runPoint21({
    code,
    price: quote.price,
    bars,
  });

  const support = getSupportData(code);

  const model = runDecisionJson({
    code: quote.symbol,
    name: quote.name,
    price: quote.price,
    change: quote.change,
    changePercent: quote.pct,

    point21Score: point21.point21Score,
    point21Value: point21.point21Value,
    simulatedPrice: point21.simulatedPrice,
    diffValue: point21.diffValue,
    upperBound: point21.upperBound,
    point21State: point21.point21State,
    point21Reason: point21.point21Reason,

    supportPrice: support?.supportPrice || 0,
    supportDays: support?.supportDays || 0,
    structureBroken: Boolean(support?.structureBroken),
    supportReason: String(support?.reason || ""),
  });

  return {
    quote,
    bars,
    point21,
    support: support
      ? {
          supportPrice: Number(support.supportPrice || 0),
          supportDays: Number(support.supportDays || 0),
          structureBroken: Boolean(support.structureBroken),
          supportReason: String(support.reason || ""),
          confidence: Number((support as any)?.confidence || 0),
        }
      : null,
    model,
  };
}

export default runFusion;
