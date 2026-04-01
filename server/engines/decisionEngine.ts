import runPoint21, { Point21Output } from "./point21Engine";

export type DecisionInput = {
  code?: string;
  price?: number;
  bars?: any[];
};

export type DecisionResult = {
  code: string;
  action: string;
  risk: string;
  score: number;
  reason: string;

  // === Point21 全欄位 ===
  point21Score: number;
  point21Value: number;
  simulatedPrice: number;
  diffValue: number;
  upperBound: number;
  positionRatio: number;
  point21State: string;
  point21Reason: string;
};

export function runDecision(input: DecisionInput): DecisionResult {
  const code = String(input?.code || "");
  const price = Number(input?.price || 0);

  // ===== Point21 =====
  const p21: Point21Output = runPoint21({
    code,
    price,
    bars: input?.bars || [],
  });

  // ===== Score 主導 =====
  const score = p21.point21Score;

  let action = "觀望";
  let risk = "中";

  if (score >= 70) {
    action = "進攻";
    risk = "低";
  } else if (score <= 30) {
    action = "防守";
    risk = "高";
  }

  return {
    code,
    action,
    risk,
    score,
    reason: p21.point21Reason,

    // ✅ 完整回傳（修正 TS2739）
    point21Score: p21.point21Score,
    point21Value: p21.point21Value,
    simulatedPrice: p21.simulatedPrice,
    diffValue: p21.diffValue,
    upperBound: p21.upperBound,
    positionRatio: p21.positionRatio,
    point21State: p21.point21State,
    point21Reason: p21.point21Reason,
  };
}
