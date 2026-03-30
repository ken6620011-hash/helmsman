import { StockSnapshot } from "./realDataEngine";
import { getSectorFlow } from "./sectorFlowEngine";

export type HeatmapCell = {
  sector: string;
  heat: number;
  leader: string;
  signal: string;
  widthPct: number;
};

export function buildSectorHeatmap(stocks: StockSnapshot[]): HeatmapCell[] {
  const rows = getSectorFlow(stocks);
  const maxHeat = Math.max(...rows.map((r) => r.heat), 1);

  return rows.map((row) => ({
    sector: row.sector,
    heat: row.heat,
    leader: row.leader,
    signal: row.signal,
    widthPct: Math.max(20, Math.round((row.heat / maxHeat) * 100))
  }));
}
