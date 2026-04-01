import express from "express";
import runFusion from "../engines/fusionEngine";
import {
  buildStockOutput,
  buildStockReplyText,
  buildScannerText,
} from "../services/outputService";
import { replyText } from "../services/lineReplyService";
import { SCAN_SYMBOLS } from "../engines/marketDataEngine";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    if (!events.length) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const userText = String(event?.message?.text || "").trim();
      const replyToken = String(event?.replyToken || "").trim();

      if (!replyToken) continue;

      if (userText.startsWith("查")) {
        const code = userText.replace(/^查/, "").trim();

        if (!code) {
          await replyText(replyToken, "請輸入股票代碼，例如：查2317");
          continue;
        }

        const fusion = await runFusion({ code });

        const output = buildStockOutput(
          code,
          fusion.quote,
          fusion.model,
          fusion.position,
          fusion.hasPosition
        );

        const text = "[WEBHOOK-V2]\n" + buildStockReplyText(output);

        await replyText(replyToken, text);
        continue;
      }

      if (userText === "掃描") {
        const rows: any[] = [];

        for (const code of SCAN_SYMBOLS) {
          const fusion = await runFusion({ code });

          const output = buildStockOutput(
            code,
            fusion.quote,
            fusion.model,
            fusion.position,
            fusion.hasPosition
          );

          rows.push(output);
        }

        rows.sort(
          (a, b) =>
            Number(b.finalScore ?? b.score ?? 0) -
            Number(a.finalScore ?? a.score ?? 0)
        );

        const text = "[WEBHOOK-V2]\n" + buildScannerText(rows);
        await replyText(replyToken, text);
        continue;
      }

      await replyText(replyToken, "指令錯誤，請輸入：查XXXX 或 掃描");
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ webhook error:", error);
    return res.sendStatus(500);
  }
});

export default router;
