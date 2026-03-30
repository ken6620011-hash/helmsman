/* ===== 新增 import（放最上面）===== */
import { runAlertEngine } from "./engines/alertEngine";

/* 若你有 monitorEngine，保持 */
import { startMonitor, stopMonitor } from "./engines/monitorEngine";
/* ===== 監控主循環 ===== */
let monitorInterval: NodeJS.Timeout | null = null;

export function startSystemMonitor(intervalMs = 5000) {
  if (monitorInterval) return;

  monitorInterval = setInterval(() => {
    try {
      // 1️⃣ 原本監控（價格更新 / stopLoss）
      startMonitor();

      // 2️⃣ 🔥 加這行（Alert Engine）
      runAlertEngine();
    } catch (err) {
      console.error("Monitor Loop Error:", err);
    }
  }, intervalMs);
}

export function stopSystemMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
import express from "express";
import { getAlerts, clearAlerts } from "./engines/alertEngine";

const app = express();

/* ===== Alerts API ===== */
app.get("/api/alerts", (req, res) => {
  res.json(getAlerts());
});

app.post("/api/alerts/clear", (req, res) => {
  clearAlerts();
  res.json({ ok: true });
});
