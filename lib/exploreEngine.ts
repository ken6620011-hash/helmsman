import { StockSnapshot } from "./realDataEngine";
import { getSectorFlow } from "./sectorFlowEngine";
import { getTopOpportunities } from "./opportunityEngine";
import { getMarketWeather } from "./marketWeatherEngine";

export function buildExploreSnapshot(stocks: StockSnapshot[]) {
  const weather = getMarketWeather(stocks);
  const sectorFlow = getSectorFlow(stocks);
  const opportunities = getTopOpportunities(stocks, 5);

  return {
    weather,
    sectorFlow,
    opportunities,
    marketSummary: `目前市場偏 ${weather.label}，建議聚焦在強勢產業與領頭股。`
  };
}
