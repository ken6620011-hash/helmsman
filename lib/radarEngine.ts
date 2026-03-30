import { StockSnapshot } from "./realDataEngine";
import { getQuantScore } from "./quantEngine";

export type RadarPick = StockSnapshot & {
  aiScore: number;
  radarLabel: "Leader" | "Strong" | "Building" | "Recovery" | "Weak";
};

export function getAIScore(stock: StockSnapshot): number {
  return getQuantScore(stock).total;
}

export function getRadarLabel(score: number): RadarPick["radarLabel"] {
  if (score >= 85) return "Leader";
  if (score >= 75) return "Strong";
  if (score >= 65) return "Building";
  if (score >= 55) return "Recovery";
  return "Weak";
}

export function getRadarPicks(
  stocks: StockSnapshot[],
  limit = 50
): RadarPick[] {
  return stocks
    .map((stock) => {
      const aiScore = getAIScore(stock);
      return {
        ...stock,
        aiScore,
        radarLabel: getRadarLabel(aiScore)
      };
    })
    .sort((a, b) => {
      if (b.aiScore !== a.aiScore) return b.aiScore - a.aiScore;
      if (b.momentumScore !== a.momentumScore) return b.momentumScore - a.momentumScore;
      return b.radarScore - a.radarScore;
    })
    .slice(0, limit);
}
