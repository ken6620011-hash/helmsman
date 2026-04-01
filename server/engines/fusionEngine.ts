import { getQuote, getKbars, type Quote, type KBar } from "./marketDataEngine";
import runPoint21 from "./point21Engine";
import { getSupport, type SupportResult } from "./supportEngine";
import { runDecisionJson, type DecisionResult } from "./decisionEngine";
import { getPosition, hasOpenPosition, updatePosition, type PositionSnapshot } from "./positionEngine";
import HELMSMAN_CONFIG from "../config/helmsmanConfig";

export type FusionInput = {
  code?: string;
  symbol?: string;
};

export type FusionResult = {
  quote: Quote;
  bars: KBar[];
  point21: ReturnType<typeof runPoint21>;
  support: SupportResult;
  position: PositionSnapshot | null;
  hasPosition: boolean;
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
  const bars = await getKbars(code, HELMSMAN_CONFIG.support.lookbackBars);

  const point21 = runPoint21({
    code,
    price: quote.price,
    bars,
  });

  const support = await getSupport(code, quote.price);

  const currentlyHasPosition = hasOpenPosition(code);

  let position: PositionSnapshot | null = null;

  if (currentlyHasPosition) {
    position = updatePosition({
      code,
      currentPrice: quote.price,
    });
  } else {
    position = getPosition(code);
  }

  const entryPrice = position?.entryPrice ?? 0;
  const highestPriceSinceEntry = position?.highestPriceSinceEntry ?? 0;

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

    entryPrice,
    highestPriceSinceEntry,
    trailingStopEnabled: currentlyHasPosition,
  });

  return {
    quote,
    bars,
    point21,
    support,
    position,
    hasPosition: currentlyHasPosition,
    model,
  };
}

export default runFusion;
