type DecisionInput = {
  techScore: number;
  eventScore: number;
  totalScore: number;
  eventTags: string[];
};

type DecisionOutput = {
  decision: "BUY" | "PREPARE" | "WATCH" | "EXIT";
  confidence: number;
  reason: string;
};

function hasAll(tags: string[], required: string[]) {
  return required.every((t) => tags.includes(t));
}

function calcConfidence(totalScore: number, eventScore: number) {
  const base = totalScore * 0.6 + eventScore * 0.4;
  return Math.min(99, Math.round(base));
}

export function runDecisionEngine(input: DecisionInput): DecisionOutput {
  const { techScore, eventScore, totalScore, eventTags } = input;

  const strongConfluence = hasAll(eventTags, [
    "主力吸籌",
    "籌碼集中",
    "法人偏多",
  ]);

  const midConfluence =
    eventTags.includes("法人偏多") ||
    eventTags.includes("營收成長") ||
    eventTags.includes("AI");

  let decision: DecisionOutput["decision"] = "WATCH";
  let reason = "盤整觀察";

  // 🔥 第一層（最強共振）
  if (strongConfluence && totalScore >= 75) {
    decision = "BUY";
    reason = "主力＋法人＋籌碼 三重共振";
  }

  // 🔥 第二層（強）
  else if (totalScore >= 75) {
    decision = "BUY";
    reason = "總分強勢突破";
  }

  // 🔥 第三層（準備）
  else if (totalScore >= 70 && midConfluence) {
    decision = "PREPARE";
    reason = "多頭訊號累積";
  }

  else if (totalScore >= 65) {
    decision = "PREPARE";
    reason = "接近啟動區";
  }

  // 🔥 第四層（觀察）
  else if (totalScore >= 50) {
    decision = "WATCH";
    reason = "尚未形成趨勢";
  }

  // 🔥 第五層（退出）
  else {
    decision = "EXIT";
    reason = "弱勢或風險過高";
  }

  const confidence = calcConfidence(totalScore, eventScore);

  return {
    decision,
    confidence,
    reason,
  };
}
