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
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    if (!events.length) {
      return res.sendStatus(200);
    }

    for (const event of events) {
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const userText = normalizeText(event?.message?.text);
      const replyToken = normalizeText(event?.replyToken);

      if (!replyToken || !userText) continue;

      // ===== 單股查詢 =====
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

        const stockText = "[WEBHOOK-V2]\n" + buildStockReplyText(output);

        const alertResult = runAlertEngine({
          code: output.code,
          name: output.name,

          price: output.price,
          change: output.change,
          changePercent: output.changePercent,

          action: output.action,
          finalAction: output.finalAction,
          riskLevel: output.risk,
          score: output.finalScore ?? output.score,

          reason: output.reason,
          riskReason: output.riskReason,

          shouldExit: output.shouldExit,
          canHold: output.canHold,

          stopLossPrice: output.stopLossPrice,
          trailingStopActive: output.trailingStopActive,
          trailingStopPrice: output.trailingStopPrice,
          trailingStopRule: output.trailingStopRule,

          priceStopStatus: output.priceStopStatus,
          structureBroken: output.structureBroken,

          supportPrice: output.supportPrice,
          supportDays: output.supportDays,

          point21Value: output.point21Value,
          diffValue: output.diffValue,
          upperBound: output.upperBound,

          hasPosition: output.hasPosition,
        });

        let finalText = stockText;

        if (alertResult.triggered && alertResult.message) {
          finalText += "\n\n" + alertResult.message;
        }

        await replyText(replyToken, finalText);
        continue;
      }

      // ===== 掃描 =====
      if (userText === "掃描") {
        const rows: any[] = [];
        const alertMessages: string[] = [];

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

            const alertResult = runAlertEngine({
              code: output.code,
              name: output.name,

              price: output.price,
              change: output.change,
              changePercent: output.changePercent,

              action: output.action,
              finalAction: output.finalAction,
              riskLevel: output.risk,
              score: output.finalScore ?? output.score,

              reason: output.reason,
              riskReason: output.riskReason,

              shouldExit: output.shouldExit,
              canHold: output.canHold,

              stopLossPrice: output.stopLossPrice,
              trailingStopActive: output.trailingStopActive,
              trailingStopPrice: output.trailingStopPrice,
              trailingStopRule: output.trailingStopRule,

              priceStopStatus: output.priceStopStatus,
              structureBroken: output.structureBroken,

              supportPrice: output.supportPrice,
              supportDays: output.supportDays,

              point21Value: output.point21Value,
              diffValue: output.diffValue,
              upperBound: output.upperBound,

              hasPosition: output.hasPosition,
            });

            if (alertResult.triggered && alertResult.message) {
              alertMessages.push(alertResult.message);
            }
          } catch (error) {
            console.error(`❌ scanner webhook item failed: ${code}`, error);
          }
        }

        rows.sort(
          (a, b) =>
            Number(b.finalScore ?? b.score ?? 0) -
            Number(a.finalScore ?? a.score ?? 0)
        );

        let text = "[WEBHOOK-V2]\n" + buildScannerText(rows);

        if (alertMessages.length > 0) {
          text += "\n\n" + alertMessages.slice(0, 3).join("\n\n");
        }

        await replyText(replyToken, text);
        continue;
      }

      // ===== 持倉狀態 =====
      if (userText === "持倉" || userText === "position") {
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

            if (output.hasPosition) {
              rows.push(output);
            }
          } catch (error) {
            console.error(`❌ position scan failed: ${code}`, error);
          }
        }

        if (!rows.length) {
          await replyText(replyToken, "[WEBHOOK-V2]\n目前沒有持倉");
          continue;
        }

        const lines: string[] = [];
        lines.push("[WEBHOOK-V2]");
        lines.push("📦 目前持倉");

        for (const row of rows) {
          lines.push("");
          lines.push(`📊 ${row.code} ${row.name}`);
          lines.push(`持倉：${row.positionStatus || "OPEN"}`);
          lines.push(`進場價：${row.entryPrice ?? 0}`);
          lines.push(`現價：${row.price}`);
          lines.push(`進場後最高：${row.highestPriceSinceEntry ?? 0}`);
          lines.push(`數量：${row.quantity ?? 0}`);
          lines.push(`損益：${row.pnlAmount ?? 0} / ${row.pnlPercent ?? 0}%`);
          if (row.trailingStopActive) {
            lines.push(`移動停損：${row.trailingStopPrice ?? 0}`);
          }
        }

        await replyText(replyToken, lines.join("\n"));
        continue;
      }

      // ===== 幫助 =====
      if (userText === "help" || userText === "幫助" || userText === "指令") {
        await replyText(
          replyToken,
          [
            "[WEBHOOK-V2]",
            "可用指令：",
            "查3034",
            "掃描",
            "持倉",
            "help",
          ].join("\n")
        );
        continue;
      }

      await replyText(
        replyToken,
        "[WEBHOOK-V2]\n指令錯誤，請輸入：查3034、掃描、持倉、help"
      );
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ webhook route error:", error);
    return res.sendStatus(500);
  }
});

export default router;
