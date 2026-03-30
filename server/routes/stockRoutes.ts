import { Router } from "express";
import { getQuote } from "../engines/marketDataEngine";
import { runDecision } from "../engines/decisionEngine";
import {
  buildStockOutput,
  isValidQuote,
} from "../services/outputService";

const router = Router();

router.get("/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        message: "股票代號空白",
      });
    }

    const quote = await getQuote(code);

    if (!isValidQuote(quote)) {
      return res.json({
        ok: false,
        message: "資料暫時無效",
        data: {
          code,
          name: String(quote?.name || code),
          price: 0,
          change: 0,
          changePercent: 0,
          action: "觀望",
          risk: "中",
          score: 0,
          reason: "資料無效或尚未更新",
        },
      });
    }

    const decision = runDecision(quote);
    const output = buildStockOutput(code, quote, decision);

    return res.json({
      ok: true,
      data: output,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      message: "api stock error",
    });
  }
});

export default router;
