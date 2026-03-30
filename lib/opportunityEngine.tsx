import { StockSnapshot } from "./realDataEngine";
import { getAIScore } from "./radarEngine";

export type OpportunityItem = StockSnapshot & {
  aiScore: number;
  opportunityRank: number;
};

export function getTopOpportunities(
  stocks: StockSnapshot[],
  limit = 5
): OpportunityItem[] {
  return stocks
    .filter((s) => s.strategySignal !== "Reduce Risk")
    .map((stock) => ({
      ...stock,
      aiScore: getAIScore(stock),
      opportunityRank: 0
    }))
    .sort((a, b) => {
      if (b.aiScore !== a.aiScore) return b.aiScore - a.aiScore;
      return b.momentumScore - a.momentumScore;
    })
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      opportunityRank: index + 1
    }));
}
