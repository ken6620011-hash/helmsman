

import { Router, Request, Response } from "express";
import { getQuote } from "../engines/marketDataEngine";
import { runPoint21Engine } from "../engines/point21Engine";
import runCandleEngine from "../engines/candleEngine";

const router = Router();

type HistoryRow = {
  date: string;
  dateLabel: string;
  close: number;

  point21: number;
  pointLight: string;

  diffValue: number;
  diffLight: string;

  lineText: string;
};

function getPointLight(point: number): string {
  if (point >= 18) return "🟢";
  if (point >= 10) return "🟡";
  return "🔴";
}

function getDiffLight(diff: number, prevDiff?: number): string {
  if (diff >= 30 && diff <= 90) {
    if (prevDiff !== undefined) {
      if (diff > prevDiff) return "🟢🟢"; // 上升
      if (diff < prevDiff) return "🔴🔴"; // 下降
    }
    return "🟢";
  }
  if (diff > 90) return "🟡";
  return "🔴";
}

router.get("/:code", async (req: Request, res: Response) => {
  try {
    const code = req.params.code;

    const quote = await getQuote(code);
    const point21Result = await runPoint21Engine(code);
    const candleHistory = await runCandleEngine(code);

    const history = point21Result.history || [];

    const result: HistoryRow[] = history.slice(-20).map((row: any, index: number) => {
      const prev = history[index - 1];

      const pointLight = getPointLight(row.point21);
      const diffLight = getDiffLight(row.diffValue, prev?.diffValue);

      const candle = candleHistory?.[index] || {
        title: "中性",
        icon: "⚪",
        description: "無明顯量價訊號",
      };

      const lineText = `${row.dateLabel}｜21:${row.point21}${pointLight}｜差:${row.diffValue}${diffLight}｜量:${candle.title}${candle.icon}…${candle.description}`;

      return {
        date: row.date,
        dateLabel: row.dateLabel,
        close: row.close,

        point21: row.point21,
        pointLight,

        diffValue: row.diffValue,
        diffLight,

        lineText,
      };
    });

    res.json({
      ok: true,
      code,
      count: result.length,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err.message || "point21 route error",
    });
  }
});

export default router;
