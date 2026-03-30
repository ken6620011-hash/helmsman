import express from "express";
import dotenv from "dotenv";
import axios from "axios";

import { getQuote } from "./engines/marketDataEngine";
import { runDecision } from "./engines/decisionEngine";
import { runScanner } from "./engines/scannerEngine";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const LINE_CHANNEL_ACCESS_TOKEN = String(
  process.env.LINE_CHANNEL_ACCESS_TOKEN || ""
).trim();

app.use(express.json());

type StockOutput = {
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

function buildStockReplyText(d: StockOutput) {
  return (
    `📊 ${d.code} ${d.name}\n` +
    `現價：${d.price}\n` +
    `漲跌：${d.change}\n` +
    `漲跌幅：${d.changePercent}%\n` +
    `指令：${d.action}\n` +
    `風險：${d.risk}\n` +
    `Score：${d.score}\n` +
    `原因：${d.reason}`
  );
}

function normalizeStockOutput(code: string, quote: any, decision: any): StockOutput {
  return {
    code: String(quote?.symbol ?? code),
    name: String(quote?.name ?? code),
    price: Number(quote?.price ?? 0),
    change: Number(quote?.change ?? 0),
    changePercent: Number(quote?.pct ?? 0),
    action: String(decision?.action ?? "觀望"),
    risk: String(decision?.risk ?? "中"),
    score: Number(decision?.score ?? 40),
    reason: String(decision?.reason ?? "基礎決策引擎"),
  };
}

async function replyLine(replyToken: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.log("LINE token missing");
    return { ok: false, message: "LINE token missing" };
  }

  try {
    const response = await axios.post(
      "https://api.line.me/v2/bot/message/reply",
      {
        replyToken,
        messages: [{ type: "text", text }],
      },
      {
        headers: {
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return {
      ok: true,
      status: response.status,
    };
  } catch (err: any) {
    console.log(
      "LINE reply error:",
      err?.response?.status,
      err?.response?.data || err?.message || err
    );

    return {
      ok: false,
      status: err?.response?.status || 0,
      message: err?.message || "reply failed",
    };
  }
}

function buildSortedScannerText(rows: any[]) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "🔥 今日機會股 TOP 5\n\n目前無符合標的";
  }

  const lines: string[] = [];
  lines.push("🔥 今日機會股 TOP 5");
  lines.push("");

  rows.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.code} ${row.name} | Score:${row.score}`
    );
    lines.push(`${row.action}`);
    lines.push(
      `漲跌幅：${row.pct >= 0 ? "+" : ""}${row.pct}% | 風險：${row.risk}`
    );
    lines.push("");
  });

  return lines.join("\n").trim();
}

function buildAlertTestText(rows: any[]) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "🔕 警報測試結果\n\n目前無符合標的";
  }

  const alertRows = rows.filter((x) => Number(x?.score ?? 0) >= 60);

  const lines: string[] = [];
  lines.push("🔕 警報測試結果");
  lines.push(`總筆數：${rows.length}`);
  lines.push(`可警報：${alertRows.length}`);
  lines.push("");

  if (alertRows.length === 0) {
    lines.push("目前無符合警報條件標的");
    return lines.join("\n");
  }

  alertRows.forEach((x, i) => {
    lines.push(
      `${i + 1}. ${x.code} ${x.name} | Score:${x.score} | ${x.action}`
    );
    lines.push(
      `   漲跌幅：${x.pct >= 0 ? "+" : ""}${x.pct}% | 風險：${x.risk}`
    );
  });

  return lines.join("\n");
}

/* =========================
   API
========================= */

app.get("/", (_req, res) => {
  res.send("🚀 Helmsman 運作中");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Helmsman",
    port: PORT,
    scannerSortLocked: true,
  });
});

app.get("/api/stock/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        message: "股票代號空白",
      });
    }

    const quote = await getQuote(code);
    const decision = runDecision(quote);
    const output = normalizeStockOutput(code, quote, decision);

    console.log("API STOCK:", output);

    return res.json({
      ok: true,
      data: output,
    });
  } catch (err: any) {
    console.log("api stock error:", err?.message || err);

    return res.status(500).json({
      ok: false,
      message: "api stock error",
    });
  }
});

/**
 * 這裡直接吃 runScanner() 的結果
 * 不再自行 map SYMBOLS
 * 不再重組順序
 * 不再二次排序覆蓋
 */
app.get("/api/scanner", async (_req, res) => {
  try {
    const rows = await runScanner();

    console.log(
      "SCANNER SORTED:",
      rows.map((x: any) => `${x.code}:${x.pct}:${x.score}`)
    );

    return res.json({
      ok: true,
      count: rows.length,
      data: rows,
      report: buildSortedScannerText(rows),
    });
  } catch (err: any) {
    console.log("api scanner error:", err?.message || err);

    return res.status(500).json({
      ok: false,
      message: "api scanner error",
    });
  }
});

/* =========================
   LINE webhook
========================= */

app.post("/webhook", async (req, res) => {
  try {
    console.log("🔥 webhook hit");

    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
      if (event?.type !== "message") continue;
      if (event?.message?.type !== "text") continue;

      const replyToken = String(event?.replyToken || "").trim();
      const text = String(event?.message?.text || "").trim();

      if (!replyToken) continue;

      if (text.startsWith("查")) {
        const code = text.replace(/^查/, "").trim();

        let replyText = "請輸入股票，例如：查2317";

        if (code) {
          const quote = await getQuote(code);
          const decision = runDecision(quote);
          const output = normalizeStockOutput(code, quote, decision);

          console.log("LINE STOCK:", output);
          replyText = buildStockReplyText(output);
        }

        await replyLine(replyToken, replyText);
        continue;
      }

      if (text === "掃描") {
        /**
         * 關鍵：
         * 直接使用 runScanner() 已排序結果
         * 不再重新 map / 不再自己補 score / 不再重洗順序
         */
        const rows = await runScanner();

        console.log(
          "LINE SCANNER SORTED:",
          rows.map((x: any) => `${x.code}:${x.pct}:${x.score}`)
        );

        const replyText = buildSortedScannerText(rows);
        await replyLine(replyToken, replyText);
        continue;
      }

      if (text === "警報測試") {
        const rows = await runScanner();
        const replyText = buildAlertTestText(rows);
        await replyLine(replyToken, replyText);
        continue;
      }

      if (text === "狀態") {
        const replyText =
          "🟢 Helmsman 運作正常\n" +
          "🔒 排序已鎖死\n" +
          "📌 掃描直接使用 scannerEngine 排序結果";

        await replyLine(replyToken, replyText);
        continue;
      }

      if (text.toLowerCase() === "help") {
        const replyText = [
          "🚀 Helmsman 指令",
          "",
          "查2317",
          "掃描",
          "警報測試",
          "狀態",
          "help",
        ].join("\n");

        await replyLine(replyToken, replyText);
        continue;
      }

      await replyLine(replyToken, "⚠️ 無法辨識");
    }

    return res.status(200).send("OK");
  } catch (err: any) {
    console.log("webhook error:", err?.response?.data || err?.message || err);
    return res.status(500).send("error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Helmsman 已啟動：${PORT}`);
  console.log("🔒 server 排序鎖死：已啟用");
});
