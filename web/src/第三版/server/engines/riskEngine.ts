// server/engines/riskEngine.ts

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface RiskInput {
  decision: string;
  totalScore: number;
  confidence: number;
  marketState: string;
}

interface RiskOutput {
  riskLevel: RiskLevel;
  score: number;
  reason: string;
}

/**
 * RiskEngine
 * 核心職責：
 * 將「決策」轉換為「可執行風險等級」
 */
export function runRiskEngine(input: RiskInput): RiskOutput {
  const { decision, totalScore, confidence, marketState } = input;

  let score = 0;
  let reasons: string[] = [];

  // ===== 1. 決策風險 =====
  if (decision === "BUY") {
    score += 10;
    reasons.push("進攻單");
  } else if (decision === "PREPARE") {
    score += 20;
    reasons.push("試單");
  } else if (decision === "WATCH") {
    score += 35;
    reasons.push("觀察");
  } else if (decision === "EXIT") {
    score += 60;
    reasons.push("出場");
  }

  // ===== 2. 分數風險 =====
  if (totalScore >= 80) {
    score -= 10;
    reasons.push("高分");
  } else if (totalScore >= 60) {
    score += 0;
    reasons.push("中分");
  } else {
    score += 20;
    reasons.push("低分");
  }

  // ===== 3. 信心風險 =====
  if (confidence >= 70) {
    score -= 10;
    reasons.push("高信心");
  } else if (confidence >= 40) {
    score += 5;
    reasons.push("普通信心");
  } else {
    score += 20;
    reasons.push("低信心");
  }

  // ===== 4. 盤勢風險 =====
  if (marketState === "ATTACK") {
    score -= 10;
    reasons.push("攻擊盤");
  } else if (marketState === "ROTATION") {
    score += 5;
    reasons.push("輪動盤");
  } else if (marketState === "TEST") {
    score += 15;
    reasons.push("測試盤");
  } else if (marketState === "DEFENSE") {
    score += 25;
    reasons.push("防守盤");
  } else if (marketState === "CORRECTION") {
    score += 40;
    reasons.push("修正盤");
  }

  // ===== 5. 風險等級判斷 =====
  let riskLevel: RiskLevel = "LOW";

  if (score >= 70) {
    riskLevel = "HIGH";
  } else if (score >= 40) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  return {
    riskLevel,
    score,
    reason: reasons.join("｜"),
  };
}
