import { SCAN_SYMBOLS, SECTOR_MAP, getBatchQuotes } from "./marketDataEngine";
import { runModelEngine } from "./modelEngine";

type SectorStats = {
  sector: string;
  avgScore: number;
  leaders: string[];
  count: number;
};

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

export async function runSectorEngine(): Promise<{
  sectors: Record<string, SectorStats>;
  topSector: string;
}> {
  const quotes = await getBatchQuotes(SCAN_SYMBOLS);

  const bucket: Record<
    string,
    { scores: number[]; leaders: { code: string; score: number }[] }
  > = {};

  for (const q of quotes) {
    const m = runModelEngine(q);
    const sector = q.sector || SECTOR_MAP[q.symbol] || "其他";

    if (!bucket[sector]) {
      bucket[sector] = { scores: [], leaders: [] };
    }

    bucket[sector].scores.push(m.score);
    bucket[sector].leaders.push({ code: q.symbol, score: m.score });
  }

  const sectors: Record<string, SectorStats> = {};

  for (const [sector, data] of Object.entries(bucket)) {
    const leaders = data.leaders
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.code);

    sectors[sector] = {
      sector,
      avgScore: avg(data.scores),
      leaders,
      count: data.scores.length,
    };
  }

  const sorted = Object.values(sectors).sort(
    (a, b) => b.avgScore - a.avgScore
  );

  const topSector = sorted[0]?.sector || "其他";

  return { sectors, topSector };
}
