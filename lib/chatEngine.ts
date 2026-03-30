import { StockSnapshot } from "./realDataEngine";
import { getMarketWeather } from "./marketWeatherEngine";
import { getRadarPicks, getAIScore } from "./radarEngine";
import { getTopOpportunities } from "./opportunityEngine";
import { getSectorFlow } from "./sectorFlowEngine";

export function generateAIReply(
  input: string,
  stocks: StockSnapshot[]
): string {
  const q = input.trim().toLowerCase();

  if (!stocks.length) {
    return "目前沒有市場資料，請先刷新系統。";
  }

  const weather = getMarketWeather(stocks);
  const radar = getRadarPicks(stocks, 10);
  const opportunities = getTopOpportunities(stocks, 5);
  const sectors = getSectorFlow(stocks).slice(0, 5);

  if (!q) {
    return "請輸入問題，例如：市場天氣、最強股票、最強產業、NVDA 分析。";
  }

  if (q.includes("市場") || q.includes("大盤") || q.includes("weather")) {
    return `目前市場天氣是 ${weather.label}。${weather.note}`;
  }

  if (q.includes("雷達") || q.includes("排名") || q.includes("最強股票")) {
    return `目前 AI Radar 前三名：${radar
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.symbol}（AI Score ${r.aiScore}，${r.radarLabel}）`)
      .join("、")}。`;
  }

  if (q.includes("機會") || q.includes("opportunity")) {
    return `目前最佳機會前三名：${opportunities
      .slice(0, 3)
      .map((o) => `${o.symbol}（${o.strategySignal}）`)
      .join("、")}。`;
  }

  if (q.includes("產業") || q.includes("sector") || q.includes("資金流")) {
    return `目前最強產業：${sectors
      .slice(0, 3)
      .map((s) => `${s.sector}（Heat ${s.heat}，Leader ${s.leader}）`)
      .join("、")}。`;
  }

  const matched = stocks.find(
    (s) => q.includes(s.symbol.toLowerCase()) || s.symbol.toLowerCase() === q
  );

  if (matched) {
    const aiScore = getAIScore(matched);
    return `${matched.symbol}：價格 ${matched.price}，漲跌 ${matched.changePct.toFixed(
      2
    )}% ，AI Score ${aiScore}，Radar ${matched.radarScore}，Momentum ${
      matched.momentumScore
    }，訊號 ${matched.strategySignal}。`;
  }

  return "我目前能回答市場天氣、Radar 排名、產業資金流、最佳機會，或直接分析股票代號。";
}
