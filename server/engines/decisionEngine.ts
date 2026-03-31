import { calculateSupportFromBars, type SupportInputBar } from "./supportEngine";

export type DecisionResult = {
  action: string;
  risk: string;
  score: number;
  reason: string;

  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportReason: string;
};

export function runDecision(input: any): DecisionResult {
  const quote = input?.quote || {};
  const model = input?.model || {};
  const bars: SupportInputBar[] = input?.bars || [];

  const price = Number(quote.price || 0);

  // ======================
  // 支撐計算
  // ======================
  const support = calculateSupportFromBars(bars, price);

  // ======================
  // 基礎決策
  // ======================
  let action = model.action || "觀望";
  let risk = model.risk || "中";
  let score = model.score || 0;
  let reason = model.reason || "無";

  // ======================
  // 支撐風控覆蓋
  // ======================
  if (support.structureBroken) {
    action = "防守";
    risk = "高";
    reason = `跌破支撐 ${support.supportPrice}`;
  }

  return {
    action,
    risk,
    score,
    reason,

    supportPrice: support.supportPrice,
    supportDays: support.supportDays,
    structureBroken: support.structureBroken,
    supportReason: support.reason,
  };
}
