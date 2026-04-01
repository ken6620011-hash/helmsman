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

function buildSupportConfig() {
  return {
    enabled: envBool(process.env.AUTO_SUPPORT_ENABLED, true),
    intervalMs: envNumber(process.env.AUTO_SUPPORT_INTERVAL_MS, 5 * 60 * 1000),
    symbols: SCAN_SYMBOLS,
    kbarDays: envNumber(process.env.SUPPORT_KBAR_DAYS, 21),
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

// ===== Boot =====
app.listen(PORT, async () => {
  console.log(`🚀 Helmsman 已啟動：${PORT}`);
  console.log("📦 server.ts（position 已掛載版）");

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
});
