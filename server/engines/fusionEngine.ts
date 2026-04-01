import { getQuote, getKbars, type Quote, type KBar } from "./marketDataEngine";
import runPoint21 from "./point21Engine";
import { getSupport, type SupportResult } from "./supportEngine";
import { runDecisionJson, type DecisionResult } from "./decisionEngine";

export type FusionInput = {
  code?: string;
  symbol?: string;
};

export type FusionResult = {
  quote: Quote;
  bars: KBar[];
  point21: ReturnType<typeof runPoint21>;
  support: SupportResult;
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

  const support = await getSupport(code, quote.price);

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

    supportPrice: support.supportPrice,
    supportDays: support.supportDays,
    structureBroken: support.structureBroken,
    supportReason: support.reason,
  });

  return {
    quote,
    bars,
    point21,
    support,
    model,
  };
}

export default runFusion;
