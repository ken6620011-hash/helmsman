import express from "express";
import { runFusion } from "../engines/fusionEngine";
import { replyText } from "../services/lineReplyService";

const router = express.Router();

type FusionRawResult = {
  quote?: {
    symbol?: string;
    name?: string;
    price?: number;
    change?: number;
    pct?: number;
    sector?: string;
    error?: string;
  };
  model?: {
    action?: string;
    risk?: string;
    score?: number;
    reason?: string;
  };
  extra?: any;
};

type FusionViewResult = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  action: string;
  risk: string;
  score: number;
  reason: string;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFusionResult(raw: FusionRawResult, fallbackCode: string): FusionViewResult {
  const quote = raw?.quote || {};
  const model = raw?.model || {};

  return {
    code: String(quote.symbol || fallbackCode),
    name: String(quote.name || fallbackCode),
    price: safeNumber(quote.price, 0),
    change: safeNumber(quote.change, 0),
    changePercent: safeNumber(quote.pct, 0),
    action: String(model.action || "觀望"),
    risk: String(model.risk || "中"),
    score: safeNumber(model.score, 0),
    reason: String(model.reason || "無"),
  };
}

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

        const raw = (await runFusion({ code })) as FusionRawResult;
        const result = normalizeFusionResult(raw, code);

        console.log("LINE STOCK:", result);

        const text =
          `📊 ${result.code} ${result.name}\n` +
          `現價：${result.price}\n` +
          `漲跌：${result.change}\n` +
          `漲跌幅：${result.changePercent}%\n` +
          `指令：${result.action}\n` +
          `風險：${result.risk}\n` +
          `Score：${result.score}\n` +
          `原因：${result.reason}`;

        await replyText(replyToken, text);
        continue;
      }

      if (userText === "掃描") {
        const list = ["2308", "2317", "2330", "2454", "3034"];
        const results: FusionViewResult[] = [];

        for (const code of list) {
          const raw = (await runFusion({ code })) as FusionRawResult;
          const result = normalizeFusionResult(raw, code);
          results.push(result);
        }

        results.sort((a, b) => b.score - a.score);

        let text = "🔥 今日機會股 TOP 5\n\n";

        results.forEach((r, i) => {
          text +=
            `${i + 1}. ${r.code} ${r.name} | Score:${r.score}\n` +
            `${r.action}\n` +
            `漲跌幅：${r.changePercent}% | 風險：${r.risk}\n\n`;
        });

        await replyText(replyToken, text.trim());
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
