import express from "express";
import { getQuote } from "../engines/marketDataEngine";
import { runDecision } from "../engines/decisionEngine";
import { buildStockReplyText, buildScannerText } from "../services/outputService";
import { replyText } from "../services/lineReplyService";
import { runScanner } from "../engines/scannerEngine";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const events = req.body.events;

    if (!events || events.length === 0) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event.type !== "message") continue;
      if (event.message.type !== "text") continue;

      const text = event.message.text.trim();
      const replyToken = event.replyToken;

      if (!replyToken) continue;

      // ===== 查股 =====
      if (text.startsWith("查")) {
        const code = text.replace("查", "").trim();

        if (!code) {
          await replyText(replyToken, "請輸入股票代號，例如：查2330");
          continue;
        }

        try {
          console.log("🔥 LINE STOCK PATH (decision)");

          const quote: any = await getQuote(code);
          const decision = await runDecision(quote);

          const reply = buildStockReplyText({
            code: quote.code || quote.symbol || code,
            name: quote.name || "",
            price: quote.price || 0,
            change: quote.change || 0,
            changePercent:
              quote.changePercent ??
              quote.changePct ??
              0,
            score: decision.score,
            action: decision.action,
            risk: decision.risk,
            reason: decision.reason,
          });

          await replyText(replyToken, reply);
        } catch (err) {
          console.error("❌ LINE 查股錯誤:", err);
          await replyText(replyToken, "查詢失敗，請稍後再試");
        }

        continue;
      }

      // ===== 掃描 =====
      if (text === "掃描") {
        try {
          console.log("🔥 LINE SCANNER PATH");

          const rows = await runScanner();
          const reply = buildScannerText(rows);

          await replyText(replyToken, reply);
        } catch (err) {
          console.error("❌ LINE 掃描錯誤:", err);
          await replyText(replyToken, "掃描失敗，請稍後再試");
        }

        continue;
      }

      // ===== 預設 =====
      await replyText(replyToken, "指令：查2330 / 掃描");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ webhook 錯誤:", err);
    res.sendStatus(200);
  }
});

export default router;
