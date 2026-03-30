export type PositionPlan = {
  positionPct: number;
  cashPct: number;
  actionLabel: string;
  riskLabel: string;
  note: string;
};

type PositionInput = {
  decision: "BUY" | "PREPARE" | "WATCH" | "EXIT";
  totalScore: number;
  eventScore: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  eventTags?: string[];
};

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

export function calculatePositionPlan(input: PositionInput): PositionPlan {
  const {
    decision,
    totalScore,
    eventScore,
    riskLevel = "MEDIUM",
    eventTags = [],
  } = input;

  let positionPct = 0;
  let actionLabel = "觀望";
  let riskLabel = riskLevel;
  let note = "保持現金優先。";

  const hasStrongConfluence =
    eventTags.includes("主力吸籌") &&
    eventTags.includes("籌碼集中") &&
    eventTags.includes("法人偏多");

  if (decision === "BUY") {
    positionPct = 60;
    actionLabel = "主攻倉";
    note = "條件完整，可建立主倉。";

    if (totalScore >= 90) positionPct = 70;
    if (eventScore >= 20) positionPct += 10;
    if (hasStrongConfluence) positionPct += 10;
  } else if (decision === "PREPARE") {
    positionPct = 20;
    actionLabel = "試單倉";
    note = "先小倉觀察，等待確認。";

    if (totalScore >= 80) positionPct = 30;
    if (eventScore >= 15) positionPct += 10;
  } else if (decision === "WATCH") {
    positionPct = 0;
    actionLabel = "觀察";
    note = "不進場，等結構更清楚。";
  } else if (decision === "EXIT") {
    positionPct = 0;
    actionLabel = "退出";
    note = "不持倉，保留現金。";
  }

  if (riskLevel === "HIGH") {
    positionPct -= 20;
    note = `風險偏高，降倉處理。${note}`;
  } else if (riskLevel === "MEDIUM") {
    positionPct -= 10;
  }

  positionPct = clamp(positionPct, 0, 90);

  return {
    positionPct,
    cashPct: 100 - positionPct,
    actionLabel,
    riskLabel,
    note,
  };
}
