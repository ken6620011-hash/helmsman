import express from "express";
import { replyText } from "../services/lineReplyService";
import { getQuote } from "../engines/marketDataEngine";
import { runDecision } from "../engines/decisionEngine";
import { buildStockOutput, buildStockReplyText, buildScannerText } from "../services/outputService";
import { runScanner } from "../engines/scannerEngine";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("🔥 webhook hit");
    console.log("LINE BODY:", JSON.stringify(req.body, null, 2));

    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    if (events.length === 0) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const userText = String(event?.message?.text || "").trim();
      const replyToken = String(event?.replyToken || "").trim();

      if (!replyToken) continue;

      console.log("📩 使用者訊息：", userText);

      if (userText.startsWith("查")) {
        const code = userText.replace(/^查/, "").trim();

        if (!code) {
          await replyText(replyToken, "請輸入股票代碼，例如：查2317");
          continue;
        }

        const quote = await getQuote(code);
        const decision = await runDecision(quote);
        const output = buildStockOutput(code, quote, decision);
        const text = buildStockReplyText(output);

        console.log("LINE STOCK OUTPUT:", output);

        await replyText(replyToken, text);
        continue;
      }

      if (userText === "掃描") {
        const rows = await runScanner();
        const text = buildScannerText(rows);

        console.log("LINE SCANNER OUTPUT:", rows);

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
