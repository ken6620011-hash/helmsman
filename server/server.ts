import express from "express";
import dotenv from "dotenv";

import stockRoutes from "./routes/stockRoutes";
import scannerRoutes from "./routes/scannerRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import healthRoutes from "./routes/healthRoutes";

import {
  startAutoAlert,
  stopAutoAlert,
  getAutoAlertStatus,
  runAutoAlertOnce,
  type AutoAlertConfig,
} from "./engines/autoAlertEngine";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

function envBool(v: unknown, fallback = false): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(s);
}

function buildAutoAlertConfig(): AutoAlertConfig {
  return {
    enabled: envBool(process.env.AUTO_ALERT_ENABLED, false),
    intervalMs: Number(process.env.AUTO_ALERT_INTERVAL_MS || 300000),
    linePushToken: String(
      process.env.LINE_PUSH_TOKEN ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        ""
    ).trim(),
    lineUserId: String(process.env.LINE_USER_ID || "").trim(),
  };
}

app.use(express.json());

app.use("/", healthRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/webhook", webhookRoutes);

// ===== auto alert 狀態 =====
app.get("/api/auto-alert/status", (_req, res) => {
  const config = buildAutoAlertConfig();
  const status = getAutoAlertStatus();

  res.json({
    ok: true,
    config: {
      enabled: config.enabled,
      intervalMs: config.intervalMs,
      hasLinePushToken: Boolean(config.linePushToken),
      hasLineUserId: Boolean(config.lineUserId),
    },
    status,
  });
});

// ===== auto alert 手動執行 =====
app.get("/api/auto-alert/run", async (_req, res) => {
  try {
    const result = await runAutoAlertOnce(buildAutoAlertConfig());
    res.json({
      ok: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message: error?.message || "run auto alert failed",
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Helmsman 已啟動：${PORT}`);
  console.log("📦 server.ts（排程版）");

  const autoAlertConfig = buildAutoAlertConfig();

  console.log("⏰ AUTO ALERT CONFIG", {
    enabled: autoAlertConfig.enabled,
    intervalMs: autoAlertConfig.intervalMs,
    hasLinePushToken: Boolean(autoAlertConfig.linePushToken),
    hasLineUserId: Boolean(autoAlertConfig.lineUserId),
  });

  startAutoAlert(autoAlertConfig);
});

function shutdown(signal: string) {
  console.log(`🛑 ${signal} received, shutting down...`);
  stopAutoAlert();

  server.close(() => {
    console.log("✅ Helmsman server closed");
    process.exit(0);
  });

  setTimeout(() => {
    console.log("⚠️ force exit");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
