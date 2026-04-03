import express from "express";
import runFusion from "../engines/fusionEngine";
import runAlertEngine from "../engines/alertEngine";
import {
  buildStockOutput,
  buildStockReplyText,
  buildScannerText,
} from "../services/outputService";
import { replyText } from "../services/lineReplyService";
import { SCAN_SYMBOLS } from "../engines/marketDataEngine";

const router = express.Router();

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function extractCodeFromText(text: string): string {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  if (cleaned.startsWith("查")) {
    return cleaned.replace(/^查+/, "").trim();
  }

  const match = cleaned.match(/\b\d{4,6}\b/);
  return match ? match[0] : "";
}

router.post("/", async (req, res) => {
  // ✅ 先回應 LINE（最重要）
  res.sendStatus(200);

  // ⚠️ 後面全部非同步處理
  setTimeout(async () => {
    try {
      const events = Array.isArray(req.body?.events) ? req.body.events : [];
      if (!events.length) return;

      for (const event of events) {
        if (event?.type !== "message") continue;
        if (event?.message?.type !== "text") continue;

        const userText = normalizeText(event?.message?.text);
        const replyToken = normalizeText(event?.replyToken);

        if (!replyToken || !userText) continue;

        // ===== 單股 =====
        if (userText.startsWith("查")) {
          const code = extractCodeFromText(userText);

          if (!code) {
            await replyText(replyToken, "請輸入股票代碼，例如：查3034");
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

          const text =
            "[WEBHOOK-V2]\n" + buildStockReplyText(output);

          await replyText(replyToken, text);
          continue;
        }

        // ===== 掃描 =====
        if (userText === "掃描") {
          const rows: any[] = [];

          for (const code of SCAN_SYMBOLS) {
            try {
              const fusion = await runFusion({ code });

              const output = buildStockOutput(
                code,
                fusion.quote,
                fusion.model,
                fusion.position,
                fusion.hasPosition
              );

              rows.push(output);
            } catch {}
          }

          rows.sort(
            (a, b) =>
              Number(b.finalScore ?? b.score ?? 0) -
              Number(a.finalScore ?? a.score ?? 0)
          );

          const text =
            "[WEBHOOK-V2]\n" + buildScannerText(rows);

          await replyText(replyToken, text);
          continue;
        }

        // ===== help =====
        if (userText === "help") {
          await replyText(
            replyToken,
            "[WEBHOOK-V2]\n查3034\n掃描\n持倉\nhelp"
          );
          continue;
        }

        await replyText(
          replyToken,
          "[WEBHOOK-V2]\n指令錯誤"
        );
      }
    } catch (err) {
      console.error("webhook async error:", err);
    }
  }, 0);
});

export default router;
