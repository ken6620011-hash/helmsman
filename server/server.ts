import express from "express";
import dotenv from "dotenv";

import healthRoutes from "./routes/healthRoutes";
import stockRoutes from "./routes/stockRoutes";
import scannerRoutes from "./routes/scannerRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import positionRoutes from "./routes/positionRoutes";

import { SCAN_SYMBOLS } from "./engines/marketDataEngine";
import {
  startAutoSupport,
  runAutoSupportOnce,
  getAutoSupportStatus,
} from "./engines/autoSupportEngine";
import {
  startAutoAlert,
  runAutoAlertOnce,
  getAutoAlertStatus,
} from "./engines/autoAlertEngine";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

function envBool(value: unknown, fallback = false): boolean {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) return fallback;
  if (["1", "true", "yes", "y", "on"].includes(text)) return true;
  if (["0", "false", "no", "n", "off"].includes(text)) return false;

  return fallback;
}

function envNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function buildSupportConfig() {
  return {
    enabled: envBool(process.env.AUTO_SUPPORT_ENABLED, true),
    intervalMs: envNumber(process.env.AUTO_SUPPORT_INTERVAL_MS, 5 * 60 * 1000),
    symbols: SCAN_SYMBOLS,
    kbarDays: envNumber(process.env.SUPPORT_KBAR_DAYS, 21),
  };
}

function buildAutoAlertConfig() {
  return {
    enabled: envBool(process.env.AUTO_ALERT_ENABLED, false),
    intervalMs: envNumber(process.env.AUTO_ALERT_INTERVAL_MS, 5 * 60 * 1000),
    linePushToken: envText(
      process.env.LINE_PUSH_TOKEN,
      process.env.LINE_CHANNEL_ACCESS_TOKEN
    ),
    lineUserId: envText(process.env.LINE_USER_ID),
  };
}

app.use(express.json());

// ===== Core Routes =====
app.use("/", healthRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/scanner", scannerRoutes);
app.use("/api/position", positionRoutes);
app.use("/webhook", webhookRoutes);

// ===== Support Debug Routes =====
app.get("/api/support/status", (_req, res) => {
  try {
    const config = buildSupportConfig();

    return res.json({
      ok: true,
      support: {
        config,
        status: getAutoSupportStatus(),
      },
    });
  } catch (error: any) {
    console.error("❌ /api/support/status error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "support status failed",
    });
  }
});

app.get("/api/support/run", async (_req, res) => {
  try {
    const config = buildSupportConfig();
    await runAutoSupportOnce(config);

    return res.json({
      ok: true,
      message: "support refresh completed",
      config,
      status: getAutoSupportStatus(),
    });
  } catch (error: any) {
    console.error("❌ /api/support/run error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "support refresh failed",
    });
  }
});

// ===== Auto Alert Debug Routes =====
app.get("/api/auto-alert/status", (_req, res) => {
  try {
    const config = buildAutoAlertConfig();

    return res.json({
      ok: true,
      autoAlert: {
        config: {
          enabled: config.enabled,
          intervalMs: config.intervalMs,
          hasLinePushToken: Boolean(config.linePushToken),
          hasLineUserId: Boolean(config.lineUserId),
        },
        status: getAutoAlertStatus(),
      },
    });
  } catch (error: any) {
    console.error("❌ /api/auto-alert/status error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "auto alert status failed",
    });
  }
});

app.get("/api/auto-alert/run", async (_req, res) => {
  try {
    const config = buildAutoAlertConfig();
    const result = await runAutoAlertOnce(config);

    return res.json({
      ok: true,
      result,
      status: getAutoAlertStatus(),
    });
  } catch (error: any) {
    console.error("❌ /api/auto-alert/run error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "auto alert run failed",
    });
  }
});

// ===== Boot =====
app.listen(PORT, async () => {
  console.log(`🚀 Helmsman 已啟動：${PORT}`);
  console.log("📦 server.ts（autoAlert + position 已掛載版）");

  const supportConfig = buildSupportConfig();
  console.log("🧠 AutoSupport Config:", supportConfig);

  if (supportConfig.enabled) {
    try {
      await runAutoSupportOnce(supportConfig);
    } catch (error) {
      console.error("❌ AutoSupport 初次更新失敗:", error);
    }

    try {
      startAutoSupport(supportConfig);
    } catch (error) {
      console.error("❌ AutoSupport 排程啟動失敗:", error);
    }
  } else {
    console.log("⛔ AutoSupport 未啟用");
  }

  const autoAlertConfig = buildAutoAlertConfig();
  console.log("🚨 AutoAlert Config:", {
    enabled: autoAlertConfig.enabled,
    intervalMs: autoAlertConfig.intervalMs,
    hasLinePushToken: Boolean(autoAlertConfig.linePushToken),
    hasLineUserId: Boolean(autoAlertConfig.lineUserId),
  });

  if (autoAlertConfig.enabled) {
    try {
      await runAutoAlertOnce(autoAlertConfig);
    } catch (error) {
      console.error("❌ AutoAlert 初次掃描失敗:", error);
    }

    try {
      startAutoAlert(autoAlertConfig);
    } catch (error) {
      console.error("❌ AutoAlert 排程啟動失敗:", error);
    }
  } else {
    console.log("⛔ AutoAlert 未啟用");
  }
});
