export type DecisionInput = {
  code?: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;

  point21Score?: number;
  point21Value?: number;
  simulatedPrice?: number;
  diffValue?: number;
  upperBound?: number;
  point21State?: string;
  point21Reason?: string;

  supportPrice?: number;
  supportDays?: number;
  structureBroken?: boolean;
  supportReason?: string;
};

export type DecisionResult = {
  action: string;
  finalAction: string;
  risk: string;

  score: number;
  finalScore: number;
  rawScore: number;

  breakout: number;
  breakoutScore: number;

  reason: string;
  marketState: string;

  point21Score: number;
  point21Value: number;
  simulatedPrice: number;
  diffValue: number;
  upperBound: number;
  point21State: string;
  point21Reason: string;

  supportPrice: number;
  supportDays: number;
  structureBroken: boolean;
  supportReason: string;

  trailingStopActive: boolean;
  trailingStopRule: string;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function runDecisionJson(input: DecisionInput): DecisionResult {
  const price = round2(safeNumber(input?.price, 0));
  const changePercent = round2(safeNumber(input?.changePercent, 0));

  const point21Score = round2(safeNumber(input?.point21Score, 0));
  const point21Value = Math.max(0, Math.round(safeNumber(input?.point21Value, 0)));
  const simulatedPrice = round2(safeNumber(input?.simulatedPrice, price));
  const diffValue = round2(safeNumber(input?.diffValue, 0));
  const upperBound = round2(safeNumber(input?.upperBound, simulatedPrice));

  const supportPrice = round2(safeNumber(input?.supportPrice, 0));
  const supportDays = Math.max(0, Math.round(safeNumber(input?.supportDays, 0)));
  const structureBroken = Boolean(input?.structureBroken);

  let action: "進攻" | "觀望" | "防守" = "觀望";
  let risk: "低" | "中" | "高" = "中";
  let marketState = "觀望";

  if (structureBroken) {
    action = "防守";
    risk = "高";
    marketState = "防守";
  } else if (changePercent <= -5) {
    action = "防守";
    risk = "高";
    marketState = "修正";
  } else if (point21Value >= 18) {
    action = "進攻";
    risk = "低";
    marketState = "攻擊";
  } else if (point21Value >= 7) {
    action = "觀望";
    risk = "中";
    marketState = "觀望";
  } else {
    action = "防守";
    risk = "高";
    marketState = "防守";
  }

  const reasonParts: string[] = [];

  if (changePercent <= -3) {
    reasonParts.push("跌幅過大");
  }

  reasonParts.push(
    String(
      input?.point21Reason ||
        `21點數偏弱（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`
    )
  );

  if (supportPrice > 0) {
    reasonParts.push(
      String(
        input?.supportReason ||
          `支撐 ${supportPrice}，守穩 ${supportDays} 天`
      )
    );
  } else {
    reasonParts.push("尚無有效支撐資料");
  }

  const reason = reasonParts.join("；");

  return {
    action,
    finalAction: action,
    risk,

    score: point21Score,
    finalScore: point21Score,
    rawScore: point21Score,

    breakout: 0,
    breakoutScore: 0,

    reason,
    marketState,

    point21Score,
    point21Value,
    simulatedPrice,
    diffValue,
    upperBound,
    point21State: String(input?.point21State || "弱"),
    point21Reason: String(
      input?.point21Reason ||
        `21點數偏弱（${point21Value}/21），平台 ${simulatedPrice}，差值 ${diffValue}，上緣 ${upperBound}`
    ),

    supportPrice,
    supportDays,
    structureBroken,
    supportReason: String(input?.supportReason || ""),

    trailingStopActive: false,
    trailingStopRule: "未啟動（目前不屬於進攻持有區）",
  };
}

export const runDecision = runDecisionJson;
export default runDecisionJson;
